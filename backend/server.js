const path = require('path');
const fs = require('fs');

const envPathEnv = path.resolve(__dirname, '.env');
const envPathRootEnv = path.resolve(__dirname, '..', '.env');
const envPathVnv = path.resolve(__dirname, '.vnv');
const envPath = fs.existsSync(envPathEnv) ? envPathEnv : (fs.existsSync(envPathRootEnv) ? envPathRootEnv : envPathVnv);
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

// DEBUG: Cek apakah env terbaca
console.log('MIDTRANS_SERVER_KEY loaded:', !!process.env.MIDTRANS_SERVER_KEY);
console.log('MIDTRANS_CLIENT_KEY loaded:', !!process.env.MIDTRANS_CLIENT_KEY);
console.log('Client Key First 5 chars:', (process.env.MIDTRANS_CLIENT_KEY || '').substring(0, 5));

const express = require('express');
const midtransClient = require('midtrans-client'); // Import Midtrans
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 9090;
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const YT_API_KEY = String(process.env.YT_API_KEY || '').trim();
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// Midtrans Config
const MIDTRANS_SERVER_KEY = String(process.env.MIDTRANS_SERVER_KEY || '').trim();
const MIDTRANS_CLIENT_KEY = String(process.env.MIDTRANS_CLIENT_KEY || '').trim();
const MIDTRANS_IS_PRODUCTION = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';

// Init Snap
let snap = null;
if (MIDTRANS_SERVER_KEY) {
    snap = new midtransClient.Snap({
        isProduction: MIDTRANS_IS_PRODUCTION,
        serverKey: MIDTRANS_SERVER_KEY,
        clientKey: MIDTRANS_CLIENT_KEY
    });
}

const frontDir = path.resolve(__dirname, '..', 'front');
const rootDir = path.resolve(__dirname, '..');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => String(req.path || '') === '/supabase-public-config',
  handler: (_req, res) => res.status(429).json({ error: 'Terlalu banyak request, coba lagi nanti.' }),
});
app.use('/api/', limiter);

app.use(express.static(frontDir, { index: false }));

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.get('/api/supabase-public-config', (_req, res) => {
  // Reload ENV values on every request (for debugging purposes)
  const currentClientKey = String(process.env.MIDTRANS_CLIENT_KEY || '').trim();
  const currentIsProd = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY belum diset di backend/.env' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ 
    url: SUPABASE_URL, 
    anonKey: SUPABASE_ANON_KEY,
    ytApiKey: YT_API_KEY,
    midtransClientKey: currentClientKey, // Gunakan value terbaru
    midtransIsProduction: currentIsProd
  });
});

async function supabaseRestRequest(resourcePath) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resourcePath}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase error ${res.status}: ${message}`);
  }

  return res.json();
}

async function supabaseServiceRestRequest(resourcePath) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resourcePath}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase error ${res.status}: ${message}`);
  }

  return res.json();
}

app.get('/api/categories', async (_req, res) => {
  if (!hasSupabaseConfig()) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_SERVICE_ROLE_KEY) belum diset.' });
  }

  try {
    const data = await supabaseRestRequest('categories?select=id,name&order=name.asc');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil kategori dari Supabase.' });
  }
});

// Endpoint Khusus untuk Update XP (Bypass Trigger/RLS Client)
app.post('/api/claim-xp', async (req, res) => {
  if (!hasSupabaseConfig()) return res.status(500).json({ error: 'Supabase config missing' });
  
  const { userId, xpAmount } = req.body;
  if (!userId || !xpAmount) return res.status(400).json({ error: 'Missing userId or xpAmount' });

  try {
    // 1. Ambil XP saat ini
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=xp`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    
    if (!fetchRes.ok) throw new Error('Failed to fetch profile');
    const profiles = await fetchRes.json();
    if (!profiles.length) return res.status(404).json({ error: 'User not found' });
    
    const currentXp = profiles[0].xp || 0;
    const newXp = currentXp + parseInt(xpAmount);

    // 2. Update XP (Menggunakan Service Role Key harusnya bisa bypass RLS, tapi Trigger tetap jalan)
    // Jika Trigger memblokir UPDATE kolom XP, kita harus mematikan trigger itu di DB.
    // Tapi mari kita coba dulu, siapa tahu Trigger hanya mengecek 'auth.uid()' yang berbeda saat pakai Service Role.
    
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ xp: newXp })
    });

    if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Update failed: ${errText}`);
    }

    return res.json({ success: true, newXp });
  } catch (err) {
    console.error('XP Update Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/resolve-username', async (req, res) => {
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'SUPABASE_URL belum diset.' });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset.' });
  }

  const usernameRaw = String(req.query.username || '').trim().toLowerCase();
  if (!usernameRaw) {
    return res.status(400).json({ error: 'username wajib diisi' });
  }

  try {
    const q = `profiles?select=email&username=eq.${encodeURIComponent(usernameRaw)}&limit=1`;
    const data = await supabaseServiceRestRequest(q);
    const row = Array.isArray(data) && data.length ? data[0] : null;
    const email = row && row.email ? String(row.email).trim().toLowerCase() : '';
    if (!email) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ email });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal resolve username.' });
  }
});

