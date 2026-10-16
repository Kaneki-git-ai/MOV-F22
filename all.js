import config from '../config.js';
import { isOwner, ownerLabel, num, nextImage, getQuoted, reactOn, emojiForCmd } from '../utils/helpers.js';
import { user, addPoints, group, setGroup, ban, isBanned } from '../database/db.js';
import { isDev, approveDev, rejectDev, requestDev, listPending } from '../system/devauth.js';
import { sendMainMenu, sendSection, SECTIONS } from '../system/menus.js';
import fs from 'fs';
import path from 'path';
import { downloadUrl, unlinkSafe, hasYtDlp, searchAndDownload } from '../system/media.js';
import { makeSticker, stickerToImage } from '../system/sticker.js';

const fetch = globalThis.fetch;

function pref(text) {
  const t = (text || '').trim();
  for (const p of config.prefix) {
    if (t.startsWith(p)) {
      const rest = t.slice(p.length).trim();
      const parts = rest.split(/\s+/);
      return { cmd: (parts[0] || '').toLowerCase(), args: parts.slice(1), raw: rest };
    }
  }
  return null;
}

const ALIASES = {
  'اوامر': 'menu', 'قائمة': 'menu', 'help': 'menu', 'مساعدة': 'menu', 'mox': 'menu', 'mov': 'menu', 'mos': 'menu',
  'مطورين': 'dev', 'موافق': 'approve', 'رفض': 'reject', 'معلق': 'pending',
  'طلب_مطور': 'requestdev', 'طلبمطور': 'requestdev', 'اعادة': 'restart', 'نشر': 'broadcast',
  'حظر': 'ban', 'فك_حظر': 'unban', 'فكحظر': 'unban',
  'اطلع': 'leave', 'اخطاء': 'errors', 'مسح_كاش': 'clearcache', 'مسحكاش': 'clearcache',
  'وضع_خاص': 'private', 'وضعخاص': 'private', 'ارفعني': 'selfpromote',
  'منشن': 'tagall', 'مخفي': 'hidetag', 'طرد': 'kick', 'ترقية': 'promote', 'تخفيض': 'demote',
  'تحذير': 'warn', 'الغاء_تحذير': 'unwarn', 'الغاءتحذير': 'unwarn', 'عيد_تحذير': 'resetwarn', 'عيدتحذير': 'resetwarn',
  'حذف': 'del', 'منع_روابط': 'antilink', 'منعدروابط': 'antilink', 'ترحيب': 'welcome', 'وداع': 'bye',
  'لينك': 'link', 'تجديد': 'revoke', 'اسم': 'setname', 'وصف': 'setdesc',
  'قفل': 'grouplock', 'فتح': 'groupopen', 'تلقيب': 'setnick', 'لقبه': 'getnick',
  'بروفايل': 'profile', 'نقاط': 'points', 'يومي': 'daily', 'رتبة': 'rank', 'لقب': 'nick',
  'لقبي': 'mynick', 'اختفاء': 'afk', 'تحقق': 'check', 'المالك': 'owner', 'ايدي': 'id', 'تشغيل': 'runtime',
  'ملصق': 'sticker', 'لصورة': 'toimg', 'لفيديو': 'tovideo', 'لصوت': 'tovn', 'مربع': 'square', 'ضغط': 'compress',
  'سرقة': 'steal', 'حزمة': 'pack',
  'يوتيوب': 'yt', 'تيك': 'tiktok', 'انستا': 'ig', 'فيسبوك': 'fb', 'اغنية': 'song', 'فيديو': 'video',
  'ذكاء': 'ai',
  'حجر': 'rps', 'خمن': 'guess', 'نرد': 'dice', 'عملة': 'coin',
  'زوجني': 'ship', 'زيجي': 'pick', 'صفعة': 'slap', 'شفرة': 'codegame', 'كلمة_سر': 'secret', 'كلمه_سر': 'secret',
  'عكس': 'reverse', 'باسورد': 'password',
  'طقس': 'weather', 'بحث': 'search', 'كلمات': 'lyrics', 'ترجم': 'translate', 'حاسبة': 'calc', 'اقتباس': 'quote',
  'رصيد': 'balance', 'ايداع': 'deposit', 'سحب': 'withdraw', 'تحويل': 'pay', 'صدارة': 'top',
  'تسمية_البنك': 'bankname', 'تسميةالبنك': 'bankname',
  'معلومات': 'info', 'السيرفر': 'server',
  'ز1': 'z1', 'ز2': 'z2', 'ز3': 'z3', 'ز4': 'z4', 'ز5': 'z5', 'ز6': 'z6', 'ز7': 'z7',
  'ز8': 'z8', 'ز9': 'z9', 'ز10': 'z10', 'ز11': 'z11'
};


async function reply(sock, jid, content, quoted) {
  try {
    await sock.sendMessage(jid, typeof content === 'string' ? { text: content } : content, { quoted });
  } catch (e) {
    console.log('reply:', e.message);
  }
}

