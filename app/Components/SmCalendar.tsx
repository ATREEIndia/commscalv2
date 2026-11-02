'use client'
import { useState, useMemo, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import type { SMPost } from '../smcal/types'
import { convertDriveUrl } from '../../lib/driveUrl'
import { FaFilm } from 'react-icons/fa'
import dayjs from '../../lib/dayjs'
import { IST } from '../../lib/dayjs'
import { emailToColor, getInitial } from '../../lib/assignColor'
import type { EnvDay } from '../hooks/useEnvDays'
import EnvDayPopover from './EnvDayPopover'
import { useMediaType } from '../hooks/useMediaType'

// ── Status visual config ───────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { dot: 'bg-gray-400',    card: 'bg-gray-50    border-gray-200',   badge: 'bg-gray-100   text-gray-600   border-gray-200',   label: 'Draft'     },
  scheduled: { dot: 'bg-purple-500',  card: 'bg-purple-50  border-purple-200', badge: 'bg-purple-100 text-purple-700  border-purple-200', label: 'Scheduled' },
  approved:  { dot: 'bg-blue-500',    card: 'bg-blue-50    border-blue-200',   badge: 'bg-blue-100   text-blue-700   border-blue-200',   label: 'Approved'  },
  posted:    { dot: 'bg-green-500',   card: 'bg-green-50   border-green-200',  badge: 'bg-green-100  text-green-700  border-green-200',  label: 'Posted'    },
} as const

const DAY_HEADERS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_HEADERS_SHORT = ['M',   'T',   'W',   'T',   'F',   'S',   'S'  ]

interface Props {
  posts: SMPost[]
  envDays?: EnvDay[]
  onPostClick: (id: string) => void
  onCellClick: (dateStr: string) => void
  onNewPost?: () => void // left out: no "New Post" button (view-only)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISTDateStr(ts: Timestamp): string {
  return dayjs(ts.toDate()).tz(IST).format('YYYY-MM-DD')
}

function toCellDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayStr(): string {
  return toCellDateStr(new Date())
}

function monthDayKey(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}`
}

function fullDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function buildMonthGrid(refDate: Date): { date: Date; isCurrentMonth: boolean }[] {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const dow = firstDay.getDay()
  const paddingBefore = dow === 0 ? 6 : dow - 1
  const cells: { date: Date; isCurrentMonth: boolean }[] = []
  for (let i = paddingBefore; i > 0; i--)
    cells.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false })
  for (let d = 1; d <= lastDay.getDate(); d++)
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  let overflow = 1
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, overflow++), isCurrentMonth: false })
  return cells
}

function buildWeek(refDate: Date): Date[] {
  const d = new Date(refDate)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return day
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AssigneeBadge({ post }: { post: SMPost }) {
  const email = post.assignedTo || post.createdBy?.email || ''
  const name  = post.assignedToName || post.createdBy?.name || ''
  if (!email) return null

  return (
    <div
      title={name}
      className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full
        flex items-center justify-center text-[9px] font-bold text-white
        ring-2 ring-white flex-shrink-0"
      style={{ backgroundColor: emailToColor(email) }}
    >
      {getInitial(name)}
    </div>
  )
}

function MediaThumb({ url, className }: { url: string; className: string }) {
  const [errored, setErrored] = useState(false)
  const isVideo = useMediaType(url) === 'video'

  if (errored) {
    return (
      <div className={`${className} bg-gray-100 text-gray-300 flex items-center justify-center flex-shrink-0`}>
        <FaFilm size={12} />
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden flex-shrink-0`}>
      <img
        src={convertDriveUrl(url)}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-3.5 h-3.5 rounded-full bg-black/50 text-white
            flex items-center justify-center text-[7px] leading-none">▶</span>
        </span>
      )}
    </div>
  )
}

