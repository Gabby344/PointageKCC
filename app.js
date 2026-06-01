import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkCnxIDdzngjnltxC9IBCV1Fk2JYSrKM0",
    authDomain: "pointage-app-42339.firebaseapp.com",
    projectId: "pointage-app-42339",
    storageBucket: "pointage-app-42339.firebasestorage.app",
    messagingSenderId: "63257821944",
    appId: "1:63257821944:web:e8e06472eacee7675eb10d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Activer le cache local pour le mode hors-ligne
enableIndexedDbPersistence(db).catch(err => console.error("Mode hors-ligne non disponible"));

const pointer = async (type) => {
    const matricule = document.getElementById('matricule').value;
    const status = document.getElementById('status-message');

    if (!matricule) return alert("Veuillez entrer votre matricule.");

    try {
        await addDoc(collection(db, "pointages"), {
            matricule: matricule,
            type: type,
            timestamp: new Date().toLocaleString(),
            localisation: "KCC-Kolwezi-Site",
            statut: "envoyé"
        });
        status.innerText = "Pointage réussi : " + type;
        status.style.color = "green";
    } catch (e) {
        status.innerText = "Mode hors-ligne : Données sauvegardées localement.";
        status.style.color = "orange";
    }
};

document.getElementById('btn-arrive').addEventListener('click', () => pointer('Arrivée'));
document.getElementById('btn-depart').addEventListener('click', () => pointer('Départ'));
