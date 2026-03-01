function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function initShopCheckoutPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('shop-checkout.html')) return;
        const root = document.getElementById('shopCheckoutRoot');
        if (!root) return;

        const params = new URLSearchParams(window.location.search || '');
        const productIdRaw = params.get('product_id');
        const productId = productIdRaw ? Number(productIdRaw) : NaN;
        if (!Number.isFinite(productId)) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Produk tidak valid</h3><p class="card-text">Kembali ke halaman Toko dan pilih produk.</p>`;
            return;
        }

        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        const { data: prod, error } = await sb
            .from('products')
            .select('id, name, description, price, stock, image_url')
            .eq('id', productId)
            .maybeSingle();

        if (error || !prod) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Produk tidak ditemukan</h3><p class="card-text">Periksa data tabel products.</p>`;
            return;
        }

        const price = typeof prod.price === 'number' ? prod.price : Number(prod.price || 0);
        const shipping = 15000;
        const fee = 2000;
        const calcTotal = (qty) => {
            const q = Number(qty);
            const safeQty = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
            const subtotal = price * safeQty;
            const total = subtotal + shipping + fee;
            return { safeQty, subtotal, total };
        };

        const meta = user && user.user_metadata ? user.user_metadata : {};
        const defaultName =
            (profile && (profile.full_name || profile.username) ? profile.full_name || profile.username : '') ||
            (meta.full_name || meta.username || '') ||
            '';

        const img = String(prod.image_url || '').trim();
        const imgHtml = img
            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(prod.name || 'Produk')}" style="width: 100%; max-width: 360px; height: auto; border-radius: 14px; border: 1px solid var(--border);">`
            : `<div style="width: 100%; max-width: 360px; height: 220px; border-radius: 14px; border: 1px solid var(--border); display:flex; align-items:center; justify-content:center; background: linear-gradient(180deg, rgba(43,92,165,0.08), rgba(43,92,165,0.02));"><i class="fas fa-book" style="font-size: 36px; color: rgba(31,60,115,0.6);"></i></div>`;

        root.innerHTML = `
            <div class="card-meta">Checkout</div>
            <div style="margin-top: 10px;">${imgHtml}</div>
            <h3 class="card-title" style="margin-top: 10px;">${escapeHtml(prod.name || 'Produk')}</h3>
            <p class="card-text">${escapeHtml((prod.description || '').slice(0, 180))}</p>

            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border);">
                <div class="card-meta">Data penerima</div>
                <form id="shopCheckoutForm" style="margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <input id="buyerName" type="text" placeholder="Nama lengkap" value="${escapeHtml(defaultName)}" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                        <input id="buyerPhone" type="text" placeholder="Nomor HP" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                        <textarea id="buyerAddress" placeholder="Alamat lengkap (jalan, kecamatan, kota, provinsi)" rows="3" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);"></textarea>
                        <textarea id="buyerNote" placeholder="Catatan (opsional)" rows="2" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);"></textarea>
                    </div>

                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                        <div class="card-meta">Rincian biaya</div>
                        <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 8px;">
                            <input id="buyQty" type="number" min="1" step="1" value="1" placeholder="Kuantitas / jumlah buku" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border);">
                            <div class="card-text" style="font-size: 12px; color: var(--text-light);">Kuantitas adalah jumlah buku yang ingin kamu beli.</div>
                        </div>
                        <div style="margin-top: 10px; font-size: 14px;">
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Harga buku</span><b id="bookUnitPrice">Rp ${escapeHtml(formatRupiah(price))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Subtotal</span><b id="bookSubtotal">Rp ${escapeHtml(formatRupiah(price))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Ongkir</span><b>Rp ${escapeHtml(formatRupiah(shipping))}</b></div>
                            <div style="display:flex; justify-content:space-between; gap:10px;"><span>Biaya layanan</span><b>Rp ${escapeHtml(formatRupiah(fee))}</b></div>
                            <div style="margin-top: 10px; display:flex; justify-content:space-between; gap:10px; font-size:15px;"><span>Total</span><b id="bookTotal">Rp ${escapeHtml(formatRupiah(price + shipping + fee))}</b></div>
                        </div>
                    </div>

                    <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-comments"></i> Konfirmasi Pembelian (WhatsApp)
                        </button>
                        <a href="shop.html" class="btn-secondary" style="display:inline-block; text-decoration:none;">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </a>
                    </div>
                </form>
                <div id="shopCheckoutResult" style="margin-top: 12px;"></div>
            </div>
        `;

        const form = document.getElementById('shopCheckoutForm');
        const result = document.getElementById('shopCheckoutResult');
        if (!form || !result) return;

        const qtyInput = document.getElementById('buyQty');
        const subtotalEl = document.getElementById('bookSubtotal');
        const totalEl = document.getElementById('bookTotal');

        const renderTotals = () => {
            const qtyRaw = qtyInput ? qtyInput.value : '1';
            const { safeQty, subtotal, total } = calcTotal(qtyRaw);
            if (qtyInput) qtyInput.value = String(safeQty);
            if (subtotalEl) subtotalEl.textContent = `Rp ${formatRupiah(subtotal)}`;
            if (totalEl) totalEl.textContent = `Rp ${formatRupiah(total)}`;
        };

        if (qtyInput) {
            qtyInput.addEventListener('change', renderTotals);
            qtyInput.addEventListener('input', renderTotals);
        }
        renderTotals();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qtyRaw = String((document.getElementById('buyQty') || {}).value || '1');
            const { safeQty, subtotal, total } = calcTotal(qtyRaw);
            const name = String((document.getElementById('buyerName') || {}).value || '').trim();
            const phone = String((document.getElementById('buyerPhone') || {}).value || '').trim();
            const address = String((document.getElementById('buyerAddress') || {}).value || '').trim();
            const note = String((document.getElementById('buyerNote') || {}).value || '').trim();

            if (!name || !phone || !address) {
                result.innerHTML = `<div class="card" style="padding: 14px;">Lengkapi nama, nomor HP, dan alamat dulu.</div>`;
                return;
            }

            const msg = `Halo Admin, saya ingin membeli buku di Toko.\n\nProduk: ${prod.name || 'Produk'}\nJumlah: ${safeQty}\nHarga satuan: Rp ${formatRupiah(price)}\nSubtotal: Rp ${formatRupiah(subtotal)}\nOngkir: Rp ${formatRupiah(shipping)}\nBiaya layanan: Rp ${formatRupiah(fee)}\nTotal: Rp ${formatRupiah(total)}\n\nNama: ${name}\nNo HP: ${phone}\nAlamat: ${address}${note ? `\nCatatan: ${note}` : ''}`;
            const waLink = buildWhatsAppLink(ADMIN_WA_NUMBER, msg);

            try {
                if (user) {
                    await sb.from('shop_orders').insert({
                        user_id: user.id,
                        product_id: prod.id,
                        quantity: safeQty,
                        buyer_name: name,
                        buyer_phone: phone,
                        buyer_address: address,
                        note,
                        item_price: price,
                        subtotal_amount: subtotal,
                        shipping_cost: shipping,
                        service_fee: fee,
                        total_amount: total,
                        status: 'pending',
                    });
                }
            } catch (e2) {
                // ignore
            }

            window.open(waLink, '_blank', 'noopener');
        });
    } catch (e) {
        // ignore
    }
}

