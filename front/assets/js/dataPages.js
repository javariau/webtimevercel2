function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function initMateriPage_DISABLED() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('materi.html')) return;

        // Cek Status Premium User
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        const isPremium = user && user.user_metadata && user.user_metadata.plan === 'premium';

        const pillsContainer = document.getElementById('materiCategoryPills');
        const cardsContainer = document.getElementById('materiCards');
        
        // Handle Existing Premium Cards (Static HTML)
        const staticCards = document.querySelectorAll('.card[data-premium="true"]');
        staticCards.forEach(card => {
            if (!isPremium) {
                // Lock Content
                const btn = card.querySelector('button');
                if (btn) {
                    btn.textContent = 'Terkunci (Premium)';
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                    btn.style.opacity = '0.7';
                    btn.style.cursor = 'not-allowed';
                    btn.onclick = (e) => {
                        e.preventDefault();
                        alert('Materi ini khusus Premium. Silakan upgrade akun Anda.');
                        window.location.href = 'premium.html';
                    };
                }
                // Add Overlay
                const imgWrapper = card.querySelector('.card-image-wrapper');
                if (imgWrapper) {
                    const lockOverlay = document.createElement('div');
                    lockOverlay.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10;';
                    lockOverlay.innerHTML = '<i class="fas fa-lock" style="color:white; font-size:24px;"></i>';
                    imgWrapper.appendChild(lockOverlay);
                }
            }
        });

        // Fetch Categories from Supabase
        const { data: categories } = await sb
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (pillsContainer && categories) {
            pillsContainer.innerHTML = `
                <button class="pill active" data-id="all">Semua</button>
                ${categories.map(c => `<button class="pill" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
            `;
        }

        // Logic Fetch Materi Dinamis
        // Coba fetch tanpa join dulu untuk memastikan data ada
        let query = sb
            .from('learning_materials')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: materials, error: matErr } = await query;

        if (matErr) {
            console.error('Error fetch materials:', matErr);
            if (cardsContainer) {
                cardsContainer.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: red;">
                    Error memuat materi: ${matErr.message}
                </div>`;
            }
            return;
        }

        if (cardsContainer && materials) {
            if (materials.length === 0) {
                cardsContainer.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; text-align: center;">
                    Belum ada materi tersedia.
                </div>`;
                return;
            }

            // Render kartu materi
            cardsContainer.innerHTML = materials.map(m => {
                // Gunakan category_id atau string default jika tidak ada join
                const categoryName = m.category_id ? 'Materi Sejarah' : 'Umum'; 
                
                // Override: Materi tidak dikunci (sesuai permintaan user)
                const isLocked = false; 
                
                return `
                <div class="card" style="display: flex; flex-direction: column; overflow: hidden;">
                    <div class="card-image-wrapper" style="width: 100%; height: 180px; position: relative;">
                        <img src="${escapeHtml(m.image_url || 'assets/img/placeholder.jpg')}" alt="${escapeHtml(m.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                        ${m.is_premium ? `<span class="badge-premium"><i class="fas fa-crown"></i> Premium</span>` : ''}
                        ${isLocked ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10;"><i class="fas fa-lock" style="color:white; font-size:32px;"></i></div>` : ''}
                    </div>
                    <div class="card-content" style="flex: 1; display: flex; flex-direction: column; padding: 16px;">
                        <div class="card-meta">${escapeHtml(categoryName)}</div>
                        <h3 class="card-title" style="margin: 8px 0; font-size: 18px; line-height: 1.4;">${escapeHtml(m.title)}</h3>
                        <p class="card-text" style="margin-bottom: 16px; flex: 1;">${escapeHtml(m.description || '')}</p>
                        ${isLocked 
                            ? `<button class="btn-secondary" style="width: 100%; opacity: 0.7; cursor: not-allowed;" onclick="alert('Materi ini khusus Premium. Silakan upgrade akun Anda.'); window.location.href='premium.html';">Terkunci (Premium)</button>`
                            : `<a href="materi-detail.html?id=${m.id}" class="btn-primary" style="width: 100%; text-align: center; text-decoration: none; display: inline-block;">Baca Materi</a>`
                        }
                    </div>
                </div>`;
            }).join('');
        }

    } catch (e) {
        console.error('Materi page error:', e);
    }
}

async function initTimelinePage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('timeline.html')) return;
        
        const wrapper = document.querySelector('.content-wrapper');
        if (!wrapper) return;

        // Premium Check
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;

        if (!premiumOk) {
            wrapper.innerHTML = `
                <div class="card" style="padding: 18px;">
                    <div class="card-meta">Premium</div>
                    <h3 class="card-title" style="margin-top: 6px;">Timeline & Peta Terkunci</h3>
                    <p class="card-text">Upgrade Premium untuk membuka fitur peta dan timeline lengkap.</p>
                    <div style="margin-top: 14px;">
                        <a href="premium.html" class="btn-primary" style="display:inline-block; text-decoration:none;">Buka Premium</a>
                    </div>
                </div>`;
            return;
        }

        const mapContainer = document.getElementById('leafletMap');
        const eventsList = document.getElementById('eventsList');
        const timelineHeader = document.querySelector('#timelineEvents .card-meta');
        
        if (!mapContainer || !eventsList) return;

        // Initialize Leaflet Map
        const map = L.map('leafletMap').setView([-2.5, 118], 5); // Center of Indonesia

        // Base Layers
        const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        // Add default layer
        streets.addTo(map);

        // Layer Controls
        const baseMaps = {
            "Peta Jalan": streets,
            "Satelit": satellite
        };

        L.control.layers(baseMaps).addTo(map);

        // --- Fitur Kontribusi ---
        let isAddingMarker = false;
        const btnContribute = document.getElementById('btnContribute');
        const addMarkerInfo = document.getElementById('addMarkerInfo');
        const contribModal = document.getElementById('contributionModal');
        const btnCloseContrib = document.getElementById('btnCloseContrib');
        const contribForm = document.getElementById('contribForm');

        // Toggle Mode Tambah Marker
        if (btnContribute) {
            btnContribute.addEventListener('click', () => {
                isAddingMarker = !isAddingMarker;
                if (isAddingMarker) {
                    btnContribute.innerHTML = '<i class="fas fa-times-circle"></i> Batal';
                    btnContribute.style.background = '#e53935'; 
                    addMarkerInfo.style.display = 'block';
                    document.getElementById('leafletMap').style.cursor = 'crosshair';
                    map.doubleClickZoom.disable(); 
                } else {
                    btnContribute.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Lokasi';
                    btnContribute.style.background = ''; 
                    addMarkerInfo.style.display = 'none';
                    document.getElementById('leafletMap').style.cursor = '';
                    map.doubleClickZoom.enable(); 
                }
            });
        }

        // Klik Peta untuk Tambah Marker
        map.on('click', (e) => {
            if (!isAddingMarker) return;

            const { lat, lng } = e.latlng;
            
            // Isi hidden field koordinat
            document.getElementById('markerLat').value = lat;
            document.getElementById('markerLng').value = lng;

            // Buka Modal
            if (contribModal) {
                contribModal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important;';
                
                void contribModal.offsetWidth;
                setTimeout(() => {
                    const content = contribModal.querySelector('.modal-content');
                    if (content) content.classList.add('show');
                }, 10);
            }
        });

        // Tutup Modal
        if (btnCloseContrib && contribModal) {
            btnCloseContrib.addEventListener('click', () => {
                const content = contribModal.querySelector('.modal-content');
                if (content) content.classList.remove('show');
                setTimeout(() => {
                    contribModal.style.display = 'none';
                }, 300);
            });
        }

        // Submit Form Kontribusi
        if (contribForm) {
            contribForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = contribForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Mengirim...';
                submitBtn.disabled = true;

                const title = document.getElementById('contribTitle').value;
                const year = document.getElementById('contribYear').value;
                const category = document.getElementById('contribCategory').value;
                const desc = document.getElementById('contribDesc').value;
                const source = document.getElementById('contribSource').value;
                const lat = document.getElementById('markerLat').value;
                const lng = document.getElementById('markerLng').value;

                try {
                    // Validasi User Login
                    const sb = await getSupabaseClient();
                    const { data: { user } } = await sb.auth.getUser();

                    if (!user) {
                        alert('Anda harus login untuk berkontribusi.');
                        window.location.href = 'login.html';
                        return;
                    }

                    // Simpan ke Supabase (Tabel: timeline_contributions)
                    // Status default: 'pending'
                    const { error } = await sb.from('timeline_contributions').insert({
                        user_id: user.id,
                        title,
                        year,
                        category,
                        description: desc,
                        source_url: source,
                        latitude: lat,
                        longitude: lng,
                        status: 'pending' // Kunci anti-hoax
                    });

                    if (error) throw error;

                    // Sukses
                    alert('Terima kasih! Kontribusi Anda telah dikirim dan sedang menunggu moderasi admin.');
                    
                    // Reset UI
                    contribForm.reset();
                    isAddingMarker = false;
                    btnContribute.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Lokasi';
                    btnContribute.style.background = '';
                    addMarkerInfo.style.display = 'none';
                    document.getElementById('leafletMap').style.cursor = '';
                    
                    // Tutup Modal
                    btnCloseContrib.click();

                    // (Opsional) Tampilkan marker sementara warna kuning (Pending) hanya untuk user ini
                    const pendingIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color:orange; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });
                    
                    L.marker([lat, lng], { icon: pendingIcon })
                        .addTo(map)
                        .bindPopup(`<b>${escapeHtml(title)}</b><br><span style="color:orange; font-size:12px;">Menunggu Verifikasi</span>`);

                } catch (err) {
                    console.error('Gagal kirim kontribusi:', err);
                    alert('Gagal mengirim data. Pastikan semua field terisi dengan benar.');
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }

        const regionEvents = {
            'Sumatera': {
                coords: [-0.5897, 101.3431],
                events: [
                    { year: '1821-1837', title: 'Perang Padri', desc: 'Perang di Sumatera Barat antara kaum Padri dan kaum Adat, kemudian melawan Belanda.' },
                    { year: '1873-1904', title: 'Perang Aceh', desc: 'Perlawanan sengit rakyat Aceh melawan kolonial Belanda.' },
                    { year: '1945', title: 'Pertempuran Medan Area', desc: 'Aksi perlawanan rakyat Medan melawan tentara Sekutu dan NICA.' }
                ]
            },
            'Jawa': {
                coords: [-7.6145, 110.7122],
                events: [
                    { year: '1293', title: 'Berdirinya Majapahit', desc: 'Raden Wijaya mendirikan kerajaan Majapahit setelah mengalahkan tentara Mongol.' },
                    { year: '1825-1830', title: 'Perang Diponegoro', desc: 'Perlawanan Pangeran Diponegoro melawan Belanda.' },
                    { year: '1945', title: 'Resolusi Jihad', desc: 'Fatwa KH Hasyim Asy\'ari yang memicu Pertempuran 10 November.' }
                ]
            },
            'Kalimantan': {
                coords: [-0.0001, 113.9213],
                events: [
                    { year: '1859-1905', title: 'Perang Banjar', desc: 'Perlawanan Pangeran Antasari melawan Belanda di Kesultanan Banjar.' },
                    { year: '1947', title: 'Pertempuran Sangasanga', desc: 'Aksi pejuang Kalimantan Timur mengusir penjajah Belanda.' }
                ]
            },
            'Sulawesi': {
                coords: [-1.9032, 120.8210],
                events: [
                    { year: '1666-1669', title: 'Perang Makassar', desc: 'Sultan Hasanuddin melawan monopoli perdagangan VOC.' },
                    { year: '1946', title: 'Peristiwa Korban 40.000 Jiwa', desc: 'Pembantaian rakyat Sulawesi Selatan oleh pasukan Westerling.' }
                ]
            },
            'Papua': {
                coords: [-4.2699, 138.0803],
                events: [
                    { year: '1961', title: 'Trikora', desc: 'Komando Rakyat untuk membebaskan Irian Barat.' },
                    { year: '1969', title: 'Pepera', desc: 'Penentuan Pendapat Rakyat yang menyatakan Papua resmi bagian dari NKRI.' }
                ]
            },
            'Bali & Nusa Tenggara': {
                coords: [-8.3405, 115.0920],
                events: [
                    { year: '1846-1849', title: 'Perang Jagaraga', desc: 'Perlawanan rakyat Bali melawan invasi Belanda.' },
                    { year: '1946', title: 'Puputan Margarana', desc: 'Pertempuran habis-habisan I Gusti Ngurah Rai.' }
                ]
            },
            'Maluku': {
                coords: [-3.2384, 130.1453],
                events: [
                    { year: '1817', title: 'Perlawanan Pattimura', desc: 'Thomas Matulessy memimpin rakyat Maluku merebut Benteng Duurstede.' },
                    { year: '1521', title: 'Ekspedisi Magellan', desc: 'Kedatangan bangsa Spanyol pertama kali di Maluku.' }
                ]
            }
        };

        Object.keys(regionEvents).forEach(regionName => {
            const region = regionEvents[regionName];
            const marker = L.marker(region.coords).addTo(map);
            
            marker.bindTooltip(regionName);

            marker.on('click', () => {
                const events = region.events;
                if (timelineHeader) timelineHeader.textContent = `Linimasa: ${regionName}`;
                
                if (events.length > 0) {
                    eventsList.innerHTML = events.map(ev => `
                        <div class="event-card fade-in">
                            <span class="event-year">${escapeHtml(ev.year)}</span>
                            <h4 class="event-title">${escapeHtml(ev.title)}</h4>
                            <p class="event-desc">${escapeHtml(ev.desc)}</p>
                        </div>
                    `).join('');
                } else {
                    eventsList.innerHTML = `
                        <div class="empty-state" style="grid-column: 1/-1;">
                            <p style="color: #888;">Belum ada data peristiwa untuk wilayah ini.</p>
                        </div>
                    `;
                }
                eventsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        // --- Load Kontribusi yang Disetujui ---
        // (Opsional) Jika tabel timeline_contributions sudah ada dan punya data approved
        try {
            const sb = await getSupabaseClient();
            const { data: contribs } = await sb
                .from('timeline_contributions')
                .select('*')
                .eq('status', 'approved');

            if (contribs && contribs.length > 0) {
                contribs.forEach(c => {
                    if (c.latitude && c.longitude) {
                        const marker = L.marker([c.latitude, c.longitude]).addTo(map);
                        
                        // Hover untuk tooltip cepat
                        marker.bindTooltip(`<b>${escapeHtml(c.title)}</b> (${escapeHtml(c.year)})`, {
                            direction: 'top',
                            offset: [0, -30]
                        });

                        // Klik untuk detail di panel bawah
                        marker.on('click', () => {
                            if (timelineHeader) timelineHeader.textContent = `Kontribusi User: ${c.title}`;
                            
                            eventsList.innerHTML = `
                                <div class="event-card fade-in" style="border-left: 4px solid var(--primary);">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span class="event-year">${escapeHtml(c.year)}</span>
                                        <span style="font-size:12px; background:#e3f2fd; color:#0d47a1; padding:2px 8px; border-radius:12px;">${escapeHtml(c.category)}</span>
                                    </div>
                                    <h4 class="event-title">${escapeHtml(c.title)}</h4>
                                    <p class="event-desc">${escapeHtml(c.description)}</p>
                                    <div style="margin-top:10px; font-size:12px; color:#666;">
                                        <i class="fas fa-link"></i> Sumber: <a href="${escapeHtml(c.source_url)}" target="_blank" style="color:var(--primary); text-decoration:none;">Lihat Referensi</a>
                                    </div>
                                </div>
                            `;
                            
                            eventsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        });
                    }
                });
            }
        } catch (err) {
            // Ignore error if table not exists yet
        }

    } catch (e) {
        console.error('Timeline error:', e);
    }
}

async function initShopCheckoutPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('shop-checkout.html')) return;
        const root = document.getElementById('shopCheckoutRoot');
        if (!root) return;

        const params = new URLSearchParams(window.location.search || '');
        const productIdRaw = params.get('product_id');
        const productId = productIdRaw ? Number(productIdRaw) : NaN;
        if (!Number.isFinite(productId)) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Produk tidak valid</h3><p class="card-text">Kembali ke halaman Toko dan pilih produk.</p>`;
            return;
        }

        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        const { data: prod, error } = await sb
            .from('products')
            .select('id, name, description, price, stock, image_url')
            .eq('id', productId)
            .maybeSingle();

        if (error || !prod) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Produk tidak ditemukan</h3><p class="card-text">Periksa data tabel products.</p>`;
            return;
        }

        const price = typeof prod.price === 'number' ? prod.price : Number(prod.price || 0);
        const shipping = 15000;
        const fee = 2000;
        const userBadges = (profile && typeof profile.badges === 'number') ? profile.badges : 0;

        const calcTotal = (qty) => {
            const q = Number(qty);
            const safeQty = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
            const subtotal = price * safeQty;
            const discount = Math.min(userBadges, subtotal);
            const total = subtotal - discount + shipping + fee;
            return { safeQty, subtotal, total, discount };
        };

        const meta = user && user.user_metadata ? user.user_metadata : {};
        const defaultName =
            (profile && (profile.full_name || profile.username) ? profile.full_name || profile.username : '') ||
            (meta.full_name || meta.username || '') ||
            '';

        const img = String(prod.image_url || '').trim();
        const imgHtml = img
            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(prod.name || 'Produk')}" style="width: 100%; max-width: 360px; height: auto; border-radius: 14px; border: 1px solid var(--border);">`
            : `<div style="width: 100%; max-width: 360px; height: 220px; border-radius: 14px; border: 1px solid var(--border); display:flex; align-items:center; justify-content:center; background: linear-gradient(180deg, rgba(43,92,165,0.08), rgba(43,92,165,0.02));"><i class="fas fa-book" style="font-size: 36px; color: rgba(31,60,115,0.6);"></i></div>`;

        root.innerHTML = `
            <div class="card-meta">Checkout</div>
            <div style="margin-top: 10px;">${imgHtml}</div>
            <h3 class="card-title" style="margin-top: 10px;">${escapeHtml(prod.name || 'Produk')}</h3>
            <p class="card-text">${escapeHtml((prod.description || '').slice(0, 180))}</p>

            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border);">
                <div class="card-meta">Data penerima</div>
                <form id="shopCheckoutForm" style="margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <input id="buyerName" type="text" placeholder="Nama lengkap" value="${escapeHtml(defaultName)}" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                        <input id="buyerPhone" type="text" placeholder="Nomor HP" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                        <textarea id="buyerAddress" placeholder="Alamat lengkap (jalan, kecamatan, kota, provinsi)" rows="3" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);"></textarea>
                        <textarea id="buyerNote" placeholder="Catatan (opsional)" rows="2" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);"></textarea>
                    </div>

                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                        <div class="card-meta">Rincian biaya</div>
                        <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 8px;">
                            <input id="buyQty" type="number" min="1" step="1" value="1" placeholder="Kuantitas / jumlah buku" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                            <div class="card-text" style="font-size: 12px; color: var(--text-light);">Kuantitas adalah jumlah buku yang ingin kamu beli.</div>
                        </div>
                        <div style="margin-top: 10px; font-size: 14px;">
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Harga buku</span><b id="bookUnitPrice">Rp ${escapeHtml(formatRupiah(price))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Subtotal</span><b id="bookSubtotal">Rp ${escapeHtml(formatRupiah(price))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px; color: var(--primary);"><span>Diskon Badge (${userBadges})</span><b id="bookDiscount">-Rp 0</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Ongkir</span><b>Rp ${escapeHtml(formatRupiah(shipping))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Biaya layanan</span><b>Rp ${escapeHtml(formatRupiah(fee))}</b></div>
                            <div style="margin-top: 10px; display:flex; justify-content:space-between; gap:10px; font-size:15px;"><span>Total</span><b id="bookTotal">Rp ${escapeHtml(formatRupiah(price + shipping + fee))}</b></div>
                        </div>
                    </div>

                    <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-comments"></i> Konfirmasi Pembelian (WhatsApp)
                        </button>
                        <a href="shop.html" class="btn-secondary" style="display:inline-block; text-decoration:none;">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </a>
                    </div>
                </form>
                <div id="shopCheckoutResult" style="margin-top: 12px;"></div>
            </div>
        `;

        const form = document.getElementById('shopCheckoutForm');
        const result = document.getElementById('shopCheckoutResult');
        if (!form || !result) return;

        const qtyInput = document.getElementById('buyQty');
        const subtotalEl = document.getElementById('bookSubtotal');
        const discountEl = document.getElementById('bookDiscount');
        const totalEl = document.getElementById('bookTotal');

        const renderTotals = () => {
            const qtyRaw = qtyInput ? qtyInput.value : '1';
            const { safeQty, subtotal, total, discount } = calcTotal(qtyRaw);
            if (qtyInput) qtyInput.value = String(safeQty);
            if (subtotalEl) subtotalEl.textContent = `Rp ${formatRupiah(subtotal)}`;
            if (discountEl) discountEl.textContent = `-Rp ${formatRupiah(discount)}`;
            if (totalEl) totalEl.textContent = `Rp ${formatRupiah(total)}`;
        };

        if (qtyInput) {
            qtyInput.addEventListener('change', renderTotals);
            qtyInput.addEventListener('input', renderTotals);
        }
        renderTotals();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qtyRaw = String((document.getElementById('buyQty') || {}).value || '1');
            const { safeQty, subtotal, total, discount } = calcTotal(qtyRaw);
            const name = String((document.getElementById('buyerName') || {}).value || '').trim();
            const phone = String((document.getElementById('buyerPhone') || {}).value || '').trim();
            const address = String((document.getElementById('buyerAddress') || {}).value || '').trim();
            const note = String((document.getElementById('buyerNote') || {}).value || '').trim();

            if (!name || !phone || !address) {
                result.innerHTML = `<div class="card" style="padding: 14px;">Lengkapi nama, nomor HP, dan alamat dulu.</div>`;
                return;
            }

            const msg = `Halo Admin, saya ingin membeli buku di Toko.\n\nProduk: ${prod.name || 'Produk'}\nJumlah: ${safeQty}\nHarga satuan: Rp ${formatRupiah(price)}\nSubtotal: Rp ${formatRupiah(subtotal)}\nDiskon Badge: -Rp ${formatRupiah(discount)}\nOngkir: Rp ${formatRupiah(shipping)}\nBiaya layanan: Rp ${formatRupiah(fee)}\nTotal: Rp ${formatRupiah(total)}\n\nNama: ${name}\nNo HP: ${phone}\nAlamat: ${address}${note ? `\nCatatan: ${note}` : ''}`;
            const waLink = buildWhatsAppLink(ADMIN_WA_NUMBER, msg);

            try {
                if (user) {
                    await sb.from('shop_orders').insert({
                        user_id: user.id,
                        product_id: prod.id,
                        quantity: safeQty,
                        buyer_name: name,
                        buyer_phone: phone,
                        buyer_address: address,
                        note,
                        item_price: price,
                        subtotal_amount: subtotal,
                        shipping_cost: shipping,
                        service_fee: fee,
                        total_amount: total,
                        status: 'pending',
                    });
                }
            } catch (e2) {
                // ignore
            }

            window.open(waLink, '_blank', 'noopener');
        });
    } catch (e) {
        // ignore
    }
}

