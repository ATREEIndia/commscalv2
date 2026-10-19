'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ref, update } from 'firebase/database'
import { addDays, endOfDay, format, parseISO, previousMonday, isMonday, startOfDay } from 'date-fns'
import Navbar from '../Components/Navbar';
import { UserMyAppContext } from '../Context/MyAppContext';
import { auth, db, listenToItems } from '../firebase/firebase';
import { categorylist, type itemprobes } from '../constants';
import { addedDate } from '../../lib/items';
import { renderFormatted } from '../../lib/richText';
import { convertDriveUrl } from '../../lib/driveUrl';
import Editform from '../Components/Editform';
import { WTW_AUDIENCES, type WtwAudience } from '../../lib/wtwAudiences';
import {  addWeeks, nextMonday as getNextMonday } from 'date-fns'

type RunResult = { ok: boolean; audience: WtwAudience; status?: number; data?: unknown; error?: string }

// Colours get stronger as the audience gets wider.
const AUDIENCE_STYLE: Record<WtwAudience, { selected: string; button: string }> = {
    test: { selected: 'bg-blue-50 border-blue-500 text-blue-800', button: 'bg-blue-600 hover:bg-blue-700' },
    internal: { selected: 'bg-amber-50 border-amber-500 text-amber-900', button: 'bg-amber-600 hover:bg-amber-700' },
    global: { selected: 'bg-red-50 border-red-600 text-red-800', button: 'bg-red-600 hover:bg-red-700' },
}

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
const BYLINE_CATEGORIES = ['Authored Journal Articles','Authored Popular Article', 'Featured Popular Article', 'Book chapters']

// Google Drive share links aren't image URLs; use Drive's thumbnail endpoint instead.
const imageSrc = (url?: string) => {
    if (!url?.startsWith('http')) return ''
    return /(^|\.)(drive|docs)\.google\.com$/.test(new URL(url).hostname) ? convertDriveUrl(url) : url
}

// Gap between auto-assigned weights, so an item can be slotted between two by hand.
const WEIGHT_STEP = 10

