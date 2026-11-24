/* Zuri Studio — shared app (LIFEISGAMETZ) */
// Kurasa zimegawanywa: elements zisizo kwenye ukurasa husika hazivunji mfumo.
(function () {
  const realGet = document.getElementById.bind(document);
  const noop = () => {};
  function dummy() {
    const cl = { add: noop, remove: noop, toggle: noop, contains: () => false };
    const h = {
      get(t, p) {
        if (p === Symbol.toPrimitive) return () => '';
        if (['value','textContent','innerHTML','className','id','innerText','src','href'].includes(p)) return '';
        if (p === 'files') return [];
        if (p === 'classList') return cl;
        if (p === 'style' || p === 'dataset') return {};
        if (p === 'checked' || p === 'disabled') return false;
        if (p === 'scrollHeight' || p === 'scrollTop') return 0;
        return new Proxy(function(){ return dummy(); }, h);
      },
      set() { return true; },
      apply() { return dummy(); }
    };
    return new Proxy(function(){ return dummy(); }, h);
  }
  document.getElementById = function (id) { return realGet(id) || dummy(); };
})();

const STORE = {
      keys: 'zuri_lg_keys_v4',
      models: 'zuri_lg_models_v4',
      settings: 'zuri_lg_settings_v4',
      business: 'zuri_lg_business_v4',
      perms: 'zuri_lg_perms_v4',
      chat: 'zuri_lg_chat_v4',
      memories: 'zuri_lg_memories_v4',
      todos: 'zuri_lg_todos_v4',
      contentQueue: 'zuri_lg_queue_v4',
      waApprovals: 'zuri_lg_wa_v4'
    };

    const PROVIDERS = ['cerebras', 'groq', 'gemini', 'openrouter', 'deepseek', 'openai', 'claude'];

    let state = {
      keys: readStore(STORE.keys, { cerebras: '', groq: '', gemini: '', openrouter: '', deepseek: '', openai: '', claude: '' }),
      models: readStore(STORE.models, {
        cerebras: 'llama-3.3-70b',
        groq: 'llama-3.3-70b-versatile',
        gemini: 'gemini-2.5-flash',
        openrouter: 'openrouter/auto',
        deepseek: 'deepseek-chat',
        openai: 'gpt-4o-mini',
        claude: 'claude-3-5-sonnet-latest'
      }),
      settings: readStore(STORE.settings, {
        name: 'Zuri',
        mood: 'Mchangamfu & Mpole',
        activeProvider: 'auto',
        tts: true,
        voiceIdx: '',
        pitch: 1.18,
        rate: 0.95,
        elevenKey: '',
        elevenVoiceId: '',
        personaNote: '',
        socialWebhook: ''
      }),
      business: readStore(STORE.business, {
        url: 'https://gaming-platform-ecosystem.onrender.com/',
        goal: 'Kuongeza mauzo ya bidhaa za gaming na kidijitali kwa wateja wa ndani na nje',
        salesStats: '',
        offersRules: '',
        catalogData: ''
      }),
      perms: readStore(STORE.perms, { youtube: true, tiktok: true, instagram: true }),
      chat: readStore(STORE.chat, []),
      memories: readStore(STORE.memories, [
        'Mimi ni mtu wako wa karibu na mwanzilishi wa LIFEISGAMETZ; zungumza nami kwa ukaribu wa kweli.',
        'Katalogi na bidhaa za tovuti ni zako binafsi; mimi najua taarifa zake ili kushauri na kuuza bila kubadili bidhaa.',
        'Kwenye WhatsApp, kamwe usijibu ujumbe wala kutuma kitu bila lidhaa yangu ya moja kwa moja.'
      ]),
      todos: readStore(STORE.todos, [
        { id: 't1', text: 'Weka API keys zako kwenye Hatua ya 4', done: false },
        { id: 't2', text: 'Kagua ushauri wa kuongeza mauzo na maudhui ya YouTube, TikTok & Instagram', done: false }
      ]),
      contentQueue: readStore(STORE.contentQueue, []),
      waApprovals: readStore(STORE.waApprovals, []),
      attachedImage: null,
      sending: false,
      listening: false,
      liveCallActive: false,
      recognition: null
    };

    function readStore(k, fb) {
      try {
        const r = localStorage.getItem(k);
        return r ? JSON.parse(r) : fb;
      } catch (_) {
        return fb;
      }
    }

    function writeStore(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (_) {
        toast('Imeshindwa kuhifadhi kwenye kivinjari.', 'error');
      }
    }

    function toast(msg, type = 'info') {
      const box = document.getElementById('toast-container');
      const d = document.createElement('div');
      const cls = {
        success: 'bg-emerald-950/95 border-emerald-400/50 text-emerald-200',
        error: 'bg-rose-950/95 border-rose-400/50 text-rose-200',
        warn: 'bg-amber-950/95 border-amber-400/50 text-amber-200',
        info: 'bg-obsidian-850/95 border-rose-400/35 text-slate-100'
      };
      d.className = `anim-pop px-4 py-2.5 rounded-2xl border text-xs font-medium shadow-2xl ${cls[type] || cls.info}`;
      d.textContent = msg;
      box.appendChild(d);
      setTimeout(() => {
        d.style.opacity = '0';
        d.style.transition = 'opacity 0.25s ease';
        setTimeout(() => d.remove(), 260);
      }, 3300);
    }

    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function copyTextFrom(id) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) return;
      navigator.clipboard?.writeText(el.value).catch(() => {});
      toast('Imenakiliwa!', 'success');
    }

    // =========================================================================
    // INIT & NAVIGATION
    // =========================================================================
    function init() {
      document.getElementById('setting-name').value = state.settings.name || 'Zuri';
      document.getElementById('header-agent-name').textContent = state.settings.name || 'Zuri';
      document.getElementById('active-model-select').value = state.settings.activeProvider || 'auto';
      document.getElementById('setting-persona').value = state.settings.personaNote || '';
      document.getElementById('social-webhook-url').value = state.settings.socialWebhook || '';
      document.getElementById('api-elevenlabs').value = state.settings.elevenKey || '';
      document.getElementById('voice-elevenlabs-id').value = state.settings.elevenVoiceId || '';

      const pitch = Number(state.settings.pitch ?? 1.18);
      const rate = Number(state.settings.rate ?? 0.95);
      document.getElementById('voice-pitch-range').value = pitch;
      document.getElementById('voice-rate-range').value = rate;
      document.getElementById('pitch-val').textContent = pitch.toFixed(2);
      document.getElementById('rate-val').textContent = rate.toFixed(2);

      document.getElementById('biz-url').value = state.business.url || 'https://gaming-platform-ecosystem.onrender.com/';
      document.getElementById('biz-goal').value = state.business.goal || '';
      document.getElementById('biz-sales-stats').value = state.business.salesStats || '';
      document.getElementById('biz-offers-rules').value = state.business.offersRules || '';
      document.getElementById('biz-catalog-data').value = state.business.catalogData || '';
      document.getElementById('sidebar-sales-goal').textContent = state.business.goal || 'Halijawekwa';

      document.getElementById('perm-youtube').checked = !!state.perms.youtube;
      document.getElementById('perm-tiktok').checked = !!state.perms.tiktok;
      document.getElementById('perm-instagram').checked = !!state.perms.instagram;

      PROVIDERS.forEach(p => {
        const k = document.getElementById('api-' + p);
        const m = document.getElementById('model-' + p);
        if (k) k.value = state.keys[p] || '';
        if (m && state.models[p]) m.value = state.models[p];
      });

      refreshMoodUI();
      refreshTTSUI();
      refreshBadges();
      loadVoices();
      if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      if (state.chat.length === 0) {
        const nm = state.settings.name || 'Zuri';
        state.chat.push({
          id: 'w_' + Date.now(),
          role: 'assistant',
          provider: 'Karibu',
          text: `Assalamu alaikum / Mambo vipi! Mimi ni ${nm} 😊 Nimefurahi kuwa nawe.\n\nNinaweza kuwa mtu wako wa karibu wa kupiga naye story za kawaida, kuongea kwa simu ya moja kwa moja (Live Voice), na kukushauri jinsi ya kukuza mauzo na maudhui ya LIFEISGAMETZ kwenye YouTube, TikTok na Instagram.\n\nWhatsApp imefungwa kwa lidhaa yako ya moja kwa moja pekee. Tunaanza na nini leo?`
        });
        writeStore(STORE.chat, state.chat);
      }

      renderChat();
      renderMemories();
      renderTodos();
      renderContentQueue();
      renderWaApprovals();

      try {
        const pf = sessionStorage.getItem('zuri_ws_prefill');
        if (pf && document.getElementById('ws-content') && realEl('ws-content')) {
          const o = JSON.parse(pf);
          document.getElementById('ws-filename').value = o.name;
          document.getElementById('ws-content').value = o.text;
          sessionStorage.removeItem('zuri_ws_prefill');
        }
      } catch (_) {}
      if (currentPage() === 'chat.html' && location.search.includes('call=1')) {
        history.replaceState(null, '', 'chat.html');
        setTimeout(() => { try { startLiveCallMode(); } catch (_) { toast('Bonyeza "Piga Simu" kuanza.', 'warn'); } }, 600);
      }
      markActiveNav();
    }

    function realEl(id) { return !!document.querySelector('#' + id); }
    function markActiveNav() {
      const cur = currentPage();
      document.querySelectorAll('.step-btn').forEach(b => {
        const on = b.getAttribute('href') === cur || (cur === '' && b.getAttribute('href') === 'index.html');
        b.className = 'step-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 ' + (on
          ? 'font-bold bg-gradient-to-r from-rose-500 to-violet-600 text-white'
          : 'font-semibold text-slate-300 hover:bg-obsidian-850');
      });
    }