async function isPremiumActive(sb, userId) {
    try {
        if (!sb || !userId) return false;

        const { data: purchases, error } = await sb
            .from('premium_purchases')
            .select('id, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) return false;

        const rows = Array.isArray(purchases) ? purchases : [];
        if (rows.length === 0) return false;

        // Schema provided: status default 'pending_payment'. Trigger handle_premium_paid() is expected
        // to move it into a paid/active state. We consider these statuses as premium-active.
        const activeStatuses = new Set(['paid', 'confirmed', 'active']);
        return rows.some((r) => activeStatuses.has(String(r && r.status ? r.status : '').toLowerCase()));
    } catch (e) {
        return false;
    }
}

const ADMIN_WA_NUMBER = '6289529559852';

function buildWhatsAppLink(phoneNumber, message) {
    const pn = String(phoneNumber || '').replace(/\D/g, '');
    const text = encodeURIComponent(String(message || '').trim());
    return `https://wa.me/${pn}?text=${text}`;
}

function formatRupiah(value) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return String(value || '0');
    try {
        return n.toLocaleString('id-ID');
    } catch (e) {
        return String(n);
    }
}

function formatRelativeTime(iso) {
    try {
        const d = new Date(iso);
        const diffMs = Date.now() - d.getTime();
        const sec = Math.floor(diffMs / 1000);
        if (sec < 60) return 'Baru saja';
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min} menit yang lalu`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr} jam yang lalu`;
        const day = Math.floor(hr / 24);
        return `${day} hari yang lalu`;
    } catch (e) {
        return '';
    }
}

