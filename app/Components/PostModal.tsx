'use client'
import { useState } from 'react'
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { ref, update } from 'firebase/database'
import { db, firestore } from '../firebase/firebase'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import ImageSlotList from './ImageSlotList'
import { useUsers } from '../constants'
import { notify } from '../../lib/notifications'

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

export interface TaskPrefill {
  taskId: string
  title: string
  bodyCopy: string
  assignedTo: string
  assignedToName: string
  docUrl:string
}

interface Props {
  user: CurrentUser | null
  prefilledDate: string   // YYYY-MM-DD or ''
  onClose: () => void
  taskPrefill?: TaskPrefill
}

export default function PostModal({ user, prefilledDate, onClose, taskPrefill }: Props) {
  const { users } = useUsers()
  const defaultDT = prefilledDate
    ? `${prefilledDate}T09:00`
    : `${dayjs().tz(IST).format('YYYY-MM-DD')}T09:00`

  // Generate a stable Firestore document ID on first render so uploads can use it
  const [postId] = useState(() => doc(collection(firestore, 'posts')).id)
  // Posts added without a Database entry get their own task so they show up in My Tasks
  const [standaloneTaskId] = useState(() => doc(collection(firestore, 'tasks')).id)

  const [title, setTitle]         = useState(taskPrefill?.title ?? '')
  const [scheduledAt, setScheduledAt] = useState(defaultDT)
  const [imageUrls, setImageUrls] = useState<string[]>([''])
  const [docUrl,   setDocUrl]     = useState(taskPrefill?.docUrl ?? '')
  const [bodyCopy, setBodyCopy]   = useState(taskPrefill?.bodyCopy ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const assignedTo     = taskPrefill?.assignedTo || user?.email || ''
  const assignedToName = taskPrefill?.assignedToName || user?.displayName || 'User'

  const handleSubmit = async () => {
    setError('')
    if (!title.trim())  { setError('Title is required.'); return }
    if (!scheduledAt)   { setError('Scheduled date & time is required.'); return }
    if (!user)          { setError('You must be logged in.'); return }

    setSubmitting(true)
    try {
      const scheduledDate = dayjs.tz(scheduledAt, IST).toDate()
      const sourceTaskId = taskPrefill?.taskId || standaloneTaskId

      if (!taskPrefill) {
        const day = dayjs.tz(scheduledAt, IST).format('YYYY-MM-DD')
        await setDoc(doc(firestore, 'tasks', standaloneTaskId), {
          id: standaloneTaskId,
          title: title.trim(),
          description: bodyCopy.trim(),
          url: docUrl.trim(),
          date: day,
          deadline: day,
          createdon: dayjs().tz(IST).format('YYYY-MM-DD'),
          assigned_to: [assignedTo],
          completed_by: [],
          current_status: 'Working',
          linkedSmPostId: postId,
          // Marks the task as owned by this post, so deleting the post deletes it too
          createdFromSmPost: true,
        })
      }

      await setDoc(doc(firestore, 'posts', postId), {
        title: title.trim(),
        bodyCopy: bodyCopy.trim(),
        images: imageUrls.filter((u) => u.trim()),
        docUrl: docUrl.trim(),
        scheduledAt: Timestamp.fromDate(scheduledDate),
        status: 'draft',
        createdBy: {
          uid: user.uid,
          name: user.displayName || 'User',
          photoURL: user.photoURL || '',
          email: user.email || '',
        },
        createdAt: serverTimestamp(),
        approvedBy: [],
        assignedTo,
        assignedToName,
        sourceTaskId,
      })

      const actor = {
        email: user.email || '',
        name: user.displayName || 'User',
        photoURL: user.photoURL || '',
      }

      if (taskPrefill) {
        await updateDoc(doc(firestore, 'tasks', taskPrefill.taskId), {
          linkedSmPostId: postId,
        })

        if (taskPrefill.taskId) {
          const itemRef = ref(db, `/items/${taskPrefill.taskId}`)
          await update(itemRef, { smPostId: postId })
          console.log("sm post id :"+postId)
        }

        const adminEmails = users.filter((u) => u.role === 'admin').map((u) => u.email)
        await notify({
          recipients: adminEmails,
          actor,
          type: 'post_created',
          postId,
          postTitle: title.trim(),
          message: `${actor.name} created a new post "${title.trim()}"`,
        })

        await notify({
          recipients: [assignedTo],
          actor,
          type: 'post_assigned',
          postId,
          postTitle: title.trim(),
          message: `${actor.name} assigned you to "${title.trim()}"`,
        })
      }

      onClose()
    } catch (e) {
      console.error(e)
      setError('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">New Post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center
              justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Scheduled date & time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Scheduled date & time (IST) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Image links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            <span className="text-xs text-gray-400 mb-2">
              Paste a Google Drive link or click <strong>Upload</strong> to upload directly.
              Uploaded files are shared automatically.
              <br></br>
            </span>
            <ImageSlotList
              initialUrls={imageUrls}
              postId={postId}
              postTitle={title}
              onChange={setImageUrls}
            />
          </div>

          {/* Document URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Document URL
            </label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              placeholder="https://docs.google.com/…"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
            />
          </div>

          {/* Body copy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Body copy
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent
                resize-y min-h-[120px]"
              placeholder="Write your post copy here…"
              value={bodyCopy}
              onChange={(e) => setBodyCopy(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border
              border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
