// Favorites Logic

async function toggleFavorite() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    try {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();

        if (!user) {
            if (window.showCustomAlert) {
                window.showCustomAlert('info', 'Login Diperlukan', 'Silakan login untuk menyimpan materi.');
            } else {
                alert('Silakan login untuk menyimpan materi.');
            }
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const materiId = urlParams.get('id');

        if (!materiId) return;

        // Check if already favorited
        const { data: existing, error: checkErr } = await sb
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('materi_id', materiId)
            .maybeSingle();

        if (existing) {
            // Remove
            const { error: delErr } = await sb
                .from('favorites')
                .delete()
                .eq('id', existing.id);
            
            if (!delErr) {
                updateFavoriteBtn(false);
                if (window.showCustomAlert) window.showCustomAlert('success', 'Dihapus', 'Materi dihapus dari daftar simpan.');
            }
        } else {
            // Add
            const { error: insErr } = await sb
                .from('favorites')
                .insert([{ user_id: user.id, materi_id: materiId }]);
            
            if (!insErr) {
                updateFavoriteBtn(true);
                if (window.showCustomAlert) window.showCustomAlert('success', 'Disimpan', 'Materi berhasil disimpan!');
            }
        }

    } catch (e) {
        console.error('Toggle favorite error:', e);
    }
}

function updateFavoriteBtn(isSaved) {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    if (isSaved) {
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Tersimpan';
        btn.classList.add('active'); // Optional: add CSS for active state
        btn.style.background = '#e0e0e0';
        btn.style.color = '#333';
    } else {
        btn.innerHTML = '<i class="far fa-bookmark"></i> Simpan';
        btn.classList.remove('active');
        btn.style.background = ''; // Reset to default
        btn.style.color = '';
    }
}

async function checkFavoriteStatus() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    try {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const urlParams = new URLSearchParams(window.location.search);
        const materiId = urlParams.get('id');
        if (!materiId) return;

        const { data: existing } = await sb
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('materi_id', materiId)
            .maybeSingle();

        updateFavoriteBtn(!!existing);

        // Attach Click Event
        btn.onclick = toggleFavorite;

    } catch (e) {
        console.error('Check favorite error:', e);
    }
}

// Auto init on detail page
if (window.location.pathname.includes('content-detail.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other scripts
        setTimeout(checkFavoriteStatus, 500);
    });
}
