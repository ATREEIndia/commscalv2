'use client'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, firestore } from '../app/firebase/firebase'
import { extractDriveFileId } from './driveUrl'

// OCR for slide images, run in the browser with Tesseract (no API key, no cost).
// Results are cached per post + Drive file at posts/{postId}/slideText/{fileId},
// so a slide is only scanned once; replacing an image gives it a new Drive ID.

type Progress = (pct: number) => void

const cacheRef = (postId: string, key: string) => doc(firestore, 'posts', postId, 'slideText', key)
const cacheKey = (url: string) => extractDriveFileId(url) ?? encodeURIComponent(url).slice(0, 500)

export async function getCachedSlideText(postId: string, url: string): Promise<string | null> {
  try {
    const snap = await getDoc(cacheRef(postId, cacheKey(url)))
    return snap.exists() ? (snap.data().text as string) ?? '' : null
  } catch {
    return null
  }
}

// Drive images come through /api/drive-file (Drive blocks cross-origin reads);
// other URLs are fetched directly and only work if their host allows CORS.
async function fetchImage(url: string): Promise<Blob> {
  const driveId = extractDriveFileId(url)
  let res: Response
  if (driveId) {
    const idToken = (await auth.currentUser?.getIdToken()) ?? ''
    res = await fetch(`/api/drive-file/${driveId}`, { headers: { Authorization: `Bearer ${idToken}` } })
  } else {
    res = await fetch(url)
  }
  if (!res.ok) throw new Error(`Could not load the image (HTTP ${res.status}).`)
  return res.blob()
}

// Tidy Tesseract output: drop stray whitespace and collapse runs of blank lines.
const clean = (s: string) =>
  s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim()

export async function scanSlideText(postId: string, url: string, onProgress?: Progress): Promise<string> {
  const blob = await fetchImage(url)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)) },
  })
  try {
    const { data } = await worker.recognize(blob)
    const text = clean(data.text)
    try {
      await setDoc(cacheRef(postId, cacheKey(url)), { url, text, createdAt: serverTimestamp() })
    } catch (err) {
      console.warn('[slideOcr] could not cache slide text', err)
    }
    return text
  } finally {
    await worker.terminate()
  }
}
