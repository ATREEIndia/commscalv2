import React, { useEffect, useState } from 'react'
import { categorylist, itemprobes, mentionlist, platformlist, taskprobs, useUsers } from '../constants'
import { auth, db, firestore } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { add } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';

type Props = {

    changeformvisibility: () => void | null,
    selectedEntry?: taskprobs | null
    currentwimdow?: string
    useremail?: string
}
const Viewdata = ({ changeformvisibility, selectedEntry, useremail }: Props) => {
    const { users, loading } = useUsers();
    const userlist = users.map(user => user.email);

    

    const [username, setUsername] = useState<string | null>("null");
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUsername(user?.displayName ?? "Login");
        });
        return () => unsubscribe();
    }, []);

    const [mentions, setMentions] = useState<string[]>([]);

    const [assign_to, setAssignTo] = useState<string[]>([]);
    const [mentionstring, setMentionstring] = useState<string>("");
    const [assigned_toString, setassigned_toString] = useState<string>("");

    const [date, setDate] = useState<string>("");
    const [Smdeadline, setSmDeadline] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [smDoc, setSmDoc] = useState<string>("");

    const [url, setUrl] = useState<string>("");
    const [imgUrl, setImgUrl] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [platform, setPlatform] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");
    const [sm_status, SetSMStatus] = useState("")

    const [id, Setid] = useState("")


    const [cnfkey, setcnfkey] = useState<string>("");

    const [iscnfwindowopen, setIscnfwindowopen] = useState(false);

    const smPost=selectedEntry?.linkedSmPostId ;
    const smPostUrl=`https://commscal.atree.org/smcal/${smPost}`;



    useEffect(() => {

        setMentionstring(mentions.join(", "));
        setassigned_toString(assign_to.join(", "));
        //console.log(date);

    }, [mentions, date, title, smDoc, url, imgUrl, description, category, platform, remarks]);

    const add_to_db = ({ date, createdon, title, assigned_to, deadline, description, category, platform, url, img_url, mention, remarks, sm_status }: itemprobes) => {
        const dataRef = ref(db, '/items/' + selectedEntry?.id);
        const newdataRef = push(dataRef);
        update(dataRef, {
            date: date,
            createdon: createdon,
            title: title,
            smdoc: smDoc,
            assigned_to: assigned_to,
            deadline: deadline,
            Description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: img_url,
            mention: mention,
            remarks: remarks,

        })
            .then(() => {
                //console.log('Data added successfully!');
                addToTask({ title, description, url, assigned_to: assign_to, createdon: new Date().toISOString().split('T')[0] })
                clearform();
            })
            .catch((error) => {
                console.error('Error adding data:', error);
            });
    }

    // const processDBpush = () => {
    //     if (date == "" || title == "" || category == "") {
    //         alert("Please fill all the required fields");
    //         return;
    //     }
    //     add_to_db({
    //         date: date,
    //         createdon: new Date().toISOString().split('T')[0],
    //         title: title,
    //         subtitle: smTitle,
    //         assigned_to: assigned_toString,
    //         deadline: Smdeadline,
    //         description: description,
    //         category: category,
    //         platform: platform,
    //         url: url,
    //         img_url: imgUrl,
    //         sm_status: "",
    //         mention: mentionstring,
    //         website_status: false,
    //         remarks: remarks
    //     });
    //     changeformvisibility();

    // }

    const mark_as = (value: string) => {
        if (!selectedEntry?.id) {
            alert("No entry selected");
            return;

        }
        const current_completed_by_list = selectedEntry.completed_by;
        //current_completed_by_list?.push("")
        const dataRef = ref(db, '/items/' + selectedEntry?.id);
        const newdataRef = push(dataRef);
        update(dataRef, {



            sm_status: value,


        })
            .then(() => {
                //console.log('Data added successfully!');
                clearform();
                updatetask(title, value, selectedEntry?.id || "")

                changeformvisibility();


            })
            .catch((error) => {
                console.error('Error adding data:', error);
            });



    }

    const updatetask = async (title: string, current_status: string, id: string) => {
        console.log("assigned to 0= " + selectedEntry?.linkedSmPostId)
        console.log("completed by 0= " + selectedEntry?.completed_by?.length);

        try {
            let userdocref = doc(firestore, "tasks", title);
           
            const snapshot = await getDoc(userdocref);

            if (snapshot.exists()) {
                console.log("Document exists:", snapshot.data());
                
            } else {
                console.log("Document does not exist.");
                 userdocref = doc(firestore, "tasks", id);
            }



            if (current_status === "Posted") {
                await updateDoc(userdocref, {
                    title: title,

                    current_status: current_status,
                    completed_by: arrayUnion(useremail),


                });


                alert("Task added successfully!");
                console.log("assigned to= " + selectedEntry?.assigned_to)
                console.log("complted by= " + selectedEntry?.completed_by)
                if ((selectedEntry?.assigned_to?.length ?? 0) === ((selectedEntry?.completed_by?.length ?? 0) + 1)) {
                    updatedsmstatus(title, current_status, selectedEntry?.date ?? "");
                    return;

                }


                return;

            }

            await updateDoc(userdocref, {
                title: title,

                current_status: current_status,
                completed_by: arrayRemove(useremail),


            });
            //alert("Task added successfully!");
            if(current_status==='Posted'){
               await updateSmcal(selectedEntry?.id || "")
            }

            

            updatedsmstatus(title, current_status, selectedEntry?.date ?? "");








        } catch (error) {
            alert("Error: " + error);
            console.error(error);
        }

    }

    const updateSmcal= async(id:string)=>{
       // await updateDoc(doc(firestore, 'posts', id), { status:"Posted" })


    }


    const addToTask = ({ title, description, url, assigned_to }: taskprobs) => {
        try {
            const taskref = doc(firestore, "tasks", title);

            setDoc(taskref, {

                date: date,
                createdon: new Date().toISOString().split('T')[0],
                title: title,
                smdoc: smDoc,
                assigned_to: assigned_to,
                deadline: Smdeadline,
                description: description,
                category: category,
                platform: platform,
                url: url,
                img_url: imgUrl,
                mention: mentionstring,
                website_status: false,
                remarks: remarks,


                completed_by: [],
                current_status: "Not Started",

            }).then(() => {
                //console.log('Task added successfully!');
            }
            )

        } catch (error) { }
    }

    const clearform = () => {
        setDate("");
        setTitle("");
        setSmDoc("");
        setUrl("");
        setImgUrl("");
        setDescription("");
        setCategory("");
        setPlatform("");
        setRemarks("");
        setMentions([]);


    }



    const deleteentry = () => {


        if (!selectedEntry?.id) {
            alert("No entry selected");
            return;
        }
        const dataRef = ref(db, '/items/' + selectedEntry.id);
        set(dataRef, null)
            .then(() => {
                alert('Data deleted successfully!');
                clearform();
                changeformvisibility();
                //log entry can be added here
            })
            .catch((error) => {
                console.error('Error deleting data:', error);
            });
    }


    useEffect(() => {
        if (selectedEntry) {
            setDate(selectedEntry.date ? selectedEntry.date : "");
            setTitle(selectedEntry.title ? selectedEntry.title : "");
            setSmDoc(selectedEntry.smdoc ? selectedEntry.smdoc : "");
            setUrl(selectedEntry.url ? selectedEntry.url : "");
            setImgUrl(selectedEntry.img_url ? selectedEntry.img_url : "");
            setDescription(selectedEntry.description ? selectedEntry.description : "");
            setCategory(selectedEntry.category ? selectedEntry.category : "");
            setPlatform(selectedEntry.platform ? selectedEntry.platform : "");
            setRemarks(selectedEntry.remarks ? selectedEntry.remarks : "");
            SetSMStatus(selectedEntry?.current_status ? selectedEntry.current_status : "");

            Setid(selectedEntry?.id ? selectedEntry.id : "");

            setSmDeadline(selectedEntry.deadline ? selectedEntry.deadline : "");

            if (selectedEntry.mention) {
                const mentionArray = selectedEntry.mention.split(",").map(item => item.trim());
                setMentions(mentionArray);
            }
            if (selectedEntry.assigned_to) {
                // const assignToArray = selectedEntry.assigned_to.split(",").map(item => item.trim());
                setAssignTo(selectedEntry.assigned_to);
            }
        }
    }, [selectedEntry]);

    const updatedsmstatus = async (title: string, status: string, date: string) => {
        console.log("upadting sm = " + status)
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



                    })
                    .catch((error) => {
                        console.error('Error updating sm_status:', error);
                    });
            });
        }
        updateSheet(date, title, status);



    }
    const updateSheet = (date: string, title: string, current_status: string) => {
        //console.log("updating sheet for posted")
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
                alert("Resp:" + response);
            })
            .catch(error => {

                
                // alert("Error:" + error);
            });

    }

    const delete_task = async () => {
        const userdocref = doc(firestore, "tasks", title);
        const userdocref0 = doc(firestore, "tasks", id);



        const docSnap = await getDoc(userdocref);
        if (docSnap.exists()) {
            await deleteDoc(userdocref);
        }

        const docSnap0 = await getDoc(userdocref0);
        if (docSnap0.exists()) {
            await deleteDoc(userdocref0);
        }

        changeformvisibility();
    }



    return (
        <div className='w-full h-screen relative flex justify-center items-center ' >
            <div className='absolute top-0 left-0 bg-black opacity-15 w-full h-full' onClick={changeformvisibility}></div>

            <div className='absolute w-[90%] max-h-[80%] p-4 flex flex-col z-30 bg-white rounded-lg shadow-lg m-4 overflow-y-scroll ' >
                <h1 className='w-full text-xl font-semibold text-gray-700'>View Item</h1>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Date</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='date' onChange={(e) => { setDate(e.target.value) }} value={date}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Title</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setTitle(e.target.value) }} value={title}></input>
                </div>

                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>
                        <label className='text-sm font-medium text-gray-600 px-2' ><a className={`${smDoc.includes("http") ? "flex" : "hidden"}`} href={smDoc} target="_blank">SM Correcton Doc 🔗</a>
                            <p className={`${smDoc.includes("http") ? "hidden" : "flex"}`}>SM Correcton Doc</p></label>
                        <input className={`p-2 border-2 border-gray-100 rounded-xl shadow text-sm`} type='text' onChange={(e) => { setSmDoc(e.target.value) }} value={smDoc}></input>



                    </div>

                    {/* <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Assign to</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='assign' onChange={(e) => { setassign_to(e.target.value) }} value={assigned_to}>
                        </input>
                        <datalist id='assign'>
                            {userlist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist>
                    </div> */}

                    <div className='w-full flex flex-col '>
                        <label className='text-sm font-medium text-gray-600 px-2'>Deadline</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm text-red-600 ' type='date' onChange={(e) => { setSmDeadline(e.target.value) }} value={Smdeadline}></input>
                    </div>

                </div>
                <div className='text-xs p-2'>
                    <h1 >SM: {sm_status}</h1>

                </div>

                {smPost && (
                    <div className="w-full border-t border-gray-100 pt-2 mt-2 mb-3
                        flex flex-col sm:flex-row sm:items-center gap-2">

                        {/* Icon + URL text */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-blue-500 text-sm flex-shrink-0">📱</span>
                            <span className="text-xs font-medium text-gray-700 flex-shrink-0">SM Post:</span>
                            <a
                                href={smPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline truncate"
                                title={smPostUrl}
                            >
                                {smPostUrl}
                            </a>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            <a
                                href={smPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700
                                    border border-blue-200 rounded-lg px-2.5 py-1 flex items-center gap-1"
                            >
                                🔗 View SM Post
                            </a>
                           
                        </div>
                    </div>
                )}

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Assigned to</label>
                    {/* <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='assign' onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== "") {
                            if (!assign_to.includes(e.currentTarget.value.trim())) {
                                setAssignTo([...assign_to, e.currentTarget.value.trim()]);
                                e.currentTarget.value = "";
                            } else {
                                e.currentTarget.value = "";
                            }
                        }
                    }}  >
                    </input>
                    <datalist id='assign'>
                        {userlist.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </datalist> */}
                    <div className={`text-xs text-gray-500 px-2 flex gap-2 mt-4 flex-wrap `}>
                        {assign_to.map((item, index) => (
                            <div className={`border-2 p-2 flex gap-2 rounded-2xl ${selectedEntry?.completed_by?.includes(item) ? "bg-green-200" : ""} `} key={index}>
                                <div>{item}</div>
                                {/* <div className='cursor-pointer' onClick={() => setAssignTo(assign_to.filter((_, i) => i !== index))}
                                >x</div> */}
                            </div>
                        ))}
                    </div>


                </div>



                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2' ><a className={`${url.includes("http") ? "flex" : "hidden"}`} href={url} target="_blank">URL 🔗</a> <p className={`${url.includes("http") ? "hidden" : "flex"}`}>URL</p></label>
                        <input className={`p-2 border-2 border-gray-100 rounded-xl shadow text-sm`} type='text' onChange={(e) => { setUrl(e.target.value) }} value={url}></input>
                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Image URL</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setImgUrl(e.target.value) }} value={imgUrl}></input>
                    </div>

                </div>


                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Description</label>
                    <textarea className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setDescription(e.target.value) }} value={description} ></textarea>
                </div>


                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Category</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='category' onChange={(e) => { setCategory(e.target.value) }} value={category}>
                        </input>
                        {/* <datalist id='category'>
                            {categorylist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist> */}

                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Platform</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='platform' onChange={(e) => { setPlatform(e.target.value) }} value={platform}>
                        </input>
                        <datalist id='platform'>
                            {platformlist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist>
                    </div>

                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Mentions</label>
                    {/* <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='mentions' onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== "") {
                            if (!mentions.includes(e.currentTarget.value.trim())) {
                                setMentions([...mentions, e.currentTarget.value.trim()]);
                                e.currentTarget.value = "";
                            } else {
                                e.currentTarget.value = "";
                            }
                        }
                    }}  >
                    </input>
                    <datalist id='mentions'>
                        {mentionlist.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </datalist> */}
                    <div className='text-xs text-gray-500 px-2 flex gap-2 mt-4 flex-wrap'>
                        {mentions.map((item, index) => (
                            <div className='border-2 p-2 flex gap-2 rounded-2xl' key={index}>
                                <div>{item}</div>
                                <div className='cursor-pointer' onClick={() => setMentions(mentions.filter((_, i) => i !== index))}
                                >x</div>
                            </div>
                        ))}
                    </div>


                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Remarks</label>
                    <textarea className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setRemarks(e.target.value) }} value={remarks}></textarea>
                </div>


                <div className={`w-full ${useremail?.length ? 'flex' : 'hidden'} flex-col justify-center gap-4 py-1 mt-4  sm:flex-row`}>
                    <div className='px-4 py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform(); changeformvisibility(); }}>Cancel</div>

                    {/* <div className='px-4 py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { mark_as("Working") }}>Mark as Pending</div> */}

                    {/* <div className='px-4 py-2 border-2 border-green-300 shadow hover:bg-green-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { mark_as('Posted') }}>Mark as Completed</div> */}

                    <a href={smPostUrl} target='_blank' className='px-4 py-2 border-2 border-green-300 shadow hover:bg-green-500 hover:text-white rounded-2xl cursor-pointer text-center' >Mark as Posted</a>

                    {/* <div className='px-4 py-2 border-2 border-red-500 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { delete_task() }}>Delete Task</div> */}
                </div>




            </div>

            {/* <div className={`absolute top-0 left-0 w-full border-2 h-full justify-center  z-40 ${iscnfwindowopen ? 'flex' : 'hidden'}`}>
                <div className='bg-black absolute top-0 right-0 w-full h-full z-41 opacity-35'></div>
                <div className='bg-white p-4 absolute top-1/2 left-1/2 m-4 rounded-lg shadow-lg z-50 flex flex-col gap-4 -translate-x-1/2 -translate-y-1/2'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Enter your key</label>
                    <p className='text-sm'> {username}, heads up for your permission on changing the database. This will be refected in the logs. write delete and click on confirm</p>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm text-red-400' type='text' onChange={(e) => { setcnfkey(e.target.value) }} value={cnfkey}></input>
                    <div className='w-full p-4 flex flex-row gap-4 justify-between'>
                        <div className='px-4 text-center py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { setIscnfwindowopen(false) }}>Cancel</div>

                        <div className='px-4 text-center py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { verifykey() }}>confirm</div>
                    </div>

                </div>
            </div> */}

        </div>
    )
}

export default Viewdata