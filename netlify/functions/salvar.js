// netlify/functions/salvar.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // 🔐 Segurança
    const secret = process.env.API_SECRET;
    if (!secret || body.token !== secret) {
      return {
        statusCode: 401,
        body: JSON.stringify({ erro: "Acesso não autorizado" }),
      };
    }

    // Remove token antes de enviar ao Google
    const { token, ...payloadSeguro } = body;

    const googleUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!googleUrl) {
      throw new Error("GOOGLE_SCRIPT_URL não configurado no Netlify");
    }

    const response = await fetch(googleUrl, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payloadSeguro),
    });

    const text = await response.text();

    // Tenta converter resposta em JSON
    try {
      const json = JSON.parse(text);
      return {
        statusCode: 200,
        body: JSON.stringify(json),
      };
    } catch {
      return {
        statusCode: 502,
        body: JSON.stringify({
          erro: "Resposta inválida do Apps Script",
          raw: text,
        }),
      };
    }

  } catch (err) {
    console.error("Erro Netlify Function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        erro: "Erro interno no proxy",
        detalhe: err.message,
      }),
    };
  }
}