async function isPremiumActive(sb, userId) {
    try {
        if (!sb || !userId) return false;

        const { data: purchases, error } = await sb
            .from('premium_purchases')
            .select('id, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) return false;

        const rows = Array.isArray(purchases) ? purchases : [];
        if (rows.length === 0) return false;

        // Schema provided: status default 'pending_payment'. Trigger handle_premium_paid() is expected
        // to move it into a paid/active state. We consider these statuses as premium-active.
        const activeStatuses = new Set(['paid', 'confirmed', 'active']);
        return rows.some((r) => activeStatuses.has(String(r && r.status ? r.status : '').toLowerCase()));
    } catch (e) {
        return false;
    }
}

const ADMIN_WA_NUMBER = '6289529559852';

function buildWhatsAppLink(phoneNumber, message) {
    const pn = String(phoneNumber || '').replace(/\D/g, '');
    const text = encodeURIComponent(String(message || '').trim());
    return `https://wa.me/${pn}?text=${text}`;
}

function formatRupiah(value) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return String(value || '0');
    try {
        return n.toLocaleString('id-ID');
    } catch (e) {
        return String(n);
    }
}

function formatRelativeTime(iso) {
    try {
        const d = new Date(iso);
        const diffMs = Date.now() - d.getTime();
        const sec = Math.floor(diffMs / 1000);
        if (sec < 60) return 'Baru saja';
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min} menit yang lalu`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr} jam yang lalu`;
        const day = Math.floor(hr / 24);
        return `${day} hari yang lalu`;
    } catch (e) {
        return '';
    }
}

