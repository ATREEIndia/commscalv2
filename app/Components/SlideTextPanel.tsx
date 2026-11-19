'use client'
import { useEffect, useState } from 'react'
import { getCachedSlideText, scanSlideText } from '../../lib/slideOcr'

interface Props {
  postId: string
  imageUrl: string
  canSuggest: boolean
  onSuggest: (before: string, after: string) => Promise<void>
}

type Status = 'idle' | 'checking' | 'scanning' | 'ready' | 'error'

// Collapsible "Slide text" box shown above a slide's comments. Pulls the text off
// the image with OCR so reviewers can copy it, or edit it and post the change as a
// before/after suggestion.
export default function SlideTextPanel({ postId, imageUrl, canSuggest, onSuggest }: Props) {
  const [open, setOpen]         = useState(false)
  const [status, setStatus]     = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [original, setOriginal] = useState('')
  const [draft, setDraft]       = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [posting, setPosting]   = useState(false)

  // Each slide has its own text — reset when the lightbox moves to another one.
  useEffect(() => {
    setStatus('idle'); setOriginal(''); setDraft(''); setError(''); setProgress(0)
  }, [imageUrl])

  const load = async (force = false) => {
    setError('')
    try {
      if (!force) {
        setStatus('checking')
        const cached = await getCachedSlideText(postId, imageUrl)
        if (cached !== null) { setOriginal(cached); setDraft(cached); setStatus('ready'); return }
      }
      setStatus('scanning'); setProgress(0)
      const text = await scanSlideText(postId, imageUrl, setProgress)
      setOriginal(text); setDraft(text); setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read text from this slide.')
      setStatus('error')
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && status === 'idle') load()
  }

  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const suggest = async () => {
    setPosting(true)
    try {
      await onSuggest(original, draft.trim())
      setDraft(original)
    } finally {
      setPosting(false)
    }
  }

  const changed = draft.trim() !== original.trim() && draft.trim() !== ''
  const busy = status === 'checking' || status === 'scanning'
  const btn = 'text-[10px] px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="border-b border-gray-100 flex-shrink-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium
          text-gray-600 hover:bg-gray-50"
      >
        <span>📝 Slide text</span>
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3">
          {busy && (
            <p className="text-[11px] text-gray-400 py-2">
              {status === 'checking' ? 'Loading…' : `Reading text from slide… ${progress}%`}
            </p>
          )}

          {status === 'error' && (
            <div className="py-2 text-[11px] text-red-500">
              {error}{' '}
              <button onClick={() => load(true)} className="underline">Try again</button>
            </div>
          )}

          {status === 'ready' && (
            <>
              {original === '' && (
                <p className="text-[11px] text-gray-400 pb-1">No text found on this slide.</p>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 max-h-40
                  focus:outline-none focus:ring-1 focus:ring-blue-300 resize-y leading-relaxed"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Auto-read text may have errors. Edit it, then suggest the change.
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <button onClick={copy} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
                {canSuggest && (
                  <button
                    onClick={suggest}
                    disabled={!changed || posting}
                    className={`${btn} bg-blue-500 text-white hover:bg-blue-600`}
                  >
                    {posting ? 'Posting…' : 'Suggest edit'}
                  </button>
                )}
                {changed && (
                  <button onClick={() => setDraft(original)} className={`${btn} text-gray-400 hover:text-gray-600`}>
                    Reset
                  </button>
                )}
                <button
                  onClick={() => load(true)}
                  title="Run OCR again on this slide"
                  className={`${btn} ml-auto text-gray-400 hover:text-gray-600`}
                >
                  Re-scan
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