function PostCard({ post, onClick }: { post: SMPost; onClick: () => void }) {
  const cfg  = STATUS_CFG[post.status] ?? STATUS_CFG.draft
  const time = post.scheduledAt?.toDate
    ? dayjs(post.scheduledAt.toDate()).tz(IST).format('h:mm A')
    : ''
  const firstMedia = post.images?.[0] || null

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`relative cursor-pointer rounded-md px-1.5 py-1 border text-xs mb-0.5
        ${cfg.card} hover:brightness-95 transition-all`}
    >
      <AssigneeBadge post={post} />
      <div className="flex items-center gap-1.5">
        {firstMedia && <MediaThumb url={firstMedia} className="w-6 h-6 rounded" />}
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="font-medium text-gray-800 truncate leading-tight">{post.title}</p>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="text-[10px] text-gray-500 truncate">{time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EnvDayLabels({ envDays }: { envDays: EnvDay[] }) {
  const [popupDay, setPopupDay] = useState<EnvDay | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null)

  if (envDays.length === 0) return null

  return (
    <div className="mb-0.5">
      {envDays.map((d) => (
        <button
          key={d.id}
          onClick={(e) => { e.stopPropagation(); setPopupDay(d); setPopupAnchor(e.currentTarget) }}
          title={d.name}
          className="w-full flex items-center gap-1 text-[10px] text-green-700 truncate
            hover:text-green-900 hover:bg-green-50 rounded px-1"
        >
          <span>🌿</span>
          <span className="truncate">{d.name}</span>
        </button>
      ))}
      {popupDay && popupAnchor && (
        <EnvDayPopover
          day={popupDay}
          anchor={popupAnchor}
          onClose={() => { setPopupDay(null); setPopupAnchor(null) }}
        />
      )}
    </div>
  )
}