async function initQuizDetailPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('quiz-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const quizIdRaw = params.get('id');
        const quizId = quizIdRaw ? Number(quizIdRaw) : NaN;
        if (!Number.isFinite(quizId)) return;

        const root = document.getElementById('quizDetailRoot');
        if (!root) return;

        const sb = await getSupabaseClient();

        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;

        if (!premiumOk) {
            const { data: freeQuizzes, error: freeErr } = await sb
                .from('quizzes')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1);

            const freeQuizId = Array.isArray(freeQuizzes) && freeQuizzes[0] ? freeQuizzes[0].id : null;
            if (!freeErr && freeQuizId != null && Number(freeQuizId) !== Number(quizId)) {
                root.innerHTML = `<div class="card-meta">Premium</div><h3 class="card-title" style="margin-top: 6px;">Kuis Terkunci</h3><p class="card-text">Upgrade Premium untuk membuka kuis ini.</p><div style="margin-top: 14px;"><a href="premium.html" class="btn-primary" style="display:inline-block; text-decoration:none;">Buka Premium</a></div>`;
                return;
            }
        }

        const { data: quiz, error: quizErr } = await sb
            .from('quizzes')
            .select('id, title, image_url, question_count, duration, rating, created_at')
            .eq('id', quizId)
            .maybeSingle();

        if (quizErr || !quiz) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Kuis tidak ditemukan</h3><p class="card-text">Pastikan id kuis benar.</p>`;
            return;
        }

        const { data: questions, error: qErr } = await sb
            .from('questions')
            .select('id, quiz_id, question_text, order_index, image_url')
            .eq('quiz_id', quiz.id)
            .order('order_index', { ascending: true })
            .limit(100);

        if (qErr) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Gagal memuat pertanyaan</h3><p class="card-text">Coba lagi beberapa saat.</p>`;
            return;
        }

        const qs = Array.isArray(questions) ? questions : [];
        if (qs.length === 0) {
            root.innerHTML = `<div class="card-meta">${escapeHtml(quiz.question_count || 0)} soal</div><h3 class="card-title" style="margin-top: 6px;">${escapeHtml(quiz.title || 'Kuis')}</h3><p class="card-text">Belum ada pertanyaan untuk kuis ini.</p>`;
            return;
        }

        const questionIds = qs.map((x) => x.id);
        const { data: options, error: optErr } = await sb
            .from('options')
            .select('id, question_id, option_text, is_correct')
            .in('question_id', questionIds)
            .limit(1000);

        if (optErr) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Gagal memuat opsi</h3><p class="card-text">Coba lagi beberapa saat.</p>`;
            return;
        }

        const opts = Array.isArray(options) ? options : [];
        const optionsByQuestion = new Map();
        opts.forEach((o) => {
            if (!o || o.question_id == null) return;
            const key = o.question_id;
            const arr = optionsByQuestion.get(key) || [];
            arr.push(o);
            optionsByQuestion.set(key, arr);
        });

        const safeQuizTitle = escapeHtml(quiz.title || 'Kuis');
        const totalQuestions = qs.length;

        const renderQuestion = (q, idx) => {
            const qText = escapeHtml(q.question_text || `Pertanyaan ${idx + 1}`);
            const qOpts = optionsByQuestion.get(q.id) || [];
            const renderedOptions = qOpts
                .map((o) => {
                    const optText = escapeHtml(o.option_text || 'Opsi');
                    return `
                    <label style="display: block; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; margin-top: 10px; cursor: pointer;">
                        <input type="radio" name="q_${q.id}" value="${escapeHtml(String(o.id))}" style="margin-right: 10px;">
                        ${optText}
                    </label>`;
                })
                .join('');

            return `
            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Pertanyaan ${escapeHtml(String(idx + 1))} dari ${escapeHtml(String(totalQuestions))}</div>
                <h3 class="card-title" style="margin-top: 6px; font-size: 18px;">${qText}</h3>
                ${renderedOptions || `<p class="card-text">Opsi belum tersedia.</p>`}
            </div>`;
        };

        root.innerHTML = `
            <div class="card-meta">${escapeHtml(String(totalQuestions))} soal</div>
            <h3 class="card-title" style="margin-top: 6px;">${safeQuizTitle}</h3>
            <p class="card-text">Pilih jawaban yang paling tepat, lalu submit untuk melihat skor.</p>
            <form id="quizForm">
                ${qs.map(renderQuestion).join('')}
                <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Jawaban
                    </button>
                    <a href="quizzes.html" class="btn-secondary" style="display: inline-block; text-align: center; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </a>
                </div>
            </form>
            <div id="quizResult" style="margin-top: 16px;"></div>
        `;

        const form = document.getElementById('quizForm');
        const result = document.getElementById('quizResult');
        if (!form || !result) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const { data: sessionData } = await sb.auth.getSession();
            const user = sessionData && sessionData.session ? sessionData.session.user : null;
            if (!user) {
                result.innerHTML = `<div class="card" style="padding: 16px;">Silakan login dulu untuk submit kuis.</div>`;
                return;
            }

            const answers = new Map();
            qs.forEach((q) => {
                const selected = form.querySelector(`input[name="q_${q.id}"]:checked`);
                if (selected) answers.set(q.id, String(selected.value));
            });

            if (answers.size === 0) {
                result.innerHTML = `<div class="card" style="padding: 16px;">Pilih minimal 1 jawaban.</div>`;
                return;
            }

            // Hitung Skor
            let correctCount = 0;
            qs.forEach((q) => {
                const selectedOptId = answers.get(q.id);
                if (selectedOptId) {
                    const qOpts = optionsByQuestion.get(q.id) || [];
                    const chosen = qOpts.find((o) => String(o.id) === selectedOptId);
                    if (chosen && chosen.is_correct) correctCount++;
                }
            });

            const totalQuestions = qs.length;
            const finalScore = Math.round((correctCount / totalQuestions) * 100);
            const xpEarned = correctCount * 10; // 10 XP per jawaban benar
            const badgesEarned = Math.floor(correctCount / 2); // 2 benar = 1 badge

            // Tampilkan Modal Hasil (Langsung)
            // Cari modal di seluruh document (bukan cuma di dalam root)
            let modal = document.getElementById('quizResultModal');
            
            // Jika tidak ketemu, coba buat manual (fallback)
            if (!modal) {
                console.log('Modal tidak ditemukan, membuat modal baru...');
                modal = document.createElement('div');
                modal.id = 'quizResultModal';
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content fade-in-up">
                        <div style="text-align: center;">
                            <div class="result-icon-wrapper">
                                <i class="fas fa-trophy" style="font-size: 40px; color: #FFD700;"></i>
                            </div>
                            <h2 style="margin-top: 16px; color: var(--text);">Selamat!</h2>
                            <p style="color: var(--text-light); margin-top: 8px;">Kamu telah menyelesaikan kuis ini.</p>
                            
                            <div class="result-stats" style="margin-top: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                <div class="stat-box">
                                    <div class="stat-value" id="resultScore">0</div>
                                    <div class="stat-label">Skor</div>
                                </div>
                                <div class="stat-box">
                                    <div class="stat-value" id="resultCorrect">0</div>
                                    <div class="stat-label">Benar</div>
                                </div>
                                <div class="stat-box">
                                    <div class="stat-value" id="resultXP">+0</div>
                                    <div class="stat-label">XP</div>
                                </div>
                                <div class="stat-box">
                                    <div class="stat-value" id="resultBadges">+0</div>
                                    <div class="stat-label">Badge</div>
                                </div>
                            </div>

                            <div style="margin-top: 24px;">
                                <div class="badge-reward" style="background: rgba(255, 215, 0, 0.1); padding: 12px; border-radius: 12px; border: 1px dashed #FFD700; display: inline-flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-medal" style="color: #FFD700; font-size: 20px;"></i>
                                    <span style="font-weight: 600; color: #B8860B;">Badge Baru Terbuka!</span>
                                </div>
                            </div>

                            <div style="margin-top: 30px; display: flex; gap: 10px;">
                                <a href="quizzes.html" class="btn-primary" style="flex: 1; text-align: center; text-decoration: none;">Kembali ke Daftar</a>
                                <button onclick="location.reload()" class="btn-secondary" style="flex: 1;">Ulangi</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            if (modal) {
                console.log('Menampilkan modal...');
                const scoreEl = modal.querySelector('#resultScore');
                const correctEl = modal.querySelector('#resultCorrect');
                const xpEl = modal.querySelector('#resultXP');
                const badgeEl = modal.querySelector('#resultBadges');
                
                if (scoreEl) scoreEl.textContent = correctCount * 10; 
                if (correctEl) correctEl.textContent = `${correctCount}/${totalQuestions}`;
                if (xpEl) xpEl.textContent = `+${xpEarned}`;
                if (badgeEl) badgeEl.textContent = `+${badgesEarned}`;
                
                // Gunakan inline style untuk memaksa tampil
                modal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important;';
                
                // Animasi konten
                const content = modal.querySelector('.modal-content');
                if (content) {
                    // Reset dulu
                    content.classList.remove('show');
                    void content.offsetWidth;
                    // Tampilkan
                    setTimeout(() => content.classList.add('show'), 50);
                }
            } else {
                console.error('Gagal membuat modal');
                alert(`Skor kamu: ${correctCount * 10}`);
                window.location.href = 'quizzes.html';
            }

            // Simpan ke database (background process)
            try {
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                    await sb.from('quiz_attempts').upsert({
                        user_id: user.id,
                        quiz_id: quizId,
                        score: correctCount, 
                        total_questions: totalQuestions,
                        points_earned: xpEarned
                    }, { onConflict: 'user_id,quiz_id' });
                }
            } catch (err) {
                console.error('Gagal simpan skor:', err);
            }
        });
    } catch (e) {
        // ignore
    }
}

async function initContentDetailPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('content-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const materiIdRaw = params.get('id');
        const materiId = materiIdRaw ? Number(materiIdRaw) : NaN;
        if (!Number.isFinite(materiId)) return;

        const headerImage = document.querySelector('img.content-header-image');
        const titleEl = document.querySelector('h1.content-title');
        const textContainer = document.querySelector('.content-text');
        if (!headerImage && !titleEl && !textContainer) return;

        const sb = await getSupabaseClient();
        const { data: materi, error } = await sb
            .from('materi')
            .select('id, category_id, title, subtitle, image_url, summary, video_url, audio_url, created_at')
            .eq('id', materiId)
            .maybeSingle();

        if (error || !materi) return;

        if (titleEl) titleEl.textContent = String(materi.title || 'Materi');

        if (headerImage) {
            const img = String(materi.image_url || '').trim();
            if (img) headerImage.src = img;
            headerImage.alt = String(materi.title || 'Materi');
        }

        const metaSpans = document.querySelectorAll('.content-meta .content-meta-item span');
        if (metaSpans && metaSpans.length >= 3) {
            const created = materi.created_at ? new Date(materi.created_at) : null;
            if (created && !Number.isNaN(created.getTime())) {
                metaSpans[0].textContent = created.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            }
            metaSpans[1].textContent = '10 menit baca';
            metaSpans[2].textContent = `Kategori: ${String(materi.subtitle || 'Materi')}`;
        }

        if (textContainer) {
            const summary = String(materi.summary || '').trim();
            if (summary) {
                const parts = summary.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);
                textContainer.innerHTML = parts.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
            } else {
                textContainer.innerHTML = `<p>${escapeHtml('Konten materi belum tersedia.')}</p>`;
            }
        }

        const relatedItems = document.querySelectorAll('.content-sidebar .related-item');
        if (relatedItems && relatedItems.length > 0 && materi.category_id != null) {
            const { data: related, error: relErr } = await sb
                .from('materi')
                .select('id, title, image_url, created_at')
                .eq('category_id', materi.category_id)
                .neq('id', materi.id)
                .order('created_at', { ascending: false })
                .limit(2);

            if (!relErr && Array.isArray(related) && related.length > 0) {
                relatedItems.forEach((el, idx) => {
                    const r = related[idx];
                    if (!r) return;
                    const imgEl = el.querySelector('img');
                    const titleEl = el.querySelector('h4');
                    const timeEl = el.querySelector('span');

                    if (imgEl) {
                        const img = String(r.image_url || '').trim();
                        if (img) imgEl.src = img;
                        imgEl.alt = String(r.title || 'Related');
                    }
                    if (titleEl) titleEl.textContent = String(r.title || 'Materi');
                    if (timeEl) timeEl.textContent = '10 menit baca';
                    el.onclick = () => {
                        window.location.href = `content-detail.html?id=${encodeURIComponent(r.id)}`;
                    };
                });
            }
        }

        // Logic Tandai Selesai
        const markBtn = document.getElementById('markAsReadBtn');
        if (markBtn) {
            const sb = await getSupabaseClient();
            const { data: { user } } = await sb.auth.getSession();
            
            if (user) {
                // Cek status baca
                const { data: readData } = await sb.from('user_reads')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('material_id', materiId)
                    .maybeSingle();
                
                if (readData) {
                     markBtn.disabled = true;
                     markBtn.innerHTML = '<i class="fas fa-check-double"></i> Sudah Dibaca';
                     markBtn.style.opacity = '0.7';
                }

                markBtn.onclick = async () => {
                    try {
                        markBtn.disabled = true;
                        markBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                        
                        const { data: success, error } = await sb.rpc('register_read', { 
                            p_user_id: user.id, 
                            p_material_id: materiId 
                        });

                        if (error) throw error;

                        if (success) {
                            alert('Materi selesai! Kamu mendapatkan +10 XP.');
                            markBtn.innerHTML = '<i class="fas fa-check-double"></i> Sudah Dibaca';
                        } else {
                            markBtn.innerHTML = '<i class="fas fa-check-double"></i> Sudah Dibaca';
                        }
                    } catch (err) {
                        console.error('Gagal tandai selesai:', err);
                        markBtn.disabled = false;
                        markBtn.innerHTML = '<i class="fas fa-check-circle"></i> Tandai Selesai';
                        alert('Gagal memproses permintaan.');
                    }
                };
            }
        }
    } catch (e) {
        // ignore
    }
}

async function initContentDetailTracking() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('content-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const materiIdRaw = params.get('id');
        const materiId = materiIdRaw ? Number(materiIdRaw) : NaN;
        if (!Number.isFinite(materiId)) return;

        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        if (!user) return;

        await sb.from('daily_materi_reads').insert({
            user_id: user.id,
            materi_id: materiId,
        });
    } catch (e) {
        // ignore
    }
}

function pageTitleIncludes(text) {
    const title = document.querySelector('.section-title');
    if (!title) return false;
    return String(title.textContent || '').toLowerCase().includes(String(text || '').toLowerCase());
}

function setPlaceholderMessage(container, title, message) {
    if (!container) return;
    container.innerHTML = `<div class="card" style="padding: 18px;"><h3 class="card-title">${escapeHtml(title)}</h3><p class="card-text">${escapeHtml(message)}</p></div>`;
}

async function initQuizzesPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('quiz-detail.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('quizzes.html')) return;
    if (!pageTitleIncludes('kuis')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('quizzes')
            .select('id, title, image_url, question_count, duration, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const quizzes = Array.isArray(data) ? data : [];
        if (quizzes.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada kuis', 'Tambahkan data di tabel quizzes untuk menampilkan daftar kuis.');
            return;
        }

        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;
        const freeCount = 1;
        const visibleQuizzes = premiumOk ? quizzes : quizzes.slice(0, freeCount);

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = visibleQuizzes
            .map((q) => {
                const title = escapeHtml(q.title || 'Kuis');
                const img = (q.image_url || '').trim();
                const qc = typeof q.question_count === 'number' ? q.question_count : 0;
                const duration = escapeHtml(q.duration || '');
                const rating = q.rating != null ? String(q.rating) : '';
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-circle-question\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const meta = qc > 0 ? `${qc} soal` : 'Kuis';
                const footerRight = duration || rating ? `${duration}${duration && rating ? ' • ' : ''}${rating ? `⭐ ${escapeHtml(rating)}` : ''}` : 'Mulai';
                return `
                <div class="card" onclick="window.location.href='quiz-detail.html?id=${encodeURIComponent(q.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(meta)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">Uji pemahamanmu dengan kuis interaktif.</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag"><i class="fas fa-list" style="margin-right: 5px;"></i> ${escapeHtml(meta)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">${footerRight} <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        if (!premiumOk && quizzes.length > freeCount) {
            grid.innerHTML += `
            <div class="card" onclick="window.location.href='premium.html'">
                <div class="card-body">
                    <div class="card-meta">Premium</div>
                    <h3 class="card-title">Kuis Terkunci</h3>
                    <p class="card-text">Upgrade ke Premium untuk membuka semua kuis.</p>
                </div>
                <div class="card-footer">
                    <span class="card-tag">Upgrade</span>
                    <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Buka Premium <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>`;
        }

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Terjadi error di browser.');
    }
}

