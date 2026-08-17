import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurada.');

function normalizeNickname(value) {
  return String(value || '').trim().normalize('NFC').toLocaleLowerCase('pt-BR');
}

const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(raw)) });
const users = await getFirestore(app).collection('users').get();
const byNickname = new Map();
let missingNickname = 0;

for (const user of users.docs) {
  const nickname = normalizeNickname(user.data().name || user.data().nick);
  if (!nickname) {
    missingNickname += 1;
    continue;
  }
  byNickname.set(nickname, [...(byNickname.get(nickname) || []), user.id]);
}

const duplicates = [...byNickname.entries()]
  .filter(([, userIds]) => userIds.length > 1)
  .map(([nickname, userIds]) => ({ nickname, userIds }));

console.table({
  totalProfiles: users.size,
  withoutNickname: missingNickname,
  duplicateNormalizedNicknames: duplicates.length,
});

if (duplicates.length > 0) {
  console.table(duplicates);
  process.exitCode = 2;
}
