async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-src="${src}"]`);
        if (existing) {
            resolve();
            return;
        }

        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.dataset.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(s);
    });
}

async function boot() {
    try {
        let configLoaded = false;
        
        // 1. Coba load config.js (Prioritas Utama)
        try {
            await loadScript('assets/js/config.js');
            if (window.TT_PUBLIC_CONFIG) configLoaded = true;
        } catch (e) {
            console.warn('config.js not found or error loading, trying fallback.');
        }

        // 2. Coba load config.example.js (Fallback)
        if (!configLoaded) {
            try { 
                await loadScript('assets/js/config.example.js'); 
                if (window.TT_PUBLIC_CONFIG) configLoaded = true;
            } catch (e) { 
                console.error('No config file found!'); 
            }
        }

        // 3. Last Resort: Hardcoded Config (Jika file config benar-benar hilang/corrupt)
        if (!configLoaded) {
            console.warn('Using Hardcoded Config as last resort.');
            window.TT_PUBLIC_CONFIG = {
                SUPABASE_URL: 'https://vbxwnuahsljkvpfrkfcd.supabase.co',
                SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieHdudWFoc2xqa3ZwZnJrZmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzU3ODYsImV4cCI6MjA3NzMxMTc4Nn0.HYsRLQT_WlItxiMK_Z7ZGDIMkEHA2n3bX1jtJJHtmFI'
            };
        }

        await loadScript('assets/js/supabaseClient.js');
        await loadScript('assets/js/ui.js');
        await loadScript('assets/js/auth.js');
        await loadScript('assets/js/materiPage.js');
        await loadScript('assets/js/dataPages.js');
        await loadScript('assets/js/dailyTasks.js'); // Load Daily Tasks System
        await loadScript('assets/js/bootstrap.js');

        // Pastikan initApp ada sebelum dijalankan
        if (typeof window.initApp === 'function') {
            window.initApp();
        } else {
            console.error('initApp is not defined. Check bootstrap.js loading.');
        }

        // Init Notification Badge
        if (typeof updateNotificationBadge === 'function') {
            updateNotificationBadge();
        }
    } catch (err) {
        console.error('Failed to boot app:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot().catch(console.error));
} else {
    boot().catch(console.error);
}
