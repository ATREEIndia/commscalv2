'use client'
import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, firestore, listenToTasks } from '../firebase/firebase'
import { useUsers, type taskprobs } from '../constants'
import dayjs from '../../lib/dayjs'
import Navbar from '../Components/Navbar'
import SmCalendar from '../Components/SmCalendar'
import PostModal, { type TaskPrefill } from '../Components/PostModal'
import PostDetail from '../Components/PostDetail'
import Viewdata from '../Components/Viewdata'
import UpcomingEnvDays from '../Components/UpcomingEnvDays'
import { useEnvDays } from '../hooks/useEnvDays'
import type { SMPost } from './types'
import { useRouter } from 'next/navigation'
import { Divide, X } from 'lucide-react'



const PRIORITY_CFG = {
  overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  urgent: { label: 'Urgent', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  high: { label: 'High', bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  normal: { label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
} as const

function getPriorityLevel(deadline: string | undefined): keyof typeof PRIORITY_CFG {
  if (!deadline) return 'normal'
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (d < 0) return 'overdue'
  if (d <= 2) return 'urgent'
  if (d <= 5) return 'high'
  return 'normal'
}

export default function SmCalPage() {

   const router = useRouter()


  const [user, setUser] = useState<any>(null)
  const [posts, setPosts] = useState<SMPost[]>([])
  const [tasks, setTasks] = useState<taskprobs[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState('')
  const [taskPrefillForNewPost, setTaskPrefillForNewPost] = useState<TaskPrefill | undefined>(undefined)
  const [showHidden, setShowHidden] = useState(false)
  const [viewingTask, setViewingTask] = useState<taskprobs | null>(null)

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const[isAlert, setIsAlert]=useState(false)

  const { users } = useUsers()
  const isAdmin = users.find((u) => u.email === user?.email)?.role === 'admin'
  const reg_users = users.some((u) => u.email === user?.email)
  const { days: envDays } = useEnvDays()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'posts'), (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SMPost)))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = listenToTasks(setTasks)
    return () => unsub()
  }, [])

  const openNewPost = (dateStr = '') => {

    setIsAlert(true)


    return;
    
    setPrefilledDate(dateStr)
    setShowNewPost(true)
  }

  const eligibleTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.assigned_to?.length ?? 0) > 0 &&
          t.current_status !== 'Posted' &&
          !t.linkedSmPostId
      ),
    [tasks]
  )

  const visibleTasks = useMemo(() => eligibleTasks.filter((t) => !t.hidden), [eligibleTasks])
  const hiddenTasks = useMemo(() => eligibleTasks.filter((t) => t.hidden), [eligibleTasks])

  const pendingTasks = useMemo(() => {
    const list = showHidden ? [...visibleTasks, ...hiddenTasks] : visibleTasks
    return [...list].sort((a, b) => {
      const aDate = a.date || a.deadline || ''
      const bDate = b.date || b.deadline || ''
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
  }, [visibleTasks, hiddenTasks, showHidden])

  const toggleHidden = async (task: taskprobs) => {
    if (!task.id) return
    await updateDoc(doc(firestore, 'tasks', task.id), { hidden: !task.hidden })
  }

  const createPostFromTask = (task: taskprobs) => {
    const firstAssignee = task.assigned_to?.[0] || ''
    const assignedUser = users.find((u) => u.email === firstAssignee)
    setTaskPrefillForNewPost({
      taskId: task.id || '',
      title: task.title || '',
      bodyCopy: `${task.description}\n${task.url}` || '',
      assignedTo: firstAssignee,
      docUrl: task.url || "",
      assignedToName: assignedUser?.displayName || firstAssignee,
    })
    setPrefilledDate(task.deadline ? task.deadline.toString() : '')
    //setPrefilledDate(dayjs(task.date).format('YYYY-MM-DDT09:00'))
    setShowNewPost(true)
  }
  ///////////////////////////////////////////////////////////////
  const [taskPanelHeight, setTaskPanelHeight] = useState(260);

  const startTaskResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    const startY = e.clientY;
    const startHeight = taskPanelHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;

      setTaskPanelHeight(
        Math.max(
          120,
          Math.min(600, startHeight + delta)
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  ///////////////////////////////////////////////////////////////////

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {/* <Navbar current_page="SM Cal" /> */}
      <div className="hidden lg:block flex-shrink-0">
        <Navbar current_page="SM Cal" />
      </div>

      {/* ── Mobile Nav Overlay ── */}
      {isMobileNavOpen && (
        <div className="fixed  inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
            <Navbar current_page="SM Cal" />
          </div>
        </div>
      )}


      <div className="flex-1 overflow-auto p-2 sm:p-4 flex flex-col gap-3">
        <div className='flex lg:hidden align-middle'>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className='font-semibold  text-center align-middle w-full'>SM CAL</h1>
        </div>

        <div className="flex-1 min-h-0 p-2">
          <SmCalendar
            posts={posts}
            envDays={envDays}
            onPostClick={(id) => setSelectedPostId(id)}
            onCellClick={(dateStr) => openNewPost(dateStr)}
            onNewPost={() => openNewPost()}
          />
        </div>

        {reg_users && pendingTasks.length > 0 && (

          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-shrink-0 overflow-hidden"
            style={{ height: `${taskPanelHeight}px` }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={startTaskResize}
              className="h-2 cursor-row-resize bg-gray-100 hover:bg-gray-200 border-b border-gray-200"
              title="Drag to resize"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">
                Pending Tasks ({visibleTasks.length})
              </h2>

              {hiddenTasks.length > 0 && (
                <button
                  onClick={() => setShowHidden((v) => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  {showHidden
                    ? "Hide hidden tasks"
                    : `Show hidden (${hiddenTasks.length})`}
                </button>
              )}
            </div>

            {/* Task List */}
            <div
              className="overflow-y-auto divide-y divide-gray-50"
              style={{ height: "calc(100% - 46px)" }}
            >
              {pendingTasks.map((task) => {
                const priority = getPriorityLevel(task.deadline);
                const pConf = PRIORITY_CFG[priority];

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5 ${task.hidden ? "opacity-50" : ""
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {task.title}
                        </p>

                        {task.deadline && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border
                  ${pConf.bg} ${pConf.text} ${pConf.border}`}
                          >
                            {pConf.label}
                          </span>
                        )}

                        {task.hidden && (
                          <span className="text-[10px] text-gray-400 italic">
                            Hidden
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {task.date && (
                          <span className="text-[10px] text-gray-400">
                            {dayjs(task.date).format("DD MMM YYYY")}
                          </span>
                        )}

                        {task.assigned_to?.map((person, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full border border-gray-200"
                          >
                            {person.split("@")[0]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setViewingTask(task)}
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        Open Task
                      </button>

                      <button
                        onClick={() => createPostFromTask(task)}
                        className="text-xs bg-blue-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-blue-700"
                      >
                        Create SM Post
                      </button>

                      <button
                        onClick={() => toggleHidden(task)}
                        className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        {task.hidden ? "Unhide" : "Hide"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
















          // <div className="hidden bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
          //   <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          //     <h2 className="text-sm font-bold text-gray-800">
          //       Pending Tasks ({visibleTasks.length})
          //     </h2>
          //     {hiddenTasks.length > 0 && (
          //       <button
          //         onClick={() => setShowHidden((v) => !v)}
          //         className="text-xs text-blue-500 hover:text-blue-700"
          //       >
          //         {showHidden ? 'Hide hidden tasks' : `Show hidden (${hiddenTasks.length})`}
          //       </button>
          //     )}
          //   </div>
          //   <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          //     {pendingTasks.map((task) => {
          //       const priority = getPriorityLevel(task.deadline)
          //       const pConf = PRIORITY_CFG[priority]
          //       return (
          //         <div
          //           key={task.id}
          //           className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5
          //             ${task.hidden ? 'opacity-50' : ''}`}
          //         >
          //           <div className="flex-1 min-w-0">
          //             <div className="flex flex-wrap items-center gap-2">
          //               <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
          //               {task.deadline && (
          //                 <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border
          //                   ${pConf.bg} ${pConf.text} ${pConf.border}`}>
          //                   {pConf.label}
          //                 </span>
          //               )}
          //               {task.hidden && (
          //                 <span className="text-[10px] text-gray-400 italic">Hidden</span>
          //               )}
          //             </div>
          //             <div className="flex flex-wrap items-center gap-1.5 mt-1">
          //               {task.date && (
          //                 <span className="text-[10px] text-gray-400">
          //                   {dayjs(task.date).format('DD MMM YYYY')}
          //                 </span>
          //               )}
          //               {task.assigned_to?.map((person, i) => (
          //                 <span
          //                   key={i}
          //                   className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full border border-gray-200"
          //                 >
          //                   {person.split('@')[0]}
          //                 </span>
          //               ))}
          //             </div>
          //           </div>
          //           <div className="flex items-center gap-2 flex-shrink-0">
          //             <button
          //               onClick={() => setViewingTask(task)}
          //               className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5"
          //             >
          //               Open Task
          //             </button>
          //             <button
          //               onClick={() => createPostFromTask(task)}
          //               className="text-xs bg-blue-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-blue-700"
          //             >
          //               Create SM Post
          //             </button>
          //             <button
          //               onClick={() => toggleHidden(task)}
          //               className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
          //             >
          //               {task.hidden ? 'Unhide' : 'Hide'}
          //             </button>
          //           </div>
          //         </div>
          //       )
          //     })}
          //   </div>
          // </div>
        )}

        <UpcomingEnvDays
          days={envDays}
          isAdmin={isAdmin}
          currentUserEmail={user?.email ?? ''}
        />
      </div>

      {showNewPost && (
        <PostModal
          user={user}
          prefilledDate={prefilledDate}
          taskPrefill={taskPrefillForNewPost}
          onClose={() => {
            setShowNewPost(false)
            setTaskPrefillForNewPost(undefined)
          }}
        />
      )}

      {/* alert dialog */}

      {isAlert && <div onClick={()=>setIsAlert(false)} className='w-full h-screen fixed z-15 bg-black/40 border-2 flex items-center justify-center p-4'>
      <div className='bg-white p-4 rounded-xl shadow-lg flex flex-col gap-5 lg:max-w-[40%]'>
       <div className='flex items-center justify-between gap-5'>
         <h1 className='font-semibold text-gray-00'>Alert: Direct additions are blocked </h1>
        <X onClick={()=>setIsAlert(false)} className='hover:text-red-500 cursor-pointer active:scale-5'/>

        </div>
       
        <p className='text-sm select-none'>Please add to the Database first and assign a person to do the task. Then using the prompted window add to smcal</p>
        <p className='text-xs p-2 bg-amber-200'>This will ensure that the database entry and the smcal entries are connected. </p>
        <div className='flex items-center justify-center gap-5'>
          
          <button onClick={()=>  router.push('/database')} className='p-2 rounded-xl bg-white-500 hover:font-semibold bg-blue-100 hover:text-white hover:bg-blue-600 border-2 border-blue-200 cursor-pointer active:scale-90'>Open Database</button>

        </div>

      </div>

        </div>}

      {selectedPostId && (
        <PostDetail
          postId={selectedPostId}
          user={user}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {viewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingTask(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <Viewdata changeformvisibility={() => setViewingTask(null)} selectedEntry={viewingTask} />
          </div>
        </div>
      )}
    </div>
  )
}
