'use strict';
/* Zuri Gateway — seva ndogo (Node 18+, hakuna vifurushi vya nje).
   Inaficha API keys zako, inathibitisha watumiaji (Supabase Auth) na kuweka kikomo cha kila siku. */
const http = require('http');
const fs = require('fs');
const { Readable } = require('stream');
const env = process.env;

const PORT = Number(env.PORT) || 8787;
const DAILY = Number(env.FREE_DAILY_LIMIT) || 20;        // ujumbe wa AI kwa siku kwa kila mtumiaji
const STT_DAILY = Number(env.FREE_STT_DAILY_LIMIT) || 60; // maombi ya kusikia sauti kwa siku
const SB = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_ANON = env.SUPABASE_ANON_KEY || '';
const SB_SVC = env.SUPABASE_SERVICE_KEY || '';
const DEV = env.DEV_MODE === '1';
const ORIGINS = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);

const CATALOG = [
  ['groq', 'https://api.groq.com/openai/v1/chat/completions', 'GROQ', 'llama-3.3-70b-versatile'],
  ['cerebras', 'https://api.cerebras.ai/v1/chat/completions', 'CEREBRAS', 'llama-3.3-70b'],
  ['gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', 'GEMINI', 'gemini-2.5-flash'],
  ['openrouter', 'https://openrouter.ai/api/v1/chat/completions', 'OPENROUTER', 'openrouter/auto'],
  ['deepseek', 'https://api.deepseek.com/chat/completions', 'DEEPSEEK', 'deepseek-chat'],
  ['openai', 'https://api.openai.com/v1/chat/completions', 'OPENAI', 'gpt-4o-mini']
];
let providers = CATALOG.map(([id, url, P, model]) => ({ id, url: env[P + '_URL'] || url, key: env[P + '_API_KEY'] || '', model: env[P + '_MODEL'] || model })).filter(p => p.key);
if (env.PROVIDER_ORDER) {
  const o = env.PROVIDER_ORDER.split(',').map(s => s.trim());
  providers.sort((a, b) => (o.indexOf(a.id) < 0 ? 99 : o.indexOf(a.id)) - (o.indexOf(b.id) < 0 ? 99 : o.indexOf(b.id)));
}

/* ---------- helpers ---------- */
function cors(req, res) {
  const o = req.headers.origin || '';
  if (ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (ORIGINS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too-large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const hits = new Map();
function limited(ip) {
  const now = Date.now(); const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h); return h.n > 90;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now - v.t > 120000) hits.delete(k); for (const [k, v] of authCache) if (v.exp < now) authCache.delete(k); }, 60000).unref();

/* ---------- auth ---------- */
const authCache = new Map();
async function authUser(req) {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  if (!m) return null; const tok = m[1];
  if (DEV && tok.startsWith('dev-')) return { id: tok, email: tok + '@dev.local' };
  if (!SB || !SB_ANON) return null;
  const c = authCache.get(tok); if (c && c.exp > Date.now()) return c.u;
  try {
    const r = await fetch(SB + '/auth/v1/user', { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + tok } });
    if (!r.ok) return null; const j = await r.json();
    const u = { id: j.id, email: j.email }; authCache.set(tok, { u, exp: Date.now() + 60000 }); return u;
  } catch (_) { return null; }
}

/* ---------- usage (Supabase au kumbukumbu kwa majaribio) ---------- */
const mem = new Map();
const today = () => new Date().toISOString().slice(0, 10);
const useDB = () => !!(SB && SB_SVC) && !DEV;
const sbH = () => ({ apikey: SB_SVC, Authorization: 'Bearer ' + SB_SVC, 'Content-Type': 'application/json' });
async function bump(uid, kind, limit) {
  if (useDB()) {
    const r = await fetch(SB + '/rest/v1/rpc/zuri_bump', { method: 'POST', headers: sbH(), body: JSON.stringify({ p_user: uid, p_day: today(), p_kind: kind, p_limit: limit }) });
    if (!r.ok) throw new Error('usage-store ' + r.status);
    const v = await r.json(); return v === null ? null : Number(v);
  }
  const k = uid + '|' + kind + '|' + today(); const n = mem.get(k) || 0;
  if (n >= limit) return null; mem.set(k, n + 1); return n + 1;
}
async function unbump(uid, kind) {
  try {
    if (useDB()) await fetch(SB + '/rest/v1/rpc/zuri_unbump', { method: 'POST', headers: sbH(), body: JSON.stringify({ p_user: uid, p_day: today(), p_kind: kind }) });
    else { const k = uid + '|' + kind + '|' + today(); mem.set(k, Math.max((mem.get(k) || 1) - 1, 0)); }
  } catch (_) {}
}
async function usageOf(uid) {
  const out = { chat: 0, stt: 0 };
  if (useDB()) {
    try {
      const r = await fetch(`${SB}/rest/v1/zuri_usage?user_id=eq.${encodeURIComponent(uid)}&day=eq.${today()}&select=kind,count`, { headers: sbH() });
      if (r.ok) (await r.json()).forEach(x => { out[x.kind] = x.count; });
    } catch (_) {}
  } else { out.chat = mem.get(uid + '|chat|' + today()) || 0; out.stt = mem.get(uid + '|stt|' + today()) || 0; }
  return out;
}

