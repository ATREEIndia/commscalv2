// 'use client'
// import React, { useEffect, useMemo, useState } from 'react'
// import Navbar from '../Components/Navbar'

// import { itemprobes } from '../constants'
// import { listenToItems } from '../firebase/firebase'
// import { categorylist } from '../constants'
// import { format } from 'date-fns'
// import { UserMyAppContext } from '../Context/MyAppContext'
// import * as XLSX from 'xlsx'

// const PAGE_SIZE = 10

// const Page = () => {
//     const { user } = UserMyAppContext()

//     // ------------------- data -------------------
//     const [entries, setEntries] = useState<itemprobes[]>([])

//     useEffect(() => {
//         listenToItems(setEntries)
//     }, [])

//     // ------------------- filters -------------------
//     // Dropdown 1: All / My entries (created by logged-in user)
//     const [entryScope, setEntryScope] = useState<'All' | 'My entries'>('All')

//     // Dropdown 2: category
//     const [categoryFilter, setCategoryFilter] = useState<string>('All')

//     // Author keyword chips
//     const [authorInput, setAuthorInput] = useState<string>('')
//     const [authorKeywords, setAuthorKeywords] = useState<string[]>([])

//     const addAuthorKeyword = () => {
//         const trimmed = authorInput.trim()
//         if (!trimmed) return
//         if (authorKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
//             setAuthorInput('')
//             return
//         }
//         setAuthorKeywords(prev => [...prev, trimmed])
//         setAuthorInput('')
//     }

//     const removeAuthorKeyword = (keyword: string) => {
//         setAuthorKeywords(prev => prev.filter(k => k !== keyword))
//     }

//     const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter' || e.key === ',') {
//             e.preventDefault()
//             addAuthorKeyword()
//         } else if (e.key === 'Backspace' && authorInput === '' && authorKeywords.length > 0) {
//             // quick remove of the last chip on backspace when input is empty
//             setAuthorKeywords(prev => prev.slice(0, -1))
//         }
//     }

//     // ------------------- pagination -------------------
//     const [currentPage, setCurrentPage] = useState(1)

//     // reset to page 1 whenever a filter changes
//     useEffect(() => {
//         setCurrentPage(1)
//     }, [entryScope, categoryFilter, authorKeywords])

//     // ------------------- filtering logic -------------------
//     const filteredEntries = useMemo(() => {
//         return entries.filter((entry) => {
//             // scope filter: created by current user
//             if (entryScope === 'My entries') {
//                 if (!user?.email || entry.addedBy !== user.email) {
//                     return false
//                 }
//             }

//             // category filter
//             if (categoryFilter !== 'All' && entry.category !== categoryFilter) {
//                 return false
//             }

//             // author keyword filter (matches against the "mention" field)
//             if (authorKeywords.length > 0) {
//                 const mentionText = (entry.mention || '').toLowerCase()
//                 const matchesAny = authorKeywords.some(keyword =>
//                     mentionText.includes(keyword.toLowerCase())
//                 )
//                 if (!matchesAny) return false
//             }

//             return true
//         })
//     }, [entries, entryScope, categoryFilter, authorKeywords, user])

//     const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))

//     const paginatedEntries = useMemo(() => {
//         const start = (currentPage - 1) * PAGE_SIZE
//         return filteredEntries.slice(start, start + PAGE_SIZE)
//     }, [filteredEntries, currentPage])

//     const goToPage = (page: number) => {
//         if (page < 1 || page > totalPages) return
//         setCurrentPage(page)
//     }

//     // ------------------- excel export -------------------
//     const downloadExcel = () => {
//         const rows = filteredEntries.map((entry) => ({
//             Date: entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '',
//             Title: entry.title || '',
//             description: entry.description || '',
//             mentions: entry.mention || '',
//             Url: entry.url || '',
//         }))

//         const worksheet = XLSX.utils.json_to_sheet(rows, {
//             header: ['Date', 'Title', 'description', 'mentions', 'Url'],
//         })