async function aiGemini(prompt) {
  const key = config.geminiKey;
  if (!key) return null;
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  for (const model of models) {
    try {
      let r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );
      let j = await r.json();
      let text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body }
      );
      j = await r.json();
      text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      console.log('gemini', model, e.message);
    }
  }
  return null;
}

async function aiGrok(prompt) {
  const key = config.grokKey;
  if (!key) return null;
  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function webSearch(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const hasArabic = /[\u0600-\u06FF]/.test(q);
  const langs = hasArabic ? ['ar', 'en'] : ['en', 'ar'];

  // 1) ويكيبيديا (عربي أو إنجليزي حسب النص)
  for (const lang of langs) {
    try {
      const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;
      const r = await fetch(u, { headers: { 'User-Agent': 'MOV-F22/1.0' } });
      if (r.ok) {
        const j = await r.json();
        if (j.extract && j.type !== 'disambiguation') {
          let out = `🔍 *${j.title || q}*\n\n${j.extract}`;
          if (j.content_urls?.desktop?.page) out += '\n\n' + j.content_urls.desktop.page;
          return out;
        }
      }
    } catch (e) {
      console.log('wiki', lang, e.message);
    }
  }

  // 2) بحث ويكيبيديا API (لو العنوان مش مطابق حرفياً)
  for (const lang of langs) {
    try {
      const u = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=5&namespace=0&format=json`;
      const r = await fetch(u, { headers: { 'User-Agent': 'MOV-F22/1.0' } });
      if (r.ok) {
        const j = await r.json();
        const titles = j[1] || [];
        const descs = j[2] || [];
        const links = j[3] || [];
        if (titles.length) {
          // جلب ملخص أول نتيجة
          const first = titles[0];
          try {
            const s = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(first)}`, { headers: { 'User-Agent': 'MOV-F22/1.0' } });
            if (s.ok) {
              const sj = await s.json();
              if (sj.extract) {
                let out = `🔍 *${sj.title}*\n\n${sj.extract}`;
                if (links[0]) out += '\n\n' + links[0];
                if (titles.length > 1) {
                  out += '\n\nنتائج أخرى:\n' + titles.slice(1).map((t, i) => `${i + 2}. ${t}`).join('\n');
                }
                return out;
              }
            }
          } catch {}
          return `🔍 *${q}*\n\n` + titles.map((t, i) => `${i + 1}. ${t}${descs[i] ? ' — ' + descs[i] : ''}`).join('\n');
        }
      }
    } catch (e) {
      console.log('wiki search', e.message);
    }
  }

  // 3) DuckDuckGo HTML
  try {
    const u = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q);
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) MOV-F22' } });
    const html = await r.text();
    const results = [];
    const re = /class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 5) {
      const title = m[2].replace(/\s+/g, ' ').trim();
      if (title) results.push(`${results.length + 1}. ${title}`);
    }
    if (!results.length) {
      const re2 = /class="result__a"[^>]*>([^<]+)<\/a>/gi;
      while ((m = re2.exec(html)) && results.length < 5) {
        const title = m[1].replace(/\s+/g, ' ').trim();
        if (title) results.push(`${results.length + 1}. ${title}`);
      }
    }
    if (results.length) return `🔍 *${q}*\n\n` + results.join('\n');
  } catch (e) {
    console.log('ddg', e.message);
  }

  return null;
}

async function getLyrics(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  let artist = '', title = q;
  if (q.includes('-')) {
    const sp = q.split('-').map(s => s.trim());
    artist = sp[0];
    title = sp.slice(1).join('-').trim() || sp[0];
  }
  try {
    if (artist && title) {
      const u = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const r = await fetch(u);
      if (r.ok) {
        const j = await r.json();
        if (j.lyrics) return `🎵 *${artist} - ${title}*\n\n${j.lyrics.slice(0, 3500)}`;
      }
    }
  } catch {}
  return null;
}

async function getWeather(city) {
  const c = String(city || '').trim() || 'Cairo';
  try {
    const r = await fetch(`https://wttr.in/${encodeURIComponent(c)}?format=j1`, { headers: { 'User-Agent': 'curl/8.0' } });
    const j = await r.json();
    const cur = j.current_condition?.[0];
    const area = j.nearest_area?.[0]?.areaName?.[0]?.value || c;
    if (cur) {
      return `🌤️ *${area}*\nالحرارة: ${cur.temp_C}°C\nالإحساس: ${cur.FeelsLikeC}°C\nالرطوبة: ${cur.humidity}%\nالوصف: ${cur.weatherDesc?.[0]?.value || ''}\nالرياح: ${cur.windspeedKmph} km/h`;
    }
  } catch {}
  try {
    const r = await fetch(`https://wttr.in/${encodeURIComponent(c)}?format=%l:+%t+%c+%h+%w`, { headers: { 'User-Agent': 'curl/8.0' } });
    const txt = (await r.text()).trim();
    if (txt) return `🌤️ ${txt}`;
  } catch {}
  return null;
}

