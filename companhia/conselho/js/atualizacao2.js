// Mudamos para Atualização 2! O Firebase vai procurar "conselho_Atualização2" e "estagiario_Atualização2"
const CONSELHO_ATUAL = "Atualização 2"; 

// ============================================================================
// ESCALA FIXA DA ATUALIZAÇÃO 2
// ============================================================================
const ESCALA_ATUALIZACAO2 = [
    // BLOCO 1: Postagens de Pontos
    { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Domingo", papel: "conselho" },
    { funcao: "Postagem dos Pontos da Categoria [A] & Atualização do Ranking Interno", prazo: "Segunda", papel: "estagiario" },
    { funcao: "Postagem dos Pontos das Categorias [B] e [C] & Atualização do Ranking Interno", prazo: "Terça e dia 17", papel: "conselho" },
    { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Quarta", papel: "estagiario" },
    { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Quinta", papel: "conselho" },
    { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Sexta", papel: "estagiario" },
    { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Sábado", papel: "conselho" },
    
    { separador: true }, // Divisor Visual 1
    
    // BLOCO 3: Outros
    { funcao: "Postagem de Pontos Finais [A], [B], [C] e [D] & Atualização do Ranking Interno", prazo: "Dia 02", papel: "conselho" },
    { funcao: "Postagem do Destaque Mensal", prazo: "Dia 02", papel: "conselho" },
    { funcao: "Backup do Ranking Interno", prazo: "Dia 02", papel: "conselho" },
    { funcao: "Atualização do Calendário da Companhia", prazo: "Segunda", papel: "conselho" }
];

// O CÉREBRO DAS SEMANAS (Sincronizado com o Diário para o Backup funcionar)
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function getPeriodoDaSemana() {
    let agora = new Date();
    if (agora.getDay() === 0 && agora.getHours() < 1) {
        agora.setDate(agora.getDate() - 1);
    }

    let domingoInicio = new Date(agora);
    domingoInicio.setDate(agora.getDate() - agora.getDay());
    domingoInicio.setHours(0, 0, 0, 0);

    let sabadoFim = new Date(domingoInicio);
    sabadoFim.setDate(domingoInicio.getDate() + 6);
    sabadoFim.setHours(23, 59, 59, 999);

    return { inicio: domingoInicio, fim: sabadoFim };
}

function formatarDataBadge(data) {
    const dia = data.getDate().toString().padStart(2, '0');
    const mesStr = MESES_ABREV[data.getMonth()]; 
    const ano = data.getFullYear();
    return `${dia} ${mesStr} ${ano}`;
}

function atualizarBadgeDaSemana() {
    const periodo = getPeriodoDaSemana();
    const textoPeriodo = document.getElementById('texto-periodo');
    if (textoPeriodo) {
        textoPeriodo.innerText = `Semana: ${formatarDataBadge(periodo.inicio)} a ${formatarDataBadge(periodo.fim)}`;
    }
}

// ============================================================================
// SISTEMA PRINCIPAL E PERMISSÕES
// ============================================================================
let repsAtuais = { conselho: 'Sem responsável', estagiario: 'Sem responsável' };

function verificarPermissaoLideranca() {
    const user = window.currentUserData; 
    if (!user || !user.cargo) return false;
    const cargoUser = user.cargo.toLowerCase();
    return cargoUser.includes('líder') || cargoUser.includes('lider'); 
}

async function carregarDadosPagina() {
    const db = firebase.firestore();
    const periodoAtual = getPeriodoDaSemana(); // Definindo a janela de tempo da semana

    // 1. CARREGAR LOGS DA ESQUERDA (TABELA)
    db.collection('conselho').doc('painel_registros').collection('historico')
      .where('conselho', '==', CONSELHO_ATUAL)
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const tbody = document.getElementById('tbody-logs');
        const thAcoes = document.querySelector('.th-acoes'); 
        if (!tbody) return;
        
        tbody.innerHTML = '';

        const isLideranca = verificarPermissaoLideranca();

        // Mostra a coluna do botão de apagar se for líder
        if (isLideranca && thAcoes) thAcoes.style.display = 'table-cell';

        let itensMostrados = 0;

        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const data = doc.data();
                const idPostagem = doc.id; 
                
                let dataObj = null;
                let dataFormatada = '---';
                if (data.timestamp) {
                    if (typeof data.timestamp.toDate === 'function') {
                        dataObj = data.timestamp.toDate();
                    } else if (data.timestamp.seconds) {
                        dataObj = new Date(data.timestamp.seconds * 1000);
                    } else {
                        dataObj = new Date(data.timestamp);
                    }
                    const dia = String(dataObj.getDate()).padStart(2, '0');
                    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
                    const ano = dataObj.getFullYear();
                    const hora = String(dataObj.getHours()).padStart(2, '0');
                    const min = String(dataObj.getMinutes()).padStart(2, '0');
                    dataFormatada = `${dia}/${mes}/${ano} ${hora}:${min}`;
                }

                // ==========================================
                // FILTRO MÁGICO: Ignora as postagens que estão fora da semana
                // ==========================================
                if (!dataObj || dataObj < periodoAtual.inicio || dataObj > periodoAtual.fim) {
                    return; 
                }

                itensMostrados++;

                // Dados limpos para passar pro HTML
                const nickStr = data.nick || '';
                const funcaoStr = data.funcao_realizada || data.atividade || data.tipo_postagem || '';
                const linkStr = data.comprovacao_link || '';
                const comentsStr = data.observacao || data.descricao || data.motivo || '';

                // Funções auxiliares para injetar os atributos de edição nas células
                const classEdit = () => isLideranca ? 'td-editavel' : '';
                const propsEdit = (campo, valorReal) => {
                    if (!isLideranca) return '';
                    const valorSeguro = String(valorReal).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                    return `onclick="transformarEmInput(this, '${idPostagem}', '${campo}')" data-raw="${valorSeguro}" title="Clique para editar"`;
                };

                let linkHTML = '---';
                if (linkStr) {
                    if (linkStr.toLowerCase().startsWith('http')) {
                        linkHTML = `<a href="${linkStr}" target="_blank" class="link-comprovante">Ver Imagem</a>`;
                    } else {
                        linkHTML = `<span style="color: #b0b0b0; font-size: 0.8rem; font-style: italic;">${linkStr}</span>`;
                    }
                }

                let acoesHTML = '';
                if (isLideranca) {
                    acoesHTML = `
                        <td class="td-acoes">
                            <button class="btn-acao btn-delete" onclick="deletarPostagem('${idPostagem}')" title="Apagar Registro"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                }

                tbody.innerHTML += `
                    <tr>
                        <td class="nick-destaque ${classEdit()}" ${propsEdit('nick', nickStr)}>${nickStr || '---'}</td>
                        <td>${dataFormatada}</td>
                        <td class="${classEdit()}" ${propsEdit('funcao_realizada', funcaoStr)}>${funcaoStr || '---'}</td>
                        <td class="${classEdit()}" ${propsEdit('comprovacao_link', linkStr)}>${linkHTML}</td>
                        <td class="${classEdit()}" ${propsEdit('observacao', comentsStr)}>${comentsStr || '---'}</td>
                        ${acoesHTML}
                    </tr>
                `;
            });
        }

        // Se a semana virou e não tem nada
        if (itensMostrados === 0) {
            const colspan = isLideranca ? 6 : 5;
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="txt-center">Sem postagens registradas nesta semana.</td></tr>`;
        }
    });

    // =========================================================================
    // 2. BUSCAR OS RESPONSÁVEIS NO DIÁRIO (LÊ DO PAINEL PRINCIPAL)
    // =========================================================================
    const idConselho = "conselho_" + CONSELHO_ATUAL.replace(/\s+/g, '');
    const idEstagiario = "estagiario_" + CONSELHO_ATUAL.replace(/\s+/g, '');

    // Lê fixo do painel de escalas ativo para não perder os responsáveis
    db.collection('conselho').doc('painel_escalas').collection('itens')
      .onSnapshot((snapshot) => {
          repsAtuais.conselho = 'Sem responsável';
          repsAtuais.estagiario = 'Sem responsável';

          snapshot.forEach(doc => {
              const data = doc.data();
              if (doc.id === idConselho) {
                  repsAtuais.conselho = data.membro || 'Sem responsável';
              } else if (doc.id === idEstagiario) {
                  repsAtuais.estagiario = data.membro || 'Sem responsável';
              }
          });
          
          renderizarCards(); 
      });
}

// ============================================================================
// FUNÇÕES DE LIDERANÇA: APAGAR E EDIÇÃO INLINE (PLANILHA)
// ============================================================================

window.deletarPostagem = async function(idPostagem) {
    if (!verificarPermissaoLideranca()) return;
    if (confirm("Liderança, tem certeza que deseja APAGAR este registro?")) {
        try {
            await firebase.firestore().collection('conselho').doc('painel_registros')
                  .collection('historico').doc(idPostagem).delete();
        } catch (error) {
            console.error("Erro ao apagar:", error);
            alert("Erro ao apagar registro.");
        }
    }
};

window.transformarEmInput = function(tdElement, idPostagem, nomeDoCampoBanco) {
    if (!verificarPermissaoLideranca()) return;
    
    if (tdElement.querySelector('input')) return; 

    const valorOriginal = tdElement.getAttribute('data-raw') || '';
    const htmlOriginal = tdElement.innerHTML;

    tdElement.innerHTML = `<input type="text" class="input-inline" value="${valorOriginal}">`;
    const input = tdElement.querySelector('input');
    input.focus();

    const executarSalvamento = async () => {
        const novoValor = input.value.trim();

        if (novoValor === valorOriginal.trim()) {
            tdElement.innerHTML = htmlOriginal;
            return;
        }

        tdElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--cor-tema-conselho);"></i>';
        
        try {
            await firebase.firestore().collection('conselho').doc('painel_registros')
                  .collection('historico').doc(idPostagem).update({
                      [nomeDoCampoBanco]: novoValor
                  });
        } catch (error) {
            console.error("Erro ao editar:", error);
            alert("Erro ao salvar a alteração.");
            tdElement.innerHTML = htmlOriginal; 
        }
    };

    input.addEventListener('blur', executarSalvamento);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); 
        }
        if (e.key === 'Escape') {
            tdElement.innerHTML = htmlOriginal; 
        }
    });
};

