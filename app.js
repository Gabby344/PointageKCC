// app.js
import { auth, db, storage, validLocations, initializeDatabase } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDoc, 
    doc, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
    ref, 
    uploadString, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Initialisation de la base de données
initializeDatabase();

// Variables globales
let currentEmployee = null;
let currentPhoto = null;
let currentLocation = null;
let videoStream = null;

// Vérification de l'état d'authentification
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ Utilisateur connecté:", user.email);
    }
});

// Fonction de connexion admin
window.adminLogin = async () => {
    const email = document.getElementById('adminEmail')?.value;
    const password = document.getElementById('adminPassword')?.value;
    
    if (!email || !password) {
        showMessage('⚠️ Veuillez remplir tous les champs');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage('✅ Connexion réussie, redirection...');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-credential') {
            showMessage('❌ Email ou mot de passe incorrect');
        } else if (error.code === 'auth/too-many-requests') {
            showMessage('🔒 Trop de tentatives. Réessayez plus tard');
        } else {
            showMessage('❌ Erreur de connexion: ' + error.message);
        }
    }
};

// Affichage du mode travailleur
window.showWorkerPointage = () => {
    const loginSection = document.getElementById('loginSection');
    const pointageSection = document.getElementById('pointageSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (pointageSection) pointageSection.style.display = 'block';
    
    requestLocation();
};

// Demande de géolocalisation
const requestLocation = () => {
    const statusDiv = document.getElementById('locationStatus');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = '<span class="dot yellow"></span> ⏳ Activation GPS...';
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                statusDiv.innerHTML = '<span class="dot green"></span> ✅ GPS activé';
                statusDiv.className = 'status-badge success';
                console.log("📍 Position:", currentLocation);
            },
            (error) => {
                let errorMsg = "❌ Échec GPS";
                if (error.code === 1) errorMsg = "❌ Autorisez la géolocalisation";
                if (error.code === 2) errorMsg = "❌ Position non disponible";
                if (error.code === 3) errorMsg = "❌ Délai dépassé";
                
                statusDiv.innerHTML = `<span class="dot red"></span> ${errorMsg}`;
                statusDiv.className = 'status-badge error';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        statusDiv.innerHTML = '<span class="dot red"></span> ❌ GPS non supporté';
        statusDiv.className = 'status-badge error';
    }
};

// Recherche d'employé
window.findEmployee = async () => {
    const matricule = document.getElementById('matricule')?.value;
    const employeeNameDiv = document.getElementById('employeeName');
    const photoSection = document.getElementById('photoSection');
    
    if (!matricule || matricule.length < 3) {
        if (employeeNameDiv) employeeNameDiv.innerHTML = '';
        currentEmployee = null;
        updateButtons();
        return;
    }
    
    try {
        const workerRef = doc(db, "workers", matricule);
        const workerSnap = await getDoc(workerRef);
        
        if (workerSnap.exists()) {
            currentEmployee = workerSnap.data();
            if (employeeNameDiv) {
                employeeNameDiv.innerHTML = `<span class="success">✅ ${currentEmployee.name}</span>`;
            }
            if (photoSection) photoSection.style.display = 'block';
            startCamera();
        } else {
            if (employeeNameDiv) {
                employeeNameDiv.innerHTML = '<span class="error">❌ Matricule invalide</span>';
            }
            if (photoSection) photoSection.style.display = 'none';
            currentEmployee = null;
            stopCamera();
        }
        updateButtons();
    } catch (error) {
        console.error("Erreur recherche:", error);
        showMessage("❌ Erreur de connexion à la base");
    }
};

// Démarrage caméra
const startCamera = async () => {
    const video = document.getElementById('video');
    if (!video) return;
    
    try {
        if (videoStream) stopCamera();
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = videoStream;
        await video.play();
    } catch (err) {
        console.error("Erreur caméra:", err);
        showMessage("❌ Impossible d'accéder à la caméra");
    }
};

// Arrêt caméra
const stopCamera = () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    const video = document.getElementById('video');
    if (video) video.srcObject = null;
};

// Capture photo
window.capturePhoto = () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photoPreview = document.getElementById('photoPreview');
    
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    currentPhoto = canvas.toDataURL('image/jpeg', 0.8);
    
    if (photoPreview) {
        photoPreview.innerHTML = `<img src="${currentPhoto}" class="photo-captured">`;
        photoPreview.style.display = 'block';
    }
    
    updateButtons();
    showMessage("📸 Photo prise avec succès", true);
};

