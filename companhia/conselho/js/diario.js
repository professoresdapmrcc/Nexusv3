// =========================================================================
// 1. DADOS FIXOS E VARIÁVEIS GLOBAIS
// =========================================================================

let licencasAtivas = []; 
let dadosEscalasGlobais = []; 
let historicoPostsGlobal = []; 
let backupSemanalEstagiariosSincronizado = false;

const LISTA_CONSELHOS = [
    "Administração", "Assistência", "Atualização 1", "Atualização 2",
    "Contabilidade", "Documentação", "Finanças", "Segurança"
];

// O cérebro usa esta lista para saber se o que você digitou é uma função de rotina ou uma atividade extra
const FUNCOES_PADRAO = [
    "atualização das retificações", "backup & atualização", "atualização da escala", "quadro de advertências", 
    "fiscalização, fechamento e mp", "planilha de avaliações", "consulta de contribuições", "vereditos na ouvidoria", 
    "medalhas dos projetos", "cursos no rcc system", "lista de membros", "livro de recordes", 
    "pontos da categoria", "ranking interno", "destaque mensal", "calendário da companhia", 
    "porcentagem dos", "postagem advertências", "visuais dos bot", "melhores da semana", 
    "mp de justificativas", "quadro de honra", "controle de arquivos", "medalhas dos", 
    "fiscalização da listagem"
];

