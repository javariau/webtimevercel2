function initApp() {
    // 1. Inisialisasi Logo Aplikasi di Sidebar
    const logoImgSrc = 'assets/img/Frame 1000001789.png';
    document.querySelectorAll('.sidebar-header .logo').forEach((logo) => {
        if (!logo) return;
        logo.innerHTML = `<img src="${logoImgSrc}" alt="Time Track" width="180" height="60" style="object-fit: contain;">`;
    });

    // 2. Fungsi Helper untuk Toggle Visibility Password
    const togglePassword = (input, btn) => {
        if (!input || !btn) return;
        const icon = btn.querySelector('i');
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        if (icon) {
            icon.classList.toggle('fa-eye', !isHidden);
            icon.classList.toggle('fa-eye-slash', isHidden);
        }
        btn.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
    };

    // 3. Fungsi Helper untuk Menampilkan Error Login/Register
    const showAuthError = (msg) => {
        const message = String(msg || '').trim();
        if (!message) return;
        const errEl = document.getElementById('loginError') || document.getElementById('registerError');
        if (!errEl) return;
        errEl.textContent = message;
        errEl.classList.add('form-error');
        errEl.style.display = 'block';
    };

    // 4. Fungsi Helper untuk Membersihkan Error
    const clearAuthError = () => {
        const errEl = document.getElementById('loginError') || document.getElementById('registerError');
        if (!errEl) return;
        errEl.style.display = 'none';
        errEl.classList.remove('form-error');
        errEl.textContent = '';
    };

    // 5. Logika Halaman Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        try {
            // Cek fitur "Ingat Saya" (Remember Me)
            const remembered = localStorage.getItem('tt_remember_identifier');
            const identifierInput = document.getElementById('loginIdentifier');
            const rememberMe = document.getElementById('rememberMe');

            if (remembered && identifierInput) {
                identifierInput.value = remembered;
                if (rememberMe) rememberMe.checked = true;
            }
        } catch (e) {
            // abaikan error akses localStorage
        }

        // Setup toggle password login
        const loginPasswordInput = document.getElementById('loginPassword');
        const toggleLoginPasswordBtn = document.getElementById('toggleLoginPasswordBtn');
        if (loginPasswordInput && toggleLoginPasswordBtn) {
            toggleLoginPasswordBtn.addEventListener('click', () => togglePassword(loginPasswordInput, toggleLoginPasswordBtn));
        }

        // Handle Submit Login
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const errEl = document.getElementById('loginError');
            if (errEl) {
                errEl.style.display = 'none';
                errEl.classList.remove('form-error');
                errEl.textContent = '';
            }
            try {
                // Simpan username jika "Ingat Saya" dicentang
                try {
                    const rememberMe = document.getElementById('rememberMe');
                    const identifierInput = document.getElementById('loginIdentifier');
                    if (rememberMe && identifierInput) {
                        if (rememberMe.checked) {
                            localStorage.setItem('tt_remember_identifier', String(identifierInput.value || '').trim());
                        } else {
                            localStorage.removeItem('tt_remember_identifier');
                        }
                    }
                } catch (e) {
                    // abaikan
                }
                
                // Proses Login ke Supabase
                const res = await handleLoginSubmit(loginForm);
                if (res && res.ok) {
                    window.location.href = 'index.html'; // Redirect ke dashboard
                    return;
                }

                const msg = res && res.message ? String(res.message) : 'Email/username dan sandi salah, coba lagi.';
                if (errEl) {
                    errEl.textContent = msg;
                    errEl.classList.add('form-error');
                    errEl.style.display = 'block';
                }
            } catch (err) {
                if (errEl) {
                    const msg = err && err.message ? String(err.message) : 'Login gagal. Coba lagi.';
                    errEl.textContent = msg;
                    errEl.classList.add('form-error');
                    errEl.style.display = 'block';
                }
            }
        });
    }

    // 6. Setup Tombol Login Sosial (Google)
    const googleBtns = [
        document.getElementById('googleLoginBtn'),
        document.getElementById('googleRegisterBtn'),
    ].filter(Boolean);
    googleBtns.forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            clearAuthError();
            if (typeof window.handleOAuthSignIn === 'function') {
                const res = await window.handleOAuthSignIn('google');
                if (res && res.ok === false) {
                    showAuthError(res.message || 'Gagal login. Coba lagi.');
                }
            }
        });
    });

    // 7. Setup Tombol Login Sosial (Facebook)
    const facebookBtns = [
        document.getElementById('facebookLoginBtn'),
        document.getElementById('facebookRegisterBtn'),
    ].filter(Boolean);
    facebookBtns.forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            clearAuthError();
            if (typeof window.handleOAuthSignIn === 'function') {
                const res = await window.handleOAuthSignIn('facebook');
                if (res && res.ok === false) {
                    showAuthError(res.message || 'Gagal login. Coba lagi.');
                }
            }
        });
    });

    // 8. Logika Halaman Register
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Toggle password register
        const regPass = document.getElementById('registerPassword');
        const regPassBtn = document.getElementById('toggleRegisterPasswordBtn');
        if (regPass && regPassBtn) {
            regPassBtn.addEventListener('click', () => togglePassword(regPass, regPassBtn));
        }

        // Toggle konfirmasi password
        const regPass2 = document.getElementById('registerPasswordConfirm');
        const regPass2Btn = document.getElementById('toggleRegisterPasswordConfirmBtn');
        if (regPass2 && regPass2Btn) {
            regPass2Btn.addEventListener('click', () => togglePassword(regPass2, regPass2Btn));
        }

        // Handle Submit Register
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                await handleRegisterSubmit(registerForm);
            } catch (err) {
                alert('Register gagal. Coba lagi.');
            }
        });
    }

    // 9. Logika Lupa Password
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                if (typeof window.handleForgotPasswordSubmit === 'function') {
                    await window.handleForgotPasswordSubmit(forgotForm);
                }
            } catch (err) {
                alert('Gagal mengirim link reset. Coba lagi.');
            }
        });
    }

    // 10. Logika Reset Password
    const resetForm = document.getElementById('resetPasswordForm');
    if (resetForm) {
        if (typeof window.ensureRecoverySessionFromUrl === 'function') {
            window.ensureRecoverySessionFromUrl().catch(() => null);
        }

        const pass1 = document.getElementById('resetPasswordInput');
        const pass1Btn = document.getElementById('toggleResetPasswordBtn');
        if (pass1 && pass1Btn) pass1Btn.addEventListener('click', () => togglePassword(pass1, pass1Btn));

        const pass2 = document.getElementById('resetPasswordConfirmInput');
        const pass2Btn = document.getElementById('toggleResetPasswordConfirmBtn');
        if (pass2 && pass2Btn) pass2Btn.addEventListener('click', () => togglePassword(pass2, pass2Btn));

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                if (typeof window.handleResetPasswordSubmit === 'function') {
                    await window.handleResetPasswordSubmit(resetForm);
                }
            } catch (err) {
                alert('Gagal reset password. Coba lagi.');
            }
        });
    }

    // 11. UI Interaction: Pilihan Gender
    document.querySelectorAll('.gender-option').forEach(option => {
        option.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.gender-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('input').checked = false;
            });
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });

    // 12. UI Interaction: Pills Kategori
    document.querySelectorAll('.category-pills .pill').forEach(pill => {
        pill.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 13. Fitur Pencarian di Header
    const headerSearchInput = document.querySelector('.top-header .search-bar input');
    if (headerSearchInput) {
        headerSearchInput.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const q = String(headerSearchInput.value || '').trim();
            if (!q) {
                window.location.href = 'materi.html';
                return;
            }
            window.location.href = `materi.html?q=${encodeURIComponent(q)}`;
        });
    }

    // 14. Mobile Menu: Tutup Sidebar saat klik di luar
    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.mobile-menu-btn');

        if (
            window.innerWidth <= 992 &&
            sidebar &&
            menuBtn &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target) &&
            sidebar.classList.contains('open')
        ) {
            toggleSidebar();
        }
    });

    // 15. Inisialisasi Halaman Spesifik
    if (typeof window.initMateriPageV2 === 'function') {
        console.log('Calling initMateriPageV2 from bootstrap...');
        window.initMateriPageV2();
    } else if (typeof initMateriPage === 'function') {
        console.warn('Fallback to initMateriPage (Old Version?)');
        initMateriPage();
    }
    
    if (typeof initTimelinePage === 'function') initTimelinePage();
    
    // Deteksi otomatis halaman detail materi
    if (window.location.pathname.includes('content-detail.html')) {
        if (typeof window.initMateriDetailPage === 'function') {
            window.initMateriDetailPage();
        }
    }

    if (typeof window.initDataPages === 'function') {
        window.initDataPages();
    }