async function initCommunityPage() {
    if (!pageTitleIncludes('komunitas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;

        if (!premiumOk) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Komunitas Terkunci', 'Fitur komunitas hanya untuk Premium. Silakan upgrade Premium untuk membuka.');
            return;
        }

        const { data, error } = await sb
            .from('chat_rooms')
            .select('id, title, description, avatar_url, last_message, last_message_time, is_premium, created_at')
            .order('last_message_time', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const rooms = Array.isArray(data) ? data : [];
        if (rooms.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada room', 'Tambahkan data di tabel chat_rooms untuk menampilkan komunitas.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rooms
            .map((r) => {
                const title = escapeHtml(r.title || 'Room');
                const desc = escapeHtml((r.description || r.last_message || '').slice(0, 120));
                const img = (r.avatar_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-comments\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const tag = r.is_premium ? 'Premium' : 'Community';
                const time = r.last_message_time ? formatRelativeTime(r.last_message_time) : '';
                return `
                <div class="card" onclick="window.location.href='chat-room.html?id=${encodeURIComponent(r.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(tag)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(time || 'Buka room')}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Masuk <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Terjadi error di browser.');
    }
}

async function initTasksPage() {
    if (!pageTitleIncludes('tugas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;

        if (!user) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Login diperlukan', 'Silakan login untuk melihat progres tugas kamu.');
            return;
        }

        const { data, error } = await sb
            .from('user_tasks')
            .select('id, current_progress, is_completed, last_updated_at, task:tasks(id, title, description, type, target_count, points_reward, is_daily)')
            .eq('user_id', user.id)
            .order('is_completed', { ascending: true })
            .order('last_updated_at', { ascending: false })
            .limit(50);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Periksa RLS policy tabel tasks/user_tasks.');
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            const { data: masterTasks, error: masterErr } = await sb
                .from('tasks')
                .select('id, title, description, type, target_count, points_reward, is_daily, created_at')
                .order('created_at', { ascending: false })
                .limit(20);

            if (masterErr) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks / user_tasks untuk menampilkan tugas.');
                return;
            }

            const tasks = Array.isArray(masterTasks) ? masterTasks : [];
            if (tasks.length === 0) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks untuk menampilkan tugas.');
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'cards-grid';
            grid.innerHTML = tasks
                .map((t) => {
                    const title = escapeHtml(t.title || 'Tugas');
                    const desc = escapeHtml((t.description || '').slice(0, 120));
                    const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                    const target = typeof t.target_count === 'number' ? t.target_count : 1;
                    const tag = t.is_daily ? 'Harian' : 'Sekali';
                    return `
                    <div class="card">
                        <div class="card-body">
                            <div class="card-meta">${escapeHtml(tag)}</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag">Target ${escapeHtml(String(target))}</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                        </div>
                    </div>`;
                })
                .join('');
            placeholderCard.replaceWith(grid);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rows
            .map((row) => {
                const t = row.task || {};
                const title = escapeHtml(t.title || 'Tugas');
                const desc = escapeHtml((t.description || '').slice(0, 120));
                const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                const target = typeof t.target_count === 'number' ? t.target_count : 1;
                const progress = typeof row.current_progress === 'number' ? row.current_progress : 0;
                const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, target)) * 100)));
                const status = row.is_completed ? 'Selesai' : `Progress ${progress}/${target}`;
                return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(status)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                        <div style="margin-top: 10px; height: 8px; background: rgba(31, 60, 115, 0.12); border-radius: 999px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--primary);"></div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(String(pct))}%</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Terjadi error di browser.');
    }
}

async function initPremiumPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('premium-payment.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('premium.html')) return;
    if (!pageTitleIncludes('premium')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('premium_packages')
            .select('id, title, description, price, duration_days, created_at')
            .order('price', { ascending: true })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Periksa RLS policy tabel premium_packages.');
            return;
        }

        const packs = Array.isArray(data) ? data : [];
        if (packs.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada paket', 'Tambahkan data di tabel premium_packages untuk menampilkan paket.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = packs
            .map((p) => {
                const title = escapeHtml(p.title || 'Premium');
                const desc = escapeHtml((p.description || '').slice(0, 120));
                const price = p.price != null ? String(p.price) : '0';
                const days = typeof p.duration_days === 'number' ? p.duration_days : 30;
                const href = `premium-payment.html?package_id=${encodeURIComponent(p.id)}`;
                return `
                <div class="card" onclick="window.location.href='${href}'">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(`${days} hari`)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc || 'Akses fitur premium dan konten eksklusif.'}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Rp ${escapeHtml(price)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Pilih <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Terjadi error di browser.');
    }
}

async function initPremiumPaymentPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('premium-payment.html')) return;
        const root = document.getElementById('premiumPaymentRoot');
        if (!root) return;

        const params = new URLSearchParams(window.location.search || '');
        const packageIdRaw = params.get('package_id');
        const packageId = packageIdRaw ? Number(packageIdRaw) : NaN;
        if (!Number.isFinite(packageId)) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Paket tidak valid</h3><p class="card-text">Buka halaman Premium dan pilih paket.</p>`;
            return;
        }

        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        const { data: pack, error } = await sb
            .from('premium_packages')
            .select('id, title, description, price, duration_days')
            .eq('id', packageId)
            .maybeSingle();

        if (error || !pack) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Paket tidak ditemukan</h3><p class="card-text">Periksa data di tabel premium_packages.</p>`;
            return;
        }

        const price = typeof pack.price === 'number' ? pack.price : Number(pack.price || 0);
        const priceText = `Rp ${escapeHtml(formatRupiah(price))}`;
        const days = typeof pack.duration_days === 'number' ? pack.duration_days : 30;
        const title = escapeHtml(pack.title || 'Premium');
        const desc = escapeHtml(pack.description || 'Akses fitur premium dan konten eksklusif.');

        const methods = [
            { key: 'dana', label: 'DANA' },
            { key: 'bca', label: 'BCA' },
            { key: 'bri', label: 'BRI' },
            { key: 'mandiri', label: 'Mandiri' },
        ];

        const accountByMethod = {
            dana: { name: 'Nanti diisi admin', number: '-' },
            bca: { name: 'Nanti diisi admin', number: '-' },
            bri: { name: 'Nanti diisi admin', number: '-' },
            mandiri: { name: 'Nanti diisi admin', number: '-' },
        };

        const selected = String(params.get('method') || 'dana').toLowerCase();
        const selectedKey = methods.find((m) => m.key === selected) ? selected : 'dana';
        const acct = accountByMethod[selectedKey] || accountByMethod.dana;

        const meta = user && user.user_metadata ? user.user_metadata : {};
        const displayName =
            (profile && (profile.full_name || profile.username) ? profile.full_name || profile.username : '') ||
            (meta.full_name || meta.username || '') ||
            'User';

        const methodButtons = methods
            .map((m) => {
                const active = m.key === selectedKey ? 'active' : '';
                const href = `premium-payment.html?package_id=${encodeURIComponent(pack.id)}&method=${encodeURIComponent(m.key)}`;
                return `<a href="${href}" class="pill ${active}" style="text-decoration:none;">${escapeHtml(m.label)}</a>`;
            })
            .join('');

        root.innerHTML = `
            <div class="card-meta">${escapeHtml(`${days} hari`)}</div>
            <h3 class="card-title" style="margin-top: 6px;">${title}</h3>
            <p class="card-text">${desc}</p>

            <div style="margin-top: 16px;">
                <div class="card-meta">Pilih metode pembayaran</div>
                <div class="category-pills" style="margin-top: 10px;">${methodButtons}</div>
            </div>

            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Detail transfer (${escapeHtml(selectedKey.toUpperCase())})</div>
                <div style="margin-top: 8px; font-size: 14px;">
                    <div><b>Nomor:</b> ${escapeHtml(acct.number)}</div>
                    <div><b>Atas nama:</b> ${escapeHtml(acct.name)}</div>
                    <div><b>Nominal:</b> ${priceText}</div>
                </div>
            </div>

            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Petunjuk pembayaran</div>
                <div class="card-text" style="margin-top: 8px; white-space: pre-line;">
1. Transfer sesuai nominal di atas.
2. Simpan bukti transfer (screenshot).
3. Klik tombol konfirmasi WhatsApp untuk mengirim data pembayaran ke admin.
4. Setelah admin konfirmasi, fitur premium akan terbuka.
                </div>
            </div>

            <div style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="waConfirmBtn" class="btn-primary">
                    <i class="fas fa-comments"></i> Konfirmasi ke WhatsApp Admin
                </button>
                <a href="premium.html" class="btn-secondary" style="display:inline-block; text-decoration:none;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </a>
            </div>
        `;

        const btn = document.getElementById('waConfirmBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }

                let purchaseId = '';
                try {
                    const { data: inserted, error: insErr } = await sb
                        .from('premium_purchases')
                        .insert({
                            user_id: user.id,
                            package_id: pack.id,
                            status: 'pending_payment',
                            total_amount: price,
                            payment_method_name: selectedKey.toUpperCase(),
                            payment_account_info: `${selectedKey.toUpperCase()} - ${String(acct.number || '-')} (${String(acct.name || '-')} )`,
                        })
                        .select('id')
                        .maybeSingle();

                    if (!insErr && inserted && inserted.id) {
                        purchaseId = String(inserted.id);
                    }
                } catch (e) {
                    // ignore
                }

                const codeLine = purchaseId ? `\nKode order: ${purchaseId}` : '';
                const msg = `Halo Admin, saya ingin konfirmasi pembayaran Premium.\n\nNama: ${displayName}${codeLine}\nPaket: ${pack.title || 'Premium'} (${days} hari)\nHarga: Rp ${formatRupiah(price)}\nMetode: ${selectedKey.toUpperCase()}\n\nSaya sudah transfer. Mohon dicek dan aktifkan premium saya. Terima kasih.`;
                const waLink = buildWhatsAppLink(ADMIN_WA_NUMBER, msg);
                window.open(waLink, '_blank', 'noopener');
            });
        }
    } catch (e) {
        // ignore
    }
}

