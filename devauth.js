import { num, isOwner } from '../utils/helpers.js';
import { pendingAdd, pendingList, pendingRemove } from '../database/db.js';

const extraDevs = new Set();

function matchExtra(n) {
  const d = String(n || '').replace(/\D/g, '');
  if (!d) return false;
  if (extraDevs.has(d)) return true;
  for (const e of extraDevs) {
    const ed = String(e).replace(/\D/g, '');
    if (d === ed || (d.length >= 9 && ed.length >= 9 && d.slice(-9) === ed.slice(-9))) return true;
  }
  return false;
}

export function isDev(jid) {
  if (!jid) return false;
  if (isOwner(jid)) return true;
  return matchExtra(num(jid));
}

export function approveDev(phone) {
  const n = String(phone).replace(/\D/g, '');
  if (!n) return;
  extraDevs.add(n);
  if (n.startsWith('20') && n.length > 2) extraDevs.add('0' + n.slice(2));
  if (n.startsWith('0')) extraDevs.add('20' + n.slice(1));
  pendingRemove(n);
  console.log('[APPROVE DEV]', n);
}

export function rejectDev(phone) {
  pendingRemove(String(phone).replace(/\D/g, ''));
}

export function requestDev(jid, name) {
  if (isDev(jid)) return 'already';
  pendingAdd(num(jid), name || 'User');
  return 'pending';
}

export function listPending() {
  return pendingList();
}
