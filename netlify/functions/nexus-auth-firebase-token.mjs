import {
  clearCookie,
  consumeBridgeTicket,
  createFirebaseCustomToken,
  getNexusAuthConfig,
  getFirebaseServices,
  isActiveNexusProfile,
  json,
  nexusAuthCookies,
  parseCookies,
  requireSameOrigin,
} from "./nexus-auth-core.mjs";
import { NEXUS_LOGIN_API_ENABLED } from "./nexus-auth-state.mjs";

export async function handler(event) {
  if (!NEXUS_LOGIN_API_ENABLED) {
    return json(503, { error: "login_temporarily_disabled" });
  }

  let config;
  try {
    config = getNexusAuthConfig();
    if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
    if (!requireSameOrigin(event, config.appUrl)) return json(403, { error: "invalid_origin" });

    const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie);
    const firebaseUid = consumeBridgeTicket(
      cookies[nexusAuthCookies.BRIDGE_COOKIE],
      config.bridgeSecret,
    );
    const clear = [clearCookie(nexusAuthCookies.BRIDGE_COOKIE, config.secureCookies)];
    if (!firebaseUid) return json(401, { error: "bridge_expired" }, { cookies: clear });

    const { db } = getFirebaseServices();
    const profile = await db.collection("users").doc(firebaseUid).get();
    if (!profile.exists || !isActiveNexusProfile(profile.data())) {
      return json(403, { error: "account_inactive" }, { cookies: clear });
    }

    const customToken = await createFirebaseCustomToken(firebaseUid);
    return json(200, { customToken }, { cookies: clear });
  } catch (error) {
    console.error("Falha ao criar sessão Nexus.", { message: error?.message });
    return json(503, { error: "session_unavailable" });
  }
}
