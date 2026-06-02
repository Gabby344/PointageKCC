import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkCnxIDdzngjnltxC9IBCV1Fk2JYSrKM0",
    authDomain: "pointage-app-42339.firebaseapp.com",
    projectId: "pointage-app-42339",
    storageBucket: "pointage-app-42339.appspot.com",
    appId: "1:63257821944:web:e8e06472eacee7675eb10d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const employes = {
    "S13001": "Josué Mulaj",
    "S13002": "Shekinah Mukeni",
    "S13003": "Patrick Kalenga",
    "S13004": "Arnaud Luela",
    "S13005": "Nadine Zola"
};

export const sites = {
    "Batiments_la_Vision": { lat: -10.7167, lng: 25.4667, radius: 1000 },
    "Hotel_Moon_Palace": { lat: -11.6614, lng: 27.4828, radius: 1000 },
    "Hotel_Kolwezi_Lodge": { lat: -10.7167, lng: 25.4667, radius: 1000 },
    "Direction_KCC": { lat: -10.7167, lng: 25.4667, radius: 1000 }
};
