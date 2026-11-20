let CFG = {}, ME = null, lastTr = '', lastTo = 'uz', segs = [], room = 'general', lastId = 0, poll = null;
const SR = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU', tr: 'tr-TR', ar: 'ar-SA', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR', pt: 'pt-PT', it: 'it-IT', fa: 'fa-IR' };
const bcp = c => SR[c] || c;

// ---------- Kirish ----------
async function boot() {
  CFG = await api('/api/config');
  document.title = CFG.appName; $('#a-name').textContent = $('#h-name').textContent = CFG.appName;
  $('#a-owner').textContent = '© ' + CFG.ownerName;
  if (tok()) { try { ME = await api('/api/me'); return start(); } catch {} }
  $('#auth').classList.remove('hide');
  if (CFG.firebase) await initFirebase();
}
let fbConfirm = null;
async function initFirebase() {
  for (const s of ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'])
    await new Promise((ok, no) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = no; document.head.append(e); });
  firebase.initializeApp(CFG.firebase);
  window.rv = new firebase.auth.RecaptchaVerifier('recaptcha', { size: 'invisible' });
}
$('#send').onclick = async () => {
  $('#a-err').textContent = ''; const phone = $('#phone').value.trim();
  try {
    if (CFG.firebase) fbConfirm = await firebase.auth().signInWithPhoneNumber(phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, ''), window.rv);
    else { const r = await api('/api/auth/send', { phone }); if (r.devCode) $('#devhint').textContent = 'Test rejimi: kod ' + r.devCode; }
    $('#a-phone').classList.add('hide'); $('#a-code').classList.remove('hide');
  } catch (e) { $('#a-err').textContent = e.message; }
};
$('#verify').onclick = async () => {
  $('#a-err').textContent = '';
  try {
    let r;
    if (CFG.firebase) { const c = await fbConfirm.confirm($('#code').value.trim()); r = await api('/api/auth/firebase', { idToken: await c.user.getIdToken() }); }
    else r = await api('/api/auth/verify', { phone: $('#phone').value.trim(), code: $('#code').value.trim() });
    localStorage.setItem('tok', r.token); ME = r.user; $('#auth').classList.add('hide'); start();
  } catch (e) { $('#a-err').textContent = e.message; }
};
$('#logout').onclick = async () => { try { await api('/api/auth/logout', {}); } catch {} localStorage.removeItem('tok'); location.reload(); };

// ---------- Boshlash ----------
function start() {
  $('#app').classList.remove('hide');
  $('#admin-link').classList.toggle('hide', ME.role !== 'admin');
  $('#from').innerHTML = langOptions('auto', true); $('#to').innerHTML = langOptions(ME.lang || 'uz');
  $$('.tolang, #to-vid').forEach(s => s.innerHTML = langOptions(ME.lang || 'uz'));
  $('#to-vid').insertAdjacentHTML('afterbegin', '<option value="none">Tarjimasiz (faqat matn)</option>');
  renderMe(); go('tr');
  if (/paid=/.test(location.search)) { toast(/paid=0/.test(location.search) ? 'To\'lov bekor qilindi' : 'To\'lov qabul qilindi ✅'); history.replaceState({}, '', '/'); setTimeout(refreshMe, 1500); }
}
async function refreshMe() { ME = await api('/api/me'); renderMe(); }
$$('nav.bot button').forEach(b => b.onclick = () => go(b.dataset.go));
function go(t) {
  $$('[data-tab]').forEach(s => s.classList.toggle('hide', s.dataset.tab !== t));
  $$('nav.bot button').forEach(b => b.classList.toggle('on', b.dataset.go === t));
  clearInterval(poll); if (t === 'chat') { loadChat(true); poll = setInterval(() => loadChat(false), 3000); }
  if (t === 'me') { refreshMe(); loadLeaders(); }
}

