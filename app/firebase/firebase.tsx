// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, orderByChild, ref, query, get, onValue } from "firebase/database";
import { collection, getDocs, getFirestore, onSnapshot } from "firebase/firestore";
import { itemprobes, taskprobs } from "../constants";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Values come from .env.local (and the hosting env). They must be referenced as
// process.env.NEXT_PUBLIC_… literally so Next.js can inline them into the browser bundle.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
 const app = initializeApp(firebaseConfig);
  export const db = getDatabase(app);
  export  const auth = getAuth(app);
  export const firestore=getFirestore(app);


//onetime read realtime database
  const getitemsfromdb=async()=>{
    const itemref=ref(db,"/items/")
    const sortquery=query(itemref, orderByChild("date"));

    get(sortquery).then((snapshot)=>{
      const entrylist:itemprobes[]=[]

        if(snapshot.exists()){
          snapshot.forEach((childSnapshot)=>{
            const id=childSnapshot.key!;
            const item=childSnapshot.val();

            entrylist.push({id, ...item})
          })          

        }else{
          //console.log("No data available");
        }
    })
  }

  //listen to changes in realtime database
  export const listenToItems=(callback:(items:itemprobes[])=>void)=>{
    const itemref=ref(db,"/items/")
    const sortquery=query(itemref,orderByChild("date"));

    onValue(sortquery,(snapshot)=>{
      const entrylist:itemprobes[]=[]

      if(snapshot.exists()){
        snapshot.forEach((childSnapshot)=>{
          const id=childSnapshot.key!;
          const item=childSnapshot.val()

          entrylist.push({id,...item})

        })
      }
      callback(entrylist.reverse());
    })
  }

  //get registered users from firestore
 
  export const getRegistedUsers=async()=>{
    try{
      const query=await getDocs(collection(firestore,"reg_users"));

      const users=query.docs.map(doc=>({
        id:doc.id,
        ...doc.data()

      }));
      // setRegUsers(users)
      return users;

    }catch(error){
      console.error("Error fetching registered users:",error);
    }finally{
      // setLoading(false);
    }
  }

  //get tasks from firestore
 
  export const getAllTasks=async()=>{
    try{
      const query=await getDocs(collection(firestore,"tasks"));

      const tasks=query.docs.map(doc=>({
        id:doc.id,
        ...doc.data()

      }));
      // setRegUsers(users)
      return tasks;

    }catch(error){
      console.error("Error fetching registered users:",error);
    }finally{
      // setLoading(false);
    }
  }

  // export const listenToTasks = (callback: (tasks: taskprobs[]) => void) => {
  // const tasksRef = collection(firestore, "tasks");
  // return onSnapshot(tasksRef, (snapshot) => {
  //   const tasks = snapshot.docs.map(doc => ({
  //     id: doc.id,
  //     ...doc.data()
  //   }));
  //   callback(tasks);
  // });

  export const listenToTasks = (callback: (tasks: taskprobs[]) => void) => {
  const tasksRef = collection(firestore, "tasks");
  return onSnapshot(tasksRef, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    })) as taskprobs[];
    callback(tasks);
  });
};

  