// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "clario-af973.firebaseapp.com",
  projectId: "clario-af973",
  storageBucket: "clario-af973.firebasestorage.app",
  messagingSenderId: "917966377820",
  appId: "1:917966377820:web:edd4f8ed46a3625db22799",
  measurementId: "G-LTDZMJ218B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
if (typeof window !== "undefined" && import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS !== "false") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}

export default app;
export { analytics };

