import React from 'react'

// Lightweight formatting for descriptions, stored as plain text:
//   **bold**   *italic*
// Kept deliberately small (no nesting) so the same rules are easy to mirror in
// other consumers such as the newsletter.

const TOKEN = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g

/** Renders formatted text as React nodes. Wrap in an element with `whitespace-pre-wrap` to keep line breaks. */
export function renderFormatted(text: string | undefined | null): React.ReactNode {
  if (!text) return null
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

/** Removes the formatting markers, e.g. for Excel exports or social media copy. */
export function stripFormatting(text: string | undefined | null): string {
  if (!text) return ''
  return text.replace(TOKEN, (m) => (m.startsWith('**') ? m.slice(2, -2) : m.slice(1, -1)))
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Converts formatted text to safe HTML (<strong>, <em>, <br>). */
export function formattedToHtml(text: string | undefined | null): string {
  if (!text) return ''
  return escapeHtml(text)
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}
