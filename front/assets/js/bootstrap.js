function initApp() {
    const logoImgSrc = 'assets/img/Frame 1000001789.png';
    document.querySelectorAll('.sidebar-header .logo').forEach((logo) => {
        if (!logo) return;
        logo.innerHTML = `<img src="${logoImgSrc}" alt="Time Track" width="180" height="60" style="object-fit: contain;">`;
    });

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

    const showAuthError = (msg) => {
        const message = String(msg || '').trim();
        if (!message) return;
        const errEl = document.getElementById('loginError') || document.getElementById('registerError');
        if (!errEl) return;
        errEl.textContent = message;
        errEl.classList.add('form-error');
        errEl.style.display = 'block';
    };

    const clearAuthError = () => {
        const errEl = document.getElementById('loginError') || document.getElementById('registerError');
        if (!errEl) return;
        errEl.style.display = 'none';
        errEl.classList.remove('form-error');
        errEl.textContent = '';
    };

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        try {
            const remembered = localStorage.getItem('tt_remember_identifier');
            const identifierInput = document.getElementById('loginIdentifier');
            const rememberMe = document.getElementById('rememberMe');

            if (remembered && identifierInput) {
                identifierInput.value = remembered;
                if (rememberMe) rememberMe.checked = true;
            }
        } catch (e) {
            // ignore
        }

        const loginPasswordInput = document.getElementById('loginPassword');
        const toggleLoginPasswordBtn = document.getElementById('toggleLoginPasswordBtn');
        if (loginPasswordInput && toggleLoginPasswordBtn) {
            toggleLoginPasswordBtn.addEventListener('click', () => togglePassword(loginPasswordInput, toggleLoginPasswordBtn));
        }

        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const errEl = document.getElementById('loginError');
            if (errEl) {
                errEl.style.display = 'none';
                errEl.classList.remove('form-error');
                errEl.textContent = '';
            }
            try {
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
                    // ignore
                }
                const res = await handleLoginSubmit(loginForm);
                if (res && res.ok) {
                    window.location.href = 'index.html';
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

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const regPass = document.getElementById('registerPassword');
        const regPassBtn = document.getElementById('toggleRegisterPasswordBtn');
        if (regPass && regPassBtn) {
            regPassBtn.addEventListener('click', () => togglePassword(regPass, regPassBtn));
        }

        const regPass2 = document.getElementById('registerPasswordConfirm');
        const regPass2Btn = document.getElementById('toggleRegisterPasswordConfirmBtn');
        if (regPass2 && regPass2Btn) {
            regPass2Btn.addEventListener('click', () => togglePassword(regPass2, regPass2Btn));
        }

        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                await handleRegisterSubmit(registerForm);
            } catch (err) {
                alert('Register gagal. Coba lagi.');
            }
        });
    }

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

    document.querySelectorAll('.category-pills .pill').forEach(pill => {
        pill.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });

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

    initMateriPage();
    initTimelinePage();

    if (typeof window.initDataPages === 'function') {
        window.initDataPages();
    }

    const updateUserUI = async () => {
        try {
            const sb = await getSupabaseClient();
            const { data: { session } } = await sb.auth.getSession();
            if (!session || !session.user) return;

            const user = session.user;
            const metadata = user.user_metadata || {};
            const displayName = metadata.full_name || metadata.username || user.email;

            // Update sidebar profile
            const sidebarUserName = document.querySelector('.sidebar .user-name');
            if (sidebarUserName) {
                sidebarUserName.textContent = displayName;
            }

            const sidebarUserRole = document.querySelector('.sidebar .user-role');
            if (sidebarUserRole && metadata.role) {
                sidebarUserRole.textContent = metadata.role;
            } else if (sidebarUserRole && metadata.username) {
                sidebarUserRole.textContent = `@${metadata.username}`;
            }

            // Update sidebar avatar
            if (metadata.avatar_url) {
                const sidebarAvatars = document.querySelectorAll('.sidebar .user-avatar');
                sidebarAvatars.forEach(img => {
                    img.src = metadata.avatar_url;
                });
            }

            // Update welcome message if exists
            const welcomeHeader = document.getElementById('welcomeUserHeader');
            if (welcomeHeader) {
                const firstName = displayName.split(' ')[0];
                welcomeHeader.textContent = `Selamat Datang, ${firstName}! 👋`;
            } else {
                // Fallback for pages without the specific ID
                const h1s = document.querySelectorAll('.hero-content h1');
                h1s.forEach(h1 => {
                    if (h1.textContent.includes('Selamat Datang')) {
                        const firstName = displayName.split(' ')[0];
                        h1.textContent = `Selamat Datang, ${firstName}! 👋`;
                    }
                });
            }
            
            // Update profile info in dashboard if exists
            const dashboardWelcome = document.querySelector('#dashboardPage .hero-content h1');
            if (dashboardWelcome && dashboardWelcome.textContent.includes('Selamat Datang')) {
                 const firstName = displayName.split(' ')[0];
                 dashboardWelcome.textContent = `Selamat Datang, ${firstName}! 👋`;
            }

            // Check Premium Expiry (Auto-Downgrade)
            if (metadata.plan === 'premium' && metadata.premium_until) {
                const today = new Date();
                const expiryDate = new Date(metadata.premium_until);
                
                if (today > expiryDate) {
                    // Expired! Downgrade now
                    console.log('Premium expired. Downgrading to free...');
                    
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
            console.error('Error updating user UI:', e);
        }
    };

    updateUserUI();
    requireAuthIfNeeded();
    initPremiumGuard();
}

// Global Auth Guard
async function requireAuthIfNeeded() {
    const path = window.location.pathname.toLowerCase();
    
    // Halaman yang boleh diakses tanpa login
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
        // Gunakan relative path agar aman di semua environment (localhost/hosting)
        window.location.href = '/landing.html'; 
    } else {
        // Jika ada sesi, tampilkan konten
        document.body.style.display = 'block';
    }
}

