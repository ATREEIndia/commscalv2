'use client'
import React, { useEffect, useState } from 'react'
import Navbar from '../Components/Navbar'
import Rightcontainer from '../Components/Rightcontainer'

import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

import { auth, db, firestore, getRegistedUsers, listenToItems } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { itemprobes, taskprobs, updatewtwsheet_url } from '../constants';
import Dataform from '../Components/Dataform';
import { format } from 'date-fns';
import Editform from '../Components/Editform';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { UserMyAppContext } from '../Context/MyAppContext';


const Page = () => {
    const [entries, setEntries] = useState<itemprobes[]>([])
    const [currrentMonthEntries, setCurrentMonthEntries] = useState<itemprobes[]>([]);
    const [reg_users, setReg_users] = useState<any[]>([]);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);



    const [notification_msg, setNotification_msg] = useState<string>("");
    const [show_notification, setShow_notification] = useState<boolean>(false);

    const [wtw_status, setwtw_status] = useState<boolean>(true);

    const [sortcreatedon, setsortcreatedon] = useState(false);

    const { isRegUser, user } = UserMyAppContext()

    useEffect(() => {
        listenToItems(setEntries)

        getRegistedUsers().then(users => setReg_users(users ?? []))

    }, [])

    const letterColors = {
        A: "bg-red-400",
        B: "bg-blue-400",
        C: "bg-green-400",
        D: "bg-purple-400",
        E: "bg-yellow-400",
        F: "bg-pink-400",
        // add more as needed
    };
    const colors = [
        "bg-red-400",
        "bg-blue-400",
        "bg-green-400",
        "bg-purple-400",
        "bg-yellow-400",
        "bg-pink-400",
    ];


    const [username, setUsername] = useState<string | null>("null");

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUsername(user?.displayName ?? "Login");
        });
        return () => unsubscribe();
    }, []);

    const [currentMonth, setCurrentMonth] = useState('');

    useEffect(() => {
        const itemList: itemprobes[] = [];
        entries.forEach((entry) => {
            const entrydate = new Date(entry.date);
            if (entrydate.getMonth() !== currentDate.getMonth()) {
                return;
            }
            if (entrydate.getFullYear() !== currentDate.getFullYear()) {
                return;
            }
            itemList.push(entry);

        });
        setCurrentMonthEntries(itemList);

    }, [currentMonth, entries])








    const [currentDate, setCurrentDate] = useState(new Date());



    const [isdataformopen, setIsdataformopen] = useState(false);
    const [iseditformopen, setIseditformopen] = useState(false);

    const [selectedEntry, setSelectedEntry] = useState<itemprobes | null>(null);

    const changeformvisibility = () => {
        setIsdataformopen(!isdataformopen)
    }

    const manageeditform = (entry?: itemprobes) => {
        setIseditformopen(!iseditformopen);

        if (entry) {

            setSelectedEntry(entry);
        }

    }






    // const get_from_db = () => {
    //     const dataRef = ref(db, "/items/");
    //     const sortedQuery = query(dataRef, orderByChild("date"));

    //     get(sortedQuery).then((snapshot) => {
    //         const itemList: itemprobes[] = [];

    //         snapshot.forEach((childSnapshot) => {
    //             const id = childSnapshot.key!;
    //             const item = childSnapshot.val();
    //             const date = new Date(item.date);
    //             const month = date.getMonth();
    //             if (month !== currentDate.getMonth()) {
    //                 return;
    //             }


    //             itemList.push({ id, ...item });
    //         });

    //         setEntries(itemList.reverse());
    //     });
    // }


    // const add_to_db = ({ date, createdon, title, subtitle, description, category, platform, url, img_url, sm_status, mention, website_status, remarks }: itemprobes) => {
    //     const dataRef = ref(db, '/items/');
    //     const newdataRef = push(dataRef);
    //     set(newdataRef, {
    //         date: date,
    //         createdon: createdon,
    //         title: title,
    //         subtitle: subtitle,
    //         Description: description,
    //         category: category,
    //         platform: platform,
    //         url: url,
    //         img_url: img_url,
    //         sm_status: sm_status,
    //         mention: mention,
    //         remarks: remarks,
    //         website_status: website_status
    //     })
    //         .then(() => {
    //             alert('Data added successfully!');
    //         })
    //         .catch((error) => {
    //             console.error('Error adding data:', error);
    //         });
    // }

    const updatedsmstatus = async (title: string, status: string, date: string, id: string) => {
        const dataRef = ref(db, '/items/');
        const queryRef = query(dataRef, orderByChild('title'), equalTo(title));
        const snapshot = await get(queryRef);

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const key = childSnapshot.key;
                const updates: Record<string, any> = {};
                updates[`items/${key}/sm_status`] = status;

                update(ref(db), updates)
                    .then(() => {
                        //console.log('sm_status updated successfully!');
                        //get_from_db();
                        updatetask(title, status, date, id)

                    })
                    .catch((error) => {
                        console.error('Error updating sm_status:', error);
                    });
            });
        }
        updateSheet(date, title, status);


    }


    const updatedwtw_status = async (title: string, status: string, date: string) => {
        const dataRef = ref(db, '/items/');
        const queryRef = query(dataRef, orderByChild('title'), equalTo(title));
        const snapshot = await get(queryRef);

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const key = childSnapshot.key;
                const updates: Record<string, any> = {};
                if (status == "reset") {
                    updates[`items/${key}/wtw_status`] = "";


                } else {
                    updates[`items/${key}/wtw_status`] = status == "true";

                }


                update(ref(db), updates)
                    .then(() => {
                        //console.log('wtw_status updated successfully!');
                        //get_from_db();


                    })
                    .catch((error) => {
                        console.error('Error updating wtw_status:', error);
                    });
            });
        }
        updateSheetwtw(date, title, status);


    }

    const updateSheetwtw = (date: string, title: string, current_status: string) => {

        const formattedDate = format(date, 'MMM yy');
        const params = {
            sheetname: formattedDate,
            search: title,
            updatevalue: current_status
        }
        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');

        const fullUrl = `${updatewtwsheet_url}?${query}`;

        //console.log("Full URL:", fullUrl);


        fetch(fullUrl).
            then(res => res.text())
            .then(response => {
                //alert("Resp:" + response);
            })
            .catch(error => {
                // alert("Error:" + error);
            });

    }





    const prev_month = () => {
        const prev = new Date(currentDate);
        prev.setMonth(prev.getMonth() - 1);
        setCurrentDate(prev);

    };


    const next_month = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        setCurrentDate(next);
    };


    useEffect(() => {
        const month = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        setCurrentMonth(`${month} ${year}`);
    }, [currentDate]);


    const updatetask = async (title: string, current_status: string, date: string, id: string) => {

        try {

            console.log('id')

            const userdocref0 = doc(firestore, "tasks", id);


            const userdocref = doc(firestore, "tasks", title);
            const docSnap = await getDoc(userdocref);
            if (docSnap.exists()) {
                //alert("Pleae assign a user");
                // return; 
                await updateDoc(userdocref, {
                    title: title,

                    current_status: current_status,


                });


            }
            const docSnap0 = await getDoc(userdocref0);
            if (docSnap0.exists()) {

                await updateDoc(userdocref0, {
                    title: title,

                    current_status: current_status,


                });

            }






            //alert("Task added successfully!");




        } catch (error) {
            //alert("Error: " + error);
            console.error(error);
        }

    }

    const updateSheet = (date: string, title: string, current_status: string) => {
        const base = "https://script.google.com/macros/s/AKfycbzU4fJk30VytfQGqEuMWDXLxkNGuVL5jSz_ds2MFBXv3-uF3xRswLHX3eRfP9h1J-OAzA/exec"
        const formattedDate = format(date, 'MMM yy');
        const params = {
            sheetname: formattedDate,
            search: title,
            updatevalue: current_status
        }
        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');

        const fullUrl = `${base}?${query}`;

        //console.log("Full URL:", fullUrl);


        fetch(fullUrl).
            then(res => res.text())
            .then(response => {
                //alert("Resp:" + response);
            })
            .catch(error => {
                // alert("Error:" + error);
            });

    }


    const showToast = (message: string) => {
        setNotification_msg(message);
        setShow_notification(true);
        setTimeout(() => {
            setShow_notification(false);
            setNotification_msg("");
        }, 5000);
    }

    const sortdata = () => {

        console.log(sortcreatedon)
        // flip the toggle first
        const newSortState = !sortcreatedon;
        setsortcreatedon(newSortState);

        // clone the array
        const tempentries = [...currrentMonthEntries];

        // choose the correct field
        if (newSortState) {
            tempentries.sort((a, b) => {
                return new Date(b.createdon).getTime() - new Date(a.createdon).getTime();
            });
        } else {
            tempentries.sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
        }

        setCurrentMonthEntries(tempentries);
    };




    return (
        <main className=" flex sm:gap-4 h-full w-full overflow-hidden">
            {/* left navigations */}
            <div className="hidden lg:block flex-shrink-0">
                <Navbar current_page="Database" />
            </div>

            {/* ── Mobile Nav Overlay ── */}
            {isMobileNavOpen && (
                <div className="fixed  inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
                        <Navbar current_page="Database" />
                    </div>
                </div>
            )}

            {/* calendar content */}
            <div className="flex sm:flex-2 sm:w-[70%] w-full md:p-2 -center  flex-col relative p-2 px-4" >
                {/* add new button */}
                <div className='w-full  mt-4 z-10 absolute top-0 right-0 align-middle  flex  flex-col md:flex-row items-center justify-center gap-0  '>
                    
                    <div className='flex w-full px-4  '>
                        <button
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className='w-full flex justify-center '>
                            <div className='sm:w-[80%] text-center flex items-center justify-center gap-8   '>
                                <FaArrowLeft size={15} onClick={prev_month} className='cursor-pointer' />
                                <div className='font-bold text-lg capitalize'>{currentMonth} </div>
                                < FaArrowRight size={15} onClick={next_month} className='cursor-pointer' />
                            </div>
                        </div>


                    </div>

                    <div className=' flex w-40  justify-center md:justify-end flex-row mt-2 sm:mt-0 '>
                        <div className='text-sm px-4 py-2 rounded-xl bg-blue-300 shadow-xl hover:bg-blue-400 cursor-pointer  ' onClick={changeformvisibility}>+ Add New</div>
                    </div>

                </div>

                <div className=' mt-16 overflow-y-auto max-h-screen flex flex-col gap-2 '>

                    <div className={`sm:flex  hidden w-full  p-4 gap-4 items-center bg-blue-200 justify-around sticky top-0 z-10 rounded-xl `}>
                        <div>
                            <h1 className='text-sm  align-middle text-cente cursor-pointer font-semibold w-[8%]' onClick={() => { sortdata() }}>Date </h1>
                            <h1 className='text-xs  align-middle text-cente cursor-pointer text-gray-400 ' onClick={() => { sortdata() }}> {sortcreatedon ? '\n created on' : ''}</h1>

                        </div>

                        <h1 className='text-sm text-center align-middle font-semibold justify-center w-[15%]'>Category</h1>
                        <h2 className='w-[20%] text-center overflow-clip text-sm font-semibold'>Title</h2>
                        <p className='w-[20%]   overflow-clip text-sm text-center font-semibold'>mention</p>
                        <p className={`w-[5%]  overflow-clip text-sm text-center font-semibold ${isRegUser ? "flex" : "hidden"}`}>WTW Status</p>
                        <p className={`w-[15%]   overflow-clip text-sm text-center font-semibold ${isRegUser ? "" : "hidden"}`}>SM Status</p>
                    </div>
                    {currrentMonthEntries.map((entry, index) => (
                        <div key={index}>
                            {/* computer screen */}
                            <div className={`sm:flex hidden w-full justify-around   ${index % 2 > 0 ? "bg-gray-200" : "bg-white"} rounded-xl p-4 gap-4 items-center`}>
                                <h1 className='text-sm text-left align-middle justify-start w-[8%]'>{format(new Date(entry.date), 'dd MMM')}</h1>

                                <h1 className={`text-sm ${entry.sm_status === "Posted" ? "bg-green-200" : entry.sm_status === "Working" ? "bg-orange-200" : entry.sm_status === "No Post" ? "bg-red-200" : entry.sm_status === "Pending Breakdown" ? "bg-yellow-200" : "bg-white"}  rounded-xl p-2 text-left align-middle justify-start w-[15%]`}>{entry.category}</h1>

                                <div className="flex -space-x-2">
                                    {entry.assigned_to?.split(',').map((person, index) => {
                                        const name = person.trim();
                                        const letter = name.charAt(0).toUpperCase();
                                        const color = colors[letter.charCodeAt(0) % colors.length];

                                        return (
                                            <h1
                                                key={index}
                                                title={name} // 👈 shows name on hover
                                                className={`rounded-full ${color} w-5 h-5 flex items-center justify-center text-white cursor-pointer text-xs`}
                                            >
                                                {letter}
                                            </h1>
                                        );
                                    })}
                                </div>

                                <h2 className='w-[20%] cursor-pointer  text-center whitespace-normal break-words  max-h-[100px] overflow-clip  text-sm' onClick={() => { manageeditform(entry) }}>{entry.title} </h2>
                                <p className='w-[20%]   text-sm text-center whitespace-normal break-words max-h-[100px] overflow-clip '>{entry.mention}</p>








                                <div className={`flex justify-center items-center gap-5  ${isRegUser ? "flex" : "hidden"}`}>

                                    <label className="custom-checkbox mt-1">
                                        <input className={``}
                                            type="checkbox"
                                            checked={String(entry.wtw_status) == "false"}
                                            onChange={(e) =>
                                                updatedwtw_status(entry.title, String(e.target.checked), entry.date)
                                            }
                                        />
                                        <span className="checkmark"></span>
                                    </label>


                                    <input className='w-[20px] h-[20px]' type='checkbox' checked={entry.wtw_status ? true : false} onChange={(e) => updatedwtw_status(entry.title, String(e.target.checked), entry.date)} />

                                    <p className='cursor-pointer' onClick={() => { updatedwtw_status(entry.title, 'reset', entry.date) }}>↺</p>

                                    {/* <input className={`${entry.wtw_status?"":"hidden"}`} type='checkbox' checked={entry.wtw_status ? entry.wtw_status : false} onChange={(e) => updatedwtw_status(entry.title, e.target.checked, entry.date)} />

                                   
                                    <select className='bg-transparent focus:ring-0 focus:outline-0 text-xs text-white '  value={entry.sm_status ? "true" : "false"} onChange={(e) => {updatedwtw_status(entry.title, e.target.value==='t', entry.date) }}>
                                        <option value=""> </option>
                                        <option value="nowtw">Not for WTW</option>
                                    </select> */}
                                </div>





                                <p className={`w-[15%]  overflow-clip text-sm text-center ${isRegUser ? "" : "hidden"}`}>
                                    <select className='bg-transparent focus:ring-0 focus:outline-0' value={entry.sm_status} onChange={(e) => updatedsmstatus(entry.title, e.target.value, entry.date, entry.id ? entry.id : '00')}>
                                        <option value="">Select</option>
                                        <option value="Working">Working</option>
                                        <option value="No Post">No Post</option>
                                        <option value="Pending Breakdown">Pending Breakdown</option>
                                        <option value="Posted">Posted</option>
                                    </select></p>
                            </div>

                            {/* mobile scree */}
                            <div className={`sm:hidden sm:border-0 border-2 border-gray-200 flex flex-col w-full bg-white rounded-xl p-4 gap-2 mt-2`} onClick={() => { manageeditform(entry) }}>

                                <div className='text-[10px] flex justify-between gap-5'>
                                    <h1 className={` ${entry.sm_status === "Posted" ? "bg-green-200" : entry.sm_status === "Working" ? "bg-orange-200" : entry.sm_status === "No Post" ? "bg-red-200" : entry.sm_status === "Pending Breakdown" ? "bg-yellow-200" : "bg-white"}  rounded-xl p-2 text-left align-middle justify-start `}>{entry.category}</h1>
                                    <h1 className='p-2'>{format(new Date(entry.date), 'dd MMM')}</h1>

                                </div>
                                <div className='text-[12px]'>{entry.title}</div>
                                <div className='text-[10px]'>{entry.mention}</div>




                                {/* <div className='w-full flex justify-between items-center'>
                                    <h1 className='text-sm text-left align-middle justify-start '>{format(new Date(entry.date), 'dd MMM')}</h1>
                                    <h1 className={`text-sm ${entry.sm_status === "Posted" ? "bg-green-200" : entry.sm_status === "Working" ? "bg-orange-200" : entry.sm_status === "No Post" ? "bg-red-200" : entry.sm_status === "Pending Breakdown" ? "bg-yellow-200" : "bg-white"}  rounded-xl p-2 text-left align-middle justify-start `}>{entry.category}</h1>
                                </div> */}

                                {/* <h2 className='w-full cursor-pointer  text-center whitespace-normal break-words  max-h-[100px] overflow-clip  text-sm font-semibold'>{entry.title}</h2>
                                <p className='w-full   text-sm text-center whitespace-normal break-words max-h-[100px] overflow-clip '>Mention: {entry.mention}</p>
                                <div className='w-full flex justify-between items-center'>
                                    <p className='w-[40%]  overflow-clip text-sm text-center'>WTW: <input type='checkbox'></input></p>
                                    <p className='w-[55%]  overflow-clip text-sm text-center'>SM: <select className='bg-transparent focus:ring-0 focus:outline-0' defaultValue={entry.sm_status} onChange={(e) => updatedsmstatus(entry.title, e.target.value)}>
                                        <option value="">Select</option>
                                        <option value="Working">Working</option>
                                        <option value="No Post">No Post</option>
                                        <option value="Pending Breakdown">Pending Breakdown</option>
                                        <option value="Posted">Posted</option>
                                    </select></p>
                                </div> */}
                            </div>



                        </div>





                    ))}


                </div>
                <div className='absolute top-0 right-0 z-15  h-full w-full flex justify-center items-center' style={{ display: isdataformopen ? 'flex' : 'none' }}>
                    <Dataform changeformvisibility={changeformvisibility} showToast={showToast} user={username || 'user not found'} items={entries} />

                </div>


                <div className='absolute top-0 right-0 z-15  h-full w-full flex justify-center items-center' style={{ display: iseditformopen ? 'flex' : 'none' }}>
                    <Editform changeformvisibility={manageeditform} selectedEntry={selectedEntry} showToast={showToast} user={username || 'user not found'} userEmail={user?.email || ""} items={entries} />

                </div>

                {/* ------------------notification------------------------------------------------------------------------------ */}
                <div className={`absolute top-0 right-0 m-4 p-4 rounded-2xl bg-white ${show_notification ? "flex" : "hidden"} border-2 border-blue-300 shadow-2xl flex-col justify-start z-20`}>
                    <h1 className="font-semibold text-gray-700 ">Notification</h1>
                    <div className='w-full flex 0 my-2'>
                        <p>🔔</p>
                        <p className="text-sm text-gray-500">{notification_msg}</p>
                    </div>


                </div>


            </div>



            {/* right container */}
            <Rightcontainer />

        </main>
    )
}

export default Page
