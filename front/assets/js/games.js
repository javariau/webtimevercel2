// Game Logic for History Mini Games

// --- MAP QUIZ GAME ---
const mapQuestions = [
    { question: 'Di mana Proklamasi Kemerdekaan dibacakan?', lat: -6.2023, lng: 106.8488, hint: 'Jalan Pegangsaan Timur 56, Jakarta' },
    { question: 'Lokasi Pertempuran 10 November?', lat: -7.2575, lng: 112.7521, hint: 'Kota Pahlawan, Jawa Timur' },
    { question: 'Di mana Candi Borobudur berada?', lat: -7.6079, lng: 110.2038, hint: 'Magelang, Jawa Tengah' },
    { question: 'Ibukota Kerajaan Majapahit (Trowulan)?', lat: -7.5583, lng: 112.3780, hint: 'Mojokerto, Jawa Timur' },
    { question: 'Lokasi Perjanjian Linggarjati?', lat: -6.8833, lng: 108.4833, hint: 'Kuningan, Jawa Barat' },
    { question: 'Tempat pengasingan Bung Karno di Ende?', lat: -8.8430, lng: 121.6625, hint: 'Flores, Nusa Tenggara Timur' },
    { question: 'Titik Nol Kilometer Indonesia?', lat: 5.8920, lng: 95.3211, hint: 'Sabang, Aceh' },
    { question: 'Istana Maimun peninggalan Kesultanan Deli?', lat: 3.5752, lng: 98.6859, hint: 'Medan, Sumatera Utara' },
    { question: 'Lokasi Perjanjian Renville (Kapal USS Renville)?', lat: -6.1099, lng: 106.8805, hint: 'Teluk Jakarta' },
    { question: 'Tempat Konferensi Asia Afrika (Gedung Merdeka)?', lat: -6.9210, lng: 107.6106, hint: 'Bandung, Jawa Barat' },
    { question: 'Lokasi Benteng Fort Rotterdam?', lat: -5.1331, lng: 119.4052, hint: 'Makassar, Sulawesi Selatan' },
    { question: 'Di mana Jembatan Ampera berada?', lat: -2.9918, lng: 104.7634, hint: 'Palembang, Sumatera Selatan' },
    { question: 'Lokasi Monumen Nasional (Monas)?', lat: -6.1754, lng: 106.8272, hint: 'Jakarta Pusat' },
    { question: 'Candi Prambanan?', lat: -7.7520, lng: 110.4915, hint: 'Sleman, Yogyakarta' },
    { question: 'Lokasi Tsunami Aceh 2004 (Museum Tsunami)?', lat: 5.5483, lng: 95.3167, hint: 'Banda Aceh' },
    { question: 'Di mana Makam Ir. Soekarno?', lat: -8.0833, lng: 112.1667, hint: 'Blitar, Jawa Timur' }
];

let mapInstance = null;
let currentMapQuestion = null;
let lastMapQuestions = []; // Track used questions

// --- MODAL & CONFETTI ---
function showVictory(message, points) {
    const modal = document.getElementById('victoryModal');
    const msgEl = document.getElementById('victoryMessage');
    const scoreEl = document.getElementById('victoryScore');
    
    if (modal) {
        if (msgEl) msgEl.textContent = message || 'Hebat! Kamu menyelesaikan tantangan.';
        if (scoreEl) scoreEl.textContent = points;
        
        modal.style.display = 'flex';
        // Trigger animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Confetti Effect
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }
}

function closeVictoryModal() {
    const modal = document.getElementById('victoryModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        
        // Auto trigger next game depending on context
        // Check which game is active
        const memoryArea = document.getElementById('memoryGameArea');
        const chronoArea = document.getElementById('chronologyGameArea');
        const mapArea = document.getElementById('mapGameArea');
        
        if (memoryArea && memoryArea.style.display !== 'none') {
             // Memory game finished, show restart button
             const restartBtn = document.getElementById('restartBtn');
             if (restartBtn) restartBtn.style.display = 'block';
        } else if (chronoArea && chronoArea.style.display !== 'none') {
             initChronologyGame(); // Auto next
        } else if (mapArea && mapArea.style.display !== 'none') {
             initMapGame(); // Auto next
        }
    }
}

