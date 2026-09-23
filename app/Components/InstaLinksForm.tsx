'use client'
import { useEffect, useState } from 'react'
import { db } from '../firebase/firebase'
import { ref, push, set } from 'firebase/database'
import { formatISTTimestamp } from '../../lib/time'



type Props = {
    addedByEmail: string,
    onClose: () => void,
    onSuccess: () => void,
}

const InstaLinksForm = ({ addedByEmail, onClose, onSuccess }: Props) => {
    const [title, setTitle] = useState("")
    const [link, setLink] = useState("")
    const [titleError, setTitleError] = useState("")
    const [linkError, setLinkError] = useState("")
    const [submitError, setSubmitError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [titleTouched, setTitleTouched] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onClose])

    const handleSubmit = async () => {
        const trimmedTitle = title.trim()

        if (!trimmedTitle) {
            setTitleError("Title is required.")
            return
        }
        setTitleError("")

        try {
            new URL(link)
        } catch {
            setLinkError("Please enter a valid URL (including https://).")
            return
        }
        setLinkError("")
        setSubmitError("")

        setSubmitting(true)
        try {
            const listRef = ref(db, '/instaLinks/')
            const newRef = push(listRef)
            await set(newRef, {
                title: trimmedTitle,
                link: link.trim(),
                addedBy: addedByEmail,
                addedAt: formatISTTimestamp(new Date()),
            })
            setTitle("")
            setLink("")
            onSuccess()
        } catch {
            setSubmitError("Failed to save. Try again.")
        } finally {
            setSubmitting(false)
        }
    }

   useEffect(() => {
    if (titleTouched) return // user is typing their own title, don't override

    let cancelled = false

    try {
        new URL(link)
    } catch {
        return // not a valid URL yet, don't fetch
    }

    const timeout = setTimeout(async () => {
        setTitle("loading...")
        try {
            const res = await fetch(`/api/og-title?url=${encodeURIComponent(link)}`)
            const data = await res.json()
            if (!cancelled) setTitle(data.title ?? "")
        } catch {
            if (!cancelled) setTitle("")
        }
    }, 600) // debounce

    return () => {
        cancelled = true
        clearTimeout(timeout)
    }
}, [link, titleTouched])



    


  

    return (
        <div className='w-full h-full absolute top-0 right-0 flex justify-center items-center z-50'>
            <div className='relative w-full h-full flex justify-center items-center'>
                <div className='absolute top-0 right-0 w-full h-full bg-gray-100 opacity-50' onClick={() => { if (!submitting) onClose(); }}></div>
                <div className='border-2 w-[90%] sm:w-[30%] p-4 items-center flex flex-col border-gray-50 z-20 gap-2 bg-white rounded-xl shadow-lg'>
                    <h1 className='font-bold text-lg'>Add Link</h1>

                    <div className='w-full flex flex-col gap-1'>
                        <input
                            type="text"
                            placeholder='Title'
                            className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full'
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                        />
                        {titleError && <p className='text-xs text-red-500'>{titleError}</p>}
                    </div>

                    <div className='w-full flex flex-col gap-1'>
                        <input
                            type="text"
                            placeholder='Link (https://...)'
                            className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full'
                            value={link}
                            onChange={(e) => { setLink(e.target.value); setLinkError(""); }}
                        />
                        {linkError && <p className='text-xs text-red-500'>{linkError}</p>}
                    </div>

                    {submitError && <p className='text-xs text-red-500'>{submitError}</p>}

                    <div className='w-full flex gap-4 justify-around mt-4'>
                        <button
                            className='p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>

                        <button
                            className='p-2 px-4 bg-blue-400 rounded-xl text-sm text-white hover:bg-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Saving..." : "Add Link"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InstaLinksForm
