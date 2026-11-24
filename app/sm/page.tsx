'use client'
import React from 'react'
import Navbar from '../Components/Navbar'
import Rightcontainer from '../Components/Rightcontainer'
import {listenToItems, getRegistedUsers, getAllTasks, listenToTasks} from "../firebase/firebase";
import { useState, useEffect } from 'react'
import { itemprobes } from '../constants'
import { renderFormatted } from '../../lib/richText'

const Page = () => {

  const[entries,setEntries]=useState<itemprobes[]>([])
  const [reg_users, setReg_users] = useState<any[]>([]);
  const[tasks, setTasks]=useState<any[]>([]);

  useEffect(()=>{
    listenToItems(setEntries)
    getRegistedUsers().then(users => setReg_users(users ?? []))

   listenToTasks(setTasks);

  },[getAllTasks])


  return (
     <main className=" flex gap-4 h-full w-full ">
      {/* left navigations */}
      <Navbar current_page="SM Plan"/>
      
      {/* SM Plan content */}
      <div className="flex flex-2 flex-col w-full h-full justify-start items-center p-4 gap-4">
        {tasks.map((task,index)=>(
          <div key={index}>{renderFormatted(task.title)}</div>
        ))}
      </div>

      {/* right container */}
      <Rightcontainer/>
      
    </main>
  )
}

export default Page
