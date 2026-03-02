async function handleLoginSubmit(loginForm) {
    const identifierInput = loginForm ? loginForm.querySelector('#loginIdentifier') : null;
    const passwordInput = loginForm ? loginForm.querySelector('#loginPassword') : null;

    const identifierRaw = identifierInput ? String(identifierInput.value || '').trim() : '';
    const identifier = identifierRaw.toLowerCase();
    const password = passwordInput ? String(passwordInput.value || '').trim() : '';

    if (!identifier || !password) {
        return { ok: false, message: 'Email/username dan sandi wajib diisi.' };
    }

    const sb = await getSupabaseClient();

    const isEmail = identifier.includes('@');
    let email = identifier;

    if (!isEmail) {
        let resolvedEmail = '';

        try {
            const { data: prof, error: profErr } = await sb
                .from('profiles')
                .select('email, username')
                .eq('username', identifier)
                .maybeSingle();

            if (!profErr && prof && prof.email) {
                resolvedEmail = String(prof.email || '').trim().toLowerCase();
            }
        } catch (e) {
            // ignore and fallback to backend
        }

        if (!resolvedEmail) {
            try {
                const res = await fetch(`/api/resolve-username?username=${encodeURIComponent(identifier)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.email) {
                        resolvedEmail = String(data.email || '').trim().toLowerCase();
                    }
                } else if (res.status === 404) {
                    return { ok: false, message: 'Akun belum terdaftar.' };
                }
            } catch (e) {
                // ignore
            }
        }

        if (!resolvedEmail) {
            return { ok: false, message: 'Login dengan username belum tersedia. Gunakan email.' };
        }

        email = resolvedEmail;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        const msg = String(error.message || '').toLowerCase();

        if (msg.includes('invalid login credentials')) {
            if (isEmail) {
                try {
                    const { data: exists } = await sb.from('profiles').select('id').eq('email', email).limit(1);
                    if (!exists || !Array.isArray(exists) || exists.length === 0) {
                        return { ok: false, message: 'Akun belum terdaftar.' };
                    }
                } catch (e) {
                    // ignore
                }
            }

            return { ok: false, message: 'Email/username dan sandi salah, coba lagi.' };
        }

        if (msg.includes('email not confirmed')) {
            return { ok: false, message: 'Email belum dikonfirmasi. Silakan cek email kamu.' };
        }

        return { ok: false, message: 'Gagal login. Coba lagi.' };
    }

    return { ok: true };
}

async function handleForgotPasswordSubmit(forgotForm) {
    const emailInput = forgotForm ? forgotForm.querySelector('input[type="email"]') : null;
    const email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
    if (!email) {
        alert('Email wajib diisi.');
        return;
    }

    const sb = await getSupabaseClient();
    // Gunakan relative path agar dinamis, tidak hardcoded ke domain tertentu
    const redirectTo = `${window.location.origin}/reset-password.html`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
        alert(error.message);
        return;
    }
    alert('Link reset password sudah dikirim. Silakan cek email kamu.');
}

async function handleResetPasswordSubmit(resetForm) {
    const passInput = resetForm ? resetForm.querySelector('#resetPasswordInput') : null;
    const confirmInput = resetForm ? resetForm.querySelector('#resetPasswordConfirmInput') : null;
    const password = passInput ? String(passInput.value || '').trim() : '';
    const confirmPassword = confirmInput ? String(confirmInput.value || '').trim() : '';

    if (!password || password.length < 8) {
        alert('Password minimal 8 karakter.');
        return;
    }
    if (password !== confirmPassword) {
        alert('Konfirmasi password tidak sama.');
        return;
    }

    const sb = await getSupabaseClient();
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
        alert(error.message);
        return;
    }

    alert('Password berhasil diperbarui. Silakan login kembali.');
    try {
        await sb.auth.signOut();
    } catch (e) {
        // ignore
    }
    window.location.href = 'login.html';
}

async function ensureRecoverySessionFromUrl() {
    const sb = await getSupabaseClient();
    const url = new URL(window.location.href);

    const code = url.searchParams.get('code');
    if (code) {
        try {
            await sb.auth.exchangeCodeForSession(code);
        } catch (e) {
            // ignore
        }
        return;
    }

    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');
    if (accessToken && refreshToken) {
        try {
            await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } catch (e) {
            // ignore
        }
    }
}

async function handleRegisterSubmit(registerForm) {
    const fullNameInput = registerForm.querySelector('input[type="text"]:not([name="username"])');
    const usernameInput = registerForm.querySelector('input[name="username"]');
    const emailInput = registerForm.querySelector('input[type="email"]');
    const mobileInput = registerForm.querySelector('input[type="tel"]');
    const genderInput = registerForm.querySelector('input[name="gender"]:checked');
    const passwordInput = registerForm.querySelector('#registerPassword');
    const confirmPasswordInput = registerForm.querySelector('#registerPasswordConfirm');
    
    const email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
    const fullName = fullNameInput ? String(fullNameInput.value || '').trim() : '';
    const username = usernameInput ? String(usernameInput.value || '').trim() : '';
    const mobileNo = mobileInput ? String(mobileInput.value || '').trim() : '';
    const gender = genderInput ? String(genderInput.value || '').trim() : '';
    const password = passwordInput ? String(passwordInput.value || '').trim() : '';
    const confirmPassword = confirmPasswordInput ? String(confirmPasswordInput.value || '').trim() : '';

    if (!password || password.length < 8) {
        alert('Password minimal 8 karakter.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Konfirmasi password tidak sama.');
        return;
    }

    const sb = await getSupabaseClient();
    const { data: { user }, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                username,
                mobile_no: mobileNo,
                gender,
            },
        },
    });

    if (error) {
        alert('Gagal daftar: ' + error.message);
        return;
    }

    if (user && user.identities && user.identities.length === 0) {
        alert('Email ini sudah terdaftar. Silakan gunakan email lain atau login.');
        return;
    }

    alert('Pendaftaran berhasil. Silakan cek email kamu untuk konfirmasi (jika diperlukan) atau langsung login.');
    window.location.href = 'login.html';
}

async function handleOAuthSignIn(provider) {
    const p = String(provider || '').trim().toLowerCase();
    if (!p) return;

    const sb = await getSupabaseClient();
    const redirectTo = `${window.location.origin}/index.html`;
    const { error } = await sb.auth.signInWithOAuth({
        provider: p,
        options: { redirectTo },
    });
    if (error) {
        return { ok: false, message: String(error.message || 'Gagal login. Coba lagi.') };
    }

    return { ok: true };
}

function logout() {
    getSupabaseClient()
        .then(sb => sb.auth.signOut())
        .catch(() => null)
        .finally(() => {
            window.location.href = 'login.html';
        });
}

window.handleOAuthSignIn = handleOAuthSignIn;
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;
window.handleResetPasswordSubmit = handleResetPasswordSubmit;
window.ensureRecoverySessionFromUrl = ensureRecoverySessionFromUrl;
