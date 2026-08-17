// Substitua pela sua URL de implantação do Apps Script
const URL_API = "https://script.google.com/macros/s/AKfycbz9-DzHhQWXi5LqXMHb4nfblVLJiTubZ_GLm34hyYO7Qmdbgtm2Wlaj4P3-N147oyRt/exec";

async function carregarDados() {
    // 1. Descobrir qual aba carregar (pega da URL)
    const urlParams = new URLSearchParams(window.location.search);
    const abaAlvo = urlParams.get('aba') || 'Administração';

    // Atualiza o título da página
    document.getElementById('titulo-conselho').innerText = `Conselho de ${abaAlvo}`;

    try {
        const resposta = await fetch(`${URL_API}?aba=${encodeURIComponent(abaAlvo)}`);
        const dados = await resposta.json();

        if (dados.erro) {
            alert("Erro: Aba não encontrada na planilha.");
            return;
        }

        // 2. Renderizar Registros (Esquerda)
        const tbody = document.getElementById('tbody-registros');
        tbody.innerHTML = '';

        if (dados.registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:50px; opacity:0.5;">Sem postagens recentes</td></tr>';
        } else {
            dados.registros.forEach(reg => {
                tbody.innerHTML += `
                    <tr>
                        <td style="font-size: 0.8rem; opacity: 0.6;">${reg.registro}</td>
                        <td class="nome-membro">${reg.nick}</td>
                        <td>${reg.data}</td>
                        <td style="font-size: 0.85rem;">${reg.funcao}</td>
                        <td><a href="${reg.comprovacao}" target="_blank" class="btn-link">Ver Link</a></td>
                    </tr>
                `;
            });
        }

        // 3. Renderizar Prazos (Direita)
        const containerPrazos = document.getElementById('lista-prazos');
        containerPrazos.innerHTML = '';

        dados.prazos.forEach(item => {
            containerPrazos.innerHTML += `
                <div class="item-prazo">
                    <div class="prazo-funcao">${item.funcao}</div>
                    <div class="prazo-info">
                        <span>📅 ${item.prazo}</span>
                        <span style="opacity:0.5">|</span>
                        <span>👤 ${item.responsavel}</span>
                    </div>
                </div>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar:", erro);
        document.getElementById('tbody-registros').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao sincronizar com a planilha.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', carregarDados);