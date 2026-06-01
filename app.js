import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDkCnxIDdzngjnltxC9IBCV1Fk2JYSrKM0",
    authDomain: "pointage-app-42339.firebaseapp.com",
    projectId: "pointage-app-42339",
    storageBucket: "pointage-app-42339.firebasestorage.app",
    appId: "1:63257821944:web:e8e06472eacee7675eb10d"
};

const db = getFirestore(initializeApp(firebaseConfig));

// Liste des employés autorisés
const employes = {
    "S13001": "M Josué Mulaj",
    "S13002": "Madame Shekinah Mukeni",
    "S13003": "M Patrick Kalenga",
    "S13004": "M Arnaud Luela",
    "S13005": "Madame Nadine Zola"
};

// Fonction principale de pointage
window.pointer = async (type) => {
    const mat = document.getElementById('matricule').value;
    const lieu = document.getElementById('lieu').value;
    const status = document.getElementById('status-message');

    if (!employes[mat]) return alert("Matricule non reconnu !");
    if (!lieu) return alert("Veuillez sélectionner un lieu.");

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    video.style.display = 'block';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        // Capture du selfie après 2 secondes
        setTimeout(async () => {
            canvas.getContext('2d').drawImage(video, 0, 0, 200, 150);
            const photo = canvas.toDataURL('image/jpeg');

            // Récupération position GPS
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await addDoc(collection(db, "pointages"), {
                    agent: employes[mat],
                    lieu: lieu,
                    type: type,
                    gps: `${pos.coords.latitude}, ${pos.coords.longitude}`,
                    timestamp: new Date().toLocaleString()
                });

                status.innerText = "Pointage validé avec succès !";
                status.style.backgroundColor = "#d4edda";
                
                stream.getTracks().forEach(t => t.stop());
                video.style.display = 'none';
            });
        }, 2000);
    } catch (err) {
        alert("Erreur : Accès caméra refusé.");
    }
};

// Fonction Admin pour afficher l'historique
window.toggleAdmin = async () => {
    const panel = document.getElementById('admin-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

    if (panel.style.display === 'block') {
        const snapshot = await getDocs(query(collection(db, "pointages"), orderBy("timestamp", "desc")));
        const table = document.getElementById('table-pointages');
        
        table.innerHTML = `<tr><th>Agent</th><th>Lieu</th><th>Type</th><th>Heure</th></tr>`;
        snapshot.forEach(doc => {
            const d = doc.data();
            table.innerHTML += `<tr><td>${d.agent}</td><td>${d.lieu}</td><td>${d.type}</td><td>${d.timestamp}</td></tr>`;
        });
    }
};