/* ---------- routes ---------- */
async function chat(req, res, user) {
  let body; try { body = JSON.parse((await readBody(req, 250000)).toString() || '{}'); } catch (_) { return json(res, 400, { error: 'Ombi si sahihi' }); }
  const msgs = (Array.isArray(body.messages) ? body.messages.slice(-30) : [])
    .filter(m => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!msgs.length) return json(res, 400, { error: 'Hakuna ujumbe' });
  if (!providers.length) return json(res, 503, { error: 'Seva haina AI iliyowekwa bado' });
  const n = await bump(user.id, 'chat', DAILY);
  if (n === null) return json(res, 429, { error: 'limit', limit: DAILY, used: DAILY });
  const stream = !!body.stream;
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 500, 16), 700);
  const temperature = Math.min(Math.max(Number(body.temperature) || 0.7, 0), 1.2);
  const ac = new AbortController(); res.on('close', () => ac.abort());
  for (const p of providers) {
    try {
      const r = await fetch(p.url, { method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key }, body: JSON.stringify({ model: p.model, messages: msgs, temperature, max_tokens, stream }) });
      if (!r.ok) { await r.text().catch(() => {}); continue; }
      if (stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Zuri-Provider': p.id, 'Access-Control-Expose-Headers': 'X-Zuri-Provider' });
        Readable.fromWeb(r.body).on('error', () => res.end()).pipe(res); return;
      }
      const j = await r.json(); j.zuri_provider = p.id; return json(res, 200, j);
    } catch (e) { if (ac.signal.aborted) return; }
  }
  await unbump(user.id, 'chat');
  json(res, 502, { error: 'AI zote zimeshindwa kwa sasa. Jaribu tena baadae.' });
}
async function stt(req, res, user) {
  const g = providers.find(p => p.id === 'groq'); const key = (g && g.key) || env.GROQ_API_KEY;
  if (!key) return json(res, 503, { error: 'Kusikia hakujawekwa kwenye seva' });
  let buf; try { buf = await readBody(req, 3 * 1024 * 1024); } catch (_) { return json(res, 413, { error: 'Sauti ni ndefu mno' }); }
  if (buf.length < 2000) return json(res, 400, { error: 'Sauti fupi mno' });
  const n = await bump(user.id, 'stt', STT_DAILY);
  if (n === null) return json(res, 429, { error: 'limit', limit: STT_DAILY });
  const fd = new FormData(); fd.append('file', new Blob([buf], { type: 'audio/wav' }), 'a.wav');
  fd.append('model', env.STT_MODEL || 'whisper-large-v3-turbo'); fd.append('language', 'sw');
  try {
    const r = await fetch(env.GROQ_STT_URL || 'https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd });
    if (!r.ok) throw new Error('stt ' + r.status);
    const j = await r.json(); json(res, 200, { text: (j.text || '').trim() });
  } catch (_) { await unbump(user.id, 'stt'); json(res, 502, { error: 'Kusikia kumeshindwa' }); }
}
async function report(req, res, user) {
  let b; try { b = JSON.parse((await readBody(req, 20000)).toString() || '{}'); } catch (_) { return json(res, 400, { error: 'Ombi si sahihi' }); }
  const rec = { at: new Date().toISOString(), user: user ? user.id : null, reason: String(b.reason || '').slice(0, 80), text: String(b.text || '').slice(0, 4000) };
  console.log('[REPORT]', JSON.stringify(rec));
  try {
    if (useDB()) await fetch(SB + '/rest/v1/zuri_reports', { method: 'POST', headers: { ...sbH(), Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: rec.user, reason: rec.reason, text: rec.text }) });
    else fs.appendFileSync(env.REPORT_FILE || 'reports.jsonl', JSON.stringify(rec) + '\n');
  } catch (_) {}
  json(res, 200, { ok: true });
}
async function deleteAccount(req, res, user) {
  try {
    if (useDB()) {
      await fetch(`${SB}/rest/v1/zuri_usage?user_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: sbH() });
      const r = await fetch(`${SB}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: sbH() });
      if (!r.ok) throw new Error('delete ' + r.status);
    } else for (const k of [...mem.keys()]) if (k.startsWith(user.id + '|')) mem.delete(k);
    authCache.clear(); json(res, 200, { ok: true });
  } catch (_) { json(res, 500, { error: 'Imeshindwa kufuta akaunti. Wasiliana nasi.' }); }
}

http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return json(res, 429, { error: 'Maombi mengi mno. Subiri dakika moja.' });
  const url = (req.url || '/').split('?')[0];
  try {
    if (url === '/health') return json(res, 200, { ok: true, providers: providers.map(p => p.id), db: useDB(), dev: DEV });
    if (url === '/api/report' && req.method === 'POST') return report(req, res, await authUser(req));
    if (url.startsWith('/api/')) {
      const user = await authUser(req);
      if (!user) return json(res, 401, { error: 'Ingia kwenye akaunti kwanza' });
      if (url === '/api/chat' && req.method === 'POST') return chat(req, res, user);
      if (url === '/api/stt' && req.method === 'POST') return stt(req, res, user);
      if (url === '/api/usage' && req.method === 'GET') { const u = await usageOf(user.id); return json(res, 200, { day: today(), email: user.email, chat: { used: u.chat, limit: DAILY }, stt: { used: u.stt, limit: STT_DAILY } }); }
      if (url === '/api/account' && req.method === 'DELETE') return deleteAccount(req, res, user);
    }
    json(res, 404, { error: 'Haipo' });
  } catch (e) { json(res, 500, { error: 'Hitilafu ya seva' }); }
}).listen(PORT, () => console.log(`Zuri Gateway iko hewani kwenye port ${PORT} • AI: ${providers.map(p => p.id).join(', ') || 'hakuna'} • DB: ${useDB() ? 'Supabase' : 'kumbukumbu (majaribio)'}`));
