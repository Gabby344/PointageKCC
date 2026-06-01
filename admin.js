// admin.js
import { auth, db, initializeDatabase } from './firebase-config.js';
import { 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    doc, 
    setDoc, 
    deleteDoc, 
    getDoc, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let allPointages = [];
let siteChart = null;
let weeklyChart = null;

// Initialisation
initializeDatabase();

// Vérification authentification
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        console.log("✅ Admin connecté:", user.email);
        loadPointages();
        loadWorkers();
        // Rafraîchissement auto toutes les 30s
        setInterval(loadPointages, 30000);
    }
});

// Chargement des pointages
window.loadPointages = async () => {
    try {
        const q = query(collection(db, "pointages"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        allPointages = [];
        
        snapshot.forEach(doc => {
            allPointages.push({ id: doc.id, ...doc.data() });
        });
        
        displayPointages();
        updateStats();
        updateCharts();
    } catch (error) {
        console.error("Erreur chargement:", error);
        const tbody = document.getElementById('pointagesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">❌ Erreur de chargement</td></tr>';
        }
    }
};

// Affichage des pointages
const displayPointages = () => {
    const tbody = document.getElementById('pointagesTableBody');
    const dateFilter = document.getElementById('filterDate')?.value;
    const siteFilter = document.getElementById('filterSite')?.value;
    const typeFilter = document.getElementById('filterType')?.value;
    
    if (!tbody) return;
    
    let filtered = [...allPointages];
    
    if (dateFilter) {
        filtered = filtered.filter(p => p.date === dateFilter);
    }
    if (siteFilter) {
        filtered = filtered.filter(p => p.lieu === siteFilter);
    }
    if (typeFilter) {
        filtered = filtered.filter(p => p.type === typeFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">📭 Aucun pointage trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(pointage => `
        <tr>
            <td><strong>${escapeHtml(pointage.nom || 'N/A')}</strong></td>
            <td>${escapeHtml(pointage.matricule || 'N/A')}</td>
            <td>${escapeHtml(pointage.lieuName || pointage.lieu || 'N/A')}</td>
            <td><span class="badge ${pointage.type === 'Arrivée' ? 'badge-success' : 'badge-warning'}">${pointage.type || 'N/A'}</span></td>
            <td>${pointage.time || formatTimestamp(pointage.timestamp)}</td>
            <td>
                ${pointage.location ? 
                    `<span class="location-info" onclick="showLocationOnMap(${pointage.location.lat}, ${pointage.location.lng})">
                        📍 ${pointage.location.lat.toFixed(4)}, ${pointage.location.lng.toFixed(4)}
                    </span>` : 
                    '❌ Non disponible'}
            </td>
            <td>
                ${pointage.photoURL ? 
                    `<img src="${pointage.photoURL}" class="thumbnail" onclick="viewPhoto('${pointage.photoURL}')">` : 
                    '❌ Non disponible'}
            </td>
        </tr>
    `).join('');
};

// Échappement HTML
const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Formatage timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleTimeString('fr-FR');
    }
    return new Date(timestamp).toLocaleTimeString('fr-FR');
};

// Mise à jour statistiques
const updateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayPointages = allPointages.filter(p => p.date === today);
    
    const uniqueWorkers = new Set(todayPointages.map(p => p.matricule)).size;
    const arrivals = todayPointages.filter(p => p.type === 'Arrivée').length;
    const uniqueSites = new Set(todayPointages.map(p => p.lieu)).size;
    
    // Retards après 8h30
    const lateCount = todayPointages.filter(p => {
        if (p.type !== 'Arrivée') return false;
        const time = p.time || formatTimestamp(p.timestamp);
        return time > '08:30:00';
    }).length;
    
    const totalWorkersEl = document.getElementById('totalWorkers');
    const presentTodayEl = document.getElementById('presentToday');
    const activeSitesEl = document.getElementById('activeSites');
    const lateTodayEl = document.getElementById('lateToday');
    
    if (totalWorkersEl) totalWorkersEl.textContent = uniqueWorkers;
    if (presentTodayEl) presentTodayEl.textContent = arrivals;
    if (activeSitesEl) activeSitesEl.textContent = uniqueSites;
    if (lateTodayEl) lateTodayEl.textContent = lateCount;
};

// Mise à jour graphiques
const updateCharts = () => {
    // Graphique par site
    const siteCounts = {};
    allPointages.forEach(p => {
        const site = p.lieuName || p.lieu;
        if (site) siteCounts[site] = (siteCounts[site] || 0) + 1;
    });
    
    const siteCtx = document.getElementById('siteChart')?.getContext('2d');
    if (siteCtx) {
        if (siteChart) siteChart.destroy();
        siteChart = new Chart(siteCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(siteCounts),
                datasets: [{
                    label: 'Nombre de pointages',
                    data: Object.values(siteCounts),
                    backgroundColor: '#003366',
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }
    
    // Graphique hebdomadaire
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    const dailyCounts = last7Days.map(date => 
        allPointages.filter(p => p.date === date).length
    );
    
    const weeklyCtx = document.getElementById('weeklyChart')?.getContext('2d');
    if (weeklyCtx) {
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(weeklyCtx, {
            type: 'line',
            data: {
                labels: last7Days.map(d => {
                    const date = new Date(d);
                    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Pointages par jour',
                    data: dailyCounts,
                    borderColor: '#ffcc00',
                    backgroundColor: 'rgba(255, 204, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }
};

// Application des filtres
window.applyFilters = () => {
    displayPointages();
};

// Export CSV
window.exportData = () => {
    const headers = ['Nom', 'Matricule', 'Lieu', 'Type', 'Date', 'Heure', 'Latitude', 'Longitude'];
    const csvData = allPointages.map(p => [
        p.nom || '',
        p.matricule || '',
        p.lieuName || p.lieu || '',
        p.type || '',
        p.date || '',
        p.time || '',
        p.location?.lat || '',
        p.location?.lng || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `pointages_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("📊 Export CSV réussi");
};

// Chargement liste travailleurs
window.loadWorkers = async () => {
    try {
        const workersRef = collection(db, "workers");
        const snapshot = await getDocs(workersRef);
        const workers = [];
        snapshot.forEach(doc => workers.push({ id: doc.id, ...doc.data() }));
        
        const workersList = document.getElementById('workersList');
        if (!workersList) return;
        
        if (workers.length === 0) {
            workersList.innerHTML = '<p style="text-align:center; color:#666;">Aucun travailleur enregistré</p>';
            return;
        }
        
        workersList.innerHTML = workers.map(worker => `
            <div class="worker-item">
                <span><strong>${escapeHtml(worker.matricule)}</strong> - ${escapeHtml(worker.name)}</span>
                <button class="btn-small btn-danger" onclick="deleteWorker('${worker.matricule}')">🗑 Supprimer</button>
            </div>
        `).join('');
    } catch (error) {
        console.error("Erreur chargement workers:", error);
    }
};

// Ajout travailleur
window.addWorker = async () => {
    const matricule = document.getElementById('newMatricule')?.value.trim();
    const name = document.getElementById('newName')?.value.trim();
    
    if (!matricule || !name) {
        alert('⚠️ Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const workerRef = doc(db, "workers", matricule);
        const existing = await getDoc(workerRef);
        
        if (existing.exists()) {
            alert('❌ Ce matricule existe déjà !');
            return;
        }
        
        await setDoc(workerRef, {
            matricule,
            name,
            active: true,
            createdAt: Timestamp.now()
        });
        
        if (document.getElementById('newMatricule')) document.getElementById('newMatricule').value = '';
        if (document.getElementById('newName')) document.getElementById('newName').value = '';
        
        await loadWorkers();
        showToast('✅ Travailleur ajouté avec succès');
    } catch (error) {
        console.error("Erreur ajout:", error);
        alert('❌ Erreur lors de l\'ajout');
    }
};

// Suppression travailleur
window.deleteWorker = async (matricule) => {
    if (confirm(`⚠️ Supprimer définitivement le travailleur ${matricule} ?`)) {
        try {
            await deleteDoc(doc(db, "workers", matricule));
            await loadWorkers();
            showToast('🗑 Travailleur supprimé');
        } catch (error) {
            console.error("Erreur suppression:", error);
            alert('❌ Erreur lors de la suppression');
        }
    }
};

// Affichage sur carte
window.showLocationOnMap = (lat, lng) => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`, '_blank');
};

// Visualisation photo
window.viewPhoto = (photoURL) => {
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    modal.innerHTML = `
        <div class="photo-modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <img src="${photoURL}" style="max-width:100%; max-height:80vh; border-radius:10px;">
        </div>
    `;
    document.body.appendChild(modal);
};

// Toast notification
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
};

// Déconnexion admin
window.adminLogout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erreur déconnexion:", error);
    }
};

// Animation CSS pour toast
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(20px); }
    }
`;
document.head.appendChild(style);
