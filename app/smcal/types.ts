import { Timestamp } from 'firebase/firestore'

export type PostStatus = 'draft' | 'scheduled' | 'approved' | 'posted'

export type PostActor = {
  uid: string
  name: string
  photoURL: string
  email?: string
}

export type Approval = {
  uid: string
  name: string
  photoURL: string
  approvedAt: Timestamp
}

export type SMPost = {
  id?: string
  title: string
  bodyCopy: string
  images: string[]
  docUrl?: string
  scheduledAt: Timestamp
  status: PostStatus
  createdBy: PostActor
  createdAt: Timestamp
  approvedBy: Approval[]
  assignedTo: string
  assignedToName: string
  sourceTaskId?: string
}

export type CommentReply = {
  uid: string
  name: string
  photo: string
  text: string
  createdAt: Timestamp
  editedAt?: Timestamp | null
  editHistory?: Array<{ text: string; editedAt: Timestamp }>
  authorEmail?: string
}

export type SMComment = {
  id?: string
  target: string   // "body" | "image:0" | "image:1" etc.
  authorUid: string
  authorName: string
  authorPhoto: string
  text: string
  createdAt: Timestamp
  resolved: boolean
  replies: CommentReply[]
  editedAt?: Timestamp | null
  editHistory?: Array<{ text: string; editedAt: Timestamp }>
  authorEmail?: string
}

export type HistoryEventType =
  | 'body_edit'
  | 'title_edit'
  | 'image_added'
  | 'image_removed'
  | 'image_reordered'
  | 'doc_url_edit'
  | 'schedule_changed'
  | 'status_changed'
  | 'approved'
  | 'approval_reverted'
  | 'comment_resolved'
  | 'comment_edited'
  | 'comment_unresolved'
  | 'assignment_changed'
  |'mail_sent'


export type HistoryEvent = {
  id?: string
  type: HistoryEventType
  actor: PostActor
  timestamp: Timestamp
  before?: string
  after?: string
  target?: string
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'post_created'
  | 'post_assigned'
  | 'comment_added'
  | 'reply_added'
  | 'post_edited'
  | 'status_changed'
  | 'post_approved'
  | 'approval_reverted'
  | 'comment_resolved'
  | 'comment_unresolved'

export type NotificationActor = {
  email: string
  name: string
  photoURL: string
}

export type AppNotification = {
  id?: string
  recipientEmail: string
  actor: NotificationActor
  type: NotificationType
  postId: string
  postTitle: string
  message: string
  read: boolean
  createdAt: Timestamp
}
