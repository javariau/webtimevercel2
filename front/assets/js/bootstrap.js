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
                    errEl.textContent = 'Login gagal. Coba lagi.';
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

    if (typeof window.initDataPages === 'function') {
        window.initDataPages();
    }

    requireAuthIfNeeded();
}
