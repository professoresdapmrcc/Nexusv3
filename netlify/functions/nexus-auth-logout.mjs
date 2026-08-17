import {
  clearCookie,
  getNexusAuthConfig,
  json,
  nexusAuthCookies,
  requireSameOrigin,
} from "./nexus-auth-core.mjs";

export async function handler(event) {
  try {
    const config = getNexusAuthConfig();
    if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
    if (!requireSameOrigin(event, config.appUrl)) return json(403, { error: "invalid_origin" });

    return json(200, { ok: true }, {
      cookies: [
        clearCookie(nexusAuthCookies.TRANSACTION_COOKIE, config.secureCookies),
        clearCookie(nexusAuthCookies.BRIDGE_COOKIE, config.secureCookies),
      ],
    });
  } catch {
    return json(200, { ok: true });
  }
}
