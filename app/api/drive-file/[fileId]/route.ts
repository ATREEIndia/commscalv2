import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { adminDb, getAdminAuth } from '../../../../lib/firebaseAdmin'

export const runtime = 'nodejs'

// Streams a Drive file's bytes through the service account, so the browser can
// bundle post media (Drive doesn't allow direct cross-origin downloads).
// Registered users only: the service account can read files that aren't public.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
  }

  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!idToken) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  try {
    const { email } = await getAdminAuth().verifyIdToken(idToken)
    const regUser = email ? await adminDb.collection('reg_users').doc(email).get() : null
    if (!regUser?.exists) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
  }

  const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL
  const PRIVATE_KEY = process.env.GOOGLE_DRIVE_PRIVATE_KEY
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const meta = await drive.files.get({ fileId, fields: 'name,mimeType', supportsAllDrives: true })
    const file = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    )

    return new NextResponse(Readable.toWeb(file.data as Readable) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': meta.data.mimeType ?? 'application/octet-stream',
        'X-File-Name': encodeURIComponent(meta.data.name ?? fileId),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[drive-file] error for file', fileId, err)
    return NextResponse.json({ error: 'Could not read the file from Drive.' }, { status: 502 })
  }
}
