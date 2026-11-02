'use client'

import { onAuthStateChanged, User } from "firebase/auth"
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { auth, firestore } from "../firebase/firebase"
import { doc, getDoc } from "firebase/firestore"
import { GUEST_ROLE, guestLevel, sectionForPath, type AccessLevel, type GuestAccess, type GuestSection } from "../../lib/access"

type appContexType = {
    user: User | null,
    // Registered user. For a guest this is true only on a page whose section they can edit,
    // so the registered-user features of that page work for them there and nowhere else.
    isRegUser: boolean,
    loading: boolean,
    role:string,
    isGuest: boolean,
    // How much this user can do in a section: guests get what the admin picked;
    // other registered users can edit everything.
    access: (section: GuestSection) => AccessLevel,
}

// Signed-in emails allowed in without being in reg_users.
const isOpenEmail = (email?: string | null) =>
    !!email && (email.endsWith('@atree.org') || email === "ananyapathak.emailme@gmail.com" || email === "v.nsreekuttan250@gmail.com")

const myAppContext = createContext<appContexType | null>(null)
export const MyAppContextProvider = ({children}:{children:ReactNode}) => {
    const [loggedinUser, SetLoggedinUser] = useState<User | null>(null)
    const [isRegistered, setIsRegistered] = useState(false)
    const[loading, setIsLoading]=useState(true)
    const[role, setrole]=useState("")
    const [guestAccess, setGuestAccess] = useState<GuestAccess>({})
    const path = usePathname()

    useEffect(() => {
        const unSubscribe = onAuthStateChanged(auth, async (user) => {
            let regData: Record<string, any> | undefined
            if (user?.email) {
                // Still verifying: Login waits for this before deciding to sign the user out.
                setIsLoading(true)
                try {
                    const regUser = await getDoc(doc(firestore, 'reg_users', user.email))
                    regData = regUser.exists() ? regUser.data() : undefined
                } catch (e) {
                    console.log(e)
                }
            }

            // Anyone in reg_users (any email domain), plus the open emails.
            if (user && (regData || isOpenEmail(user.email))) {
                SetLoggedinUser(user)
                setIsRegistered(!!regData)
                setrole(regData?.role ?? "")
                setGuestAccess(regData?.guestAccess ?? {})
            } else {
                SetLoggedinUser(null)
                setIsRegistered(false)
                setrole("")
                setGuestAccess({})
            }
            setIsLoading(false)
        })

        return () => unSubscribe()

    }, [])

    const isGuest = isRegistered && role === GUEST_ROLE

    const access = useCallback((section: GuestSection): AccessLevel => {
        if (isGuest) return guestLevel(guestAccess, section)
        if (isRegistered) return 'edit'
        // Signed-in but unregistered: only the Database, where they add and edit their own items.
        return section === 'database' && loggedinUser ? 'own' : 'none'
    }, [isGuest, isRegistered, guestAccess, loggedinUser])

    const section = sectionForPath(path)
    const isRegUser = isGuest
        ? section !== null && section !== 'dashboard' && access(section) === 'edit'
        : isRegistered

    // Guests can't open pages outside the sections they were given.
    const guestBlocked = isGuest && (section === null || (section !== 'dashboard' && access(section) === 'none'))

    const value={
        user:loggedinUser,
        loading:loading,
        isRegUser:isRegUser,
        role:role,
        isGuest,
        access,
    }

    return <myAppContext.Provider value={value} >
        {guestBlocked ? (
            <div className='w-screen h-screen flex flex-col bg-blue-50 gap-4 justify-center items-center p-4 text-center'>
                <p className='text-sm text-gray-500'>You don&apos;t have access to this section. Please contact the admin if you need it.</p>
                <Link href='/' className='text-sm font-medium text-blue-500 hover:text-blue-600'>Go to Dashboard</Link>
            </div>
        ) : children}

    </myAppContext.Provider>

}

export const UserMyAppContext=()=>{
    const context=useContext(myAppContext);
    if(!context){
        console.log('No context found')
        throw new Error("Error in context")
    }
    return context;

}
