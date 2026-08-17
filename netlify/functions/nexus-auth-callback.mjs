import {
  clearCookie,
  createBridgeTicket,
  getNexusAuthConfig,
  isActiveNexusProfile,
  nexusAuthCookies,
  parseCookies,
  redirect,
  resolveNexusIdentity,
  serializeCookie,
} from "./nexus-auth-core.mjs";
import { NEXUS_LOGIN_API_ENABLED } from "./nexus-auth-state.mjs";

function callbackUrl(event, appUrl) {
  const url = new URL("/api/auth/callback", appUrl);
  if (event.rawQuery) {
    url.search = event.rawQuery;
  } else if (event.queryStringParameters) {
    url.search = new URLSearchParams(event.queryStringParameters).toString();
  }
  return url;
}

export async function handler(event) {
  if (!NEXUS_LOGIN_API_ENABLED) {
    return redirect("/login.html?motivo=indisponivel");
  }

  let config;
  try {
    config = getNexusAuthConfig();
    const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie);
    const callback = callbackUrl(event, config.appUrl);
    const encryptedTransaction = cookies[nexusAuthCookies.TRANSACTION_COOKIE];
    const transaction = encryptedTransaction
      ? await config.transactionCodec.open(encryptedTransaction)
      : undefined;

    if (!transaction) {
      return redirect("/login.html?erro=expirado", [
        clearCookie(nexusAuthCookies.TRANSACTION_COOKIE, config.secureCookies),
      ]);
    }

    const cleanup = [clearCookie(nexusAuthCookies.TRANSACTION_COOKIE, config.secureCookies)];
    if (callback.searchParams.get("error") === "access_denied") {
      return redirect("/login.html?erro=sem-acesso", cleanup);
    }

    const login = await config.atlas.completeLogin(callback, transaction);
    const identity = await resolveNexusIdentity({
      subject: login.identity.subject,
      username: login.identity.username,
    });

    if (identity.status === "ambiguous") {
      return redirect("/login.html?erro=vinculo", cleanup);
    }
    if (!isActiveNexusProfile(identity.profile)) {
      return redirect("/login.html?erro=sem-acesso", cleanup);
    }

    const ticket = createBridgeTicket(identity.firebaseUid, config.bridgeSecret);
    return redirect("/login.html?oidc=complete", [
      ...cleanup,
      serializeCookie(nexusAuthCookies.BRIDGE_COOKIE, ticket, {
        maxAge: 60,
        secure: config.secureCookies,
      }),
    ]);
  } catch (error) {
    console.error("Falha no callback do Login com RCCSystem.", { message: error?.message });
    const secureCookies = config?.secureCookies ?? true;
    return redirect("/login.html?erro=oidc", [
      clearCookie(nexusAuthCookies.TRANSACTION_COOKIE, secureCookies),
      clearCookie(nexusAuthCookies.BRIDGE_COOKIE, secureCookies),
    ]);
  }
}
