import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, getAdminAuth } from '../../../lib/firebaseAdmin'
import { extractDriveFileId } from '../../../lib/driveUrl'

export const runtime = 'nodejs'

// Reads the text on a slide image with Google Cloud Vision (DOCUMENT_TEXT_DETECTION)
// using the Drive service account. Results are cached at
// posts/{postId}/slideText/{fileId}, so each image is only sent to Vision once.
//
// POST { postId, url, force? }  →  { text, cached }
// Requires the Cloud Vision API to be enabled on the service account's GCP project.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!idToken) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  try {
    const { email } = await getAdminAuth().verifyIdToken(idToken)
    const regUser = email ? await adminDb.collection('reg_users').doc(email).get() : null
    if (!regUser?.exists) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
  }

  const { postId, url, force } = (await req.json().catch(() => ({}))) as {
    postId?: string; url?: string; force?: boolean
  }
  if (!postId || !/^[a-zA-Z0-9_-]+$/.test(postId) || !url) {
    return NextResponse.json({ error: 'Missing post or image.' }, { status: 400 })
  }
  const fileId = extractDriveFileId(url)
  if (!fileId) return NextResponse.json({ error: 'Text can only be read from Drive images.' }, { status: 400 })

  const cacheRef = adminDb.collection('posts').doc(postId).collection('slideText').doc(fileId)
  if (!force) {
    const snap = await cacheRef.get()
    // Ignore older entries not produced by Vision (e.g. earlier Tesseract runs).
    if (snap.exists && snap.data()?.engine === 'vision') return NextResponse.json({ text: snap.data()?.text ?? '', cached: true })
  }

  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY = process.env.GOOGLE_DRIVE_PRIVATE_KEY
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/cloud-vision',
    ],
  })

  let content: string
  try {
    const drive = google.drive({ version: 'v3', auth })
    const file = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    )
    content = Buffer.from(file.data as ArrayBuffer).toString('base64')
  } catch (err) {
    console.error('[slide-ocr] drive error for file', fileId, err)
    return NextResponse.json({ error: 'Could not read the image from Drive.' }, { status: 502 })
  }

  let text = ''
  try {
    const vision = google.vision({ version: 'v1', auth })
    const res = await vision.images.annotate({
      requestBody: {
        requests: [{ image: { content }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
      },
    })
    const r = res.data.responses?.[0]
    if (r?.error?.message) throw new Error(r.error.message)
    text = (r?.fullTextAnnotation?.text ?? '').trim()
  } catch (err) {
    console.error('[slide-ocr] vision error for file', fileId, err)
    const msg = err instanceof Error ? err.message : ''
    return NextResponse.json(
      { error: /billing/i.test(msg)
          ? 'Cloud Vision needs billing enabled on the Google Cloud project.'
          : /has not been used|is disabled/i.test(msg)
          ? 'Cloud Vision API is not enabled for this Google project.'
          : 'Could not read text from this slide.' },
      { status: 502 },
    )
  }

  await cacheRef.set({ url, text, engine: 'vision', createdAt: FieldValue.serverTimestamp() })
  return NextResponse.json({ text, cached: false })
}
