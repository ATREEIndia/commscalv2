'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, X } from 'lucide-react'
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { ref, update } from 'firebase/database'
import { db, firestore } from '../firebase/firebase'
import type { SMPost, SMComment, HistoryEvent, PostActor, AppNotification } from '../smcal/types'
import { convertDriveUrl, getDriveDownloadUrl } from '../../lib/driveUrl'
import { useMediaType } from '../hooks/useMediaType'
import dayjs, { IST } from '../../lib/dayjs'
import { notify } from '../../lib/notifications'
import { emailToColor, getInitial } from '../../lib/assignColor'
import { useUsers } from '../constants'
import CommentThread from './CommentThread'
import HistoryLog from './HistoryLog'
import ImageSlotList from './ImageSlotList'
import PostDetailLightbox from './PostDetailLightbox'
import EmailChipInput, { isValidEmail } from './EmailChipInput'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft: { badge: 'bg-gray-100 text-gray-600 border-gray-200', icon: '✏️', label: 'Draft' },
  scheduled: { badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🕐', label: 'Scheduled' },
  approved: { badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✓', label: 'Approved' },
  posted: { badge: 'bg-green-100 text-green-700 border-green-200', icon: '📤', label: 'Posted' },
} as const

// ── Mail config ────────────────────────────────────────────────────────────────
// Starter suggestions shown before any mail has been sent — replace with your own
const SEED_EMAILS: string[] = [
  'communications@atree.org',
  // 'someone@atree.org',
]

// Shared Firestore doc that remembers every address an approval mail was sent to
const RECIPIENTS_DOC_PATH = ['meta', 'mailRecipients'] as const

// ── Types ──────────────────────────────────────────────────────────────────────
interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

interface Props {
  postId: string
  user: CurrentUser | null
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatIST(ts: Timestamp | null | undefined): string {
  if (!ts?.toDate) return '—'
  return dayjs(ts.toDate()).tz(IST).format('DD MMM YYYY, hh:mm A')
}

function shareText(post: SMPost, postId: string) {
  const url = `${window.location.origin}/smcal/${postId}`
  return `${post.title} — ${formatIST(post.scheduledAt)}\n${url}`
}

// Realtime DB mirror of the linked task. Failures are logged, never thrown,
// so a Realtime DB hiccup doesn't block the Firestore write that preceded it.
async function updateRtdbItem(taskId: string, data: Record<string, unknown>) {
  try {
    await update(ref(db, `items/${taskId}`), data)
  } catch (error) {
    console.error(error)
  }
}

// ── Media grid item ────────────────────────────────────────────────────────────
// Extracted so useMediaType (which resolves pasted-URL videos asynchronously via
// Drive metadata) can be called at this component's own top level, not inside the
// parent's .map() callback — hooks can't be called from a nested function.
function MediaGridItem({
  url, count, isSelected, onSelect, onLightbox, index,
}: {
  url: string
  count: number
  isSelected: boolean
  onSelect: () => void
  onLightbox: () => void
  index: number
}) {
  const isVideo = useMediaType(url) === 'video'
  const [previewFailed, setPreviewFailed] = useState(false)

  return (
    <div className="relative group">
      <div
        onClick={() => (isVideo ? window.open(url, '_blank', 'noopener,noreferrer') : onSelect())}
        className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer relative transition-all
          ${isSelected
            ? 'border-blue-400 shadow-lg ring-2 ring-blue-200'
            : 'border-gray-200 hover:border-blue-300'
          }`}
      >
        {previewFailed ? (
          <div
            className={`w-full h-full flex flex-col items-center justify-center gap-1.5 p-3
              ${isVideo ? 'bg-gray-100 text-gray-400' : 'bg-gray-50'}`}
          >
            {isVideo ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm6 4v8l6-4-6-4z" />
              </svg>
            ) : (
              <p className="text-xs text-gray-400 text-center">Preview unavailable</p>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-blue-400 underline text-center"
            >
              Open in Drive ↗
            </a>
          </div>
        ) : (
          <img
            src={convertDriveUrl(url)}
            alt={`Media ${index}`}
            className="w-full h-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        )}

        {isVideo && !previewFailed && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">
              ▶
            </span>
          </span>
        )}

        {/* View / Download overlay — images only; videos open in Drive on click */}
        {!isVideo && !previewFailed && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 px-2 py-2
              bg-gradient-to-t from-black/60 to-transparent
              md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onLightbox() }}
              className="text-white text-[11px] font-medium px-2.5 py-1 rounded-lg
                bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors"
            >
              View
            </button>
            <a
              href={getDriveDownloadUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hidden md:block text-white text-[11px] font-medium px-2.5 py-1 rounded-lg
                bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors"
            >
              Download
            </a>
          </div>
        )}
      </div>

      {/* Comment count badge — click opens the comment panel for this slot */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        title="Comments"
        className={`flex absolute -top-2 right-5 px-2 h-5 text-[10px] rounded-full
          items-center justify-center font-bold shadow-sm
          ${count > 0 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}
      >
        Comments {count}
      </button>

      {/* Item order */}
      <div
        className="absolute -top-2 -left-2 w-5 h-5 text-[10px] rounded-full flex items-center
          justify-center font-bold shadow-sm bg-gray-200 text-gray-500"
      >
        {index}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PostDetail({ postId, user, onClose }: Props) {
  const router = useRouter()
  const { users } = useUsers()

  // Data
  const [post, setPost] = useState<SMPost | null>(null)
  const [comments, setComments] = useState<SMComment[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Edit states
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [editingBody, setEditingBody] = useState(false)
  const [bodyDraft, setBodyDraft] = useState('')
  const [editingImages, setEditingImages] = useState(false)
  const [imagesDraft, setImagesDraft] = useState<string[]>([])
  const [editingDocUrl, setEditingDocUrl] = useState(false)
  const [docUrlDraft, setDocUrlDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // UI
  const [selectedImg, setSelectedImg] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  // Mail
  const [showMailDraft, setShowMailDraft] = useState(false)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [mailMessage, setMailMessage] = useState('')
  const [sendingMail, setSendingMail] = useState(false)
  const [savedEmails, setSavedEmails] = useState<string[]>([])

  // ── Derived (safe before early returns) ──────────────────────────────────────
  const isRegUser = useMemo(
    () => users.some((u) => u.email === user?.email),
    [users, user?.email]
  )
  const mailSent = useMemo(() => history.some((h) => h.type === 'mail_sent'), [history])

  // Seed + registered users + previously used, de-duplicated (case-insensitive)
  const emailSuggestions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of [...savedEmails, ...users.map((u) => u.email), ...SEED_EMAILS]) {
      if (e && !seen.has(e.toLowerCase())) seen.set(e.toLowerCase(), e)
    }
    return [...seen.values()]
  }, [savedEmails, users])

  // ── Firestore listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, 'posts', postId), (snap) => {
      setPost(snap.exists() ? ({ id: snap.id, ...snap.data() } as SMPost) : null)
      setLoading(false)
    })
    return () => unsub()
  }, [postId])

  useEffect(() => {
    const q = query(collection(firestore, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) =>
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SMComment)))
    )
    return () => unsub()
  }, [postId])

  useEffect(() => {
    const q = query(collection(firestore, 'posts', postId, 'history'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, (snap) =>
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEvent)))
    )
    return () => unsub()
  }, [postId])

  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, ...RECIPIENTS_DOC_PATH),
      (snap) => setSavedEmails((snap.data()?.emails as string[] | undefined) ?? []),
      (err) => console.error('mailRecipients listener:', err)
    )
    return () => unsub()
  }, [])

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading post…</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">Post not found.</p>
          <button onClick={() => router.push('/')} className="text-sm text-blue-500 hover:underline">
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  // Assignee acts as "creator" for permission purposes; falls back to createdBy for
  // legacy posts that predate the assignedTo field.
  const isAssignee = post.assignedTo
    ? post.assignedTo === user?.email
    : post.createdBy?.uid === user?.uid
  const isAdmin = users.find((u) => u.email === user?.email)?.role === 'admin'
  const cfg = STATUS_CFG[post.status] ?? STATUS_CFG.draft
  const myApproval = (post.approvedBy || []).find((a) => a.uid === user?.uid)
  const hasApproval = (post.approvedBy?.length ?? 0) > 0
  const canChangeStatus =
    !!user && isRegUser && (isAssignee || post.status === 'approved' || post.status === 'posted')

  const actor: PostActor = {
    uid: user?.uid || '',
    name: user?.displayName || 'User',
    photoURL: user?.photoURL || '',
    email: user?.email || '',
  }

  const notifyActor = {
    email: user?.email || '',
    name: user?.displayName || 'User',
    photoURL: user?.photoURL || '',
  }

  // Recipients for post-level notifications: creator + current assignee
  const ownerRecipients = [post.createdBy?.email, post.assignedTo]

  const notifyOwners = (type: AppNotification['type'], message: string) =>
    notify({
      recipients: ownerRecipients,
      actor: notifyActor,
      type,
      postId,
      postTitle: post.title,
      message,
    })

  const unresolvedFor = (target: string) =>
    comments.filter((c) => c.target === target && !c.resolved).length

  const approvalLabel = () => {
    const approvers = post.approvedBy || []
    if (approvers.length === 0) return null
    if (approvers.length === 1) return `Approved by ${approvers[0].name}`
    if (approvers.length === 2) return `Approved by ${approvers[0].name} and ${approvers[1].name}`
    const rest = approvers.length - 2
    return `Approved by ${approvers[0].name}, ${approvers[1].name}, and ${rest} other${rest > 1 ? 's' : ''}`
  }

  // ── History logger ───────────────────────────────────────────────────────────
  const log = (type: HistoryEvent['type'], before?: string, after?: string) =>
    addDoc(collection(firestore, 'posts', postId, 'history'), {
      type,
      actor,
      timestamp: serverTimestamp(),
      ...(before !== undefined ? { before } : {}),
      ...(after !== undefined ? { after } : {}),
    })

  // ── Share link ───────────────────────────────────────────────────────────────
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareText(post, postId)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Mail ─────────────────────────────────────────────────────────────────────
  const toggleMailDraft = () => {
    if (!showMailDraft) {
      // Fresh default message each time the panel opens
      setMailMessage(
        `Hi\nThe Post is ready. Please find the schedule and review the post using the link.\n\n${shareText(post, postId)}`
      )
    }
    setShowMailDraft((v) => !v)
  }

  const handleSendMail = async () => {
    const toList = mailTo
    const ccList = mailCc
    const invalid = [...toList, ...ccList].filter((e) => !isValidEmail(e))

    if (toList.length === 0) { alert('Add at least one recipient.'); return }
    if (invalid.length) { alert(`Check these addresses: ${invalid.join(', ')}`); return }

    setSendingMail(true)
    try {
      const url = process.env.NEXT_PUBLIC_MAIL_SCRIPT
      if (!url) throw new Error('NEXT_PUBLIC_MAIL_SCRIPT env var is not set')

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // avoids CORS preflight on Apps Script
        body: JSON.stringify({
          to: toList.join(','),
          user: user?.email,
          cc: ccList.join(','),
          subject: `SM Approval Request: ${post.title}`,
          message: mailMessage,
        }),
      })
      // Apps Script returns an HTML page (not JSON) when the deployment is private,
      // the URL is wrong, or the script throws — read as text so we can show why.
      const raw = await res.text()
      let result: { success?: boolean; error?: string }
      try {
        result = JSON.parse(raw)
      } catch {
        const title = raw.match(/<title>(.*?)<\/title>/i)?.[1]
        console.error('Mail script returned non-JSON:', res.status, raw.slice(0, 500))
        throw new Error(
          `Mail script returned an HTML page instead of JSON (HTTP ${res.status}${title ? `: ${title}` : ''}). ` +
          'Check the deployment URL and that access is set to "Anyone".'
        )
      }
      if (!result.success) throw new Error(result.error || 'Mail script reported a failure')

      // Remember these addresses for autocomplete (non-blocking)
      setDoc(
        doc(firestore, ...RECIPIENTS_DOC_PATH),
        { emails: arrayUnion(...toList, ...ccList) },
        { merge: true }
      ).catch(console.error)

      await log(
        'mail_sent',
        undefined,
        `To: ${toList.join(', ')}${ccList.length ? `, Cc: ${ccList.join(', ')}` : ''}`
      )
      await notifyOwners('post_edited', `${actor.name} sent an approval email for "${post.title}"`)

      setShowMailDraft(false)
    } catch (err) {
      console.error(err)
      alert(`Failed to send email.\n${err instanceof Error ? err.message : ''}`)
    } finally {
      setSendingMail(false)
    }
  }

  // ── Saves ────────────────────────────────────────────────────────────────────
  const saveTitle = async () => {
    const next = titleDraft.trim()
    if (!next || next === post.title) { setEditingTitle(false); return }
    setSaving(true)
    try {
      await updateDoc(doc(firestore, 'posts', postId), { title: next })
      await log('title_edit', post.title, next)
      await notifyOwners('post_edited', `${actor.name} changed the title of "${post.title}"`)
      // Rename the Drive subfolder to match the new title (fire-and-forget)
      fetch('/api/rename-sm-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, newTitle: next }),
      }).catch(() => {})
      setEditingTitle(false)
    } finally {
      setSaving(false)
    }
  }

  const saveSchedule = async () => {
    setSaving(true)
    try {
      const newDate = dayjs.tz(scheduleDraft, IST).toDate()
      const before = formatIST(post.scheduledAt)
      const after = dayjs.tz(scheduleDraft, IST).format('DD MMM YYYY, hh:mm A')
      const deadline = dayjs.tz(newDate, IST).format('YYYY-MM-DD')

      await updateDoc(doc(firestore, 'posts', postId), { scheduledAt: Timestamp.fromDate(newDate) })
      if (post.sourceTaskId) {
        await updateDoc(doc(firestore, 'tasks', post.sourceTaskId), { deadline })
        await updateRtdbItem(post.sourceTaskId, { deadline })
      }

      await log('schedule_changed', before, after)
      await notifyOwners('post_edited', `${actor.name} rescheduled "${post.title}"\n${before} ➜ ${after}`)
      setEditingSchedule(false)
    } finally {
      setSaving(false)
    }
  }

  const saveBody = async () => {
    if (bodyDraft === post.bodyCopy) { setEditingBody(false); return }
    setSaving(true)
    try {
      await updateDoc(doc(firestore, 'posts', postId), { bodyCopy: bodyDraft })
      await log('body_edit', post.bodyCopy, bodyDraft)
      await notifyOwners('post_edited', `${actor.name} edited the body copy of "${post.title}"`)
      setEditingBody(false)
    } finally {
      setSaving(false)
    }
  }

  const saveImages = async () => {
    setSaving(true)
    try {
      const current = post.images || []
      const trimmed = imagesDraft.filter((u) => u.trim())
      const oldSet = new Set(current)
      const newSet = new Set(trimmed)
      const added = trimmed.filter((u) => !oldSet.has(u))
      const removed = current.filter((u) => !newSet.has(u))
      // Reorder = URLs present in both old and new, but in a different order
      const oldKept = current.filter((u) => newSet.has(u))
      const newKept = trimmed.filter((u) => oldSet.has(u))
      const reordered = oldKept.length === newKept.length && oldKept.some((u, i) => u !== newKept[i])

      await updateDoc(doc(firestore, 'posts', postId), { images: trimmed })
      for (const url of added) await log('image_added', undefined, url)
      for (const url of removed) await log('image_removed', url, undefined)
      if (reordered) await log('image_reordered', JSON.stringify(oldKept), JSON.stringify(newKept))
      if (added.length || removed.length || reordered) {
        await notifyOwners('post_edited', `${actor.name} updated the images of "${post.title}"`)
      }
      setEditingImages(false)
    } finally {
      setSaving(false)
    }
  }

  const saveDocUrl = async () => {
    const trimmed = docUrlDraft.trim()
    if (trimmed === (post.docUrl || '')) { setEditingDocUrl(false); return }
    setSaving(true)
    try {
      await updateDoc(doc(firestore, 'posts', postId), { docUrl: trimmed })
      await log('doc_url_edit', post.docUrl || '', trimmed)
      await notifyOwners('post_edited', `${actor.name} updated the document URL of "${post.title}"`)
      setEditingDocUrl(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Approve / revoke ─────────────────────────────────────────────────────────
  const toggleApprove = async () => {
    if (!user) return
    if (myApproval) {
      const newApprovedBy = (post.approvedBy || []).filter((a) => a.uid !== user.uid)
      const newStatus =
        newApprovedBy.length === 0 && post.status === 'approved' ? 'draft' : post.status
      await updateDoc(doc(firestore, 'posts', postId), { approvedBy: newApprovedBy, status: newStatus })
      await log('approval_reverted')
      if (newStatus !== post.status) await log('status_changed', post.status, newStatus)
      await notifyOwners('approval_reverted', `${actor.name} revoked their approval on "${post.title}"`)
    } else {
      const approval = {
        uid: user.uid,
        name: user.displayName || 'User',
        photoURL: user.photoURL || '',
        approvedAt: Timestamp.now(),
      }
      const prevStatus = post.status
      await updateDoc(doc(firestore, 'posts', postId), {
        approvedBy: [...(post.approvedBy || []), approval],
        status: 'approved',
      })
      await log('approved')
      if (prevStatus !== 'approved') await log('status_changed', prevStatus, 'approved')
      await notifyOwners('post_approved', `${actor.name} approved "${post.title}"`)
    }
  }

  // ── Status change ────────────────────────────────────────────────────────────
  const setStatus = async (status: SMPost['status']) => {
    if ((status === 'scheduled' || status === 'posted') && !hasApproval) return
    const prev = post.status
    await updateDoc(doc(firestore, 'posts', postId), { status })
    await log('status_changed', prev, status)
    await notifyOwners('status_changed', `${actor.name} changed the status of "${post.title}" from ${prev} to ${status}`)

    // Bidirectional sync with linked task. A missing task (deleted via the
    // /database cleanup flow) is a clean state, not an error — skip silently.
    if (!post.sourceTaskId) return
    const taskRef = doc(firestore, 'tasks', post.sourceTaskId)
    const taskSnap = await getDoc(taskRef)
    if (!taskSnap.exists()) return

    const task = taskSnap.data()
    const completedBy: string[] = Array.isArray(task.completed_by) ? task.completed_by : []
    const actorEmail = actor.email??''

    if (status === 'posted') {
      await updateDoc(taskRef, {
        current_status: 'Posted',
        completed_by: completedBy.includes(actorEmail) ? completedBy : [...completedBy, actorEmail],
      })
      await updateRtdbItem(post.sourceTaskId, { sm_status: 'Posted' })
    } else if (prev === 'posted') {
      await updateDoc(taskRef, {
        current_status: 'In Progress',
        completed_by: completedBy.filter((e) => e !== actorEmail),
      })
      await updateRtdbItem(post.sourceTaskId, { sm_status: 'Working' })
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    await deleteDoc(doc(firestore, 'posts', postId))
    if (post.sourceTaskId) {
      await updateDoc(doc(firestore, 'tasks', post.sourceTaskId), { assigned_to: [''] })
      await updateRtdbItem(post.sourceTaskId, { assigned_to: '', sm_status: 'No Post' })
    }
    onClose()
  }

  // ── Reassign ─────────────────────────────────────────────────────────────────
  const reassign = async (newEmail: string) => {
    setShowAssignMenu(false)
    if (newEmail === post.assignedTo) return

    const newName = users.find((u) => u.email === newEmail)?.displayName || newEmail
    const before = JSON.stringify({ email: post.assignedTo || '', name: post.assignedToName || '' })
    const after = JSON.stringify({ email: newEmail, name: newName })

    await updateDoc(doc(firestore, 'posts', postId), { assignedTo: newEmail, assignedToName: newName })
    if (post.sourceTaskId) {
      await updateDoc(doc(firestore, 'tasks', post.sourceTaskId), { assigned_to: [newEmail] })
      await updateRtdbItem(post.sourceTaskId, { assigned_to: newEmail })
    }

    await log('assignment_changed', before, after)
    await notify({
      recipients: [newEmail],
      actor: notifyActor,
      type: 'post_assigned',
      postId,
      postTitle: post.title,
      message: `${actor.name} assigned you to "${post.title}"`,
    })
  }

  // ── Edit starters ────────────────────────────────────────────────────────────
  const startEditTitle = () => { setTitleDraft(post.title); setEditingTitle(true) }
  const startEditSchedule = () => {
    setScheduleDraft(
      post.scheduledAt?.toDate
        ? dayjs(post.scheduledAt.toDate()).tz(IST).format('YYYY-MM-DDTHH:mm')
        : dayjs().tz(IST).format('YYYY-MM-DDTHH:mm')
    )
    setEditingSchedule(true)
  }
  const startEditBody = () => { setBodyDraft(post.bodyCopy || ''); setEditingBody(true) }
  const startEditImages = () => { setImagesDraft([...(post.images || [])]); setEditingImages(true) }
  const startEditDocUrl = () => { setDocUrlDraft(post.docUrl || ''); setEditingDocUrl(true) }

  const mailInputClass =
    'w-full min-w-0 rounded-md border border-amber-200 px-2 py-1.5 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white'

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={() => (isRegUser ? onClose() : router.push('/'))}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
          >
            ← Back
          </button>

          {/* Title (editable) */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            {editingTitle ? (
              <>
                <input
                  className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-base font-bold
                    focus:outline-none focus:ring-2 focus:ring-blue-300 max-w-lg"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') setEditingTitle(false)
                  }}
                  autoFocus
                />
                <button
                  onClick={saveTitle}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button onClick={() => setEditingTitle(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-lg font-bold text-gray-900 truncate">{post.title}</h1>
                {isRegUser && (
                  <button
                    onClick={startEditTitle}
                    className="text-gray-300 hover:text-gray-600 flex-shrink-0 text-base"
                    title="Edit title"
                  >
                    ✎
                  </button>
                )}
              </>
            )}
          </div>

          <span className={`px-3 py-1 text-xs rounded-full border font-medium flex-shrink-0 ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </span>

          <button
            onClick={copyShareLink}
            title="Copy shareable link"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50
              hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
          >
            {copied ? '✓ Copied' : '🔗 link'}
          </button>

          {/* Mail for approval */}
          {isRegUser && (
            <div className="flex flex-col relative w-full sm:w-auto">
              <button
                onClick={toggleMailDraft}
                title="Send Mail"
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border
                  ${mailSent
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  } transition-colors whitespace-nowrap w-fit max-w-full`}
              >
                <Mail className={`w-3.5 h-3.5 flex-shrink-0 ${mailSent ? 'text-green-600' : ''}`} />
                <span className="truncate">
                  <span className="hidden sm:inline">
                    {mailSent ? 'Resend Email for Approval' : 'Mail for Approval'}
                  </span>
                  <span className="inline sm:hidden">{mailSent ? 'Resend' : 'Mail'}</span>
                </span>
              </button>

              {showMailDraft && (
                <div
                  className="absolute left-0 right-0 sm:right-auto top-full mt-2 z-10
                    w-[calc(100vw-3rem)] sm:w-96 max-w-96 text-sm p-3 sm:p-4 flex flex-col gap-2
                    bg-amber-50 border border-amber-200 rounded-lg shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium text-gray-800 text-sm sm:text-base">Share mail for Approval</h2>
                    <button
                      onClick={() => setShowMailDraft(false)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="flex-shrink-0 w-6 pt-2 self-start text-xs sm:text-sm text-gray-600">To:</p>
                    <EmailChipInput
                      value={mailTo}
                      onChange={setMailTo}
                      suggestions={emailSuggestions}
                      placeholder="Recipient email(s)"
                      ariaLabel="To"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="flex-shrink-0 w-6 pt-2 self-start text-xs sm:text-sm text-gray-600">Cc:</p>
                    <EmailChipInput
                      value={mailCc}
                      onChange={setMailCc}
                      suggestions={emailSuggestions}
                      placeholder="optional"
                      ariaLabel="Cc"
                    />
                  </div>

                  <p className="text-[11px] sm:text-xs p-2 bg-amber-100 rounded-md break-words">
                    communications@atree.org and you will be copied by default. Press Enter or
                    comma after each address.
                  </p>

                  <textarea
                    value={mailMessage}
                    onChange={(e) => setMailMessage(e.target.value)}
                    placeholder="Message"
                    rows={4}
                    className={`${mailInputClass} resize-none`}
                  />

                  <button
                    onClick={handleSendMail}
                    disabled={sendingMail}
                    className="self-end text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600
                      text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMail ? 'Sending…' : 'Send'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-16">
        {/* ── Meta card ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
          {/* Scheduled */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Scheduled (IST)</p>
            {editingSchedule ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="datetime-local"
                  className="border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={scheduleDraft}
                  onChange={(e) => setScheduleDraft(e.target.value)}
                />
                <button
                  onClick={saveSchedule}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button onClick={() => setEditingSchedule(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{formatIST(post.scheduledAt)}</p>
                {isRegUser && (
                  <button onClick={startEditSchedule} className="text-gray-300 hover:text-gray-600 text-base" title="Edit schedule">
                    ✎
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Creator */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Created by</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                {post.createdBy?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{post.createdBy?.name}</p>
                {post.createdAt && <p className="text-[10px] text-gray-400">{formatIST(post.createdAt)}</p>}
              </div>
            </div>
          </div>

          {/* Assigned to */}
          <div className="relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Assigned to</p>
            <div
              className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer group' : ''}`}
              onClick={() => isAdmin && setShowAssignMenu((v) => !v)}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: emailToColor(post.assignedTo || post.createdBy?.email || '') }}
                title={post.assignedToName || post.createdBy?.name}
              >
                {getInitial(post.assignedToName || post.createdBy?.name || '?')}
              </div>
              <p className="text-sm font-medium text-gray-800">{post.assignedToName || post.createdBy?.name}</p>
              {isAdmin && <span className="text-gray-300 text-xs group-hover:text-gray-500">▾</span>}
            </div>

            {showAssignMenu && (
              <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                {users.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => reassign(u.email)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2
                      ${u.email === post.assignedTo ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: emailToColor(u.email) }}
                    >
                      {getInitial(u.displayName || u.email)}
                    </div>
                    <span className="truncate">{u.displayName || u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Approvals */}
          {hasApproval && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Approvals</p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {(post.approvedBy || []).slice(0, 4).map((a) => (
                    <div
                      key={a.uid}
                      title={a.name}
                      className="w-7 h-7 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-xs font-bold text-green-700"
                    >
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{approvalLabel()}</p>
              </div>
            </div>
          )}

          {/* Document URL */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Document URL</p>
            {editingDocUrl ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="flex-1 min-w-0 border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="https://docs.google.com/…"
                  value={docUrlDraft}
                  onChange={(e) => setDocUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDocUrl()
                    if (e.key === 'Escape') setEditingDocUrl(false)
                  }}
                  autoFocus
                />
                <button
                  onClick={saveDocUrl}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button onClick={() => setEditingDocUrl(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {post.docUrl ? (
                  <a href={post.docUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                    {post.docUrl}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">No document linked.</p>
                )}
                {isRegUser && (
                  <button
                    onClick={startEditDocUrl}
                    className="text-gray-300 hover:text-gray-600 flex-shrink-0 text-base"
                    title="Edit document URL"
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Images ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">Images</h2>
            {editingImages ? (
              <div className="flex gap-2">
                <button
                  onClick={saveImages}
                  disabled={saving}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingImages(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              isRegUser && (
                <button onClick={startEditImages} className="text-sm text-blue-500 hover:text-blue-700">
                  Edit Images
                </button>
              )
            )}
          </div>

          {editingImages ? (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Paste a Google Drive link or click <strong>Upload</strong> to upload directly. Uploaded files are shared automatically.
              </p>
              <ImageSlotList initialUrls={imagesDraft} postId={postId} postTitle={post.title} onChange={setImagesDraft} />
            </div>
          ) : (post.images?.length ?? 0) > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(post.images || []).map((url, i) => (
                  <MediaGridItem
                    key={`${i}-${url}`}
                    index={i + 1}
                    url={url}
                    count={unresolvedFor(`image:${i}`)}
                    isSelected={selectedImg === i}
                    onSelect={() => setSelectedImg(selectedImg === i ? null : i)}
                    onLightbox={() => setLightboxIndex(i)}
                  />
                ))}
              </div>

              {/* Inline comment panel for selected image */}
              {selectedImg !== null && (
                <div className="mt-4 border border-blue-200 rounded-2xl overflow-hidden bg-blue-50/30 min-h-[200px]">
                  <CommentThread
                    postId={postId}
                    target={`image:${selectedImg}`}
                    comments={comments.filter((c) => c.target === `image:${selectedImg}`)}
                    currentUser={user}
                    isAssignee={isAssignee}
                    title={`Comments — Image ${selectedImg + 1}`}
                    onClose={() => setSelectedImg(null)}
                    postTitle={post.title}
                    creatorEmail={post.createdBy?.email}
                    assigneeEmail={post.assignedTo}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No images added.{' '}
              {isRegUser && (
                <button onClick={startEditImages} className="text-blue-400 hover:underline not-italic">
                  Add one?
                </button>
              )}
            </p>
          )}
        </section>

        {/* ── Body + comment thread ── */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Body Copy</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {editingBody ? (
                <div>
                  <textarea
                    className="w-full border border-blue-300 rounded-2xl px-4 py-3 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y min-h-[180px]"
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveBody}
                      disabled={saving}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBody(false)}
                      className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-4 py-2 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onClick={startEditBody}
                    className="min-h-[180px] border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700
                      cursor-pointer hover:border-blue-300 hover:bg-gray-50/50 transition-all break-words whitespace-pre-wrap"
                  >
                    {post.bodyCopy || <span className="text-gray-300">Click to add body copy…</span>}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1">Click to edit</p>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white min-h-[200px]">
              <CommentThread
                postId={postId}
                target="body"
                comments={comments.filter((c) => c.target === 'body')}
                currentUser={user}
                isAssignee={isAssignee}
                title="Comments on body copy"
                postTitle={post.title}
                creatorEmail={post.createdBy?.email}
                assigneeEmail={post.assignedTo}
              />
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-bold text-gray-800 mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {/* Approve / revoke — anyone signed in */}
            <button
              onClick={toggleApprove}
              disabled={!user}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${myApproval
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {myApproval ? '✓ Approved — click to revoke' : 'Approve'}
            </button>

            {/* Mark as Posted: assignee always; any registered user once approved/posted */}
            {canChangeStatus && post.status !== 'posted' && (
              <button
                onClick={() => setStatus('posted')}
                disabled={!hasApproval}
                title={!hasApproval ? 'Requires at least one approval' : undefined}
                className="px-4 py-2 rounded-xl text-sm font-medium border bg-green-50 text-green-700 border-green-200
                  hover:bg-green-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50"
              >
                Mark as Posted
              </button>
            )}

            {/* Set to Scheduled: same rule as above */}
            {canChangeStatus && post.status !== 'scheduled' && (
              <button
                onClick={() => setStatus('scheduled')}
                disabled={!hasApproval}
                title={!hasApproval ? 'Requires at least one approval' : undefined}
                className="px-4 py-2 rounded-xl text-sm font-medium border bg-purple-50 text-purple-700 border-purple-200
                  hover:bg-purple-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-50"
              >
                Set to Scheduled
              </button>
            )}

            {canChangeStatus && !hasApproval && (
              <p className="w-full text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-1">
                Scheduling and posting require at least one approval.
              </p>
            )}

            {/* Assignee-only: revert to draft + delete */}
            {isAssignee && (
              <>
                {post.status !== 'draft' && (
                  <button
                    onClick={() => setStatus('draft')}
                    className="px-4 py-2 rounded-xl text-sm font-medium border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    Revert to Draft
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-all"
                >
                  Delete Post
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── History ── */}
        <section className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">History</h2>
          <HistoryLog history={history} />
        </section>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Post?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>&quot;{post.title}&quot;</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image/video lightbox with slide navigation ── */}
      {lightboxIndex !== null && (
        <PostDetailLightbox
          images={post.images || []}
          initialIndex={lightboxIndex}
          postId={postId}
          postTitle={post.title}
          comments={comments}
          currentUser={user}
          isAssignee={isAssignee}
          creatorEmail={post.createdBy?.email}
          assigneeEmail={post.assignedTo}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}