// Within a section: higher wtwWeight first; unweighted items after, by date.
const byWeight = (a: itemprobes, b: itemprobes) => {
    const wa = typeof a.wtwWeight === 'number' ? a.wtwWeight : -Infinity
    const wb = typeof b.wtwWeight === 'number' ? b.wtwWeight : -Infinity
    return wb - wa || (a.date || '').localeCompare(b.date || '')
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
// const nextMonday = () => {
//     const today = new Date()

//     return format(
//         isMonday(today) ? addWeeks(today, 1) : getNextMonday(today),
//         'yyyy-MM-dd'
//     )
// }
const nextMonday = () => {
    const today = new Date()

    return format(
        isMonday(today) ? today : getNextMonday(today),
        'yyyy-MM-dd'
    )
}

const Page = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const { user, isRegUser, role } = UserMyAppContext()
    const isAdmin = isRegUser 

    const [date, setDate] = useState(nextMonday)
    const [force, setForce] = useState(false)
    const [running, setRunning] = useState<WtwAudience | null>(null)
    const [audience, setAudience] = useState<WtwAudience>('test')
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
    // Within a category: higher wtwWeight first, then items without a weight by date.
    const groups = useMemo(() => {
        const map = new Map<string, itemprobes[]>()
        weekItems.forEach((item) => {
            const key = item.category || 'Uncategorised'
            map.set(key, [...(map.get(key) ?? []), item])
        })
        return Array.from(map.entries())
            .map(([category, list]) => [category, [...list].sort(byWeight)] as [string, itemprobes[]])
            .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
    }, [weekItems])

    // When the preview is built, give every item without a weight one that keeps
    // the current order (below the weighted items of its section). Admins only.
    const assigning = useRef(new Set<string>())
    useEffect(() => {
        if (!isAdmin) return
        const updates: Record<string, number> = {}
        groups.forEach(([, list]) => {
            const weights = list.map((i) => i.wtwWeight).filter((w): w is number => typeof w === 'number')
            let next = (weights.length ? Math.min(...weights) : (list.length + 1) * WEIGHT_STEP) - WEIGHT_STEP
            list.forEach((item) => {
                if (typeof item.wtwWeight === 'number' || !item.id || assigning.current.has(item.id)) return
                updates[`items/${item.id}/wtwWeight`] = next
                assigning.current.add(item.id)
                next -= WEIGHT_STEP
            })
        })
        if (Object.keys(updates).length) {
            update(ref(db), updates).catch((error) => {
                console.error('Assigning weights failed:', error)
                Object.keys(updates).forEach((path) => assigning.current.delete(path.split('/')[1]))
            })
        }
    }, [groups, isAdmin])

    // Saves a new order for a section as evenly spaced weights (top = highest).
    const saveOrder = async (ordered: itemprobes[]) => {
        const updates: Record<string, number> = {}
        ordered.forEach((item, i) => {
            const weight = (ordered.length - i) * WEIGHT_STEP
            if (item.id && item.wtwWeight !== weight) updates[`items/${item.id}/wtwWeight`] = weight
        })
        if (!Object.keys(updates).length) return
        try {
            await update(ref(db), updates)
        } catch (error) {
            console.error('Saving order failed:', error)
            alert('Could not save the new order. Please try again.')
        }
    }

    const moveItem = (list: itemprobes[], index: number, delta: -1 | 1) => {
        const target = index + delta
        if (target < 0 || target >= list.length) return
        const ordered = [...list]
        ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
        saveOrder(ordered)
    }

    const setWeight = async (item: itemprobes, weight: number) => {
        if (!item.id || !Number.isFinite(weight) || weight === item.wtwWeight) return
        try {
            await update(ref(db, `items/${item.id}`), { wtwWeight: weight })
        } catch (error) {
            console.error('Saving weight failed:', error)
            alert('Could not save the weight. Please try again.')
        }
    }

    // Item open in the edit form
    const [editing, setEditing] = useState<itemprobes | null>(null)

    // Real sends (mode "send") go through a confirmation dialog first.
    const [confirming, setConfirming] = useState<WtwAudience | null>(null)
    const [confirmText, setConfirmText] = useState('')

    const requestRun = (audience: WtwAudience) => {
        if (running || !date) return
        if (WTW_AUDIENCES[audience].mode === 'send') {
            setConfirmText('')
            setConfirming(audience)
        } else {
            runWtw(audience)
        }
    }

    const runWtw = async (audience: WtwAudience) => {
        if (running || !date) return
        const isSend = WTW_AUDIENCES[audience].mode === 'send'
        setConfirming(null)
        setRunning(audience)
        setResult(null)
        try {
            const idToken = await auth.currentUser?.getIdToken()
            const res = await fetch('/api/genwtw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ date, audience, force, ...(isSend ? { confirmSend: true } : {}) }),
            })
            const json = await res.json().catch(() => ({}))
            setResult(res.ok
                ? { ok: true, audience, status: json.status, data: json.data }
                : { ok: false, audience, status: json.status ?? res.status, data: json.data, error: json.error })
        } catch (error) {
            setResult({ ok: false, audience, error: String(error) })
        } finally {
            setRunning(null)
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

                                <div className='flex flex-col gap-2'>
                                    <span id='wtw-send-to' className='text-sm font-medium text-gray-700'>Send to</span>
                                    <div role='radiogroup' aria-labelledby='wtw-send-to' className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                        {(Object.keys(WTW_AUDIENCES) as WtwAudience[]).map((key) => {
                                            const a = WTW_AUDIENCES[key]
                                            const selected = audience === key
                                            return (
                                                <button
                                                    key={key}
                                                    type='button'
                                                    role='radio'
                                                    aria-checked={selected}
                                                    onClick={() => setAudience(key)}
                                                    disabled={!!running}
                                                    className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                                        ${selected ? AUDIENCE_STYLE[key].selected : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-current' : 'border-gray-300'}`}>
                                                        {selected && <span className='w-2 h-2 rounded-full bg-current' />}
                                                    </span>
                                                    <span className='flex flex-col gap-0.5 min-w-0'>
                                                        <span className='text-sm font-semibold'>{a.label}</span>
                                                        <span className='text-[11px] opacity-80'>{a.description} · list {a.listIds.join(', ')}</span>
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className='text-xs text-gray-500'>Send a test first and check it before sending internally or globally. Internal and global sends ask for confirmation.</p>
                                </div>

                                <button
                                    type='button'
                                    onClick={() => requestRun(audience)}
                                    disabled={!!running || !date}
                                    className={`w-full sm:w-auto self-start px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${AUDIENCE_STYLE[audience].button}`}
                                >
                                    {running ? 'Sending…' : `Send now · ${WTW_AUDIENCES[audience].label.replace(/^Send /, '')}`}
                                </button>
                            </section>

                            {result && (
                                <section className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-2 ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <h2 className={`text-sm font-semibold ${result.ok ? 'text-green-800' : 'text-red-700'}`}>
                                        {result.ok ? `✓ ${WTW_AUDIENCES[result.audience].label} done` : `✕ ${WTW_AUDIENCES[result.audience].label} failed`}
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
                                                            {row.map((item, c) => (
                                                                <NewsletterCard
                                                                    key={item.id}
                                                                    item={item}
                                                                    showByline={BYLINE_CATEGORIES.includes(category)}
                                                                    onOpen={() => setEditing(item)}
                                                                    order={{
                                                                        isFirst: r * 2 + c === 0,
                                                                        isLast: r * 2 + c === list.length - 1,
                                                                        onUp: () => moveItem(list, r * 2 + c, -1),
                                                                        onDown: () => moveItem(list, r * 2 + c, 1),
                                                                        onWeight: (w) => setWeight(item, w),
                                                                    }}
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

                {/* Confirmation before a real send */}
                {confirming && (
                    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
                        <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 flex flex-col gap-4'>
                            <h2 className='text-lg font-bold text-gray-800'>{WTW_AUDIENCES[confirming].label}?</h2>
                            <div className='text-sm text-gray-600 flex flex-col gap-1'>
                                <p>This sends the newsletter to <b>{WTW_AUDIENCES[confirming].description.toLowerCase()}</b> (list {WTW_AUDIENCES[confirming].listIds.join(', ')}).</p>
                                <p>Newsletter date: <b>{date}</b>{coverage && <> · {weekItems.length} item{weekItems.length !== 1 ? 's' : ''}</>}{force && <> · <b>force regenerate</b></>}</p>
                                <p className='text-red-700'>Once sent, it can’t be undone.</p>
                            </div>
                            {confirming === 'global' && (
                                <label className='flex flex-col gap-1 text-sm text-gray-700'>
                                    Type <b>SEND</b> to confirm
                                    <input
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        autoFocus
                                        className='border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300'
                                    />
                                </label>
                            )}
                            <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2'>
                                <button
                                    type='button'
                                    onClick={() => setConfirming(null)}
                                    className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    onClick={() => runWtw(confirming)}
                                    disabled={confirming === 'global' && confirmText.trim().toUpperCase() !== 'SEND'}
                                    className='px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    Yes, send now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
type OrderControls = {
    isFirst: boolean
    isLast: boolean
    onUp: () => void
    onDown: () => void
    onWeight: (weight: number) => void
}

// Move up/down and the weight itself. Clicks here don't open the edit form.
function OrderBar({ weight, order }: { weight?: number; order: OrderControls }) {
    const [draft, setDraft] = useState(weight?.toString() ?? '')
    useEffect(() => { setDraft(weight?.toString() ?? '') }, [weight])

    const commit = () => {
        const value = Number(draft)
        if (draft.trim() === '' || !Number.isFinite(value)) setDraft(weight?.toString() ?? '')
        else order.onWeight(value)
    }
    const stop = (e: React.SyntheticEvent) => e.stopPropagation()
    const arrow = 'w-7 h-7 rounded-md border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed'

    return (
        <div className='flex items-center justify-end gap-1 mb-1.5 font-sans' onClick={stop} onKeyDown={stop}>
            <button type='button' className={arrow} onClick={order.onUp} disabled={order.isFirst} title='Move up' aria-label='Move up'>▲</button>
            <button type='button' className={arrow} onClick={order.onDown} disabled={order.isLast} title='Move down' aria-label='Move down'>▼</button>
            <label className='flex items-center gap-1 text-[11px] text-gray-500 ml-1'>
                Weight
                <input
                    type='number'
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    className='w-14 h-7 border border-gray-200 rounded-md px-1.5 text-xs text-gray-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-300'
                    title='Higher weight comes first in this section'
                />
            </label>
        </div>
    )
}

function NewsletterCard({ item, showByline, onOpen, order }: { item: itemprobes; showByline: boolean; onOpen: () => void; order: OrderControls }) {
    const link = item.url?.startsWith('http') ? item.url : ''
    let image = ''
    try { image = imageSrc(item.img_url) } catch { /* malformed URL: no image */ }
    return (
        <div
            role='button'
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }}
            title='Click to edit'
            className='px-[15px] cursor-pointer rounded-md transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-0'
        >
            <OrderBar weight={item.wtwWeight} order={order} />
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
