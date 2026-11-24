// Zuri Studio server — keys zimefichwa hapa, watumiaji hawazioni kamwe.
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, ADMIN_EMAIL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Weka SUPABASE_URL na SUPABASE_SERVICE_KEY kwenye Environment Variables.');
  process.exit(1);
}
const mk = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));

const PROVIDERS = ['cerebras', 'groq', 'gemini', 'openrouter', 'deepseek', 'openai', 'claude'];
const DEFAULT_MODELS = {
  cerebras: 'llama-3.3-70b', groq: 'llama-3.3-70b-versatile', gemini: 'gemini-2.5-flash',
  openrouter: 'openrouter/auto', deepseek: 'deepseek-chat', openai: 'gpt-4o-mini', claude: 'claude-3-5-sonnet-latest'
};

// ---------- secrets (cache) ----------
let secretsCache = null, secretsAt = 0;
async function getSecrets(force) {
  if (!force && secretsCache && Date.now() - secretsAt < 15000) return secretsCache;
  const { data } = await sb.from('app_secrets').select('*').eq('id', 1).maybeSingle();
  secretsCache = data || { keys: {}, models: {}, active_provider: 'auto' };
  secretsAt = Date.now();
  return secretsCache;
}

// ---------- auth ----------
async function auth(req, res, next) {
  try {
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!t) return res.status(401).json({ error: 'Hujaingia' });
    const { data, error } = await sb.auth.getUser(t);
    if (error || !data?.user) return res.status(401).json({ error: 'Session imeisha' });
    const u = data.user;
    const isAdminEmail = ADMIN_EMAIL && (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
    let { data: p } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (!p) {
      const ins = await sb.from('profiles').insert({ id: u.id, email: u.email, role: isAdminEmail ? 'admin' : 'user' }).select().single();
      p = ins.data;
    } else if (isAdminEmail && p.role !== 'admin') {
      const upd = await sb.from('profiles').update({ role: 'admin' }).eq('id', u.id).select().single();
      p = upd.data || p;
    }
    if (!p) return res.status(500).json({ error: 'Profile haikupatikana' });
    if (!p.active) return res.status(403).json({ error: 'Akaunti yako imezimwa na admin.' });
    req.user = p;
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin pekee' });

// signup rate limit
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 3600000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 12;
}
const sess = s => ({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at });

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (limited(req.ip)) return res.status(429).json({ error: 'Majaribio mengi. Jaribu baadaye.' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email si sahihi' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password iwe angalau herufi 6' });
  const c = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (c.error) return res.status(400).json({ error: /already|registered/i.test(c.error.message) ? 'Email hii tayari imesajiliwa. Ingia.' : c.error.message });
  const r = await mk().auth.signInWithPassword({ email, password });
  if (r.error) return res.status(400).json({ error: r.error.message });
  res.json(sess(r.data.session));
});
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await mk().auth.signInWithPassword({ email: email || '', password: password || '' });
  if (r.error) return res.status(400).json({ error: 'Email au password si sahihi' });
  res.json(sess(r.data.session));
});
app.post('/api/auth/refresh', async (req, res) => {
  const r = await mk().auth.refreshSession({ refresh_token: (req.body || {}).refresh_token || '' });
  if (r.error || !r.data.session) return res.status(401).json({ error: 'Session imeisha' });
  res.json(sess(r.data.session));
});

app.get('/api/me', auth, (req, res) => {
  const p = req.user;
  res.json({ id: p.id, email: p.email, role: p.role, active: p.active, daily_limit: p.daily_limit });
});