const MESES_ABREV = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const MESES_MAPA = {'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11};

// =========================================================================
// MOTOR DE SEMANA AUTOMÁTICA (VIRADA DOMINGO 01H00)
// =========================================================================

function getPeriodoDaSemana() {
    let agora = new Date();
    
    // Se hoje for domingo (0) e a hora for menor que 1 (ex: 00:30), 
    // significa que ainda estamos na semana "passada".
    if (agora.getDay() === 0 && agora.getHours() < 1) {
        agora.setDate(agora.getDate() - 1); // Volta pro sábado mentalmente
    }

    // Calcula o Domingo dessa semana (Início)
    let domingoInicio = new Date(agora);
    domingoInicio.setDate(agora.getDate() - agora.getDay());
    domingoInicio.setHours(1, 0, 0, 0); // Define exatamente 01:00:00

    // Calcula o Sábado dessa semana (Fim)
    let sabadoFim = new Date(domingoInicio);
    sabadoFim.setDate(domingoInicio.getDate() + 6);
    sabadoFim.setHours(23, 59, 59, 999);

    return { inicio: domingoInicio, fim: sabadoFim };
}

function formatarDataBR(data) {
    const dia = data.getDate().toString().padStart(2, '0');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mesStr = meses[data.getMonth()]; 
    const ano = data.getFullYear();
    return `${dia} ${mesStr} ${ano}`;
}

function getNomePastaSemana() {
    const periodoAtual = getPeriodoDaSemana();
    const diaStr = periodoAtual.inicio.getDate().toString().padStart(2, '0');
    const mesStr = (periodoAtual.inicio.getMonth() + 1).toString().padStart(2, '0');
    const anoStr = periodoAtual.inicio.getFullYear();
    return `escalas_semana_${diaStr}-${mesStr}-${anoStr}`;
}

// =========================================================================
// 2. LÓGICA DE FUNCIONAMENTO & AUTOMAÇÃO DE DATAS E STATUS
// =========================================================================

function getStatusInfo(status) {
    switch(status) {
        case 'concluida': return { texto: 'Concluída', classe: 'status-concluida' };
        case 'justificada': return { texto: 'Justificada', classe: 'status-justificada' }; 
        case 'nao-realizada': return { texto: 'Não Realizada', classe: 'status-nao-realizada' };
        case 'pendente': return { texto: 'Pendente', classe: 'status-pendente' };
        default: return { texto: 'Não Escalado', classe: 'status-nao-escalado' };
    }
}

function interpretarData(texto) {
    if (!texto) return null;
    const txtLimpo = texto.trim();

    const regexNum = /^(\d{1,2})[\/\-\.\s]+(\d{1,2})(?:[\/\-\.\s]+(\d{2,4}))?$/;
    let match = txtLimpo.match(regexNum);
    
    if (match) {
        let dia = parseInt(match[1]);
        let mes = parseInt(match[2]) - 1;
        let ano = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        if (ano < 100) ano += 2000;
        return { dia, mes, ano };
    }

    const regexTxt = /^(\d{1,2})\s+([a-z]{3})\.?\s+(\d{4})$/i;
    match = txtLimpo.match(regexTxt);
    
    if (match) {
        let dia = parseInt(match[1]);
        let mes = MESES_MAPA[match[2].toLowerCase()];
        let ano = parseInt(match[3]);
        if (mes !== undefined) return { dia, mes, ano };
    }
    return null;
}

function formatarPrazoPadrao(prazoString) {
    if (!prazoString || prazoString.trim() === '-' || prazoString.trim() === '') return '-';
    const textoLimpo = prazoString.toLowerCase();
    if (textoLimpo.includes('conclu') || textoLimpo === 'ok') return prazoString;

    const dataParsed = interpretarData(prazoString);
    if (dataParsed) {
        const diaFormatado = dataParsed.dia.toString().padStart(2, '0');
        const mesFormatado = MESES_ABREV[dataParsed.mes];
        return `${diaFormatado} ${mesFormatado} ${dataParsed.ano}`;
    }
    return prazoString;
}

// 🔥 O CÉREBRO CORRIGIDO: Detecção Inteligente de Função Padrão vs Atividade
function autoCalcularStatus(prazoString, nickMembro, nomeAtividade) {
    if (!prazoString || prazoString.trim() === '-' || prazoString.trim() === '') return 'nao-escalado';
    if (!nickMembro || nickMembro === '-') return 'nao-escalado';
    
    const textoLimpo = prazoString.toLowerCase();
    if (textoLimpo.includes('conclu') || textoLimpo === 'ok') return 'concluida';
    if (textoLimpo.includes('justific')) return 'justificada'; 

    const periodoAtual = getPeriodoDaSemana(); 
    let statusFinal = null;

    // 1. CHECA NO FIREBASE SE A PESSOA JÁ FEZ NESTA SEMANA
    const jaFez = historicoPostsGlobal.some(post => {
        if (!post.nick || !post.timestamp) return false;
        
        const mesmoNick = post.nick.toLowerCase().trim() === nickMembro.toLowerCase().trim();
        if (!mesmoNick) return false;

        const nomeAtivLimpo = nomeAtividade.toLowerCase().trim();
        const funcaoPostada = (post.funcao_realizada || "").toLowerCase().trim();
        const tipoPostagem = (post.tipo_postagem || "").toLowerCase().trim();

        // NOVA LÓGICA DE DETECÇÃO (Anti Falso-Positivo)
        // Se a palavra-chave corresponder a menos de 40% da string, o sistema entende 
        // que é uma frase longa descritiva de Atividade Extra e não a Função em si.
        const isFuncaoPadrao = FUNCOES_PADRAO.some(f => {
            if (nomeAtivLimpo === f) return true;
            if (nomeAtivLimpo.includes(f)) {
                return (f.length / nomeAtivLimpo.length) > 0.4;
            }
            return false;
        });

        let postouFuncao = false;
        let foiJustificativa = false; 

        // CASO A: É uma função normal de rotina
        if (funcaoPostada.includes(nomeAtivLimpo) || nomeAtivLimpo.includes(funcaoPostada)) {
            postouFuncao = true;
        } 
        // CASO B: É uma ATIVIDADE EXTRA
        else if (funcaoPostada === "conclusão de atividade" || tipoPostagem.includes("conclusão de atividade")) {
            if (!isFuncaoPadrao) {
                postouFuncao = true; 
            }
        }
        // CASO C: O cara Justificou a função ou atividade
        else if (funcaoPostada.includes("justificativa") || tipoPostagem.includes("justificativa")) {
            const referente = (post.referente_a || "").toLowerCase().trim();

            if ((referente.includes("atividade") || tipoPostagem.includes("atividade")) && !isFuncaoPadrao) {
                postouFuncao = true;
                foiJustificativa = true;
            } else if ((referente.includes("funç") || referente.includes("func") || tipoPostagem.includes("funç")) && isFuncaoPadrao) {
                postouFuncao = true;
                foiJustificativa = true;
            } else if (referente !== "" && referente.includes(nomeAtivLimpo)) {
                postouFuncao = true;
                foiJustificativa = true;
            }
        }

        // TRANSFORMA O TIMESTAMP DO FIREBASE
        let dataPost;
        if (typeof post.timestamp.toDate === 'function') {
            dataPost = post.timestamp.toDate();
        } else if (post.timestamp.seconds) {
            dataPost = new Date(post.timestamp.seconds * 1000);
        } else {
            dataPost = new Date(post.timestamp);
        }

        // REGRA DE OURO: A postagem TEM que ter acontecido dentro dos limites da semana atual
        if (postouFuncao && (dataPost >= periodoAtual.inicio && dataPost <= periodoAtual.fim)) {
            statusFinal = foiJustificativa ? 'justificada' : 'concluida';
            return true; 
        }
        return false;
    });

    if (jaFez && statusFinal) return statusFinal;

    // 2. SE AINDA NÃO FEZ, VERIFICA SE O PRAZO JÁ ESTOUROU
    const dataParsed = interpretarData(prazoString);
    if (dataParsed) {
        const dataPrazo = new Date(dataParsed.ano, dataParsed.mes, dataParsed.dia);
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        if (dataPrazo < hoje) return 'nao-realizada'; 
        else return 'pendente'; 
    }
    
    return 'pendente'; 
}

async function salvarEdicao(idDocumento, nomeConselho, tipoDado, atualizacoes) {
    try {
        let db = firebase.firestore();
        const registroAtual = dadosEscalasGlobais.find(d => d.conselho === nomeConselho && d.tipo === tipoDado) || {};
        const registroCompleto = {
            conselho: nomeConselho,
            tipo: tipoDado,
            membro: registroAtual.membro || '-',
            atividade: registroAtual.atividade || '-',
            prazo: registroAtual.prazo || '-',
            ...atualizacoes
        };

        // Salva na pasta OFICIAL para os membros continuarem fixos
        await db.collection('conselho').doc('painel_escalas').collection('itens').doc(idDocumento).set(registroCompleto, { merge: true });
        
        // Faz o BACKUP SEMANAL em uma pasta separada, com o mesmo formato do preenchimento manual.
        const nomePastaSemana = getNomePastaSemana();

        await db.collection('conselho').doc(nomePastaSemana).collection('itens').doc(idDocumento).set(registroCompleto, { merge: true });
        
        console.log(`Salvo em conselho/painel_escalas/itens/${idDocumento}`, registroCompleto);
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao salvar a edição.");
    }
}

async function sincronizarBackupSemanalEstagiarios() {
    if (backupSemanalEstagiariosSincronizado || dadosEscalasGlobais.length === 0) return;

    const estagiarios = dadosEscalasGlobais.filter(d => d.tipo === 'estagiario' && d.conselho);
    if (estagiarios.length === 0) return;

    backupSemanalEstagiariosSincronizado = true;

    try {
        const db = firebase.firestore();
        const nomePastaSemana = getNomePastaSemana();
        const batch = db.batch();

        estagiarios.forEach(item => {
            const idDocumento = `estagiario_${item.conselho.replace(/\s+/g, '')}`;
            const registroCompleto = {
                conselho: item.conselho,
                tipo: 'estagiario',
                membro: item.membro || '-',
                atividade: item.atividade || '-',
                prazo: item.prazo || '-'
            };

            const ref = db.collection('conselho').doc(nomePastaSemana).collection('itens').doc(idDocumento);
            batch.set(ref, registroCompleto, { merge: true });
        });

        await batch.commit();
        console.log(`Backup semanal dos estagiários sincronizado em conselho/${nomePastaSemana}/itens`);
    } catch (erro) {
        backupSemanalEstagiariosSincronizado = false;
        console.error("Erro ao sincronizar backup semanal dos estagiários:", erro);
    }
}

// =========================================================================
// 3. DESENHAR AS TABELAS
// =========================================================================

function renderizarTabelas() {
    renderizarUmaTabela('conselho');
    renderizarUmaTabela('estagiario');
    ativarEdicaoInline(); 
}

function renderizarUmaTabela(tipo) {
    const tbody = document.getElementById(tipo === 'conselho' ? 'tbody-conselheiros' : 'tbody-estagiarios');
    if(!tbody) return;
    tbody.innerHTML = '';

    const periodoAtual = getPeriodoDaSemana(); 

    LISTA_CONSELHOS.forEach(nomeConselho => {
        const dbItem = dadosEscalasGlobais.find(d => d.conselho === nomeConselho && d.tipo === tipo);
        const docId = tipo + '_' + nomeConselho.replace(/\s+/g, ''); 

        const item = {
            id: docId,
            conselho: nomeConselho,
            membro: dbItem && dbItem.membro ? dbItem.membro : '-', 
            atividade: dbItem && dbItem.atividade ? dbItem.atividade : '-',
            prazo: dbItem && dbItem.prazo ? dbItem.prazo : '-',
            status: 'nao-escalado' 
        };

        const dataParsed = interpretarData(item.prazo);
        if (dataParsed) {
            const dataLinha = new Date(dataParsed.ano, dataParsed.mes, dataParsed.dia, 12, 0, 0);
            if (dataLinha < periodoAtual.inicio || dataLinha > periodoAtual.fim) {
                item.atividade = '-';
                item.prazo = '-';
            }
        }

        item.status = autoCalcularStatus(item.prazo, item.membro, item.atividade);
        
        const statusInfo = getStatusInfo(item.status);
        const linkAvatar = item.membro !== '-' ? `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${item.membro}&action=std&direction=2&head_direction=3&gesture=sml&size=m&headonly=1` : '';
        
        const estaDeLicenca = licencasAtivas.includes(item.membro);
        const tagLicenca = estaDeLicenca ? `<span style="background: #2c2727; color: white; padding: 3px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; margin-left: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">L</span>` : '';

        const htmlMembroComFoto = `
            <div class="membro-info">
                <div class="avatar-box">
                    <img src="${linkAvatar}" alt="" onerror="this.style.display='none'">
                </div>
                <span class="nome-membro editavel" data-id="${item.id}" data-conselho="${item.conselho}" data-tipo="${tipo}" data-campo="membro" contenteditable="true">${item.membro}</span>
                ${tagLicenca}
            </div>
        `;
        
        const htmlStatusBadge = `<span class="badge-status ${statusInfo.classe}">${statusInfo.texto}</span>`;

        let conteudoLinha = `
            <td><span class="nome-membro" style="color: var(--cor-primaria-clara);">${item.conselho}</span></td>
            <td>${htmlMembroComFoto}</td>
            <td class="coluna-atividade editavel" data-id="${item.id}" data-conselho="${item.conselho}" data-tipo="${tipo}" data-campo="atividade" contenteditable="true">${item.atividade}</td>
            <td class="editavel" data-id="${item.id}" data-conselho="${item.conselho}" data-tipo="${tipo}" data-campo="prazo" contenteditable="true">${item.prazo}</td>
            <td>${htmlStatusBadge}</td>
        `;

        const tr = document.createElement('tr');
        tr.innerHTML = conteudoLinha;
        tbody.appendChild(tr);
    });
}

// =========================================================================
// 4. CAPTURAR EDIÇÕES
// =========================================================================

function ativarEdicaoInline() {
    document.querySelectorAll('.editavel').forEach(elemento => {
        elemento.addEventListener('blur', (e) => {
            const idDoc = e.target.getAttribute('data-id');
            const campo = e.target.getAttribute('data-campo');
            const conselho = e.target.getAttribute('data-conselho');
            const tipo = e.target.getAttribute('data-tipo');
            let novoTexto = e.target.innerText.trim();
            
            let atualizacoes = {};

            if (campo === 'prazo') {
                novoTexto = formatarPrazoPadrao(novoTexto);
                atualizacoes.prazo = novoTexto;
                
            } else {
                atualizacoes[campo] = novoTexto;
                
                // Define quem é o 'tr' pegando a linha inteira de onde a célula editada está
                const tr = e.target.closest('tr');
                
                if (tr) {
                    const tdPrazo = tr.querySelector('[data-campo="prazo"]');
                    if (tdPrazo && tdPrazo.innerText.trim() === '-') {
                        atualizacoes.prazo = '-';
                    }
                }
            }

            salvarEdicao(idDoc, conselho, tipo, atualizacoes);
        });

        elemento.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); 
            }
        });
    });
}

