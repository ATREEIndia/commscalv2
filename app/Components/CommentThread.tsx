'use client'
import { useState } from 'react'
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase/firebase'
import type { SMComment, CommentReply, HistoryEventType } from '../smcal/types'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import { notify } from '../../lib/notifications'

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

interface Props {
  postId: string
  target: string         // "body" | "image:0" | "image:1" …
  comments: SMComment[]
  currentUser: CurrentUser | null
  isAssignee: boolean
  title?: string
  onClose?: () => void
  postTitle: string
  creatorEmail?: string
  assigneeEmail?: string
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-blue-100 flex items-center justify-center
        text-[10px] font-bold text-blue-600 flex-shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatTS(ts: Timestamp | undefined | null): string {
  if (!ts?.toDate) return ''
  return dayjs(ts.toDate()).tz(IST).format('DD MMM, hh:mm A')
}

function timeAgo(ts: Timestamp | undefined | null): string {
  if (!ts?.toMillis) return ''
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatTS(ts)
}

export default function CommentThread({
  postId,
  target,
  comments,
  currentUser,
  isAssignee,
  title,
  onClose,
  postTitle,
  creatorEmail,
  assigneeEmail,
}: Props) {
  const [newText,      setNewText]      = useState('')
  const [replyDrafts,  setReplyDrafts]  = useState<Record<string, string>>({})
  const [openReply,    setOpenReply]    = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)

  // Edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editDraft,        setEditDraft]        = useState('')
  const [editingReply,     setEditingReply]     = useState<{ commentId: string; idx: number } | null>(null)
  const [replyEditDraft,   setReplyEditDraft]   = useState('')

  const unresolved = comments.filter((c) => !c.resolved)
  const resolved   = comments.filter((c) => c.resolved)

  const notifyActor = {
    email:    currentUser?.email || '',
    name:     currentUser?.displayName || 'User',
    photoURL: currentUser?.photoURL || '',
  }

  // ── History logger ─────────────────────────────────────────────────────────
  const logHistory = async (type: HistoryEventType, before?: string, after?: string) => {
    if (!currentUser) return
    await addDoc(collection(firestore, 'posts', postId, 'history'), {
      type,
      actor: {
        uid:      currentUser.uid,
        name:     currentUser.displayName || 'User',
        photoURL: currentUser.photoURL || '',
      },
      timestamp: serverTimestamp(),
      target,
      ...(before !== undefined ? { before } : {}),
      ...(after  !== undefined ? { after  } : {}),
    })
  }