async function initShopPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('shop-checkout.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('shop.html')) return;
    if (!pageTitleIncludes('toko')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('products')
            .select('id, name, description, price, stock, image_url, sold_count, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Periksa RLS policy tabel products.');
            return;
        }

        const products = Array.isArray(data) ? data : [];
        if (products.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada produk', 'Tambahkan data di tabel products untuk menampilkan produk.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = products
            .map((p) => {
                const title = escapeHtml(p.name || 'Produk');
                const desc = escapeHtml((p.description || '').slice(0, 110));
                const img = (p.image_url || '').trim();
                const price = p.price != null ? String(p.price) : '';
                const stock = typeof p.stock === 'number' ? p.stock : 0;
                const href = `shop-checkout.html?product_id=${encodeURIComponent(p.id)}`;
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-store\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Stok ${escapeHtml(String(stock))}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${price ? `Rp ${escapeHtml(price)}` : 'Reward'}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Beli <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Terjadi error di browser.');
    }
}

async function initTokohPage() {
    const sectionTitle = document.querySelector('.section-title');
    if (!sectionTitle) return;
    if (!String(sectionTitle.textContent || '').toLowerCase().includes('tokoh')) return;

    const grid = document.querySelector('.stories-grid');
    if (!grid) return;

    try {
        const sb = await getSupabaseClient();

        const { data: categories, error: catErr } = await sb
            .from('categories')
            .select('id, name')
            .ilike('name', '%tokoh%')
            .limit(1);

        if (catErr) return;
        const cat = Array.isArray(categories) && categories[0] ? categories[0] : null;
        if (!cat) return;

        const { data: materi, error } = await sb
            .from('materi')
            .select('id, title, subtitle, image_url, summary, created_at')
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) return;
        const items = Array.isArray(materi) ? materi : [];
        if (items.length === 0) return;

        grid.innerHTML = items
            .map((m) => {
                const title = escapeHtml(m.title || 'Tokoh');
                const role = escapeHtml(m.subtitle || (m.summary || '').slice(0, 60));
                const img = (m.image_url || '').trim();
                const imgTag = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}">`
                    : `<div style="height: 170px; display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-users\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="story-card" onclick="window.location.href='content-detail.html?id=${encodeURIComponent(m.id)}'">
                    <div class="story-image-wrapper">
                        ${imgTag}
                    </div>
                    <div class="story-body">
                        <div class="story-title">${title}</div>
                        <div class="story-role">${role}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function loadCurrentProfile() {
    const sb = await getSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData && sessionData.session ? sessionData.session.user : null;
    if (!user) return { user: null, profile: null };

    const { data: profile } = await sb.from('profiles').select('id, full_name, username, avatar_url, points, level, created_at').eq('id', user.id).maybeSingle();
    return { user, profile: profile || null };
}

async function initCommonUser() {
    try {
        const { user, profile } = await loadCurrentProfile();
        if (profile) {
            updateCommonUserUI(profile);
            return;
        }

        if (user && user.user_metadata) {
            const meta = user.user_metadata || {};
            updateCommonUserUI({
                full_name: meta.full_name || '',
                username: meta.username || '',
                avatar_url: meta.avatar_url || '',
            });
        }
    } catch (e) {
        // ignore
    }
}

function updateCommonUserUI(profile) {
    if (!profile) return;

    const name = (profile.full_name || profile.username || 'Pengguna').trim();
    const avatarUrl = (profile.avatar_url || '').trim();

    document.querySelectorAll('.user-name').forEach((el) => {
        el.textContent = name;
    });

    if (avatarUrl) {
        document.querySelectorAll('img.user-avatar').forEach((img) => {
            img.src = avatarUrl;
        });
        document.querySelectorAll('img.profile-avatar-large').forEach((img) => {
            img.src = avatarUrl;
        });
    }

    const profileNameLarge = document.querySelector('.profile-name-large');
    if (profileNameLarge) profileNameLarge.textContent = name;
}

async function initDashboardPage() {
    const dashboardPage = document.getElementById('dashboardPage');
    const heroTitle = document.querySelector('.hero-section .hero-content h1');
    const heroStats = document.querySelectorAll('.hero-section .hero-stats .stat-value');
    const continueCardsGrid = document.querySelector('#dashboardPage .cards-grid');
    if (!heroTitle && !continueCardsGrid) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        if (heroTitle) {
            const displayName = profile && (profile.full_name || profile.username) ? (profile.full_name || profile.username) : 'Pengguna';
            heroTitle.textContent = `Selamat Datang, ${displayName}! 👋`;
        }

        let materiSelesai = 0;
        let badgeCount = 0;
        let exp = 0;
        let lastReadMateri = [];

        if (user) {
            const { data: readsForCount, error: readsCountErr } = await sb
                .from('daily_materi_reads')
                .select('materi_id, read_at')
                .eq('user_id', user.id)
                .order('read_at', { ascending: false })
                .limit(1000);

            if (!readsCountErr) {
                const unique = new Set();
                (Array.isArray(readsForCount) ? readsForCount : []).forEach((r) => {
                    if (r && r.materi_id != null) unique.add(r.materi_id);
                });
                materiSelesai = unique.size;
            }

            const { count: quizCount } = await sb
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            badgeCount = quizCount || 0;

            const { data: attemptsForBadges, error: attemptsErr } = await sb
                .from('quiz_attempts')
                .select('score')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1000);

            if (!attemptsErr) {
                const totalCorrect = (Array.isArray(attemptsForBadges) ? attemptsForBadges : []).reduce((sum, r) => {
                    const v = r && typeof r.score === 'number' ? r.score : 0;
                    return sum + v;
                }, 0);
                badgeCount = totalCorrect / 2;
                exp = Math.floor(badgeCount / 25) * 20;
            } else {
                exp = 0;
                if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
                    console.warn('Tidak bisa membaca quiz_attempts.score (kemungkinan RLS). Badge ditampilkan sebagai jumlah attempt (fallback).', attemptsErr);
                }
            }

            const { data: reads, error: readsErr } = await sb
                .from('daily_materi_reads')
                .select('read_at, materi:materi_id (id, title, summary, image_url, created_at)')
                .eq('user_id', user.id)
                .order('read_at', { ascending: false })
                .limit(6);

            if (!readsErr) {
                lastReadMateri = (Array.isArray(reads) ? reads : [])
                    .map((r) => ({
                        read_at: r.read_at,
                        materi: r.materi,
                    }))
                    .filter((x) => x && x.materi && x.materi.id != null);
            }
        }

        if (heroStats && heroStats.length >= 3) {
            heroStats[0].textContent = String(materiSelesai);
            heroStats[1].textContent = String(badgeCount);
            heroStats[2].textContent = String(exp);
        }

        if (continueCardsGrid) {
            if (!user) return;

            const items = lastReadMateri;
            if (!items || items.length === 0) {
                const { data: materi, error } = await sb
                    .from('materi')
                    .select('id, title, summary, image_url, category_id, created_at')
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (error) {
                    continueCardsGrid.innerHTML = '';
                    return;
                }

                const fallback = Array.isArray(materi) ? materi : [];
                continueCardsGrid.innerHTML = fallback
                    .map((m) => {
                        const title = escapeHtml(m.title || 'Materi');
                        const desc = escapeHtml((m.summary || '').slice(0, 120));
                        const img = (m.image_url || '').trim();
                        const imgHtml = img
                            ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                            : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\\"fas fa-book\\" style=\\"font-size:28px;color:rgba(31,60,115,0.65)\\"></i></div>`;
                        const href = `content-detail.html?id=${encodeURIComponent(m.id)}`;
                        return `
                        <div class="card" onclick="window.location.href='${href}'">
                            ${imgHtml}
                            <div class="card-body">
                                <div class="card-meta">Materi</div>
                                <h3 class="card-title">${title}</h3>
                                <p class="card-text">${desc}</p>
                            </div>
                            <div class="card-footer">
                                <span class="card-tag"><i class="fas fa-clock" style="margin-right: 5px;"></i> 10 menit</span>
                                <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Mulai <i class="fas fa-arrow-right"></i></span>
                            </div>
                        </div>`;
                    })
                    .join('');

                return;
            }

            continueCardsGrid.innerHTML = items
                .map((row) => {
                    const m = row.materi || {};
                    const title = escapeHtml(m.title || 'Materi');
                    const desc = escapeHtml((m.summary || '').slice(0, 120));
                    const img = (m.image_url || '').trim();
                    const imgHtml = img
                        ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                        : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\\"fas fa-book\\" style=\\"font-size:28px;color:rgba(31,60,115,0.65)\\"></i></div>`;
                    const href = `content-detail.html?id=${encodeURIComponent(m.id)}`;
                    const lastRead = row.read_at ? formatRelativeTime(row.read_at) : '';
                    return `
                    <div class="card" onclick="window.location.href='${href}'">
                        ${imgHtml}
                        <div class="card-body">
                            <div class="card-meta">Terakhir dibaca${lastRead ? ` • ${escapeHtml(lastRead)}` : ''}</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag"><i class="fas fa-clock" style="margin-right: 5px;"></i> 10 menit</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Lanjutkan <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>`;
                })
                .join('');
        }
    } catch (e) {
        // ignore
    } finally {
        if (dashboardPage) dashboardPage.classList.remove('tt-hydrate-hidden');
    }
}

