const SUPABASE_URL = 'https://vbxwnuahsljkvpfrkfcd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieHdudWFoc2xqa3ZwZnJrZmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzU3ODYsImV4cCI6MjA3NzMxMTc4Nn0.HYsRLQT_WlItxiMK_Z7ZGDIMkEHA2n3bX1jtJJHtmFI';

let supabaseClient = null;

function loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
        document.head.appendChild(script);
    });
}

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    await loadSupabaseSdk();
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