function updateDashboardStats(user) {
    // Fungsi ini dinonaktifkan untuk mencegah overwrite data dari session metadata (yang sering stale/cache).
    // Dashboard sepenuhnya dihandle oleh window.updateUserUI() yang mengambil data fresh dari database.
    return;
}

    // 16. Fungsi Utama Update Data User di UI (Dipanggil saat boot)
window.updateUserUI = async () => {
    try {
        const sb = await getSupabaseClient();
        const { data: { session } } = await sb.auth.getSession();
        
        if (!session || !session.user) return;
        
        const user = session.user;
        
        // Ambil data profil terbaru dari Database (Paksa fetch dengan timestamp anti-cache)
        try {
            // Kita ambil xp, points, badges, dan materials_read_count yang sudah ditambahkan
            // Tambahkan filter dummy agar URL unik dan tidak dicache browser
            const ts = new Date().getTime();
            const { data: profile, error } = await sb
                .from('profiles')
                .select('*')  
                .eq('id', user.id)
                .neq('username', 'dummy_' + ts) // Trik anti-cache
                .single();
            
            console.log('Data Profil Realtime DB:', profile);
                
            if (profile) {
                // Statistik Dashboard (Halaman Index)
                const statValues = document.querySelectorAll('.hero-stats .stat-value');
                if (statValues.length >= 3) {
                    // Paksa update tampilan dari Database (Source of Truth)
                    // GUNAKAN 'points' SAJA (Karena kolom 'xp' sudah dihapus dari DB)
                    // Ambil points, jika null/undefined set ke 0
                    const realXP = (profile.points !== undefined && profile.points !== null) ? Number(profile.points) : 0;
                    
                    const realMateri = profile.materials_read_count || 0;
                    const realBadge = typeof profile.badges === 'number' ? profile.badges : (Array.isArray(profile.badges) ? profile.badges.length : 0);

                    statValues[0].textContent = realMateri; 
                    statValues[1].textContent = realBadge;
                    statValues[2].textContent = realXP; 
                }

                // Update XP di Header (Semua Halaman)
                const headerXp = document.getElementById('headerUserXp');
                if (headerXp) {
                    const realXP = (profile.points !== undefined && profile.points !== null) ? Number(profile.points) : 0;
                    headerXp.textContent = `${realXP} XP`;
                }

                // Update Info Sidebar
                if (profile.full_name) {
                    const sidebarUserName = document.querySelector('.sidebar .user-name');
                    if (sidebarUserName) sidebarUserName.textContent = profile.full_name;
                }
            } else {
                // Jika profil tidak ditemukan atau error, kosongkan dashboard sesuai request
                const statValues = document.querySelectorAll('.hero-stats .stat-value');
                if (statValues.length >= 3) {
                    statValues[0].textContent = '-';
                    statValues[1].textContent = '-';
                    statValues[2].textContent = '-';
                }
            }
        } catch (err) { 
            console.error('Gagal mengambil profil terbaru:', err);
            // Kosongkan dashboard jika error fatal
            const statValues = document.querySelectorAll('.hero-stats .stat-value');
            if (statValues.length >= 3) {
                statValues[0].textContent = '-';
                statValues[1].textContent = '-';
                statValues[2].textContent = '-';
            }
        }
        
        const metadata = user.user_metadata || {};
        const displayName = metadata.full_name || metadata.username || user.email;
            let premiumOk = false;
            try {
                premiumOk = typeof window.isPremiumActive === 'function' ? await window.isPremiumActive(sb, user.id) : false;
            } catch (e) {
                premiumOk = false;
            }

            // Update nama user di sidebar
            const sidebarUserName = document.querySelector('.sidebar .user-name');
            if (sidebarUserName) {
                sidebarUserName.textContent = displayName;
            }

            // Update role user di sidebar
            const sidebarUserRole = document.querySelector('.sidebar .user-role');
            if (sidebarUserRole) {
                let baseRole = 'Pelajar Aktif';
                if (metadata.role) baseRole = metadata.role;
                else if (metadata.username) baseRole = `@${metadata.username}`;
                sidebarUserRole.textContent = premiumOk ? `Premium • ${baseRole}` : baseRole;
            }

            // Update avatar sidebar
            if (metadata.avatar_url) {
                const sidebarAvatars = document.querySelectorAll('.sidebar .user-avatar');
                sidebarAvatars.forEach(img => {
                    img.src = metadata.avatar_url;
                });
            }

            // Update pesan selamat datang jika elemennya ada
            const welcomeHeader = document.getElementById('welcomeUserHeader');
            if (welcomeHeader) {
                const firstName = displayName.split(' ')[0];
                welcomeHeader.textContent = `Selamat Datang, ${firstName}! 👋`;
            } else {
                // Fallback untuk halaman tanpa ID spesifik
                const h1s = document.querySelectorAll('.hero-content h1');
                h1s.forEach(h1 => {
                    if (h1.textContent.includes('Selamat Datang')) {
                        const firstName = displayName.split(' ')[0];
                        h1.textContent = `Selamat Datang, ${firstName}! 👋`;
                    }
                });
            }
            
            // Update info profil di dashboard jika ada
            const dashboardWelcome = document.querySelector('#dashboardPage .hero-content h1');
            if (dashboardWelcome && dashboardWelcome.textContent.includes('Selamat Datang')) {
                 const firstName = displayName.split(' ')[0];
                 dashboardWelcome.textContent = `Selamat Datang, ${firstName}! 👋`;
            }

            // Update status menu Premium di navigasi
            document.querySelectorAll('a.nav-item[href="premium.html"] span, a.mobile-nav-item[href="premium.html"] span').forEach((el) => {
                el.textContent = premiumOk ? 'Premium (Aktif)' : 'Premium';
            });

            // Logika khusus halaman Premium
            if (String(window.location.pathname || '').toLowerCase().endsWith('premium.html')) {
                const hero = document.querySelector('.hero-section');
                if (hero && premiumOk && !document.getElementById('ttPremiumActiveBanner')) {
                    const banner = document.createElement('div');
                    banner.id = 'ttPremiumActiveBanner';
                    banner.className = 'card';
                    banner.style.cssText = 'padding: 18px; margin-bottom: 18px; border: 2px solid rgba(212,165,116,0.5);';
                    banner.innerHTML = `<div class="card-meta">Premium</div><h3 class="card-title" style="margin-top: 6px;">Kamu sudah berlangganan</h3><p class="card-text">Akun kamu aktif Premium. Kamu bisa akses video materi, komunitas, tugas, dan timeline.</p>`;
                    const wrapper = document.querySelector('.content-wrapper');
                    if (wrapper) {
                        const first = wrapper.firstElementChild;
                        if (first) wrapper.insertBefore(banner, first);
                        else wrapper.appendChild(banner);
                    }

                    const heroTitle = hero.querySelector('h1');
                    const heroDesc = hero.querySelector('p');
                    if (heroTitle) heroTitle.textContent = 'Premium kamu aktif';
                    if (heroDesc) heroDesc.textContent = 'Terima kasih sudah berlangganan. Nikmati semua fitur premium tanpa batas.';
                }
            }

            // Cek Masa Berlaku Premium (Auto-Downgrade)
            if (metadata.plan === 'premium' && metadata.premium_until) {
                const today = new Date();
                const expiryDate = new Date(metadata.premium_until);
                
                if (today > expiryDate) {
                    // Sudah kedaluwarsa! Downgrade sekarang
                    console.log('Premium berakhir. Menurunkan paket ke gratis...');
                    
                    const { error } = await sb.auth.updateUser({
                        data: { plan: 'free', premium_until: null }
                    });

                    if (!error) {
                        alert('Masa berlaku Premium Anda telah berakhir. Akun kembali ke paket Gratis.');
                        window.location.reload();
                    }
                }
            }

        } catch (e) {
            console.error('Error saat update UI user:', e);
        }
    };

    updateUserUI();
    requireAuthIfNeeded();
    initPremiumGuard();
    // Init Premium Realtime (Purchases)
    initPremiumRealtime();

    showActivatedToastIfNeeded();
}

