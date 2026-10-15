import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { extractDriveFileId } from './driveUrl'

type Fetched = { blob: Blob; name: string }

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
}

const slug = (s: string) =>
  s.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_').slice(0, 60) || 'post'

// Drive files go through /api/drive-file (Drive blocks direct browser downloads);
// other URLs are fetched directly and only work if their host allows it.
async function fetchMedia(url: string, idToken: string): Promise<Fetched> {
  const driveId = extractDriveFileId(url)
  const res = driveId
    ? await fetch(`/api/drive-file/${driveId}`, { headers: { Authorization: `Bearer ${idToken}` } })
    : await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const headerName = res.headers.get('X-File-Name')
  const name = headerName ? decodeURIComponent(headerName) : url.split('/').pop()?.split('?')[0] || 'file'
  return { blob, name }
}

// pdf-lib only embeds JPEG and PNG, so other image types are redrawn as JPEG.
async function toPdfImage(pdf: PDFDocument, blob: Blob) {
  if (blob.type === 'image/png') return pdf.embedPng(await blob.arrayBuffer())
  if (blob.type === 'image/jpeg') return pdf.embedJpg(await blob.arrayBuffer())
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!jpeg) throw new Error('Could not convert image')
  return pdf.embedJpg(await jpeg.arrayBuffer())
}

/**
 * Downloads a zip of the post's media. With more than one image it also
 * contains a PDF of all images, one per page, in post order.
 * Returns the URLs that couldn't be included.
 */
export async function downloadPostMedia(title: string, urls: string[], idToken: string): Promise<string[]> {
  const zip = new JSZip()
  const failed: string[] = []
  const images: Blob[] = []
  const base = slug(title)

  const fetched = await Promise.all(urls.map((u) => fetchMedia(u, idToken).catch(() => null)))
  fetched.forEach((file, i) => {
    if (!file) { failed.push(urls[i]); return }
    const ext = EXT_BY_TYPE[file.blob.type] ?? file.name.split('.').pop() ?? 'bin'
    zip.file(`${String(i + 1).padStart(2, '0')}_${base}.${ext}`, file.blob)
    if (file.blob.type.startsWith('image/')) images.push(file.blob)
  })

  if (images.length > 1) {
    const pdf = await PDFDocument.create()
    for (const blob of images) {
      try {
        const img = await toPdfImage(pdf, blob)
        pdf.addPage([img.width, img.height]).drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
      } catch (error) {
        console.error('Skipping image in PDF:', error)
      }
    }
    if (pdf.getPageCount() > 0) zip.file(`${base}.pdf`, await pdf.save())
  }

  if (Object.keys(zip.files).length === 0) return failed

  const content = await zip.generateAsync({ type: 'blob' })
  const href = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = href
  a.download = `${base}_media.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
  return failed
}