async function initQuizDetailPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('quiz-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const quizIdRaw = params.get('id');
        const quizId = quizIdRaw ? Number(quizIdRaw) : NaN;
        if (!Number.isFinite(quizId)) return;

        const root = document.getElementById('quizDetailRoot');
        if (!root) return;

        const sb = await getSupabaseClient();

        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;

        if (!premiumOk) {
            const { data: freeQuizzes, error: freeErr } = await sb
                .from('quizzes')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1);

            const freeQuizId = Array.isArray(freeQuizzes) && freeQuizzes[0] ? freeQuizzes[0].id : null;
            if (!freeErr && freeQuizId != null && Number(freeQuizId) !== Number(quizId)) {
                root.innerHTML = `<div class="card-meta">Premium</div><h3 class="card-title" style="margin-top: 6px;">Kuis Terkunci</h3><p class="card-text">Upgrade Premium untuk membuka kuis ini.</p><div style="margin-top: 14px;"><a href="premium.html" class="btn-primary" style="display:inline-block; text-decoration:none;">Buka Premium</a></div>`;
                return;
            }
        }

        const { data: quiz, error: quizErr } = await sb
            .from('quizzes')
            .select('id, title, image_url, question_count, duration, rating, created_at')
            .eq('id', quizId)
            .maybeSingle();

        if (quizErr || !quiz) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Kuis tidak ditemukan</h3><p class="card-text">Pastikan id kuis benar.</p>`;
            return;
        }

        const { data: questions, error: qErr } = await sb
            .from('questions')
            .select('id, quiz_id, question_text, order_index, image_url')
            .eq('quiz_id', quiz.id)
            .order('order_index', { ascending: true })
            .limit(100);

        if (qErr) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Gagal memuat pertanyaan</h3><p class="card-text">Coba lagi beberapa saat.</p>`;
            return;
        }

        const qs = Array.isArray(questions) ? questions : [];
        if (qs.length === 0) {
            root.innerHTML = `<div class="card-meta">${escapeHtml(quiz.question_count || 0)} soal</div><h3 class="card-title" style="margin-top: 6px;">${escapeHtml(quiz.title || 'Kuis')}</h3><p class="card-text">Belum ada pertanyaan untuk kuis ini.</p>`;
            return;
        }

        const questionIds = qs.map((x) => x.id);
        const { data: options, error: optErr } = await sb
            .from('options')
            .select('id, question_id, option_text, is_correct')
            .in('question_id', questionIds)
            .limit(1000);

        if (optErr) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Gagal memuat opsi</h3><p class="card-text">Coba lagi beberapa saat.</p>`;
            return;
        }

        const opts = Array.isArray(options) ? options : [];
        const optionsByQuestion = new Map();
        opts.forEach((o) => {
            if (!o || o.question_id == null) return;
            const key = o.question_id;
            const arr = optionsByQuestion.get(key) || [];
            arr.push(o);
            optionsByQuestion.set(key, arr);
        });

        const safeQuizTitle = escapeHtml(quiz.title || 'Kuis');
        const totalQuestions = qs.length;

        const renderQuestion = (q, idx) => {
            const qText = escapeHtml(q.question_text || `Pertanyaan ${idx + 1}`);
            const qOpts = optionsByQuestion.get(q.id) || [];
            const renderedOptions = qOpts
                .map((o) => {
                    const optText = escapeHtml(o.option_text || 'Opsi');
                    return `
                    <label style="display: block; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; margin-top: 10px; cursor: pointer;">
                        <input type="radio" name="q_${q.id}" value="${escapeHtml(String(o.id))}" style="margin-right: 10px;">
                        ${optText}
                    </label>`;
                })
                .join('');

            return `
            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Pertanyaan ${escapeHtml(String(idx + 1))} dari ${escapeHtml(String(totalQuestions))}</div>
                <h3 class="card-title" style="margin-top: 6px; font-size: 18px;">${qText}</h3>
                ${renderedOptions || `<p class="card-text">Opsi belum tersedia.</p>`}
            </div>`;
        };

        root.innerHTML = `
            <div class="card-meta">${escapeHtml(String(totalQuestions))} soal</div>
            <h3 class="card-title" style="margin-top: 6px;">${safeQuizTitle}</h3>
            <p class="card-text">Pilih jawaban yang paling tepat, lalu submit untuk melihat skor.</p>
            <form id="quizForm">
                ${qs.map(renderQuestion).join('')}
                <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Jawaban
                    </button>
                    <a href="quizzes.html" class="btn-secondary" style="display: inline-block; text-align: center; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </a>
                </div>
            </form>
            <div id="quizResult" style="margin-top: 16px;"></div>
        `;

        const form = document.getElementById('quizForm');
        const result = document.getElementById('quizResult');
        if (!form || !result) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const { data: sessionData } = await sb.auth.getSession();
            const user = sessionData && sessionData.session ? sessionData.session.user : null;
            if (!user) {
                result.innerHTML = `<div class="card" style="padding: 16px;">Silakan login dulu untuk submit kuis.</div>`;
                return;
            }

            const answers = new Map();
            qs.forEach((q) => {
                const selected = form.querySelector(`input[name="q_${q.id}"]:checked`);
                if (selected) answers.set(q.id, String(selected.value));
            });

            if (answers.size === 0) {
                result.innerHTML = `<div class="card" style="padding: 16px;">Pilih minimal 1 jawaban.</div>`;
                return;
            }

            let score = 0;
            qs.forEach((q) => {
                const selectedOptId = answers.get(q.id);
                if (!selectedOptId) return;
                const qOpts = optionsByQuestion.get(q.id) || [];
                const chosen = qOpts.find((o) => String(o.id) === selectedOptId);
                if (chosen && chosen.is_correct === true) score += 1;
            });

            const total = qs.length;

            let isRetake = false;
            try {
                const { data: existingAttempt } = await sb
                    .from('quiz_attempts')
                    .select('user_id, quiz_id')
                    .eq('user_id', user.id)
                    .eq('quiz_id', quiz.id)
                    .maybeSingle();
                isRetake = Boolean(existingAttempt);
            } catch (e) {
                // ignore
            }

            const pointsEarned = isRetake ? 0 : score * 10;
            const badgesEarned = isRetake ? 0 : score / 2;

            const { error: attemptErr } = await sb
                .from('quiz_attempts')
                .upsert(
                    {
                        user_id: user.id,
                        quiz_id: quiz.id,
                        score,
                        total_questions: total,
                        points_earned: pointsEarned,
                    },
                    { onConflict: 'user_id,quiz_id' }
                );

            if (attemptErr) {
                const rawMsg = String(attemptErr.message || '').toLowerCase();
                const permissionHint = rawMsg.includes('row-level security') || rawMsg.includes('permission denied') || rawMsg.includes('rls');
                const suffix = permissionHint
                    ? 'Izin menyimpan hasil belum aktif. (Perlu RLS policy untuk quiz attempts)'
                    : 'Gagal menyimpan hasil. Coba lagi.';
                result.innerHTML = `<div class="card" style="padding: 16px;">Skor kamu: <b>${escapeHtml(String(score))}/${escapeHtml(String(total))}</b>. ${escapeHtml(suffix)}</div>`;
                return;
            }

            const rewardText = isRetake
                ? 'Kuis sudah selesai. Kamu boleh ulang untuk latihan, tapi reward tidak bertambah.'
                : `Badge +${escapeHtml(String(badgesEarned))} • Poin +${escapeHtml(String(pointsEarned))}`;
            result.innerHTML = `<div class="card" style="padding: 16px;">Skor kamu: <b>${escapeHtml(String(score))}/${escapeHtml(String(total))}</b>. ${rewardText}.</div>`;
        });
    } catch (e) {
        // ignore
    }
}

async function initContentDetailPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('content-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const materiIdRaw = params.get('id');
        const materiId = materiIdRaw ? Number(materiIdRaw) : NaN;
        if (!Number.isFinite(materiId)) return;

        const headerImage = document.querySelector('img.content-header-image');
        const titleEl = document.querySelector('h1.content-title');
        const textContainer = document.querySelector('.content-text');
        if (!headerImage && !titleEl && !textContainer) return;

        const sb = await getSupabaseClient();
        const { data: materi, error } = await sb
            .from('materi')
            .select('id, category_id, title, subtitle, image_url, summary, video_url, audio_url, created_at')
            .eq('id', materiId)
            .maybeSingle();

        if (error || !materi) return;

        if (titleEl) titleEl.textContent = String(materi.title || 'Materi');

        if (headerImage) {
            const img = String(materi.image_url || '').trim();
            if (img) headerImage.src = img;
            headerImage.alt = String(materi.title || 'Materi');
        }

        const metaSpans = document.querySelectorAll('.content-meta .content-meta-item span');
        if (metaSpans && metaSpans.length >= 3) {
            const created = materi.created_at ? new Date(materi.created_at) : null;
            if (created && !Number.isNaN(created.getTime())) {
                metaSpans[0].textContent = created.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            }
            metaSpans[1].textContent = '10 menit baca';
            metaSpans[2].textContent = `Kategori: ${String(materi.subtitle || 'Materi')}`;
        }

        if (textContainer) {
            const summary = String(materi.summary || '').trim();
            if (summary) {
                const parts = summary.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);
                textContainer.innerHTML = parts.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
            } else {
                textContainer.innerHTML = `<p>${escapeHtml('Konten materi belum tersedia.')}</p>`;
            }
        }

        const relatedItems = document.querySelectorAll('.content-sidebar .related-item');
        if (relatedItems && relatedItems.length > 0 && materi.category_id != null) {
            const { data: related, error: relErr } = await sb
                .from('materi')
                .select('id, title, image_url, created_at')
                .eq('category_id', materi.category_id)
                .neq('id', materi.id)
                .order('created_at', { ascending: false })
                .limit(2);

            if (!relErr && Array.isArray(related) && related.length > 0) {
                relatedItems.forEach((el, idx) => {
                    const r = related[idx];
                    if (!r) return;
                    const imgEl = el.querySelector('img');
                    const titleEl = el.querySelector('h4');
                    const timeEl = el.querySelector('span');

                    if (imgEl) {
                        const img = String(r.image_url || '').trim();
                        if (img) imgEl.src = img;
                        imgEl.alt = String(r.title || 'Related');
                    }
                    if (titleEl) titleEl.textContent = String(r.title || 'Materi');
                    if (timeEl) timeEl.textContent = '10 menit baca';
                    el.onclick = () => {
                        window.location.href = `content-detail.html?id=${encodeURIComponent(r.id)}`;
                    };
                });
            }
        }
    } catch (e) {
        // ignore
    }
}

async function initContentDetailTracking() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('content-detail.html')) return;
        const params = new URLSearchParams(window.location.search || '');
        const materiIdRaw = params.get('id');
        const materiId = materiIdRaw ? Number(materiIdRaw) : NaN;
        if (!Number.isFinite(materiId)) return;

        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        if (!user) return;

        await sb.from('daily_materi_reads').insert({
            user_id: user.id,
            materi_id: materiId,
        });
    } catch (e) {
        // ignore
    }
}

function pageTitleIncludes(text) {
    const title = document.querySelector('.section-title');
    if (!title) return false;
    return String(title.textContent || '').toLowerCase().includes(String(text || '').toLowerCase());
}

function setPlaceholderMessage(container, title, message) {
    if (!container) return;
    container.innerHTML = `<div class="card" style="padding: 18px;"><h3 class="card-title">${escapeHtml(title)}</h3><p class="card-text">${escapeHtml(message)}</p></div>`;
}

async function initQuizzesPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('quiz-detail.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('quizzes.html')) return;
    if (!pageTitleIncludes('kuis')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('quizzes')
            .select('id, title, image_url, question_count, duration, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const quizzes = Array.isArray(data) ? data : [];
        if (quizzes.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada kuis', 'Tambahkan data di tabel quizzes untuk menampilkan daftar kuis.');
            return;
        }

        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;
        const freeCount = 1;
        const visibleQuizzes = premiumOk ? quizzes : quizzes.slice(0, freeCount);

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = visibleQuizzes
            .map((q) => {
                const title = escapeHtml(q.title || 'Kuis');
                const img = (q.image_url || '').trim();
                const qc = typeof q.question_count === 'number' ? q.question_count : 0;
                const duration = escapeHtml(q.duration || '');
                const rating = q.rating != null ? String(q.rating) : '';
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-circle-question\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const meta = qc > 0 ? `${qc} soal` : 'Kuis';
                const footerRight = duration || rating ? `${duration}${duration && rating ? ' • ' : ''}${rating ? `⭐ ${escapeHtml(rating)}` : ''}` : 'Mulai';
                return `
                <div class="card" onclick="window.location.href='quiz-detail.html?id=${encodeURIComponent(q.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(meta)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">Uji pemahamanmu dengan kuis interaktif.</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag"><i class="fas fa-list" style="margin-right: 5px;"></i> ${escapeHtml(meta)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">${footerRight} <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        if (!premiumOk && quizzes.length > freeCount) {
            grid.innerHTML += `
            <div class="card" onclick="window.location.href='premium.html'">
                <div class="card-body">
                    <div class="card-meta">Premium</div>
                    <h3 class="card-title">Kuis Terkunci</h3>
                    <p class="card-text">Upgrade ke Premium untuk membuka semua kuis.</p>
                </div>
                <div class="card-footer">
                    <span class="card-tag">Upgrade</span>
                    <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Buka Premium <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>`;
        }

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Terjadi error di browser.');
    }
}

