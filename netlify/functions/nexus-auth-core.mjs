import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { createAtlasServer } from "@policiarcc/rccsystem-atlas-oidc/server";
import { createEncryptedTransactionCodec } from "@policiarcc/rccsystem-atlas-oidc/transaction";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const TRANSACTION_COOKIE = "nexus_oidc_transaction";
const BRIDGE_COOKIE = "nexus_auth_bridge";
const BRIDGE_TTL_MS = 60 * 1000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável ${name} não configurada.`);
  return value;
}

function normalizeAppUrl(value) {
  const url = new URL(value);
  if (url.pathname !== "/") {
    throw new Error("NEXUS_APP_URL deve conter apenas a origem do Nexus.");
  }
  return url.origin;
}

function trustedEndpointOrigins() {
  return (process.env.ATLAS_OIDC_TRUSTED_ENDPOINT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getNexusAuthConfig() {
  const appUrl = normalizeAppUrl(requiredEnv("NEXUS_APP_URL"));
  const transactionSecret = requiredEnv("ATLAS_OIDC_TRANSACTION_SECRET");

  return {
    appUrl,
    bridgeSecret: requiredEnv("NEXUS_AUTH_BRIDGE_SECRET"),
    atlas: createAtlasServer({
      issuer: requiredEnv("ATLAS_OIDC_ISSUER"),
      clientId: requiredEnv("ATLAS_OIDC_CLIENT_ID"),
      clientSecret: requiredEnv("ATLAS_OIDC_CLIENT_SECRET"),
      redirectUri: `${appUrl}/api/auth/callback`,
      scopes: ["openid", "profile_basic"],
      timeoutMs: 5_000,
      trustedEndpointOrigins: trustedEndpointOrigins(),
    }),
    transactionCodec: createEncryptedTransactionCodec(transactionSecret),
    secureCookies: new URL(appUrl).protocol === "https:",
  };
}

function firebaseApp() {
  if (getApps().length > 0) return getApps()[0];

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(requiredEnv("FIREBASE_SERVICE_ACCOUNT_JSON"));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON contém JSON inválido.");
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

export function getFirebaseServices() {
  const app = firebaseApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}

export function parseCookies(header) {
  if (!header) return {};
  return header.split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator <= 0) return cookies;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      // Cookies inválidos são ignorados e o login recomeça de forma segura.
    }
    return cookies;
  }, {});
}

export function serializeCookie(name, value, { maxAge = undefined, secure = true } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join("; ");
}

export function clearCookie(name, secure) {
  return serializeCookie(name, "", { maxAge: 0, secure });
}

export function redirect(location, cookies = []) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
    multiValueHeaders: cookies.length > 0 ? { "Set-Cookie": cookies } : undefined,
    body: "",
  };
}

export function json(statusCode, body, { cookies = [] } = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
    multiValueHeaders: cookies.length > 0 ? { "Set-Cookie": cookies } : undefined,
    body: JSON.stringify(body),
  };
}

export function normalizedNickname(value) {
  return String(value || "").trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

function base64Nickname(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function safeNicknameDocumentId(value) {
  return value.includes("/") ? null : value;
}

function subjectDocumentId(subject) {
  return createHash("sha256").update(subject).digest("hex");
}

async function lookupLegacyCandidates(db, nickname) {
  const candidateIds = new Set();
  const nicknames = db.collection("nicknames");
  const ids = [base64Nickname(nickname), safeNicknameDocumentId(nickname)].filter(Boolean);

  const mappings = await Promise.all(ids.map((id) => nicknames.doc(id).get()));
  for (const mapping of mappings) {
    const uid = mapping.data()?.uid;
    if (mapping.exists && typeof uid === "string" && uid) candidateIds.add(uid);
  }

  if (candidateIds.size > 0) return [...candidateIds];

  // Apenas no primeiro vínculo: o repositório usa índices de nick legados em
  // formatos diferentes. A busca normalizada impede criar uma conta duplicada.
  const users = await db.collection("users").get();
  users.forEach((document) => {
    const data = document.data();
    const userNick = normalizedNickname(data.name || data.nick);
    if (userNick === nickname) candidateIds.add(document.id);
  });

  return [...candidateIds];
}

async function ensureFirebaseUser(auth, uid, { enable = false, displayName } = {}) {
  try {
    const user = await auth.getUser(uid);
    const changes = {};
    if (enable && user.disabled) changes.disabled = false;
    if (displayName && user.displayName !== displayName) changes.displayName = displayName;
    if (Object.keys(changes).length > 0) await auth.updateUser(uid, changes);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    await auth.createUser({ uid, disabled: !enable, displayName });
  }
}

export async function resolveNexusIdentity({ subject, username }) {
  const nickname = normalizedNickname(username);
  if (!subject || !nickname) {
    throw new Error("O RCCSystem não retornou uma identidade utilizável.");
  }

  const { auth, db } = getFirebaseServices();
  const subjectHash = subjectDocumentId(subject);
  const linkRef = db.collection("nexus_identity_links").doc(subjectHash);
  const existingLink = await linkRef.get();

  if (existingLink.exists) {
    const firebaseUid = existingLink.data()?.firebaseUid;
    if (typeof firebaseUid !== "string" || !firebaseUid) {
      throw new Error("Vínculo OIDC inválido.");
    }
    const profile = await db.collection("users").doc(firebaseUid).get();
    if (!profile.exists) throw new Error("Perfil Nexus vinculado não encontrado.");
    await ensureFirebaseUser(auth, firebaseUid, {
      enable: isActiveNexusProfile(profile.data()),
      displayName: username,
    });

    await linkRef.update({ lastAuthenticatedAt: FieldValue.serverTimestamp(), lastUsername: username });
    return { firebaseUid, profile: profile.data(), created: false };
  }

  const candidates = await lookupLegacyCandidates(db, nickname);
  if (candidates.length > 1) {
    await db.collection("nexus_identity_issues").add({
      type: "ambiguous_legacy_nickname",
      subjectHash,
      username,
      candidateUids: candidates,
      createdAt: FieldValue.serverTimestamp(),
      resolvedAt: null,
    });
    return { status: "ambiguous" };
  }

  if (candidates.length === 1) {
    const firebaseUid = candidates[0];
    const profileRef = db.collection("users").doc(firebaseUid);
    const profile = await profileRef.get();
    if (!profile.exists) throw new Error("Perfil Nexus legado não encontrado.");
    await ensureFirebaseUser(auth, firebaseUid, {
      enable: isActiveNexusProfile(profile.data()),
      displayName: username,
    });

    await db.runTransaction(async (transaction) => {
      const currentLink = await transaction.get(linkRef);
      if (currentLink.exists) return;
      transaction.set(linkRef, {
        subjectHash,
        firebaseUid,
        linkedAt: FieldValue.serverTimestamp(),
        lastAuthenticatedAt: FieldValue.serverTimestamp(),
        lastUsername: username,
        source: "legacy_nickname",
      });
      transaction.update(profileRef, {
        oidcSubjectHash: subjectHash,
        oidcUsername: username,
        oidcLinkedAt: FieldValue.serverTimestamp(),
      });
    });

    const refreshedProfile = await profileRef.get();
    return { firebaseUid, profile: refreshedProfile.data(), created: false };
  }

  const firebaseUid = `nexus_${randomUUID().replaceAll("-", "")}`;
  const profileRef = db.collection("users").doc(firebaseUid);
  const nicknameRef = db.collection("nicknames").doc(base64Nickname(nickname));

  await db.runTransaction(async (transaction) => {
    const currentLink = await transaction.get(linkRef);
    if (currentLink.exists) return;

    transaction.set(profileRef, {
      uid: firebaseUid,
      name: username,
      nick: username,
      cargo: "Professor(a)",
      role: "membro",
      // O Atlas só emite o código após validar que a pessoa continua elegível
      // para este cliente OIDC. O Nexus não replica essa regra nem exige
      // aprovação manual para concluir o primeiro acesso.
      status: "Ativo",
      authProvider: "rccsystem_oidc",
      oidcSubjectHash: subjectHash,
      oidcUsername: username,
      oidcLinkedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(nicknameRef, { uid: firebaseUid, nickname, createdAt: FieldValue.serverTimestamp() });
    const plainId = safeNicknameDocumentId(nickname);
    if (plainId) {
      transaction.set(db.collection("nicknames").doc(plainId), { uid: firebaseUid, nickname, createdAt: FieldValue.serverTimestamp() });
    }
    transaction.set(linkRef, {
      subjectHash,
      firebaseUid,
      linkedAt: FieldValue.serverTimestamp(),
      lastAuthenticatedAt: FieldValue.serverTimestamp(),
      lastUsername: username,
      source: "oidc_eligible_registration",
    });
  });

  await ensureFirebaseUser(auth, firebaseUid, { enable: true, displayName: username });
  return { firebaseUid, profile: (await profileRef.get()).data(), created: true };
}

export function isActiveNexusProfile(profile) {
  return normalizedNickname(profile?.status) === "ativo";
}

function signBridgePayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createBridgeTicket(firebaseUid, secret) {
  const payload = Buffer.from(JSON.stringify({
    uid: firebaseUid,
    exp: Date.now() + BRIDGE_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${signBridgePayload(payload, secret)}`;
}

export function consumeBridgeTicket(ticket, secret) {
  if (!ticket || typeof ticket !== "string") return null;
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra) return null;

  const expectedSignature = signBridgePayload(payload, secret);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof decoded?.uid !== "string" ||
      !Number.isSafeInteger(decoded?.exp) ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function createFirebaseCustomToken(firebaseUid) {
  const { auth } = getFirebaseServices();
  const user = await auth.getUser(firebaseUid);
  await auth.setCustomUserClaims(firebaseUid, {
    ...(user.customClaims || {}),
    nexusOidc: true,
  });
  return auth.createCustomToken(firebaseUid, { nexusOidc: true });
}

export function requireSameOrigin(event, appUrl) {
  const origin = event.headers?.origin || event.headers?.Origin;
  return origin === appUrl;
}

export const nexusAuthCookies = { BRIDGE_COOKIE, TRANSACTION_COOKIE };
