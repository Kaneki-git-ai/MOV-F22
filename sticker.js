import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '..', 'media', 'tmp');

function ensureTmp() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
}

async function toWebp(inputPath) {
  ensureTmp();
  const out = path.join(TMP, 'st_' + Date.now() + '.webp');
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-vcodec', 'libwebp', '-lossless', '0', '-compression_level', '6',
      '-q:v', '50', '-loop', '0', '-an', '-vsync', '0', out
    ], { timeout: 60000 });
    if (fs.existsSync(out)) return out;
  } catch (e) {
    console.log('ffmpeg webp:', e.message);
  }
  return null;
}

export async function makeSticker(sock, msg, targetMsg) {
  ensureTmp();
  const buffer = await downloadMediaMessage(
    targetMsg, 'buffer', {},
    { reuploadRequest: sock.updateMediaMessage }
  );
  if (!buffer?.length) throw new Error('empty media');

  const isWebp = buffer.length > 12 && buffer[0] === 0x52 && buffer[1] === 0x49;
  const inFile = path.join(TMP, 'in_' + Date.now() + (isWebp ? '.webp' : '.jpg'));
  fs.writeFileSync(inFile, buffer);

  let webpPath = inFile;
  if (!isWebp) {
    const converted = await toWebp(inFile);
    if (converted) webpPath = converted;
  }

  const webpBuf = fs.readFileSync(webpPath);
  await sock.sendMessage(msg.key.remoteJid, { sticker: webpBuf }, { quoted: msg });

  try { fs.unlinkSync(inFile); } catch {}
  try { if (webpPath !== inFile) fs.unlinkSync(webpPath); } catch {}
  return true;
}

export async function stickerToImage(sock, msg, targetMsg) {
  ensureTmp();
  const buffer = await downloadMediaMessage(
    targetMsg, 'buffer', {},
    { reuploadRequest: sock.updateMediaMessage }
  );
  if (!buffer?.length) throw new Error('empty sticker');

  const webpPath = path.join(TMP, 'sticker_' + Date.now() + '.webp');
  const outPath = path.join(TMP, 'img_' + Date.now() + '.png');
  fs.writeFileSync(webpPath, buffer);

  let imgBuf = buffer;
  try {
    await execFileAsync('ffmpeg', ['-y', '-i', webpPath, outPath], { timeout: 30000 });
    if (fs.existsSync(outPath)) imgBuf = fs.readFileSync(outPath);
  } catch {}

  await sock.sendMessage(msg.key.remoteJid, {
    image: imgBuf,
    caption: '🎧 ɴᴏᴡ ꜱʜᴜᴛ ᴛʜᴇ ʜᴇʟʟ ᴜᴘ'
  }, { quoted: msg });

  try { fs.unlinkSync(webpPath); } catch {}
  try { fs.unlinkSync(outPath); } catch {}
  return true;
}
