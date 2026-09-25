import React, { useEffect, useMemo, useState } from 'react'
import { categorylist, buildTagSuggestions, delete_sheet_row_url, itemprobes, mentionlist, platformlist, sheetupdateurl, taskprobs, useUsers } from '../constants'
import { auth, db, firestore } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { add, format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { submitToSheet } from '../Posttosheet';
import { UserMyAppContext } from '../Context/MyAppContext';
import TagInput from './TagInput';

type Props = {

    user?: string,
    userEmail?: string,

    changeformvisibility: () => void | null,
    selectedEntry?: itemprobes | null
    showToast?: (message: string) => void
    items?: itemprobes[]
}

function formatTimestamp(ms: number): string {
    return new Date(ms).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
    });
}

const Editform = ({ changeformvisibility, selectedEntry, showToast, user, userEmail = "", items = [] }: Props) => {
    const { users, loading } = useUsers();
    const userlist = users.map(user => user.email);

    const { isRegUser, role } = UserMyAppContext()

    const [username, setUsername] = useState<string | null>("null");
    useEffect(() => {
        clearform();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUsername(user?.displayName ?? "Login");
        });
        return () => unsubscribe();
    }, []);

    const [entryid, Setentryid] = useState('')

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
    const [wtw_status, SetWTWStatus] = useState(false)


    const [cnfkey, setcnfkey] = useState<string>("");

    const [iscnfwindowopen, setIscnfwindowopen] = useState(false);

    const [title_error, setTitle_error] = useState<boolean>(false);
    const [date_error, setDate_error] = useState<boolean>(false);
    const [categorry_error, setCategory_error] = useState<boolean>(false);
    const [deadline_error, setDeadline_error] = useState<boolean>(false);
    const [url_error, seturl_error] = useState<boolean>(false);
    const [isshowcopy, setIsshowcopy] = useState<boolean>(false);

    const [click, setClick] = useState<boolean>(false);

    const [copyStatus, setCopyStatus] = useState('');

    const smPostUrl = selectedEntry?.smPostId
        ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/smcal/${selectedEntry.smPostId}`
        : null;

    const [tags, setTags] = useState<string[]>(selectedEntry?.tags ?? []);

    const tagSuggestions = useMemo(() => buildTagSuggestions(items), [items]);



    useEffect(() => {

        setMentionstring(mentions.join(", "));
        setassigned_toString(assign_to.join(", "));

        //console.log(date);

    }, [mentions, assign_to, date, title, smDoc, url, imgUrl, description, category, platform, remarks]);

    const add_to_db = ({ date, createdon, title, assigned_to, deadline, description, category, platform, url, img_url, mention, remarks, sm_status, tags }: itemprobes) => {
        const dataRef = ref(db, '/items/' + selectedEntry?.id);
        const newdataRef = push(dataRef);

        const currentUserEmail = auth.currentUser?.email ?? "";
        const isDifferentUser = !!selectedEntry?.addedBy && currentUserEmail !== selectedEntry.addedBy;



        console.log("sm== " + sm_status)
        const updatePayload: Record<string, any> = {
            date: date,
            createdon: createdon,
            title: title,
            smdoc: smDoc,
            assigned_to: assigned_to,
            deadline: deadline,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: img_url,
            mention: mention,
            remarks: remarks,
            sm_status: sm_status,
            tags: tags,
        };

        // Self-edits by the original creator aren't tracked as updates.
        // Legacy entries with no addedBy are always attributed to the editor.
        if (isDifferentUser || !selectedEntry?.addedBy) {
            updatePayload.updatedBy = currentUserEmail;
            updatePayload.updatedAt = Date.now();
        }

        update(dataRef, updatePayload)
            .then(() => {
                //console.log('Data added successfully!');
                addToTask({ title, description, url, assigned_to: assign_to, createdon: new Date().toISOString().split('T')[0] })
                // clearform();

            })
            .catch((error) => {
                console.error('Error adding data:', error);
            });
    }

    const processDBpush = () => {

        if (!date) {
            setDate_error(true);
        } else { setDate_error(false); }

        if (!title) {
            setTitle_error(true);
        } else { setTitle_error(false); }

        if (!category) {
            setCategory_error(true);
        } else { setCategory_error(false); }

        if (!Smdeadline && assign_to.length > 0) {
            setDeadline_error(true);
        } else { setDeadline_error(false); }

        if (Smdeadline < date && assign_to.length > 0) {
            alert("Deadline is not valid");
            return;
        }
        if (url == "") {
            seturl_error(true);
        }
        else {
            seturl_error(false);
        }




        if (date == "" || title == "" || category == "" || (assign_to.length > 0 && Smdeadline == "") || url == "") {
            alert("Please fill all the required fields");
            return;
        }

        if (!categorylist.includes(category)) {
            alert('Please pick a valid category from the dropdown (legacy values are no longer supported)');
            return;
        }
        if (tags.length < 2) {
            alert('Please add at least 2 tags');
            return;
        }
        if (tags.length > 5) {
            alert('Maximum 5 tags allowed');
            return;
        }

        callsheetque(
            "replace"

        );




        let customsm_status = sm_status;

        if (sm_status.length < 1 && assigned_toString.length > 0) {
            customsm_status = 'Working'
        }

        if (sm_status.length > 1 && assigned_toString.length < 1) {
            customsm_status = ''
        }




        add_to_db({
            date: date,
            createdon: new Date().toISOString().split('T')[0],
            title: title,
            smdoc: smDoc,
            assigned_to: assigned_toString,
            deadline: Smdeadline,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: imgUrl,
            sm_status: customsm_status,
            mention: mentionstring,
            website_status: false,
            remarks: remarks,
            tags: tags,
        });
        update_Sheet(date, title, sm_status);

        changeformvisibility();
        setClick(!click);

    }



    const addToTask = ({ title, description, url, assigned_to }: taskprobs) => {




        try {
            const uid = selectedEntry?.id || ""
            const taskref = doc(firestore, "tasks", uid);


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
                id: selectedEntry?.id,

                completed_by: [],
                current_status: sm_status,

            }).then(() => {
                //console.log('Task added successfully!');
            }
            )

        } catch (error) { }
    }

    const update_Sheet = (date: string, title: string, current_status: string) => {
        const base = sheetupdateurl

        const formattedDate = format(date, 'MMM yy'); //date as month year
        const formated_date = date.split("-").reverse().join("/"); //data date
        const params = {
            date: formated_date,
            title: title,
            smdoc: smDoc,
            desc: description,
            cat: category,
            platform: platform,
            url: url,
            img_url: imgUrl,
            mention: mentionstring,
            remarks: remarks,
            smstatus: sm_status,
            assignto: assign_to.join(", "),
            wtw: wtw_status
        }
        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');

        const fullUrl = `${base}?${query}`;

        console.log("Full URL:", fullUrl);


        fetch(fullUrl).
            then(res => res.text())
            .then(response => {

                showToast ? showToast("Sheet updated successfully") : ""
                //alert("Resp:" + response);
            })
            .catch(error => {
                alert("Error:" + error);
            });
        //     const res = await fetch(sheetupdateurl, {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json",
        //         },
        //         body: JSON.stringify(params),
        //     });

        //     if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        //     const text = await res.text();
        //     alert("Resp: " + text);
        // } 
        setClick(!click);
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
        setAssignTo([]);
        setTags([]);


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
    const deleteentry = async () => {
        if (!selectedEntry?.id) {
            alert("No entry selected");
            return;
        }

        const dataRef = ref(db, '/items/' + selectedEntry.id);

        try {
            // Delete from Realtime Database first
            await set(dataRef, null);

            // Delete linked task from Firestore (by title — primary link)
            try {
                const taskByTitleRef = doc(firestore, 'tasks', selectedEntry.title);
                const titleSnap = await getDoc(taskByTitleRef);
                if (titleSnap.exists()) {
                    await deleteDoc(taskByTitleRef);
                }
            } catch (err) {
                console.error('Failed to delete task by title:', err);
            }

            // Also try by id (secondary link, matches updatetask pattern)
            try {
                const taskByIdRef = doc(firestore, 'tasks', selectedEntry.id);
                const idSnap = await getDoc(taskByIdRef);
                if (idSnap.exists()) {
                    await deleteDoc(taskByIdRef);
                }
            } catch (err) {
                console.error('Failed to delete task by id:', err);
            }

            // Existing cleanup
            delete_from_sheet(selectedEntry.title);
            clearform();
            changeformvisibility();
            //log entry can be added here
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('Failed to delete entry. Please try again.');
        }
    }

    const deleteentry0 = () => {


        if (!selectedEntry?.id) {
            alert("No entry selected");
            return;
        }
        const dataRef = ref(db, '/items/' + selectedEntry.id);
        set(dataRef, null)
            .then(() => {
                // alert('Data deleted successfully!');
                delete_from_sheet(selectedEntry.title);
                clearform();
                changeformvisibility();
                //log entry can be added here
            })
            .catch((error) => {
                console.error('Error deleting data:', error);
            });
    }

    const delete_from_sheet = (title: string) => {
        const base = delete_sheet_row_url;
        const formattedDate = format(date, 'MMM yy');
        const params = {
            search: title,
            sheetname: formattedDate,
            user: username
        };
        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');
        const fullUrl = `${base}?${query}`;
        fetch(fullUrl)
            .then(res => res.text())
            .then(response => {
                // alert("Resp:" + response);
            })
            .catch(error => {
                // alert("Error:" + error);
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
            SetSMStatus(selectedEntry?.sm_status ? selectedEntry.sm_status : "");
            SetWTWStatus(selectedEntry?.wtw_status ? selectedEntry.wtw_status : false);

            setSmDeadline(selectedEntry.deadline ? selectedEntry.deadline : "");
            setTags(selectedEntry.tags ?? []);

            if (selectedEntry.mention) {
                const mentionArray = selectedEntry.mention.split(",").map(item => item.trim());
                setMentions(mentionArray);
            } else {
                setMentions([]);
            }
            if (selectedEntry.assigned_to) {

                const assignToArray = selectedEntry.assigned_to.split(",").map(item => item.trim());
                setAssignTo(assignToArray);



            } else {
                setAssignTo([]);

            }


        }
    }, [selectedEntry, click]);

    const copy_mentions_clipboard = (mentionstring: string) => {
        navigator.clipboard.writeText(mentionstring).then(() => {
            //alert("Mentions copied to clipboard");
            setIsshowcopy(true);
            setTimeout(() => {
                setIsshowcopy(false);
            }, 2000);
        }).catch((err) => {
            alert("Failed to copy mentions: " + err);
        });
    }


    const callsheetque = (action: string) => {
        console.log('caling sheet que')
        const formated_date = date.split("-").reverse().join("/");
        submitToSheet({

            timestamp: new Date().toString().split('GMT')[0],
            action: action,
            date: formated_date,
            category: category,
            title: title,
            platform: platform,
            url: url,
            description: description,
            mention: mentionstring,
            img_url: imgUrl,
            wtw: wtw_status.toString(),
            website: '',
            remarks: remarks,
            sm_status: sm_status,
            assigned_to: assign_to.join(", "),
            req_by: user || '',
        });

    }



    return (
        <div className='w-full h-screen relative flex justify-center  ' >
            <div className='absolute top-0 left-0 bg-black opacity-15 w-full h-full' onClick={changeformvisibility}></div>

            <div className='absolute w-[90%] max-h-[80%] p-4 flex flex-col z-30 bg-white rounded-lg shadow-lg m-4 overflow-y-scroll ' >
                <h1 className='w-full text-xl font-semibold text-gray-700'>Edit Item </h1>

                {(selectedEntry?.addedBy || selectedEntry?.updatedBy) && (
                    <div className="w-full text-xs text-gray-500 border-b border-gray-100 pb-2 mb-3 flex flex-col gap-1">
                        {selectedEntry?.addedBy && (
                            <div>
                                <span className="font-medium">Added by:</span> {selectedEntry.addedBy.split('@')[0]}
                                {selectedEntry?.addedAt && (
                                    <span className="ml-1 text-gray-400">
                                        on {formatTimestamp(selectedEntry.addedAt)}
                                    </span>
                                )}
                            </div>
                        )}
                        {selectedEntry?.updatedBy && (
                            <div>
                                <span className="font-medium">Last updated by:</span> {selectedEntry.updatedBy.split('@')[0]}
                                {selectedEntry?.updatedAt && (
                                    <span className="ml-1 text-gray-400">
                                        on {formatTimestamp(selectedEntry.updatedAt)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}



                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Date</label>
                    <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className={`  p-2 border-2  ${date_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`} type='date' onChange={(e) => { setDate(e.target.value) }} value={date}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Title</label>
                    <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className={`p-2 border-2  ${title_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`} type='text' onChange={(e) => { setTitle(e.target.value) }} value={title}></input>
                </div>

                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>SM Correction Doc URL</label>
                        <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setSmDoc(e.target.value) }} value={smDoc}></input>

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

                    <div className={`w-full   ${isRegUser ? "flex flex-col" : "hidden"} `}>
                        <label className='text-sm font-medium text-gray-600 px-2'>Dead line</label>
                        <input className={`p-2 border-2  ${deadline_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm text-red-600 `} type='date' onChange={(e) => { setSmDeadline(e.target.value) }} value={Smdeadline}></input>
                    </div>

                </div>

                {smPostUrl && (
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
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                        await navigator.clipboard.writeText(smPostUrl);
                                        setCopyStatus('Copied!');
                                        setTimeout(() => setCopyStatus(''), 2000);
                                    } catch {
                                        setCopyStatus('Failed to copy');
                                        setTimeout(() => setCopyStatus(''), 2000);
                                    }
                                }}
                                className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700
                                    border border-gray-200 rounded-lg px-2.5 py-1 flex items-center gap-1"
                            >
                                📋 {copyStatus || 'Copy'}
                            </button>
                        </div>
                    </div>
                )}



                <div className='text-xs p-2'>
                    <h1 >SM Status: {sm_status}</h1>

                </div>

                <div className={`text-xs text-red-800 p-2 ${isRegUser ? "hidden" : "flex"}`}>
                    <h1 >Deadline: {Smdeadline}</h1>

                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Assign to</label>
                    <input className={`p-2 border-2 border-gray-100 rounded-xl shadow text-sm ${isRegUser && role === "admin" ? "" : "hidden"}`} type='text' list='assign' onKeyDown={(e) => {
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



                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2' ><a className={`${url.includes("http") ? "flex" : "hidden"}`} href={url} target="_blank">URL 🔗</a> <p className={`${url.includes("http") ? "hidden" : "flex"}`}>URL</p></label>
                        <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className={`p-2 border-2 ${url_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`} type='text' onChange={(e) => { setUrl(e.target.value) }} value={url}></input>
                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Image URL</label>
                        <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setImgUrl(e.target.value) }} value={imgUrl}></input>
                    </div>

                </div>


                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Description</label>
                    <textarea disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setDescription(e.target.value) }} value={description} ></textarea>
                </div>


                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Category</label>
                        <select disabled={!isRegUser && selectedEntry?.addedBy != userEmail}
                            className={`p-2 border-2 ${categorry_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`}
                            value={category}
                            onChange={(e) => { setCategory(e.target.value) }}
                        >
                            <option value="">Select category…</option>
                            {category && !categorylist.includes(category) && (
                                <option value={category} className="italic">{category} (legacy — please pick a new value)</option>
                            )}
                            {categorylist.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Platform</label>
                        <input disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='platform' onChange={(e) => { setPlatform(e.target.value) }} value={platform}>
                        </input>
                        <datalist id='platform'>
                            {platformlist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist>
                    </div>

                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Tags</label>
                    <TagInput
                        disabeled={!isRegUser && selectedEntry?.addedBy != userEmail}
                        value={tags}
                        onChange={setTags}
                        suggestions={tagSuggestions}
                        maxTags={5}
                        minTags={2}
                    />
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <div className='flex flex-row gap-4 items-center'>
                        <label className='text-sm font-medium text-gray-600 px-2 cursor-copy' onClick={() => { copy_mentions_clipboard(mentionstring) }}>Mentions ⧉ </label>
                        <div className={`${isshowcopy ? "flex" : "hidden"} text-sm text-green-700`}>Copied</div>
                    </div>

                    {/* <input disabled={!isRegUser && selectedEntry?.addedBy!=userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='mentions' onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',' ) && e.currentTarget.value.trim() !== "") {
                            if (!mentions.includes(e.currentTarget.value.trim())) {
                                setMentions([...mentions, e.currentTarget.value.trim()]);
                                e.currentTarget.value = "";
                            } else {
                                e.currentTarget.value = "";
                            }
                        }
                    }}  >
                    </input> */}

                    <input
                        disabled={!isRegUser && selectedEntry?.addedBy != userEmail}
                        className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm'
                        type='text'
                        list='mentions'
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ',') && e.currentTarget.value.trim() !== "") {
                                e.preventDefault();
                                if (!mentions.includes(e.currentTarget.value.trim())) {
                                    setMentions([...mentions, e.currentTarget.value.trim()]);
                                }
                                e.currentTarget.value = "";
                            }
                        }}
                        onBlur={(e) => {
                            const value = e.currentTarget.value.trim();
                            if (value !== "" && !mentions.includes(value)) {
                                setMentions([...mentions, value]);
                            }
                            e.currentTarget.value = "";
                        }}
                    />



                    <datalist id='mentions'>
                        {mentionlist.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </datalist>
                    <div className='text-xs text-gray-500 px-2 flex gap-2 mt-4 flex-wrap'>
                        {mentions.map((item, index) => (
                            <div className='border-2 p-2 flex gap-2 rounded-2xl' key={index}>
                                <div>{item}</div>
                                <div className='cursor-pointer' onClick={() => { if (!isRegUser && selectedEntry?.addedBy != userEmail) { return } setMentions(mentions.filter((_, i) => i !== index)) }}
                                >x</div>
                            </div>
                        ))}
                    </div>


                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Remarks</label>
                    <textarea disabled={!isRegUser && selectedEntry?.addedBy != userEmail} className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setRemarks(e.target.value) }} value={remarks}></textarea>
                </div>


                <div className={`w-full flex flex-col justify-center gap-4 py-1 mt-4  sm:flex-row ${isRegUser || selectedEntry?.addedBy === userEmail ? "flex" : "hidden"}`}>
                    <div className='px-4 py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { changeformvisibility(); }}>Cancel</div>

                    <div className='px-4 py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { setIscnfwindowopen(true) }}>Delete</div>

                    <div className='px-4 py-2 border-2 border-green-300 shadow hover:bg-green-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { processDBpush() }}>Update</div>
                </div>




            </div>

            <div className={`absolute top-0 left-0 w-full border-2 h-full justify-center  z-40 ${iscnfwindowopen ? 'flex' : 'hidden'}`}>
                <div className='bg-black absolute top-0 right-0 w-full h-full z-41 opacity-35'></div>
                <div className='bg-white p-4 absolute top-1/2 left-1/2 m-4 rounded-lg shadow-lg z-50 flex flex-col gap-4 -translate-x-1/2 -translate-y-1/2'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Enter your key</label>
                    <p className='text-sm'>
                        {username}, heads up for your permission on changing the database. The data will be deleted permanently. Write &apos;delete&apos; and click on confirm.
                    </p>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm text-red-400' type='text' onChange={(e) => { setcnfkey(e.target.value) }} value={cnfkey}></input>
                    <div className='w-full p-4 flex flex-row gap-4 justify-between'>
                        <div className='px-4 text-center py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { setIscnfwindowopen(false) }}>Cancel</div>

                        <div className='px-4 text-center py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer' onClick={() => { verifykey() }}>Confirm</div>
                    </div>

                </div>
            </div>

        </div>
    )
}

export default Editform