// =========================================================================
// 5. INICIALIZAÇÃO E BANCOS
// =========================================================================

function iniciarAbas() {
    const botoes = document.querySelectorAll('.aba-btn');
    const conteudos = document.querySelectorAll('.tabela-view');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('active'));
            conteudos.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.target);
            if(target) target.classList.add('active');
        });
    });
}

function carregarDados() {
    try {
        let db = firebase.firestore();
        const periodoAtual = getPeriodoDaSemana();
        
        // 1. Licenças
        db.collection("nexus_config").doc("dados_externos").onSnapshot((doc) => {
            if(doc.exists) {
                const dados = doc.data();
                if(dados.membros_ativos) {
                    licencasAtivas = dados.membros_ativos
                        .filter(m => m.licenca && m.licenca !== "0" && m.licenca.trim() !== "")
                        .map(m => m.nick);
                }
            }
        });

        // 2. HISTÓRICO DE POSTAGENS 
        db.collection('conselho').doc('painel_registros').collection('historico')
          .where('timestamp', '>=', periodoAtual.inicio)
          .onSnapshot((snapshot) => {
            historicoPostsGlobal = [];
            snapshot.forEach((doc) => historicoPostsGlobal.push(doc.data()));
            renderizarTabelas(); 
        });

        // 3. DIÁRIO DE ESCALAS
        db.collection('conselho').doc('painel_escalas').collection('itens').onSnapshot((snapshot) => {
            dadosEscalasGlobais = [];
            snapshot.forEach((doc) => dadosEscalasGlobais.push(doc.data()));
            sincronizarBackupSemanalEstagiarios();
            renderizarTabelas(); 
        }, (error) => {
            console.error("Erro no Firebase:", error);
            renderizarTabelas();
        });

    } catch (error) {
        console.error("Falha ao conectar:", error);
        renderizarTabelas();
    }
}

