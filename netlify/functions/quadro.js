// Arquivo: netlify/functions/lerQuadro.js

exports.handler = async function(event, context) {
    // Sua URL original do Google Apps Script
    const GAS_URL = "https://script.google.com/macros/s/AKfycbydba-nlnirrqU7ivUYNdOVXWI1k3HZECOXTb62RoUAXQ685duQiCeeVQMHAGF2KKol/exec?acao=quadro";

    try {
        // O Netlify busca os dados no Google (Servidor -> Servidor não tem CORS)
        const response = await fetch(GAS_URL);
        
        if (!response.ok) {
            throw new Error(`Erro no Google: ${response.statusText}`);
        }

        const data = await response.json();

        // O Netlify devolve para o seu site com os cabeçalhos permitidos
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Libera para todo mundo
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.toString() })
        };
    }
};