  // ── Add top-level comment ──────────────────────────────────────────────────
  const addComment = async () => {
    if (!newText.trim() || !currentUser) return
    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'posts', postId, 'comments'), {
        target,
        authorUid:   currentUser.uid,
        authorName:  currentUser.displayName || 'User',
        authorPhoto: currentUser.photoURL || '',
        authorEmail: currentUser.email || '',
        text:        newText.trim(),
        createdAt:   serverTimestamp(),
        resolved:    false,
        replies:     [],
      })
      const previousCommenters = comments.map((c) => c.authorEmail).filter((e): e is string => !!e)
      await notify({
        recipients: [creatorEmail, assigneeEmail, ...previousCommenters],
        actor: notifyActor,
        type: 'comment_added',
        postId,
        postTitle,
        message: `${notifyActor.name} commented on "${postTitle}"`,
      })
      setNewText('')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Add reply ──────────────────────────────────────────────────────────────
  const addReply = async (comment: SMComment) => {
    const text = replyDrafts[comment.id!]?.trim()
    if (!text || !currentUser || !comment.id) return
    const reply: CommentReply = {
      uid:       currentUser.uid,
      name:      currentUser.displayName || 'User',
      photo:     currentUser.photoURL || '',
      text,
      createdAt: Timestamp.now(),
      authorEmail: currentUser.email || '',
    }
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id), {
      replies: [...(comment.replies || []), reply],
    })
    if (comment.authorEmail) {
      await notify({
        recipients: [comment.authorEmail],
        actor: notifyActor,
        type: 'reply_added',
        postId,
        postTitle,
        message: `${notifyActor.name} replied to your comment on "${postTitle}"`,
      })
    }
    setReplyDrafts((prev) => ({ ...prev, [comment.id!]: '' }))
    setOpenReply(null)
  }

  // ── Edit comment ───────────────────────────────────────────────────────────
  const startEditComment = (comment: SMComment) => {
    setEditingCommentId(comment.id!)
    setEditDraft(comment.text)
  }

  const saveEditComment = async (comment: SMComment) => {
    const next = editDraft.trim()
    if (!next || next === comment.text) { setEditingCommentId(null); return }
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id!), {
      text:        next,
      editedAt:    serverTimestamp(),
      editHistory: arrayUnion({ text: comment.text, editedAt: Timestamp.now() }),
    })
    await logHistory('comment_edited', comment.text, next)
    setEditingCommentId(null)
  }

  // ── Edit reply ─────────────────────────────────────────────────────────────
  const startEditReply = (commentId: string, idx: number, currentText: string) => {
    setEditingReply({ commentId, idx })
    setReplyEditDraft(currentText)
  }

  const saveEditReply = async (comment: SMComment, idx: number) => {
    const next     = replyEditDraft.trim()
    const prevText = comment.replies[idx].text
    if (!next || next === prevText) { setEditingReply(null); return }
    const updatedReplies: CommentReply[] = comment.replies.map((r, i) => {
      if (i !== idx) return r
      return {
        ...r,
        text:        next,
        editedAt:    Timestamp.now(),
        editHistory: [...(r.editHistory || []), { text: prevText, editedAt: Timestamp.now() }],
      }
    })
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id!), {
      replies: updatedReplies,
    })
    await logHistory('comment_edited', prevText, next)
    setEditingReply(null)
  }

  // ── Resolve / Unresolve ────────────────────────────────────────────────────
  const resolveComment = async (comment: SMComment) => {
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id!), { resolved: true })
    if (comment.authorEmail) {
      await notify({
        recipients: [comment.authorEmail],
        actor: notifyActor,
        type: 'comment_resolved',
        postId,
        postTitle,
        message: `${notifyActor.name} resolved your comment on "${postTitle}"`,
      })
    }
  }

  const unresolveComment = async (comment: SMComment) => {
    await updateDoc(doc(firestore, 'posts', postId, 'comments', comment.id!), { resolved: false })
    await logHistory('comment_unresolved')
    if (comment.authorEmail) {
      await notify({
        recipients: [comment.authorEmail],
        actor: notifyActor,
        type: 'comment_unresolved',
        postId,
        postTitle,
        message: `${notifyActor.name} reopened your comment on "${postTitle}"`,
      })
    }
  }

  // ── Delete comment ─────────────────────────────────────────────────────────
  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(firestore, 'posts', postId, 'comments', commentId))
    
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Optional header */}
      {(title || onClose) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {unresolved.length === 0 && resolved.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No comments yet.</p>
        )}

        {unresolved.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar name={comment.authorName} size={6} />
            <div className="flex-1 min-w-0">

              {/* Author + timestamp + edited marker */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">{comment.authorName}</span>
                <span className="text-[10px] text-gray-400">{formatTS(comment.createdAt)}</span>
                {comment.editedAt && (
                  <span
                    className="text-[10px] text-gray-400 italic cursor-default"
                    title={`Edited ${formatTS(comment.editedAt)}`}
                  >
                    · edited {timeAgo(comment.editedAt)}
                  </span>
                )}
              </div>

              {/* Text or inline edit */}
              {editingCommentId === comment.id ? (
                <div className="mt-1">
                  <textarea
                    className="w-full text-xs border border-blue-300 rounded-lg px-2 py-1.5
                      focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                    rows={3}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingCommentId(null)
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => saveEditComment(comment)}
                      className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-lg
                        hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCommentId(null)}
                      className="text-[10px] text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{comment.text}</p>
              )}

              {/* Action row (hidden while editing) */}
              {editingCommentId !== comment.id && (
                <div className="flex gap-3 mt-1.5">
                  <button
                    onClick={() => setOpenReply(openReply === comment.id ? null : comment.id!)}
                    className="text-[10px] text-blue-500 hover:text-blue-700"
                  >
                    Reply
                  </button>
                  {/* Edit: own comment with no replies */}
                  {currentUser?.uid === comment.authorUid && comment.replies.length === 0 && (
                    <button
                      onClick={() => startEditComment(comment)}
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </button>
                  )}
                  {isAssignee && (
                    <button
                      onClick={() => resolveComment(comment)}
                      className="text-[10px] text-green-600 hover:text-green-800"
                    >
                      Resolve
                    </button>
                  )}
                  {currentUser?.uid === comment.authorUid && (
                    <button
                      onClick={() => deleteComment(comment.id!)}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}

              {/* Nested replies */}
              {(comment.replies || []).length > 0 && (
                <div className="mt-2 ml-1 space-y-2 border-l-2 border-gray-100 pl-3">
                  {[...(comment.replies)].sort((a, b) => {
                    const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt as unknown as { seconds: number })?.seconds ?? 0
                    const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt as unknown as { seconds: number })?.seconds ?? 0
                    return aMs - bMs
                  }).map((reply, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-gray-600">{reply.name}</span>
                        <span className="text-[9px] text-gray-400">{formatTS(reply.createdAt)}</span>
                        {reply.editedAt && (
                          <span
                            className="text-[9px] text-gray-400 italic cursor-default"
                            title={`Edited ${formatTS(reply.editedAt)}`}
                          >
                            · edited {timeAgo(reply.editedAt)}
                          </span>
                        )}
                      </div>

                      {/* Reply text or inline edit */}
                      {editingReply !== null && editingReply.commentId === comment.id && editingReply.idx === i ? (
                        <div className="mt-1">
                          <textarea
                            className="w-full text-[10px] border border-blue-300 rounded-lg
                              px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300
                              resize-none"
                            rows={2}
                            value={replyEditDraft}
                            onChange={(e) => setReplyEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingReply(null)
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => saveEditReply(comment, i)}
                              className="text-[9px] bg-blue-500 text-white px-2 py-1
                                rounded-lg hover:bg-blue-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingReply(null)}
                              className="text-[9px] text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] text-gray-600 leading-relaxed">{reply.text}</p>
                          {currentUser?.uid === reply.uid && (
                            <button
                              onClick={() => startEditReply(comment.id!, i, reply.text)}
                              className="text-[9px] text-gray-400 hover:text-gray-600 mt-0.5"
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {openReply === comment.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5
                      focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Add a reply…"
                    value={replyDrafts[comment.id!] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [comment.id!]: e.target.value }))
                    }
                    onKeyDown={(e) => { if (e.key === 'Enter') addReply(comment) }}
                    autoFocus
                  />
                  <button
                    onClick={() => addReply(comment)}
                    className="text-[10px] bg-blue-500 text-white px-2.5 py-1.5 rounded-lg
                      hover:bg-blue-600 whitespace-nowrap"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Resolved (collapsed) */}
        {resolved.length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-gray-400 cursor-pointer select-none">
              {resolved.length} resolved comment{resolved.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2 opacity-60">
              {resolved.map((comment) => (
                <div key={comment.id} className="flex gap-2 items-start">
                  <Avatar name={comment.authorName} size={5} />
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-500 line-through">{comment.text}</span>
                    <span className="text-[9px] text-green-500">✓ resolved</span>
                    {isAssignee && (
                      <button
                        onClick={() => unresolveComment(comment)}
                        className="text-[9px] text-blue-400 hover:text-blue-600 hover:underline"
                      >
                        Unresolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* New comment input */}
      {currentUser && (
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <input
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Add a comment…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addComment()
                }
              }}
            />
            <button
              onClick={addComment}
              disabled={!newText.trim() || submitting}
              className="text-xs bg-blue-500 text-white px-3 py-2 rounded-lg
                hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed
                whitespace-nowrap"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
