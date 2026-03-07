async function initMateriPageV2() {
    console.log('initMateriPageV2 STARTED'); // Debug log
    const pillsContainer = document.getElementById('materiCategoryPills');
    const cardsContainer = document.getElementById('materiCards');
    if (!pillsContainer || !cardsContainer) return;

    const urlParams = new URLSearchParams(window.location.search || '');
    const searchQuery = String(urlParams.get('q') || '').trim().toLowerCase();

    const headerSearchInput = document.querySelector('.top-header .search-bar input');
    if (headerSearchInput && searchQuery) {
        headerSearchInput.value = searchQuery;
    }

    const setCardsMessage = (message) => {
        cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">${message}</div>`;
    };

    const safeText = (value) => {
        if (value === null || value === undefined) return '';
        return String(value);
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const renderMateriCards = (rows) => {
        const items = Array.isArray(rows) ? rows : [];
        const cardsContainer = document.getElementById('materiCards');
        if (!items.length) {
            cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi untuk kategori ini.</div>`;
            return;
        }

        cardsContainer.innerHTML = items.map((row) => {
            const title = row.title || row.judul || row.name || 'Materi';
            const meta = row.subtitle || row.meta || row.bab || '';
            // Strip HTML from description to ensure line-clamp works correctly
            const rawDesc = row.summary || row.description || row.content || '';
            const desc = stripHtml(rawDesc);
            
            const img = row.image_url || row.thumbnail_url || 'assets/img/placeholder.jpg';
            const href = `content-detail.html?id=${row.id}`;

            return `
            <div class="card" onclick="window.location.href='${href}'" style="cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column; height: 100%;">
                <div class="card-image-wrapper" style="width: 100%; height: 180px; position: relative;">
                    <img src="${img}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="card-body" style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
                    <div class="card-meta" style="font-size: 12px; color: var(--primary); font-weight: 600; margin-bottom: 8px;">${meta || 'Materi Sejarah'}</div>
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em;">${title}</h3>
                    <div class="card-text" style="font-size: 13px; color: var(--text-light); line-height: 1.5; margin-bottom: 8px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 39px;">${desc}</div>
                    <span class="card-read-more" style="font-size: 12px; font-weight: 700; color: #d4af37; margin-top: auto;">Baca Selengkapnya <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>`;
        }).join('');
    };

    const loadMateri = async (categoryId) => {
        try {
            setCardsMessage('Memuat materi...');
            const sb = await getSupabaseClient();

            let isPremium = false;
            try {
                const { data: sessionData } = await sb.auth.getSession();
                const user = sessionData && sessionData.session ? sessionData.session.user : null;
                
                if (user) {
                    // DEBUG: Ambil semua kolom dulu agar tidak error jika kolom spesifik hilang
                    const { data: profile, error: profErr } = await sb
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    console.log('--- DEBUG PREMIUM CHECK ---');
                    console.log('User ID:', user.id);
                    console.log('Profile Data:', profile);
                    console.log('Profile Error:', profErr);

                    if (profile) {
                        // Cek berbagai kemungkinan nama kolom
                        const isPremiumBool = !!profile.is_premium;
                        const planPremium = (profile.plan === 'premium');
                        
                        // Cek tanggal expired (support nama kolom berbeda)
                        const expiryStr = profile.premium_until || profile.premium_expires_at || profile.expires_at;
                        const notExpired = expiryStr ? new Date(expiryStr) > new Date() : false;
                        
                        // Logika Gabungan:
                        // Premium jika: (is_premium TRUE ATAU plan='premium') DAN (tidak expired atau permanent)
                        const statusActive = isPremiumBool || planPremium;
                        isPremium = statusActive && (expiryStr === null || expiryStr === undefined || notExpired);
                        
                        console.log('isPremiumBool:', isPremiumBool);
                        console.log('planPremium:', planPremium);
                        console.log('expiryStr:', expiryStr);
                        console.log('notExpired:', notExpired);
                        console.log('FINAL isPremium:', isPremium);
                    }
                }
            } catch (e) {
                console.error('Premium Check Error:', e);
                isPremium = false;
            }

            let q = sb
                .from('materi')
                .select('id, category_id, title, subtitle, image_url, summary, created_at')
                .order('created_at', { ascending: false });

            if (categoryId) q = q.eq('category_id', categoryId);

            const { data, error } = await q;
            if (error) throw error;

            let rows = Array.isArray(data) ? data : [];
            if (searchQuery) {
                rows = rows.filter((r) => {
                    const hay = `${safeText(r.title)} ${safeText(r.summary)} ${safeText(r.subtitle)}`.toLowerCase();
                    return hay.includes(searchQuery);
                });
            }

            // Logic Premium vs Free
            if (isPremium) {
                renderMateriCards(rows);
            } else {
                const freeCount = 6;
                const visible = rows.slice(0, freeCount);
                renderMateriCards(visible);
                
                if (rows.length > freeCount) {
                    const lockCard = document.createElement('div');
                    lockCard.className = 'card';
                    lockCard.style.cssText = 'background: #f8f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; border: 2px dashed #ccc; cursor: pointer; min-height: 380px;';
                    lockCard.onclick = () => window.location.href = 'premium.html';
                    lockCard.innerHTML = `
                        <div style="font-size: 48px; margin-bottom: 15px; color: var(--text-light);">🔒</div>
                        <h3 style="font-size: 18px; margin-bottom: 8px;">Konten Premium</h3>
                        <p style="font-size: 14px; color: var(--text-light); margin-bottom: 20px; line-height: 1.5;">
                            Terdapat <b>${rows.length - freeCount}</b> materi tambahan yang terkunci.<br>
                            Upgrade akun Anda untuk membuka semua akses.
                        </p>
                        <button class="btn-primary" style="padding: 10px 20px; font-size: 14px; border-radius: 50px;">
                            <i class="fas fa-crown"></i> Buka Akses Premium
                        </button>
                    `;
                    cardsContainer.appendChild(lockCard);
                }
            }
        } catch (e) {
            console.error('Materi load error:', e);
            setCardsMessage('Gagal memuat materi.');
        }
    };

    const renderCategoryPills = (categories) => {
        const items = Array.isArray(categories) ? categories : [];
        const allBtn = document.createElement('button');
        allBtn.className = 'pill active';
        allBtn.type = 'button';
        allBtn.textContent = 'Semua';
        allBtn.addEventListener('click', () => {
            pillsContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
            allBtn.classList.add('active');
            loadMateri(null);
        });
        pillsContainer.appendChild(allBtn);

        items.forEach((cat) => {
            const btn = document.createElement('button');
            btn.className = 'pill';
            btn.type = 'button';
            btn.textContent = safeText(cat.name || cat.nama || 'Kategori');
            btn.addEventListener('click', () => {
                pillsContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                loadMateri(cat.id);
            });
            pillsContainer.appendChild(btn);
        });
    };

    try {
        pillsContainer.innerHTML = '';
        const sb = await getSupabaseClient();
        const { data: categories, error } = await sb
            .from('categories')
            .select('id, name')
            .order('name', { ascending: true });
        if (error) throw error;

        renderCategoryPills(categories);
        await loadMateri(null);
    } catch (e) {
        pillsContainer.innerHTML = '';
        setCardsMessage('Gagal memuat kategori.');
    }
}

async function initMateriDetailPage() {
    const titleEl = document.getElementById('contentTitle');
    const imageEl = document.getElementById('contentImage');
    const bodyEl = document.getElementById('contentBody');
    const videoContainer = document.getElementById('contentVideoContainer');
    const videoFrame = document.getElementById('contentVideoFrame');
    const dateEl = document.getElementById('contentMetaDate');

    if (!titleEl || !bodyEl) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (!id) {
            bodyEl.innerHTML = '<p>ID materi tidak ditemukan.</p>';
            return;
        }

        const sb = await getSupabaseClient();
        const { data: materi, error } = await sb
            .from('materi')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !materi) {
            bodyEl.innerHTML = '<p>Materi tidak ditemukan atau telah dihapus.</p>';
            return;
        }

        // Populate Data
        titleEl.textContent = materi.title || 'Tanpa Judul';
        
        if (imageEl) {
            imageEl.src = materi.image_url || 'assets/img/placeholder.jpg';
            imageEl.alt = materi.title;
        }

        if (dateEl && materi.created_at) {
            const date = new Date(materi.created_at);
            dateEl.textContent = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        const sbClient = await getSupabaseClient();
        const { data: sessionData } = await sbClient.auth.getSession();
        const sessUser = sessionData && sessionData.session ? sessionData.session.user : null;
        const isPremium = sessUser ? await isPremiumActive(sbClient, sessUser.id) : false;

        if (videoContainer) {
            if (materi.video_url) {
                if (isPremium) {
                    // Show Video for Premium User
                    let embedUrl = materi.video_url;
                    // Simple converter for YouTube watch URL to embed
                    if (embedUrl.includes('youtube.com/watch?v=')) {
                        const videoId = embedUrl.split('v=')[1].split('&')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    } else if (embedUrl.includes('youtu.be/')) {
                        const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    }
                    
                    if (videoFrame) videoFrame.src = embedUrl;
                    videoContainer.style.display = 'block';
                } else {
                    videoContainer.style.display = 'block';
                    const ret = encodeURIComponent(window.location.href);
                    videoContainer.innerHTML = `<div style="background:#2c1a15;color:#fff;padding:40px 20px;text-align:center;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:315px;">
                        <i class="fas fa-lock" style="font-size:48px;color:#FFD700;margin-bottom:15px;"></i>
                        <h3 style="margin:0 0 10px 0;">Video Eksklusif Premium</h3>
                        <p style="margin:0 0 20px 0;font-size:14px;opacity:.9;">Upgrade ke akun Premium untuk menonton video pembelajaran ini.</p>
                        <a href="premium.html?return=${ret}" style="background:linear-gradient(135deg,#FFD700 0%,#B8860B 100%);border:none;padding:10px 24px;border-radius:20px;font-weight:700;color:#2c1a15;cursor:pointer;text-decoration:none;display:inline-block;">Buka Kunci <i class="fas fa-crown"></i></a>
                    </div>`;
                }
            } else {
                videoContainer.style.display = 'none';
            }
        }

        // Handle Content & Illustration
        // Prioritize 'content' if exists (future proof), fallback to 'summary'
        const content = materi.content || materi.summary || '<p>Belum ada deskripsi materi.</p>';
        let formattedContent = '';

        // Convert newlines to paragraphs if it's plain text
        if (!content.includes('<p>')) {
            formattedContent = content.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');
        } else {
            formattedContent = content;
        }

        // Inject Illustration Image after first paragraph if content is long enough
        if (formattedContent.includes('</p>')) {
            // Default illustration (fallback)
            let illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/440px-Aristotle_Altemps_Inv8575.jpg';
            
            // Custom illustration mapping based on title (temporary until DB has illustration_url)
            if (materi.title && materi.title.toLowerCase().includes('orde baru')) {
                illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Suharto_1993.jpg'; // Gambar Soeharto
            } else if (materi.title && materi.title.toLowerCase().includes('proklamasi')) {
                illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Soekarno_reading_proclamation_of_independence.jpg/640px-Soekarno_reading_proclamation_of_independence.jpg';
            }

            // Create illustration HTML
            const illustrationHtml = `
                <div class="content-illustration" style="margin: 25px 0; text-align: center;">
                    <img src="${materi.illustration_url || illustrationUrl}" alt="Ilustrasi ${materi.title}" style="width: 100%; max-width: 600px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <span style="display: block; font-size: 13px; color: var(--text-light); margin-top: 8px; font-style: italic;">Ilustrasi: ${materi.title}</span>
                </div>
            `;

            // Insert after first paragraph
            formattedContent = formattedContent.replace('</p>', `</p>${illustrationHtml}`);
        }

        bodyEl.innerHTML = formattedContent;
        
        // --- MUSIC PLAYER LOGIC ---
        initMusicPlayer();

    } catch (e) {
        console.error('Detail load error:', e);
        bodyEl.innerHTML = '<p>Terjadi kesalahan saat memuat materi.</p>';
    }
}

function initMusicPlayer() {
    const container = document.getElementById('musicPlayerContainer');
    const controls = document.getElementById('musicControls');
    const toggleBtn = document.getElementById('toggleMusicBtn');
    const prevBtn = document.getElementById('prevTrackBtn');
    const nextBtn = document.getElementById('nextTrackBtn');
    const trackNameEl = document.getElementById('currentTrackName');
    const statusEl = document.getElementById('musicStatus');
    const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
    const searchBtn = document.getElementById('searchMusicBtn');
    const searchPanel = document.getElementById('musicSearchPanel');
    const searchInput = document.getElementById('musicSearchInput');
    const searchResults = document.getElementById('musicSearchResults');

    if (!container || !controls || !toggleBtn || !prevBtn || !nextBtn || !trackNameEl || !statusEl || !icon) return;

    // --- SEARCH LOGIC (FALLBACK) ---
    // If API Key is missing, use search link instead of embedded search
    const searchEnabled = false; // Fix ReferenceError
    if (searchBtn) {
        if (!searchEnabled) {
            searchBtn.style.display = 'inline-block'; // Show anyway
            searchBtn.onclick = () => {
                window.open('https://www.youtube.com/results?search_query=lofi+study+music', '_blank');
            };
        } else {
            // Normal Search Logic
            searchBtn.onclick = () => {
                const isHidden = searchPanel.style.display === 'none';
                searchPanel.style.display = isHidden ? 'block' : 'none';
                if (isHidden) searchInput.focus();
            };
        }
    }

    let ytPlayerDiv = document.getElementById('ytPlayerHidden');
    if (!ytPlayerDiv) {
        ytPlayerDiv = document.createElement('div');
        ytPlayerDiv.id = 'ytPlayerHidden';
        ytPlayerDiv.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0.01; pointer-events: none;';
        document.body.appendChild(ytPlayerDiv);
    }

    const youtubePlaylist = [
        { title: 'Lofi Girl - Study Beats', videoId: 'jfKfPfyJRdk' }, // Lofi Girl Live
        { title: 'Relaxing Jazz Piano', videoId: 'Dx5qFachd3A' }, // Jazz
        { title: 'Classical Mozart', videoId: 'Rb0UmrCXxVA' }, // Mozart
        { title: 'Rainy Night Coffee', videoId: 'l18s5Q767O8' } // Ambience
    ];

    let currentTrackIndex = 0;
    let isExpanded = false;
    let player = null;
    let isPlayerReady = false;
    let isPlaying = false;
    let pendingIndex = null;
    let pendingPlay = false;

    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    function onPlayerReady(event) {
        isPlayerReady = true;
        updateTrackInfo();
        const idxToLoad = pendingIndex != null ? pendingIndex : currentTrackIndex;
        pendingIndex = null;

        if (player && youtubePlaylist[idxToLoad]) {
            currentTrackIndex = idxToLoad;
            updateTrackInfo();
            player.cueVideoById(youtubePlaylist[currentTrackIndex].videoId);
        }

        if (pendingPlay && player) {
            pendingPlay = false;
            player.playVideo();
        }
    }

    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.PLAYING) {
            isPlaying = true;
            icon.className = 'fas fa-pause';
            statusEl.textContent = 'Memutar...';
        } else if (event.data == YT.PlayerState.PAUSED) {
            isPlaying = false;
            icon.className = 'fas fa-play';
            statusEl.textContent = 'Dipaus';
        } else if (event.data == YT.PlayerState.ENDED) {
            playNextTrack();
        } else if (event.data == YT.PlayerState.BUFFERING) {
            statusEl.textContent = 'Memuat...';
        }
    }

    function onPlayerError(event) {
        console.error('YouTube Player Error:', event.data);
        statusEl.textContent = 'Gagal memuat';
        isPlaying = false;
        icon.className = 'fas fa-play';
        setTimeout(() => playNextTrack(), 2000);
    }

    const loadTrack = (index) => {
        if (index < 0) index = youtubePlaylist.length - 1;
        if (index >= youtubePlaylist.length) index = 0;
        currentTrackIndex = index;
        updateTrackInfo();

        if (!isPlayerReady || !player) {
            pendingIndex = currentTrackIndex;
            return;
        }

        player.loadVideoById(youtubePlaylist[currentTrackIndex].videoId);
    };

    const updateTrackInfo = () => {
        trackNameEl.textContent = youtubePlaylist[currentTrackIndex].title;
        trackNameEl.title = youtubePlaylist[currentTrackIndex].title;
    };

    const togglePlay = () => {
        if (!isPlayerReady || !player) {
            pendingPlay = true;
            statusEl.textContent = 'Memuat...';
            icon.className = 'fas fa-play';
            return;
        }
        
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };

    const playNextTrack = () => {
        pendingPlay = true;
        loadTrack(currentTrackIndex + 1);
    };

    const playPrevTrack = () => {
        pendingPlay = true;
        loadTrack(currentTrackIndex - 1);
    };

    toggleBtn.addEventListener('click', () => {
        if (!isExpanded) {
            // Expand UI
            controls.style.display = 'flex';
            container.style.padding = '10px 20px';
            container.style.borderRadius = '50px';
            toggleBtn.style.transform = 'rotate(360deg)';
            isExpanded = true;
            
            // First time click: Start Playing
            if (!isPlaying) {
                togglePlay();
            }
        } else {
            // Just toggle play/pause when already expanded
            togglePlay();
        }
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playNextTrack();
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playPrevTrack();
    });

    const renderSearchResults = (items) => {
        if (!searchResults) return;
        if (!Array.isArray(items) || items.length === 0) {
            searchResults.innerHTML = '<div style="padding:8px 10px;color:#666;font-size:13px;">Tidak ada hasil</div>';
            return;
        }
        searchResults.innerHTML = items.map((it, idx) => {
            const title = it.snippet && it.snippet.title ? it.snippet.title : 'Video';
            const thumb = it.snippet && it.snippet.thumbnails && it.snippet.thumbnails.default ? it.snippet.thumbnails.default.url : '';
            return `<div data-vid="${it.id.videoId}" data-title="${title.replace(/\"/g,'&quot;')}" style="display:flex;gap:8px;align-items:center;padding:8px 10px;cursor:pointer;border-radius:8px;">
                ${thumb ? `<img src="${thumb}" alt="" width="60" height="45" style="object-fit:cover;border-radius:6px;border:1px solid var(--border);">` : ''}
                <div style="flex:1; font-size:13px; line-height:1.3;">${title}</div>
            </div>`;
        }).join('');
        Array.from(searchResults.children).forEach((row) => {
            row.addEventListener('click', () => {
                const vid = row.getAttribute('data-vid');
                const ttl = row.getAttribute('data-title') || 'YouTube';
                if (!vid) return;
                youtubePlaylist.unshift({ title: ttl, videoId: vid });
                currentTrackIndex = 0;
                pendingPlay = true;
                loadTrack(0);
                if (searchPanel) searchPanel.style.display = 'none';
                if (!isExpanded) {
                    controls.style.display = 'flex';
                    container.style.padding = '10px 20px';
                    container.style.borderRadius = '50px';
                    toggleBtn.style.transform = 'rotate(360deg)';
                    isExpanded = true;
                }
            });
        });
    };

    const performSearch = async (q) => {
        if (!q || !searchResults) return;

        let key = null;
        try {
            const config = await getSupabasePublicConfig();
            key = config.ytApiKey;
        } catch (e) {
            console.warn('Config load failed:', e);
        }

        if (!key) {
            // Fallback: Cek global config lama
            if (window.TT_PUBLIC_CONFIG && window.TT_PUBLIC_CONFIG.YT_API_KEY) {
                key = window.TT_PUBLIC_CONFIG.YT_API_KEY;
            }
        }

        if (!key) {
            searchResults.innerHTML = '<div style="padding:8px 10px;color:#666;font-size:13px;">Gagal memuat YT_API_KEY dari server. Cek koneksi backend.</div>';
            return;
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&videoEmbeddable=true&safeSearch=none&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
        try {
            searchResults.innerHTML = '<div style="padding:8px 10px;color:#666;font-size:13px;">Mencari...</div>';
            const res = await fetch(url);
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            renderSearchResults(items);
        } catch (e) {
            searchResults.innerHTML = '<div style="padding:8px 10px;color:#666;font-size:13px;">Gagal mencari. Coba lagi.</div>';
        }
    };

    if (searchBtn && searchPanel && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const visible = searchPanel.style.display === 'block';
            searchPanel.style.display = visible ? 'none' : 'block';
            if (!visible) {
                searchInput.focus();
            }
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(String(searchInput.value || '').trim());
            }
        });
    }

    const ensurePlayer = () => {
        if (player) return;
        if (!(window.YT && window.YT.Player)) return;
        player = new YT.Player('ytPlayerHidden', {
            height: '200',
            width: '200',
            videoId: youtubePlaylist[currentTrackIndex].videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'fs': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    window.__tt_yt_music_ready_callbacks = window.__tt_yt_music_ready_callbacks || [];
    window.__tt_yt_music_ready_callbacks.push(ensurePlayer);
    if (!window.__tt_youtube_api_ready_hooked) {
        const prevCb = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            if (typeof prevCb === 'function') {
                try { prevCb(); } catch (e) {}
            }
            const list = window.__tt_yt_music_ready_callbacks || [];
            list.forEach((fn) => {
                try { fn(); } catch (e) {}
            });
        };
        window.__tt_youtube_api_ready_hooked = true;
    }
    ensurePlayer();
    
    // Set Initial Info
    updateTrackInfo();
}

// Expose to window so app.js can call it
window.initMateriDetailPage = initMateriDetailPage;
