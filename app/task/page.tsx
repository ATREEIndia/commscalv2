'use client'
import React, { useEffect, useState } from 'react'
import Navbar from '../Components/Navbar'
import Rightcontainer from '../Components/Rightcontainer'
import { FaHourglassHalf } from "react-icons/fa";
import { MdDone } from "react-icons/md";
import { MdAlignHorizontalLeft } from "react-icons/md";
import { equalTo, get, orderByChild, query, ref, update } from 'firebase/database';
import { auth, db, listenToTasks } from '../firebase/firebase';
import { itemprobes, taskprobs, useUsers } from '../constants';
import { format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import Editform from '../Components/Editform';
import Viewdata from '../Components/Viewdata';





const Page = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const { users, loading } = useUsers();
    const [useremail, setUseremail] = useState<string | null>("null");
    const [iseditformopen, setIseditformopen] = useState(false);

    const [selectedEntry, setSelectedEntry] = useState<taskprobs | null>(null);



    const [currentcategory, setCurrentcategory] = React.useState<string>("pending");

    const [tasks, setTasks] = useState<taskprobs[]>([])
    const [mytasks, setMyTasks] = useState<taskprobs[]>([])
    const [myPendingtasks, setMyPendingTasks] = useState<taskprobs[]>([])
    const [myCompletdtasks, setMyCompletedTasks] = useState<taskprobs[]>([])




    React.useEffect(() => {
        // get_from_db();




        listenToTasks(setTasks)
        const unsubscribe = onAuthStateChanged(auth, (user) => {

            setUseremail(user?.email ?? "");




        });
        return () => unsubscribe();
    }, [loading, iseditformopen, listenToTasks]);


    useEffect(() => {
        // Only run if useremail is set
        if (!useremail) return;

        // Filter tasks assigned to the current user
        const myTasks = tasks.filter(task => task.assigned_to?.includes(useremail) && task.current_status != "No Post");
        setMyTasks(myTasks);

        setMyPendingTasks(myTasks.filter(task => !task.completed_by?.includes(useremail)));


        setMyCompletedTasks(myTasks.filter(task => task.completed_by?.includes(useremail)));
    }, [tasks, useremail]);



    const setcurrentcategory = (category: string) => {
        //console.log(category);
        setCurrentcategory(category);
    }




    // const get_from_db = () => {
    //     setEntries([]);
    //     setPendingentries([]);
    //     setCompletedentries([]);
    //     if (!useremail) return;
    //     const dataRef = ref(db, "/items/");
    //     const sortedQuery = query(dataRef, orderByChild("date"));

    //     get(sortedQuery).then((snapshot) => {
    //         const itemList: itemprobes[] = [];

    //         snapshot.forEach((childSnapshot) => {
    //             const id = childSnapshot.key!;
    //             const item = childSnapshot.val();

    //             if(item.assigned_to === useremail){
    //                  itemList.push({ id, ...item });
    //                  if(item.sm_status==="Working"){
    //                     setPendingentries(prev=>[...prev, { id, ...item }]);
    //                  }
    //                  if(item.sm_status==="Posted"){
    //                     setCompletedentries(prev=>[...prev, { id, ...item }]);

    //             }
    //         }




    //         });

    //         setEntries(itemList.reverse());
    //     });
    // }

    const manageeditform = (entry?: taskprobs) => {

        setIseditformopen(!iseditformopen);
        if (entry) {
            setSelectedEntry(entry);
        }
    }






    return (
        <main className=" flex sm:gap-4 h-full w-full ">
            {/* left navigations */}
            <div className='hidden md:flex'>
                <Navbar current_page="My Tasks" />
            </div>


            {isMobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-70 bg-white shadow-2xl z-10">
                        <Navbar current_page="My Tasks" />
                    </div>
                </div>
            )}

            {/* main content */}
            <div className="flex sm:flex-2 flex-col  w-full min-h-screen overflow-hidden relative">
                <div className='flex'>
                    <button
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMobileNavOpen(true)}
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className='font-bold text-xl p-8'>My Tasks</h1>
                </div>


                {/* task categories */}
                <div className='w-full flex gap-4 justify-center mt-4'>

                    {/* pending */}
                    <div className={`text-xs flex items-center justify-center hover:bg-yellow-500   border-2 bg-gray-500 border-amber-100 cursor-pointer text-white p-2 rounded-lg gap-2 ${currentcategory === "pending" ? "bg-yellow-500" : ""}`} onClick={() => { setcurrentcategory("pending") }}  >
                        <FaHourglassHalf color='white' size={10} />
                        Pending
                    </div>

                    {/* completd */}
                    <div className={`text-xs flex items-center justify-center hover:bg-green-500   border-2 bg-gray-500 border-green-100 cursor-pointer text-white p-2 rounded-lg gap-2 ${currentcategory === "completed" ? "bg-green-500" : ""} `} onClick={() => { setcurrentcategory("completed") }}>
                        <MdDone color='white' size={10} />
                        Completed
                    </div>

                    {/* all */}
                    <div className={`text-xs flex items-center justify-center hover:bg-blue-500   border-2 border-blue-100 cursor-pointer text-white p-2 rounded-lg gap-2  ${currentcategory === "all" ? "bg-blue-500" : "bg-gray-500 "}`} onClick={() => { setcurrentcategory("all") }}>
                        <MdAlignHorizontalLeft color='white' size={10} />
                        all
                    </div>


                </div>

                {/* task all */}
                <div className={`w-full  flex flex-col p-4 items-center overflow-x-hidden overflow-y-scroll max-h-screen ${currentcategory === "all" ? "flex" : "hidden"}`}>
                    All Tasks


                    {mytasks.map((item, index) => (
                        <div key={index} className='w-full flex flex-col p-2 mx-4 mt-2 bg-white  border-2 rounded-xl border-gray-200' onClick={() => manageeditform(item)}>


                            <h1 className='text-sm font-semibold text-gray-700'> {item.title}   </h1>
                            {/* <div className='text-sm text-gray-800'>{item.smTitle}</div> */}
                            <div className='flex gap-4 justify-between mt-4'>
                                <div className='flex flex-col'>
                                    <p className="text-[10px] text-gray-400">Date</p>
                                    {/* <div className='text-xs  text-blue-500'>{format(new Date(item.date), 'dd MMM')}</div> */}
                                    <div className='text-xs  text-blue-500'>{item.date}</div>

                                </div>

                                <div className='flex gap-4 px-2'>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Assigned on</p>
                                        {/* <div className='text-xs  text-blue-500'>{format(new Date(item.createdon), 'dd MMM')}</div> */}
                                        <div className='text-xs  text-blue-500'>{item?.date ? "" : ""}</div>

                                    </div>

                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Deadline</p>
                                        <div className='text-xs  text-red-500'>{item.deadline ? format(new Date(item.deadline), "dd MMM") : "-"}</div>

                                    </div>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Current Status</p>
                                        <div className={`text-xs ${item.current_status === "Working" ? "text-orange-300" : item.current_status === "Posted" ? "text-green-500" : ""} `}>{item.current_status}</div>

                                    </div>
                                </div>




                            </div>

                        </div>
                    ))}

                </div>

                {/* task completed */}
                <div className={`w-full  flex flex-col p-4 items-center overflow-x-hidden overflow-y-scroll max-h-screen ${currentcategory === "completed" ? "flex" : "hidden"}`}>
                    All Tasks


                    {myCompletdtasks.map((item, index) => (
                        <div key={index} className='w-full flex flex-col p-2 mx-4 mt-2 bg-white  border-2 rounded-xl border-gray-200' onClick={() => manageeditform(item)}>


                            <h1 className='text-sm font-semibold text-gray-700'> {item.title}   </h1>
                            {/* <div className='text-sm text-gray-800'>{item.smTitle}</div> */}
                            <div className='flex gap-4 justify-between mt-4'>
                                <div className='flex flex-col'>
                                    <p className="text-[10px] text-gray-400">Date</p>
                                    {/* <div className='text-xs  text-blue-500'>{format(new Date(item.date), 'dd MMM')}</div> */}
                                    <div className='text-xs  text-blue-500'>{item.date}</div>

                                </div>

                                <div className='flex gap-4 px-2'>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Assigned on</p>
                                        {/* <div className='text-xs  text-blue-500'>{format(new Date(item.createdon), 'dd MMM')}</div> */}
                                        <div className='text-xs  text-blue-500'>{item?.date ? "" : ""}</div>

                                    </div>

                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Deadline</p>
                                        <div className='text-xs  text-red-500'>{item.deadline ? format(new Date(item.deadline), "dd MMM") : "-"}</div>

                                    </div>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Current Status</p>
                                        <div className={`text-xs ${item.current_status === "Working" ? "text-orange-300" : item.current_status === "Posted" ? "text-green-500" : ""} `}>{item.current_status}</div>

                                    </div>
                                </div>




                            </div>

                        </div>
                    ))}

                </div>

                {/* task pending */}
                <div className={`w-full  flex flex-col p-4 items-center overflow-x-hidden overflow-y-scroll max-h-screen ${currentcategory === "pending" ? "flex" : "hidden"}`}>
                    All Tasks


                    {myPendingtasks.map((item, index) => (
                        <div key={index} className='w-full flex flex-col p-2 mx-4 mt-2 bg-white  border-2 rounded-xl border-gray-200' onClick={() => manageeditform(item)}>


                            <h1 className='text-sm font-semibold text-gray-700'> {item.title}   </h1>
                            {/* <div className='text-sm text-gray-800'>{item.smTitle}</div> */}
                            <div className='flex gap-4 justify-between mt-4'>
                                <div className='flex flex-col'>
                                    <p className="text-[10px] text-gray-400">Date</p>
                                    {/* <div className='text-xs  text-blue-500'>{format(new Date(item.date), 'dd MMM')}</div> */}
                                    <div className='text-xs  text-blue-500'>{item.date}</div>

                                </div>

                                <div className='flex gap-4 px-2'>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Assigned on</p>
                                        {/* <div className='text-xs  text-blue-500'>{format(new Date(item.createdon), 'dd MMM')}</div> */}
                                        <div className='text-xs  text-blue-500'>{item?.date ? "" : ""}</div>

                                    </div>

                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Deadline</p>
                                        <div className='text-xs  text-red-500'>{item.deadline ? format(new Date(item.deadline), "dd MMM") : "-"}</div>

                                    </div>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Current Status</p>
                                        <div className={`text-xs ${item.current_status === "Working" ? "text-orange-300" : item.current_status === "Posted" ? "text-green-500" : ""} `}>{item.current_status}</div>

                                    </div>
                                </div>




                            </div>

                        </div>
                    ))}

                </div>

                {/* task complted */}
                {/* <div className={`w-full  flex flex-col p-4 items-center overflow-x-hidden overflow-y-scroll max-h-screen ${currentcategory === "completed" ? "flex" : "hidden"}`} >
                    completd Tasks


                    {completedentries.map((item, index) => (
                        <div key={index} className='w-full flex flex-col p-2 mx-4 mt-2 bg-white  border-2 rounded-xl border-gray-200' onClick={()=>manageeditform(item)} >
                            

                            <h1 className='text-sm font-semibold text-gray-700'> {item.title}   </h1>
                            <div className='text-sm text-gray-800'>{item.smTitle}</div>
                            <div className='flex gap-4 justify-between mt-4'>
                                <div className='flex flex-col'>
                                    <p className="text-[10px] text-gray-400">Date</p>
                                    <div className='text-xs  text-blue-500'>{format(new Date(item.date), 'dd MMM')}</div>

                                </div>

                                <div className='flex gap-4 px-2'>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Assigned on</p>
                                        <div className='text-xs  text-blue-500'>{format(new Date(item.createdon), 'dd MMM')}</div>

                                    </div>

                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Deadline</p>
                                        <div className='text-xs  text-red-500'>{item.deadline?format(new Date(item.deadline),"dd MMM"):"-"}</div>

                                    </div>
                                </div>




                            </div>

                        </div>
                    ))}

                </div> */}

                {/* task pending */}
                {/* <div className={`w-full  flex flex-col p-4 items-center overflow-x-hidden overflow-y-scroll max-h-screen ${currentcategory === "pending" ? "flex" : "hidden"}`}>
                    Pending Tasks


                    {pendingentries.map((item, index) => (
                        <div key={index} className='w-full flex flex-col p-2 mx-4 mt-2 bg-white  border-2 rounded-xl border-gray-200' onClick={()=>manageeditform(item)}>
                            

                            <h1 className='text-sm font-semibold text-gray-700'> {item.title}   </h1>
                            <div className='text-sm text-gray-800'>{item.smTitle}</div>
                            <div className='flex gap-4 justify-between mt-4'>
                                <div className='flex flex-col'>
                                    <p className="text-[10px] text-gray-400">Date</p>
                                    <div className='text-xs  text-blue-500'>{format(new Date(item.date), 'dd MMM')}</div>

                                </div>

                                <div className='flex gap-4 px-2'>
                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Assigned on</p>
                                        <div className='text-xs  text-blue-500'>{format(new Date(item.createdon), 'dd MMM')}</div>

                                    </div>

                                    <div className='flex flex-col items-start'>
                                        <p className="text-[10px] text-gray-400">Deadline</p>
                                       <div className='text-xs  text-red-500'>{item.deadline?format(new Date(item.deadline),"dd MMM"):"-"}</div>

                                    </div>
                                </div>




                            </div>

                        </div>
                    ))}

                </div> */}

                {/* <div className='absolute top-0 right-0 z-15  h-full w-full flex justify-center items-center' style={{ display: iseditformopen ? 'flex' : 'none' }}>


                    <Viewdata changeformvisibility={manageeditform} selectedEntry={selectedEntry} currentwimdow={currentcategory} useremail={useremail?useremail:""} />

                </div> */}
                {iseditformopen && (
                    <div className="absolute top-0 right-0 z-50 w-full h-full ">
                        <Viewdata
                            changeformvisibility={manageeditform}
                            selectedEntry={selectedEntry}
                            currentwimdow={currentcategory}
                            useremail={useremail ? useremail : ""}
                        />
                    </div>
                )}

            </div>



            {/* right container */}
            <Rightcontainer />

        </main>
    )
}

export default Page
