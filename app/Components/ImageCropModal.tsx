'use client'
import React, { useEffect, useRef, useState } from 'react'

type Props = {
  file: File
  aspect?: number            // width / height, default 16:9
  maxOutputWidth?: number    // cropped image is scaled down to this width at most
  onCrop: (file: File) => void
  onUseOriginal: (file: File) => void
  onCancel: () => void
}

type Box = { w: number; h: number }

// Lets the user drag and zoom an image inside a fixed-ratio frame, then crops it
// in the browser with a canvas. No external dependency.
export default function ImageCropModal({
  file,
  aspect = 16 / 9,
  maxOutputWidth = 1920,
  onCrop,
  onUseOriginal,
  onCancel,
}: Props) {
  const [src, setSrc] = useState('')
  const [natural, setNatural] = useState<Box | null>(null)
  const [frame, setFrame] = useState<Box | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)

  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setFrame({ w: el.clientWidth, h: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Scale at which the image just covers the frame; zoom multiplies this.
  const coverScale = natural && frame ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1
  const scale = coverScale * zoom

  const clamp = (x: number, y: number, s = scale) => {
    if (!natural || !frame) return { x, y }
    return {
      x: Math.min(0, Math.max(frame.w - natural.w * s, x)),
      y: Math.min(0, Math.max(frame.h - natural.h * s, y)),
    }
  }

  // Centre the image whenever the image or frame size becomes known/changes.
  useEffect(() => {
    if (!natural || !frame) return
    const s = coverScale * zoom
    setOffset(clamp((frame.w - natural.w * s) / 2, (frame.h - natural.h * s) / 2, s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frame?.w, frame?.h])

  const changeZoom = (next: number) => {
    if (!frame) return setZoom(next)
    // Keep the point at the centre of the frame fixed while zooming.
    const ratio = (coverScale * next) / scale
    const cx = frame.w / 2
    const cy = frame.h / 2
    setZoom(next)
    setOffset(clamp(cx - (cx - offset.x) * ratio, cy - (cy - offset.y) * ratio, coverScale * next))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y))
  }
  const onPointerUp = () => { drag.current = null }

  const crop = async () => {
    if (!natural || !frame || !imgRef.current) return
    setBusy(true)
    try {
      // Visible frame → rectangle in the original image's pixels.
      const sx = -offset.x / scale
      const sy = -offset.y / scale
      const sw = frame.w / scale
      const sh = frame.h / scale
      const outW = Math.round(Math.min(sw, maxOutputWidth))
      const outH = Math.round(outW / aspect)

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH)

      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
      if (!blob) throw new Error('Could not create the cropped image')

      const base = file.name.replace(/\.[^.]+$/, '')
      const ext = type === 'image/png' ? 'png' : 'jpg'
      onCrop(new File([blob], `${base}_16x9.${ext}`, { type }))
    } catch (error) {
      console.error(error)
      alert('Cropping failed. You can upload the original image instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto flex flex-col'>
        <div className='flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100'>
          <h2 className='text-base font-bold text-gray-800'>Crop image to 16:9</h2>
          <button
            type='button'
            onClick={onCancel}
            className='w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500'
            aria-label='Cancel'
          >
            ✕
          </button>
        </div>

        <div className='p-4 sm:p-6 flex flex-col gap-4'>
          <p className='text-xs text-gray-500'>Drag the image to position it and use the slider to zoom. Only the area inside the frame is kept.</p>

          <div
            ref={frameRef}
            className='relative w-full overflow-hidden rounded-xl bg-gray-900 cursor-grab active:cursor-grabbing touch-none select-none'
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt='Image to crop'
                draggable={false}
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className='absolute top-0 left-0 max-w-none origin-top-left pointer-events-none'
                style={{
                  width: natural ? natural.w : undefined,
                  height: natural ? natural.h : undefined,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  visibility: natural && frame ? 'visible' : 'hidden',
                }}
              />
            )}
            <div className='absolute inset-0 pointer-events-none ring-2 ring-inset ring-white/80 rounded-xl' />
          </div>

          <label className='flex items-center gap-3 text-sm text-gray-600'>
            <span className='flex-shrink-0'>Zoom</span>
            <input
              type='range'
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className='w-full accent-blue-600'
            />
          </label>
        </div>

        <div className='px-4 sm:px-6 py-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50'
          >
            Cancel
          </button>
          {/* <button
            type='button'
            onClick={() => onUseOriginal(file)}
            className='px-4 py-2 text-sm text-blue-700 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100'
          >
            Use original
          </button> */}
          <button
            type='button'
            onClick={crop}
            disabled={busy || !natural || !frame}
            className='px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {busy ? 'Cropping…' : 'Crop & upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
