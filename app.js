import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkCnxIDdzngjnltxC9IBCV1Fk2JYSrKM0",
    authDomain: "pointage-app-42339.firebaseapp.com",
    projectId: "pointage-app-42339",
    storageBucket: "pointage-app-42339.firebasestorage.app",
    appId: "1:63257821944:web:e8e06472eacee7675eb10d"
};

const db = getFirestore(initializeApp(firebaseConfig));
const auth = getAuth();

const employes = {
    "S13001": "M Josué Mulaj", "S13002": "Madame Shekinah Mukeni",
    "S13003": "M Patrick Kalenga", "S13004": "M Arnaud Luela", "S13005": "Madame Nadine Zola"
};

window.trouverNom = () => {
    const mat = document.getElementById('matricule').value;
    document.getElementById('nom-display').innerText = employes[mat] || "Matricule inconnu";
};

window.login = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('pointage-form').style.display = 'block';
    } catch { alert("Erreur connexion"); }
};

window.pointer = async (type) => {
    const mat = document.getElementById('matricule').value;
    const lieu = document.getElementById('lieu').value;
    const video = document.getElementById('video');
    video.style.display = 'block';
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    setTimeout(async () => {
        const canvas = document.getElementById('canvas');
        canvas.getContext('2d').drawImage(video, 0, 0, 200, 150);
        await addDoc(collection(db, "pointages"), {
            nom: employes[mat], lieu, type,
            photo: canvas.toDataURL('image/jpeg'),
            timestamp: new Date().toLocaleString()
        });
        alert("Pointage enregistré !");
        stream.getTracks().forEach(t => t.stop());
        video.style.display = 'none';
    }, 2000);
};

window.toggleAdmin = async () => {
    const panel = document.getElementById('admin-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
        const snapshot = await getDocs(query(collection(db, "pointages"), orderBy("timestamp", "desc")));
        const table = document.getElementById('table-pointages');
        table.innerHTML = "<tr><th>Agent</th><th>Lieu</th><th>Type</th></tr>";
        snapshot.forEach(doc => {
            const d = doc.data();
            table.innerHTML += `<tr><td>${d.nom}</td><td>${d.lieu}</td><td>${d.type}</td></tr>`;
        });
    }
};

window.logout = () => { signOut(auth).then(() => location.reload()); };