// Global Auth Guard (Cek Login)
async function requireAuthIfNeeded() {
    const path = window.location.pathname.toLowerCase();
    
    // Halaman yang boleh diakses tanpa login (Publik)
    const publicPages = [
        'login.html', 
        'register.html', 
        'landing.html', 
        'forgot-password.html', 
        'reset-password.html'
    ];

    // Cek apakah halaman saat ini adalah halaman publik
    const isPublicPage = publicPages.some(page => path.endsWith(page));

    // Jika di root ('/') atau halaman publik, tidak perlu cek auth ketat
    if (isPublicPage || path === '/' || path.endsWith('/')) {
        // Khusus root/landing: kalau sudah login, redirect ke dashboard
        if (path.endsWith('landing.html') || path === '/' || path.endsWith('/')) {
            const sb = await getSupabaseClient();
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                window.location.href = 'index.html';
            }
        }
        return;
    }

    // Untuk halaman internal (index.html, timeline.html, dll) -> WAJIB LOGIN
    const sb = await getSupabaseClient();
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
        // Jika tidak ada sesi, lempar ke landing page
        window.location.href = 'landing.html'; 
    } else {
        // Jika ada sesi, tampilkan konten
        document.body.style.display = 'block';
        if (typeof window.updateUserUI === 'function') {
            window.updateUserUI(); // Panggil aman
        }
    }
}