function initMapGame() {
    // Clean up
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }
    
    // UI Reset
    const feedback = document.getElementById('mapFeedback');
    const nextBtn = document.getElementById('nextMapBtn');
    if (feedback) feedback.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    
    // --- NO REPEAT LOGIC ---
    // Filter available questions (exclude last used ones)
    let availableQuestions = mapQuestions.filter(q => !lastMapQuestions.includes(q.question));
    
    // If running out, reset history (keep last one to avoid immediate repeat)
    if (availableQuestions.length === 0) {
        lastMapQuestions = [];
        availableQuestions = mapQuestions;
    }

    // Pick random
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentMapQuestion = availableQuestions[randomIndex];
    
    // Add to history
    lastMapQuestions.push(currentMapQuestion.question);
    
    // Display
    const qEl = document.getElementById('mapQuestion');
    if (qEl) qEl.textContent = currentMapQuestion.question;
    
    // Init Map
    // Center Indonesia roughly
    mapInstance = L.map('gameMap').setView([-2.5489, 118.0149], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
    
    // Click Handler
    mapInstance.on('click', (e) => handleMapClick(e));
}

function handleMapClick(e) {
    if (!currentMapQuestion || document.getElementById('nextMapBtn').style.display === 'inline-block') return;
    
    const { lat, lng } = e.latlng;
    const correctLat = currentMapQuestion.lat;
    const correctLng = currentMapQuestion.lng;
    
    // Calculate Distance (Haversine Formula approx)
    const R = 6371; // Earth radius km
    const dLat = (lat - correctLat) * Math.PI / 180;
    const dLng = (lng - correctLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(correctLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // in km
    
    // Logic Scoring
    let isCorrect = false;
    let message = '';
    let color = '';
    let points = 0;
    
    if (distance < 50) { // < 50km considered correct
        isCorrect = true;
        message = `Hebat! Sangat akurat (${Math.round(distance)} km).`;
        color = 'var(--green)';
        points = 20;
    } else if (distance < 300) { // < 300km close enough
        isCorrect = true;
        message = `Lumayan! Jaraknya sekitar ${Math.round(distance)} km.`;
        color = '#fbc02d'; // Yellow/Orange
        points = 10;
    } else {
        isCorrect = false;
        message = `Kurang tepat. Jaraknya ${Math.round(distance)} km dari lokasi.`;
        color = '#e53935'; // Red
    }
    
    // Show User Marker
    L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-icon',
            html: `<i class="fas fa-map-marker-alt" style="color:${color};font-size:32px;text-shadow: 0 2px 5px rgba(0,0,0,0.3);"></i>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(mapInstance);
    
    // Show Correct Marker
    const correctMarker = L.marker([correctLat, correctLng], {
        icon: L.divIcon({
            className: 'custom-icon',
            html: `<i class="fas fa-flag-checkered" style="color:var(--green);font-size:32px;text-shadow: 0 2px 5px rgba(0,0,0,0.3);"></i>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(mapInstance).bindPopup(`<b>${currentMapQuestion.hint}</b>`).openPopup();
    
    // Draw line
    L.polyline([[lat, lng], [correctLat, correctLng]], { color: color, dashArray: '5, 10' }).addTo(mapInstance);
    
    // Feedback UI
    const feedback = document.getElementById('mapFeedback');
    feedback.style.display = 'block';
    feedback.style.background = isCorrect ? '#e8f5e9' : '#ffebee';
    feedback.style.border = `1px solid ${color}`;
    feedback.innerHTML = `
        <strong style="color:${color}">${isCorrect ? 'BENAR' : 'SALAH'}</strong><br>
        ${message}<br>
        <small>Lokasi: ${currentMapQuestion.hint}</small>
    `;
    
    const nextBtn = document.getElementById('nextMapBtn');
    
    if (points > 0) {
        updateScore(points);
        saveScore(points);
        setTimeout(() => showVictory(`Lokasi ditemukan! ${message}`, points), 1000);
    } else {
        nextBtn.style.display = 'inline-block';
    }
    
    // Zoom to fit bounds
    mapInstance.fitBounds([[lat, lng], [correctLat, correctLng]], { padding: [50, 50] });
}

function nextMapQuestion() {
    initMapGame();
}
// --- CHRONOLOGY GAME ---
const chronoData = [
    { title: 'Sumpah Pemuda', year: 1928 },
    { title: 'Proklamasi Kemerdekaan', year: 1945 },
    { title: 'Reformasi', year: 1998 },
    { title: 'Perang Diponegoro', year: 1825 },
    { title: 'Berdirinya Budi Utomo', year: 1908 },
    { title: 'Konferensi Meja Bundar', year: 1949 },
    { title: 'Dekrit Presiden', year: 1959 },
    { title: 'Sumpah Palapa', year: 1336 },
    { title: 'Bandung Lautan Api', year: 1946 },
    { title: 'Agresi Militer Belanda I', year: 1947 },
    { title: 'Supersemar', year: 1966 },
    { title: 'Peristiwa Rengasdengklok', year: 1945 },
    { title: 'Kudeta APRA', year: 1950 },
    { title: 'Pemilu Pertama', year: 1955 },
    { title: 'Trikora', year: 1961 },
    { title: 'G30S/PKI', year: 1965 },
    { title: 'Trisakti', year: 1998 },
    { title: 'Tsunami Aceh', year: 2004 },
    { title: 'Perjanjian Giyanti', year: 1755 },
    { title: 'Berdirinya VOC', year: 1602 },
    { title: 'Kebangkrutan VOC', year: 1799 },
    { title: 'Sumpah Pemuda', year: 1928 },
    { title: 'Politik Etis Dimulai', year: 1901 },
    { title: 'Konferensi Asia Afrika', year: 1955 }
];

let currentChronoItems = [];
let selectedChronoIndex = null;
let lastChronoIndices = []; // Track used indices

function initChronologyGame() {
    const list = document.getElementById('chronoList');
    const checkBtn = document.getElementById('checkChronoBtn');
    const nextBtn = document.getElementById('nextChronoBtn');
    
    if (!list) return;

    // Reset UI
    list.innerHTML = '';
    selectedChronoIndex = null;
    if (checkBtn) {
        checkBtn.style.display = 'inline-block';
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-check"></i> Cek Jawaban';
        checkBtn.style.background = 'var(--primary)';
        checkBtn.style.color = 'white';
        checkBtn.style.border = 'none';
        checkBtn.style.padding = '10px 20px';
        checkBtn.style.borderRadius = '8px';
        checkBtn.style.cursor = 'pointer';
    }
    if (nextBtn) {
        nextBtn.style.display = 'none';
        nextBtn.style.background = 'var(--primary)';
        nextBtn.style.color = 'white';
        nextBtn.style.border = 'none';
        nextBtn.style.padding = '10px 20px';
        nextBtn.style.borderRadius = '8px';
        nextBtn.style.cursor = 'pointer';
    }

    // --- NO REPEAT LOGIC ---
    // Create pool of available indices that are NOT in lastChronoIndices
    let availableIndices = chronoData.map((_, i) => i).filter(i => !lastChronoIndices.includes(i));
    
    // If pool is too small (< 4), reset history
    if (availableIndices.length < 4) {
        lastChronoIndices = [];
        availableIndices = chronoData.map((_, i) => i);
    }

    // Pick 4 random indices from available pool
    const selectedIndices = [];
    while (selectedIndices.length < 4) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const val = availableIndices[randomIndex];
        selectedIndices.push(val);
        availableIndices.splice(randomIndex, 1); // Remove picked to avoid duplicate in same round
    }

    // Save to history
    lastChronoIndices = [...lastChronoIndices, ...selectedIndices];

    // Get the actual items
    const shuffled = selectedIndices.map(i => chronoData[i]);
    
    // Sort them randomly for display (so user has to fix it)
    currentChronoItems = shuffled.sort(() => 0.5 - Math.random());
    
    renderChronologyList();
}

function renderChronologyList() {
    const list = document.getElementById('chronoList');
    if (!list) return;
    
    list.innerHTML = '';
    
    currentChronoItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'chrono-item';
        div.style.padding = '15px';
        div.style.background = 'white';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '12px';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.transition = 'all 0.2s';
        
        if (selectedChronoIndex === index) {
            div.style.borderColor = 'var(--primary)';
            div.style.background = '#e3f2fd';
            div.style.transform = 'scale(1.02)';
        }
        
        div.innerHTML = `
            <span style="font-weight: 600;">${item.title}</span>
            <i class="fas fa-grip-lines" style="color: var(--text-light);"></i>
        `;
        
        div.onclick = () => handleChronoClick(index);
        list.appendChild(div);
    });
}

