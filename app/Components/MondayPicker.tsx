'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isMonday, isSameDay, isSameMonth,
  isWithinInterval, parseISO, startOfMonth, startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  id?: string
  /** Selected Monday as yyyy-MM-dd */
  value: string
  onChange: (value: string) => void
}

const WEEK = { weekStartsOn: 1 as const }
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A newsletter dated Monday M covers the week before: M-7 (Mon) to M-1 (Sun).
export const coveredWeek = (monday: Date) => ({ from: addDays(monday, -7), to: addDays(monday, -1) })

// Date picker where only Mondays can be picked. The week an edition covers is
// highlighted for the selected Monday, and previewed for the one under the cursor.
export default function MondayPicker({ id, value, onChange }: Props) {
  const selected = useMemo(() => {
    const d = value ? parseISO(value) : null
    return d && !isNaN(d.getTime()) ? d : null
  }, [value])

  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
  const [hovered, setHovered] = useState<Date | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open && selected) setMonth(startOfMonth(selected)) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const days = useMemo(() => {
    const out: Date[] = []
    const last = endOfWeek(endOfMonth(month), WEEK)
    for (let d = startOfWeek(month, WEEK); d <= last; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const shown = hovered ?? selected
  const range = shown ? coveredWeek(shown) : null
  const selectedRange = selected ? coveredWeek(selected) : null
  const inRange = (d: Date, r: { from: Date; to: Date } | null) => !!r && isWithinInterval(d, { start: r.from, end: r.to })
  const today = new Date()

  return (
    <div ref={rootRef} className='relative w-full sm:w-72'>
      <button
        id={id}
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-haspopup='dialog'
        aria-expanded={open}
        className='w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300'
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? format(selected, 'EEE, dd MMM yyyy') : 'Pick a Monday'}
        </span>
        <CalendarDays className='w-4 h-4 text-gray-500' />
      </button>

      {open && (
        <div role='dialog' aria-label='Choose newsletter Monday' className='absolute z-30 mt-1 w-full sm:w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3'>
          <div className='flex items-center justify-between mb-2'>
            <button type='button' onClick={() => setMonth((m) => addMonths(m, -1))} className='p-1 rounded-md hover:bg-gray-100' aria-label='Previous month'>
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='text-sm font-semibold text-gray-800'>{format(month, 'MMMM yyyy')}</span>
            <button type='button' onClick={() => setMonth((m) => addMonths(m, 1))} className='p-1 rounded-md hover:bg-gray-100' aria-label='Next month'>
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>

          <div className='grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 mb-1'>
            {DAY_NAMES.map((d) => <span key={d} className={d === 'Mon' ? 'text-blue-600' : ''}>{d}</span>)}
          </div>

          <div className='grid grid-cols-7 gap-y-1' onMouseLeave={() => setHovered(null)}>
            {days.map((d) => {
              const monday = isMonday(d)
              const isSel = !!selected && isSameDay(d, selected)
              const covered = inRange(d, range)
              const preview = covered && !inRange(d, selectedRange)
              const outside = !isSameMonth(d, month)
              const dow = (d.getDay() + 6) % 7 // 0 = Monday

              const rangeClass = covered
                ? `${preview ? 'bg-blue-50' : 'bg-blue-100'} ${dow === 0 ? 'rounded-l-lg' : ''} ${dow === 6 ? 'rounded-r-lg' : ''}`
                : ''

              return (
                <div key={d.toISOString()} className={`flex justify-center ${rangeClass}`}>
                  {monday ? (
                    <button
                      type='button'
                      onClick={() => { onChange(format(d, 'yyyy-MM-dd')); setOpen(false) }}
                      onMouseEnter={() => setHovered(d)}
                      onFocus={() => setHovered(d)}
                      aria-pressed={isSel}
                      aria-label={`${format(d, 'EEEE dd MMMM yyyy')}, covers ${format(coveredWeek(d).from, 'dd MMM')} to ${format(coveredWeek(d).to, 'dd MMM')}`}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors
                        ${isSel ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-200'}
                        ${!isSel && isSameDay(d, today) ? 'ring-1 ring-blue-400' : ''}
                        ${outside && !isSel ? 'opacity-50' : ''}`}
                    >
                      {format(d, 'd')}
                    </button>
                  ) : (
                    <span
                      aria-disabled='true'
                      className={`w-8 h-8 flex items-center justify-center text-sm cursor-default
                        ${covered ? 'text-gray-700' : 'text-gray-300'}
                        ${outside ? 'opacity-50' : ''}
                        ${isSameDay(d, today) ? 'underline' : ''}`}
                    >
                      {format(d, 'd')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <p className='mt-3 pt-2 border-t border-gray-100 text-xs text-gray-600 min-h-[2rem]'>
            {range && shown ? (
              <>
                {hovered && !(selected && isSameDay(hovered, selected)) ? 'Would cover' : 'Covers'}{' '}
                <b>{format(range.from, 'EEE dd MMM')}</b> – <b>{format(range.to, 'EEE dd MMM yyyy')}</b>
              </>
            ) : (
              'Only Mondays can be picked. The edition covers the week before.'
            )}
          </p>
        </div>
      )}
    </div>
  )
}
