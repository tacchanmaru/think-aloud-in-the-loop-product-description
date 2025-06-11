// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsQrS0CNWqPXKsOn3vj6GPeMkoMihG4z0",
  authDomain: "think-aloud-in-the-loop.firebaseapp.com",
  projectId: "think-aloud-in-the-loop",
  storageBucket: "think-aloud-in-the-loop.firebasestorage.app",
  messagingSenderId: "172885386258",
  appId: "1:172885386258:web:788ae342bc0af6707b64cb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
