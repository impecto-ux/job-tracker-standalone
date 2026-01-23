import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";

// TODO: Replace the following config with your actual Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSy_DUMMY_KEY_REPLACE_ME_12345",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// --- CMS Helper Functions ---

const VIDEOS_COLLECTION = "videos";

export const getVideos = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, VIDEOS_COLLECTION));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching videos:", error);
        return [];
    }
};

export const addVideo = async (videoData) => {
    try {
        const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), {
            ...videoData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding video:", error);
        throw error;
    }
};

export const updateVideo = async (id, videoData) => {
    try {
        const videoRef = doc(db, VIDEOS_COLLECTION, id);
        await updateDoc(videoRef, {
            ...videoData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating video:", error);
        throw error;
    }
};

export const deleteVideo = async (id) => {
    try {
        await deleteDoc(doc(db, VIDEOS_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting video:", error);
        throw error;
    }
};