// ---------- per-user data ----------
app.get('/api/data', auth, async (req, res) => {
  const { data } = await sb.from('user_data').select('data,updated_at').eq('user_id', req.user.id).maybeSingle();
  res.json({ data: data?.data || {}, updated_at: data?.updated_at || null });
});
app.put('/api/data', auth, async (req, res) => {
  const d = (req.body || {}).data;
  if (!d || typeof d !== 'object') return res.status(400).json({ error: 'Data si sahihi' });
  const clean = {};
  for (const [k, v] of Object.entries(d)) if (k.startsWith('zuri_lg_') && typeof v === 'string') clean[k] = v;
  if (JSON.stringify(clean).length > 4_000_000) return res.status(413).json({ error: 'Data ni kubwa mno' });
  const { error } = await sb.from('user_data').upsert({ user_id: req.user.id, data: clean, updated_at: new Date().toISOString() });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ---------- AI chat (keys zinatumika hapa tu) ----------
async function callProvider(provider, key, model, sys, messages) {
  model = model || DEFAULT_MODELS[provider];
  if (provider === 'gemini') {
    const contents = messages.map(m => {
      const parts = [];
      if (m.text) parts.push({ text: m.text });
      if (m.imageBase64 && m.imageMime) parts.push({ inline_data: { mime_type: m.imageMime, data: m.imageBase64 } });
      if (!parts.length) parts.push({ text: ' ' });
      return { role: m.role === 'user' ? 'user' : 'model', parts };
    });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
    const out = d?.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('').trim();
    if (!out) throw new Error('Jibu tupu');
    return out;
  }
  if (provider === 'claude') {
    const formatted = messages.map(m => {
      if (m.role === 'user' && m.imageBase64 && m.imageMime) {
        const c = [{ type: 'image', source: { type: 'base64', media_type: m.imageMime, data: m.imageBase64 } }];
        if (m.text) c.push({ type: 'text', text: m.text });
        return { role: 'user', content: c };
      }
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text || ' ' };
    });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1600, system: sys, messages: formatted })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
    const out = (d?.content || []).map(x => x.text || '').join('').trim();
    if (!out) throw new Error('Jibu tupu');
    return out;
  }
  const urls = {
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions'
  };
  const canVision = provider === 'openai' || provider === 'openrouter';
  const formatted = [{ role: 'system', content: sys }];
  for (const m of messages) {
    if (m.role === 'user' && m.imageDataUrl && canVision) {
      const c = [];
      if (m.text) c.push({ type: 'text', text: m.text });
      c.push({ type: 'image_url', image_url: { url: m.imageDataUrl } });
      formatted.push({ role: 'user', content: c });
    } else formatted.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || ' ' });
  }
  const r = await fetch(urls[provider], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: formatted, temperature: 0.78 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
  const out = d?.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('Jibu tupu');
  return out;
}

app.post('/api/chat', auth, async (req, res) => {
  const { sys, messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Ujumbe hauna maudhui' });
  const day = new Date().toISOString().slice(0, 10);
  let used = 0;
  if (req.user.role !== 'admin') {
    const { data } = await sb.from('usage').select('count').eq('user_id', req.user.id).eq('day', day).maybeSingle();
    used = data?.count || 0;
    if (used >= req.user.daily_limit) return res.status(429).json({ error: `Umefikia kikomo cha ujumbe ${req.user.daily_limit} kwa siku. Rudi kesho.` });
  }
  const s = await getSecrets();
  const active = PROVIDERS.filter(p => (s.keys?.[p] || '').trim());
  if (!active.length) return res.status(503).json({ error: 'Huduma ya AI haijawekwa na admin bado.' });
  const pref = s.active_provider || 'auto';
  const order = pref === 'auto' || !active.includes(pref) ? active : [pref, ...active.filter(x => x !== pref)];
  const trimmed = messages.slice(-20).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    text: String(m.text || '').slice(0, 12000),
    imageBase64: m.imageBase64, imageMime: m.imageMime, imageDataUrl: m.imageDataUrl
  }));
  const errors = [];
  for (const p of order) {
    try {
      const text = await callProvider(p, s.keys[p].trim(), (s.models?.[p] || '').trim(), String(sys || '').slice(0, 14000), trimmed);
      await sb.from('usage').upsert({ user_id: req.user.id, day, count: used + 1 });
      return res.json({ text, provider: p.toUpperCase() });
    } catch (e) { errors.push(`${p}: ${e.message}`); }
  }
  console.error('AI imeshindwa:', errors.join(' | '));
  res.status(502).json({ error: 'AI haikuweza kujibu sasa hivi. Jaribu tena baadaye.' });
});