app.get('/api/materi', async (req, res) => {
  if (!hasSupabaseConfig()) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_SERVICE_ROLE_KEY) belum diset.' });
  }

  try {
    const categoryId = String(req.query.category_id || '').trim();
    const baseQuery = 'select=*&order=created_at.desc&limit=24';
    const query = categoryId
      ? `materi?${baseQuery}&category_id=eq.${encodeURIComponent(categoryId)}`
      : `materi?${baseQuery}`;

    const data = await supabaseRestRequest(query);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil materi dari Supabase.' });
  }
});

// Endpoint Generate Snap Token
app.post('/api/midtrans/token', async (req, res) => {
    if (!snap) return res.status(500).json({ error: 'Midtrans belum dikonfigurasi di server.' });
    
    const { orderId, grossAmount, customerDetails } = req.body;
    
    if (!orderId || !grossAmount) {
        return res.status(400).json({ error: 'Missing orderId or grossAmount' });
    }

    let parameter = {
        "transaction_details": {
            "order_id": orderId,
            "gross_amount": Math.round(grossAmount) // Pastikan integer
        },
        "credit_card": {
            "secure": true
        },
        "customer_details": customerDetails || {}
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        return res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
    } catch (e) {
        console.error('Midtrans Error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Webhook Midtrans Notification Handler
app.post('/api/midtrans/notification', async (req, res) => {
    try {
        const notification = req.body;
        
        // Verifikasi status transaksi via Midtrans SDK
        // Ini memastikan data valid dan bukan spoofing
        const statusResponse = await snap.transaction.notification(notification);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Midtrans Notif: ${orderId} | Status: ${transactionStatus}`);

        let isPaid = false;
        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                // Challenge -> manual review
            } else if (fraudStatus == 'accept') {
                isPaid = true;
            }
        } else if (transactionStatus == 'settlement') {
            isPaid = true;
        }

        if (isPaid) {
            // 1. Cari data pembelian berdasarkan Order ID
            // Kita pakai fetch langsung agar fleksibel (karena helper kita terbatas GET)
            const searchUrl = `${SUPABASE_URL}/rest/v1/premium_purchases?select=user_id,package_id&payment_account_info=eq.${orderId}&limit=1`;
            const searchRes = await fetch(searchUrl, {
                headers: { 
                    'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` 
                }
            });
            const searchData = await searchRes.json();
            
            if (searchData && searchData.length > 0) {
                const purchase = searchData[0];
                const userId = purchase.user_id;
                const packageId = purchase.package_id;

                // 2. Update status pembelian jadi 'paid'
                await fetch(`${SUPABASE_URL}/rest/v1/premium_purchases?payment_account_info=eq.${orderId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ status: 'paid', updated_at: new Date().toISOString() })
                });

                // 3. Ambil durasi paket
                const packRes = await fetch(`${SUPABASE_URL}/rest/v1/premium_packages?select=duration_days&id=eq.${packageId}`, {
                     headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
                });
                const packs = await packRes.json();
                const duration = (packs && packs.length) ? packs[0].duration_days : 30;

                // 4. Hitung tanggal expired & Update Profile
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + duration);

                await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        is_premium: true, 
                        premium_until: expiryDate.toISOString() 
                    })
                });
                
                console.log(`[PREMIUM ACTIVATED] User: ${userId}, Until: ${expiryDate.toISOString()}`);
            } else {
                console.log('Purchase data not found for Order ID:', orderId);
            }
        }

        res.status(200).send('OK');
    } catch (e) {
        console.error('Midtrans Notification Error:', e);
        res.status(500).send('Error processing notification');
    }
});

app.get('/landing.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'landing.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'landing.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
