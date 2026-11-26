# Kuweka Zuri kwenye Google Play (mwongozo)

Zuri sasa ni PWA (ina `manifest.webmanifest`, `sw.js` na icons). Njia rahisi kwenda Play Store ni **Trusted Web Activity (TWA)**: app ya Android inayofungua tovuti yako kwa skrini nzima.

## A. Kabla ya kuanza
1. Tovuti iwe kwenye **HTTPS** (mfano Vercel) na kurasa zote 10 pamoja na `config.js`, `manifest.webmanifest`, `sw.js` na icons zimewekwa kwenye root.
2. Jaza `config.js` (seva, Supabase, `SUPPORT_EMAIL`). Weka barua pepe ya msaada, Play inaitaka.
3. Pitia `privacy.html` na `terms.html`. Ni violezo; badilisha kulingana na sheria za nchi yako.

## B. Tengeneza faili la Android (AAB)
1. Fungua **pwabuilder.com**, bandika anwani ya tovuti, bonyeza Start. Inakagua manifest na service worker.
2. Bonyeza **Package for stores → Android → Google Play**. Weka package name (mfano `com.lifeisgametz.zuri`), jina "Zuri", na uchague **kutengeneza signing key mpya**.
3. Pakua ZIP. **Hifadhi keystore na nenosiri mahali salama** (nakala 2). Ukipoteza, huwezi kusasisha app.
4. Ndani utapata `.aab` (la kupakia Play) na maelekezo ya `assetlinks.json`.

## C. Digital Asset Links (inaondoa upau wa browser juu ya app)
1. Play Console → app yako → **Setup → App signing**: nakili **SHA-256 certificate fingerprint** ya app signing key.
2. Tengeneza faili `/.well-known/assetlinks.json` kwenye tovuti yako lenye package name na fingerprint hiyo (PWABuilder inatoa kiolezo).
3. Fungua `https://TOVUTI/.well-known/assetlinks.json` kuhakikisha linaonekana. Kwenye Vercel hakikisha folda ya `.well-known` imewekwa kwenye mradi.

## D. Play Console
1. Akaunti ya msanidi: ada ya mara moja ya **$25** na uthibitisho wa utambulisho.
2. **Akaunti binafsi mpya (iliyofunguliwa baada ya 13 Nov 2023):** lazima ufanye **closed test na watesti 12 angalau, kwa siku 14 mfululizo** kabla ya kuomba production. Kwa kawaida hii inachukua wiki 3 kwa jumla. Akaunti ya **shirika** haihitaji hatua hii, ila inahitaji D-U-N-S number.
3. Store listing: jina, maelezo mafupi na marefu, screenshots za simu (angalau 2), feature graphic 1024×500, icon 512×512 (`icon-512.png`).
4. **Privacy policy URL:** `https://TOVUTI/privacy.html`.
5. **Data safety:** tamka barua pepe (akaunti), matumizi ya app (idadi ya ujumbe), sauti (inatumwa kwa huduma ya kusikia, haihifadhiwi), na kwamba data inaweza kufutwa.
6. **Kufuta akaunti:** app ina akaunti, kwa hiyo Play inataka njia ya kufuta ndani ya app (ipo: Akaunti → Futa akaunti yangu) na kiungo cha wavuti. Tumia `https://TOVUTI/account.html` na ueleze hatua kwenye fomu.
7. **AI-generated content:** Play inataka njia ya mtumiaji kuripoti jibu baya ndani ya app. Ipo: alama ya bendera chini ya kila jibu la Zuri. Ripoti zinafika kwenye seva (angalia logs za Render au jedwali `zuri_reports`).
8. Content rating, target audience (inapendekezwa 13+), na ruhusa ya microphone (inatumika tu kwa Live Call).

## E. Mambo ya kujua
- Tailwind inapakiwa kutoka mtandaoni (CDN). App inahitaji mtandao kwa mara ya kwanza, na wakati wa kutumia AI hata hivyo. Kwa app ya kitaalamu zaidi, ni bora kutengeneza CSS ya Tailwind mapema (build step).
- Seva ya Render ya bure hulala; ombi la kwanza linaweza kuchelewa.
- Live Call kwenye Android Chrome/TWA inatumia microphone ya simu; mtumiaji ataulizwa ruhusa mara ya kwanza.
- Sijaweza kutengeneza `.aab` wala kujaribu kwenye simu halisi. Fanya majaribio kwenye simu yako kupitia **internal testing** kabla ya closed test.
