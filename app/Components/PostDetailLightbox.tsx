'use client'
import { useEffect, useRef, useState } from 'react'
import { FaFilm } from 'react-icons/fa'
import type { SMComment } from '../smcal/types'
import { convertDriveUrlFull } from '../../lib/driveUrl'
import { useMediaType } from '../hooks/useMediaType'
import CommentThread from './CommentThread'

interface CurrentUser {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

type Props = {
  images: string[]
  initialIndex: number
  postId: string
  postTitle: string
  comments: SMComment[]
  currentUser: CurrentUser | null
  isAssignee: boolean
  creatorEmail?: string
  assigneeEmail?: string
  onClose: () => void
}

const SWIPE_THRESHOLD = 50

// ── One slide: image (contained, full view) or video (thumbnail + play-to-Drive) ──
function MediaSlide({ url }: { url: string }) {
  const isVideo = useMediaType(url) === 'video'
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="relative w-full h-full flex items-center justify-center px-12 sm:px-16">
      {!imgErr ? (
        <img
          src={convertDriveUrlFull(url)}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none"
          draggable={false}
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-full max-w-sm aspect-video rounded-xl bg-white/5 flex flex-col
          items-center justify-center gap-2 text-gray-400">
          <FaFilm size={32} />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-300 underline"
          >
            Open in Drive ↗
          </a>
        </div>
      )}

      {isVideo && !imgErr && (
        <button
          onClick={(e) => { e.stopPropagation(); window.open(url, '_blank', 'noopener,noreferrer') }}
          aria-label="Play video in Drive"
          className="absolute inset-0 flex items-center justify-center group"
        >
          <span className="w-16 h-16 rounded-full bg-black/50 group-hover:bg-black/65
            text-white flex items-center justify-center text-2xl transition-colors">▶</span>
        </button>
      )}
    </div>
  )
}

export default function PostDetailLightbox({
  images, initialIndex, postId, postTitle, comments, currentUser, isAssignee,
  creatorEmail, assigneeEmail, onClose,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showComments, setShowComments] = useState(true)
  const total = images.length

  const goPrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : i))
  const goNext = () => setCurrentIndex((i) => (i < total - 1 ? i + 1 : i))

  // ── Keyboard nav ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, onClose])

  // ── Touch swipe ───────────────────────────────────────────────────────────────
  const swipeStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { swipeStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current == null) return
    const delta = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0) goNext()
    else goPrev()
  }

  // ── Preload neighbors — same convertDriveUrlFull URL the slide itself renders,
  // so the preloaded response is actually reused by the <img> rather than warming
  // a different-sized thumbnail that goes unused ──────────────────────────────────
  useEffect(() => {
    const preload = (url: string) => { const img = new Image(); img.src = convertDriveUrlFull(url) }
    if (images[currentIndex - 1]) preload(images[currentIndex - 1])
    if (images[currentIndex + 1]) preload(images[currentIndex + 1])
  }, [currentIndex, images])

  const target = `image:${currentIndex}`
  const targetComments = comments.filter((c) => c.target === target)
  const unresolvedCount = targetComments.filter((c) => !c.resolved).length

  const arrowCls = `absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 flex
    items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white
    text-2xl leading-none transition-colors disabled:opacity-0 disabled:pointer-events-none`

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex flex-col sm:flex-row"
      onClick={onClose}
    >
      {/* ── Media area ── */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {/* Position indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full
          bg-white/10 text-white text-xs font-medium backdrop-blur-sm">
          {currentIndex + 1} / {total}
        </div>

        {/* Comment toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v) }}
          title={showComments ? 'Hide comments' : 'Show comments'}
          className="absolute top-4 right-16 z-10 min-w-9 h-9 px-2 flex items-center justify-center
            rounded-full bg-white/10 hover:bg-white/25 text-white text-sm transition-colors gap-1"
        >
          💬{unresolvedCount > 0 && <span className="font-bold">{unresolvedCount}</span>}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center
            rounded-full bg-white/10 hover:bg-white/25 text-white text-lg transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Slider */}
        <div
          className="w-full h-full overflow-hidden pt-14 pb-4"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex w-full h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((url, i) => (
              <div key={i} className="w-full h-full flex-shrink-0">
                <MediaSlide url={url} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrows — either side of the image */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              disabled={currentIndex === 0}
              aria-label="Previous"
              className={`${arrowCls} left-2 sm:left-4`}
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext() }}
              disabled={currentIndex === total - 1}
              aria-label="Next"
              className={`${arrowCls} right-2 sm:right-4`}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* ── Comment panel: right side on desktop, bottom sheet on mobile ── */}
      {showComments && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-[80] bg-white shadow-2xl flex flex-col
            h-[45vh] w-full rounded-t-2xl overflow-hidden
            sm:h-full sm:w-[360px] sm:rounded-none sm:flex-shrink-0"
        >
          <CommentThread
            postId={postId}
            target={target}
            comments={targetComments}
            currentUser={currentUser}
            isAssignee={isAssignee}
            title={`Comments — Media ${currentIndex + 1}`}
            onClose={() => setShowComments(false)}
            postTitle={postTitle}
            creatorEmail={creatorEmail}
            assigneeEmail={assigneeEmail}
          />
        </div>
      )}
    </div>
  )
}
