import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // ← 추가!
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjaY7osEpwz5Ehu7WI0fqEHkxfx6nR4H0",
  authDomain: "soktalk-3e359.firebaseapp.com",
  projectId: "soktalk-3e359",
  storageBucket: "soktalk-3e359.firebasestorage.app",
  messagingSenderId: "671138886263",
  appId: "1:671138886263:web:ba2ca48eb7d18e0f2fcc72",
  measurementId: "G-X22QMH14VP"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);  // ← 추가!

export { auth, db, storage };  // ← storage 추가!