async function initCommunityPage() {
    if (!pageTitleIncludes('komunitas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;

        if (!premiumOk) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Komunitas Terkunci', 'Fitur komunitas hanya untuk Premium. Silakan upgrade Premium untuk membuka.');
            return;
        }

        const { data, error } = await sb
            .from('chat_rooms')
            .select('id, title, description, avatar_url, last_message, last_message_time, is_premium, created_at')
            .order('last_message_time', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const rooms = Array.isArray(data) ? data : [];
        if (rooms.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada room', 'Tambahkan data di tabel chat_rooms untuk menampilkan komunitas.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rooms
            .map((r) => {
                const title = escapeHtml(r.title || 'Room');
                const desc = escapeHtml((r.description || r.last_message || '').slice(0, 120));
                const img = (r.avatar_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-comments\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const tag = r.is_premium ? 'Premium' : 'Community';
                const time = r.last_message_time ? formatRelativeTime(r.last_message_time) : '';
                return `
                <div class="card" onclick="window.location.href='chat-room.html?id=${encodeURIComponent(r.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(tag)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(time || 'Buka room')}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Masuk <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Terjadi error di browser.');
    }
}

async function initTasksPage() {
    if (!pageTitleIncludes('tugas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;

        if (!user) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Login diperlukan', 'Silakan login untuk melihat progres tugas kamu.');
            return;
        }

        const { data, error } = await sb
            .from('user_tasks')
            .select('id, current_progress, is_completed, last_updated_at, task:tasks(id, title, description, type, target_count, points_reward, is_daily)')
            .eq('user_id', user.id)
            .order('is_completed', { ascending: true })
            .order('last_updated_at', { ascending: false })
            .limit(50);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Periksa RLS policy tabel tasks/user_tasks.');
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            const { data: masterTasks, error: masterErr } = await sb
                .from('tasks')
                .select('id, title, description, type, target_count, points_reward, is_daily, created_at')
                .order('created_at', { ascending: false })
                .limit(20);

            if (masterErr) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks / user_tasks untuk menampilkan tugas.');
                return;
            }

            const tasks = Array.isArray(masterTasks) ? masterTasks : [];
            if (tasks.length === 0) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks untuk menampilkan tugas.');
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'cards-grid';
            grid.innerHTML = tasks
                .map((t) => {
                    const title = escapeHtml(t.title || 'Tugas');
                    const desc = escapeHtml((t.description || '').slice(0, 120));
                    const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                    const target = typeof t.target_count === 'number' ? t.target_count : 1;
                    const tag = t.is_daily ? 'Harian' : 'Sekali';
                    return `
                    <div class="card">
                        <div class="card-body">
                            <div class="card-meta">${escapeHtml(tag)}</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag">Target ${escapeHtml(String(target))}</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                        </div>
                    </div>`;
                })
                .join('');
            placeholderCard.replaceWith(grid);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rows
            .map((row) => {
                const t = row.task || {};
                const title = escapeHtml(t.title || 'Tugas');
                const desc = escapeHtml((t.description || '').slice(0, 120));
                const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                const target = typeof t.target_count === 'number' ? t.target_count : 1;
                const progress = typeof row.current_progress === 'number' ? row.current_progress : 0;
                const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, target)) * 100)));
                const status = row.is_completed ? 'Selesai' : `Progress ${progress}/${target}`;
                return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(status)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                        <div style="margin-top: 10px; height: 8px; background: rgba(31, 60, 115, 0.12); border-radius: 999px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--primary);"></div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(String(pct))}%</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Terjadi error di browser.');
    }
}

async function initPremiumPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('premium-payment.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('premium.html')) return;
    if (!pageTitleIncludes('premium')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('premium_packages')
            .select('id, title, description, price, duration_days, created_at')
            .order('price', { ascending: true })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Periksa RLS policy tabel premium_packages.');
            return;
        }

        const packs = Array.isArray(data) ? data : [];
        if (packs.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada paket', 'Tambahkan data di tabel premium_packages untuk menampilkan paket.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = packs
            .map((p) => {
                const title = escapeHtml(p.title || 'Premium');
                const desc = escapeHtml((p.description || '').slice(0, 120));
                const price = p.price != null ? String(p.price) : '0';
                const days = typeof p.duration_days === 'number' ? p.duration_days : 30;
                const href = `premium-payment.html?package_id=${encodeURIComponent(p.id)}`;
                return `
                <div class="card" onclick="window.location.href='${href}'">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(`${days} hari`)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc || 'Akses fitur premium dan konten eksklusif.'}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Rp ${escapeHtml(price)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Pilih <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Terjadi error di browser.');
    }
}

async function initPremiumPaymentPage() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('premium-payment.html')) return;
        const root = document.getElementById('premiumPaymentRoot');
        if (!root) return;

        const params = new URLSearchParams(window.location.search || '');
        const packageIdRaw = params.get('package_id');
        const packageId = packageIdRaw ? Number(packageIdRaw) : NaN;
        if (!Number.isFinite(packageId)) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Paket tidak valid</h3><p class="card-text">Buka halaman Premium dan pilih paket.</p>`;
            return;
        }

        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        const { data: pack, error } = await sb
            .from('premium_packages')
            .select('id, title, description, price, duration_days')
            .eq('id', packageId)
            .maybeSingle();

        if (error || !pack) {
            root.innerHTML = `<div class="card-meta">Error</div><h3 class="card-title" style="margin-top: 6px;">Paket tidak ditemukan</h3><p class="card-text">Periksa data di tabel premium_packages.</p>`;
            return;
        }

        const price = typeof pack.price === 'number' ? pack.price : Number(pack.price || 0);
        const priceText = `Rp ${escapeHtml(formatRupiah(price))}`;
        const days = typeof pack.duration_days === 'number' ? pack.duration_days : 30;
        const title = escapeHtml(pack.title || 'Premium');
        const desc = escapeHtml(pack.description || 'Akses fitur premium dan konten eksklusif.');

        const methods = [
            { key: 'dana', label: 'DANA' },
            { key: 'bca', label: 'BCA' },
            { key: 'bri', label: 'BRI' },
            { key: 'mandiri', label: 'Mandiri' },
        ];

        const accountByMethod = {
            dana: { name: 'Nanti diisi admin', number: '-' },
            bca: { name: 'Nanti diisi admin', number: '-' },
            bri: { name: 'Nanti diisi admin', number: '-' },
            mandiri: { name: 'Nanti diisi admin', number: '-' },
        };

        const selected = String(params.get('method') || 'dana').toLowerCase();
        const selectedKey = methods.find((m) => m.key === selected) ? selected : 'dana';
        const acct = accountByMethod[selectedKey] || accountByMethod.dana;

        const meta = user && user.user_metadata ? user.user_metadata : {};
        const displayName =
            (profile && (profile.full_name || profile.username) ? profile.full_name || profile.username : '') ||
            (meta.full_name || meta.username || '') ||
            'User';

        const methodButtons = methods
            .map((m) => {
                const active = m.key === selectedKey ? 'active' : '';
                const href = `premium-payment.html?package_id=${encodeURIComponent(pack.id)}&method=${encodeURIComponent(m.key)}`;
                return `<a href="${href}" class="pill ${active}" style="text-decoration:none;">${escapeHtml(m.label)}</a>`;
            })
            .join('');

        root.innerHTML = `
            <div class="card-meta">${escapeHtml(`${days} hari`)}</div>
            <h3 class="card-title" style="margin-top: 6px;">${title}</h3>
            <p class="card-text">${desc}</p>

            <div style="margin-top: 16px;">
                <div class="card-meta">Pilih metode pembayaran</div>
                <div class="category-pills" style="margin-top: 10px;">${methodButtons}</div>
            </div>

            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Detail transfer (${escapeHtml(selectedKey.toUpperCase())})</div>
                <div style="margin-top: 8px; font-size: 14px;">
                    <div><b>Nomor:</b> ${escapeHtml(acct.number)}</div>
                    <div><b>Atas nama:</b> ${escapeHtml(acct.name)}</div>
                    <div><b>Nominal:</b> ${priceText}</div>
                </div>
            </div>

            <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);">
                <div class="card-meta">Petunjuk pembayaran</div>
                <div class="card-text" style="margin-top: 8px; white-space: pre-line;">
1. Transfer sesuai nominal di atas.
2. Simpan bukti transfer (screenshot).
3. Klik tombol konfirmasi WhatsApp untuk mengirim data pembayaran ke admin.
4. Setelah admin konfirmasi, fitur premium akan terbuka.
                </div>
            </div>

            <div style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="waConfirmBtn" class="btn-primary">
                    <i class="fas fa-comments"></i> Konfirmasi ke WhatsApp Admin
                </button>
                <a href="premium.html" class="btn-secondary" style="display:inline-block; text-decoration:none;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </a>
            </div>
        `;

        const btn = document.getElementById('waConfirmBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }

                let purchaseId = '';
                try {
                    const { data: inserted, error: insErr } = await sb
                        .from('premium_purchases')
                        .insert({
                            user_id: user.id,
                            package_id: pack.id,
                            status: 'pending_payment',
                            total_amount: price,
                            payment_method_name: selectedKey.toUpperCase(),
                            payment_account_info: `${selectedKey.toUpperCase()} - ${String(acct.number || '-')} (${String(acct.name || '-')} )`,
                        })
                        .select('id')
                        .maybeSingle();

                    if (!insErr && inserted && inserted.id) {
                        purchaseId = String(inserted.id);
                    }
                } catch (e) {
                    // ignore
                }

                const codeLine = purchaseId ? `\nKode order: ${purchaseId}` : '';
                const msg = `Halo Admin, saya ingin konfirmasi pembayaran Premium.\n\nNama: ${displayName}${codeLine}\nPaket: ${pack.title || 'Premium'} (${days} hari)\nHarga: Rp ${formatRupiah(price)}\nMetode: ${selectedKey.toUpperCase()}\n\nSaya sudah transfer. Mohon dicek dan aktifkan premium saya. Terima kasih.`;
                const waLink = buildWhatsAppLink(ADMIN_WA_NUMBER, msg);
                window.open(waLink, '_blank', 'noopener');
            });
        }
    } catch (e) {
        // ignore
    }
}

async function initTimelineGate() {
    try {
        if (!window.location || !String(window.location.pathname || '').toLowerCase().endsWith('timeline.html')) return;
        const wrapper = document.querySelector('.content-wrapper');
        if (!wrapper) return;
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        const premiumOk = user ? await isPremiumActive(sb, user.id) : false;
        if (premiumOk) return;
        wrapper.innerHTML = `<div class="card" style="padding: 18px;"><div class="card-meta">Premium</div><h3 class="card-title" style="margin-top: 6px;">Timeline & Peta Terkunci</h3><p class="card-text">Upgrade Premium untuk membuka fitur peta dan timeline lengkap.</p><div style="margin-top: 14px;"><a href="premium.html" class="btn-primary" style="display:inline-block; text-decoration:none;">Buka Premium</a></div></div>`;
    } catch (e) {
        // ignore
    }
}

async function initShopPage() {
    if (window.location && String(window.location.pathname || '').toLowerCase().endsWith('shop-checkout.html')) return;
    if (window.location && !String(window.location.pathname || '').toLowerCase().endsWith('shop.html')) return;
    if (!pageTitleIncludes('toko')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('products')
            .select('id, name, description, price, stock, image_url, sold_count, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Periksa RLS policy tabel products.');
            return;
        }

        const products = Array.isArray(data) ? data : [];
        if (products.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada produk', 'Tambahkan data di tabel products untuk menampilkan produk.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = products
            .map((p) => {
                const title = escapeHtml(p.name || 'Produk');
                const desc = escapeHtml((p.description || '').slice(0, 110));
                const img = (p.image_url || '').trim();
                const price = p.price != null ? String(p.price) : '';
                const stock = typeof p.stock === 'number' ? p.stock : 0;
                const href = `shop-checkout.html?product_id=${encodeURIComponent(p.id)}`;
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-store\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Stok ${escapeHtml(String(stock))}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${price ? `Rp ${escapeHtml(price)}` : 'Reward'}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Beli <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Terjadi error di browser.');
    }
}

async function initTokohPage() {
    const sectionTitle = document.querySelector('.section-title');
    if (!sectionTitle) return;
    if (!String(sectionTitle.textContent || '').toLowerCase().includes('tokoh')) return;

    const grid = document.querySelector('.stories-grid');
    if (!grid) return;

    try {
        const sb = await getSupabaseClient();

        const { data: categories, error: catErr } = await sb
            .from('categories')
            .select('id, name')
            .ilike('name', '%tokoh%')
            .limit(1);

        if (catErr) return;
        const cat = Array.isArray(categories) && categories[0] ? categories[0] : null;
        if (!cat) return;

        const { data: materi, error } = await sb
            .from('materi')
            .select('id, title, subtitle, image_url, summary, created_at')
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) return;
        const items = Array.isArray(materi) ? materi : [];
        if (items.length === 0) return;

        grid.innerHTML = items
            .map((m) => {
                const title = escapeHtml(m.title || 'Tokoh');
                const role = escapeHtml(m.subtitle || (m.summary || '').slice(0, 60));
                const img = (m.image_url || '').trim();
                const imgTag = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}">`
                    : `<div style="height: 170px; display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-users\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="story-card" onclick="window.location.href='content-detail.html?id=${encodeURIComponent(m.id)}'">
                    <div class="story-image-wrapper">
                        ${imgTag}
                    </div>
                    <div class="story-body">
                        <div class="story-title">${title}</div>
                        <div class="story-role">${role}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function loadCurrentProfile() {
    const sb = await getSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData && sessionData.session ? sessionData.session.user : null;
    if (!user) return { user: null, profile: null };

    const { data: profile } = await sb.from('profiles').select('id, full_name, username, avatar_url, points, level, created_at').eq('id', user.id).maybeSingle();
    return { user, profile: profile || null };
}

async function initCommonUser() {
    try {
        const { user, profile } = await loadCurrentProfile();
        if (profile) {
            updateCommonUserUI(profile);
            return;
        }

        if (user && user.user_metadata) {
            const meta = user.user_metadata || {};
            updateCommonUserUI({
                full_name: meta.full_name || '',
                username: meta.username || '',
                avatar_url: meta.avatar_url || '',
            });
        }
    } catch (e) {
        // ignore
    }
}

function updateCommonUserUI(profile) {
    if (!profile) return;

    const name = (profile.full_name || profile.username || 'Pengguna').trim();
    const avatarUrl = (profile.avatar_url || '').trim();

    document.querySelectorAll('.user-name').forEach((el) => {
        el.textContent = name;
    });

    if (avatarUrl) {
        document.querySelectorAll('img.user-avatar').forEach((img) => {
            img.src = avatarUrl;
        });
        document.querySelectorAll('img.profile-avatar-large').forEach((img) => {
            img.src = avatarUrl;
        });
    }

    const profileNameLarge = document.querySelector('.profile-name-large');
    if (profileNameLarge) profileNameLarge.textContent = name;
}

async function initDashboardPage() {
    const dashboardPage = document.getElementById('dashboardPage');
    const heroTitle = document.querySelector('.hero-section .hero-content h1');
    const heroStats = document.querySelectorAll('.hero-section .hero-stats .stat-value');
    const continueCardsGrid = document.querySelector('#dashboardPage .cards-grid');
    if (!heroTitle && !continueCardsGrid) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        if (heroTitle) {
            const displayName = profile && (profile.full_name || profile.username) ? (profile.full_name || profile.username) : 'Pengguna';
            heroTitle.textContent = `Selamat Datang, ${displayName}! 👋`;
        }

        let materiSelesai = 0;
        let badgeCount = 0;
        let exp = 0;
        let lastReadMateri = [];

        if (user) {
            const { data: readsForCount, error: readsCountErr } = await sb
                .from('daily_materi_reads')
                .select('materi_id, read_at')
                .eq('user_id', user.id)
                .order('read_at', { ascending: false })
                .limit(1000);

            if (!readsCountErr) {
                const unique = new Set();
                (Array.isArray(readsForCount) ? readsForCount : []).forEach((r) => {
                    if (r && r.materi_id != null) unique.add(r.materi_id);
                });
                materiSelesai = unique.size;
            }

            const { count: quizCount } = await sb
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            badgeCount = quizCount || 0;

            const { data: attemptsForBadges, error: attemptsErr } = await sb
                .from('quiz_attempts')
                .select('score')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1000);

            if (!attemptsErr) {
                const totalCorrect = (Array.isArray(attemptsForBadges) ? attemptsForBadges : []).reduce((sum, r) => {
                    const v = r && typeof r.score === 'number' ? r.score : 0;
                    return sum + v;
                }, 0);
                badgeCount = totalCorrect / 2;
                exp = Math.floor(badgeCount / 25) * 20;
            } else {
                exp = 0;
                if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
                    console.warn('Tidak bisa membaca quiz_attempts.score (kemungkinan RLS). Badge ditampilkan sebagai jumlah attempt (fallback).', attemptsErr);
                }
            }

            const { data: reads, error: readsErr } = await sb
                .from('daily_materi_reads')
                .select('read_at, materi:materi_id (id, title, summary, image_url, created_at)')
                .eq('user_id', user.id)
                .order('read_at', { ascending: false })
                .limit(6);

            if (!readsErr) {
                lastReadMateri = (Array.isArray(reads) ? reads : [])
                    .map((r) => ({
                        read_at: r.read_at,
                        materi: r.materi,
                    }))
                    .filter((x) => x && x.materi && x.materi.id != null);
            }
        }

        if (heroStats && heroStats.length >= 3) {
            heroStats[0].textContent = String(materiSelesai);
            heroStats[1].textContent = String(badgeCount);
            heroStats[2].textContent = String(exp);
        }

        if (continueCardsGrid) {
            if (!user) return;

            const items = lastReadMateri;
            if (!items || items.length === 0) {
                const { data: materi, error } = await sb
                    .from('materi')
                    .select('id, title, summary, image_url, category_id, created_at')
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (error) {
                    continueCardsGrid.innerHTML = '';
                    return;
                }

                const fallback = Array.isArray(materi) ? materi : [];
                continueCardsGrid.innerHTML = fallback
                    .map((m) => {
                        const title = escapeHtml(m.title || 'Materi');
                        const desc = escapeHtml((m.summary || '').slice(0, 120));
                        const img = (m.image_url || '').trim();
                        const imgHtml = img
                            ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                            : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\\"fas fa-book\\" style=\\"font-size:28px;color:rgba(31,60,115,0.65)\\"></i></div>`;
                        const href = `content-detail.html?id=${encodeURIComponent(m.id)}`;
                        return `
                        <div class="card" onclick="window.location.href='${href}'">
                            ${imgHtml}
                            <div class="card-body">
                                <div class="card-meta">Materi</div>
                                <h3 class="card-title">${title}</h3>
                                <p class="card-text">${desc}</p>
                            </div>
                            <div class="card-footer">
                                <span class="card-tag"><i class="fas fa-clock" style="margin-right: 5px;"></i> 10 menit</span>
                                <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Mulai <i class="fas fa-arrow-right"></i></span>
                            </div>
                        </div>`;
                    })
                    .join('');

                return;
            }

            continueCardsGrid.innerHTML = items
                .map((row) => {
                    const m = row.materi || {};
                    const title = escapeHtml(m.title || 'Materi');
                    const desc = escapeHtml((m.summary || '').slice(0, 120));
                    const img = (m.image_url || '').trim();
                    const imgHtml = img
                        ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                        : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\\"fas fa-book\\" style=\\"font-size:28px;color:rgba(31,60,115,0.65)\\"></i></div>`;
                    const href = `content-detail.html?id=${encodeURIComponent(m.id)}`;
                    const lastRead = row.read_at ? formatRelativeTime(row.read_at) : '';
                    return `
                    <div class="card" onclick="window.location.href='${href}'">
                        ${imgHtml}
                        <div class="card-body">
                            <div class="card-meta">Terakhir dibaca${lastRead ? ` • ${escapeHtml(lastRead)}` : ''}</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag"><i class="fas fa-clock" style="margin-right: 5px;"></i> 10 menit</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Lanjutkan <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>`;
                })
                .join('');
        }
    } catch (e) {
        // ignore
    } finally {
        if (dashboardPage) dashboardPage.classList.remove('tt-hydrate-hidden');
    }
}

