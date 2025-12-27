import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCm7h8DEmk8Y0YX6mzh_ZO-gsgRSo76_bI",
  authDomain: "glucogurad-22396.firebaseapp.com",
  projectId: "glucogurad-22396",
  storageBucket: "glucogurad-22396.firebasestorage.app",
  messagingSenderId: "231508831310",
  appId: "1:231508831310:web:bef37eb2ebdb0d3b5da71f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // ဒီစာကြောင်း သေချာပါစေ