// =========================================================================
// MOTOR DE FILTRO DE DATAS MANUAIS
// =========================================================================

function inicializarFiltroDiario() {
    const inputInicio = document.getElementById('filtro-diario-inicio');
    const inputFim = document.getElementById('filtro-diario-fim');
    if (!inputInicio || !inputFim) return;

    const savedInicio = sessionStorage.getItem('nexusFiltroInicio');
    const savedFim = sessionStorage.getItem('nexusFiltroFim');
    
    if (savedInicio) inputInicio.value = savedInicio;
    if (savedFim) inputFim.value = savedFim;

    const painel = document.querySelector('.painel-roxo');
    if (painel) {
        const observer = new MutationObserver(() => {
            filtrarTabelasDiario();
        });
        observer.observe(painel, { childList: true, subtree: true });
    }
}

function aplicarFiltroDiario() {
    const inicioStr = document.getElementById('filtro-diario-inicio').value;
    const fimStr = document.getElementById('filtro-diario-fim').value;

    if (inicioStr) sessionStorage.setItem('nexusFiltroInicio', inicioStr);
    else sessionStorage.removeItem('nexusFiltroInicio');
    
    if (fimStr) sessionStorage.setItem('nexusFiltroFim', fimStr);
    else sessionStorage.removeItem('nexusFiltroFim');

    filtrarTabelasDiario();
}

