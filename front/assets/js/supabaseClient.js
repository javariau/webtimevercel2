let supabaseClient = null;
let supabasePublicConfig = null;

function loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Gagal memuat Supabase SDK. Pastikan internet aktif.'));
        document.head.appendChild(script);
    });
}

async function getSupabasePublicConfig() {
    if (supabasePublicConfig) return supabasePublicConfig;

    try {
        const res = await fetch('/api/supabase-public-config', { cache: 'no-store' });
        if (!res.ok) {
            const message = await res.text();
            throw new Error(message || `HTTP ${res.status}`);
        }
        const cfg = await res.json();
        if (!cfg || !cfg.url || !cfg.anonKey) {
            throw new Error('Config Supabase tidak lengkap.');
        }
        supabasePublicConfig = { url: String(cfg.url), anonKey: String(cfg.anonKey) };
        return supabasePublicConfig;
    } catch (e) {
        const msg = 'Konfigurasi Supabase belum siap. Isi SUPABASE_URL & SUPABASE_ANON_KEY di backend/.env lalu jalankan server.';
        console.error(msg, e);
        alert(msg);
        throw new Error(msg);
    }
}

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    await loadSupabaseSdk();
    const cfg = await getSupabasePublicConfig();
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return supabaseClient;
}

async function isPremiumActive(sb, userId) {
    try {
        if (!sb || !userId) return false;
        const nowIso = new Date().toISOString();

        try {
            const { data: prof } = await sb.from('profiles').select('premium_expires_at').eq('id', userId).maybeSingle();
            if (prof && prof.premium_expires_at && String(prof.premium_expires_at) > nowIso) return true;
        } catch (e) {
            // ignore
        }

        const { data: purchases, error } = await sb
            .from('premium_purchases')
            .select('id, status, expires_at, confirmed_at, created_at')
            .eq('user_id', userId)
            .eq('status', 'confirmed')
            .order('confirmed_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) return false;
        const row = Array.isArray(purchases) && purchases[0] ? purchases[0] : null;
        if (!row) return false;
        if (!row.expires_at) return true;
        return String(row.expires_at) > nowIso;
    } catch (e) {
        return false;
    }
}

window.isPremiumActive = isPremiumActive;

async function requireAuthIfNeeded() {
    if (document.body && document.body.dataset && document.body.dataset.page === 'auth') return;
    if (!document.body || !document.body.dataset || document.body.dataset.requireAuth !== 'true') return;

    const sb = await getSupabaseClient();
    const { data } = await sb.auth.getSession();
    if (!data || !data.session) {
        window.location.href = 'login.html';
    }
}