// Fungsi global untuk menu profil (Dipindahkan keluar initApp agar bisa diakses global)
window.toggleProfileMenu = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.user-profile');
    
    if (dropdown) {
        const isShown = dropdown.classList.contains('show');
        
        // Logika Toggle
        if (isShown) {
            dropdown.classList.remove('show');
            if (profile) profile.classList.remove('active');
        } else {
            dropdown.classList.add('show');
            if (profile) profile.classList.add('active');
        }
    }
};

// Tutup dropdown saat klik di luar
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.user-profile');
    
    // Cek jika dropdown sedang terbuka
    if (dropdown && dropdown.classList.contains('show')) {
        // Jika klik BUKAN di dalam dropdown DAN BUKAN di trigger profil
        if (!dropdown.contains(e.target) && (!profile || !profile.contains(e.target))) {
            dropdown.classList.remove('show');
            if (profile) profile.classList.remove('active');
        }
    }
});

// Implementasi Penjaga Halaman Premium
async function initPremiumGuard() {
    const path = window.location.pathname.toLowerCase();
    
    // Halaman yang eksklusif untuk Premium
    const premiumPages = ['timeline.html', 'community.html', 'tasks.html'];
    
    if (premiumPages.some(page => path.endsWith(page))) {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        
        if (user) {
            try {
                const ok = typeof window.isPremiumActive === 'function' ? await window.isPremiumActive(sb, user.id) : false;
                if (ok) return;
            } catch (e) {
                // abaikan
            }

            // Jika user BUKAN premium, tampilkan overlay blokir
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(255, 255, 255, 0.98); z-index: 99999;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                text-align: center;
            `;
            
            overlay.innerHTML = `
                <div style="padding: 40px; max-width: 500px;">
                    <i class="fas fa-lock" style="font-size: 64px; color: var(--tt-brown); margin-bottom: 24px; opacity: 0.8;"></i>
                    <h2 style="color: var(--tt-brown); margin-bottom: 12px; font-size: 28px;">Fitur Premium</h2>
                    <p style="color: var(--text-light); margin-bottom: 32px; font-size: 16px; line-height: 1.6;">
                        Maaf, fitur ini khusus untuk pengguna Premium.<br>
                        Upgrade sekarang untuk membuka akses ke Timeline Sejarah, Komunitas, dan Tugas Eksklusif.
                    </p>
                    <div style="display: flex; gap: 16px; justify-content: center;">
                        <a href="index.html" class="btn-secondary" style="padding: 12px 24px;">Kembali</a>
                        <a href="premium.html" class="btn-primary" style="padding: 12px 30px; box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);">
                            <i class="fas fa-crown"></i> Upgrade Premium
                        </a>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        }
    }
}

