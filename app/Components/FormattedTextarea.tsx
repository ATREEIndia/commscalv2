'use client'
import React, { useEffect, useRef, useState } from 'react'
import { formattedToHtml } from '../../lib/richText'

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

type Run = { text: string; bold: boolean; italic: boolean }

// Reads the editor's DOM back into the stored format (**bold**, *italic*, \n).
// Works on runs of text so whatever markup the browser produces (<b>, <strong>,
// <i>, <em>, styled spans, <div> lines) is normalised the same way.
function serialize(root: HTMLElement): string {
  const runs: Run[] = []
  const push = (text: string, bold: boolean, italic: boolean) => {
    const last = runs[runs.length - 1]
    if (last && last.bold === bold && last.italic === italic) last.text += text
    else runs.push({ text, bold, italic })
  }

  const walk = (node: Node, bold: boolean, italic: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      push((node.textContent ?? '').replace(/ /g, ' '), bold, italic)
      return
    }
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName
    if (tag === 'BR') { push('\n', bold, italic); return }

    let b = bold || tag === 'B' || tag === 'STRONG'
    let i = italic || tag === 'I' || tag === 'EM'
    const weight = node.style.fontWeight
    if (weight === 'bold' || Number(weight) >= 600) b = true
    if (weight === 'normal' || (Number(weight) > 0 && Number(weight) < 600)) b = false
    if (node.style.fontStyle === 'italic') i = true
    if (node.style.fontStyle === 'normal') i = false

    // Some browsers wrap new lines in <div>/<p>; treat each as a line.
    const isBlock = tag === 'DIV' || tag === 'P'
    if (isBlock && runs.length && !runs[runs.length - 1].text.endsWith('\n')) push('\n', bold, italic)
    node.childNodes.forEach((child) => walk(child, b, i))
  }
  root.childNodes.forEach((child) => walk(child, false, false))

  let out = runs
    .map(({ text, bold, italic }) => {
      if (!bold && !italic) return text
      // Bold + italic can't be stored together; bold wins.
      const marker = bold ? '**' : '*'
      // Markers can't span lines or hug spaces, so wrap each line's core only.
      return text
        .split('\n')
        .map((line) => {
          const core = line.trim()
          if (!core) return line
          const lead = line.slice(0, line.indexOf(core))
          const trail = line.slice(lead.length + core.length)
          return `${lead}${marker}${core}${marker}${trail}`
        })
        .join('\n')
    })
    .join('')

  // A trailing <br> is only there so the browser can show the last empty line.
  if (root.lastChild?.nodeName === 'BR') out = out.replace(/\n$/, '')
  return out
}

const toHtml = (value: string) => {
  const html = formattedToHtml(value)
  // Keep a trailing newline visible (see serialize).
  return value.endsWith('\n') ? html + '<br>' : html
}

// Rich text box: bold/italic show directly while typing (B / I buttons or
// Ctrl/Cmd+B, Ctrl/Cmd+I). The value it reads and writes is plain text with
// **bold** and *italic* markers — see lib/richText.
export default function FormattedTextarea({ value, onChange, disabled, className = '', placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValue = useRef<string | null>(null)
  const [active, setActive] = useState({ bold: false, italic: false })

  // Only rewrite the DOM when the value changes from outside (load, reset);
  // rewriting while typing would move the caret.
  useEffect(() => {
    const el = ref.current
    if (!el || value === lastValue.current) return
    el.innerHTML = toHtml(value)
    lastValue.current = value
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const next = serialize(el)
    lastValue.current = next
    if (next !== value) onChange(next)
  }

  const refreshActive = () => {
    if (!ref.current || !ref.current.contains(document.activeElement)) return
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    })
  }

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive)
    return () => document.removeEventListener('selectionchange', refreshActive)
  }, [])

  const format = (command: 'bold' | 'italic') => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(command)
    emit()
    refreshActive()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      // Plain line breaks instead of <div> blocks.
      e.preventDefault()
      document.execCommand('insertLineBreak')
      emit()
      return
    }
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 'b') { e.preventDefault(); format('bold') }
    if (key === 'i') { e.preventDefault(); format('italic') }
    if (key === 'u') e.preventDefault() // underline can't be stored
  }

  // Paste as plain text so formatting from Word/Docs doesn't come along.
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
    emit()
  }

  const buttonClass = (on: boolean) =>
    `w-8 h-7 rounded-md border text-sm text-gray-700 ${on ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`

  return (
    <div className='flex flex-col gap-1'>
      {!disabled && (
        <div className='flex items-center gap-1 px-1'>
          <button
            type='button'
            onMouseDown={(e) => e.preventDefault()} // keep the editor selection
            onClick={() => format('bold')}
            className={`${buttonClass(active.bold)} font-bold`}
            title='Bold (Ctrl+B)'
            aria-pressed={active.bold}
          >
            B
          </button>
          <button
            type='button'
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('italic')}
            className={`${buttonClass(active.italic)} italic font-serif`}
            title='Italic (Ctrl+I)'
            aria-pressed={active.italic}
          >
            I
          </button>
        </div>
      )}
      <div
        ref={ref}
        role='textbox'
        aria-multiline='true'
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={`min-h-[4.5rem] whitespace-pre-wrap break-words outline-none focus:ring-2 focus:ring-blue-200
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'} ${className}`}
      />
    </div>
  )
}