//         // reasonable column widths
//         worksheet['!cols'] = [
//             { wch: 12 }, // Date
//             { wch: 35 }, // Title
//             { wch: 50 }, // description
//             { wch: 30 }, // mentions
//             { wch: 40 }, // Url
//         ]

//         const workbook = XLSX.utils.book_new()
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'MyData')

//         const filename = `MyData_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
//         XLSX.writeFile(workbook, filename)
//     }

//     return (
//         <main className='flex w-full min-h-screen bg-gray-50'>
//             <Navbar current_page="MyData" />

//             <div className='flex-1 p-4 sm:p-6 flex flex-col gap-4'>
//                 <h1 className='text-xl font-semibold text-gray-800'>My Data</h1>

//                 {/* ------------------- filter bar ------------------- */}
//                 <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100'>

//                     {/* Dropdown 1: All / My entries */}
//                     <select
//                         className='border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
//                         value={entryScope}
//                         onChange={(e) => setEntryScope(e.target.value as 'All' | 'My entries')}
//                     >
//                         <option value="All">All</option>
//                         <option value="My entries">My entries</option>
//                     </select>

//                     {/* Dropdown 2: category */}
//                     <select
//                         className='border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
//                         value={categoryFilter}
//                         onChange={(e) => setCategoryFilter(e.target.value)}
//                     >
//                         <option value="All">All Categories</option>
//                         {categorylist.map((cat) => (
//                             <option key={cat} value={cat}>{cat}</option>
//                         ))}
//                     </select>

//                     {/* Author keyword input */}
//                     <div className='flex-1 min-w-[220px]'>
//                         <div className='flex flex-wrap items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-300'>
//                             {authorKeywords.map((keyword) => (
//                                 <span
//                                     key={keyword}
//                                     className='flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full'
//                                 >
//                                     {keyword}
//                                     <button
//                                         type="button"
//                                         onClick={() => removeAuthorKeyword(keyword)}
//                                         className='text-blue-500 hover:text-blue-800 font-bold leading-none'
//                                         aria-label={`Remove ${keyword}`}
//                                     >
//                                         ×
//                                     </button>
//                                 </span>
//                             ))}
//                             <input
//                                 type="text"
//                                 value={authorInput}
//                                 onChange={(e) => setAuthorInput(e.target.value)}
//                                 onKeyDown={handleAuthorKeyDown}
//                                 onBlur={addAuthorKeyword}
//                                 placeholder={authorKeywords.length === 0 ? "Type an author name and press Enter..." : "Add another..."}
//                                 className='flex-1 min-w-[140px] text-sm outline-none py-1'
//                             />
//                         </div>
//                     </div>

//                     {/* Excel download */}
//                     <button
//                         type="button"
//                         onClick={downloadExcel}
//                         disabled={filteredEntries.length === 0}
//                         className='flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'
//                     >
//                         ⬇ Download Excel
//                     </button>
//                 </div>

//                 {/* ------------------- results count ------------------- */}
//                 <p className='text-xs text-gray-500'>
//                     Showing {paginatedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
//                     {' '}-{' '}
//                     {Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length} entries
//                 </p>

