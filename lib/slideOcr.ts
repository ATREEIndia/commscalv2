'use client'
import { auth } from '../app/firebase/firebase'

// Slide-image text via Google Cloud Vision, through /api/slide-ocr. The server
// caches results per post + Drive file, so a slide is only scanned once unless
// `force` is set (Re-scan).
export async function getSlideText(postId: string, url: string, force = false): Promise<string> {
  const idToken = (await auth.currentUser?.getIdToken()) ?? ''
  const res = await fetch('/api/slide-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ postId, url, force }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Could not read text (HTTP ${res.status}).`)
  return data.text ?? ''
}
