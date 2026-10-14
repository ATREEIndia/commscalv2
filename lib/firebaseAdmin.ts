import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function ensureApp() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      }),
    })
  }
}

function getDb(): Firestore {
  ensureApp()
  return getFirestore()
}

// Called at request time (not import time) for the same reason as adminDb below.
export function getAdminAuth(): Auth {
  ensureApp()
  return getAuth()
}

// Proxy defers initializeApp until the first property access (request time, not build time)
export const adminDb = new Proxy<Firestore>({} as Firestore, {
  get(_, prop: string | symbol) {
    const db = getDb()
    const val = Reflect.get(db, prop)
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(db) : val
  },
})
