'use client'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  /** Allow comma-separated list (autocomplete applies to the last entry) */
  multiple?: boolean
  maxResults?: number
  className?: string
}

const tokenize = (v: string) => v.split(',')

export default function EmailAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  multiple = true,
  maxResults = 8,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const tokens = tokenize(value)
  const current = (multiple ? tokens[tokens.length - 1] : value).trim().toLowerCase()

  const matches = useMemo(() => {
    // Skip emails already entered earlier in the same field
    const alreadyUsed = new Set(
      multiple ? tokens.slice(0, -1).map((t) => t.trim().toLowerCase()).filter(Boolean) : []
    )
    const pool = suggestions.filter((e) => !alreadyUsed.has(e.toLowerCase()))

    if (!current) return pool.slice(0, maxResults)

    // Rank: starts-with first, then name/domain part starts-with, then contains
    const starts: string[] = []
    const partStarts: string[] = []
    const contains: string[] = []
    for (const email of pool) {
      const e = email.toLowerCase()
      if (e === current) continue
      if (e.startsWith(current)) starts.push(email)
      else if (e.split(/[@._-]/).some((part) => part.startsWith(current))) partStarts.push(email)
      else if (e.includes(current)) contains.push(email)
    }
    return [...starts, ...partStarts, ...contains].slice(0, maxResults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, suggestions, multiple, maxResults])

  const select = (email: string) => {
    if (multiple) {
      const kept = tokens.slice(0, -1).map((t) => t.trim()).filter(Boolean)
      onChange([...kept, email].join(', ') + ', ')
    } else {
      onChange(email)
    }
    setOpen(false)
    setActive(0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || (e.key === 'Tab' && current)) {
      e.preventDefault()
      select(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Bold the typed portion inside the suggestion
  const highlight = (email: string) => {
    if (!current) return email
    const idx = email.toLowerCase().indexOf(current)
    if (idx === -1) return email
    return (
      <>
        {email.slice(0, idx)}
        <strong className="font-semibold text-gray-900">{email.slice(idx, idx + current.length)}</strong>
        {email.slice(idx + current.length)}
      </>
    )
  }

  const showList = open && matches.length > 0

  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        inputMode="email"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={className}
      />

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
              // mousedown + preventDefault keeps focus in the input (so onBlur doesn't close first)
              onMouseDown={(e) => {
                e.preventDefault()
                select(email)
              }}
              onMouseEnter={() => setActive(i)}
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