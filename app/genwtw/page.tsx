'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { addDays, endOfDay, format, parseISO, previousMonday, isMonday, startOfDay } from 'date-fns'
import Navbar from '../Components/Navbar';
import { UserMyAppContext } from '../Context/MyAppContext';
import { auth, listenToItems } from '../firebase/firebase';
import { categorylist, type itemprobes } from '../constants';
import { addedDate } from '../../lib/items';
import { renderFormatted } from '../../lib/richText';
import { convertDriveUrl } from '../../lib/driveUrl';
import Editform from '../Components/Editform';

type RunResult = { ok: boolean; status?: number; data?: unknown; error?: string }

// Order of sections in the newsletter. Categories not listed here follow, in
// the order of `categorylist`. Sections with no items are skipped.
const CATEGORY_ORDER = [
    'Authored Journal Articles',
    'Book chapters',
    'Authored Popular Article',
    'Report',
    'Featured Popular Article',
    'Announcement',
    'Awards and Recognitions',
    'Event',
    'Podcast',
]

// Only these sections show the publication (platform) and authors (mention).
const BYLINE_CATEGORIES = ['Authored Journal Articles', 'Featured Popular Article', 'Book chapters']

// Google Drive share links aren't image URLs; use Drive's thumbnail endpoint instead.
const imageSrc = (url?: string) => {
    if (!url?.startsWith('http')) return ''
    return /(^|\.)(drive|docs)\.google\.com$/.test(new URL(url).hostname) ? convertDriveUrl(url) : url
}

const categoryRank = (category: string) => {
    const i = CATEGORY_ORDER.indexOf(category)
    if (i !== -1) return i
    const j = categorylist.indexOf(category)
    return CATEGORY_ORDER.length + (j !== -1 ? j : categorylist.length)
}

// Newsletter palette (from the WTW email template)
const NL = {
    page: '#f6f6f6',
    accent: '#94311a',
    text: '#3b3f44',
    author: '#00933a',
    link: '#95c11f',
    divider: '#307bbf',
    border: '#e7e5e5',
}

// The newsletter is built on Monday for the previous Monday–Sunday.
const latestMonday = () => {
    const today = new Date()
    return format(isMonday(today) ? today : previousMonday(today), 'yyyy-MM-dd')
}

