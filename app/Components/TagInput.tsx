'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { normalizeTag, isDuplicateTag } from '../constants'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  maxTags?: number
  minTags?: number
  placeholder?: string
  disabeled?:boolean
}

export default function TagInput({
  value,
  onChange,
  suggestions,
  maxTags = 5,
  minTags = 2,
  disabeled=false,
  placeholder = 'Type a tag and press Enter',
}: Props) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions: match input (case-insensitive), exclude already-added
  const filteredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase()
    const alreadyAdded = new Set(value.map((t) => t.toLowerCase()))
    return suggestions
      .filter((s) => !alreadyAdded.has(s.toLowerCase()))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 10)  // cap at 10 visible suggestions
  }, [input, suggestions, value])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addTag = (raw: string) => {
    const normalized = raw
    if (!normalized) return
    if (value.length >= maxTags) return
    if (isDuplicateTag(normalized, value)) return
    onChange([...value, normalized])
    setInput('')
  }

  const removeTag = (idx: number) => {
    if(disabeled){
      return;

    }
    onChange(value.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      // Delete last chip on backspace in empty input
      removeTag(value.length - 1)
    }
  }

  const atMax = value.length >= maxTags

  return (
    <div ref={containerRef} className="relative">
      {/* Chip container */}
      <div className="w-full border border-gray-200 rounded-xl px-2 py-1.5 flex flex-wrap gap-1.5
        focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-transparent
        min-h-[42px]">

        {value.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200
              rounded-lg px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-blue-500 hover:text-blue-800 leading-none"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {!atMax && (
          <input disabled={disabeled}
            ref={inputRef}
            enterKeyHint="enter"
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[140px] outline-none text-sm py-1 bg-transparent"
          />
        )}
      </div>

      {/* Suggestion dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && !atMax && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
          rounded-xl shadow-lg z-10 max-h-56 overflow-y-auto">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { addTag(s); inputRef.current?.focus() }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-500">
          Use singular form (e.g., "Forest" not "Forests"). {value.length}/{maxTags} tags.
        </span>
        {value.length < minTags && (
          <span className="text-xs text-orange-500">
            Add at least {minTags} tag{minTags > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
