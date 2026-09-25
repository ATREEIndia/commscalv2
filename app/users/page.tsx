"use client"
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useState, useEffect, use } from 'react'
import { auth, firestore } from '../firebase/firebase';
import Navbar from '../Components/Navbar';
import Rightcontainer from '../Components/Rightcontainer';
import { useUsers } from '../constants';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

type userprobs = {
    email: string;
    displayname: string;
    role?: string;
}

const Page = () => {
    const { users, loading, refetch } = useUsers();

    const [shownewuserform, setShownewuserform] = useState(false);
    const [shownewuserdeleteform, setShownewuserdeleteform] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string>("");
    const [isadmin, setisadmin] = useState<boolean>(false);


    const [newuseremail, setNewuseremail] = useState("");
    const [newusername, setNewusername] = useState("");
    const [newuserrole, setNewuserrole] = useState("viewer");
      const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);



    const register_user = async ({ email, displayname, role }: userprobs) => {
        const userdocref = doc(firestore, "reg_users", email);
        try {
            //console.log("Register button clicked");
            const userdocref = doc(firestore, "reg_users", email);
            await setDoc(userdocref, {
                email: email,
                displayName: displayname,
                role: role ? role : "viewer",
                createdAt: new Date()
            });
            alert("user registered");
            setShownewuserform(false);
            setNewuseremail("");
            setNewusername("");
            setNewuserrole("");
            await refetch();



        } catch (error) {
            alert("Error: " + error);
            console.error(error);
        }

    }

    const prepare_register = () => {
        if (newuseremail == "" || newusername == "") {
            alert("Please fill all the fields");
            return;
        }
        // if (users.find(u => u.email === newuseremail)) {
        //     alert("User already exists");
        //     return;
        // }
        register_user({ email: newuseremail, displayname: newusername, role: newuserrole });

    }

    const removeuser = async (email: string) => {
        if (!users.find(u => u.email === email)) {
            alert("User does not exist");
            return;
        }
        // delete user from firestore
        try {
            const userdocref = doc(firestore, "reg_users", email);
            await deleteDoc(userdocref);
            alert("user removed");
            setShownewuserdeleteform(false);
            setUserToDelete("");
            await refetch();

        } catch (error) {
            alert("Error: " + error);
            console.error(error);
        }
    }

    const showeditform = (email: string, displayname: string, role?: string) => {
        setNewuseremail(email);
        setNewusername(displayname);
        setNewuserrole(role ? role : "viewer");
        setShownewuserform(true);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {


            if (users.find(u => u.email === user?.email)?.role === "admin") {
                setisadmin(true);
            }


        });
        return () => unsubscribe();
    }, [loading]);

    if (!loading && !isadmin) {
        return <div className=' w-screen h-screen overflow-hidden flex flex-col bg-blue-50 gap-4 justify-center items-center p-2 z-60 '>
            <div className=' text-sm text-gray-500  '>You are not authorized to view this page. Please contact admin.
            </div>
            <Link href={"/"} className=' text-sm hover:text-blue-600 text-blue-500 cursor-pointer font-medium ' > Go Home</Link>
        </div>



    }



    return (
        // <main className=" flex gap-4 h-full w-full relative ">
        //     {/* <Navbar current_page="My Data" /> */}
        //      <div className="hidden lg:block flex-shrink-0">
        //         <Navbar current_page="My Data" />
        //     </div>

        //     {/* ── Mobile Nav Overlay ── */}
        //     {isMobileNavOpen && (
        //         <div className="fixed  inset-0 z-50 lg:hidden">
        //             <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
        //             <div className="absolute left-0 top-0 h-full w-70  bg-white shadow-2xl z-10">
        //                 <Navbar current_page="My Data" />
        //             </div>
        //         </div>
        //     )}

        //     {/* SM Plan content */}
        //     <div className="flex flex-2">
        //         <div className='w-full h-full flex flex-col  mt-10 '>
        //             <h1 className='text-lg font-bold mb-5 text-gray-500 w-full '>Manange Users</h1>
        //             <div className='w-full flex flex-row-reverse'>
        //                 <button className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm' onClick={() => {
        //                     setShownewuserform(true); setNewuseremail("");
        //                     setNewusername("");
        //                     setNewuserrole("");
        //                 }}>+ Add New User</button>
        //             </div>

        //             <div className='mt-10 w-full px-10 '>
        //                 <div className='w-full flex justify-between border-b-2 border-gray-200 py-2 text-sm text-gray-600 bg-blue-100'>
        //                     <div className='w-[20%] text-center'>User email</div>
        //                     <div className='w-[20%] text-center'>User name </div>
        //                     <div className='w-[20%] text-center'>Role</div>
        //                     <div className='w-[40%] text-center '>Action</div>
        //                 </div>
        //                 {users.map((user, index) => (
        //                     <div key={index} className='w-full flex justify-between border-b-2 border-gray-200 py-2 text-sm'>
        //                         <div className='w-[20%] text-center'>{user.email}</div>
        //                         <div className='w-[20%] text-center'>{user.displayName}</div>
        //                         <div className='w-[20%] text-center'>{user.role}</div>

        //                         <div className='w-[40%] text-center flex gap-4 justify-center'>
        //                             <div className=' text-center cursor-pointer hover:text-red-600 ' onClick={() => { setUserToDelete(user.email); setShownewuserdeleteform(true) }} >Remove</div>
        //                             <div className='text-center cursor-pointer hover:text-orange-300 ' onClick={() => { showeditform(user.email, user.displayName, user.role) }}>Edit</div>
        //                         </div>

        //                     </div>


        //                 ))}


        //             </div>
        //         </div>
        //     </div>

        //     {/* right container */}
        //     <Rightcontainer />


        //     {/* new user form */}
        //     <div className={`w-full h-full absolute  top-0 right-0   justify-center items-center ${shownewuserform ? "flex flex-col" : "hidden"} z-50 `}>


        //         <div className='relative w-full h-full flex justify-center items-center'>
        //             <div className='absolute top-0 right-0 w-full h-full bg-gray-100 opacity-50 ' onClick={() => { setShownewuserform(false); }}></div>
        //             <div className='border-2 w-[30%] p-4 items-center flex flex-col border-gray-50  z-20  gap-2 bg-white rounded-xl shadow-lg'>
        //                 <h1 className='font-bold text-lg'>Register New User</h1>
        //                 <input type="text" placeholder='Email' className=' text-sm p-2 border-2 border-blue-50 rounded-xl w-full' onChange={(e) => { setNewuseremail(e.target.value.trim()) }} value={newuseremail} />
        //                 <input type="text" placeholder='Display Name' className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full' onChange={(e) => { setNewusername(e.target.value) }} value={newusername} />
        //                 <input type="text" placeholder='Role (admin/viewer)' className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full' list='roles' onChange={(e) => { setNewuserrole(e.target.value) }} value={newuserrole} />
        //                 <datalist id="roles">
        //                     <option value="admin" />
        //                     <option value="Editor" />
        //                     <option value="viewer" />
        //                 </datalist>
        //                 <div className='w-full flex gap-4 justify-around mt-4'>
        //                     <button className='p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer' onClick={() => { setShownewuserform(false); }}>Cancel</button>

        //                     <button className='p-2 px-4 bg-blue-400 rounded-xl text-sm text-white hover:bg-blue-600 cursor-pointer' onClick={prepare_register}>Register</button>

        //                 </div>


        //             </div>
        //         </div>
        //     </div>

        //     {/* user delete confirm */}
        //     <div className={`w-full h-full absolute  top-0 right-0   justify-center items-center ${shownewuserdeleteform ? "flex flex-col" : "hidden"} z-50 `}>
        //         <div className='relative w-full h-full flex justify-center items-center'>
        //             <div className='absolute top-0 right-0 w-full h-full bg-gray-100 opacity-50 ' onClick={() => { setShownewuserdeleteform(false); }}></div>
        //             <div className='border-2 w-[30%] p-4 items-center flex flex-col border-gray-50  z-20  gap-2 bg-white rounded-xl shadow-lg'>
        //                 <h1 className='font-bold text-lg'>Are you sure you want to delete this user?</h1>
        //                 <div className='w-full flex gap-4 justify-around mt-4'>
        //                     <button className='p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer' onClick={() => { setShownewuserdeleteform(false); }}>Cancel</button>
        //                     <button className='p-2 px-4 bg-red-400 rounded-xl text-sm text-white hover:bg-red-600 cursor-pointer' onClick={() => { removeuser(userToDelete) }}>Delete</button>
        //                 </div>
        //             </div>
        //         </div>
        //     </div>

        // </main>

 <main className="flex gap-4 min-h-screen  w-full relative">
    {/* Desktop sidebar */}
    <div className="hidden lg:block flex-shrink-0">
        <Navbar current_page="Users" />
    </div>

    {/* ── Mobile Nav Overlay ── */}
    {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl z-10 overflow-y-auto">
                <Navbar current_page="Users" />
            </div>
        </div>
    )}

    {/* Main content */}
    <div className="flex-1 w-full h-full ">
        <div className="w-full flex flex-col px-4 sm:px-6 lg:px-10 pt-4 sm:pt-10 pb-10">

            {/* Header row: hamburger + title + add button */}
            <div className="flex items-center gap-3 mb-6 w-full max-w-full">
                <button
                    className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileNavOpen(true)}
                    aria-label="Open menu"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <h1 className="text-lg font-bold text-gray-500 flex-1">Manage Users</h1>

                <button
                    className="p-2 px-3 sm:px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm whitespace-nowrap"
                    onClick={() => {
                        setShownewuserform(true);
                        setNewuseremail("");
                        setNewusername("");
                        setNewuserrole("");
                    }}
                >
                    + Add <span className="hidden sm:inline">New User</span>
                </button>
            </div>

            {/* ── Desktop / tablet: table in a bordered panel ── */}
            <div className="hidden md:block w-full max-w-full border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b-2 border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">All users</p>
                    <p className="text-xs text-gray-400">{users.length} {users.length === 1 ? "user" : "users"}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 bg-gray-50">
                                <th className="py-2.5 px-5 font-medium">Name</th>
                                <th className="py-2.5 px-5 font-medium">Email</th>
                                <th className="py-2.5 px-5 font-medium">Role</th>
                                <th className="py-2.5 px-5 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user, index) => (
                                <tr key={index} className="hover:bg-blue-50/40">
                                    <td className="py-3 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-700">{user.displayName || "—"}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-5 text-gray-500 break-all">{user.email}</td>
                                    <td className="py-3 px-5">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-gray-600 whitespace-nowrap">
                                            {user.role || "—"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-5">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                className="px-3 py-1 rounded-lg border border-orange-200 text-orange-500 text-xs hover:bg-orange-50 cursor-pointer"
                                                onClick={() => { showeditform(user.email, user.displayName, user.role); }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="px-3 py-1 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 cursor-pointer"
                                                onClick={() => { setUserToDelete(user.email); setShownewuserdeleteform(true); }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-10">No users yet. Add one to give them access.</p>
                )}
            </div>

            {/* ── Mobile: stacked cards ── */}
            <div className="md:hidden flex flex-col gap-3">
                {users.map((user, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl p-3 text-sm bg-white">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-700 truncate">{user.displayName || "—"}</p>
                                <p className="text-gray-500 text-xs break-all">{user.email}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-gray-600 flex-shrink-0">
                                {user.role}
                            </span>
                        </div>
                        <div className="flex gap-3 mt-3 justify-end">
                            <button
                                className="px-3 py-1 rounded-lg border border-orange-200 text-orange-500 text-xs"
                                onClick={() => { showeditform(user.email, user.displayName, user.role); }}
                            >
                                Edit
                            </button>
                            <button
                                className="px-3 py-1 rounded-lg border border-red-200 text-red-500 text-xs"
                                onClick={() => { setUserToDelete(user.email); setShownewuserdeleteform(true); }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>

    {/* Right container: only on wide screens */}
    <div className="hidden xl:block flex-shrink-0">
        <Rightcontainer />
    </div>

    {/* ── New user modal ── */}
    {shownewuserform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/30" onClick={() => setShownewuserform(false)} />
            <div className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 bg-white rounded-xl shadow-lg">
                <h1 className="font-bold text-lg text-center">Register New User</h1>
                <input type="email" placeholder="Email" className="text-sm p-2 border-2 border-blue-50 rounded-xl w-full"
                    onChange={(e) => setNewuseremail(e.target.value.trim())} value={newuseremail} />
                <input type="text" placeholder="Display Name" className="text-sm p-2 border-2 border-blue-50 rounded-xl w-full"
                    onChange={(e) => setNewusername(e.target.value)} value={newusername} />
                <input type="text" placeholder="Role (admin/viewer)" className="text-sm p-2 border-2 border-blue-50 rounded-xl w-full"
                    list="roles" onChange={(e) => setNewuserrole(e.target.value)} value={newuserrole} />
                <datalist id="roles">
                    <option value="admin" />
                    <option value="Editor" />
                    <option value="viewer" />
                </datalist>
                <div className="w-full flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-2">
                    <button className="p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer"
                        onClick={() => setShownewuserform(false)}>Cancel</button>
                    <button className="p-2 px-4 bg-blue-400 rounded-xl text-sm text-white hover:bg-blue-600 cursor-pointer"
                        onClick={prepare_register}>Register</button>
                </div>
            </div>
        </div>
    )}

    {/* ── Delete confirm modal ── */}
    {shownewuserdeleteform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/30" onClick={() => setShownewuserdeleteform(false)} />
            <div className="relative z-10 w-full max-w-sm p-4 sm:p-6 flex flex-col gap-2 bg-white rounded-xl shadow-lg">
                <h1 className="font-bold text-base sm:text-lg text-center">Remove this user?</h1>
                <p className="text-sm text-gray-500 text-center break-all">{userToDelete}</p>
                <div className="w-full flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-4">
                    <button className="p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer"
                        onClick={() => setShownewuserdeleteform(false)}>Cancel</button>
                    <button className="p-2 px-4 bg-red-400 rounded-xl text-sm text-white hover:bg-red-600 cursor-pointer"
                        onClick={() => removeuser(userToDelete)}>Remove</button>
                </div>
            </div>
        </div>
    )}
</main>
    )
}

export default Page



