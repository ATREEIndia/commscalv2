import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { firestore } from '../app/firebase/firebase'
import type { NotificationActor, NotificationType } from '../app/smcal/types'

interface NotifyArgs {
  recipients: (string | null | undefined)[]
  actor: NotificationActor
  type: NotificationType
  postId: string
  postTitle: string
  message: string
}

export async function notify({ recipients, actor, type, postId, postTitle, message }: NotifyArgs) {
  const uniqueRecipients = [...new Set(recipients.filter((r): r is string => !!r))].filter(
    (r) => r !== actor.email
  )
  await Promise.all(
    uniqueRecipients.map((r) =>
      addDoc(collection(firestore, 'notifications'), {
        recipientEmail: r,
        actor,
        type,
        postId,
        postTitle,
        message,
        read: false,
        createdAt: serverTimestamp(),
      })
    )
  )

  const url = process.env.NEXT_PUBLIC_MAIL_SCRIPT;

  if (!url) {
    throw new Error('NEXT_PUBLIC_MAIL_SCRIPT env var is not set');
  }
  if(message.includes('approval email')){return}

  const res = await fetch(

    url,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        to: Array.isArray(recipients)
          ? [...new Set(recipients.filter(Boolean))].join(',')
          : recipients,
        user: actor?.email,
        subject: `${postTitle}`,
        message:type+'\n'+message+`\n\nhttps://commscal.atree.org/smcal/${postId} `,
      }),
    }
  );
  const result = await res.json();
  console.log(result)






}



const CLEANUP_KEY_PREFIX = 'notif_cleanup_'

export async function cleanupOldNotifications(email: string) {
  if (typeof window === 'undefined') return
  const sessionKey = `${CLEANUP_KEY_PREFIX}${email}`
  if (sessionStorage.getItem(sessionKey)) return
  sessionStorage.setItem(sessionKey, '1')

  const cutoffMillis = Date.now() - 30 * 24 * 60 * 60 * 1000
  const snap = await getDocs(
    query(
      collection(firestore, 'notifications'),
      where('recipientEmail', '==', email)
    )
  )
  const stale = snap.docs.filter((d) => {
    const createdAt = d.data().createdAt as Timestamp | undefined
    return !!createdAt && createdAt.toMillis() < cutoffMillis
  })
  await Promise.all(stale.map((d) => deleteDoc(d.ref)))
}
