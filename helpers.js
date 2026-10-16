import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, '..', 'images');

/** أرقام الملاك بكل الصيغ الممكنة */
const OWNER_CORE = [
  // KANEKI
  '1064875257',
  '01064875257',
  '201064875257',
  '064875257',
  // VITAN
  '1205872535',
  '01205872535',
  '201205872535',
  '205872535'
];

export function num(jid) {
  if (!jid) return '';
  let s = String(jid);
  // بايليز أحيانًا: 2010...:xx@s.whatsapp.net أو @lid
  s = s.split('@')[0].split(':')[0];
  return s.replace(/\D/g, '');
}

export function last9(n) {
  const d = String(n || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : d;
}

export function isOwner(jid) {
  try {
    const n = num(jid);
    if (!n) return false;
    const l9 = last9(n);
    // مطابقة آخر 9 أرقام — الأقوى ضد فرق كود الدولة
    for (const o of OWNER_CORE) {
      if (last9(o) === l9) return true;
      if (n === String(o).replace(/\D/g, '')) return true;
    }
    // من config
    for (const o of config.owners || []) {
      const phones = typeof o === 'string' ? [o] : [o.phone, o.digits].filter(Boolean);
      for (const p of phones) {
        if (last9(p) === l9) return true;
      }
    }
    for (const p of config.ownerPhones || []) {
      if (last9(p) === l9) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function ownerLabel(jid) {
  const l9 = last9(num(jid));
  if (l9 === '1064875257' || l9 === '064875257') return 'KANEKI';
  if (l9 === '1205872535' || l9 === '205872535') return 'VITAN';
  return 'OWNER';
}

export function digitsMatch(a, b) {
  return last9(a) === last9(b) && last9(a).length >= 9;
}

let imgIdx = 0;
export function nextImage() {
  try {
    const files = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort();
    if (!files.length) return null;
    const f = files[imgIdx % files.length];
    imgIdx++;
    return path.join(imgDir, f);
  } catch {
    return null;
  }
}

function unwrapMsg(message) {
  if (!message || typeof message !== 'object') return message;
  if (message.ephemeralMessage?.message) return unwrapMsg(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMsg(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMsg(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMsg(message.documentWithCaptionMessage.message);
  return message;
}

export function getQuoted(msg) {
  const m = msg?.message || {};
  const ctx = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo;
  return ctx?.quotedMessage || null;
}

export { unwrapMsg };
export function unwrapMessage(m) {
  return unwrapMsg(m);
}


/** تفاعل إيموجي على رسالة الأمر */
export async function reactOn(sock, msg, emoji) {
  try {
    if (!sock || !msg?.key) return;
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: String(emoji || '✔️'), key: msg.key }
    });
  } catch (e) {
    // تجاهل فشل الرياكشن
  }
}

/** اختيار إيموجي حسب نوع الأمر */
export function emojiForCmd(cmd) {
  const c = String(cmd || '').toLowerCase();
  // مطورين
  if (['dev','approve','reject','pending','requestdev','restart','broadcast','ban','unban','leave','errors','clearcache','private','selfpromote'].includes(c))
    return '🩸';
  // مشرفين / جروب
  if (['tagall','hidetag','kick','promote','demote','warn','unwarn','resetwarn','del','antilink','welcome','bye','link','revoke','setname','setdesc','grouplock','groupopen','setnick','getnick'].includes(c))
    return '✔️';
  // أعضاء / معلومات
  if (['profile','points','daily','rank','nick','mynick','afk','check','owner','bot','id','ping','runtime','menu','help','info','server'].includes(c))
    return '🌒';
  // وسائط / ملصقات
  if (['sticker','s','toimg','tovideo','tovn','square','compress','steal','pack'].includes(c))
    return '📷';
  // تحميل / موسيقى
  if (['yt','tiktok','ig','fb','play','song','video'].includes(c))
    return '🎼';
  // ذكاء
  if (['ai','gemini','grok','gpt','eren','itachi','luffy','mikasa'].includes(c))
    return '👾';
  // ألعاب
  if (['rps','guess','slots','dice','coin','xo'].includes(c))
    return '🎮';
  // تسلية
  if (['ship','pick','slap','codegame','secret','reverse','password'].includes(c))
    return '🎸';
  // أدوات
  if (['weather','search','lyrics','translate','calc','base64','qr','short','quote','jid'].includes(c))
    return '☕';
  // بنك
  if (['balance','bank','deposit','withdraw','pay','top','bankname'].includes(c))
    return '💳';
  // زخرفة
  if (/^z([1-9]|1[01])$/.test(c))
    return '🍷';
  // نظام
  if (['clearcache','errors'].includes(c))
    return '💾';
  return '🥃';
}