async function initSavedPage() {
    const title = document.querySelector('.section-title');
    const grid = document.querySelector('.cards-grid');
    if (!title || !grid) return;
    if (!String(title.textContent || '').includes('Tersimpan')) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Silakan login untuk melihat materi tersimpan.</div>`;
            return;
        }

        const { data, error } = await sb
            .from('user_favorites')
            .select('created_at, materi:materi_id (id, title, summary, image_url)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Gagal memuat materi tersimpan.</div>`;
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi tersimpan.</div>`;
            return;
        }

        grid.innerHTML = rows
            .map((row) => {
                const m = row.materi || {};
                const title = escapeHtml(m.title || 'Materi');
                const desc = escapeHtml((m.summary || '').slice(0, 120));
                const img = (m.image_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-book\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const savedAt = formatRelativeTime(row.created_at);
                const href = m.id ? `content-detail.html?id=${encodeURIComponent(m.id)}` : 'content-detail.html';

                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Materi</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Tersimpan ${escapeHtml(savedAt)}</span>
                        <i class="fas fa-bookmark" style="color: var(--primary);"></i>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initNotificationPage() {
    const layout = document.querySelector('.notification-layout');
    const generalList = document.getElementById('generalNotif');
    if (!layout || !generalList) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) return;

        const { data, error } = await sb
            .from('notifications')
            .select('id, type, title, message, created_at, is_read, badge_count')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) return;

        const items = Array.isArray(data) ? data : [];
        if (items.length === 0) {
            generalList.innerHTML = `<div class="notification-item"><div class="notification-content"><h4>Tidak ada notifikasi</h4><p>Notifikasi kamu akan muncul di sini.</p></div></div>`;
            return;
        }

        const iconByType = (t) => {
            const type = String(t || '').toLowerCase();
            if (type.includes('materi')) return { cls: 'blue', icon: '📖' };
            if (type.includes('quiz')) return { cls: 'orange', icon: '🎯' };
            if (type.includes('premium')) return { cls: 'purple', icon: '👑' };
            if (type.includes('chat')) return { cls: 'green', icon: '💬' };
            return { cls: 'green', icon: '📌' };
        };

        generalList.innerHTML = items
            .map((n) => {
                const { cls, icon } = iconByType(n.type);
                const title = escapeHtml(n.title || 'Notifikasi');
                const msg = escapeHtml(n.message || '');
                const time = escapeHtml(formatRelativeTime(n.created_at));
                return `
                <div class="notification-item">
                    <div class="notification-icon ${cls}">${icon}</div>
                    <div class="notification-content">
                        <h4>${title}</h4>
                        <p>${msg}</p>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initProfilePage() {
    const profileHeader = document.querySelector('.profile-header-card');
    if (!profileHeader) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user || !profile) return;

    // Load Data
    let materiSelesai = 0;
    let badgeCount = 0;
    let exp = 0;

    // Ambil data profile terbaru (force refresh dari DB)
    const { data: latestProfile } = await sb
        .from('profiles')
        .select('xp, badges, materials_read_count')
        .eq('id', user.id)
        .single();
    
    if (latestProfile) {
        exp = latestProfile.xp ?? 0;
        badgeCount = latestProfile.badges ?? 0;
        materiSelesai = latestProfile.materials_read_count ?? 0;
    }

    // Update UI Stats
    const statsValues = document.querySelectorAll('.profile-stats .profile-stat-value');
    if (statsValues && statsValues.length >= 3) {
        statsValues[0].textContent = String(materiSelesai);
        statsValues[1].textContent = String(badgeCount);
        statsValues[2].textContent = String(exp);
    }

    const savedMenu = Array.from(document.querySelectorAll('.menu-item-content p')).find((p) => String(p.textContent || '').includes('materi tersimpan'));
    if (savedMenu) {
        const { count: favCount } = await sb
            .from('user_favorites')
            .select('materi_id', { count: 'exact', head: true })
            .eq('user_id', user.id);
        savedMenu.textContent = `${favCount || 0} materi tersimpan`;
    }
    } catch (e) {
        // ignore
    }
}