// Validation de localisation
const validateLocation = (location, site) => {
    if (!location || !validLocations[site]) return false;
    
    const siteLoc = validLocations[site];
    const R = 6371e3;
    const φ1 = location.lat * Math.PI/180;
    const φ2 = siteLoc.lat * Math.PI/180;
    const Δφ = (siteLoc.lat - location.lat) * Math.PI/180;
    const Δλ = (siteLoc.lng - location.lng) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    console.log(`Distance au site: ${Math.round(distance)}m (max: ${siteLoc.radius}m)`);
    return distance <= siteLoc.radius;
};

// Enregistrement arrivée
window.registerArrival = async () => {
    if (!validatePointage()) return;
    
    const site = document.getElementById('workLocation')?.value;
    if (!validateLocation(currentLocation, site)) {
        showMessage("❌ Vous n'êtes pas à l'emplacement autorisé pour ce site!");
        return;
    }
    
    await savePointage("Arrivée");
};

// Enregistrement départ
window.registerDeparture = async () => {
    if (!validatePointage()) return;
    await savePointage("Départ");
};

// Validation avant pointage
const validatePointage = () => {
    if (!currentEmployee) {
        showMessage("⚠️ Veuillez entrer un matricule valide");
        return false;
    }
    if (!currentPhoto) {
        showMessage("⚠️ Veuillez prendre une photo");
        return false;
    }
    const site = document.getElementById('workLocation')?.value;
    if (!site) {
        showMessage("⚠️ Veuillez sélectionner un lieu");
        return false;
    }
    if (!currentLocation) {
        showMessage("⚠️ Veuillez activer la géolocalisation");
        return false;
    }
    return true;
};

// Sauvegarde du pointage
const savePointage = async (type) => {
    showMessage("⏳ Enregistrement en cours...", false);
    
    try {
        const site = document.getElementById('workLocation').value;
        const siteSelect = document.getElementById('workLocation');
        const siteName = siteSelect.options[siteSelect.selectedIndex]?.text || site;
        
        // Upload photo
        const photoRef = ref(storage, `pointages/${Date.now()}_${currentEmployee.matricule}.jpg`);
        await uploadString(photoRef, currentPhoto, 'data_url');
        const photoURL = await getDownloadURL(photoRef);
        
        // Sauvegarde
        await addDoc(collection(db, "pointages"), {
            matricule: currentEmployee.matricule,
            nom: currentEmployee.name,
            lieu: site,
            lieuName: siteName,
            type: type,
            photoURL: photoURL,
            location: currentLocation,
            timestamp: Timestamp.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR')
        });
        
        showMessage(`✅ ${type} enregistrée avec succès!`);
        resetPointage();
        
    } catch (error) {
        console.error("Erreur sauvegarde:", error);
        showMessage("❌ Erreur lors de l'enregistrement");
    }
};

// Réinitialisation formulaire
const resetPointage = () => {
    currentPhoto = null;
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        photoPreview.innerHTML = '';
        photoPreview.style.display = 'none';
    }
    
    const matricule = document.getElementById('matricule');
    const workLocation = document.getElementById('workLocation');
    const photoSection = document.getElementById('photoSection');
    const employeeName = document.getElementById('employeeName');
    
    if (matricule) matricule.value = '';
    if (workLocation) workLocation.value = '';
    if (photoSection) photoSection.style.display = 'none';
    if (employeeName) employeeName.innerHTML = '';
    
    currentEmployee = null;
    stopCamera();
    updateButtons();
};

// Mise à jour boutons
const updateButtons = () => {
    const arrivalBtn = document.getElementById('arrivalBtn');
    const departureBtn = document.getElementById('departureBtn');
    const enabled = currentEmployee && currentPhoto;
    
    if (arrivalBtn) arrivalBtn.disabled = !enabled;
    if (departureBtn) departureBtn.disabled = !enabled;
};

// Affichage message modal
window.showMessage = (message, autoClose = true) => {
    const modal = document.getElementById('successModal');
    const modalMessage = document.getElementById('modalMessage');
    
    if (!modal || !modalMessage) {
        alert(message);
        return;
    }
    
    modalMessage.textContent = message;
    modal.style.display = 'block';
    
    if (autoClose) {
        setTimeout(() => {
            modal.style.display = 'none';
        }, 2500);
    }
};

// Fermeture modal
window.closeModal = () => {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'none';
};

// Déconnexion
window.logout = async () => {
    stopCamera();
    try {
        await signOut(auth);
        showMessage("👋 Déconnexion réussie");
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error("Erreur déconnexion:", error);
        location.reload();
    }
};

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    console.log("📱 Application KCC Pointage chargée");
    
    // Fermeture modal au clic en dehors
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
});