function handleChronoClick(index) {
    // If nothing selected, select this
    if (selectedChronoIndex === null) {
        selectedChronoIndex = index;
    } else if (selectedChronoIndex === index) {
        // Deselect if clicking same
        selectedChronoIndex = null;
    } else {
        // Swap
        const temp = currentChronoItems[selectedChronoIndex];
        currentChronoItems[selectedChronoIndex] = currentChronoItems[index];
        currentChronoItems[index] = temp;
        selectedChronoIndex = null;
    }
    renderChronologyList();
}

function checkChronology() {
    const list = document.getElementById('chronoList');
    const items = list.children;
    let isCorrect = true;
    
    // Check order
    for (let i = 0; i < currentChronoItems.length - 1; i++) {
        if (currentChronoItems[i].year > currentChronoItems[i+1].year) {
            isCorrect = false;
            break;
        }
    }
    
    // Visual Feedback
    for (let i = 0; i < currentChronoItems.length; i++) {
        const item = currentChronoItems[i];
        const div = items[i];
        
        // Show year
        div.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <span style="font-weight: 600;">${item.title}</span>
                <span style="font-size: 12px; color: ${isCorrect ? 'var(--green)' : '#e53935'}; font-weight: bold;">${item.year}</span>
            </div>
            <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}" style="color: ${isCorrect ? 'var(--green)' : '#e53935'}; font-size: 20px;"></i>
        `;
        
        div.style.borderColor = isCorrect ? 'var(--green)' : '#e53935';
        div.style.background = isCorrect ? '#e8f5e9' : '#ffebee';
        div.onclick = null; // Disable clicks
    }
    
    const checkBtn = document.getElementById('checkChronoBtn');
    const nextBtn = document.getElementById('nextChronoBtn');
    
    if (isCorrect) {
        checkBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
        updateScore(20);
        saveScore(20);
        setTimeout(() => showVictory('Susunan kronologi tepat!', 20), 500);
    } else {
        checkBtn.innerHTML = '<i class="fas fa-times"></i> Salah, Coba Lagi';
        checkBtn.style.background = '#e53935';
        checkBtn.disabled = true;
        
        setTimeout(() => {
            // Reset button state for retry
            checkBtn.innerHTML = '<i class="fas fa-check"></i> Cek Jawaban';
            checkBtn.style.background = 'var(--primary)';
            checkBtn.disabled = false;
        }, 1500);
    }
}
let memoryCards = [];
let flippedCards = [];
let matchedPairs = 0;
let score = 0;
let isLocked = false;
let currentMemoryData = [];

// --- DATA PENGETAHUAN UMUM SEJARAH (UNTUK VARIASI) ---
const generalHistoryData = [
    { title: 'Candi Borobudur', desc: 'Candi Buddha Terbesar' },
    { title: 'Sumpah Pemuda', desc: '28 Oktober 1928' },
    { title: 'Kerajaan Kutai', desc: 'Kerajaan Hindu Tertua' },
    { title: 'G30S/PKI', desc: 'Tragedi 1965' },
    { title: 'KMB 1949', desc: 'Pengakuan Kedaulatan' },
    { title: 'Dekrit Presiden', desc: '5 Juli 1959' },
    { title: 'Supersemar', desc: 'Surat Perintah 11 Maret' },
    { title: 'Bandung Lautan Api', desc: 'Bumi Hangus 1946' },
    { title: 'Pertempuran Surabaya', desc: '10 November 1945' },
    { title: 'Raden Saleh', desc: 'Pelukis Romantisme' },
    { title: 'Perjanjian Renville', desc: 'Garis Demarkasi' },
    { title: 'Perjanjian Linggarjati', desc: '1946' },
    { title: 'Sumpah Palapa', desc: 'Gajah Mada' },
    { title: 'Kerajaan Sriwijaya', desc: 'Kerajaan Maritim' },
    { title: 'Tanam Paksa', desc: 'Van den Bosch' },
    { title: 'Politik Etis', desc: 'Balas Budi' },
    { title: 'Organisasi Budi Utomo', desc: 'Kebangkitan Nasional' },
    { title: 'Sarekat Islam', desc: 'H.O.S Cokroaminoto' },
    { title: 'Trikora', desc: 'Pembebasan Irian Barat' },
    { title: 'Konferensi Asia Afrika', desc: 'Bandung 1955' },
    { title: 'Kerajaan Demak', desc: 'Kerajaan Islam Pertama' },
    { title: 'Perang Aceh', desc: 'Cut Nyak Dien' },
    { title: 'Puputan Margarana', desc: 'I Gusti Ngurah Rai' },
    { title: 'Serangan Umum 1 Maret', desc: 'Yogyakarta 1949' }
];

function startGame(gameType) {
    const menu = document.getElementById('gameMenu');
    const container = document.getElementById('gameContainer');
    
    // Areas
    const memoryArea = document.getElementById('memoryGameArea');
    const chronoArea = document.getElementById('chronologyGameArea');
    const mapArea = document.getElementById('mapGameArea');

    if (menu && container) {
        menu.style.display = 'none';
        container.style.display = 'block';
        
        // Hide all areas first
        if (memoryArea) memoryArea.style.display = 'none';
        if (chronoArea) chronoArea.style.display = 'none';
        if (mapArea) mapArea.style.display = 'none';

        if (gameType === 'memory') {
            if (memoryArea) memoryArea.style.display = 'block';
            initMemoryGame();
        } else if (gameType === 'chronology') {
            if (chronoArea) chronoArea.style.display = 'block';
            initChronologyGame();
        } else if (gameType === 'map') {
            if (mapArea) mapArea.style.display = 'block';
            initMapGame();
        }
    }
}

function exitGame() {
    const menu = document.getElementById('gameMenu');
    const container = document.getElementById('gameContainer');
    
    if (menu && container) {
        menu.style.display = 'grid'; // Restore grid layout
        container.style.display = 'none';
        resetMemoryGame();
        // Reset Chrono if needed
        const chronoList = document.getElementById('chronoList');
        if (chronoList) chronoList.innerHTML = '';
        
        // Reset Map
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
        }
    }
}

async function fetchMemoryDataFromDB() {
    try {
        const sb = await getSupabaseClient();
        
        // Ambil data materi dari database (ambil agak banyak untuk pool)
        const { data, error } = await sb
            .from('materi')
            .select('title, subtitle, summary')
            .limit(30);

        // Gabungkan data DB dan General
        let combinedData = [];

        // 1. Tambahkan data dari DB
        if (!error && data) {
            data.forEach(item => {
                let desc = item.subtitle || (item.summary ? item.summary.slice(0, 25) + '...' : 'Deskripsi');
                if (desc.length > 30) desc = desc.slice(0, 30) + '...';
                combinedData.push({
                    title: item.title,
                    desc: desc
                });
            });
        }

        // 2. Tambahkan data General (Pengetahuan Umum)
        combinedData = [...combinedData, ...generalHistoryData];

        if (combinedData.length < 3) {
            // Fallback jika data sangat sedikit
            throw new Error('Data kurang');
        }

        // --- NO REPEAT LOGIC ---
        // Filter out items used in previous round (stored in lastMemoryTitles)
        // If undefined, init it
        if (typeof window.lastMemoryTitles === 'undefined') window.lastMemoryTitles = [];

        let availablePool = combinedData.filter(item => !window.lastMemoryTitles.includes(item.title));
        
        // If pool exhausted (less than 6 needed), reset history
        if (availablePool.length < 6) {
            window.lastMemoryTitles = [];
            availablePool = combinedData;
        }

        // Shuffle available pool and take 6
        const shuffled = availablePool.sort(() => 0.5 - Math.random()).slice(0, 6);
        
        // Save these titles to history for next round
        window.lastMemoryTitles = shuffled.map(item => item.title);
        
        // Transform ke format game
        const gameData = [];
        shuffled.forEach((item, index) => {
            const cardId = index + 1;
            const pairId = 100 + cardId;
            
            // Kartu 1: Judul (Tokoh/Peristiwa)
            gameData.push({
                id: cardId,
                name: item.title,
                type: 'tokoh',
                pairId: pairId
            });
            
            // Kartu 2: Deskripsi
            gameData.push({
                id: pairId,
                name: item.desc,
                type: 'desc',
                pairId: cardId
            });
        });
        
        return gameData;

    } catch (err) {
        console.error('Gagal fetch data game:', err);
        // Fallback Data Statis
        return [
            { id: 1, name: 'Ir. Soekarno', type: 'tokoh', pairId: 101 },
            { id: 101, name: 'Proklamator', type: 'desc', pairId: 1 },
            { id: 2, name: 'Pangeran Diponegoro', type: 'tokoh', pairId: 102 },
            { id: 102, name: 'Perang Jawa', type: 'desc', pairId: 2 },
            { id: 3, name: 'R.A. Kartini', type: 'tokoh', pairId: 103 },
            { id: 103, name: 'Emansipasi', type: 'desc', pairId: 3 },
            { id: 4, name: 'Kapitan Pattimura', type: 'tokoh', pairId: 104 },
            { id: 104, name: 'Maluku', type: 'desc', pairId: 4 },
            { id: 5, name: 'Jenderal Sudirman', type: 'tokoh', pairId: 105 },
            { id: 105, name: 'Gerilya', type: 'desc', pairId: 5 },
            { id: 6, name: 'B.J. Habibie', type: 'tokoh', pairId: 106 },
            { id: 106, name: 'Teknologi', type: 'desc', pairId: 6 }
        ];
    }
}

async function initMemoryGame() {
    const grid = document.getElementById('memoryGrid');
    const restartBtn = document.getElementById('restartBtn');
    const scoreEl = document.getElementById('gameScore');
    
    if (!grid) return;
    
    // Show Loading
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Mengacak kartu...</p></div>';
    if (restartBtn) restartBtn.style.display = 'none';

    // Reset state
    matchedPairs = 0;
    score = 0;
    flippedCards = [];
    isLocked = false;
    if (scoreEl) scoreEl.textContent = '0';
    
    // Fetch Data
    currentMemoryData = await fetchMemoryDataFromDB();
    
    // Shuffle cards
    memoryCards = [...currentMemoryData].sort(() => 0.5 - Math.random());
    
    // Render
    grid.innerHTML = '';
    memoryCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'game-card-container';
        cardEl.dataset.id = card.id;
        cardEl.dataset.pairId = card.pairId;
        
        cardEl.innerHTML = `
            <div class="game-card">
                <div class="game-card-face game-card-front">
                    <i class="fas ${card.type === 'tokoh' ? 'fa-user-tie' : 'fa-scroll'}" style="font-size: 24px; margin-bottom: 5px; color: var(--primary);"></i>
                    <span>${card.name}</span>
                </div>
                <div class="game-card-face game-card-back">
                    <i class="fas fa-question" style="font-size: 24px;"></i>
                </div>
            </div>
        `;
        
        cardEl.addEventListener('click', () => flipCard(cardEl));
        grid.appendChild(cardEl);
    });
}

function flipCard(cardEl) {
    if (isLocked) return;
    if (cardEl.querySelector('.game-card').classList.contains('flipped')) return; // Already flipped
    
    const cardInner = cardEl.querySelector('.game-card');
    cardInner.classList.add('flipped');
    
    flippedCards.push(cardEl);
    
    if (flippedCards.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    isLocked = true;
    
    const [card1, card2] = flippedCards;
    const id1 = parseInt(card1.dataset.id);
    const pair1 = parseInt(card1.dataset.pairId);
    const id2 = parseInt(card2.dataset.id);
    
    // Check logic: id1 must equal pair2 OR pair1 must equal id2
    const isMatch = (id1 === parseInt(card2.dataset.pairId));
    
    if (isMatch) {
        disableCards();
        updateScore(10);
        matchedPairs++;
        
        if (matchedPairs === currentMemoryData.length / 2) {
            saveScore(score);
            setTimeout(() => {
                showVictory(`Selamat! Kamu menyelesaikan game dengan skor ${score}.`, score);
            }, 500);
        }
    } else {
        unflipCards();
    }
}

function disableCards() {
    flippedCards.forEach(card => {
        const inner = card.querySelector('.game-card');
        inner.classList.add('matched');
    });
    flippedCards = [];
    isLocked = false;
}

function unflipCards() {
    setTimeout(() => {
        flippedCards.forEach(card => {
            const inner = card.querySelector('.game-card');
            inner.classList.remove('flipped');
        });
        flippedCards = [];
        isLocked = false;
    }, 1000);
}

function updateScore(points) {
    score += points;
    const scoreEl = document.getElementById('gameScore');
    if (scoreEl) scoreEl.textContent = score;
}

function resetMemoryGame() {
    const grid = document.getElementById('memoryGrid');
    if (grid) grid.innerHTML = '';
}

async function saveScore(finalScore) {
    // Integrate with Supabase if needed
    console.log('Game Finished. Score:', finalScore);
    
    try {
        if (typeof getSupabaseClient === 'function') {
            const sb = await getSupabaseClient();
            const { data: { user } } = await sb.auth.getUser();
            
            if (user) {
                // Update profile XP (Points) & Badges
                // Ideally this should be an RPC or checked against daily limits
                const { data: profile } = await sb.from('profiles').select('points, badges').eq('id', user.id).single();
                if (profile) {
                    const newPoints = (profile.points || 0) + finalScore;
                    
                    // Logika Badge Game: Setiap menang/selesai dapat 1 Badge tambahan (jika skor > 0)
                    let currentBadges = 0;
                    if (typeof profile.badges === 'number') currentBadges = profile.badges;
                    else if (Array.isArray(profile.badges)) currentBadges = profile.badges.length;
                    
                    const badgesEarned = finalScore > 0 ? 1 : 0;
                    const newBadges = currentBadges + badgesEarned;

                    const { error } = await sb.from('profiles').update({ 
                        points: newPoints,
                        badges: newBadges
                    }).eq('id', user.id);
                    
                    if (!error) {
                        console.log('XP (Points) Updated:', newPoints, 'Badges:', newBadges);
                        
                        // Show visual feedback for badge
                        if (badgesEarned > 0) {
                            // Coba tampilkan notifikasi badge jika memungkinkan
                            // alert('Kamu dapat 1 Badge!'); // Terlalu mengganggu, skip saja
                        }
                        
                        // Track Daily Task: Play Game
                        if (typeof window.trackDailyTask === 'function') {
                            window.trackDailyTask('play_game', 1);
                        }

                        // Refresh UI Dashboard segera setelah update berhasil
                        if (typeof window.updateUserUI === 'function') {
                            window.updateUserUI();
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to save score:', e);
    }
}