function initDataPages() {
    initCommonUser();
    initContentDetailTracking();
    initContentDetailPage();
    initQuizDetailPage();
    initDashboardPage();
    initSavedPage();
    initNotificationPage();
    initProfilePage();
    initQuizzesPage();
    initCommunityPage();
    initTasksPage();
    initPremiumPage();
    initPremiumPaymentPage();
    initShopPage();
    initShopCheckoutPage();
    initTokohPage();
    initAchievementPage();
    initShopPage();
    initShopCheckoutPage();
    initTokohPage();
    initAchievementPage();
    initCommunityPage();
    initChatRoomPage();
}

async function initChatRoomPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('chat-room.html')) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        if (!roomId) {
            window.location.href = 'community.html';
            return;
        }

        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Get Room Info
        const { data: room, error: roomError } = await sb
            .from('chat_rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (roomError || !room) {
            alert('Room tidak ditemukan.');
            window.location.href = 'community.html';
            return;
        }

        // Update UI Header
        const roomTitle = document.getElementById('roomTitle');
        if (roomTitle) roomTitle.textContent = room.title;

        // Chat Logic
        const chatMessages = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');

        // Ambil profil user untuk nama & avatar
        const { data: profile } = await sb.from('profiles').select('username, full_name, avatar_url').eq('id', user.id).single();
        const myName = profile ? (profile.full_name || profile.username || 'User') : 'User';
        const myAvatar = profile && profile.avatar_url ? profile.avatar_url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

        // Fungsi Render Pesan
        const renderMessage = (msg, isMine) => {
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const bubbleHtml = `
                <div style="display: flex; gap: 10px; ${isMine ? 'flex-direction: row-reverse;' : ''} align-items: flex-end; margin-bottom: 4px;">
                    ${!isMine ? `<img src="${msg.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-bottom: 4px;">` : ''}
                    <div style="max-width: 70%;">
                        ${!isMine ? `<div style="font-size: 11px; color: var(--text-light); margin-bottom: 2px; margin-left: 4px;">${escapeHtml(msg.sender_name || 'User')}</div>` : ''}
                        <div style="padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; 
                            ${isMine ? 'background: var(--primary); color: white; border-bottom-right-radius: 4px;' : 'background: white; border: 1px solid var(--border); border-bottom-left-radius: 4px;'}">
                            ${escapeHtml(msg.content)}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light); margin-top: 2px; ${isMine ? 'text-align: right; margin-right: 4px;' : 'margin-left: 4px;'}">
                            ${time}
                        </div>
                    </div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', bubbleHtml);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        // Load Pesan Terakhir
        const loadMessages = async () => {
            const { data, error } = await sb
                .from('messages') // Pastikan nama tabel sesuai ('messages' atau 'chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                chatMessages.innerHTML = ''; // Clear loading msg
                // Balik urutan agar yang lama di atas
                data.reverse().forEach(msg => {
                    renderMessage(msg, msg.user_id === user.id);
                });
            } else {
                chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 20px;">Belum ada pesan. Mulai obrolan!</div>';
            }
        };

        await loadMessages();

        // Subscribe Realtime
        const channel = sb
            .channel(`room:${roomId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const msg = payload.new;
                if (msg.user_id !== user.id) {
                    renderMessage(msg, false);
                }
            })
            .subscribe();

        // Handle Kirim Pesan
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            // Optimistic UI
            const optimisticMsg = {
                content: text,
                created_at: new Date().toISOString(),
                sender_name: myName,
                avatar_url: myAvatar,
                user_id: user.id
            };
            renderMessage(optimisticMsg, true);
            chatInput.value = '';

            // Kirim ke DB
            const { error } = await sb.from('messages').insert({
                room_id: roomId,
                user_id: user.id,
                content: text,
                sender_name: myName,
                avatar_url: myAvatar
            });

            if (error) {
                console.error('Gagal kirim pesan:', error);
                alert('Gagal mengirim pesan.');
            }
        });

    } catch (e) {
        console.error('Chat room error:', e);
    }
}

