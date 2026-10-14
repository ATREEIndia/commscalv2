import React, { useEffect, useState } from 'react'
import { categorylist, itemprobes, mentionlist, platformlist, taskprobs, useUsers } from '../constants'
import { auth, db, firestore } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { add } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import FormattedTextarea from './FormattedTextarea';

type Props = {

    changeformvisibility: () => void | null,
    selectedEntry?: itemprobes | null
}

const Taskform = ({ changeformvisibility, selectedEntry }: Props) => {
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

    const[sm_status, SetSMStatus]=useState("working")


    const [cnfkey, setcnfkey] = useState<string>("");

    const [iscnfwindowopen, setIscnfwindowopen] = useState(false);



    useEffect(() => {

        setMentionstring(mentions.join(", "));
        setassigned_toString(assign_to.join(", "));
       
        //console.log(date);

    }, [mentions,assign_to, date, title, smDoc, url, imgUrl, description, category, platform, remarks]);

    const processtask=()=>{
         addToTask({ title, description, url, assigned_to: assign_to, createdon: new Date().toISOString().split('T')[0] })
         clearform();
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
    //         smdoc: smDoc,
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

    const addToTask = ({ title, description, url, assigned_to }: taskprobs) => {
        try {
            const taskref = doc(firestore, "tasks", title);

            setDoc(taskref, {

                date: date,
                createdon: new Date().toISOString().split('T')[0],
                title: title,
                
                assigned_to: assigned_to,
                deadline: Smdeadline,
                description: description,
                
               
                url: url,
               
                
                website_status: false,
                remarks: remarks,         
                
                             
                completed_by: [],
                current_status: sm_status,               
               
            }).then(() => {
                //console.log('Task added successfully!');
            }
            )

        } catch (error) { alert("Error adding task:"+ error);}
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
        setSmDeadline("");
        setAssignTo([]);
        changeformvisibility();


    }

    const verifykey = () => {
        //dummy verification
        if (cnfkey === "delete") {
            deleteentry();
            setcnfkey("");
            setIscnfwindowopen(false);
        }
        else {
            alert("Invalid key");
        }



    }


    //    

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

            //console.log("Selected entry data=");

            setDate(selectedEntry.date ? selectedEntry.date : "");
            setTitle(selectedEntry.title ? selectedEntry.title : "");
            setSmDoc(selectedEntry.smdoc ? selectedEntry.smdoc : "");
            setUrl(selectedEntry.url ? selectedEntry.url : "");
            setImgUrl(selectedEntry.img_url ? selectedEntry.img_url : "");
            setDescription(selectedEntry.description ? selectedEntry.description : "");
            setCategory(selectedEntry.category ? selectedEntry.category : "");
            setPlatform(selectedEntry.platform ? selectedEntry.platform : "");
            setRemarks(selectedEntry.remarks ? selectedEntry.remarks : "");
            SetSMStatus(selectedEntry?.sm_status? selectedEntry.sm_status:"");
            
            setSmDeadline(selectedEntry.deadline ? selectedEntry.deadline : "");

            if (selectedEntry.mention) {
                const mentionArray = selectedEntry.mention.split(",").map(item => item.trim());
                setMentions(mentionArray);
            }
            if (selectedEntry.assigned_to) {
                const assignToArray = selectedEntry.assigned_to.split(",").map(item => item.trim());
                setAssignTo(assignToArray);
            }
        }
    }, [selectedEntry]);


    



    return (
        <div className='w-full h-screen relative flex justify-center  ' >
            <div className='absolute top-0 left-0 bg-black opacity-15 w-full h-full' onClick={changeformvisibility}></div>

            <div className='absolute w-[90%] max-h-[80%] p-4 flex flex-col z-30 bg-white rounded-lg shadow-lg m-4 overflow-y-scroll ' >
                <h1 className='w-full text-xl font-semibold text-gray-700'>Assign New Task</h1>

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

                        <label className='text-sm font-medium text-gray-600 px-2'>URL</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setUrl(e.target.value) }} value={url}></input>
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
                        <label className='text-sm font-medium text-gray-600 px-2'>Dead line</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm text-red-600 ' type='date' onChange={(e) => { setSmDeadline(e.target.value) }} value={Smdeadline}></input>
                    </div>

                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Assign to</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='assign' onKeyDown={(e) => {
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
                    </datalist>
                    <div className='text-xs text-gray-500 px-2 flex gap-2 mt-4 flex-wrap'>
                        {assign_to.map((item, index) => (
                            <div className='border-2 p-2 flex gap-2 rounded-2xl' key={index}>
                                <div>{item}</div>
                                <div className='cursor-pointer' onClick={() => setAssignTo(assign_to.filter((_, i) => i !== index))}
                                >x</div>
                            </div>
                        ))}
                    </div>


                </div>


                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Description</label>
                    <FormattedTextarea className='w-full p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={setDescription} value={description} />
                </div>


                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Remarks</label>
                    <textarea className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setRemarks(e.target.value) }} value={remarks}></textarea>
                </div>


                <div className='w-full flex flex-col justify-center gap-4 py-1 mt-4  sm:flex-row'>
                    <div className='px-4 py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform(); changeformvisibility(); }}>Cancel</div>

                    <div className='px-4 py-2 border-2 border-blue-300 shadow hover:bg-blue-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { processtask() }}>Submit</div>

                    
                </div>




            </div>

            <div className={`absolute top-0 left-0 w-full border-2 h-full justify-center  z-40 ${iscnfwindowopen ? 'flex' : 'hidden'}`}>
                <div className='bg-black absolute top-0 right-0 w-full h-full z-41 opacity-35'></div>
                <div className='bg-white p-4 absolute top-1/2 left-1/2 m-4 rounded-lg shadow-lg z-50 flex flex-col gap-4 -translate-x-1/2 -translate-y-1/2'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Enter your key</label>
                    <p className='text-sm'> {username}, heads up for your permission on changing the database. This will be refected in the logs. write delete and click on confirm</p>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm text-red-400' type='text' onChange={(e) => { setcnfkey(e.target.value) }} value={cnfkey}></input>
                    <div className='w-full p-4 flex flex-row gap-4 justify-between'>
                        <div className='px-4 text-center py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { setIscnfwindowopen(false) }}>Cancel</div>

                        <div className='px-4 text-center py-2 border-2 border-blue-300 shadow hover:bg-blue-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { verifykey() }}>confirm</div>
                    </div>

                </div>
            </div>

        </div>
    )
}

export default Taskform