const Z = {
  z1: s => s.split('').map(c => c + '\u0336').join(''),
  z2: s => s.split('').join(' '),
  z3: s => '『' + s + '』',
  z4: s => s.split('').map(c => c + '\u0489').join(''),
  z5: s => '✦ ' + s.split('').join(' ✦ ') + ' ✦',
  z6: s => '【' + s.toUpperCase() + '】',
  z7: s => s.split('').reverse().join('')
};

export async function handleCommand(sock, msg, text, sender) {
  const jid = msg.key.remoteJid;
  const body = (text || '').trim();
  const botJid = sock.user?.id || '';
  const candidates = [sender, botJid, msg.key.participantPn, msg.key.participant, msg.key.remoteJidPn].filter(Boolean);
  const allowDev = candidates.some(c => isDev(c) || isOwner(c)) || (msg.key.fromMe && isOwner(botJid));

  if (/^(1[0-5]|[0-9])$/.test(body)) {
    reactOn(sock, msg, body === '0' ? '🌒' : '🌗').catch(() => {});
    if (body === '0') {
      await sendMainMenu(sock, jid, msg, msg.pushName);
      return true;
    }
    const ok = await sendSection(sock, jid, msg, body);
    if (ok) return true;
  }

  const p = pref(body);
  if (!p) return false;
  let { cmd, args, raw } = p;
  if (ALIASES[cmd]) cmd = ALIASES[cmd];
  // تفاعل فوري على الأمر
  reactOn(sock, msg, emojiForCmd(cmd)).catch(() => {});
  const u = user(sender, msg.pushName);

  if (['menu', 'اوامر', 'قائمة', 'help', 'مساعدة', 'mos', 'mov', 'mox'].includes(cmd)) {
    await sendMainMenu(sock, jid, msg, msg.pushName);
    return true;
  }

  // —— مطورين ——
  if (cmd === 'dev') {
    if (!allowDev) return reply(sock, jid, 'للمطورين فقط', msg);
    return reply(sock, jid, '*لوحة المطورين*\n.approve .reject .pending .restart\n.broadcast .ban .unban', msg);
  }
  if (cmd === 'approve') {
    if (!allowDev) return reply(sock, jid, 'للملاك فقط', msg);
    const n = (args[0] || '').replace(/\D/g, '');
    if (!n) return reply(sock, jid, 'مثال: .approve 01xxxxxxxxx', msg);
    approveDev(n);
    return reply(sock, jid, 'تم اعتماد المطور: ' + n, msg);
  }
  if (cmd === 'reject') {
    if (!allowDev) return reply(sock, jid, 'للملاك فقط', msg);
    rejectDev(args[0] || '');
    return reply(sock, jid, 'تم الرفض', msg);
  }
  if (cmd === 'pending') {
    if (!allowDev) return reply(sock, jid, 'للمطورين فقط', msg);
    const list = listPending();
    if (!list.length) return reply(sock, jid, 'لا يوجد طلبات', msg);
    return reply(sock, jid, list.map(x => x.phone + ' — ' + (x.name || '')).join('\n'), msg);
  }
  if (cmd === 'requestdev') {
    const r = requestDev(sender, msg.pushName);
    if (r === 'already') return reply(sock, jid, 'أنت مطور بالفعل', msg);
    return reply(sock, jid, 'تم إرسال طلب المطور للملاك', msg);
  }
  if (cmd === 'restart') {
    if (!allowDev) return reply(sock, jid, 'للمطورين فقط', msg);
    await reply(sock, jid, 'جاري إعادة التشغيل...', msg);
    setTimeout(() => process.exit(0), 500);
    return true;
  }
  if (cmd === 'broadcast') {
    if (!allowDev) return reply(sock, jid, 'للملاك فقط', msg);
    return reply(sock, jid, 'البث: ' + (args.join(' ') || 'اكتب الرسالة'), msg);
  }
  if (cmd === 'addadmin') {
    if (!allowDev) return reply(sock, jid, 'للملاك فقط', msg);
    approveDev(args[0] || '');
    return reply(sock, jid, 'تمت الإضافة', msg);
  }
  if (cmd === 'ban') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    ban(args[0] || '', true);
    return reply(sock, jid, 'تم الحظر', msg);
  }
  if (cmd === 'unban') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    ban(args[0] || '', false);
    return reply(sock, jid, 'تم رفع الحظر', msg);
  }

  // —— مشرفين ——
  if (cmd === 'tagall') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات فقط', msg);
    try {
      const meta = await sock.groupMetadata(jid);
      const mentions = meta.participants.map(p => p.id);
      const text = (args.join(' ') || 'منشن') + '\n\n' + mentions.map(m => '@' + m.split('@')[0]).join(' ');
      await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    } catch (e) {
      return reply(sock, jid, 'فشل المنشن', msg);
    }
    return true;
  }
  if (cmd === 'kick' || cmd === 'promote' || cmd === 'demote') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!target) return reply(sock, jid, 'منشن عضو أو رد على رسالته', msg);
    try {
      const action = cmd === 'kick' ? 'remove' : cmd === 'promote' ? 'promote' : 'demote';
      await sock.groupParticipantsUpdate(jid, [target], action);
      return reply(sock, jid, 'تم: ' + cmd, msg);
    } catch {
      return reply(sock, jid, 'فشل — تأكد إن البوت مشرف', msg);
    }
  }
  if (cmd === 'warn') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || args[0];
    if (!target) return reply(sock, jid, 'منشن العضو', msg);
    const tu = user(target);
    tu.warn = (tu.warn || 0) + 1;
    return reply(sock, jid, `تحذير ${tu.warn}/3`, msg);
  }
  if (cmd === 'unwarn') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || args[0];
    if (!target) return reply(sock, jid, 'منشن العضو', msg);
    const tu = user(target);
    tu.warn = 0;
    return reply(sock, jid, 'تم تصفير التحذيرات', msg);
  }
  if (cmd === 'antilink') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    const on = (args[0] || '').toLowerCase() === 'on';
    setGroup(jid, 'antilink', on);
    return reply(sock, jid, 'antilink: ' + (on ? 'ON' : 'OFF'), msg);
  }
  if (cmd === 'welcome') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    const on = (args[0] || '').toLowerCase() !== 'off';
    setGroup(jid, 'welcome', on);
    return reply(sock, jid, 'welcome: ' + (on ? 'ON' : 'OFF'), msg);
  }
  if (cmd === 'link') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      const code = await sock.groupInviteCode(jid);
      return reply(sock, jid, 'https://chat.whatsapp.com/' + code, msg);
    } catch {
      return reply(sock, jid, 'فشل جلب الرابط', msg);
    }
  }
  if (cmd === 'setname') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      await sock.groupUpdateSubject(jid, args.join(' '));
      return reply(sock, jid, 'تم تغيير الاسم', msg);
    } catch {
      return reply(sock, jid, 'فشل', msg);
    }
  }
  if (cmd === 'setdesc') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      await sock.groupUpdateDescription(jid, args.join(' '));
      return reply(sock, jid, 'تم تغيير الوصف', msg);
    } catch {
      return reply(sock, jid, 'فشل', msg);
    }
  }

  // —— أعضاء ——
  if (cmd === 'ping') {
    const t = Date.now();
    await reply(sock, jid, 'pong ' + (Date.now() - t) + 'ms', msg);
    return true;
  }
  if (cmd === 'profile') {
    return reply(sock, jid, `*بروفايل*\nالاسم: ${u.name}\nنقاط: ${u.points}\nXP: ${u.xp}\nلفل: ${u.level}\nبنك: ${u.bank}`, msg);
  }
  if (cmd === 'points') return reply(sock, jid, 'نقاطك: ' + (u.points || 0), msg);
  if (cmd === 'daily') {
    const now = Date.now();
    if (u.daily && now - u.daily < 86400000) return reply(sock, jid, 'خدت اليومية النهاردة', msg);
    u.daily = now;
    addPoints(sender, 50);
    return reply(sock, jid, 'تم +50 نقطة', msg);
  }
  if (cmd === 'rank') return reply(sock, jid, `لفل ${u.level} | XP ${u.xp}`, msg);
  if (cmd === 'nick') {
    const nick = args.join(' ');
    if (!nick) return reply(sock, jid, 'اكتب اللقب', msg);
    u.name = nick;
    return reply(sock, jid, 'تم: ' + nick, msg);
  }
  if (cmd === 'owner') return reply(sock, jid, '*الملاك*\nVITAN — 01205872535\nKANEKI — 01064875257', msg);
  if (cmd === 'bot') return reply(sock, jid, `*${config.botName}*\nالإصدار: ${config.version}\nالبادئة: . ! /\nVITAN × KANEKI`, msg);
  if (cmd === 'runtime') {
    const s = process.uptime();
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return reply(sock, jid, `التشغيل: ${h}س ${m}د ${sec}ث`, msg);
  }
  if (cmd === 'id') {
    const own = isOwner(sender);
    return reply(sock, jid, `JID: ${sender}\nChat: ${jid}\nNum: ${num(sender)}\nOwner: ${own ? 'YES (' + ownerLabel(sender) + ')' : 'NO'}\nDev: ${isDev(sender) ? 'YES' : 'NO'}`, msg);
  }

  // —— وسائط ——
  if (['yt', 'tiktok', 'ig', 'fb', 'play', 'video', 'song'].includes(cmd)) {
    let url = args[0] || '';
    const query = args.join(' ').trim();
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!url || !/^https?:\/\//i.test(url)) {
      const q = ctx?.quotedMessage;
      const qt = q?.conversation || q?.extendedTextMessage?.text || '';
      const m = qt.match(/https?:\/\/\S+/i);
      if (m) url = m[0];
    }
    const audioOnly = cmd === 'play' || cmd === 'song';
    const isUrl = url && /^https?:\/\//i.test(url);

    if (!isUrl && audioOnly && query) {
      await reply(sock, jid, 'جاري البحث عن: ' + query, msg);
      try {
        if (!(await hasYtDlp())) return reply(sock, jid, 'ثبّت: pkg install python ffmpeg && pip install -U yt-dlp', msg);
        const file = await searchAndDownload(query, { audioOnly: true });
        const buf = fs.readFileSync(file.path);
        await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
        unlinkSafe(file.path);
      } catch (e) {
        return reply(sock, jid, 'فشل البحث/التحميل: ' + String(e.message || '').slice(0, 100), msg);
      }
      return true;
    }

    if (!isUrl) return reply(sock, jid, `مثال:\n.${cmd} https://...\nأو: .play اسم الأغنية`, msg);

    await reply(sock, jid, 'جاري التحميل...', msg);
    try {
      if (!(await hasYtDlp())) return reply(sock, jid, 'ثبّت yt-dlp و ffmpeg', msg);
      const file = await downloadUrl(url, { audioOnly });
      const buf = fs.readFileSync(file.path);
      if (file.type === 'video') await sock.sendMessage(jid, { video: buf, caption: file.title || 'تم', mimetype: 'video/mp4' }, { quoted: msg });
      else if (file.type === 'audio') await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg' }, { quoted: msg });
      else if (file.type === 'image') await sock.sendMessage(jid, { image: buf, caption: file.title || '' }, { quoted: msg });
      else await sock.sendMessage(jid, { document: buf, fileName: path.basename(file.path), mimetype: 'application/octet-stream' }, { quoted: msg });
      unlinkSafe(file.path);
    } catch (e) {
      return reply(sock, jid, 'فشل التحميل: ' + String(e.message || '').slice(0, 120), msg);
    }
    return true;
  }

  if (cmd === 'sticker' || cmd === 's' || cmd === 'ملصق') {
    try {
      let target = null;
      if (msg.message?.imageMessage || msg.message?.videoMessage) target = msg;
      else {
        const q = getQuoted(msg);
        if (q && (q.message?.imageMessage || q.message?.videoMessage || q.message?.stickerMessage)) target = q;
      }
      if (!target) return reply(sock, jid, 'ابعت صورة مع التعليق .sticker\nأو رد على صورة واكتب .sticker', msg);
      await reply(sock, jid, 'جاري التحويل لملصق...', msg);
      await makeSticker(sock, msg, target);
    } catch (e) {
      return reply(sock, jid, 'فشل الملصق: ' + String(e.message || '').slice(0, 100), msg);
    }
    return true;
  }
  if (cmd === 'toimg' || cmd === 'لصورة') {
    try {
      let target = null;
      if (msg.message?.stickerMessage) target = msg;
      else {
        const q = getQuoted(msg);
        if (q?.message?.stickerMessage) target = q;
      }
      if (!target) return reply(sock, jid, 'رد على ملصق واكتب .toimg', msg);
      await reply(sock, jid, 'جاري التحويل لصورة...', msg);
      await stickerToImage(sock, msg, target);
    } catch (e) {
      return reply(sock, jid, 'فشل التحويل: ' + String(e.message || '').slice(0, 100), msg);
    }
    return true;
  }

  // —— AI ——
  if (['ai', 'gemini', 'grok', 'gpt', 'eren', 'itachi', 'luffy', 'mikasa'].includes(cmd)) {
    const q = args.join(' ');
    if (!q) return reply(sock, jid, 'اكتب السؤال بعد الأمر', msg);
    await reply(sock, jid, 'جاري التفكير...', msg);
    let ans = null;
    if (cmd === 'grok') ans = await aiGrok(q);
    else {
      const personas = {
        eren: 'You are Eren Yeager. Reply in Arabic briefly in character: ',
        itachi: 'You are Itachi Uchiha. Reply in Arabic briefly in character: ',
        luffy: 'You are Monkey D. Luffy. Reply in Arabic briefly in character: ',
        mikasa: 'You are Mikasa Ackerman. Reply in Arabic briefly in character: '
      };
      const prompt = (personas[cmd] || '') + q;
      ans = await aiGemini(prompt);
      if (!ans) ans = await aiGrok(prompt);
    }
    return reply(sock, jid, ans || 'ماقدرتش أرد — راجع النت أو مفاتيح config.js', msg);
  }

  // —— ألعاب ——
  if (cmd === 'rps') {
    const map = { 'حجر': 'rock', 'ورقة': 'paper', 'مقص': 'scissors', rock: 'rock', paper: 'paper', scissors: 'scissors' };
    const userC = map[(args[0] || '').toLowerCase()];
    if (!userC) return reply(sock, jid, 'مثال: .rps حجر', msg);
    const opts = ['rock', 'paper', 'scissors'];
    const botC = opts[Math.floor(Math.random() * 3)];
    let res = 'تعادل';
    if (userC === botC) res = 'تعادل';
    else if ((userC === 'rock' && botC === 'scissors') || (userC === 'paper' && botC === 'rock') || (userC === 'scissors' && botC === 'paper')) res = 'فوزك';
    else res = 'خسارتك';
    return reply(sock, jid, `أنت: ${userC}\nالبوت: ${botC}\n${res}`, msg);
  }
  if (cmd === 'guess') {
    const n = parseInt(args[0], 10);
    const secret = 1 + Math.floor(Math.random() * 10);
    if (!n) return reply(sock, jid, 'خمّن رقم من 1 لـ 10: .guess 5', msg);
    return reply(sock, jid, n === secret ? 'صح! 🎉' : `غلط، الرقم كان ${secret}`, msg);
  }
  if (cmd === 'slots') {
    const sym = ['🍒', '🍋', '⭐', '💎', '7️⃣'];
    const a = sym[Math.floor(Math.random() * sym.length)];
    const b = sym[Math.floor(Math.random() * sym.length)];
    const c = sym[Math.floor(Math.random() * sym.length)];
    const win = a === b && b === c;
    if (win) addPoints(sender, 30);
    return reply(sock, jid, `${a} | ${b} | ${c}\n${win ? 'فوز +30' : 'حاول تاني'}`, msg);
  }
  if (cmd === 'dice') return reply(sock, jid, '🎲 ' + (1 + Math.floor(Math.random() * 6)), msg);
  if (cmd === 'coin') return reply(sock, jid, Math.random() > 0.5 ? 'ملك' : 'كتابة', msg);
  if (cmd === 'xo') return reply(sock, jid, 'استخدم .rps حالياً', msg);

  // —— أدوات ——
  if (cmd === 'weather' || cmd === 'طقس') {
    const city = args.join(' ') || 'Cairo';
    await reply(sock, jid, 'جاري جلب الطقس...', msg);
    const w = await getWeather(city);
    return reply(sock, jid, w || 'ماقدرتش أجيب الطقس — جرّب: Cairo أو London أو اسم المدينة', msg);
  }
  if (cmd === 'search' || cmd === 'بحث') {
    const q = args.join(' ');
    if (!q) return reply(sock, jid, 'مثال: .search القاهرة', msg);
    await reply(sock, jid, 'جاري البحث...', msg);
    const res = await webSearch(q);
    return reply(sock, jid, res || 'مفيش نتائج واضحة لهذا البحث.\nجرّب كلمات أوضح أو اسم معروف.', msg);
  }
  if (cmd === 'lyrics' || cmd === 'كلمات') {
    const q = args.join(' ');
    if (!q) return reply(sock, jid, 'مثال: .lyrics Adele - Hello', msg);
    await reply(sock, jid, 'جاري جلب الكلمات...', msg);
    const ly = await getLyrics(q);
    return reply(sock, jid, ly || 'ما لقتش الكلمات.\nجرّب: .lyrics Adele - Hello\nأو: .lyrics Artist - Song', msg);
  }
  if (cmd === 'translate' || cmd === 'ترجم') {
    const q = args.join(' ');
    if (!q) return reply(sock, jid, 'مثال: .translate hello', msg);
    await reply(sock, jid, 'جاري الترجمة...', msg);
    const ans = await aiGemini('Translate to Arabic if English, or English if Arabic. Only translation:\n' + q);
    return reply(sock, jid, ans || 'فشلت الترجمة', msg);
  }
  if (cmd === 'calc') {
    try {
      const expr = args.join('').replace(/[^0-9+\-*/().]/g, '');
      if (!expr) return reply(sock, jid, 'مثال: .calc 2+2', msg);
      const v = Function('"use strict"; return (' + expr + ')')();
      return reply(sock, jid, '= ' + v, msg);
    } catch {
      return reply(sock, jid, 'تعبير غير صالح', msg);
    }
  }
  if (cmd === 'short') return reply(sock, jid, args[0] || 'حط رابط', msg);
  if (cmd === 'qr') return reply(sock, jid, 'نص الـ QR: ' + (args.join(' ') || 'اكتب نص'), msg);
  if (cmd === 'base64') {
    const t = args.join(' ');
    if (!t) return reply(sock, jid, 'اكتب نص', msg);
    return reply(sock, jid, Buffer.from(t).toString('base64'), msg);
  }

  // —— بنك ——
  if (cmd === 'balance' || cmd === 'bank') {
    return reply(sock, jid, `المحفظة: ${u.points || 0}\nالبنك: ${u.bank || 0}`, msg);
  }
  if (cmd === 'deposit') {
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1) return reply(sock, jid, 'مثال: .deposit 50', msg);
    if ((u.points || 0) < amount) return reply(sock, jid, 'رصيدك مش كافي', msg);
    u.points -= amount;
    u.bank = (u.bank || 0) + amount;
    return reply(sock, jid, `تم إيداع ${amount}\nالبنك: ${u.bank}`, msg);
  }
  if (cmd === 'withdraw') {
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1) return reply(sock, jid, 'مثال: .withdraw 50', msg);
    if ((u.bank || 0) < amount) return reply(sock, jid, 'البنك مش كافي', msg);
    u.bank -= amount;
    u.points = (u.points || 0) + amount;
    return reply(sock, jid, `تم سحب ${amount}\nالمحفظة: ${u.points}`, msg);
  }
  if (cmd === 'pay') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0];
    const amount = parseInt(args.find(a => /^\d+$/.test(a)) || args[1], 10);
    if (!target || !amount) return reply(sock, jid, 'مثال: .pay @user 20', msg);
    if ((u.points || 0) < amount) return reply(sock, jid, 'رصيدك مش كافي', msg);
    u.points -= amount;
    addPoints(target, amount);
    return reply(sock, jid, `تم تحويل ${amount}`, msg);
  }
  if (cmd === 'top') return reply(sock, jid, 'قائمة المتصدرين قريبًا — شوف .profile', msg);

  // —— زخرفة ——
  if (/^z[1-7]$/.test(cmd)) {
    const t = args.join(' ');
    if (!t) return reply(sock, jid, 'اكتب نص بعد الأمر', msg);
    return reply(sock, jid, Z[cmd](t), msg);
  }


  // —— أوامر إضافية MOX F22 ——
  if (cmd === 'hidetag') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات فقط', msg);
    try {
      const meta = await sock.groupMetadata(jid);
      const mentions = meta.participants.map(p => p.id);
      const text = args.join(' ') || '‎';
      await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    } catch { return reply(sock, jid, 'فشل المخفي', msg); }
    return true;
  }
  if (cmd === 'del') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.stanzaId) return reply(sock, jid, 'رد على الرسالة للحذف', msg);
    try {
      await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } });
    } catch { return reply(sock, jid, 'ما قدرتش أحذف', msg); }
    return true;
  }
  if (cmd === 'resetwarn') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || args[0];
    if (!target) return reply(sock, jid, 'منشن العضو', msg);
    const tu = user(target);
    tu.warn = 0;
    return reply(sock, jid, 'تم تصفير التحذيرات', msg);
  }
  if (cmd === 'bye') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    const on = (args[0] || '').toLowerCase() !== 'off';
    setGroup(jid, 'bye', on);
    return reply(sock, jid, 'وداع: ' + (on ? 'ON' : 'OFF'), msg);
  }
  if (cmd === 'leave') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'استخدمه في جروب', msg);
    await reply(sock, jid, 'بطلع...', msg);
    try { await sock.groupLeave(jid); } catch {}
    return true;
  }
  if (cmd === 'errors') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    return reply(sock, jid, 'مفيش أخطاء مسجلة حالياً', msg);
  }
  if (cmd === 'clearcache') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    try {
      const tmp = path.join(process.cwd(), 'tmp');
      if (fs.existsSync(tmp)) for (const f of fs.readdirSync(tmp)) try { fs.unlinkSync(path.join(tmp, f)); } catch {}
    } catch {}
    return reply(sock, jid, 'تم مسح الكاش', msg);
  }
  if (cmd === 'private') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    return reply(sock, jid, 'التحكم بالوصول عبر الحظر والموافقة', msg);
  }
  if (cmd === 'selfpromote') {
    if (!allowDev) return reply(sock, jid, 'للمطورين', msg);
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'في جروب', msg);
    try {
      await sock.groupParticipantsUpdate(jid, [sender], 'promote');
      return reply(sock, jid, 'تم', msg);
    } catch { return reply(sock, jid, 'فشل — البوت لازم مشرف', msg); }
  }
  if (cmd === 'revoke') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      const code = await sock.groupRevokeInvite(jid);
      return reply(sock, jid, 'رابط جديد:\nhttps://chat.whatsapp.com/' + code, msg);
    } catch { return reply(sock, jid, 'فشل تجديد الرابط', msg); }
  }
  if (cmd === 'grouplock') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      return reply(sock, jid, 'تم قفل الشات', msg);
    } catch { return reply(sock, jid, 'فشل القفل', msg); }
  }
  if (cmd === 'groupopen') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      return reply(sock, jid, 'تم فتح الشات', msg);
    } catch { return reply(sock, jid, 'فشل الفتح', msg); }
  }
  if (cmd === 'setnick') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0];
    const nick = args.filter(a => !a.startsWith('@')).join(' ');
    if (!target || !nick) return reply(sock, jid, 'منشن العضو واكتب اللقب', msg);
    user(target).nick = nick;
    return reply(sock, jid, 'تم التلقيب: ' + nick, msg);
  }
  if (cmd === 'getnick') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || args[0] || sender;
    return reply(sock, jid, 'اللقب: ' + (user(target).nick || 'مفيش'), msg);
  }
  if (cmd === 'mynick') return reply(sock, jid, 'لقبك: ' + (user(sender).nick || 'مفيش'), msg);
  if (cmd === 'afk') {
    user(sender).afk = args.join(' ') || 'مش موجود';
    return reply(sock, jid, 'اختفاء: ' + user(sender).afk, msg);
  }
  if (cmd === 'check') {
    const n = (args[0] || '').replace(/\D/g, '');
    if (n.length < 9) return reply(sock, jid, 'اكتب الرقم', msg);
    try {
      const res = await sock.onWhatsApp(n + '@s.whatsapp.net');
      const ok = Array.isArray(res) ? res[0]?.exists : res?.exists;
      return reply(sock, jid, ok ? 'على واتساب ✓' : 'مش مسجل/مش ظاهر', msg);
    } catch { return reply(sock, jid, 'تعذر الفحص', msg); }
  }
  if (cmd === 'ship') return reply(sock, jid, 'نسبة التوافق: ' + Math.floor(Math.random() * 101) + '% 💕', msg);
  if (cmd === 'pick') {
    if (!jid.endsWith('@g.us')) return reply(sock, jid, 'للجروبات', msg);
    try {
      const meta = await sock.groupMetadata(jid);
      const ps = meta.participants.map(p => p.id);
      const pick = ps[Math.floor(Math.random() * ps.length)];
      await sock.sendMessage(jid, { text: 'اختيار: @' + pick.split('@')[0], mentions: [pick] }, { quoted: msg });
    } catch { return reply(sock, jid, 'فشل', msg); }
    return true;
  }
  if (cmd === 'slap') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!target) return reply(sock, jid, 'منشن أو رد', msg);
    await sock.sendMessage(jid, { text: 'صفع @' + target.split('@')[0] + ' 👋', mentions: [target] }, { quoted: msg });
    return true;
  }
  if (cmd === 'codegame') {
    user(sender).secretCode = String(1000 + Math.floor(Math.random() * 9000));
    return reply(sock, jid, 'خمن شفرة 4 أرقام بـ .خمن', msg);
  }
  if (cmd === 'secret') {
    const words = ['قمر', 'نار', 'سماء', 'بحر', 'حلم', 'سر'];
    user(sender).secretWord = words[Math.floor(Math.random() * words.length)];
    return reply(sock, jid, 'كلمة سر اتحددت — خمن في الشات', msg);
  }
  if (cmd === 'reverse') {
    const s = args.join(' ');
    if (!s) return reply(sock, jid, 'اكتب نص', msg);
    return reply(sock, jid, [...s].reverse().join(''), msg);
  }
  if (cmd === 'password') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#';
    let out = '';
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return reply(sock, jid, 'باسورد: `' + out + '`', msg);
  }
  if (cmd === 'quote') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const q = ctx?.quotedMessage;
    const qt = q?.conversation || q?.extendedTextMessage?.text || '';
    if (!qt) return reply(sock, jid, 'رد على رسالة', msg);
    return reply(sock, jid, '❝ ' + qt + ' ❞', msg);
  }
  if (cmd === 'jid') {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || ctx?.participant || sender;
    return reply(sock, jid, 'JID:\n' + target, msg);
  }
  if (cmd === 'bankname') {
    const name = args.join(' ');
    if (!name) return reply(sock, jid, 'اكتب الاسم', msg);
    user(sender).bankName = name;
    return reply(sock, jid, 'اسم الحساب: ' + name, msg);
  }
  if (cmd === 'info') {
    return reply(sock, jid, `*${config.botName}*\nv${config.version}\n15 قسم | ~105 أمر\nKANEKI × VITAN\n. ! /`, msg);
  }
  if (cmd === 'server') {
    const mem = process.memoryUsage();
    const up = process.uptime();
    return reply(sock, jid, `Uptime: ${Math.floor(up/3600)}س ${Math.floor((up%3600)/60)}د\nRAM: ${Math.round(mem.rss/1024/1024)}MB`, msg);
  }
  if (cmd === 'steal' || cmd === 'pack') {
    return reply(sock, jid, 'حزمة الملصقات: KANEKI | MOX F22\nللسرقة: رد على ملصق + .ملصق', msg);
  }
  if (cmd === 'tovn' || cmd === 'tovideo' || cmd === 'square' || cmd === 'compress') {
    return reply(sock, jid, 'الأمر جاهز — رد على الوسائط (يحتاج ffmpeg على الجهاز)', msg);
  }
  if (/^z([1-9]|1[01])$/.test(cmd)) {
    const styles = {
      1: s => s.split('').join(' '),
      2: s => [...s].map(c => c + '\u0336').join(''),
      3: s => [...s].map(c => c + '\u0489').join(''),
      4: s => '『' + s + '』',
      5: s => '【' + s + '】',
      6: s => '✦ ' + s.split('').join(' ✦ ') + ' ✦',
      7: s => s.toUpperCase().split('').join('\u30fb'),
      8: s => '\u2591' + [...s].join('\u2591') + '\u2591',
      9: s => '⟦' + s + '⟧',
      10: s => '◈ ' + s + ' ◈',
      11: s => '『' + [...s].join('\u2502') + '』'
    };
    const textIn = args.join(' ');
    if (!textIn) return reply(sock, jid, 'اكتب نص بعد الأمر', msg);
    const fn = styles[cmd.slice(1)] || (x => x);
    return reply(sock, jid, fn(textIn), msg);
  }


  return false;
}
