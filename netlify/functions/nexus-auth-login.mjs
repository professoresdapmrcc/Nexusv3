import {
  getNexusAuthConfig,
  redirect,
  serializeCookie,
  nexusAuthCookies,
} from "./nexus-auth-core.mjs";
import { NEXUS_LOGIN_API_ENABLED } from "./nexus-auth-state.mjs";

export async function handler() {
  if (!NEXUS_LOGIN_API_ENABLED) {
    return redirect("/login.html?motivo=indisponivel");
  }

  try {
    const config = getNexusAuthConfig();
    const { authorizationUrl, transaction } = await config.atlas.beginLogin();
    const encryptedTransaction = await config.transactionCodec.seal(transaction);

    return redirect(authorizationUrl, [
      serializeCookie(nexusAuthCookies.TRANSACTION_COOKIE, encryptedTransaction, {
        maxAge: 10 * 60,
        secure: config.secureCookies,
      }),
    ]);
  } catch (error) {
    console.error("Não foi possível iniciar Login com RCCSystem.", { message: error?.message });
    return redirect("/login.html?erro=indisponivel");
  }
}
