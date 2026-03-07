let supabaseClient = null;
let supabaseClientPromise = null;
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

    // 1. Coba ambil dari Backend API (jika ada) - Prioritas Utama
    try {
        const res = await fetch('/api/supabase-public-config', { cache: 'no-store' });
        if (res.ok) {
            const cfg = await res.json();
            if (cfg && cfg.url && cfg.anonKey) {
                supabasePublicConfig = { 
                    url: cfg.url, 
                    anonKey: cfg.anonKey,
                    ytApiKey: cfg.ytApiKey, // Tambahkan YT API Key
                    midtransClientKey: cfg.midtransClientKey, // Tambahkan Midtrans Client Key
                    midtransIsProduction: cfg.midtransIsProduction // Tambahkan Mode Midtrans
                };
                return supabasePublicConfig;
            }
        }
    } catch (e) {
        console.warn('Backend config fetch failed, checking local fallback...');
    }

    // 2. Coba ambil dari window.TT_PUBLIC_CONFIG (Local Fallback)
    if (window.TT_PUBLIC_CONFIG && window.TT_PUBLIC_CONFIG.SUPABASE_URL && window.TT_PUBLIC_CONFIG.SUPABASE_ANON_KEY) {
        supabasePublicConfig = {
            url: window.TT_PUBLIC_CONFIG.SUPABASE_URL,
            anonKey: window.TT_PUBLIC_CONFIG.SUPABASE_ANON_KEY,
            ytApiKey: window.TT_PUBLIC_CONFIG.YT_API_KEY
        };
        return supabasePublicConfig;
    }

    throw new Error('Konfigurasi Supabase tidak ditemukan. Pastikan backend server berjalan atau file "assets/js/config.js" ada.');
}

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = (async () => {
        await loadSupabaseSdk();
        const cfg = await getSupabasePublicConfig();
        
        const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        // Listener Perubahan Auth (Penting untuk menangani Token Expired)
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                // Clear local data
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                });
                
                if (!window.location.pathname.endsWith('login.html')) {
                     window.location.href = 'login.html';
                }
            }
        });

        supabaseClient = client;
        supabaseClientPromise = null;
        return client;
    })();
    return supabaseClientPromise;
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
