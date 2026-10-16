import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, '..', 'images');

export const SECTIONS = [
  { id: 1,  name: 'المطورين',           key: 'dev',      img: 'img01.jpg' },
  { id: 2,  name: 'المشرفين',           key: 'admin',    img: 'img02.jpg' },
  { id: 3,  name: 'الجروب',             key: 'group',    img: 'img03.jpg' },
  { id: 4,  name: 'الأعضاء',            key: 'member',   img: 'img04.jpg' },
  { id: 5,  name: 'الوسائط',            key: 'media',    img: 'img05.jpg' },
  { id: 6,  name: 'التحميل',            key: 'download', img: 'img06.jpg' },
  { id: 7,  name: 'الملصقات',           key: 'stickers', img: 'img07.jpg' },
  { id: 8,  name: 'الذكاء الاصطناعي',   key: 'ai',       img: 'img08.jpg' },
  { id: 9,  name: 'الألعاب',            key: 'games',    img: 'img09.jpg' },
  { id: 10, name: 'التسلية',            key: 'fun',      img: 'img10.jpg' },
  { id: 11, name: 'الأدوات',            key: 'tools',    img: 'img11.jpg' },
  { id: 12, name: 'البنك',              key: 'bank',     img: 'img12.jpg' },
  { id: 13, name: 'الزخرفة',            key: 'decor',    img: 'img13.jpg' },
  { id: 14, name: 'المعلومات',          key: 'info',     img: 'img14.jpg' },
  { id: 15, name: 'النظام',             key: 'system',   img: 'img15.jpg' }
];

const BODY = {
  dev: `*المطورين*
.approve / .موافق رقم
.reject / .رفض رقم
.pending / .معلق
.requestdev / .طلب_مطور
.restart / .اعادة
.broadcast / .نشر نص
.ban / .حظر @
.unban / .فك_حظر رقم
.leave / .اطلع
.errors / .اخطاء
.clearcache / .مسح_كاش
.private / .وضع_خاص
.selfpromote / .ارفعني
.dev / .مطورين`,

  admin: `*المشرفين*
.tagall / .منشن نص
.hidetag / .مخفي نص
.kick / .طرد @
.promote / .ترقية @
.demote / .تخفيض @
.warn / .تحذير @
.unwarn / .الغاء_تحذير @
.resetwarn / .عيد_تحذير @
.del / .حذف (رد)
.antilink / .منع_روابط on/off
.welcome / .ترحيب on/off
.bye / .وداع on/off`,

  group: `*الجروب*
.link / .لينك
.revoke / .تجديد
.setname / .اسم اسم_جديد
.setdesc / .وصف النص
.grouplock / .قفل
.groupopen / .فتح
.setnick / .تلقيب @ لقب
.getnick / .لقبه @`,

  member: `*الأعضاء*
.profile / .بروفايل
.points / .نقاط
.daily / .يومي
.rank / .رتبة
.nick / .لقب نص
.mynick / .لقبي
.afk / .اختفاء سبب
.check / .تحقق رقم
.owner / .المالك
.bot
.id / .ايدي
.ping
.runtime / .تشغيل`,

  media: `*الوسائط*
.sticker / .s / .ملصق
.toimg / .لصورة
.tovideo / .لفيديو
.tovn / .لصوت
.square / .مربع
.compress / .ضغط`,

  download: `*التحميل*
.yt / .يوتيوب رابط
.tiktok / .تيك رابط
.ig / .انستا رابط
.fb / .فيسبوك رابط
.play / .تشغيل اسم
.song / .اغنية اسم
.video / .فيديو رابط`,

  stickers: `*الملصقات*
.sticker / .ملصق
.toimg / .لصورة
.steal / .سرقة (رد على ملصق)
.pack / .حزمة`,

  ai: `*الذكاء الاصطناعي*
.ai / .ذكاء سؤال
.gemini سؤال
.grok سؤال
.gpt سؤال
.eren سؤال
.itachi سؤال
.luffy سؤال
.mikasa سؤال`,

  games: `*الألعاب*
.rps / .حجر حجر|ورقة|مقص
.guess / .خمن رقم
.slots
.dice / .نرد
.coin / .عملة
.xo`,

  fun: `*التسلية*
.ship / .زوجني @
.pick / .زيجي
.slap / .صفعة @
.codegame / .شفرة
.secret / .كلمة_سر
.reverse / .عكس نص
.password / .باسورد`,

  tools: `*الأدوات*
.weather / .طقس مدينة
.search / .بحث كلمة
.lyrics / .كلمات فنان - أغنية
.translate / .ترجم نص
.calc / .حاسبة 2+2
.base64 نص
.qr نص
.short رابط
.quote / .اقتباس (رد)
.jid / .ايدي`,

  bank: `*البنك*
.balance / .رصيد
.bank
.deposit / .ايداع مبلغ
.withdraw / .سحب مبلغ
.pay / .تحويل @ مبلغ
.top / .صدارة
.bankname / .تسمية_البنك اسم`,

  decor: `*الزخرفة*
.ز1 … .ز11  أو  .z1 … .z11
حط النص بعد الأمر`,

  info: `*المعلومات*
.menu / .اوامر / .قائمة
.help / .مساعدة
.info / .معلومات
.owner / .المالك
.bot
.runtime / .تشغيل
.ping
.server / .السيرفر`,

  system: `*النظام*
.ping
.runtime / .تشغيل
.bot
.clearcache / .مسح_كاش
.errors / .اخطاء`
};

function sectionImage(sec) {
  if (!sec?.img) return null;
  const p = path.join(imgDir, sec.img);
  return fs.existsSync(p) ? p : null;
}

function mainImage() {
  const p = path.join(imgDir, 'main.jpg');
  if (fs.existsSync(p)) return p;
  const p2 = path.join(imgDir, 'img06.jpg');
  return fs.existsSync(p2) ? p2 : null;
}

export async function sendMainMenu(sock, jid, quoted, pushName) {
  const lines = SECTIONS.map(s => `${s.id}｜ ${s.name}`).join('\n');
  const text =
    `*${config.botName}*  v${config.version}\n` +
    `اهلا ${pushName || ''}\n` +
    `الملاك: KANEKI × VITAN\n\n` +
    `اختر رقم القسم:\n\n${lines}\n\n` +
    `0｜ القائمة الرئيسية\n` +
    `البادئة: . ! /`;

  const img = mainImage();
  try {
    if (img) await sock.sendMessage(jid, { image: fs.readFileSync(img), caption: text }, { quoted });
    else await sock.sendMessage(jid, { text }, { quoted });
  } catch {
    await sock.sendMessage(jid, { text }, { quoted });
  }
}

export async function sendSection(sock, jid, quoted, sectionId) {
  const sec = SECTIONS.find(s => s.id === Number(sectionId));
  if (!sec) return false;
  const body = BODY[sec.key] || sec.name;
  const text = `*${sec.name}* | ${sec.id}\n\n${body}\n\n0｜ رجوع للقائمة`;
  const img = sectionImage(sec);
  try {
    if (img) await sock.sendMessage(jid, { image: fs.readFileSync(img), caption: text }, { quoted });
    else await sock.sendMessage(jid, { text }, { quoted });
  } catch {
    await sock.sendMessage(jid, { text }, { quoted });
  }
  return true;
}
