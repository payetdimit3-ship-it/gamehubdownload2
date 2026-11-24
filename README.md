# Zuri Studio — App ya watumiaji wengi (LIFEISGAMETZ)

Mafaili yote yako kwenye folda moja (hakuna folder ndogo). Upload yote kwenye repository mpya ya GitHub.

## Hatua za kuweka (mara moja tu)

### 1. Supabase (database + login)
1. Fungua mradi wako wa Supabase (au unda mpya, bure).
2. SQL Editor → New query → bandika yaliyomo ya `schema.sql` → Run.
3. Project Settings → API → nakili: **Project URL** na **service_role key** (siri, usimpe mtu).

### 2. Render (server)
1. render.com → New → **Web Service** → chagua repository hii.
2. Build Command: `npm install`   |   Start Command: `node server.js`
3. Environment Variables:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_KEY` = service_role key
   - `ADMIN_EMAIL` = email yako (utakayotumia kujisajili — ndiyo itakuwa admin)
4. Deploy. Utapata link kama `https://zuri-xxxx.onrender.com`.

### 3. Jisajili kama Admin
1. Fungua link, bonyeza **Jisajili**, tumia email ileile ya `ADMIN_EMAIL`.
2. Bonyeza **Admin** kwenye menyu ya juu → weka API keys zako (Groq, Gemini, n.k.) → Hifadhi.
3. Keys zinakaa server tu. Watumiaji hawaziioni kamwe.

### 4. Kuwapa watu
Wape link tu. Wanajisajili bure, wanaweka akaunti zao za social media kwenye **Mipangilio**,
na data zao ni zao peke yao. Wewe unaweka kikomo cha ujumbe kwa siku kwa kila mtu kwenye Admin.

## Kuboresha app baadaye
- **Njia ya haraka:** Admin → "Sasisha App" → chagua faili la `.html` (mfano `chat.html`) → Pakia. Inatumika mara moja,
  keys na data za watumiaji havibadiliki. Ukikosea: "Rudisha nyuma".
- **Njia ya GitHub:** badilisha faili kwenye GitHub, Render inajisasisha yenyewe.
- Kubadilisha `server.js` kunahitaji njia ya GitHub.

## Usalama
- Usiweke keys kwenye GitHub. Zinawekwa kwenye Admin pekee.
- `service_role key` ni siri — iwe kwenye Render tu.