window.handleLogout = async function(e) {
    if (e) e.preventDefault();
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    
    try {
        const sb = await getSupabaseClient();
        await sb.auth.signOut();
        localStorage.clear(); // Bersihkan semua data lokal
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout error:', err);
        window.location.href = 'login.html';
    }
};

// Tutup dropdown saat klik di luar (Duplikat untuk keamanan)
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.user-profile');
    
    if (dropdown && dropdown.classList.contains('show')) {
        if (!dropdown.contains(e.target) && (!profile || !profile.contains(e.target))) {
            dropdown.classList.remove('show');
            if (profile) profile.classList.remove('active');
        }
    }
});

async function initPremiumRealtime() {
    try {
        const sb = await getSupabaseClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session || !session.user) return;
        const userId = session.user.id;

        const ch = sb
            .channel('premium_' + userId)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'premium_purchases', filter: `user_id=eq.${userId}` }, async (payload) => {
                const newRow = payload.new || {};
                const status = String(newRow.status || '').toLowerCase();
                if (['paid', 'confirmed', 'active'].includes(status)) {
                    const ok = await isPremiumActive(sb, userId);
                    if (!ok) return;
                    showPremiumActivatedModal();
                    const params = new URLSearchParams(window.location.search || '');
                    const ret = params.get('return');
                    setTimeout(() => {
                        if (ret) {
                            const url = new URL(ret, window.location.origin);
                            url.searchParams.set('activated', '1');
                            window.location.href = url.toString();
                        } else {
                            const u = new URL(window.location.href);
                            u.searchParams.set('activated', '1');
                            window.location.href = u.toString();
                        }
                    }, 1200);
                }
            })
            .subscribe();
    } catch (e) {
        // abaikan
    }
}

