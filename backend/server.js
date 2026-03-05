const path = require('path');
const fs = require('fs');

const envPathEnv = path.resolve(__dirname, '.env');
const envPathRootEnv = path.resolve(__dirname, '..', '.env');
const envPathVnv = path.resolve(__dirname, '.vnv');
const envPath = fs.existsSync(envPathEnv) ? envPathEnv : (fs.existsSync(envPathRootEnv) ? envPathRootEnv : envPathVnv);
require('dotenv').config({ path: envPath });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 9090;
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY belum diset di backend/.env' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
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

app.get('/landing.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'landing.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'landing.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
