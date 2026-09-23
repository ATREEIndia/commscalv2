'use client'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nav_items } from '../constants'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, firestore } from '../firebase/firebase'
import { useUsers } from '../constants'
import { cleanupOldNotifications } from '../../lib/notifications'
import { emailToColor, getInitial } from '../../lib/assignColor'
import type { AppNotification } from '../smcal/types'
import Image from 'next/image'
import { UserMyAppContext } from '../Context/MyAppContext'

function timeAgo(ts: AppNotification['createdAt'] | undefined | null): string {
  if (!ts?.toMillis) return ''
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

type navprobes = {
  current_page?: string
}

const Navbar = ({ current_page }: navprobes) => {
  const { users, loading } = useUsers();
  const router = useRouter();
  const [isadmin, setisadmin] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>("null");
  const [useremail, setUseremail] = useState<string | null>("null");
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCount = useRef(0);
  const hasInteracted = useRef(false);
  const[isBell, setIsBell]=useState(true)

  const isBellRef = useRef(true);
  useEffect(() => {
  isBellRef.current = isBell;
}, [isBell]);

  useEffect(() => {
    audioRef.current = new Audio("/notify.mp3");

    const unlockAudio = async () => {
      hasInteracted.current = true;

      // try {
      //   await audioRef.current?.play();
      //   audioRef.current?.pause();
      //   if (audioRef.current) {
      //     audioRef.current.currentTime = 0;
      //   }
      // } catch (err) {
      //   console.log("Audio unlock failed", err);
      // }

      window.removeEventListener("pointerdown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
    };
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsername(user?.displayName ?? "Login");
      setUseremail(user?.email ?? "Login");
      if (users.find(u => u.email === user?.email)?.role === "admin") {
        setisadmin(true);
      }
    });
    return () => unsubscribe();
  }, [loading]);

  useEffect(() => {
    if (!useremail || useremail === "Login" || useremail === "null") return;

    cleanupOldNotifications(useremail);

    const q = query(
      collection(firestore, 'notifications'),
      where('recipientEmail', '==', useremail)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

      if (prevCount.current && items.length > prevCount.current) {
        playAudio();
      }

      prevCount.current = items.length;

      setNotifications(items);
    });
    return () => unsubscribe();
  }, [useremail]);

  const playAudio = async () => {
    //console.log('isbell= '+isBell)
    if (!hasInteracted.current || !audioRef.current ||   !isBellRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read && n.id) {
      await updateDoc(doc(firestore, 'notifications', n.id), { read: true });
    }
    setShowDropdown(false);
    router.push(`/smcal/${n.postId}`);
  };

  const markAllAsRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.read && n.id)
        .map((n) => updateDoc(doc(firestore, 'notifications', n.id!), { read: true }))
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const { isRegUser } = UserMyAppContext()

  return (
    <div className="flex h-full z-20 sm:w-[200px] min-h-[99vh] flex-col 
      bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 
      text-white items-center rounded-r-2xl shadow-2xl border-r border-blue-700">

      {/* Logo Section */}
      <div className="w-full flex flex-col items-center py-6 px-4 
        border-b border-blue-700/50 bg-blue-950/30">
        <div className="relative w-16 h-16 mb-3">
          <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur-md"></div>
          <div className="relative bg-blue-950/50 p-2 rounded-2xl border border-blue-600/30">
            <Image
              unoptimized
              src="/logo_commscalv2.png"
              alt="Comms Cal v2"
              width={60}
              height={60}
              className="rounded-xl"
            />
          </div>
        </div>
        <h1 className="hidden sm:block text-sm font-bold text-blue-100 tracking-wider">
          CommsCal
        </h1>
        <span className="hidden sm:block text-[10px] text-blue-400 
          bg-blue-950/50 px-2 py-0.5 rounded-full mt-1 border border-blue-700/30">
          v2.0
        </span>
      </div>

      {/* Notifications */}
      <div className="w-full px-3 pt-3 pb-1 relative">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="group w-full p-2.5 flex items-center gap-3 rounded-xl
            transition-all duration-200 relative
            text-blue-200 hover:bg-white/10 hover:text-white border border-transparent"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
            transition-all duration-200 flex-shrink-0 bg-blue-950/40
            group-hover:bg-white/10 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-90"
              style={{ width: 18, height: 18 }}
            >
              <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .58-.23 1.14-.64 1.55L4 14h16l-1.36-1.36a2.2 2.2 0 0 1-.64-1.55V8a6 6 0 0 0-6-6Z" />
              <path d="M9.5 18a2.5 2.5 0 0 0 5 0h-5Z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full
                bg-red-500 text-white text-[9px] font-bold flex items-center justify-center
                ring-2 ring-blue-900">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className=" sm:block text-sm font-medium truncate">
            Notifications
          </span>
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute left-2 sm:left-full sm:ml-2 top-0 z-40 w-[360px] max-w-[90vw]
              max-h-[420px] flex flex-col bg-white text-gray-800 rounded-2xl shadow-2xl
              border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div onClick={()=>setIsBell(!isBell)} className='flex cursor-pointer'>
                   <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                   {isBell && <p>🔔</p>}
                   {!isBell &&  <p>🔕</p>}
                  
                

                </div>
               
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-blue-500 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-8 h-8 mb-2"
                    >
                      <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .58-.23 1.14-.64 1.55L4 14h16l-1.36-1.36a2.2 2.2 0 0 1-.64-1.55V8a6 6 0 0 0-6-6Z" />
                      <path d="M9.5 18a2.5 2.5 0 0 0 5 0h-5Z" />
                    </svg>
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left flex gap-2.5 px-4 py-2.5 border-b
                        border-gray-50 hover:bg-gray-50 transition-colors
                        ${!n.read ? 'bg-blue-50/70' : ''}`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center
                          text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: emailToColor(n.actor.email) }}
                      >
                        {getInitial(n.actor.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700 leading-snug">{n.message}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 truncate">{n.postTitle}</span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-1 w-full px-3">
        {nav_items.map((item, index) => (
          <Link
            href={item.href}
            key={index}
            target={item.name === "Google sheet" ? "_blank" : ""}
            rel={item.name === "Google sheet" ? "noopener noreferrer" : ""}
            onMouseEnter={() => setIsHovered(index)}
            onMouseLeave={() => setIsHovered(null)}
            className={`group w-full p-2.5 flex items-center gap-3 rounded-xl 
              transition-all duration-200 relative overflow-hidden ${item.no_reg || isRegUser ? "flex" : "hidden"}
              ${current_page === item.name
                ? "bg-white/15 text-white shadow-lg border border-white/20"
                : "text-blue-200 hover:bg-white/10 hover:text-white border border-transparent"
              }`}
          >
            {/* Active Indicator */}
            {current_page === item.name && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 
                bg-blue-400 rounded-r-full"></div>
            )}

            {/* Icon Container */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg
              transition-all duration-200 flex-shrink-0
              ${current_page === item.name
                ? "bg-white"
                : "bg-blue-950/40 group-hover:bg-white/10"
              }`}>
              {item.reactIcon ? (
                <item.reactIcon
                  size={18}
                  className={current_page === item.name ? "text-blue-600" : "text-blue-200 group-hover:text-white opacity-90"}
                />
              ) : (
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={18}
                  height={18}
                  className="opacity-90"
                />
              )}
            </div>

            {/* Label */}
            <span className=" md:block text-sm font-medium truncate">
              {item.name}
            </span>

            {/* External Link Indicator */}
            {item.name === "Google sheet" && (
              <span className="hidden sm:block ml-auto text-[10px] text-blue-400">
                ↗
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Admin Section */}
      {isadmin && (
        <div className="w-full px-3 mt-4">
          <div className="border-t border-blue-700/50 pt-4">
            <p className="hidden sm:block text-[10px] font-semibold text-blue-400 
              uppercase tracking-widest px-1 mb-2">
              Admin
            </p>
            <Link
              href="/users"
              className={`group w-full p-2.5 flex items-center gap-3 rounded-xl 
                transition-all duration-200 border
                ${current_page === "Users"
                  ? "bg-white/15 text-white shadow-lg border-white/20"
                  : "text-blue-200 hover:bg-white/10 hover:text-white border-transparent"
                }`}
            >
              {/* Active Indicator */}
              {current_page === "Users" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 
                  bg-blue-300 rounded-r-full"></div>
              )}

              <div className={`flex items-center justify-center w-8 h-8 rounded-lg 
                transition-all duration-200 flex-shrink-0
                ${current_page === "Users"
                  ? "bg-white/20"
                  : "bg-blue-950/40 group-hover:bg-white/10"
                }`}>
                <Image
                  src="/user.png"
                  alt="Users"
                  width={18}
                  height={18}
                  className="opacity-90"
                />
              </div>
              <span className="hidden sm:block text-sm font-medium">Users</span>

              {/* Admin Badge */}
              <span className="hidden sm:block ml-auto text-[10px] bg-blue-500/40 
                text-blue-200 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                Admin
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* User Profile & Logout */}
      <div className="w-full p-3 border-t border-blue-700/50">
        {/* User Info */}
        <div className="hidden sm:flex items-center gap-2 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/40 border border-blue-400/30 
            flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-200">
              {useremail !== "Login" ? useremail?.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] text-blue-300 font-medium truncate">
              {useremail !== "Login" ? useremail : "Not logged in"}
            </p>
            <p className="text-[9px] text-blue-500">
              {isadmin ? "Administrator" : "Member"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group w-full p-2.5 flex items-center gap-3 rounded-xl 
            text-blue-300 hover:bg-red-500/20 hover:text-red-300 
            transition-all duration-200 border border-transparent 
            hover:border-red-500/30"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg 
            bg-blue-950/40 group-hover:bg-red-500/20 transition-all duration-200 flex-shrink-0">
            <Image
              src="/logout.png"
              alt="Logout"
              width={18}
              height={18}
              className="opacity-80"
            />
          </div>
          <span className="hidden sm:block text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;