function limparFiltroDiario() {
    const inputInicio = document.getElementById('filtro-diario-inicio');
    const inputFim = document.getElementById('filtro-diario-fim');
    if(inputInicio) inputInicio.value = '';
    if(inputFim) inputFim.value = '';
    
    sessionStorage.removeItem('nexusFiltroInicio');
    sessionStorage.removeItem('nexusFiltroFim');
    filtrarTabelasDiario();
}

function filtrarTabelasDiario() {
    const inputInicio = document.getElementById('filtro-diario-inicio');
    const inputFim = document.getElementById('filtro-diario-fim');
    if(!inputInicio || !inputFim) return;
    
    const inicioStr = inputInicio.value;
    const fimStr = inputFim.value;

    const dataInicio = inicioStr ? new Date(inicioStr + "T00:00:00") : null;
    const dataFim = fimStr ? new Date(fimStr + "T23:59:59") : null;

    const linhasConselheiros = document.querySelectorAll('#tbody-conselheiros tr');
    const linhasEstagiarios = document.querySelectorAll('#tbody-estagiarios tr');
    const todasAsLinhas = [...linhasConselheiros, ...linhasEstagiarios];

    todasAsLinhas.forEach(tr => {
        if (tr.cells.length < 5) return; 

        const tdPrazo = tr.cells[3]; 
        if (!tdPrazo) return;

        const dataLinha = interpretarData(tdPrazo.innerText);
        let mostrar = true;

        if (dataLinha) {
            const dataMatematica = new Date(dataLinha.ano, dataLinha.mes, dataLinha.dia, 12, 0, 0);
            if (dataInicio && dataMatematica < dataInicio) mostrar = false;
            if (dataFim && dataMatematica > dataFim) mostrar = false;
        } else {
            if (dataInicio || dataFim) {
                if(tdPrazo.innerText.trim() === '-') mostrar = false;
            }
        }

        tr.style.display = mostrar ? '' : 'none';
    });
}

function iniciarDiarioAutomatico() {
    const periodo = getPeriodoDaSemana();
    const textoPeriodo = document.getElementById('texto-periodo');
    if (textoPeriodo) {
        textoPeriodo.innerText = `Semana: ${formatarDataBR(periodo.inicio)} a ${formatarDataBR(periodo.fim)}`;
    }
}

// =========================================================================
// INICIALIZADORES EVENT LISTENERS
// =========================================================================

document.addEventListener('DOMContentLoaded', iniciarDiarioAutomatico);
document.addEventListener('DOMContentLoaded', inicializarFiltroDiario);
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        iniciarAbas();
        carregarDados();
    }, 100);
});
