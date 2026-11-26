# Zuri Gateway — seva ya AI zako (Render + Supabase)

Seva hii inaficha API keys zako, inathibitisha watumiaji, na inaweka kikomo cha ujumbe wa bure kwa kila mtumiaji kwa siku.
Haina vifurushi vya nje (Node 18+ pekee).

## 1. Supabase (dakika 5)
1. Fungua mradi mpya kwenye supabase.com.
2. **SQL Editor** → bandika yaliyomo ya `schema.sql` → Run.
3. **Authentication → Providers → Email**: hakikisha imewashwa. Ukitaka watumiaji waingie mara moja, zima "Confirm email" (lakini hiyo inaruhusu barua pepe bandia; kuiacha imewashwa ni salama zaidi).
4. **Project Settings → API**: nakili `Project URL`, `anon public key` na `service_role key`.
   - `service_role` ni siri kuu. Itaenda kwenye Render pekee, **kamwe kwenye tovuti**.

## 2. Render
1. Weka folda hii kwenye repository ya GitHub (peke yake, bila `.env`).
2. Render → New → **Web Service** → chagua repo. Runtime: Node. Build command: (acha tupu). Start command: `node server.js`.
3. **Environment**: weka vigezo vyote vya `.env.example`:
   - Angalau key moja ya AI (`GROQ_API_KEY` inapendekezwa, pia inatumika kusikia sauti).
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
   - `FREE_DAILY_LIMIT` (mfano 20) na `FREE_STT_DAILY_LIMIT` (mfano 60).
   - `ALLOWED_ORIGINS` = anwani ya tovuti yako, mfano `https://gamehubdownload2.vercel.app` (ukiwa na zaidi ya moja, tenganisha kwa koma).
4. Deploy, kisha fungua `https://JINA.onrender.com/health`. Utaona `{"ok":true,"providers":[...],"db":true}`.

## 3. Unganisha tovuti
Hariri `config.js` ya tovuti:
```js
API_BASE: 'https://JINA.onrender.com',
SUPABASE_URL: 'https://XXXX.supabase.co',
SUPABASE_ANON_KEY: '<anon key>'
```
Upload `config.js` tena. Fungua ukurasa wa **Akaunti** kujaribu kujisajili.

## Njia za seva
- `POST /api/chat` ujumbe wa AI (unahesabiwa)
- `POST /api/stt` kusikia sauti (kikomo chake)
- `GET /api/usage` matumizi ya leo
- `POST /api/report` ripoti ya jibu la AI
- `DELETE /api/account` kufuta akaunti (inahitajika na Play Store)

## Kumbuka
- Mpango wa bure wa Render hulala usipotumika; ombi la kwanza linaweza kuchukua sekunde 30–60.
- Kikomo kinahesabiwa kwa akaunti, si kwa kifaa. Kuzuia akaunti bandia, acha "Confirm email" iwashwe.
- Gharama za AI zako zinategemea kikomo ulichoweka × idadi ya watumiaji. Anza na kikomo kidogo.
- Majaribio ya ndani bila Supabase: `DEV_MODE=1 node server.js` (tokeni `dev-jina` inakubaliwa, matumizi yanakaa kwenye kumbukumbu tu). Usiweke `DEV_MODE` kwenye Render.
- Sehemu ya Supabase haijajaribiwa na mimi kwa mtandao halisi. Fanya jaribio la kujisajili, kutuma ujumbe zaidi ya kikomo, na kufuta akaunti kabla ya kuchapisha.
