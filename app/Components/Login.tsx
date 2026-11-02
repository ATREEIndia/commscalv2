'use client'
import React, { useEffect } from 'react'
import { auth } from '../firebase/firebase';
import Googleauth from './Googleauth';
import { UserMyAppContext } from '../Context/MyAppContext';

type Props = {
  params?: Promise<{ postId: string }>
}




const Login = ({params}:Props) => {
    // The app context decides who is allowed in: anyone in reg_users (looked up
    // after sign-in, so guests from any domain work) plus the open emails.
    const { user, loading } = UserMyAppContext()

    useEffect(() => {
        // Signed in with Google but not allowed in the app.
        if (!loading && !user && auth.currentUser) {
            auth.signOut()
            alert("You are not an authorized user. Please contact admin.");
        }
    }, [user, loading]);




    if(loading){
        return <div className=' w-screen h-screen overflow-hidden flex text-sm text-gray-500 bg-blue-50 justify-around items-center p-2 z-60  '>verifying user...</div>}
    else{

 
   




    return (
        <div className={`${!user ? "flex w-screen h-screen overflow-hidden" : "hidden"}  bg-blue-50 justify-around items-center p-2 z-60  `}>
            {/* <div className='   overflow-hidden border-2 p-4 rounded-xl bg-white shadow-lg flex flex-col gap-4 justify-center items-center border-blue-200 max-w-[90%] md:max-w-[30%]'>
                <h1 className='w-full text-xl font-medium text-gray-700'>Login</h1>
                <p className='text-sm'>Please sign in using your registerd email address. Please note that the same email addess has to be pre-registed by the admin before login. </p>
                <Googleauth />

            </div> */}

            <div className="w-[90%] max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50">
  <div className="flex flex-col items-center text-center">
    
    {/* Icon */}
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-6l3 3m0 0l-3 3m3-3H9"
        />
      </svg>
    </div>

    {/* Heading */}
    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
      Welcome back to commscal
    </h1>

    <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
      Sign in using your registered email address to continue.
    </p>

    {/* Info */}
    <div className="mt-5 w-full rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left">
      <p className="text-xs leading-5 text-blue-800">
        <span className="font-semibold">Note:</span> Your email address must
        be pre-registered by the administrator before you can sign in.
      </p>
    </div>

    {/* Login */}
    <div className="mt-6 w-full flex items-center justify-center">
      <Googleauth />
    </div>

    {/* Footer */}
    <p className="mt-6 text-xs text-gray-400">
      Authorised users only
    </p>
  </div>
</div>


        </div>
    )}
}

export default Login