async function initCommunityPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('community.html')) return;
        
        const contentWrapper = document.querySelector('.content-wrapper');
        if (!contentWrapper) return;

        // Render UI Daftar Room
        contentWrapper.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">💬 Komunitas</h2>
                <button class="btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="alert('Fitur buat room segera hadir!')">
                    <i class="fas fa-plus"></i> Buat Room
                </button>
            </div>

            <div id="roomList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                <div style="text-align: center; padding: 40px; color: var(--text-light); grid-column: 1 / -1;">
                    <i class="fas fa-spinner fa-spin"></i> Memuat ruang diskusi...
                </div>
            </div>
        `;

        const sb = await getSupabaseClient();
        const roomList = document.getElementById('roomList');

        // Ambil daftar room dari database
        const { data: rooms, error } = await sb
            .from('chat_rooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            roomList.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); grid-column: 1 / -1;">Gagal memuat data.</div>`;
            return;
        }

        if (!rooms || rooms.length === 0) {
            // Jika kosong, buat room default (Diskusi Umum)
            await sb.from('chat_rooms').insert({
                title: 'Diskusi Umum',
                description: 'Tempat ngobrol santai seputar sejarah dan pelajaran.',
                type: 'public',
                avatar_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=300'
            });
            window.location.reload(); // Refresh untuk memuat room baru
            return;
        }

        roomList.innerHTML = rooms.map(room => `
            <div class="card" onclick="window.location.href='chat-room.html?id=${room.id}'" style="cursor: pointer; transition: transform 0.2s;">
                <div style="display: flex; align-items: center; padding: 16px;">
                    <img src="${room.avatar_url || 'assets/img/icon.png'}" style="width: 50px; height: 50px; border-radius: 12px; object-fit: cover; margin-right: 16px;">
                    <div style="flex: 1;">
                        <h3 class="card-title" style="margin-bottom: 4px; font-size: 16px;">${escapeHtml(room.title)}</h3>
                        <p class="card-text" style="font-size: 13px; line-height: 1.4;">${escapeHtml(room.description || 'Tidak ada deskripsi')}</p>
                    </div>
                    <div style="margin-left: 10px;">
                        <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
                    </div>
                </div>
                <div class="card-footer" style="padding: 12px 16px; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: var(--text-light);"><i class="fas fa-users"></i> ${Math.floor(Math.random() * 50) + 10} Anggota</span>
                    <span style="font-size: 12px; color: var(--primary); font-weight: 600;">Masuk</span>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Community page error:', e);
    }
}

async function initAchievementPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('achievement.html')) return;
        const root = document.getElementById('achievementRoot');
        if (!root) return;

        const sb = await getSupabaseClient();
        const { data: users, error } = await sb
            .from('profiles')
            .select('id, full_name, username, avatar_url, xp, level, badges')
            .order('xp', { ascending: false })
            .limit(10);

        if (error) {
            root.innerHTML = `<div style="text-align: center; padding: 20px;">Gagal memuat leaderboard.</div>`;
            return;
        }

        if (!users || users.length === 0) {
            root.innerHTML = `<div style="text-align: center; padding: 20px;">Belum ada data.</div>`;
            return;
        }

        // Pisahkan Top 3
        const top3 = users.slice(0, 3);
        const rest = users.slice(3);

        let podiumHtml = '';
        if (top3.length > 0) {
            // Urutan podium: 2 (kiri), 1 (tengah), 3 (kanan)
            const order = [1, 0, 2]; // Index di array top3
            
            podiumHtml = `<div style="display: flex; justify-content: center; align-items: flex-end; gap: 15px; margin-bottom: 40px; padding-top: 20px;">`;
            
            order.forEach(i => {
                if (!top3[i]) return;
                const u = top3[i];
                const rank = i + 1;
                const isFirst = rank === 1;
                const height = isFirst ? '180px' : (rank === 2 ? '140px' : '110px');
                const color = isFirst ? '#FFD700' : (rank === 2 ? '#C0C0C0' : '#CD7F32');
                const name = escapeHtml(u.full_name || u.username || 'User');
                const avatar = u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

                podiumHtml += `
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: ${isFirst ? '120px' : '100px'};">
                    <div style="position: relative; margin-bottom: 10px;">
                        <img src="${avatar}" style="width: ${isFirst ? '80px' : '60px'}; height: ${isFirst ? '80px' : '60px'}; border-radius: 50%; border: 3px solid ${color}; object-fit: cover;">
                        <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white;">${rank}</div>
                    </div>
                    <div style="font-weight: 600; font-size: ${isFirst ? '16px' : '14px'}; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${name}</div>
                    <div style="font-size: 12px; color: var(--primary); font-weight: bold;">${u.xp || 0} XP</div>
                    <div style="width: 100%; height: ${height}; background: linear-gradient(to top, ${color}20, ${color}00); border-top: 4px solid ${color}; border-radius: 8px 8px 0 0; margin-top: 10px;"></div>
                </div>`;
            });
            podiumHtml += `</div>`;
        }

        let listHtml = '';
        if (rest.length > 0) {
            listHtml = `<div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">`;
            rest.forEach((u, idx) => {
                const rank = idx + 4;
                const name = escapeHtml(u.full_name || u.username || 'User');
                const avatar = u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
                
                listHtml += `
                <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                    <div style="width: 30px; font-weight: bold; color: var(--text-light);">${rank}</div>
                    <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 15px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${name}</div>
                        <div style="font-size: 12px; color: var(--text-light);">Level ${u.level || 1} • ${u.badges || 0} Badge</div>
                    </div>
                    <div style="font-weight: bold; color: var(--primary);">${u.xp || 0} XP</div>
                </div>`;
            });
            listHtml += `</div>`;
        }

        root.innerHTML = podiumHtml + listHtml;

    } catch (e) {
        console.error('Achievement page error:', e);
    }
}
