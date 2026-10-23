'use client'
import { useEffect, useRef, useState } from 'react'
import { FaFilm } from 'react-icons/fa'
import { convertDriveUrl } from '../../lib/driveUrl'
import { useMediaType } from '../hooks/useMediaType'

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25 MB
const temp_manual_folder = 'https://drive.google.com/drive/u/0/folders/1YgMS9-em71U_UfSdfydsihLgOggTrUDI'

type SlotStatus = 'idle' | 'uploading' | 'success' | 'error'

type SlotState = {
  id: string
  url: string
  status: SlotStatus
  errorMsg?: string
}

interface Props {
  initialUrls: string[]
  postId: string
  postTitle: string
  onChange: (urls: string[]) => void
  /** Called with the current URLs once all in-flight uploads have finished (after at least one succeeded) */
  onUploadsComplete?: (urls: string[]) => void
}

const genId = () => Math.random().toString(36).slice(2)

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `"${file.name}" is not an allowed type (PNG, JPEG, WebP, GIF, MP4, MOV, WebM)`

  const isVideo = file.type.startsWith('video/')
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    return isVideo
      ? `This video is ${formatMB(file.size)} — over the 25MB upload limit. Please upload it to the shared Drive folder and paste the share link in the URL field on the left.`
      : `"${file.name}" exceeds the 10 MB limit`
  }
  return null
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────
function SlotThumbnail({ url, status }: { url: string; status: SlotStatus }) {
  const [thumbSrc, setThumbSrc] = useState(() => url.trim() ? convertDriveUrl(url) : '')
  const [imgErr, setImgErr] = useState(false)
  const isVideo = useMediaType(url.trim() ? url : undefined) === 'video'

  // Debounce URL → thumbnail to avoid a fetch on every keystroke
  useEffect(() => {
    setImgErr(false)
    if (!url.trim()) { setThumbSrc(''); return }
    const t = setTimeout(() => setThumbSrc(convertDriveUrl(url)), 300)
    return () => clearTimeout(t)
  }, [url])

  const box = 'w-12 h-12 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center relative'

  if (status === 'uploading') {
    return (
      <div className={`${box} bg-gray-100`}>
        <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!thumbSrc) {
    return (
      <div className={`${box} bg-gray-100 text-gray-300`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      </div>
    )
  }

  if (imgErr) {
    if (isVideo) {
      return (
        <div className={`${box} bg-gray-100 text-gray-400`}>
          <FaFilm size={16} />
        </div>
      )
    }
    return (
      <div className={`${box} bg-red-50 border border-red-100 text-red-300`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 5v6.59l-2.99-3-4.01 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42 2.99 3V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l2.99 3 4-4 4 4 4.01-4.01z" />
        </svg>
      </div>
    )
  }

  return (
    <div className={box}>
      <img src={thumbSrc} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center text-[9px] leading-none">▶</span>
        </span>
      )}
    </div>
  )
}

// ── Insert divider ────────────────────────────────────────────────────────────
function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center gap-1 my-0.5">
      <div className="flex-1 h-px bg-gray-100" />
      <button
        type="button"
        onClick={onClick}
        title="Insert slot here"
        className="w-5 h-5 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-600
          text-gray-400 text-xs flex items-center justify-center flex-shrink-0
          transition-colors leading-none"
      >
        +
      </button>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ImageSlotList({ initialUrls, postId, postTitle, onChange, onUploadsComplete }: Props) {
  const [slots, setSlots] = useState<SlotState[]>(() => {
    const urls = initialUrls.length ? initialUrls : ['']
    return urls.map((url) => ({ id: genId(), url, status: 'idle' as SlotStatus }))
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef<string | null>(null)
  const postTitleRef = useRef(postTitle)
  const onChangeRef = useRef(onChange)
  const onUploadsCompleteRef = useRef(onUploadsComplete)
  // Set when an upload succeeds; flushed once no slot is still uploading
  const uploadSucceededRef = useRef(false)

  useEffect(() => { postTitleRef.current = postTitle }, [postTitle])
  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { onUploadsCompleteRef.current = onUploadsComplete })
  useEffect(() => { onChangeRef.current(slots.map((s) => s.url)) }, [slots])
  useEffect(() => {
    if (!uploadSucceededRef.current || slots.some((s) => s.status === 'uploading')) return
    uploadSucceededRef.current = false
    onUploadsCompleteRef.current?.(slots.map((s) => s.url))
  }, [slots])

  // ── Upload helpers ───────────────────────────────────────────────────────────
  const triggerUpload = (slotId: string) => {
    pendingIdRef.current = slotId
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const uploadFile = async (file: File, slotId: string): Promise<void> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('fileName', file.name)
    fd.append('postId', postId)
    fd.append('postTitle', postTitleRef.current || 'untitled')

    try {
      const res = await fetch('/api/upload-sm', { method: 'POST', body: fd })

      // Parse JSON safely — a 413 from Next.js/proxy arrives as plain text
      let data: Record<string, unknown> = {}
      try {
        data = await res.json()
      } catch {
        if (res.status === 413) throw new Error('File is too large — please use a smaller image')
        throw new Error(`Upload failed (HTTP ${res.status})`)
      }

      if (!res.ok) throw new Error((data.error as string) || 'Upload failed')
      uploadSucceededRef.current = true
      setSlots((prev) =>
        prev.map((s) => s.id === slotId ? { ...s, url: data.filelink as string, status: 'success' } : s)
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed — try again'
      setSlots((prev) =>
        prev.map((s) => s.id === slotId ? { ...s, url: '', status: 'error', errorMsg: msg } : s)
      )
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const triggerId = pendingIdRef.current
    pendingIdRef.current = null
    if (!files.length || !triggerId) return

    // Assign stable IDs: reuse triggerId for the first file, generate new ones for the rest
    const fileIds = files.map((_, j) => (j === 0 ? triggerId : genId()))

    const newStates: SlotState[] = files.map((file, j) => {
      const err = validateFile(file)
      return err
        ? { id: fileIds[j], url: '', status: 'error' as SlotStatus, errorMsg: err }
        : { id: fileIds[j], url: '', status: 'uploading' as SlotStatus }
    })

    setSlots((prev) => {
      const triggerIdx = prev.findIndex((s) => s.id === triggerId)
      if (triggerIdx === -1) return prev
      const next = [...prev]
      next[triggerIdx] = newStates[0]
      for (let j = 1; j < newStates.length; j++) {
        next.splice(triggerIdx + j, 0, newStates[j])
      }
      return next
    })

    // ── Fix A: serialize uploads so only one folder-create request races ──────
    // Upload the first valid file alone, wait for it to finish (Drive folder is
    // created here), then fire the rest in parallel.
    const valid = newStates
      .map((s, j) => ({ file: files[j], id: fileIds[j], status: s.status }))
      .filter(({ status }) => status === 'uploading')

    if (valid.length === 0) return

    void (async () => {
      await uploadFile(valid[0].file, valid[0].id)
      if (valid.length > 1) {
        await Promise.all(valid.slice(1).map(({ file, id }) => uploadFile(file, id)))
      }
    })()
  }

  // ── Slot mutations ───────────────────────────────────────────────────────────
  const updateUrl = (id: string, url: string) =>
    setSlots((prev) =>
      prev.map((s) => s.id === id ? { ...s, url, status: 'idle', errorMsg: undefined } : s)
    )

  const removeSlot = (id: string) =>
    setSlots((prev) => prev.filter((s) => s.id !== id))

  const addSlot = () =>
    setSlots((prev) => [...prev, { id: genId(), url: '', status: 'idle' }])

  const insertAtIndex = (idx: number) =>
    setSlots((prev) => {
      const next = [...prev]
      next.splice(idx, 0, { id: genId(), url: '', status: 'idle' })
      return next
    })

  const moveUp = (id: string) =>
    setSlots((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i <= 0) return prev
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })

  const moveDown = (id: string) =>
    setSlots((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i === -1 || i >= prev.length - 1) return prev
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />

      <InsertButton onClick={() => insertAtIndex(0)} />

      {slots.map((slot, i) => (
        <div key={slot.id}>
          {/* ── Slot row ── */}
          <div className="flex gap-1.5 items-center">
            {/* Thumbnail */}
            <SlotThumbnail url={slot.url} status={slot.status} />

            {/* URL input */}
            <div className="relative flex-1 min-w-0">
              <input
                className={`w-full border rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent pr-8
                  ${slot.status === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''}
                  ${slot.status === 'error' ? 'border-red-300 bg-red-50/50' : ''}
                  ${slot.status === 'success' ? 'border-green-300 bg-green-50/50' : ''}
                  ${slot.status === 'idle' || slot.status === 'uploading' ? 'border-gray-200' : ''}`}
                placeholder="https://drive.google.com/file/d/…"
                value={slot.url}
                disabled={slot.status === 'uploading'}
                onChange={(e) => updateUrl(slot.id, e.target.value)}
              />
              {slot.status === 'uploading' && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                  border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              )}
              {slot.status === 'success' && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2
                  text-green-500 text-sm font-bold leading-none">✓</span>
              )}
            </div>

            {/* Upload */}
            <button
              type="button"
              onClick={() => triggerUpload(slot.id)}
              disabled={slot.status === 'uploading'}
              title="Upload image or video file"
              className="h-9 px-2.5 rounded-xl border border-gray-200 bg-gray-50
                hover:bg-gray-100 text-gray-600 text-xs font-medium flex-shrink-0
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              Upload
            </button>

            {/* ↑ */}
            <button
              type="button"
              onClick={() => moveUp(slot.id)}
              disabled={i === 0 || slot.status === 'uploading'}
              title="Move up"
              className="w-8 h-9 rounded-xl border border-gray-200 bg-gray-50
                hover:bg-gray-100 text-gray-500 flex items-center justify-center
                text-sm flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
            >↑</button>

            {/* ↓ */}
            <button
              type="button"
              onClick={() => moveDown(slot.id)}
              disabled={i === slots.length - 1 || slot.status === 'uploading'}
              title="Move down"
              className="w-8 h-9 rounded-xl border border-gray-200 bg-gray-50
                hover:bg-gray-100 text-gray-500 flex items-center justify-center
                text-sm flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
            >↓</button>

            {/* × */}
            <button
              type="button"
              onClick={() => removeSlot(slot.id)}
              disabled={slot.status === 'uploading'}
              title="Remove"
              className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-400
                flex items-center justify-center flex-shrink-0
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >✕</button>
          </div>

          {/* Error + Retry */}
          {slot.status === 'error' && slot.errorMsg && (
            <p className="text-xs text-red-500 pl-[54px] mt-0.5 flex items-center gap-2">
              <span>{slot.errorMsg}
                <a className='text-blue-500' target='_blank' href='https://drive.google.com/drive/u/0/folders/1YgMS9-em71U_UfSdfydsihLgOggTrUDI'> Drive folder</a>
              </span>
              <button
                type="button"
                onClick={() => triggerUpload(slot.id)}
                className="text-blue-500 hover:underline flex-shrink-0"
              >Retry</button>
            </p>
          )}

          <InsertButton onClick={() => insertAtIndex(i + 1)} />
        </div>
      ))}

      <button
        type="button"
        onClick={addSlot}
        className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700
          font-medium mt-1"
      >
        <span className="text-lg leading-none">+</span> Add media
      </button>
    </div>
  )
}