// ============================================================================
// 3. RENDERIZAR CARDS (DATA LADO A LADO) - VISUAL MANTIDO!
// ============================================================================
function renderizarCards() {
    const divPrazos = document.getElementById('lista-prazos');
    if(!divPrazos) return;
    
    divPrazos.innerHTML = '';

    const nomeValido = (nome) => {
        if (!nome) return false;
        const n = nome.trim().toLowerCase();
        if (n.includes('sem respons')) return false;
        return /[a-z0-9]/i.test(n);
    };

    ESCALA_ATUALIZACAO2.forEach(item => {
        
        if (item.separador) {
            divPrazos.innerHTML += `<div class="separador-escala"><span>Tarefas Semanais / Mensais</span></div>`;
            return; 
        }

        let responsavelAtual = (item.papel === "conselho") ? repsAtuais.conselho : repsAtuais.estagiario;

        if (item.papel === "estagiario" && !nomeValido(responsavelAtual)) {
            responsavelAtual = repsAtuais.conselho;
        }

        if (!nomeValido(responsavelAtual)) {
            responsavelAtual = "Sem responsável";
        }

        let avatarHTML = `<i class="fa-solid fa-user-astronaut"></i>`; 
        if (responsavelAtual !== "Sem responsável") {
            const nickLimpo = responsavelAtual.trim(); 
            avatarHTML = `<img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickLimpo}&action=std&direction=2&head_direction=3&gesture=sml&size=m&headonly=1" class="avatar-card-pequeno" alt="${nickLimpo}">`;
        }

        divPrazos.innerHTML += `
            <div class="card-tarefa">
                <div class="tarefa-detalhes">
                    <span class="tarefa-titulo">${item.funcao}</span>
                    <div class="bloco-membro-data">
                        <span class="tarefa-responsavel">
                            ${avatarHTML} ${responsavelAtual}
                        </span>
                        <span class="data-card-direita">
                            ${item.prazo}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==========================================
// CONTROLE DO MODAL DE MANUAL
// ==========================================
function abrirModalManual() {
    const modal = document.getElementById('modal-manual');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        document.body.style.overflow = 'hidden'; 
    }
}

function fecharModalManual() {
    const modal = document.getElementById('modal-manual');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; 
        }, 300); 
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('modal-manual');
    if (event.target === modal) {
        fecharModalManual();
    }
}

// Inicializa a página e desenha a badge da semana
document.addEventListener('DOMContentLoaded', atualizarBadgeDaSemana);
document.addEventListener('userDataReady', carregarDadosPagina);

if (window.isUserDataReady) {
    carregarDadosPagina();
}