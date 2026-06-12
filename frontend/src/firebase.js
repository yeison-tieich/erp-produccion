import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyDDkE2bseNei-eQ2rp1sMVUFR9qa4HhGIU",
    authDomain: "erp-mt.firebaseapp.com",
    projectId: "erp-mt",
    storageBucket: "erp-mt.firebasestorage.app",
    messagingSenderId: "899527361216",
    appId: "1:899527361216:web:088530e5448935756ba325",
    measurementId: "G-6S38CHSVYW"
};

const app = initializeApp(firebaseConfig);

export default app;