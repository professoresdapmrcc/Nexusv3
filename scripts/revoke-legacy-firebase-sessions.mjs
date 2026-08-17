import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const execute = process.argv.includes('--execute');
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurada.');

const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth(app);
let pageToken;
let count = 0;

do {
  const page = await auth.listUsers(1_000, pageToken);
  count += page.users.length;
  if (execute) {
    await Promise.all(page.users.map((user) => auth.revokeRefreshTokens(user.uid)));
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(execute
  ? `${count} sessões Firebase foram revogadas.`
  : `Dry run: ${count} usuários seriam revogados. Use --execute para confirmar.`);