// ---------- Tarjima ----------
const qtxt = () => { const l = ME.limits, u = ME.usage; return ME.premium ? '👑 Cheksiz' : `Bugun: ${u.text}/${l.text}`; };
function updQ() { $('#tr-q').textContent = qtxt(); }
$('#go').onclick = async () => {
  const text = $('#src').value.trim(); if (!text) return;
  $('#go').disabled = true; $('#res').textContent = 'Tarjima qilinmoqda…';
  try { const r = await api('/api/translate', { text, to: $('#to').value, from: $('#from').value }); lastTr = r.text; lastTo = $('#to').value; $('#res').textContent = r.text; ME.usage.text++; updQ(); }
  catch (e) { $('#res').innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  $('#go').disabled = false;
};
$('#swap').onclick = () => { const f = $('#from').value, t = $('#to').value; if (f === 'auto') return; $('#from').value = t; $('#to').value = f; if (lastTr) { $('#src').value = lastTr; } };
function speak(text, lang) {
  if (!('speechSynthesis' in window)) return toast('Brauzer ovozli o\'qishni qo\'llamaydi', 1);
  const u = new SpeechSynthesisUtterance(text); u.lang = bcp(lang);
  if (!speechSynthesis.getVoices().some(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))) toast('Bu til uchun ovoz qurilmangizda yo\'q bo\'lishi mumkin', 1);
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
$('#speak').onclick = () => lastTr && speak(lastTr, lastTo);
$('#copy').onclick = () => lastTr && navigator.clipboard.writeText(lastTr).then(() => toast('Nusxalandi'));
$('#mic').onclick = () => {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return toast('Brauzer mikrofonni matnga aylantirishni qo\'llamaydi (Chrome/Edge/Safari ishlating)', 1);
  const r = new R(); const f = $('#from').value; r.lang = bcp(f === 'auto' ? (ME.lang || 'uz') : f); r.interimResults = true;
  $('#mic').textContent = '🔴 Tinglayapman…';
  r.onresult = e => { $('#src').value = [...e.results].map(x => x[0].transcript).join(' '); };
  r.onend = () => { $('#mic').textContent = '🎤 Gapirish'; if ($('#src').value.trim()) $('#go').click(); };
  r.onerror = e => toast('Mikrofon xatosi: ' + e.error, 1); r.start();
};

// ---------- Rasm ----------
let imgData = null, imgTr = '', imgTo = 'uz';
$('#imgf').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const fr = new FileReader();
  fr.onload = () => { // 1600px gacha kichraytirish
    const im = new Image(); im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); imgData = c.toDataURL('image/jpeg', .85); $('#imgp').src = imgData; $('#imgp').classList.remove('hide');
    }; im.src = fr.result;
  }; fr.readAsDataURL(f);
};
$('#imggo').onclick = async () => {
  if (!imgData) return toast('Avval rasm tanlang', 1);
  $('#imggo').disabled = true; const o = $('#imgres'); o.classList.remove('hide'); o.textContent = 'O\'qilmoqda…';
  try {
    const r = await api('/api/translate-image', { image: imgData, to: $('#to-img').value }); imgTr = r.translation; imgTo = $('#to-img').value;
    o.innerHTML = `<b>Asl matn${r.detected ? ' (' + esc(r.detected) + ')' : ''}:</b>\n${esc(r.original)}\n\n<b>Tarjima:</b>\n${esc(r.translation)}`; $('#imgspeak').classList.remove('hide');
  } catch (e) { o.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  $('#imggo').disabled = false;
};
$('#imgspeak').onclick = () => imgTr && speak(imgTr, imgTo);

// ---------- Video / audio ----------
async function toWav(file) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const dec = await ac.decodeAudioData(await file.arrayBuffer()); ac.close();
  if (dec.duration > 900) throw new Error('Fayl 15 daqiqadan uzun bo\'lmasin');
  const sr = 16000, oc = new OfflineAudioContext(1, Math.ceil(dec.duration * sr), sr), s = oc.createBufferSource();
  s.buffer = dec; s.connect(oc.destination); s.start(); const pcm = (await oc.startRendering()).getChannelData(0);
  const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return buf;
}
const tstr = (t, ms) => { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60); const b = [m, s].map(x => String(x).padStart(2, '0')).join(':'); return ms ? `${String(h).padStart(2, '0')}:${b},${String(Math.round(t % 1 * 1000)).padStart(3, '0')}` : (h ? h + ':' : '') + b; };
$('#vidgo').onclick = async () => {
  const f = $('#vidf').files[0]; if (!f) return toast('Avval video yoki audio tanlang', 1);
  if (f.size > 300e6) return toast('Fayl 300 MB dan oshmasin', 1);
  const st = $('#vidst'); $('#vidgo').disabled = true; $('#vidres').innerHTML = ''; $('#vidact').classList.add('hide');
  try {
    st.textContent = '1/3 Ovoz ajratilmoqda…'; const wav = await toWav(f);
    st.textContent = '2/3 Matnga aylantirilmoqda va tarjima qilinmoqda (bir necha daqiqa olishi mumkin)…';
    const r = await api('/api/transcribe?to=' + encodeURIComponent($('#to-vid').value), wav, { raw: true });
    segs = r.segments; st.textContent = `Tayyor ✅ Aniqlangan til: ${r.language || '—'}`;
    $('#vidres').innerHTML = segs.map(s => `<div class="seg"><time>${tstr(s.start)}</time><div>${esc(s.text)}${s.tr ? `<br><b>${esc(s.tr)}</b>` : ''}</div></div>`).join('') || '<p class="mut">Nutq topilmadi</p>';
    $('#vidact').classList.remove('hide');
  } catch (e) { st.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  $('#vidgo').disabled = false;
};
$('#srt').onclick = () => {
  const t = segs.map((s, i) => `${i + 1}\n${tstr(s.start, 1)} --> ${tstr(Math.max(s.end, s.start + .5), 1)}\n${s.tr || s.text}\n`).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'subtitr.srt'; a.click();
};
$('#vcopy').onclick = () => navigator.clipboard.writeText(segs.map(s => s.tr || s.text).join('\n')).then(() => toast('Nusxalandi'));

// ---------- Chat ----------
async function loadChat(reset) {
  if (reset) { $('#msgs').innerHTML = ''; lastId = 0; }
  try {
    const ms = await api(`/api/chat?room=${encodeURIComponent(room)}&after=${lastId}`); if (!ms.length) return;
    const box = $('#msgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80 || reset;
    for (const m of ms) {
      lastId = Math.max(lastId, m.id); const d = document.createElement('div'); d.className = 'msg' + (m.userId === ME.id ? ' mine' : ''); d.dataset.id = m.id;
      d.innerHTML = `<small>${esc(m.name)} ${m.premium ? '<span class="badge">👑</span>' : ''} · ${new Date(m.ts).toLocaleTimeString('uz-UZ', { timeStyle: 'short' })}</small><div class="t">${esc(m.text)}</div>
        <div class="acts"><button data-a="tr">🌐 Tarjima</button>${m.userId !== ME.id ? '<button data-a="star">⭐ <span class="sc">' + (m.stars || 0) + '</span></button>' : '<span class="mut">⭐ ' + (m.stars || 0) + '</span>'}</div>`;
      d.querySelector('[data-a=tr]').onclick = async () => { try { const r = await api('/api/translate', { text: m.text, to: ME.lang || 'uz' }); d.querySelector('.t').textContent = r.text; } catch (e) { toast(e.message, 1); } };
      const sb = d.querySelector('[data-a=star]'); if (sb) sb.onclick = () => giveStar({ messageId: m.id }, sb);
      box.append(d);
    }
    if (near) box.scrollTop = box.scrollHeight;
  } catch (e) { if (e.status === 401) location.reload(); }
}
async function giveStar(body, btn) {
  try {
    const r = await api('/api/stars/give', body); ME = r.me; toast('⭐ Yulduzcha berildi!'); if (btn) { const c = btn.querySelector('.sc'); if (c) c.textContent = +c.textContent + 1; }
  } catch (e) { toast(e.message, 1); }
}
async function sendMsg() { const t = $('#mtext').value.trim(); if (!t) return; $('#mtext').value = ''; try { await api('/api/chat', { room, text: t }); loadChat(false); } catch (e) { toast(e.message, 1); } }
$('#msend').onclick = sendMsg; $('#mtext').onkeydown = e => e.key === 'Enter' && sendMsg();
$('#room').onchange = () => { room = $('#room').value; loadChat(true); };
let st = null;
$('#usearch').oninput = () => { clearTimeout(st); st = setTimeout(async () => {
  const q = $('#usearch').value.trim(); if (!q) return $('#ures').innerHTML = '';
  const us = (await api('/api/users?q=' + encodeURIComponent(q)).catch(() => [])).filter(u => u.id !== ME.id);
  $('#ures').innerHTML = us.map(u => `<button class="btn sec sm" data-u="${u.id}" data-n="${esc(u.name)}">${esc(u.name)} · ⭐${u.stars}</button>`).join('') || '<span class="mut">Topilmadi</span>';
  $$('#ures button').forEach(b => b.onclick = () => {
    const [x, y] = [+ME.id, +b.dataset.u].sort((a, b) => a - b), v = `dm:${x}:${y}`;
    if (!$(`#room option[value="${v}"]`)) $('#room').insertAdjacentHTML('beforeend', `<option value="${v}">💬 ${esc(b.dataset.n)}</option>`);
    $('#room').value = v; room = v; loadChat(true); $('#ures').innerHTML = ''; $('#usearch').value = '';
  });
}, 300); };

// ---------- Profil ----------
function renderMe() {
  $('#h-av').innerHTML = avatar(ME); updQ();
  const pct = Math.min(100, Math.round(ME.stars / CFG.starsForPremium * 100));
  $('#prof').innerHTML = `<div class="row">${avatar(ME, 'lg')}<div class="grow"><input type="text" id="pname" value="${esc(ME.name)}" maxlength="40"><div class="mut" style="margin-top:4px">${esc(ME.phone)} ${ME.premium ? '<span class="badge">👑 Premium</span>' : ''}</div></div></div>
    <div class="row" style="margin-top:10px"><div class="grow"><label class="mut">Asosiy tilim</label><select id="plang">${langOptions(ME.lang || 'uz')}</select></div><button class="btn" id="psave">Saqlash</button></div>
    <p style="margin-top:12px">⭐ <b>${ME.stars}</b> / ${CFG.starsForPremium} — ${CFG.starsForPremium} ta yulduzchaga yetganda Premium avtomatik beriladi</p><div class="bar"><i style="width:${pct}%"></i></div>`;
  $('#psave').onclick = async () => { try { ME = await api('/api/me', { name: $('#pname').value, lang: $('#plang').value }); renderMe(); toast('Saqlandi'); } catch (e) { toast(e.message, 1); } };
  $('#starinfo').textContent = `Bugun bepul yulduzchalaringiz: ${ME.freeStarsLeft} · Sotib olingan: ${ME.starBalance}. Yulduzchani chatdagi xabar ostidan yoki profildan boshqalarga bering (bir kishiga kuniga 1 ta).`;
  $('#packs').innerHTML = CFG.packs.map(p => `<div class="pack"><div style="font-size:24px">⭐ ${p.stars}</div><div class="mut">$${p.priceUsd}</div><button class="btn gold sm" data-p="${p.id}" style="margin-top:6px">Sotib olish</button></div>`).join('');
  $$('#packs button').forEach(b => b.onclick = () => pay({ packId: b.dataset.p }));
  $('#preminfo').textContent = ME.premium ? `Premium faol: ${fmtDate(ME.premiumUntil)} gacha. Cheksiz tarjima, rasm va video.` : `Bepul tarif: kuniga ${ME.limits.text} matn, ${ME.limits.image} rasm, ${ME.limits.video} video.`;
  $('#buyprem').textContent = `Premium olish — $${CFG.premiumPriceUsd} / ${CFG.premiumDays} kun`; $('#buyprem').onclick = () => pay({ kind: 'premium' });
}
async function pay(b) { try { const r = await api('/api/pay', b); location.href = r.url; } catch (e) { toast(e.message, 1); } }
async function loadLeaders() {
  const l = await api('/api/leaders').catch(() => []);
  $('#leaders').innerHTML = l.map((u, i) => `<div class="row" style="padding:5px 0">${i + 1}. ${avatar(u)}<span class="grow">${esc(u.name)} ${u.premium ? '<span class="badge">👑</span>' : ''}</span><b>⭐ ${u.stars}</b>${u.id !== ME.id ? `<button class="btn sec sm" data-s="${u.id}">⭐ Bering</button>` : ''}</div>`).join('');
  $$('#leaders [data-s]').forEach(b => b.onclick = async () => { await giveStar({ toUserId: b.dataset.s }); loadLeaders(); renderMe(); });
}

boot().catch(e => { document.body.innerHTML = '<p style="padding:20px">Serverga ulanib bo\'lmadi: ' + esc(e.message) + '</p>'; });
