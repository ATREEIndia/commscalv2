'use client'
import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase/firebase'
import { ref, onValue, remove } from 'firebase/database'
import { useUsers } from '../constants'
import { FaTrash } from 'react-icons/fa'
import Navbar from '../Components/Navbar'
import Rightcontainer from '../Components/Rightcontainer'
import InstaLinksForm from '../Components/InstaLinksForm'

type InstaLinkEntry = {
    id: string,
    title: string,
    link: string,
    addedBy: string,
    addedAt: string,
}

function formatRelative(istString: string): string {
    if (!istString) return '';

    // Parse "yyyy-mm-dd hh:mm:ss" as IST
    const isoLike = istString.replace(' ', 'T') + '+05:30';
    const date = new Date(isoLike);
    if (isNaN(date.getTime())) return istString;

    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
    });
}

function toHref(link: string): string {
    return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

function LinkCard({ entry, canDelete, onDelete }: { entry: InstaLinkEntry, canDelete: boolean, onDelete: (entry: InstaLinkEntry) => void }) {
    return (
        <div className='w-full flex flex-col p-4 bg-white border-2 rounded-xl border-gray-200 gap-1'>
            <div className='flex items-start justify-between gap-3'>
                <h2 className='font-semibold text-gray-800 text-sm'>{entry.title}</h2>
                {canDelete && (
                    <button
                        onClick={() => onDelete(entry)}
                        className='text-gray-300 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0'
                        title="Delete link"
                    >
                        <FaTrash size={13} />
                    </button>
                )}
            </div>
            <a
                href={toHref(entry.link)}
                target="_blank"
                rel="noopener noreferrer"
                className='text-xs text-blue-400 hover:text-blue-600 break-all'
            >
                {entry.link}
            </a>
            <div className='flex items-center gap-2 mt-1 text-[11px] text-gray-400'>
                <span>Added by {entry.addedBy}</span>
                <span>·</span>
                <span title={entry.addedAt}>{formatRelative(entry.addedAt)}</span>
            </div>
        </div>
    )
}

const Page = () => {
    const { users } = useUsers();
    const [useremail, setUseremail] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const [links, setLinks] = useState<InstaLinkEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUseremail(user?.email ?? null);
            const role = users.find((u) => u.email === user?.email)?.role;
            setIsAdmin(role === "admin");
        });
        return () => unsubscribe();
    }, [users]);

    const showToast = (message: string) => {
        setToastMsg(message);
        window.setTimeout(() => setToastMsg(null), 3000);
    }

    useEffect(() => {
        setLoading(true);
        const listRef = ref(db, '/instaLinks/');
        const unsub = onValue(
            listRef,
            (snap) => {
                const data = snap.val();
                if (!data) {
                    setLinks([]);
                    setLoading(false);
                    setFetchError(false);
                    return;
                }

                const entries: InstaLinkEntry[] = Object.entries(data).map(([id, val]: [string, any]) => ({
                    id,
                    title: val.title ?? '',
                    link: val.link ?? '',
                    addedBy: val.addedBy ?? '',
                    addedAt: val.addedAt ?? '',
                }));

                // Newest first — lexicographic sort works because "yyyy-mm-dd hh:mm:ss" sorts chronologically
                entries.sort((a, b) => b.addedAt.localeCompare(a.addedAt));

                setLinks(entries);
                setLoading(false);
                setFetchError(false);
            },
            (err) => {
                console.error('Failed to listen to instaLinks:', err);
                setFetchError(true);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [retryKey]);

    const filteredLinks = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return links;
        return links.filter((l) =>
            l.title?.toLowerCase().includes(q) ||
            l.link?.toLowerCase().includes(q) ||
            l.addedBy?.toLowerCase().includes(q)
        );
    }, [links, search]);

    const handleAddSuccess = () => {
        setShowForm(false);
        showToast("Link added");
    }

    const handleDelete = async (entry: InstaLinkEntry) => {
        const canDelete = isAdmin || entry.addedBy === useremail;
        if (!canDelete) return;

        const ok = window.confirm(`Delete "${entry.title}"?`);
        if (!ok) return;

        try {
            await remove(ref(db, `/instaLinks/${entry.id}`));
            showToast('Link deleted');
        } catch (err) {
            console.error('Failed to delete link:', err);
            showToast('Failed to delete. Try again.');
        }
    }

    return (
        <main className=" flex gap-4 h-full w-full relative p-2 ">
            {/* left navigations */}
            {/* <Navbar current_page="InstaLinks" /> */}

             <div className="hidden lg:block flex-shrink-0">
                <Navbar current_page="InstaLinks" />
            </div>

            {/* ── Mobile Nav Overlay ── */}
            {isMobileNavOpen && (
                <div className="fixed  inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
                        <Navbar current_page="InstaLinks" />
                    </div>
                </div>
            )}


            {/* InstaLinks content */}
            <div className="flex flex-2  ">
                <div className='w-full h-full flex flex-col mt-10 px-4 sm:px-10 max-h-screen overflow-y-scroll'>
                    <div className='w-full flex items-center gap-5 mb-5'>
                           <button
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className='text-lg font-bold text-gray-500'>InstaLinks</h1>
                    </div>

                    <div className='w-full flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center mb-6'>
                        <div className='flex items-center gap-2 bg-gray-50 border-2 border-blue-50 rounded-xl px-3 py-2 w-full sm:max-w-sm'>
                            <span className='text-gray-400 text-sm'>🔍</span>
                            <input
                                type="text"
                                placeholder='Search by title…'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className='bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 w-full'
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className='text-gray-400 hover:text-gray-600 cursor-pointer'>×</button>
                            )}
                        </div>

                        <button
                            className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm whitespace-nowrap'
                            onClick={() => setShowForm(true)}
                        >
                            + Add Link
                        </button>
                    </div>

                    <div className='flex-1 overflow-y-auto pb-10'>
                        {loading ? (
                            <div className='w-full flex justify-center items-center py-20'>
                                <span className='w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin' />
                            </div>
                        ) : fetchError ? (
                            <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                <span className='text-4xl'>⚠️</span>
                                <p className='font-medium text-gray-500'>Couldn&apos;t load links</p>
                                <button
                                    className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm mt-2'
                                    onClick={() => setRetryKey((k) => k + 1)}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : filteredLinks.length === 0 ? (
                            search ? (
                                <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                    <span className='text-4xl'>🔍</span>
                                    <p className='font-medium text-gray-500'>No links match &quot;{search}&quot;</p>
                                    <button
                                        className='text-sm text-blue-500 hover:text-blue-700 cursor-pointer mt-2'
                                        onClick={() => setSearch("")}
                                    >
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                    <span className='text-4xl'>📷</span>
                                    <p className='font-medium text-gray-500'>No links yet</p>
                                    <p className='text-sm'>Be the first to add one — click &quot;+ Add Link&quot; above.</p>
                                </div>
                            )
                        ) : (
                            <div className='flex flex-col gap-3'>
                                {filteredLinks.map((entry) => (
                                    <LinkCard
                                        key={entry.id}
                                        entry={entry}
                                        canDelete={isAdmin || entry.addedBy === useremail}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* right container */}
            <Rightcontainer />

            {/* add link form */}
            {showForm && (
                <InstaLinksForm
                    addedByEmail={useremail ?? ""}
                    onClose={() => setShowForm(false)}
                    onSuccess={handleAddSuccess}
                />
            )}

            {/* success toast */}
            {toastMsg && (
                <div className='fixed top-4 right-4 z-50 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl px-4 py-3 text-sm text-gray-700'>
                    {toastMsg}
                </div>
            )}
        </main>
    )
}

export default Page