async function initSavedPage() {
    const title = document.querySelector('.section-title');
    const grid = document.querySelector('.cards-grid');
    if (!title || !grid) return;
    if (!String(title.textContent || '').includes('Tersimpan')) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Silakan login untuk melihat materi tersimpan.</div>`;
            return;
        }

        const { data, error } = await sb
            .from('user_favorites')
            .select('created_at, materi:materi_id (id, title, summary, image_url)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Gagal memuat materi tersimpan.</div>`;
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi tersimpan.</div>`;
            return;
        }

        grid.innerHTML = rows
            .map((row) => {
                const m = row.materi || {};
                const title = escapeHtml(m.title || 'Materi');
                const desc = escapeHtml((m.summary || '').slice(0, 120));
                const img = (m.image_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-book\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const savedAt = formatRelativeTime(row.created_at);
                const href = m.id ? `content-detail.html?id=${encodeURIComponent(m.id)}` : 'content-detail.html';

                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Materi</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Tersimpan ${escapeHtml(savedAt)}</span>
                        <i class="fas fa-bookmark" style="color: var(--primary);"></i>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initNotificationPage() {
    const layout = document.querySelector('.notification-layout');
    const generalList = document.getElementById('generalNotif');
    if (!layout || !generalList) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) return;

        const { data, error } = await sb
            .from('notifications')
            .select('id, type, title, message, created_at, is_read, badge_count')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) return;

        const items = Array.isArray(data) ? data : [];
        if (items.length === 0) {
            generalList.innerHTML = `<div class="notification-item"><div class="notification-content"><h4>Tidak ada notifikasi</h4><p>Notifikasi kamu akan muncul di sini.</p></div></div>`;
            return;
        }

        const iconByType = (t) => {
            const type = String(t || '').toLowerCase();
            if (type.includes('materi')) return { cls: 'blue', icon: '📖' };
            if (type.includes('quiz')) return { cls: 'orange', icon: '🎯' };
            if (type.includes('premium')) return { cls: 'purple', icon: '👑' };
            if (type.includes('chat')) return { cls: 'green', icon: '💬' };
            return { cls: 'green', icon: '📌' };
        };

        generalList.innerHTML = items
            .map((n) => {
                const { cls, icon } = iconByType(n.type);
                const title = escapeHtml(n.title || 'Notifikasi');
                const msg = escapeHtml(n.message || '');
                const time = escapeHtml(formatRelativeTime(n.created_at));
                return `
                <div class="notification-item">
                    <div class="notification-icon ${cls}">${icon}</div>
                    <div class="notification-content">
                        <h4>${title}</h4>
                        <p>${msg}</p>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initProfilePage() {
    const profileHeader = document.querySelector('.profile-header-card');
    if (!profileHeader) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user || !profile) return;

        let materiSelesai = 0;
        let badgeCount = 0;
        let exp = 0;

        const { data: readsForCount, error: readsCountErr } = await sb
            .from('daily_materi_reads')
            .select('materi_id, read_at')
            .eq('user_id', user.id)
            .order('read_at', { ascending: false })
            .limit(1000);

        if (!readsCountErr) {
            const unique = new Set();
            (Array.isArray(readsForCount) ? readsForCount : []).forEach((r) => {
                if (r && r.materi_id != null) unique.add(r.materi_id);
            });
            materiSelesai = unique.size;
        }

        const { data: attemptsForBadges, error: attemptsErr } = await sb
            .from('quiz_attempts')
            .select('score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (!attemptsErr) {
            const totalCorrect = (Array.isArray(attemptsForBadges) ? attemptsForBadges : []).reduce((sum, r) => {
                const v = r && typeof r.score === 'number' ? r.score : 0;
                return sum + v;
            }, 0);
            badgeCount = totalCorrect / 2;
            exp = Math.floor(badgeCount / 25) * 20;
        } else {
            const { count: quizCount } = await sb
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            badgeCount = quizCount || 0;
            exp = 0;
            if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
                console.warn('Tidak bisa membaca quiz_attempts.score (kemungkinan RLS). Badge ditampilkan sebagai jumlah attempt (fallback).', attemptsErr);
            }
        }

        const statsValues = document.querySelectorAll('.profile-stats .profile-stat-value');
        if (statsValues && statsValues.length >= 3) {
            statsValues[0].textContent = String(materiSelesai);
            statsValues[1].textContent = String(badgeCount);
            statsValues[2].textContent = String(exp);
        }

        const savedMenu = Array.from(document.querySelectorAll('.menu-item-content p')).find((p) => String(p.textContent || '').includes('materi tersimpan'));
        if (savedMenu) {
            const { count: favCount } = await sb
                .from('user_favorites')
                .select('materi_id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            savedMenu.textContent = `${favCount || 0} materi tersimpan`;
        }
    } catch (e) {
        // ignore
    }
}

function initDataPages() {
    initCommonUser();
    initContentDetailTracking();
    initContentDetailPage();
    initQuizDetailPage();
    initDashboardPage();
    initSavedPage();
    initNotificationPage();
    initProfilePage();
    initQuizzesPage();
    initCommunityPage();
    initTasksPage();
    initPremiumPage();
    initPremiumPaymentPage();
    initTimelineGate();
    initShopPage();
    initShopCheckoutPage();
    initTokohPage();
}