// ---------- admin ----------
const mask = k => k ? '••••' + k.slice(-4) : '';
app.get('/api/admin/secrets', auth, adminOnly, async (req, res) => {
  const s = await getSecrets(true);
  const providers = {};
  PROVIDERS.forEach(p => providers[p] = { hasKey: !!(s.keys?.[p] || '').trim(), masked: mask(s.keys?.[p] || ''), model: s.models?.[p] || DEFAULT_MODELS[p] });
  res.json({ providers, active_provider: s.active_provider || 'auto' });
});
app.put('/api/admin/secrets', auth, adminOnly, async (req, res) => {
  const b = req.body || {};
  const s = await getSecrets(true);
  const keys = { ...(s.keys || {}) }, models = { ...(s.models || {}) };
  for (const p of PROVIDERS) {
    if (typeof b.keys?.[p] === 'string' && b.keys[p].trim()) keys[p] = b.keys[p].trim();
    if (Array.isArray(b.remove) && b.remove.includes(p)) delete keys[p];
    if (typeof b.models?.[p] === 'string' && b.models[p].trim()) models[p] = b.models[p].trim();
  }
  const ap = (b.active_provider === 'auto' || PROVIDERS.includes(b.active_provider)) ? b.active_provider : (s.active_provider || 'auto');
  const { error } = await sb.from('app_secrets').upsert({ id: 1, keys, models, active_provider: ap });
  if (error) return res.status(500).json({ error: error.message });
  await getSecrets(true);
  res.json({ ok: true });
});
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  const { data: users } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
  const { data: us } = await sb.from('usage').select('user_id,count').eq('day', day);
  const map = Object.fromEntries((us || []).map(u => [u.user_id, u.count]));
  res.json({ users: (users || []).map(u => ({ ...u, today: map[u.id] || 0 })) });
});
app.patch('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const patch = {};
  if (typeof req.body.active === 'boolean') patch.active = req.body.active;
  if (Number.isInteger(req.body.daily_limit) && req.body.daily_limit >= 0) patch.daily_limit = req.body.daily_limit;
  if (req.params.id === req.user.id) delete patch.active;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Hakuna mabadiliko' });
  const { error } = await sb.from('profiles').update(patch).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ---------- site file overrides (upload toleo jipya bila kugusa keys) ----------
const NAME_RE = /^[a-z0-9-]+\.html$/;
let overrides = new Map();
async function loadOverrides() {
  try {
    const { data } = await sb.from('site_files').select('id,name,content').order('id', { ascending: false }).limit(300);
    const m = new Map();
    (data || []).forEach(r => { if (!m.has(r.name)) m.set(r.name, r.content); });
    overrides = m;
  } catch (e) { console.error('overrides:', e.message); }
}
app.get('/api/admin/files', auth, adminOnly, async (req, res) => {
  const { data } = await sb.from('site_files').select('id,name,created_at,content').order('id', { ascending: false }).limit(100);
  res.json({ files: (data || []).map(r => ({ id: r.id, name: r.name, created_at: r.created_at, size: r.content.length })) });
});
app.post('/api/admin/files', auth, adminOnly, async (req, res) => {
  const files = (req.body || {}).files;
  if (!Array.isArray(files) || !files.length) return res.status(400).json({ error: 'Hakuna faili' });
  for (const f of files) {
    if (!NAME_RE.test(f.name || '') || typeof f.content !== 'string' || f.content.length > 3_000_000 || !/<html|<!doctype/i.test(f.content.slice(0, 2000)))
      return res.status(400).json({ error: `Faili "${f.name}" si sahihi (lazima liwe .html, herufi ndogo, chini ya 3MB)` });
  }
  for (const f of files) {
    await sb.from('site_files').insert({ name: f.name, content: f.content });
    const { data: old } = await sb.from('site_files').select('id').eq('name', f.name).order('id', { ascending: false }).range(6, 200);
    if (old?.length) await sb.from('site_files').delete().in('id', old.map(o => o.id));
  }
  await loadOverrides();
  res.json({ ok: true, count: files.length });
});
app.post('/api/admin/files/rollback', auth, adminOnly, async (req, res) => {
  const name = (req.body || {}).name;
  if (!NAME_RE.test(name || '')) return res.status(400).json({ error: 'Jina si sahihi' });
  const { data } = await sb.from('site_files').select('id').eq('name', name).order('id', { ascending: false }).limit(1);
  if (!data?.length) return res.status(404).json({ error: 'Hakuna toleo la kurudisha nyuma (linatumia faili asili).' });
  await sb.from('site_files').delete().eq('id', data[0].id);
  await loadOverrides();
  res.json({ ok: true });
});

// ---------- pages ----------
app.get(/^\/([a-z0-9-]*)(\.html)?$/, (req, res, next) => {
  const name = (req.params[0] || 'index') + '.html';
  res.set('Cache-Control', 'no-cache');
  if (overrides.has(name)) return res.type('html').send(overrides.get(name));
  const file = path.join(__dirname, name);
  if (fs.existsSync(file)) return res.sendFile(file);
  next();
});
app.use((req, res) => res.status(404).send('Ukurasa haupatikani'));

const PORT = process.env.PORT || 3000;
loadOverrides().finally(() => app.listen(PORT, () => console.log('Zuri Studio inaendesha port ' + PORT)));
