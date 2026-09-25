'use client'
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { X } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidEmail = (email: string) => EMAIL_RE.test(email)

// Typing or pasting any of these turns the text before it into a chip
const SEPARATORS = /[\s,;]+/

interface Props {
  value: string[]
  onChange: (emails: string[]) => void
  suggestions: string[]
  placeholder?: string
  maxResults?: number
  ariaLabel?: string
}

export default function EmailChipInput({
  value,
  onChange,
  suggestions,
  placeholder,
  maxResults = 8,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const navigated = useRef(false) // true once the user moves through suggestions with arrows
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const chosen = useMemo(() => new Set(value.map((e) => e.toLowerCase())), [value])
  const q = draft.trim().toLowerCase()

  const matches = useMemo(() => {
    const pool = suggestions.filter((e) => !chosen.has(e.toLowerCase()))
    if (!q) return pool.slice(0, maxResults)

    // Rank: starts-with, then a name/domain part starts-with, then contains
    const starts: string[] = []
    const partStarts: string[] = []
    const contains: string[] = []
    for (const email of pool) {
      const e = email.toLowerCase()
      if (e.startsWith(q)) starts.push(email)
      else if (e.split(/[@._-]/).some((p) => p.startsWith(q))) partStarts.push(email)
      else if (e.includes(q)) contains.push(email)
    }
    return [...starts, ...partStarts, ...contains].slice(0, maxResults)
  }, [q, suggestions, chosen, maxResults])

  const resetDraft = () => {
    setDraft('')
    setActive(0)
    navigated.current = false
  }

  const addEmails = (raw: string[]) => {
    const next = [...value]
    const seen = new Set(chosen)
    for (const r of raw) {
      const email = r.trim().replace(/^<|>$/g, '')
      if (!email || seen.has(email.toLowerCase())) continue
      seen.add(email.toLowerCase())
      next.push(email)
    }
    if (next.length !== value.length) onChange(next)
    resetDraft()
  }

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  // Enter / Tab: a fully typed address wins, unless the user picked a suggestion with the arrows
  const commit = () => {
    const typed = draft.trim()
    const showing = open && matches.length > 0
    if (showing && (navigated.current || !isValidEmail(typed))) {
      addEmails([matches[active]])
    } else if (typed) {
      addEmails([typed])
    }
  }

  const onInputChange = (text: string) => {
    // Handles separators from any keyboard, including mobile ones that don't fire keydown reliably
    const parts = text.split(SEPARATORS)
    if (parts.length > 1) {
      const rest = parts.pop() ?? ''
      addEmails(parts)
      setDraft(rest)
    } else {
      setDraft(text)
      setActive(0)
      navigated.current = false
    }
    setOpen(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) { setOpen(true); return }
        if (matches.length) {
          navigated.current = true
          setActive((i) => (i + 1) % matches.length)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (matches.length) {
          navigated.current = true
          setActive((i) => (i - 1 + matches.length) % matches.length)
        }
        break
      case 'Enter':
        e.preventDefault()
        commit()
        break
      case 'Tab':
        if (draft.trim()) { e.preventDefault(); commit() }
        break
      case 'Backspace':
        if (!draft && value.length) removeAt(value.length - 1)
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!SEPARATORS.test(text.trim())) return // single address: let it paste normally
    e.preventDefault()
    addEmails(`${draft} ${text}`.split(SEPARATORS))
  }

  const highlight = (email: string) => {
    const idx = q ? email.toLowerCase().indexOf(q) : -1
    if (idx === -1) return email
    return (
      <>
        {email.slice(0, idx)}
        <strong className="font-semibold text-gray-900">{email.slice(idx, idx + q.length)}</strong>
        {email.slice(idx + q.length)}
      </>
    )
  }

  const showList = open && matches.length > 0

  return (
    <div className="relative w-full min-w-0">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1 w-full min-h-[34px] max-h-28 overflow-y-auto
          rounded-md border border-amber-200 bg-white px-1.5 py-1 cursor-text
          focus-within:ring-2 focus-within:ring-amber-300"
      >
        {value.map((email, i) => {
          const ok = isValidEmail(email)
          return (
            <span
              key={email}
              title={ok ? email : `${email} is not a valid email address`}
              className={`inline-flex items-center gap-0.5 max-w-full rounded-full border pl-2 pr-0.5 py-0.5 text-xs
                ${ok
                  ? 'bg-amber-100 border-amber-200 text-gray-800'
                  : 'bg-red-50 border-red-300 text-red-700'
                }`}
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); removeAt(i) }}
                className="flex-shrink-0 rounded-full p-0.5 text-gray-500 hover:bg-black/10 hover:text-gray-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )
        })}

        <input
          ref={inputRef}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Don't lose a half-finished address when the user clicks elsewhere
            if (draft.trim()) addEmails([draft])
            setOpen(false)
          }}
          className="flex-1 min-w-[8rem] bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto
            bg-white border border-amber-200 rounded-md shadow-lg py-1"
        >
          {matches.map((email, i) => (
            <li
              key={email}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown + preventDefault keeps focus in the input so onBlur doesn't fire first
              onMouseDown={(e) => { e.preventDefault(); addEmails([email]) }}
              onMouseEnter={() => { setActive(i); navigated.current = true }}
              className={`px-2 py-1.5 text-sm cursor-pointer truncate
                ${i === active ? 'bg-amber-100 text-gray-900' : 'text-gray-600'}`}
            >
              {highlight(email)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}