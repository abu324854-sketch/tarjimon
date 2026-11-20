// Umumiy yordamchilar (foydalanuvchi sayti va admin panel uchun)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tok = () => localStorage.getItem('tok') || '';
async function api(path, body, opts = {}) {
  const r = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(tok() ? { authorization: 'Bearer ' + tok() } : {}), ...(opts.raw ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : (opts.raw ? body : JSON.stringify(body)),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && tok()) { localStorage.removeItem('tok'); }
  if (!r.ok) { const e = new Error(j.error || 'Xatolik'); e.status = r.status; throw e; }
  return j;
}
function toast(msg, bad) {
  const t = document.createElement('div'); t.className = 'toast ' + (bad ? 'err' : ''); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 3200);
}
const LANGS = 'af sq am ar hy az eu be bn bs bg ca ceb zh-CN zh-TW co hr cs da nl en eo et fi fr fy gl ka de el gu ht ha haw he hi hmn hu is ig id ga it ja jv kn kk km rw ko ku ky lo la lv lt lb mk mg ms ml mt mi mr mn my ne no ny or ps fa pl pt pa ro ru sm gd sr st sn sd si sk sl so es su sw sv tl tg ta tt te th tr tk uk ur ug uz vi cy xh yi yo zu'.split(' ');
const langLabel = c => { try { return new Intl.DisplayNames(['uz'], { type: 'language' }).of(c) || c; } catch { return c; } };
const langOptions = (sel, withAuto) => (withAuto ? '<option value="auto">Avtomatik aniqlash</option>' : '') +
  [...LANGS].sort((a, b) => langLabel(a).localeCompare(langLabel(b), 'uz')).map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(langLabel(c))}</option>`).join('');
const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${u.color || '#666'}">${esc((u.name || '?').trim().charAt(0).toUpperCase())}</span>`;
const fmtDate = ts => ts ? new Date(ts).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—';
