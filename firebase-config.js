// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDkCnxIDdzngjnltxC9IBCV1Fk2JYSrKM0",
    authDomain: "pointage-app-42339.firebaseapp.com",
    projectId: "pointage-app-42339",
    storageBucket: "pointage-app-42339.firebasestorage.app",
    appId: "1:63257821944:web:e8e06472eacee7675eb10d"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// Export des services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Validation des zones géographiques (Geofencing)
export const validLocations = {
    "Batiments_la_Vision": { 
        lat: -10.7167, 
        lng: 25.4667, 
        radius: 500, 
        name: "Bâtiments la Vision" 
    },
    "Hotel_Moon_Palace": { 
        lat: -11.6614, 
        lng: 27.4828, 
        radius: 500, 
        name: "Hôtel Moon Palace" 
    },
    "Hotel_Kolwezi_Lodge": { 
        lat: -10.7167, 
        lng: 25.4667, 
        radius: 500, 
        name: "Hotel Kolwezi Lodge" 
    },
    "Direction_KCC": { 
        lat: -10.7167, 
        lng: 25.4667, 
        radius: 500, 
        name: "Direction KCC" 
    }
};

// Travailleurs par défaut
export const defaultWorkers = {
    "S13001": "Josué Mulaj",
    "S13002": "Shekinah Mukeni",
    "S13003": "Patrick Kalenga",
    "S13004": "Arnaud Luela",
    "S13005": "Nadine Zola"
};

// Fonction d'initialisation de la base de données
export const initializeDatabase = async () => {
    const db = getFirestore(app);
    const { collection, doc, getDoc, setDoc, Timestamp } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
    
    for (const [matricule, name] of Object.entries(defaultWorkers)) {
        const workerRef = doc(db, "workers", matricule);
        const workerSnap = await getDoc(workerRef);
        if (!workerSnap.exists()) {
            await setDoc(workerRef, { 
                matricule, 
                name, 
                active: true, 
                createdAt: Timestamp.now() 
            });
            console.log(`✅ Travailleur ajouté: ${name} (${matricule})`);
        }
    }
    console.log("📦 Base de données initialisée");
};
