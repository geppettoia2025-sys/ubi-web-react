import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAj_xt5Cxx35y4dGAHCT7GhOminuePvhcU",
  authDomain: "dondequeda-brandsen.firebaseapp.com",
  projectId: "dondequeda-brandsen",
  storageBucket: "dondequeda-brandsen.firebasestorage.app",
  messagingSenderId: "823980971845",
  appId: "1:823980971845:web:7c9f8a1b2c3d4e5f"
};

// 🔥 ESTO ES LA CLAVE
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);