import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdAcWv7GU6MxyfSmf-Ydwe8tp02D6laiQ",
  authDomain: "sam-speak.firebaseapp.com",
  projectId: "sam-speak",
  storageBucket: "sam-speak.firebasestorage.app",
  messagingSenderId: "480483511784",
  appId: "1:480483511784:web:536321b9ecf6b177e8a85d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use a shared document ID for all devices
const SHARED_DOC_ID = 'shared';

// Save rectangles data to Firestore
export async function saveToFirestore(rectangles) {
  try {
    await setDoc(doc(db, 'rectangles', SHARED_DOC_ID), {
      rectangles,
      updatedAt: new Date().toISOString()
    });
    console.log('Saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    return false;
  }
}

// Load rectangles data from Firestore
export async function loadFromFirestore() {
  try {
    const docRef = doc(db, 'rectangles', SHARED_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('Loaded from Firestore');
      return docSnap.data().rectangles;
    }
    return null;
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return null;
  }
}

// Listen for real-time updates from Firestore
export function listenToFirestore(callback) {
  try {
    const docRef = doc(db, 'rectangles', SHARED_DOC_ID);

    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log('Firestore update received');
        callback(docSnap.data().rectangles);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to Firestore:', error);
      callback(null);
    });
  } catch (error) {
    console.error('Error setting up Firestore listener:', error);
    return () => {}; // Return empty unsubscribe function
  }
}