const Page = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const { user, isRegUser, role } = UserMyAppContext()
    const isAdmin = isRegUser && role === 'admin'

    const [date, setDate] = useState(latestMonday)
    const [force, setForce] = useState(false)
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<RunResult | null>(null)

    const [items, setItems] = useState<itemprobes[] | null>(null)
    useEffect(() => { listenToItems(setItems) }, [])

    const coverage = useMemo(() => {
        if (!date) return null
        const d = parseISO(date)
        if (isNaN(d.getTime())) return null
        return { from: addDays(d, -7), to: addDays(d, -1), monday: isMonday(d) }
    }, [date])

    // Items submitted in the covered week, grouped by category.
    const weekItems = useMemo(() => {
        if (!items || !coverage) return []
        const start = startOfDay(coverage.from).getTime()
        const end = endOfDay(coverage.to).getTime()
        return items
            .filter((item) => {
                const added = addedDate(item)?.getTime()
                return added !== undefined && added >= start && added <= end
            })
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    }, [items, coverage])

    // [category, items] in newsletter order; empty categories never appear.
    const groups = useMemo(() => {
        const map = new Map<string, itemprobes[]>()
        weekItems.forEach((item) => {
            const key = item.category || 'Uncategorised'
            map.set(key, [...(map.get(key) ?? []), item])
        })
        return Array.from(map.entries()).sort(([a], [b]) => categoryRank(a) - categoryRank(b))
    }, [weekItems])

    // Item open in the edit form
    const [editing, setEditing] = useState<itemprobes | null>(null)

    const genWtw = async () => {
        if (running || !date) return
        setRunning(true)
        setResult(null)
        try {
            const idToken = await auth.currentUser?.getIdToken()
            const res = await fetch('/api/genwtw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ date, force }),
            })
            const json = await res.json().catch(() => ({}))
            setResult(res.ok
                ? { ok: true, status: json.status, data: json.data }
                : { ok: false, status: json.status ?? res.status, data: json.data, error: json.error })
        } catch (error) {
            setResult({ ok: false, error: String(error) })
        } finally {
            setRunning(false)
        }
    }

    return (
        <main className='flex w-full h-dvh overflow-hidden bg-gray-50 '>
            <div className="hidden lg:block flex-shrink-0">
                <Navbar current_page="Generate WTW" />
            </div>

            {/* ── Mobile Nav Overlay ── */}
            {isMobileNavOpen && (
                <div className="fixed  inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
                        <Navbar current_page="Generate WTW" />
                    </div>
                </div>
            )}
            <div className='flex-1 min-w-0 h-full relative overflow-hidden flex'>
                <div className='flex-1 w-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 '>
                    <div className='flex items-center gap-2 '>
                        <button
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className='text-xl font-semibold text-gray-800'>Generate WTW Newsletter</h1>
                    </div>

                    {!user ? (
                        <p className='text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-4'>Please sign in to continue.</p>
                    ) : !isAdmin ? (
                        <p className='text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-4'>Only admins can generate the newsletter.</p>
                    ) : (
                        <div className='w-full w-full flex flex-col gap-4'>
                            <section className='bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4'>
                                <div className='flex flex-col gap-1.5'>
                                    <label htmlFor='wtw-date' className='text-sm font-medium text-gray-700'>Newsletter date</label>
                                    <input
                                        id='wtw-date'
                                        type='date'
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className='w-full sm:w-60 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
                                    />
                                    {coverage && (
                                        <p className='text-xs text-gray-500'>
                                            Covers submissions from <b>{format(coverage.from, 'EEE dd MMM')}</b> to <b>{format(coverage.to, 'EEE dd MMM yyyy')}</b>.
                                        </p>
                                    )}
                                    {coverage && !coverage.monday && (
                                        <p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1'>
                                            The newsletter is normally built on a Monday.
                                        </p>
                                    )}
                                </div>

                                <label className='flex items-start gap-2 text-sm text-gray-700 cursor-pointer'>
                                    <input
                                        type='checkbox'
                                        checked={force}
                                        onChange={(e) => setForce(e.target.checked)}
                                        className='mt-0.5 w-4 h-4 accent-blue-600'
                                    />
                                    <span>
                                        Force regenerate
                                        <span className='block text-xs text-gray-500'>Build it again even if this week’s newsletter was already generated.</span>
                                    </span>
                                </label>

                                <button
                                    type='button'
                                    onClick={genWtw}
                                    disabled={running || !date}
                                    className='w-full sm:w-auto self-start px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {running ? 'Generating…' : 'Generate newsletter'}
                                </button>
                            </section>

                            {result && (
                                <section className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-2 ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <h2 className={`text-sm font-semibold ${result.ok ? 'text-green-800' : 'text-red-700'}`}>
                                        {result.ok ? '✓ Newsletter generated' : '✕ Generation failed'}
                                        {result.status ? <span className='font-normal text-xs ml-2'>(HTTP {result.status})</span> : null}
                                    </h2>
                                    {result.error && <p className='text-sm text-red-700'>{result.error}</p>}
                                    {result.data !== undefined && (
                                        <pre className='text-xs bg-white/70 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-96'>
                                            {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                                        </pre>
                                    )}
                                </section>
                            )}

                            {/* Items going into this newsletter, styled like the WTW email */}
                            <section className='rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-6 flex flex-col gap-3' style={{ backgroundColor: NL.page }}>
                                <div className='flex flex-wrap items-baseline justify-between gap-2 max-w-[600px] w-full mx-auto'>
                                    <h2 className='text-base font-semibold text-gray-800'>Peview the Newsletter</h2>
                                    {coverage && (
                                        <span className='text-xs text-gray-500'>
                                            {weekItems.length} item{weekItems.length !== 1 ? 's' : ''} · added {format(coverage.from, 'dd MMM')} – {format(coverage.to, 'dd MMM')} · click an item to edit
                                        </span>
                                    )}
                                </div>

                                {items === null ? (
                                    <p className='text-sm text-gray-400 text-center py-6'>Loading items…</p>
                                ) : !coverage ? (
                                    <p className='text-sm text-gray-400 text-center py-6'>Pick a date to see the items.</p>
                                ) : weekItems.length === 0 ? (
                                    <p className='text-sm text-gray-400 text-center py-6'>No items were added in this week.</p>
                                ) : (
                                    <div className='w-full max-w-[600px] mx-auto bg-white' style={{ fontFamily: 'Verdana, Geneva, sans-serif', color: NL.text }}>
                                        {groups.map(([category, list]) => (
                                            <div key={category} className='px-3 sm:px-[15px] py-5'>
                                                <h3 className='px-[15px] text-white text-lg sm:text-[22px] leading-normal' style={{ backgroundColor: NL.accent }}>
                                                    {category}
                                                </h3>
                                                {/* Two items per row; a lone last item spans the row, like the email */}
                                                {chunkPairs(list).map((row, r) => (
                                                    <React.Fragment key={r}>
                                                        {r > 0 && <div className='mx-[15px] my-2.5' style={{ borderTop: `3px solid ${NL.divider}` }} />}
                                                        <div className={`grid grid-cols-1 ${row.length > 1 ? 'sm:grid-cols-2' : ''} gap-y-4 pt-5`}>
                                                            {row.map((item) => (
                                                                <NewsletterCard
                                                                    key={item.id}
                                                                    item={item}
                                                                    showByline={BYLINE_CATEGORIES.includes(category)}
                                                                    onOpen={() => setEditing(item)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                {/* Edit form for the clicked item; it closes itself after saving */}

                {/* {editing && (
                    <div className='fixed inset-0 flex items-center justify-center z-10'>
                        <div className=' w-full h-full z-50 flex justify-center items-center'>
                            <Editform
                                changeformvisibility={() => setEditing(null)}
                                selectedEntry={editing}
                                user={user?.displayName || 'user not found'}
                                userEmail={user?.email || ''}
                                items={items ?? []}
                            />
                        </div>

                    </div>

                )} */}

                {editing && (
    <div className='absolute inset-0 z-40 flex items-center justify-center p-4'>
        <div className='absolute inset-0 bg-black/40' onClick={() => setEditing(null)} />
        <div className='relative z-10 w-full max-h-full overflow-y-auto'>
            <Editform
                changeformvisibility={() => setEditing(null)}
                selectedEntry={editing}
                user={user?.displayName || 'user not found'}
                userEmail={user?.email || ''}
                items={items ?? []}
            />
        </div>
    </div>
)}


            </div>




        </main>
    )
}

const chunkPairs = <T,>(list: T[]): T[][] => {
    const rows: T[][] = []
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2))
    return rows
}

// One item as it appears in the newsletter. Clicking it opens the edit form;
// "Read More" opens the item's link instead.
function NewsletterCard({ item, showByline, onOpen }: { item: itemprobes; showByline: boolean; onOpen: () => void }) {
    const link = item.url?.startsWith('http') ? item.url : ''
    let image = ''
    try { image = imageSrc(item.img_url) } catch { /* malformed URL: no image */ }
    return (
        <div
            role='button'
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
            title='Click to edit'
            className='px-[15px] cursor-pointer rounded-md transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-0'
        >
            {image && (
                <div style={{ border: `1px solid ${NL.border}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image}
                        alt=''
                        loading='lazy'
                        referrerPolicy='no-referrer'
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                        className='block w-full h-auto'
                    />
                </div>
            )}
            <div className='pt-[5px] break-words'>
                <p className='text-base leading-[1.2] font-bold' style={{ color: NL.accent }}>{item.title}</p>
                {showByline && item.platform && (
                    <p className='text-base leading-[1.2] font-bold italic' style={{ color: NL.text }}>{item.platform}</p>
                )}
                {showByline && item.mention && (
                    <p className='pt-[5px] text-sm leading-normal italic' style={{ color: NL.author }}>{item.mention}</p>
                )}
                {item.description && (
                    <p className={`pt-[5px] text-sm leading-[1.2] whitespace-pre-wrap ${link ? 'line-clamp-4' : ''}`} style={{ color: NL.text }}>
                        {renderFormatted(item.description)}
                    </p>
                )}
                {link && (
                    <p className='pt-4 pb-[5px] text-sm leading-[1.2]'>
                        <a
                            href={link}
                            target='_blank'
                            rel='noreferrer'
                            onClick={(e) => e.stopPropagation()}
                            className='font-bold no-underline hover:underline'
                            style={{ color: NL.link }}
                        >
                            Read More
                        </a>
                    </p>
                )}
            </div>
        </div>
    )
}

export default Page