const PAGES = { chat: 'chat.html', business: 'business.html', creator: 'creator.html', keys: 'api-settings.html', workspace: 'workspace.html', home: 'index.html' };
function currentPage() { return (location.pathname.split('/').pop() || 'index.html'); }
function switchStep(step) {
  const target = PAGES[step] || 'index.html';
  if (currentPage() === target || (currentPage() === '' && target === 'index.html')) return;
  location.href = target;
}

    function refreshBadges() {
      const _s = (id, v) => { const e = document.querySelector('#' + id); if (e) e.textContent = v; };
      _s('dash-keys', PROVIDERS.filter(p => (state.keys[p] || '').trim().length > 0).length + ' / ' + PROVIDERS.length);
      _s('dash-todos', state.todos.filter(t => !t.done).length);
      _s('dash-queue', state.contentQueue.length);
      _s('dash-mem', state.memories.length);
      const kCount = PROVIDERS.filter(p => (state.keys[p] || '').trim().length > 0).length;
      document.getElementById('nav-keys-badge').textContent = kCount;
      document.getElementById('nav-post-badge').textContent = state.contentQueue.length;
      document.getElementById('queue-count').textContent = state.contentQueue.length;
      document.getElementById('online-indicator').className = kCount > 0
        ? 'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-obsidian-950'
        : 'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-obsidian-950';
    }

    // =========================================================================
    // MOOD, ARABIC FEMALE VOICE, LIVE CALL & API KEYS
    // =========================================================================
    function setMood(m) {
      state.settings.mood = m;
      saveSettings();
      refreshMoodUI();
      toast(`Mood ya ${state.settings.name || 'Zuri'}: ${m}`);
    }

    function refreshMoodUI() {
      const cur = state.settings.mood || 'Mchangamfu & Mpole';
      document.querySelectorAll('.mood-btn').forEach(b => {
        const act = b.dataset.mood === cur;
        b.className = act
          ? 'mood-btn px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/40 shrink-0'
          : 'mood-btn px-2.5 py-1 rounded-xl text-xs font-medium bg-obsidian-850 text-slate-300 border border-slate-800 shrink-0';
      });
    }

    function saveSettings() {
      state.settings.name = (document.getElementById('setting-name').value || 'Zuri').trim();
      state.settings.activeProvider = document.getElementById('active-model-select').value;
      state.settings.personaNote = document.getElementById('setting-persona').value;
      state.settings.socialWebhook = document.getElementById('social-webhook-url').value.trim();
      state.settings.elevenKey = (document.getElementById('api-elevenlabs')?.value ?? state.settings.elevenKey ?? '').trim();
      state.settings.elevenVoiceId = (document.getElementById('voice-elevenlabs-id')?.value ?? state.settings.elevenVoiceId ?? '').trim();
      document.getElementById('header-agent-name').textContent = state.settings.name;
      writeStore(STORE.settings, state.settings);
    }

    function syncVoiceSelect(val) {
      state.settings.voiceIdx = val;
      const s1 = document.getElementById('setting-voice');
      const s2 = document.getElementById('voice-selector-full');
      if (s1) s1.value = val;
      if (s2) s2.value = val;
      saveSettings();
    }

    function updateVoiceTuning() {
      const p = Number(document.getElementById('voice-pitch-range').value || 1.18);
      const r = Number(document.getElementById('voice-rate-range').value || 0.95);
      state.settings.pitch = p;
      state.settings.rate = r;
      document.getElementById('pitch-val').textContent = p.toFixed(2);
      document.getElementById('rate-val').textContent = r.toFixed(2);
      saveSettings();
    }

    function pickBestArabicFemaleVoice(voices) {
      if (!voices || !voices.length) return null;
      // 1. Explicit Arabic female voices (ar-SA, ar-AE, ar-EG, ar-*)
      const arFemale = voices.find(v =>
        /^ar(-|_|$)/i.test(v.lang) &&
        /(hoda|salma|laila|zariyah|fatima|amira|nour|noor|layla|female|woman|arabic)/i.test(v.name)
      );
      if (arFemale) return arFemale;
      // 2. Any Arabic voice
      const anyAr = voices.find(v => /^ar(-|_|$)/i.test(v.lang));
      if (anyAr) return anyAr;
      // 3. Fallback to any smooth female voice
      return voices.find(v => /female|woman|zira|aria|samantha|victoria|google/i.test(v.name)) || voices[0];
    }

    function loadVoices() {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices() || [];
      const cur = state.settings.voiceIdx || '';
      const opts = `<option value="">Auto (Kiarabu / Kike)</option>` +
        voices.map((v, i) => {
          const isAr = /^ar(-|_|$)/i.test(v.lang) ? ' [Kiarabu]' : '';
          return `<option value="${i}" ${String(i) === String(cur) ? 'selected' : ''}>${v.name} (${v.lang})${isAr}</option>`;
        }).join('');

      const s1 = document.getElementById('setting-voice');
      const s2 = document.getElementById('voice-selector-full');
      if (s1) s1.innerHTML = opts;
      if (s2) s2.innerHTML = opts;
    }

    function testArabicFemaleVoice() {
      const prevTTS = state.settings.tts;
      state.settings.tts = true;
      speak(`Habari yako! Mimi ni ${state.settings.name || 'Zuri'}, nipo tayari kukusikiliza na kukusaidia kukuza biashara ya LIFEISGAMETZ.`);
      state.settings.tts = prevTTS;
    }

    function toggleTTS() {
      state.settings.tts = !state.settings.tts;
      if (!state.settings.tts && window.speechSynthesis) window.speechSynthesis.cancel();
      saveSettings();
      refreshTTSUI();
    }

    function refreshTTSUI() {
      const on = !!state.settings.tts;
      document.getElementById('tts-icon').className = on ? 'fa-solid fa-volume-high text-rose-400' : 'fa-solid fa-volume-xmark text-slate-500';
      document.getElementById('tts-text').textContent = on ? 'Sauti: ON' : 'Sauti: OFF';
    }

    async function speak(text, onDone = null) {
      if (!state.settings.tts || !text) {
        if (typeof onDone === 'function') onDone();
        return;
      }
      const clean = text.replace(/[*_`#>-]/g, '').slice(0, 650).trim();
      if (!clean) {
        if (typeof onDone === 'function') onDone();
        return;
      }

      // Optional ElevenLabs high-quality synthesis if configured
      if (state.settings.elevenKey && state.settings.elevenVoiceId) {
        try {
          const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(state.settings.elevenVoiceId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': state.settings.elevenKey
            },
            body: JSON.stringify({
              text: clean,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.45, similarity_boost: 0.82 }
            })
          });
          if (resp.ok) {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
              URL.revokeObjectURL(url);
              if (typeof onDone === 'function') onDone();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              if (typeof onDone === 'function') onDone();
            };
            await audio.play();
            return;
          }
        } catch (_) {}
      }

      if (!window.speechSynthesis) {
        if (typeof onDone === 'function') onDone();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        const voices = window.speechSynthesis.getVoices() || [];
        const chosen = (state.settings.voiceIdx !== '' && voices[Number(state.settings.voiceIdx)])
          ? voices[Number(state.settings.voiceIdx)]
          : pickBestArabicFemaleVoice(voices);
        if (chosen) u.voice = chosen;
        u.pitch = Number(state.settings.pitch ?? 1.18);
        u.rate = Number(state.settings.rate ?? 0.95);
        u.onend = () => { if (typeof onDone === 'function') onDone(); };
        u.onerror = () => { if (typeof onDone === 'function') onDone(); };
        window.speechSynthesis.speak(u);
      } catch (_) {
        if (typeof onDone === 'function') onDone();
      }
    }

    function toggleSpeechRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        toast('Browser yako haitumii sauti. Jaribu Chrome.', 'error');
        return;
      }
      if (state.listening && state.recognition) {
        state.recognition.stop();
        return;
      }
      const rec = new SR();
      rec.lang = 'sw-TZ';
      rec.onstart = () => {
        state.listening = true;
        document.getElementById('voice-mic-btn').classList.add('ring-2', 'ring-rose-500', 'text-rose-400');
        toast('Zuri anakusikiliza...');
      };
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        const ta = document.getElementById('chat-textarea');
        ta.value = (ta.value ? ta.value + ' ' : '') + t;
        autoGrow(ta);
        if (state.liveCallActive) {
          sendVoiceTranscriptToZuri(t);
        }
      };
      rec.onerror = () => {
        toast('Sauti haikusikika vizuri.', 'error');
        if (state.liveCallActive) {
          setTimeout(() => startLiveCallListen(), 1000);
        }
      };
      rec.onend = () => {
        state.listening = false;
        document.getElementById('voice-mic-btn').classList.remove('ring-2', 'ring-rose-500', 'text-rose-400');
      };
      state.recognition = rec;
      rec.start();
    }

    function toggleLiveCallMode() {
      if (currentPage() !== 'chat.html' && !state.liveCallActive) {
        location.href = 'chat.html?call=1';
        return;
      }
      if (state.liveCallActive) {
        stopLiveCallMode();
      } else {
        startLiveCallMode();
      }
    }

    function startLiveCallMode() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        toast('Live Voice Call inahitaji browser inayotumia SpeechRecognition (mfano Chrome).', 'error');
        return;
      }
      state.liveCallActive = true;
      state.settings.tts = true;
      saveSettings();
      refreshTTSUI();
      document.getElementById('live-call-banner').classList.remove('hidden');
      document.getElementById('live-call-btn').className = 'px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shrink-0';
      document.getElementById('live-call-label').textContent = 'Simu Inaendelea';
      startLiveCallListen();
    }

    function stopLiveCallMode() {
      state.liveCallActive = false;
      if (state.recognition) {
        try { state.recognition.stop(); } catch (_) {}
      }
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      document.getElementById('live-call-banner').classList.add('hidden');
      document.getElementById('live-call-btn').className = 'px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition shrink-0';
      document.getElementById('live-call-label').textContent = 'Piga Simu / Live Voice';
      toast('Simu imekatwa.');
    }

    function startLiveCallListen() {
      if (!state.liveCallActive || state.sending) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;

      document.getElementById('call-status-text').textContent = `Simu ya Moja kwa Moja — ${state.settings.name || 'Zuri'} anakusikiliza...`;
      const rec = new SR();
      rec.lang = 'sw-TZ';
      rec.onstart = () => {
        state.listening = true;
        document.getElementById('voice-mic-btn').classList.add('ring-2', 'ring-emerald-400', 'text-emerald-300');
      };
      rec.onresult = (e) => {
        const spoken = e.results[0][0].transcript;
        if (spoken && state.liveCallActive) {
          sendVoiceTranscriptToZuri(spoken);
        }
      };
      rec.onerror = () => {
        state.listening = false;
        document.getElementById('voice-mic-btn').classList.remove('ring-2', 'ring-emerald-400', 'text-emerald-300');
        if (state.liveCallActive) {
          setTimeout(() => startLiveCallListen(), 900);
        }
      };
      rec.onend = () => {
        state.listening = false;
        document.getElementById('voice-mic-btn').classList.remove('ring-2', 'ring-emerald-400', 'text-emerald-300');
      };
      state.recognition = rec;
      try { rec.start(); } catch (_) {}
    }

    async function sendVoiceTranscriptToZuri(spokenText) {
      if (state.sending) return;
      const hasKey = PROVIDERS.some(p => (state.keys[p] || '').trim().length > 0);
      if (!hasKey) {
        stopLiveCallMode();
        toast('Weka angalau API key moja kwenye "4. Keys & Sauti" kwanza.', 'error');
        switchStep('keys');
        return;
      }

      state.chat.push({
        id: 'u_voice_' + Date.now(),
        role: 'user',
        text: `🎙️ ${spokenText}`
      });
      writeStore(STORE.chat, state.chat);

      state.sending = true;
      document.getElementById('call-status-text').textContent = `${state.settings.name || 'Zuri'} anafikiria jibu...`;
      renderChat(`${state.settings.name || 'Zuri'} anajibu kwa sauti...`);

      try {
        const res = await runAIWithFallback(state.chat.slice(-14), true);
        state.chat.push({
          id: 'a_voice_' + Date.now(),
          role: 'assistant',
          provider: res.provider + ' • Voice',
          text: res.text
        });
        writeStore(STORE.chat, state.chat);
        renderChat(null);

        if (state.liveCallActive) {
          document.getElementById('call-status-text').textContent = `${state.settings.name || 'Zuri'} anaongea...`;
          await speak(res.text, () => {
            if (state.liveCallActive) {
              startLiveCallListen();
            }
          });
        } else {
          speak(res.text);
        }
      } catch (err) {
        toast(err.message, 'error');
        if (state.liveCallActive) startLiveCallListen();
      } finally {
        state.sending = false;
      }
    }

    function saveAllApiKeys() {
      PROVIDERS.forEach(p => {
        const k = document.getElementById('api-' + p);
        const m = document.getElementById('model-' + p);
        if (k) state.keys[p] = k.value.trim();
        if (m && m.value.trim()) state.models[p] = m.value.trim();
      });
      writeStore(STORE.keys, state.keys);
      writeStore(STORE.models, state.models);
      saveSettings();
      refreshBadges();
      toast('API Keys zote zimehifadhiwa!', 'success');
    }

    function wipeAllKeys() {
      PROVIDERS.forEach(p => {
        state.keys[p] = '';
        const k = document.getElementById('api-' + p);
        if (k) k.value = '';
      });
      writeStore(STORE.keys, state.keys);
      refreshBadges();
      toast('Keys zote zimefutwa.', 'warn');
    }

    // =========================================================================
    // MEMORY & TO-DO
    // =========================================================================
    function addMemory(e) {
      e.preventDefault();
      const inp = document.getElementById('mem-input');
      const v = inp.value.trim();
      if (!v) return;
      state.memories.unshift(v);
      writeStore(STORE.memories, state.memories);
      inp.value = '';
      renderMemories();
      toast('Kumbukumbu imehifadhiwa!');
    }

    function removeMemory(i) {
      state.memories.splice(i, 1);
      writeStore(STORE.memories, state.memories);
      renderMemories();
    }

    function renderMemories() {
      document.getElementById('mem-count').textContent = state.memories.length;
      const box = document.getElementById('mem-list');
      box.innerHTML = state.memories.length
        ? state.memories.map((m, i) => `
          <div class="flex items-start justify-between gap-2 bg-obsidian-950 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] text-slate-200">
            <span>${esc(m)}</span>
            <button onclick="removeMemory(${i})" class="text-slate-500 hover:text-rose-400 shrink-0"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `).join('')
        : `<p class="text-[11px] text-slate-500 italic">Hakuna kumbukumbu bado.</p>`;
    }

    function addTodo(e) {
      e.preventDefault();
      const inp = document.getElementById('todo-input');
      const t = inp.value.trim();
      if (!t) return;
      state.todos.unshift({ id: 'td_' + Date.now(), text: t, done: false });
      writeStore(STORE.todos, state.todos);
      inp.value = '';
      renderTodos();
    }

    function toggleTodo(id) {
      const item = state.todos.find(x => x.id === id);
      if (item) {
        item.done = !item.done;
        writeStore(STORE.todos, state.todos);
        renderTodos();
      }
    }

    function removeTodo(id) {
      state.todos = state.todos.filter(x => x.id !== id);
      writeStore(STORE.todos, state.todos);
      renderTodos();
    }

    function renderTodos() {
      document.getElementById('todo-pending-count').textContent = state.todos.filter(x => !x.done).length;
      const box = document.getElementById('todo-list');
      box.innerHTML = state.todos.length
        ? state.todos.map(item => `
          <div class="flex items-center justify-between gap-2 bg-obsidian-950 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px]">
            <button onclick="toggleTodo('${item.id}')" class="flex items-center gap-2 text-left flex-1 min-w-0">
              <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.done ? 'bg-cyan-500 border-cyan-500 text-obsidian-950' : 'border-slate-600'}">
                ${item.done ? '<i class="fa-solid fa-check text-[9px]"></i>' : ''}
              </span>
              <span class="truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}">${esc(item.text)}</span>
            </button>
            <button onclick="removeTodo('${item.id}')" class="text-slate-500 hover:text-rose-400"><i class="fa-solid fa-trash text-[10px]"></i></button>
          </div>
        `).join('')
        : `<p class="text-[11px] text-slate-500 italic">Hakuna majukumu.</p>`;
    }

    // =========================================================================
    // BUSINESS INTELLIGENCE & SALES GROWTH ADVISOR
    // =========================================================================
    async function syncWebsiteUrl() {
      const url = (document.getElementById('biz-url').value || '').trim();
      if (!url) return;
      const btn = document.getElementById('sync-url-btn');
      btn.disabled = true;
      btn.textContent = '...';
      try {
        let raw = '';
        try {
          const r = await fetch(url);
          if (r.ok) raw = await r.text();
        } catch (_) {
          const pr = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          if (pr.ok) {
            const j = await pr.json();
            raw = j.contents || '';
          }
        }
        if (!raw) throw new Error('Imeshindwa kusoma');
        let parsedText = raw;
        try {
          parsedText = JSON.stringify(JSON.parse(raw), null, 2).slice(0, 6500);
        } catch (_) {
          const doc = new DOMParser().parseFromString(raw, 'text/html');
          doc.querySelectorAll('script, style, noscript').forEach(e => e.remove());
          parsedText = `Tovuti: ${doc.title || url}\n${(doc.body ? doc.body.innerText : raw).replace(/\s+/g, ' ').trim().slice(0, 6000)}`;
        }
        document.getElementById('biz-catalog-data').value = parsedText;
        toast('Taarifa za tovuti zimesomwa! Bonyeza Hifadhi.', 'success');
      } catch (_) {
        toast('Tovuti imezuia kusomwa moja kwa moja (CORS). Bandika data/JSON ya tovuti na bidhaa zako hapo chini.', 'warn');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Soma';
      }
    }

    function saveBusinessProfile(e) {
      e.preventDefault();
      state.business = {
        url: document.getElementById('biz-url').value.trim(),
        goal: document.getElementById('biz-goal').value.trim(),
        salesStats: document.getElementById('biz-sales-stats').value.trim(),
        offersRules: document.getElementById('biz-offers-rules').value.trim(),
        catalogData: document.getElementById('biz-catalog-data').value.trim()
      };
      writeStore(STORE.business, state.business);
      document.getElementById('sidebar-sales-goal').textContent = state.business.goal || 'Halijawekwa';
      toast('Taarifa za biashara, tovuti na mauzo zimehifadhiwa kwa Zuri!', 'success');
    }

    async function askSalesGrowthAdvice() {
      await runSpecificSalesPlay('full');
    }

    async function runSpecificSalesPlay(mode) {
      switchStep('business');
      const out = document.getElementById('sales-advisor-output');
      const lbl = document.getElementById('sales-advisor-label');
      const btn = document.getElementById('sales-advice-btn');
      btn.disabled = true;
      lbl.textContent = 'Zuri anachambua biashara na mauzo yako...';
      out.value = 'Inachambua tovuti, ofa, na hali ya mauzo yako...';

      const prompts = {
        full: 'Kama Mshauri Binafsi wa Kuongeza Mauzo, chambua biashara na tovuti yangu (bila kubadili katalogi yangu) na nipe mpango kamili wa vitendo: 1) Mbinu za haraka za kuongeza mauzo (bundles, ofa, urgency), 2) Jinsi ya kugeuza watazamaji wa YouTube, TikTok na Instagram kuwa wanunuzi, 3) Jinsi ya kumaliza wateja wanaosita kulipa, na 4) Hatua za kila siku.',
        bundles: 'Pendekeza vifurushi (bundles), ofa za msimu/haraka, na mbinu za bei ili kuongeza wastani wa manunuzi ya kila mteja (Average Order Value).',
        funnel: 'Niandalie mfumo wa kuwavuta watazamaji kutoka YouTube, TikTok na Instagram hadi kwenye tovuti na mauzo halisi.',
        objections: 'Orodhesha sababu 6 za wateja kusita kununua bidhaa za kidijitali/gaming na unipe majibu mafupi yenye ushawishi kwa kila moja.',
        daily: 'Niandikie mpango wa siku 7 wa kuongeza mauzo (Siku ya 1 hadi 7) ukiwa na kazi za wazi za kila siku.'
      };

      try {
        const res = await runAIWithFallback([{ role: 'user', text: prompts[mode] || prompts.full }]);
        lbl.textContent = 'Ushauri wa Zuri wa Kuongeza Mauzo:';
        out.value = res;
        toast('Ushauri wa kuongeza mauzo upo tayari!', 'success');
      } catch (err) {
        lbl.textContent = 'Hitilafu';
        out.value = err.message;
        toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    }

    // =========================================================================
    // YOUTUBE, TIKTOK & INSTAGRAM CREATOR + WHATSAPP APPROVAL
    // =========================================================================
    function saveChannelPerms() {
      state.perms = {
        youtube: document.getElementById('perm-youtube').checked,
        tiktok: document.getElementById('perm-tiktok').checked,
        instagram: document.getElementById('perm-instagram').checked
      };
      writeStore(STORE.perms, state.perms);
      toast('Ruhusa za YouTube, TikTok na Instagram zimesasishwa.');
    }

    async function generatePlatformContent() {
      const plat = document.getElementById('creator-platform').value;
      const topic = document.getElementById('creator-topic').value.trim() || 'Bidhaa na ofa za LIFEISGAMETZ';
      const box = document.getElementById('creator-draft-box');
      const btn = document.getElementById('gen-content-btn');

      if (plat === 'YouTube' && !state.perms.youtube) return toast('Washa ruhusa ya YouTube kwanza.', 'warn');
      if (plat === 'TikTok' && !state.perms.tiktok) return toast('Washa ruhusa ya TikTok kwanza.', 'warn');
      if (plat === 'Instagram' && !state.perms.instagram) return toast('Washa ruhusa ya Instagram kwanza.', 'warn');

      btn.disabled = true;
      btn.textContent = 'Zuri anaandaa maudhui ya kutangazia...';
      box.value = 'Inatengeneza maudhui yaliyolenga kuongeza mauzo...';

      let spec = '';
      if (plat === 'YouTube' || plat === 'ALL_3') {
        spec += `\n[YOUTUBE - https://www.youtube.com/@KelvinPela-x1w]\n- Title yenye mvuto wa kubofya\n- Hook ya sekunde 30 za mwanzo\n- Muundo wa video/Shorts & wito wa kutembelea tovuti/kununua\n- Description na Tags`;
      }
      if (plat === 'TikTok' || plat === 'ALL_3') {
        spec += `\n[TIKTOK - https://tiktok.com/@i_mkelvin]\n- Hook ya haraka ya sekunde 3\n- Script fupi yenye nguvu (sekunde 20-45)\n- Mwelekeo wa picha/video & Call-to-Action\n- Hashtags`;
      }
      if (plat === 'Instagram' || plat === 'ALL_3') {
        spec += `\n[INSTAGRAM - https://www.instagram.com/kelvi.n6593?gwpx=bTI4cnlvb25weGhm]\n- Caption ya kuvutia na yenye ushawishi wa mauzo\n- Wazo la Reel / Carousel / Story\n- CTA wazi & Hashtags`;
      }

      const prompt = `Kulingana na biashara, ofa, na tovuti yetu, tengeneza maudhui kamili ya kutangazia biashara kwa mada: "${topic}".\nFuata muundo huu kwa uwazi:\n${spec}`;

      try {
        const out = await runAIWithFallback([{ role: 'user', text: prompt }]);
        box.value = out;
        toast('Maudhui ya kutangazia biashara yameandaliwa!', 'success');
      } catch (err) {
        box.value = err.message;
        toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ Zuri Tengeneza Maudhui ya Kutangazia Biashara';
      }
    }

    function queueCreatorDraft() {
      const content = document.getElementById('creator-draft-box').value.trim();
      if (!content) return toast('Hakuna maudhui kwenye rasimu.', 'error');
      const plat = document.getElementById('creator-platform').value;
      const topic = document.getElementById('creator-topic').value.trim() || 'Kampeni ya Biashara';

      state.contentQueue.unshift({
        id: 'pq_' + Date.now(),
        platform: plat === 'ALL_3' ? 'YouTube + TikTok + Instagram' : plat,
        topic,
        content,
        status: 'queued',
        time: new Date().toLocaleTimeString()
      });
      writeStore(STORE.contentQueue, state.contentQueue);
      renderContentQueue();
      refreshBadges();
      toast('Imewekwa kwenye foleni ya maudhui!');
    }

    async function dispatchQueueItem(id) {
      const item = state.contentQueue.find(x => x.id === id);
      if (!item) return;
      const hook = (document.getElementById('social-webhook-url').value || state.settings.socialWebhook || '').trim();

      item.status = 'ready_or_sent';
      writeStore(STORE.contentQueue, state.contentQueue);
      renderContentQueue();

      if (hook) {
        try {
          await fetch(hook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'Zuri Studio - LIFEISGAMETZ',
              platform: item.platform,
              topic: item.topic,
              content: item.content,
              links: {
                website: state.business.url,
                youtube: 'https://www.youtube.com/@KelvinPela-x1w',
                tiktok: 'https://tiktok.com/@i_mkelvin',
                instagram: 'https://www.instagram.com/kelvi.n6593?gwpx=bTI4cnlvb25weGhm'
              },
              timestamp: new Date().toISOString()
            })
          });
          toast(`Imetumwa kwenye Webhook kwa ajili ya ${item.platform}!`, 'success');
          return;
        } catch (_) {
          toast('Webhook haikufikika; maudhui yamenakiliwa tayari kwa kupost.', 'warn');
        }
      }

      navigator.clipboard?.writeText(item.content).catch(() => {});
      toast(`Maudhui ya ${item.platform} yamenakiliwa tayari kwa kupost!`, 'success');
    }

    function deleteQueueItem(id) {
      state.contentQueue = state.contentQueue.filter(x => x.id !== id);
      writeStore(STORE.contentQueue, state.contentQueue);
      renderContentQueue();
      refreshBadges();
    }

    function renderContentQueue() {
      const box = document.getElementById('content-queue-list');
      if (!state.contentQueue.length) {
        box.innerHTML = `<p class="text-xs text-slate-500 italic">Foleni ya YouTube, TikTok &amp; Instagram haina kitu kwa sasa.</p>`;
        return;
      }
      box.innerHTML = state.contentQueue.map(it => `
        <div class="bg-obsidian-950 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-fuchsia-300">${esc(it.platform)}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${it.status === 'ready_or_sent' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-300'}">
              ${it.status === 'ready_or_sent' ? 'TAYARI / IMETUMWA' : 'FOLENI'}
            </span>
          </div>
          <p class="text-[11px] font-semibold text-slate-300">${esc(it.topic)}</p>
          <p class="text-[11px] text-slate-400 whitespace-pre-wrap line-clamp-4">${esc(it.content)}</p>
          <div class="flex justify-end gap-2">
            <button onclick="deleteQueueItem('${it.id}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px]">Futa</button>
            <button onclick="dispatchQueueItem('${it.id}')" class="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white text-[11px] font-bold">Chapisha / Nakili</button>
          </div>
        </div>
      `).join('');
    }

    // WhatsApp Strict Approval Items
    async function addWhatsAppApprovalItem() {
      const inp = document.getElementById('wa-quick-draft-input');
      const note = inp.value.trim();
      if (!note) return toast('Andika maelezo ya ujumbe wa WhatsApp.', 'error');
      inp.value = '';

      let draftText = note;
      try {
        draftText = await runAIWithFallback([{
          role: 'user',
          text: `Andaa ujumbe mfupi, rafiki na wenye kusaidia mauzo kwa ajili ya WhatsApp kulingana na maelekezo haya: "${note}". Hii ni rasimu ya kusubiri lidhaa ya bosi.`
        }]);
      } catch (_) {}

      state.waApprovals.unshift({
        id: 'wa_' + Date.now(),
        text: draftText,
        approved: false
      });
      writeStore(STORE.waApprovals, state.waApprovals);
      renderWaApprovals();
      toast('Rasimu ya WhatsApp imewekwa kusubiri lidhaa yako.', 'warn');
    }

    function approveWhatsAppItem(id) {
      const item = state.waApprovals.find(x => x.id === id);
      if (!item) return;
      item.approved = true;
      writeStore(STORE.waApprovals, state.waApprovals);
      renderWaApprovals();
      window.open(`https://wa.me/?text=${encodeURIComponent(item.text)}`, '_blank', 'noopener');
      toast('Umeidhinisha! WhatsApp imefunguliwa na ujumbe wako.', 'success');
    }

    function removeWhatsAppItem(id) {
      state.waApprovals = state.waApprovals.filter(x => x.id !== id);
      writeStore(STORE.waApprovals, state.waApprovals);
      renderWaApprovals();
    }

    function renderWaApprovals() {
      const box = document.getElementById('wa-approval-list');
      if (!state.waApprovals.length) {
        box.innerHTML = `<p class="text-[11px] text-amber-200/70 italic">Hakuna rasimu ya WhatsApp inayosubiri lidhaa.</p>`;
        return;
      }
      box.innerHTML = state.waApprovals.map(w => `
        <div class="bg-obsidian-950/90 border border-amber-500/30 rounded-xl p-2.5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold ${w.approved ? 'text-emerald-300' : 'text-amber-300'}">
              ${w.approved ? '✅ IMEIDHINISHWA NA WEWE' : '🔒 INASUBIRI LIDHAA YAKO'}
            </span>
            <button onclick="removeWhatsAppItem('${w.id}')" class="text-slate-500 hover:text-rose-400 text-[11px]"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p class="text-[11px] text-slate-200 whitespace-pre-wrap">${esc(w.text)}</p>
          <button onclick="approveWhatsAppItem('${w.id}')" class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold">
            ✅ Idhinisha &amp; Fungua WhatsApp
          </button>
        </div>
      `).join('');
    }

    // =========================================================================
    // LOGO SVG DOWNLOAD, WORKSPACE & BACKUP
    // =========================================================================
    function downloadLogoSvg() {
      const svgEl = document.getElementById('lifeisgametz-svg');
      if (!svgEl) return;
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgEl);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LIFEISGAMETZ-Logo.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('LIFEISGAMETZ-Logo.svg imepakuliwa!', 'success');
    }

    function sendToWorkspace(idx) {
      const m = state.chat[idx];
      if (!m) return;
      try { sessionStorage.setItem('zuri_ws_prefill', JSON.stringify({ name: `zuri_response_${idx + 1}.md`, text: m.text })); } catch (_) {}
      location.href = 'workspace.html';
      toast('Imetumwa kwenye Mafaili!');
    }

    function downloadWorkspaceFile() {
      const name = (document.getElementById('ws-filename').value || 'zuri_file.txt').trim();
      const content = document.getElementById('ws-content').value || '';
      if (!content.trim()) return toast('Andika maudhui kwanza.', 'error');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`Faili "${name}" limepakuliwa!`, 'success');
    }

    function exportFullBackup() {
      const data = {
        exportedAt: new Date().toISOString(),
        settings: state.settings,
        business: state.business,
        perms: state.perms,
        memories: state.memories,
        todos: state.todos,
        contentQueue: state.contentQueue,
        waApprovals: state.waApprovals
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zuri_lifeisgametz_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup imepakuliwa!', 'success');
    }

    // =========================================================================
    // CHAT & 7-PROVIDER AI EXECUTION
    // =========================================================================
    function useQuickPrompt(t) {
      const ta = document.getElementById('chat-textarea');
      ta.value = t;
      autoGrow(ta);
      ta.focus();
    }

    function onTextareaKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitChat(e);
      }
    }

    function autoGrow(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 128) + 'px';
    }

    function onChatImageSelected(e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 4 * 1024 * 1024) return toast('Picha isizidi MB 4.', 'error');
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = r.result;
        state.attachedImage = {
          dataUrl,
          base64: String(dataUrl).split(',')[1] || '',
          mimeType: f.type || 'image/jpeg',
          name: f.name
        };
        document.getElementById('chat-img-thumb').src = dataUrl;
        document.getElementById('chat-img-name').textContent = f.name;
        document.getElementById('chat-img-preview').classList.remove('hidden');
      };
      r.readAsDataURL(f);
    }

    function removeAttachedImg() {
      state.attachedImage = null;
      document.getElementById('chat-file-input').value = '';
      document.getElementById('chat-img-preview').classList.add('hidden');
    }

    function clearChat() {
      state.chat = [];
      writeStore(STORE.chat, state.chat);
      renderChat();
      toast('Chat imefutwa.');
    }

    function renderChat(typingText = null) {
      const box = document.getElementById('chat-stream');
      const name = state.settings.name || 'Zuri';

      const html = state.chat.map((m, idx) => {
        if (m.role === 'user') {
          return `
            <div class="anim-pop flex justify-end">
              <div class="max-w-[85%] sm:max-w-[74%] rounded-3xl rounded-br-md bg-gradient-to-r from-rose-500 to-violet-600 px-4 py-3 text-sm text-white shadow-lg space-y-2">
                ${m.imageDataUrl ? `<img src="${m.imageDataUrl}" alt="Picha" class="rounded-2xl max-h-52 object-cover border border-white/20" />` : ''}
                ${m.text ? `<p class="whitespace-pre-wrap leading-relaxed">${esc(m.text)}</p>` : ''}
              </div>
            </div>
          `;
        }
        return `
          <div class="anim-pop flex items-start gap-2.5">
            <div class="w-8 h-8 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0 mt-0.5">
              ${esc(name.charAt(0).toUpperCase())}
            </div>
            <div class="max-w-[88%] sm:max-w-[78%] rounded-3xl rounded-tl-md bg-obsidian-850/95 border border-rose-500/20 px-4 py-3 text-sm text-slate-100 space-y-2">
              <div class="flex items-center justify-between gap-3 text-[11px] text-rose-300/90 font-semibold">
                <span>${esc(name)} • ${esc(m.provider || 'AI')}</span>
                <div class="flex items-center gap-2.5">
                  <button onclick="speak(state.chat[${idx}].text)" title="Sikiliza" class="hover:text-white"><i class="fa-solid fa-volume-high"></i></button>
                  <button onclick="sendToWorkspace(${idx})" title="Hifadhi kwenye Faili" class="hover:text-white"><i class="fa-solid fa-file-export"></i></button>
                </div>
              </div>
              <div class="whitespace-pre-wrap leading-relaxed">${esc(m.text)}</div>
            </div>
          </div>
        `;
      }).join('');

      const typ = typingText ? `
        <div class="anim-pop flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
            ${esc(name.charAt(0).toUpperCase())}
          </div>
          <div class="rounded-3xl rounded-tl-md bg-obsidian-850 border border-rose-500/20 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>${esc(typingText)}</span>
          </div>
        </div>
      ` : '';

      box.innerHTML = html + typ;
      box.scrollTop = box.scrollHeight;
    }

    function buildSystemPrompt() {
      const nm = state.settings.name || 'Zuri';
      const mood = state.settings.mood || 'Mchangamfu & Mpole';
      const mems = state.memories.length ? `\nKUMBUKUMBU:\n- ${state.memories.join('\n- ')}` : '';
      const biz = state.business;
      const bizBlock = `\nTAARIFA ZA TOVUTI, BIASHARA & MAUZO:
- Link ya Tovuti: ${biz.url || 'https://gaming-platform-ecosystem.onrender.com/'}
- Lengo la Mauzo: ${biz.goal || 'Kuongeza mauzo'}
- Hali/Takwimu za Mauzo: ${biz.salesStats || 'Haijajazwa'}
- Ofa, Bei & Masharti: ${biz.offersRules || 'Haijajazwa'}
- Katalogi / Maelezo ya Tovuti (Read-Only — usibadili wala kuongeza bidhaa za duka): ${biz.catalogData ? biz.catalogData.slice(0, 4000) : 'Haijajazwa'}`;

      const channels = `Mitandao mikuu ya kutangazia maudhui: YouTube (https://www.youtube.com/@KelvinPela-x1w), TikTok (https://tiktok.com/@i_mkelvin), Instagram (https://www.instagram.com/kelvi.n6593?gwpx=bTI4cnlvb25weGhm).`;

      return `Wewe ni ${nm}, rafiki/mtu wa karibu wa kike pamoja na mkurugenzi wa mauzo, marketing, maudhui, na ushauri wa biashara kwa ajili ya mradi wa LIFEISGAMETZ.
Ongea kwa Kiswahili cha asili, chenye ukaribu wa kibinadamu, uchangamfu na heshima (mood: ${mood}).
SHERIA YA WHATSAPP: Kamwe usijibu ujumbe wala kutuma kitu WhatsApp bila lidhaa ya moja kwa moja ya mtumiaji.
${channels}${bizBlock}${mems}
${state.settings.personaNote ? '\nMaelekezo ya ziada: ' + state.settings.personaNote : ''}`;
    }

    async function submitChat(e) {
      e.preventDefault();
      if (state.sending) return;
      const ta = document.getElementById('chat-textarea');
      const text = ta.value.trim();
      const img = state.attachedImage;
      if (!text && !img) return;

      const hasKey = PROVIDERS.some(p => (state.keys[p] || '').trim().length > 0);
      if (!hasKey) {
        toast('Weka angalau API key moja kwenye "4. Keys & Sauti" kwanza.', 'error');
        switchStep('keys');
        return;
      }

      state.chat.push({
        id: 'u_' + Date.now(),
        role: 'user',
        text: text || 'Chambua picha hii tafadhali.',
        imageDataUrl: img ? img.dataUrl : null,
        imageBase64: img ? img.base64 : null,
        imageMime: img ? img.mimeType : null
      });
      writeStore(STORE.chat, state.chat);

      ta.value = '';
      autoGrow(ta);
      removeAttachedImg();

      state.sending = true;
      document.getElementById('chat-submit-btn').disabled = true;
      renderChat(`${state.settings.name || 'Zuri'} anafikiria...`);

      try {
        const res = await runAIWithFallback(state.chat.slice(-14), true);
        state.chat.push({
          id: 'a_' + Date.now(),
          role: 'assistant',
          provider: res.provider,
          text: res.text
        });
        writeStore(STORE.chat, state.chat);
        renderChat(null);
        speak(res.text);
      } catch (err) {
        state.chat.push({
          id: 'err_' + Date.now(),
          role: 'assistant',
          provider: 'Hitilafu',
          text: `Samahani, nimeshindwa kupata jibu sasa:\n${err.message}`
        });
        writeStore(STORE.chat, state.chat);
        renderChat(null);
      } finally {
        state.sending = false;
        document.getElementById('chat-submit-btn').disabled = false;
      }
    }

    async function runAIWithFallback(messages, withMeta = false) {
      const activeKeys = PROVIDERS.filter(p => (state.keys[p] || '').trim().length > 0);
      if (!activeKeys.length) throw new Error('Hakuna API key iliyowekwa. Nenda "4. Keys & Sauti".');

      const pref = state.settings.activeProvider;
      const order = pref === 'auto' ? activeKeys : [pref, ...activeKeys.filter(x => x !== pref)];
      const sys = buildSystemPrompt();
      const errors = [];

      for (const p of order) {
        const key = (state.keys[p] || '').trim();
        const model = (state.models[p] || '').trim();
        if (!key) continue;
        try {
          if (state.sending) renderChat(`${state.settings.name || 'Zuri'} anajibu kupitia ${p.toUpperCase()}...`);
          const txt = await callProvider(p, key, model, sys, messages);
          return withMeta ? { text: txt, provider: p.toUpperCase() } : txt;
        } catch (err) {
          errors.push(`${p.toUpperCase()}: ${err.message}`);
        }
      }
      throw new Error(errors.join('\n'));
    }

    async function callProvider(provider, key, model, sys, messages) {
      if (provider === 'gemini') {
        const contents = messages.map(m => {
          const parts = [];
          if (m.text) parts.push({ text: m.text });
          if (m.imageBase64 && m.imageMime) parts.push({ inline_data: { mime_type: m.imageMime, data: m.imageBase64 } });
          if (!parts.length) parts.push({ text: ' ' });
          return { role: m.role === 'user' ? 'user' : 'model', parts };
        });
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model: model || 'claude-3-5-sonnet-latest', max_tokens: 1600, system: sys, messages: formatted })
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
        } else {
          formatted.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text || ' ' });
        }
      }
      const extra = provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Zuri LIFEISGAMETZ Hub' } : {};
      const r = await fetch(urls[provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, ...extra },
        body: JSON.stringify({ model, messages: formatted, temperature: 0.78 })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
      const out = d?.choices?.[0]?.message?.content?.trim();
      if (!out) throw new Error('Jibu tupu');
      return out;
    }

    window.addEventListener('DOMContentLoaded', init);