// Global functions for profile menu
window.toggleProfileMenu = function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.user-profile');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (profile) profile.classList.toggle('active');
    }
};

// Premium Guard Implementation
async function initPremiumGuard() {
    const path = window.location.pathname.toLowerCase();
    
    // Halaman yang eksklusif untuk Premium
    const premiumPages = ['timeline.html', 'community.html', 'tasks.html'];
    
    if (premiumPages.some(page => path.endsWith(page))) {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        
        if (user) {
            // Ambil data terbaru dari tabel profiles untuk memastikan status premium akurat
            let isPremium = false;
            
            // Cek metadata dulu (cepat)
            if (user.user_metadata && user.user_metadata.plan === 'premium') {
                isPremium = true;
                
                // Cek tanggal expired di metadata
                if (user.user_metadata.premium_until) {
                    const expiry = new Date(user.user_metadata.premium_until);
                    if (new Date() > expiry) {
                        isPremium = false; // Expired
                        // Trigger downgrade di background
                        sb.auth.updateUser({ data: { plan: 'free' } });
                        sb.from('profiles').update({ is_premium: false, plan: 'free' }).eq('id', user.id);
                    }
                }
            }
            
            // Double check ke tabel profiles (sumber kebenaran)
            try {
                const { data: profile } = await sb.from('profiles').select('is_premium, plan').eq('id', user.id).single();
                if (profile) {
                    // Jika di tabel profile bilang premium, maka premium
                    if (profile.is_premium === true || profile.plan === 'premium') {
                        isPremium = true;
                    } else {
                        isPremium = false;
                    }
                }
            } catch (e) {
                // Ignore error, rely on metadata
            }

            // Jika user BUKAN premium
            if (!isPremium) {
                // Tampilkan overlay lock (blokir akses)
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
                document.body.style.overflow = 'hidden'; // Disable scroll
            }
        }
    }
}

window.handleLogout = async function(e) {
    if (e) e.preventDefault();
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    
    try {
        const sb = await getSupabaseClient();
        await sb.auth.signOut();
        localStorage.clear(); // Clear all local data
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout error:', err);
        window.location.href = 'login.html';
    }
};

// Close dropdown when clicking outside
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