function showPremiumActivatedModal() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:100000;';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px 24px;max-width:420px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,.25)"><div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#B8860B);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;"><i class="fas fa-crown" style="color:#2c1a15;font-size:28px;"></i></div><h3 style="margin:0 0 6px 0;">Selamat, Kamu Premium!</h3><p style="margin:0 0 12px 0;color:#666">Akses fitur premium telah aktif.</p><button id="premOkBtn" class="btn-primary" style="padding:10px 20px;">Oke</button></div>';
    document.body.appendChild(ov);
    const btn = ov.querySelector('#premOkBtn');
    if (btn) btn.addEventListener('click', () => ov.remove());
}

function showActivatedToastIfNeeded() {
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('activated') === '1') {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;right:24px;top:24px;z-index:100001;background:#2c1a15;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 10px 20px rgba(0,0,0,.2);display:flex;align-items:center;gap:10px;';
            toast.innerHTML = '<i class="fas fa-crown" style="color:#FFD700"></i><span>Kamu sekarang Premium</span>';
            document.body.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 2500);
            url.searchParams.delete('activated');
            history.replaceState(null, '', url.toString());
        }
    } catch (e) {
        // abaikan
    }
}

function updateNotificationBadge() {
    // Simulasi atau fetch real count
    const count = 0; // Default 0
    document.querySelectorAll('.badge').forEach(el => {
        if (count > 0) {
            el.textContent = count;
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });
}

// Panggil di akhir boot atau initApp
window.updateNotificationBadge = updateNotificationBadge;
