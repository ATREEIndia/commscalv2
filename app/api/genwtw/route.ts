import { NextRequest, NextResponse } from 'next/server'
import { adminDb, getAdminAuth } from '../../../lib/firebaseAdmin'

const NEWSLETTER_URL = 'https://asia-south1-resourcehub-d7764.cloudfunctions.net/runNewsletter'

// Runs the WTW newsletter build. The run token stays on the server; callers must
// be signed in as an admin (reg_users/{email}.role === 'admin').
export async function POST(req: NextRequest) {
  // WTW_KEY is the server-only name; NEXT_PUBLIC_WTW_KEY is accepted until the env is renamed.
  const runToken = process.env.WTW_KEY ?? process.env.NEXT_PUBLIC_WTW_KEY
  if (!runToken) {
    return NextResponse.json({ error: 'WTW_KEY is not configured on the server.' }, { status: 500 })
  }

  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!idToken) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  let email: string | undefined
  try {
    email = (await getAdminAuth().verifyIdToken(idToken)).email
  } catch {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
  }
  const userDoc = email ? await adminDb.collection('reg_users').doc(email).get() : null
  if (userDoc?.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can generate the newsletter.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const date = body?.date
  const force = body?.force === true
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
    return NextResponse.json({ error: 'Please pick a valid date.' }, { status: 400 })
  }

  try {
    const res = await fetch(NEWSLETTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-run-token': runToken },
      body: JSON.stringify({ date, force }),
    })
    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
    return NextResponse.json({ ok: res.ok, status: res.status, data }, { status: res.ok ? 200 : 502 })
  } catch (error) {
    console.error('runNewsletter failed:', error)
    return NextResponse.json({ error: 'Could not reach the newsletter service.' }, { status: 502 })
  }
}
