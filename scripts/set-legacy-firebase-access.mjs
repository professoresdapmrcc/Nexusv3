import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurada.');
  return JSON.parse(raw);
}

const command = process.argv[2];
if (!['status', 'allow', 'block'].includes(command)) {
  console.error('Uso: node scripts/set-legacy-firebase-access.mjs <status|allow|block>');
  process.exitCode = 1;
} else {
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount()) });
  const configRef = getFirestore(app).collection('nexus_config').doc('auth');

  if (command === 'status') {
    const config = await configRef.get();
    console.log(config.exists ? config.data() : { allowLegacyFirebase: true, source: 'padrão de migração' });
  } else {
    const allowLegacyFirebase = command === 'allow';
    await configRef.set({
      allowLegacyFirebase,
      updatedAt: new Date(),
      updatedBy: 'migration-script',
    }, { merge: true });
    console.log(`Login Firebase legado ${allowLegacyFirebase ? 'liberado' : 'bloqueado'} nas regras Firestore.`);
  }
}