//                 {/* ------------------- table ------------------- */}
//                 <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto'>
//                     <table className='w-full text-sm'>
//                         <thead>
//                             <tr className='border-b border-gray-100 bg-gray-50 text-left text-gray-600'>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Date</th>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Category</th>
//                                 <th className='px-4 py-3 font-semibold'>Title</th>
//                                 <th className='px-4 py-3 font-semibold'>Description</th>
//                                 <th className='px-4 py-3 font-semibold'>Mention</th>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Url</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {paginatedEntries.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={6} className='px-4 py-8 text-center text-gray-400'>
//                                         No entries match the selected filters.
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 paginatedEntries.map((entry, index) => (
//                                     <tr
//                                         key={entry.id ?? index}
//                                         className={`border-b border-gray-50 ${index % 2 > 0 ? 'bg-gray-50/60' : 'bg-white'}`}
//                                     >
//                                         <td className='px-4 py-3 whitespace-nowrap align-top'>
//                                             {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : ''}
//                                         </td>
//                                         <td className='px-4 py-3 align-top whitespace-nowrap'>{entry.category}</td>
//                                         <td className='px-4 py-3 align-top max-w-[260px]'>{entry.title}</td>
//                                         <td className='px-4 py-3 align-top max-w-[320px] text-gray-600'>
//                                             {entry.description}
//                                         </td>
//                                         <td className='px-4 py-3 align-top max-w-[220px]'>{entry.mention}</td>
//                                         <td className='px-4 py-3 align-top max-w-[220px] truncate'>
//                                             {entry.url ? (
//                                                 <a
//                                                     href={entry.url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className='text-blue-600 hover:underline'
//                                                 >
//                                                     {entry.url}
//                                                 </a>
//                                             ) : null}
//                                         </td>
//                                     </tr>
//                                 ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* ------------------- pagination controls ------------------- */}
//                 {totalPages > 1 && (
//                     <div className='flex items-center justify-center gap-2 pb-4'>
//                         <button
//                             type="button"
//                             onClick={() => goToPage(currentPage - 1)}
//                             disabled={currentPage === 1}
//                             className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
//                         >
//                             Prev
//                         </button>

//                         <span className='text-sm text-gray-600 px-2'>
//                             Page {currentPage} of {totalPages}
//                         </span>

//                         <button
//                             type="button"
//                             onClick={() => goToPage(currentPage + 1)}
//                             disabled={currentPage === totalPages}
//                             className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
//                         >
//                             Next
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </main>
//     )
// }

// export default Page









// 'use client'
// import React, { useEffect, useMemo, useState } from 'react'
// import Navbar from '../Components/Navbar'

// import { itemprobes } from '../constants'
// import { listenToItems } from '../firebase/firebase'
// import { categorylist, mentionlist } from '../constants'
// import { format } from 'date-fns'
// import { UserMyAppContext } from '../Context/MyAppContext'
// import * as XLSX from 'xlsx'

// const PAGE_SIZE = 5

// const Page = () => {
//     const { user } = UserMyAppContext()

//     // ------------------- data -------------------
//     const [entries, setEntries] = useState<itemprobes[]>([])

//     useEffect(() => {
//         listenToItems(setEntries)
//     }, [])

//     // ------------------- filters -------------------
//     // Dropdown 1: All / My entries (created by logged-in user)
//     const [entryScope, setEntryScope] = useState<'All' | 'My entries'>('All')

//     // Dropdown 2: category
//     const [categoryFilter, setCategoryFilter] = useState<string>('All')

//     // Author keyword chips
//     const [authorInput, setAuthorInput] = useState<string>('')
//     const [authorKeywords, setAuthorKeywords] = useState<string[]>([])
//     const [showSuggestions, setShowSuggestions] = useState(false)
//     const [highlightedIndex, setHighlightedIndex] = useState(0)

//     // autosuggest source: named authors from mentionlist, filtered by what's typed
//     // and excluding names already added as chips
//     const authorSuggestions = useMemo(() => {
//         const typed = authorInput.trim().toLowerCase()
//         if (!typed) return []
//         return mentionlist
//             .filter((name) =>
//                 name.toLowerCase().includes(typed) &&
//                 !authorKeywords.some(k => k.toLowerCase() === name.toLowerCase())
//             )
//             .slice(0, 8)
//     }, [authorInput, authorKeywords])

//     const addAuthorKeyword = (value?: string) => {
//         const trimmed = (value ?? authorInput).trim()
//         if (!trimmed) return
//         if (authorKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
//             setAuthorInput('')
//             setShowSuggestions(false)
//             return
//         }
//         setAuthorKeywords(prev => [...prev, trimmed])
//         setAuthorInput('')
//         setShowSuggestions(false)
//         setHighlightedIndex(0)
//     }

//     const removeAuthorKeyword = (keyword: string) => {
//         setAuthorKeywords(prev => prev.filter(k => k !== keyword))
//     }

//     const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (showSuggestions && authorSuggestions.length > 0) {
//             if (e.key === 'ArrowDown') {
//                 e.preventDefault()
//                 setHighlightedIndex(prev => (prev + 1) % authorSuggestions.length)
//                 return
//             }
//             if (e.key === 'ArrowUp') {
//                 e.preventDefault()
//                 setHighlightedIndex(prev => (prev - 1 + authorSuggestions.length) % authorSuggestions.length)
//                 return
//             }
//             if (e.key === 'Enter') {
//                 e.preventDefault()
//                 addAuthorKeyword(authorSuggestions[highlightedIndex])
//                 return
//             }
//             if (e.key === 'Escape') {
//                 setShowSuggestions(false)
//                 return
//             }
//         }

//         if (e.key === 'Enter' || e.key === ',') {
//             e.preventDefault()
//             addAuthorKeyword()
//         } else if (e.key === 'Backspace' && authorInput === '' && authorKeywords.length > 0) {
//             // quick remove of the last chip on backspace when input is empty
//             setAuthorKeywords(prev => prev.slice(0, -1))
//         }
//     }

//     // ------------------- pagination -------------------
//     const [currentPage, setCurrentPage] = useState(1)

//     // reset to page 1 whenever a filter changes
//     useEffect(() => {
//         setCurrentPage(1)
//     }, [entryScope, categoryFilter, authorKeywords])

//     // ------------------- filtering logic -------------------
//     const filteredEntries = useMemo(() => {
//         return entries.filter((entry) => {
//             // scope filter: created by current user
//             if (entryScope === 'My entries') {
//                 if (!user?.email || entry.addedBy !== user.email) {
//                     return false
//                 }
//             }

//             // category filter
//             if (categoryFilter !== 'All' && entry.category !== categoryFilter) {
//                 return false
//             }

//             // author keyword filter (matches against the "mention" field)
//             if (authorKeywords.length > 0) {
//                 const mentionText = (entry.mention || '').toLowerCase()
//                 const matchesAny = authorKeywords.every(keyword =>
//                     mentionText.includes(keyword.toLowerCase())
//                 )
//                 if (!matchesAny) return false
//             }

//             return true
//         })
//     }, [entries, entryScope, categoryFilter, authorKeywords, user])

//     const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))

//     const paginatedEntries = useMemo(() => {
//         const start = (currentPage - 1) * PAGE_SIZE
//         return filteredEntries.slice(start, start + PAGE_SIZE)
//     }, [filteredEntries, currentPage])

//     const goToPage = (page: number) => {
//         if (page < 1 || page > totalPages) return
//         setCurrentPage(page)
//     }

//     // ------------------- excel export -------------------
//     const downloadExcel = () => {
//         const rows = filteredEntries.map((entry) => ({
//             Date: entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '',
//             Title: entry.title || '',
//             description: entry.description || '',
//             mentions: entry.mention || '',
//             Url: entry.url || '',
//         }))

//         const worksheet = XLSX.utils.json_to_sheet(rows, {
//             header: ['Date', 'Title', 'description', 'mentions', 'Url'],
//         })

//         // reasonable column widths
//         worksheet['!cols'] = [
//             { wch: 12 }, // Date
//             { wch: 35 }, // Title
//             { wch: 50 }, // description
//             { wch: 30 }, // mentions
//             { wch: 40 }, // Url
//         ]

//         const workbook = XLSX.utils.book_new()
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'MyData')

//         const filename = `MyData_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
//         XLSX.writeFile(workbook, filename)
//     }

//     return (
//         <main className='flex w-full max-h-screen bg-gray-50  overflow-y-scroll'>
//             <Navbar current_page="My Data" />

//             <div className='flex-1 p-4 sm:p-6 flex flex-col gap-4'>
//                 <h1 className='text-xl font-semibold text-gray-800'>My Data</h1>

//                 {/* ------------------- filter bar ------------------- */}
//                 <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100'>

//                     {/* Dropdown 1: All / My entries */}
//                     <select
//                         className='border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
//                         value={entryScope}
//                         onChange={(e) => setEntryScope(e.target.value as 'All' | 'My entries')}
//                     >
//                         <option value="All">All</option>
//                         <option value="My entries">My entries</option>
//                     </select>

//                     {/* Dropdown 2: category */}
//                     <select
//                         className='border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
//                         value={categoryFilter}
//                         onChange={(e) => setCategoryFilter(e.target.value)}
//                     >
//                         <option value="All">All Categories</option>
//                         {categorylist.map((cat) => (
//                             <option key={cat} value={cat}>{cat}</option>
//                         ))}
//                     </select>

//                     {/* Author keyword input with autosuggest */}
//                     <div className='flex-1 min-w-[220px] relative'>
//                         <div className='flex flex-wrap items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-300'>
//                             {authorKeywords.map((keyword) => (
//                                 <span
//                                     key={keyword}
//                                     className='flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full'
//                                 >
//                                     {keyword}
//                                     <button
//                                         type="button"
//                                         onClick={() => removeAuthorKeyword(keyword)}
//                                         className='text-blue-500 hover:text-blue-800 font-bold leading-none'
//                                         aria-label={`Remove ${keyword}`}
//                                     >
//                                         ×
//                                     </button>
//                                 </span>
//                             ))}
//                             <input
//                                 type="text"
//                                 value={authorInput}
//                                 onChange={(e) => {
//                                     setAuthorInput(e.target.value)
//                                     setShowSuggestions(true)
//                                     setHighlightedIndex(0)
//                                 }}
//                                 onKeyDown={handleAuthorKeyDown}
//                                 onFocus={() => setShowSuggestions(true)}
//                                 onBlur={() => {
//                                     // slight delay so a suggestion click registers before the list unmounts
//                                     setTimeout(() => setShowSuggestions(false), 120)
//                                 }}
//                                 placeholder={authorKeywords.length === 0 ? "Type an author name..." : "Add another..."}
//                                 className='flex-1 min-w-[140px] text-sm outline-none py-1'
//                             />
//                         </div>

//                         {/* suggestions dropdown */}
//                         {showSuggestions && authorSuggestions.length > 0 && (
//                             <ul className='absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg'>
//                                 {authorSuggestions.map((name, index) => (
//                                     <li key={name}>
//                                         <button
//                                             type="button"
//                                             onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't fire first
//                                             onClick={() => addAuthorKeyword(name)}
//                                             className={`w-full text-left px-3 py-2 text-sm ${index === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
//                                                 }`}
//                                         >
//                                             {name}
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </div>

//                     {/* Excel download */}
//                     <button
//                         type="button"
//                         onClick={downloadExcel}
//                         disabled={filteredEntries.length === 0}
//                         className='flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'
//                     >
//                         ⬇ Download
//                     </button>
//                 </div>

//                 {/* ------------------- results count ------------------- */}
//                 <p className='text-xs text-gray-500'>
//                     Showing {paginatedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
//                     {' '}-{' '}
//                     {Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length} entries
//                 </p>

//                 {/* ------------------- table ------------------- */}
//                 <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto'>
//                     <table className='w-full text-sm'>
//                         <thead>
//                             <tr className='border-b border-gray-100 bg-gray-50 text-left text-gray-600'>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Date</th>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Category</th>
//                                 <th className='px-4 py-3 font-semibold'>Title</th>
//                                 <th className='px-4 py-3 font-semibold'>Description</th>
//                                 <th className='px-4 py-3 font-semibold'>Mention</th>
//                                 <th className='px-4 py-3 font-semibold whitespace-nowrap'>Url</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {paginatedEntries.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={6} className='px-4 py-8 text-center text-gray-400'>
//                                         No entries match the selected filters.
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 paginatedEntries.map((entry, index) => (
//                                     <tr
//                                         key={entry.id ?? index}
//                                         className={`border-b border-gray-50 ${index % 2 > 0 ? 'bg-gray-50/60' : 'bg-white'}`}
//                                     >
//                                         <td className='px-4 py-3 whitespace-nowrap align-top'>
//                                             {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : ''}
//                                         </td>
//                                         <td className='px-4 py-3 align-top whitespace-nowrap'>{entry.category}</td>
//                                         <td className='px-4 py-3 align-top max-w-[260px]'>{entry.title}</td>
//                                         <td className='px-4 py-3 align-top max-w-[320px] text-gray-600'>
//                                             {entry.description}
//                                         </td>
//                                         <td className='px-4 py-3 align-top max-w-[220px]'>{entry.mention}</td>
//                                         <td className='px-4 py-3 align-top max-w-[220px] truncate'>
//                                             {entry.url ? (
//                                                 <a
//                                                     href={entry.url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className='text-blue-600 hover:underline'
//                                                 >
//                                                     {entry.url}
//                                                 </a>
//                                             ) : null}
//                                         </td>
//                                     </tr>
//                                 ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* ------------------- pagination controls ------------------- */}
//                 {totalPages > 1 && (
//                     <div className='flex items-center justify-center gap-2 pb-4'>
//                         <button
//                             type="button"
//                             onClick={() => goToPage(currentPage - 1)}
//                             disabled={currentPage === 1}
//                             className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
//                         >
//                             Prev
//                         </button>

//                         <span className='text-sm text-gray-600 px-2'>
//                             Page {currentPage} of {totalPages}
//                         </span>

//                         <button
//                             type="button"
//                             onClick={() => goToPage(currentPage + 1)}
//                             disabled={currentPage === totalPages}
//                             className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
//                         >
//                             Next
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </main>
//     )
// }

// export default Page



'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../Components/Navbar'

import { itemprobes } from '../constants'
import { listenToItems } from '../firebase/firebase'
import { categorylist, mentionlist } from '../constants'
import { format } from 'date-fns'
import { UserMyAppContext } from '../Context/MyAppContext'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 5

const Page = () => {
    const { user } = UserMyAppContext()

    // ------------------- data -------------------
    const [entries, setEntries] = useState<itemprobes[]>([])

    useEffect(() => {
        listenToItems(setEntries)
    }, [])

    // ------------------- filters -------------------
    // Dropdown 1: All / My entries (created by logged-in user)
    const [entryScope, setEntryScope] = useState<'All' | 'My entries'>('All')

    // Dropdown 2: category
    const [categoryFilter, setCategoryFilter] = useState<string>('All')

    // Author keyword chips
    const [authorInput, setAuthorInput] = useState<string>('')
    const [authorKeywords, setAuthorKeywords] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // autosuggest source: named authors from mentionlist, filtered by what's typed
    // and excluding names already added as chips
    const authorSuggestions = useMemo(() => {
        const typed = authorInput.trim().toLowerCase()
        if (!typed) return []
        return mentionlist
            .filter((name) =>
                name.toLowerCase().includes(typed) &&
                !authorKeywords.some(k => k.toLowerCase() === name.toLowerCase())
            )
            .slice(0, 8)
    }, [authorInput, authorKeywords])

    const addAuthorKeyword = (value?: string) => {
        const trimmed = (value ?? authorInput).trim()
        if (!trimmed) return
        if (authorKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
            setAuthorInput('')
            setShowSuggestions(false)
            return
        }
        setAuthorKeywords(prev => [...prev, trimmed])
        setAuthorInput('')
        setShowSuggestions(false)
        setHighlightedIndex(0)
    }

    const removeAuthorKeyword = (keyword: string) => {
        setAuthorKeywords(prev => prev.filter(k => k !== keyword))
    }

    const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions && authorSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightedIndex(prev => (prev + 1) % authorSuggestions.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedIndex(prev => (prev - 1 + authorSuggestions.length) % authorSuggestions.length)
                return
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                addAuthorKeyword(authorSuggestions[highlightedIndex])
                return
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false)
                return
            }
        }

        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addAuthorKeyword()
        } else if (e.key === 'Backspace' && authorInput === '' && authorKeywords.length > 0) {
            // quick remove of the last chip on backspace when input is empty
            setAuthorKeywords(prev => prev.slice(0, -1))
        }
    }

    // ------------------- pagination -------------------
    const [currentPage, setCurrentPage] = useState(1)

    // reset to page 1 whenever a filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [entryScope, categoryFilter, authorKeywords])

    // ------------------- filtering logic -------------------
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            // scope filter: created by current user
            if (entryScope === 'My entries') {
                if (!user?.email || entry.addedBy !== user.email) {
                    return false
                }
            }

            // category filter
            if (categoryFilter !== 'All' && entry.category !== categoryFilter) {
                return false
            }

            // author keyword filter (matches against the "mention" field)
            // ALL entered author keywords must be present (AND, not OR)
            if (authorKeywords.length > 0) {
                const mentionText = (entry.mention || '').toLowerCase()
                const matchesAll = authorKeywords.every(keyword =>
                    mentionText.includes(keyword.toLowerCase())
                )
                if (!matchesAll) return false
            }

            return true
        })
    }, [entries, entryScope, categoryFilter, authorKeywords, user])

    const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))

    const paginatedEntries = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredEntries.slice(start, start + PAGE_SIZE)
    }, [filteredEntries, currentPage])

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return
        setCurrentPage(page)
    }

    // ------------------- excel export -------------------
    const downloadExcel = () => {
        const rows = filteredEntries.map((entry) => ({
            Date: entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '',
            Title: entry.title || '',
            description: entry.description || '',
            mentions: entry.mention || '',
            Url: entry.url || '',
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows, {
            header: ['Date', 'Title', 'description', 'mentions', 'Url'],
        })

        // reasonable column widths
        worksheet['!cols'] = [
            { wch: 12 }, // Date
            { wch: 35 }, // Title
            { wch: 50 }, // description
            { wch: 30 }, // mentions
            { wch: 40 }, // Url
        ]

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'MyData')

        const filename = `MyData_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        XLSX.writeFile(workbook, filename)
    }

    return (
        <main className='flex w-full max-h-screen bg-gray-50 overflow-y-scroll '>
            {/* <Navbar current_page="My Data" /> */}
             <div className="hidden lg:block flex-shrink-0">
                <Navbar current_page="My Data" />
            </div>

            {/* ── Mobile Nav Overlay ── */}
            {isMobileNavOpen && (
                <div className="fixed  inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
                        <Navbar current_page="My Data" />
                    </div>
                </div>
            )}

            <div className='flex-1 min-w-0 p-4 sm:p-6 flex flex-col gap-4 '>
                <div className='flex gap-2 '>
                       <button
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className='text-xl font-semibold text-gray-800 align-bottom'>My Data</h1>
                </div>
                

                {/* ------------------- filter bar ------------------- */}
                <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100'>

                    {/* Dropdown 1: All / My entries */}
                    <select
                        className='w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
                        value={entryScope}
                        onChange={(e) => setEntryScope(e.target.value as 'All' | 'My entries')}
                    >
                        <option value="All">All</option>
                        <option value="My entries">My entries</option>
                    </select>

                    {/* Dropdown 2: category */}
                    <select
                        className='w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {categorylist.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Author keyword input with autosuggest */}
                    <div className='w-full sm:flex-1 sm:min-w-[220px] relative'>
                        <div className='flex flex-wrap items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-300'>
                            {authorKeywords.map((keyword) => (
                                <span
                                    key={keyword}
                                    className='flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full'
                                >
                                    {keyword}
                                    <button
                                        type="button"
                                        onClick={() => removeAuthorKeyword(keyword)}
                                        className='text-blue-500 hover:text-blue-800 font-bold leading-none'
                                        aria-label={`Remove ${keyword}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={authorInput}
                                onChange={(e) => {
                                    setAuthorInput(e.target.value)
                                    setShowSuggestions(true)
                                    setHighlightedIndex(0)
                                }}
                                onKeyDown={handleAuthorKeyDown}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => {
                                    // slight delay so a suggestion click registers before the list unmounts
                                    setTimeout(() => setShowSuggestions(false), 120)
                                }}
                                placeholder={authorKeywords.length === 0 ? "Type an author name..." : "Add another..."}
                                className='flex-1 min-w-[140px] text-sm outline-none py-1'
                            />
                        </div>

                        {/* suggestions dropdown */}
                        {showSuggestions && authorSuggestions.length > 0 && (
                            <ul className='absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg'>
                                {authorSuggestions.map((name, index) => (
                                    <li key={name}>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't fire first
                                            onClick={() => addAuthorKeyword(name)}
                                            className={`w-full text-left px-3 py-2 text-sm ${index === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Excel download */}
                    <button
                        type="button"
                        onClick={downloadExcel}
                        disabled={filteredEntries.length === 0}
                        className='w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'
                    >
                        ⬇ Download Excel
                    </button>
                </div>

                {/* ------------------- results count ------------------- */}
                <p className='text-xs text-gray-500'>
                    Showing {paginatedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                    {' '}-{' '}
                    {Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length} entries
                </p>

                {/* ------------------- table (desktop / tablet) ------------------- */}
                <div className='hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='border-b border-gray-100 bg-gray-50 text-left text-gray-600'>
                                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Date</th>
                                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Category</th>
                                <th className='px-4 py-3 font-semibold'>Title</th>
                                <th className='px-4 py-3 font-semibold'>Description</th>
                                <th className='px-4 py-3 font-semibold'>Mention</th>
                                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Url</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className='px-4 py-8 text-center text-gray-400'>
                                        No entries match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedEntries.map((entry, index) => (
                                    <tr
                                        key={entry.id ?? index}
                                        className={`border-b border-gray-50 ${index % 2 > 0 ? 'bg-gray-50/60' : 'bg-white'}`}
                                    >
                                        <td className='px-4 py-3 whitespace-nowrap align-top'>
                                            {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : ''}
                                        </td>
                                        <td className='px-4 py-3 align-top whitespace-nowrap'>{entry.category}</td>
                                        <td className='px-4 py-3 align-top max-w-[260px]'>{entry.title}</td>
                                        <td className='px-4 py-3 align-top max-w-[320px] text-gray-600'>
                                            {entry.description}
                                        </td>
                                        <td className='px-4 py-3 align-top max-w-[220px]'>{entry.mention}</td>
                                        <td className='px-4 py-3 align-top max-w-[220px] truncate'>
                                            {entry.url ? (
                                                <a
                                                    href={entry.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className='text-blue-600 hover:underline'
                                                >
                                                    {entry.url}
                                                </a>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ------------------- cards (mobile) ------------------- */}
                <div className='sm:hidden flex flex-col gap-2'>
                    {paginatedEntries.length === 0 ? (
                        <div className='bg-white rounded-xl border border-gray-100 px-4 py-8 text-center text-gray-400 text-sm'>
                            No entries match the selected filters.
                        </div>
                    ) : (
                        paginatedEntries.map((entry, index) => (
                            <div
                                key={entry.id ?? index}
                                className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2'
                            >
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 whitespace-nowrap'>
                                        {entry.category}
                                    </span>
                                    <span className='text-[11px] text-gray-400 whitespace-nowrap'>
                                        {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : ''}
                                    </span>
                                </div>

                                <p className='text-sm font-medium text-gray-800 break-words'>{entry.title}</p>

                                {entry.description && (
                                    <p className='text-xs text-gray-600 break-words line-clamp-3'>{entry.description}</p>
                                )}

                                {entry.mention && (
                                    <p className='text-xs text-gray-500 break-words'>
                                        <span className='font-medium text-gray-600'>Mention: </span>
                                        {entry.mention}
                                    </p>
                                )}

                                {entry.url && (
                                    <a
                                        href={entry.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className='text-xs text-blue-600 hover:underline break-all'
                                    >
                                        {entry.url}
                                    </a>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* ------------------- pagination controls ------------------- */}
                {totalPages > 1 && (
                    <div className='flex flex-wrap items-center justify-center gap-2 pb-10 md:pb-4'>
                        <button
                            type="button"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
                        >
                            Prev
                        </button>

                        <span className='text-sm text-gray-600 px-2'>
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            type="button"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className='px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}

export default Page