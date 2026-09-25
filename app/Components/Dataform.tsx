
import React, { useEffect, useMemo, useState } from 'react'
import { categorylist, buildTagSuggestions, itemprobes, mentionlist, platformlist, taskprobs } from '../constants'
import { auth, db, firestore } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { add } from 'date-fns';
import { doc, setDoc } from 'firebase/firestore';
import { submitToSheet } from '../Posttosheet';
import TagInput from './TagInput';


interface UploadResponse {
    message: string;
    fileId: string;
    fileName: string;
    filelink: string;
}

type Props = {
    user?: string,

    changeformvisibility: () => void,
    showToast?: (message: string) => void,
    items?: itemprobes[],
}

const Dataform = ({ changeformvisibility, showToast, user, items = [] }: Props) => {

    const [mentions, setMentions] = useState<string[]>([]);
    const [assignedTo, setassign_to] = useState<string[]>([]);
    const [mentionstring, setMentionstring] = useState<string>("");

    const [date, setDate] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [smDoc, setSmDoc] = useState<string>("");
    const [url, setUrl] = useState<string>("");
    const [imgUrl, setImgUrl] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [platform, setPlatform] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");
    const [tags, setTags] = useState<string[]>([]);

    const tagSuggestions = useMemo(() => buildTagSuggestions(items), [items]);

    const [date_error, setDate_error] = useState<boolean>(false);
    const [categorry_error, setCategory_error] = useState<boolean>(false);
    const [title_error, setTitle_error] = useState<boolean>(false);
    const [url_error, seturl_error] = useState<boolean>(false);





    const [message, setMessage] = useState<string>('Select a file to start the upload.');
    const [loading, setLoading] = useState<boolean>(false);
    const [uploadlabel, setuploadlabel] = useState("Select a file");
    const [uplaodStatus, setUploadStataus] = useState(true)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (loading) {
            setMessage('upload in progress')
            return;
        }


        const selecetedFile = e.target.files?.[0]

        if (!selecetedFile) {
            alert("No file selecetd")
            return;
        }

        //check file selected
        setUploadStataus(true)
        setLoading(true)
        setMessage("uploading file " + selecetedFile.name)
        setuploadlabel("Uploading file " + selecetedFile.name)

        try {
            const formData = new FormData();
            formData.append('file', selecetedFile);
            formData.append("fileName", selecetedFile.name)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })



            if (!response.ok) {
                const errordata = await response.json()
                setUploadStataus(false)
                throw new Error(errordata.error || "upload failed on server");
            }

            const resposeData = await response.json()

            const data: UploadResponse = resposeData;

            console.log(data.filelink)
            setUrl(data.filelink + "")

            e.target.value = ''

        } catch (error) {
            console.log("upload error: " + error)
            setUploadStataus(false)

        } finally {
            setLoading(false)
            setuploadlabel("Select a file")
            setUploadStataus(true)




        }


    }











    //     const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    //         const file = e.target.files?.[0];
    //         if (!file) return;

    //         const formData = new FormData();
    //         formData.append("file", file);

    //         const res = await fetch('/api/upload', { method: 'POST', body: formData });
    //     const data = await res.json();

    //     if (res.ok) setFileUrl(data.webViewLink || '');
    //     else alert(data.error);
    //   };



    useEffect(() => {

        setMentionstring(mentions.join(", "));
        //console.log(date);

    }, [mentions, date, title, smDoc, url, imgUrl, description, category, platform, remarks]);

    const add_to_db = ({ date, createdon, title, smdoc, description, category, platform, url, img_url, sm_status, mention, website_status, remarks, tags }: itemprobes) => {
        const dataRef = ref(db, '/items/');
        const newdataRef = push(dataRef);
        set(newdataRef, {
            date: date,
            createdon: createdon,
            title: title,
            smdoc: smdoc,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: img_url,
            sm_status: sm_status,
            mention: mention,
            remarks: remarks,
            website_status: website_status,
            addedBy: auth.currentUser?.email ?? "",
            addedAt: Date.now(),
            tags: tags,
        })
            .then(() => {
                //console.log('Data added successfully!');
                showToast ? showToast("Data added successfully!") : ""

                clearform();
            })
            .catch((error) => {
                console.error('Error adding data:', error);
            });
    }

    const processDBpush = () => {




        if (date == "") {
            setDate_error(true);
        } else {
            setDate_error(false);
        }
        if (title == "") {
            setTitle_error(true);
        } else {
            setTitle_error(false);
        }
        if (category == "") {
            setCategory_error(true);
        }
        else {
            setCategory_error(false);
        }
        if (url == "") {
            seturl_error(true);
        }
        else {
            seturl_error(false);
        }


        if (date == "" || title == "" || category == "" || url == "") {

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
            "create"

        );




        add_to_db({
            date: date,
            createdon: new Date().toISOString().split('T')[0],
            title: title,
            smdoc: smDoc,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: imgUrl,
            sm_status: "",
            mention: mentionstring,
            website_status: false,
            remarks: remarks,
            tags: tags,
        });
        changeformvisibility();
        add_to_sheet();

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
        setassign_to([]);
        setTags([]);

        setDate_error(false);
        setTitle_error(false);
        setCategory_error(false);
    }

    const add_to_sheet = async () => {



        const base = "https://script.google.com/macros/s/AKfycbzQv0oxAnSlRgopSeS_85XQ6eY7cKiCFepklNJUPtmSPsF_FtYpXjvIh7P9iHfZ55Yezg/exec";
        const formated_date = date.split("-").reverse().join("/");
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
        };

        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');

        const fullUrl = `${base}?${query}`;

        //console.log("Full URL:", fullUrl);



        fetch(fullUrl).
            then(res => res.text())
            .then(response => {
                //alert("Resp:" + response);
                showToast ? showToast("Sheet status: " + response) : ""
            })
            .catch(error => {
                showToast ? showToast("Sheet Error: " + error) : ""
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
            wtw: 'false',
            website: '',
            remarks: remarks,
            sm_status: '',
            assigned_to: '',
            req_by: user || '',
        });

    }





    return (
        <div className='w-full h-screen relative flex justify-center  ' >
            <div className='absolute top-0 left-0 bg-black opacity-15 w-full h-full' onClick={changeformvisibility}></div>

            <div className='absolute w-[90%] max-h-[80%] p-4 flex flex-col z-30 bg-white rounded-lg shadow-lg m-4 overflow-y-scroll ' >
                <h1 className='w-full text-xl font-semibold text-gray-700'>Add New Item</h1>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Date *</label>
                    <input className={`p-2 border-2 ${date_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`} type='date' onChange={(e) => { setDate(e.target.value) }} value={date}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Title *</label>
                    <input className={`p-2 border-2  ${title_error ? "border-red-200" : "border-gray-100"}  rounded-xl shadow text-sm`} type='text' onChange={(e) => { setTitle(e.target.value) }} value={title}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>SM Correction Doc URL</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setSmDoc(e.target.value) }} value={smDoc}></input>
                </div>

                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>URL*</label>
                        <input className={`p-2 border-2 ${url_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`} type='text' onChange={(e) => { setUrl(e.target.value) }} value={url}></input>
                        {!uplaodStatus && <span className='text-sm text-red-800 px-2'>File Uplod failed. Upload to the <a className='text-blue-700 underline' href='https://drive.google.com/drive/folders/1YgMS9-em71U_UfSdfydsihLgOggTrUDI' target='_blank'>folder</a> direcly and paste the url</span>}
                        {uplaodStatus && <span className='text-sm text-blue-800 px-2'>Max upload size is 4 MB. If larger, upload to the <a className='text-blue-500 font-bold underline' href='https://drive.google.com/drive/folders/1YgMS9-em71U_UfSdfydsihLgOggTrUDI' target='_blank'>folder</a> direcly and paste the url</span>}


                        <div className='flex items-center p-2'>
                            <label
                                htmlFor="fileUpload"
                                className="cursor-pointer text-sm bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
                            >
                                {uploadlabel}
                            </label>
                            <input
                                id="fileUpload"
                                type="file"
                                accept="*/*"
                                onChange={handleFileUpload}
                                className="text-sm bg-blue-200 text-center rounded-xl shadow-xl p-2 hidden "
                            />
                        </div>


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

                        <label className='text-sm font-medium text-gray-600 px-2'>Category *</label>
                        <select
                            className={`p-2 border-2 ${categorry_error ? "border-red-200" : "border-gray-100"} rounded-xl shadow text-sm`}
                            value={category}
                            onChange={(e) => { setCategory(e.target.value) }}
                        >
                            <option value="">Select category…</option>
                            {categorylist.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

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
                    <label className='text-sm font-medium text-gray-600 px-2'>Tags *</label>
                    <TagInput
                        value={tags}
                        onChange={setTags}
                        suggestions={tagSuggestions}
                        maxTags={5}
                        minTags={2}
                    />
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Mentions</label>
                    <span className='text-xs font-medium text-gray-600 px-2'>Use comma(,) or Enter key to add</span>

                    {/* <form onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('mentionInput') as HTMLInputElement;
                        const value = input.value.trim();
                        if (value !== "" && !mentions.includes(value)) {
                            setMentions([...mentions, value]);
                        }
                        input.value = "";
                    }}>
                        <input
                            name='mentionInput'
                            className='p-2 border-2 w-full  border-gray-100 rounded-xl shadow text-sm'
                            type='text'
                            list='mentions'
                            enterKeyHint='enter'
                            onKeyDown={(e) => {
                                if (e.key === ',' && e.currentTarget.value.trim() !== "") {
                                    e.preventDefault();
                                    const value = e.currentTarget.value.trim();
                                    if (!mentions.includes(value)) {
                                        setMentions([...mentions, value]);
                                    }
                                    e.currentTarget.value = "";
                                }
                            }}
                        />
                    </form> */}

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('mentionInput') as HTMLInputElement;
                        const value = input.value.trim();
                        if (value !== "" && !mentions.includes(value)) {
                            setMentions([...mentions, value]);
                        }
                        input.value = "";
                    }}>
                        <input
                            name='mentionInput'
                            className='p-2 border-2 w-full border-gray-100 rounded-xl shadow text-sm'
                            type='text'
                            list='mentions'
                            enterKeyHint='enter'
                            onKeyDown={(e) => {
                                if (e.key === ',' && e.currentTarget.value.trim() !== "") {
                                    e.preventDefault();
                                    const value = e.currentTarget.value.trim();
                                    if (!mentions.includes(value)) {
                                        setMentions([...mentions, value]);
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
                    </form>




                    {/* <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='mentions' onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',' )  && e.currentTarget.value.trim() !== "") {
                            e.preventDefault();
                            if (!mentions.includes(e.currentTarget.value.trim())) {
                                setMentions([...mentions, e.currentTarget.value.trim()]);
                                
                                e.currentTarget.value = "";
                               
                            } else {
                                e.currentTarget.value = "";
                            }
                        }
                    }}  >
                    </input> */}

                    <datalist id='mentions'>
                        {mentionlist.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </datalist>
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


                <div className='w-full flex justify-center gap-4 py-1 mt-4 flex-col sm:flex-row'>
                    <div className='px-4 py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform(); changeformvisibility(); }}>Cancel</div>

                    <div className='px-4 py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform() }}>Clear</div>

                    <div className='px-4 py-2 border-2 border-green-300 shadow hover:bg-green-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { processDBpush() }}>Submit</div>
                </div>




            </div>

        </div>
    )
}

export default Dataform
