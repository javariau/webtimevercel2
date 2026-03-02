async function initMateriPage() {
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

    const renderMateriCards = (rows) => {
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi untuk kategori ini.</div>`;
            return;
        }

        cardsContainer.innerHTML = items
            .map((row) => {
                const title = row.title || row.judul || row.name || 'Materi';
                const meta = row.subtitle || row.meta || row.bab || '';
                const desc = (row.summary || row.description || row.content || '').slice(0, 140) + '...';
                const img = row.image_url || row.thumbnail_url || 'assets/img/placeholder.jpg';

                // Gunakan ID yang benar
                const href = `content-detail.html?id=${row.id}`;

                return `
                <div class="card" onclick="window.location.href='${href}'" style="cursor: pointer; transition: transform 0.2s;">
                    <div class="card-image-wrapper" style="width: 100%; height: 180px; overflow: hidden; position: relative;">
                        <img src="${img}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="card-body" style="padding: 16px;">
                        <div class="card-meta" style="font-size: 12px; color: var(--primary); font-weight: 600; margin-bottom: 8px;">${meta || 'Materi Sejarah'}</div>
                        <h3 class="card-title" style="font-size: 18px; margin-bottom: 8px; line-height: 1.4;">${title}</h3>
                        <p class="card-text" style="font-size: 14px; color: var(--text-light); line-height: 1.6;">${desc}</p>
                    </div>
                    <div class="card-footer" style="padding: 16px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: var(--text-light);"><i class="fas fa-clock"></i> 5 min baca</span>
                        <span style="color: var(--primary); font-weight: 600; font-size: 14px;">Baca <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');
    };

    const loadMateri = async (categoryId) => {
        try {
            setCardsMessage('Memuat materi...');
            const sb = await getSupabaseClient();

            let premiumOk = false;
            try {
                const { data: sessionData } = await sb.auth.getSession();
                const user = sessionData && sessionData.session ? sessionData.session.user : null;
                premiumOk = user && typeof window.isPremiumActive === 'function' ? await window.isPremiumActive(sb, user.id) : false;
            } catch (e) {
                premiumOk = false;
            }

            let q = sb
                .from('materi')
                .select('id, category_id, title, subtitle, image_url, summary, created_at')
                .order('created_at', { ascending: false }); // Tampilkan semua tanpa limit ketat

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

            // Override: Tampilkan semua materi (Premium diabaikan)
            renderMateriCards(rows);
            
            /* Logic Premium Sebelumnya (Dinonaktifkan)
            if (!premiumOk) {
                const freeCount = 6;
                const visible = rows.slice(0, freeCount);
                renderMateriCards(visible);
                if (rows.length > freeCount) {
                     // ... card premium ...
                }
                return;
            }
            renderMateriCards(rows);
            */
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