function CalendarCell({
  date, isCurrentMonth, posts, envDays, today, onPostClick, onCellClick,
}: {
  date: Date
  isCurrentMonth: boolean
  posts: SMPost[]
  envDays: EnvDay[]
  today: string
  onPostClick: (id: string) => void
  onCellClick: (dateStr: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const dateStr = toCellDateStr(date)
  const isToday = dateStr === today
  const visible = expanded ? posts : posts.slice(0, 3)
  const hidden  = posts.length - 3

  return (
    <div
      onClick={() => onCellClick(dateStr)}
      className={`min-h-[52px] sm:min-h-[100px] p-1 sm:p-1.5 border-b border-r
        border-gray-100 cursor-pointer group transition-colors
        ${isCurrentMonth ? 'bg-white hover:bg-gray-50/70' : 'bg-gray-50/40 hover:bg-gray-100/50'}`}
    >
      {/* Date number row */}
      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
        <span
          className={`text-[11px] sm:text-xs font-semibold w-5 h-5 sm:w-6 sm:h-6
            flex items-center justify-center rounded-full flex-shrink-0
            ${isToday
              ? 'bg-blue-600 text-white'
              : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
            }`}
        >
          {date.getDate()}
        </span>
        <span className="hidden sm:block opacity-0 group-hover:opacity-100
          text-[9px] text-blue-400 transition-opacity">
          + Add
        </span>
      </div>

      {/* Environmental day labels */}
      <EnvDayLabels envDays={envDays} />

      {/* Mobile: coloured status dots (hidden on sm+) */}
      {posts.length > 0 && (
        <div className="flex flex-wrap gap-0.5 sm:hidden">
          {posts.slice(0, 4).map((p) => (
            <span
              key={p.id}
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                ${STATUS_CFG[p.status]?.dot ?? 'bg-gray-400'}`}
            />
          ))}
          {posts.length > 4 && (
            <span className="text-[8px] text-gray-400 leading-none self-center">
              +{posts.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Desktop: full post cards (hidden on mobile) */}
      <div className="hidden sm:block">
        {visible.map((p) => (
          <PostCard key={p.id} post={p} onClick={() => onPostClick(p.id!)} />
        ))}
        {!expanded && hidden > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
            className="text-[10px] text-blue-500 hover:text-blue-700 w-full text-left px-1 py-0.5"
          >
            +{hidden} more
          </button>
        )}
        {expanded && hidden > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
            className="text-[10px] text-gray-400 hover:text-gray-600 w-full text-left px-1 py-0.5"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SmCalendar({ posts, envDays = [], onPostClick, onCellClick, onNewPost }: Props) {
  const [refDate, setRefDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const TODAY = todayStr()

  const postsByDate = useMemo(() => {
    const map: Record<string, SMPost[]> = {}
    posts.forEach((p) => {
      if (!p.scheduledAt?.toDate) return
      const d = toISTDateStr(p.scheduledAt)
      ;(map[d] = map[d] || []).push(p)
    })
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
    )
    return map
  }, [posts])

  const getPostsForDate = (dateStr: string) => postsByDate[dateStr] || []

  // Recurring days (no `year`) are keyed by month-day and match every year.
  // One-time days (`year` set) are keyed by full date and only match that year.
  const envDaysByKey = useMemo(() => {
    const monthDayMap: Record<string, EnvDay[]> = {}
    const fullDateMap: Record<string, EnvDay[]> = {}
    envDays.forEach((d) => {
      if (!d.month || !d.day) return
      if (d.year) {
        const key = `${d.year}-${d.month}-${d.day}`
        ;(fullDateMap[key] = fullDateMap[key] || []).push(d)
      } else {
        const key = `${d.month}-${d.day}`
        ;(monthDayMap[key] = monthDayMap[key] || []).push(d)
      }
    })
    return { monthDayMap, fullDateMap }
  }, [envDays])

  // DEBUG — temporary, remove once env-day highlighting is confirmed working end-to-end.
  useEffect(() => {
    console.log('🌿 envDays received:', envDays.length, envDays)
    console.log('🌿 envDaysByKey:', envDaysByKey)
  }, [envDays, envDaysByKey])

  const getEnvDaysForDate = (date: Date) => [
    ...(envDaysByKey.fullDateMap[fullDateKey(date)] || []),
    ...(envDaysByKey.monthDayMap[monthDayKey(date)] || []),
  ]

  const monthGrid = useMemo(() => buildMonthGrid(refDate), [refDate])
  const weekDays  = useMemo(() => buildWeek(refDate), [refDate])

  const navigate = (dir: -1 | 1) => {
    setRefDate((prev) => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setDate(d.getDate() + dir)
      return d
    })
  }

  const headerLabel = useMemo(() => {
    if (view === 'month') return dayjs(refDate).format('MMMM YYYY')
    if (view === 'week') {
      const s = weekDays[0]; const e = weekDays[6]
      return s.getMonth() === e.getMonth()
        ? dayjs(s).format('MMMM YYYY')
        : `${dayjs(s).format('MMM')} – ${dayjs(e).format('MMM YYYY')}`
    }
    return dayjs(refDate).format('dddd, DD MMM YYYY')
  }, [refDate, view, weekDays])

  // ── Shared day-header row ────────────────────────────────────────────────────
  const DayHeaderRow = () => (
    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      {DAY_HEADERS.map((d, i) => (
        <div
          key={d}
          className="text-center text-xs font-semibold text-gray-400
            py-1.5 sm:py-2 border-r border-gray-100 last:border-r-0"
        >
          <span className="hidden sm:inline">{d}</span>
          <span className="sm:hidden">{DAY_HEADERS_SHORT[i]}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border
      border-gray-200 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-y-2 px-3 sm:px-4
        py-2.5 sm:py-3 border-b border-gray-200 flex-shrink-0 flex-wrap">

        {/* Left: navigation + label */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-100
              flex items-center justify-center text-gray-600 text-lg font-light
              transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setRefDate(new Date())}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-gray-600
              border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-100
              flex items-center justify-center text-gray-600 text-lg font-light
              transition-colors"
          >
            ›
          </button>
          <h2 className="text-sm sm:text-base font-bold text-gray-800 ml-0.5 sm:ml-1
            select-none">
            {headerLabel}
          </h2>
        </div>

        {/* Right: view toggle + New Post */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 sm:px-3 py-1.5 font-medium transition-colors
                  ${view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {/* Abbreviated on mobile, full on sm+ */}
                <span className="sm:hidden">{v[0].toUpperCase()}</span>
                <span className="hidden sm:inline capitalize">{v}</span>
              </button>
            ))}
          </div>

          {/* New Post */}
          {onNewPost && <button
            onClick={onNewPost}
            className="flex items-center justify-center gap-1 px-2 sm:px-3
              py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">New Post</span>
          </button>}
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="flex-1 overflow-auto">

        {/* Month view */}
        {view === 'month' && (
          <>
            <DayHeaderRow />
            <div className="grid grid-cols-7">
              {monthGrid.map(({ date, isCurrentMonth }, i) => (
                <CalendarCell
                  key={i}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  posts={getPostsForDate(toCellDateStr(date))}
                  envDays={getEnvDaysForDate(date)}
                  today={TODAY}
                  onPostClick={onPostClick}
                  onCellClick={onCellClick}
                />
              ))}
            </div>
          </>
        )}

        {/* Week view */}
        {view === 'week' && (
          <>
            {/* Week-specific header: day name + date number */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              {weekDays.map((date, i) => {
                const dateStr = toCellDateStr(date)
                const isToday = dateStr === TODAY
                return (
                  <div
                    key={i}
                    className="text-center py-1.5 sm:py-2 border-r border-gray-100
                      last:border-r-0"
                  >
                    <p className="text-xs text-gray-400">
                      <span className="hidden sm:inline">{DAY_HEADERS[i]}</span>
                      <span className="sm:hidden">{DAY_HEADERS_SHORT[i]}</span>
                    </p>
                    <p
                      className={`text-xs sm:text-sm font-bold mx-auto
                        w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center
                        rounded-full mt-0.5
                        ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((date, i) => (
                <CalendarCell
                  key={i}
                  date={date}
                  isCurrentMonth
                  posts={getPostsForDate(toCellDateStr(date))}
                  envDays={getEnvDaysForDate(date)}
                  today={TODAY}
                  onPostClick={onPostClick}
                  onCellClick={onCellClick}
                />
              ))}
            </div>
          </>
        )}

        {/* Day view */}
        {view === 'day' && (
          <div className="p-3 sm:p-4">
            {getEnvDaysForDate(refDate).length > 0 && (
              <div className="mb-3 max-w-xs">
                <EnvDayLabels envDays={getEnvDaysForDate(refDate)} />
              </div>
            )}
            {(() => {
              const dayPosts = getPostsForDate(toCellDateStr(refDate))
              if (dayPosts.length === 0) {
                return (
                  <div
                    onClick={() => onCellClick(toCellDateStr(refDate))}
                    className="flex flex-col items-center justify-center py-16 sm:py-20
                      text-gray-400 cursor-pointer hover:text-gray-600 transition-colors
                      border-2 border-dashed border-gray-200 rounded-2xl"
                  >
                    <p className="text-4xl sm:text-5xl mb-3">📅</p>
                    <p className="text-sm text-center px-4">
                      No posts scheduled — tap to add one.
                    </p>
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {dayPosts.map((post) => {
                    const cfg  = STATUS_CFG[post.status] ?? STATUS_CFG.draft
                    const time = post.scheduledAt?.toDate
                      ? dayjs(post.scheduledAt.toDate()).tz(IST).format('h:mm A')
                      : ''
                    return (
                      <div
                        key={post.id}
                        onClick={() => onPostClick(post.id!)}
                        className={`relative cursor-pointer rounded-2xl p-3 sm:p-4 border
                          ${cfg.card} hover:brightness-95 transition-all`}
                      >
                        <AssigneeBadge post={post} />
                        <div className="flex items-start gap-3 sm:gap-4">
                          {post.images?.[0] && (
                            <MediaThumb url={post.images[0]} className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full border
                                  font-medium ${cfg.badge}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500">{time}</span>
                            </div>
                            <h3 className="font-semibold text-sm sm:text-base text-gray-800">
                              {post.title}
                            </h3>
                            {post.bodyCopy && (
                              <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                                {post.bodyCopy}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
