// =====================================================================
// == 🚀 LÓGICA DA CENTRAL DE SUGESTÕES - REALTIME FIRESTORE v8
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Intervalo de verificação para aguardar o global.js instanciar o window.db
    const checarConexaoBanco = setInterval(() => {
        if (window.db) {
            clearInterval(checarConexaoBanco);
            inicializarEscutaFeedbacks();
        }
    }, 100);

    function inicializarEscutaFeedbacks() {
        const wrapper = document.getElementById('feedbacks-wrapper');
        const contadorEl = document.getElementById('feedback-contador');

        if (!wrapper || !contadorEl) return;

        // Escuta em tempo real ordenada por data de criação (Mais recentes primeiro)
        window.db.collection('sugestoes').orderBy('data_envio', 'desc').onSnapshot(snapshot => {
            wrapper.innerHTML = '';

            if (snapshot.empty) {
                wrapper.innerHTML = `
                    <div class="estado-painel-vazio">
                        <i class="fa-solid fa-circle-check"></i>
                        Tudo limpo! Nenhuma sugestão ou bug em aberto na base.
                    </div>
                `;
                contadorEl.textContent = '0 recebidos';
                return;
            }

            contadorEl.textContent = `${snapshot.size} relato(s) recebido(s)`;

            snapshot.forEach(doc => {
                const dados = doc.data();
                const idDocumento = doc.id;

                // Formatação legível do Timestamp nativo do Firebase
                let dataFinal = "Recentemente";
                if (dados.data_envio && typeof dados.data_envio.toDate === 'function') {
                    const dateObj = dados.data_envio.toDate();
                    dataFinal = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }

                // Identificação da Badge correspondente
                const tipo = dados.tipo || 'outro';
                const configBadges = {
                    bug: { classe: 'bug', texto: '🐛 Bug' },
                    sugestao: { classe: 'sugestao', texto: '💡 Sugestão' },
                    outro: { classe: 'outro', texto: '📌 Outro' }
                };
                const badgeAtual = configBadges[tipo] || configBadges['outro'];

                // Renderização condicional do local do Bug
                let HTMLPaginaBug = "";
                if (dados.tipo === 'bug' && dados.pagina) {
                    HTMLPaginaBug = `
                        <div class="tag-pagina-bug">
                            <i class="fa-solid fa-bug"></i>
                            <span><strong>Página:</strong> ${sanitizarTexto(dados.pagina)}</span>
                        </div>
                    `;
                }

                // Criação do Card Físico no painel
                const card = document.createElement('div');
                card.className = 'card-feedback';
                card.innerHTML = `
                    <div>
                        <div class="card-topo">
                            <span class="badge-tipo ${badgeAtual.classe}">${badgeAtual.texto}</span>
                            <span class="data-envio">${dataFinal}</span>
                        </div>
                        ${HTMLPaginaBug}
                        <p class="mensagem-corpo">${sanitizarTexto(dados.mensagem)}</p>
                    </div>
                    <div class="card-rodape">
                        <span class="status-indicador ${dados.status || 'pendente'}">
                            ${dados.status === 'resolvido' ? '<i class="fa-solid fa-circle-check"></i> Resolvido' : '<i class="fa-solid fa-clock"></i> Pendente'}
                        </span>
                        <div class="acoes-container">
                            ${dados.status !== 'resolvido' ? `
                                <button class="btn-marcar-resolvido" onclick="alterarStatus('${idDocumento}', 'resolvido')">Resolver</button>
                            ` : ''}
                            <button class="btn-deletar-card" title="Deletar da Base" onclick="deletarRegistro('${idDocumento}')">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
                wrapper.appendChild(card);
            });

        }, erro => {
            console.error("Erro na leitura da snapshot do Firebase:", erro);
            wrapper.innerHTML = `
                <div class="estado-painel-vazio" style="color: #ff3366;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Erro de segurança ou indexação pendente ao ler a coleção do Firebase.
                </div>
            `;
        });
    }
});

// =====================================================================
// == 🛠️ FUNÇÕES GLOBAIS DE INTERAÇÃO (Disponibilizadas no objeto window)
// =====================================================================

// Altera status de 'pendente' para 'resolvido'
window.alterarStatus = async function(id, novoStatus) {
    try {
        await window.db.collection('sugestoes').doc(id).update({ status: novoStatus });
        if (typeof showToast === 'function') showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao modificar status do documento:", error);
        if (typeof showToast === 'function') showToast('Erro ao atualizar status.', 'error');
    }
};

// Deleta permanentemente o documento da collection
window.deletarRegistro = async function(id) {
    const executarExclusao = async () => {
        try {
            await window.db.collection('sugestoes').doc(id).delete();
            if (typeof showToast === 'function') showToast('Relato removido com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao deletar documento do Firestore:", error);
            if (typeof showToast === 'function') showToast('Erro ao remover o registro.', 'error');
        }
    };

    // Tenta utilizar a modal customizada do global.js, senão faz o fallback para o confirm do browser
    if (typeof showConfirm === 'function') {
        showConfirm('Tem certeza absoluta que deseja apagar essa sugestão/bug permanentemente?', executarExclusao);
    } else if (confirm('Deseja excluir este registro permanentemente da base?')) {
        executarExclusao();
    }
};

// Função de Limpeza (Escape) contra vulnerabilidades e ataques de XSS
function sanitizarTexto(textoSujo) {
    if (!textoSujo) return '';
    return textoSujo.replace(/[&<>'"]/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[caractere] || caractere));
}