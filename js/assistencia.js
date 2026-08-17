/* ==========================================================================
   CONFIGURAÇÕES GLOBAIS
   ========================================================================== */
const NOME_COLECAO = "assistencia_registros";

// Cargos permitidos (Hierarquia do menor para o maior)
const CARGOS_PERMITIDOS = [
    'Estagiário', 
    'Conselheiro', 
    'Vice-Líder', 
    'Líder'
];

let actionQueue = [];
let actionQueueTotal = 0;
let itensAprovados = [];
let dadosGlobais = [];
let sistemaIniciado = false;
let inicializacaoEmAndamento = false; // Guard extra contra race condition
let mapaDinamicoLicencas = {};

// Variáveis globais auxiliares para a IA
let globalMembrosAtivos = [];
let globalPromovidos = [];
let globalLicencas = [];

/* --- FUNÇÃO DE CÁLCULO AUTOMÁTICO COM PAUSA DE LICENÇA --- */
function calcularDataTerminoAutomatico(nick, dataInicioIso) {
    if (!dataInicioIso) return "--";
    const nickLimpo = nick.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    
    // Puxa o objeto de licença que tem { dias: X, status: 'ativo/inativo' }
    const licencaObj = mapaDinamicoLicencas[nickLimpo] || { dias: 0, status: 'inativo' };
    
    // Se o membro está ATIVAMENTE de licença, o prazo congela.
    if (licencaObj.status === 'ativo') {
        return "PAUSADO"; 
    }

    // Se ele voltou (inativo) ou nunca pegou, soma os 30 dias padrões + os dias gastos (se houver)
    const data = new Date(dataInicioIso + "T12:00:00"); 
    data.setDate(data.getDate() + 30 + licencaObj.dias);
    return data.toLocaleDateString('pt-BR');
}

/* ==========================================================================
   AUTENTICAÇÃO E INICIALIZAÇÃO SEGURA
   ========================================================================== */

async function initializeAppForUser(userData) {
    if (sistemaIniciado || inicializacaoEmAndamento) return;
    inicializacaoEmAndamento = true;

    if (!userData) {
        console.warn("[Auth] Usuário não detectado.");
        inicializacaoEmAndamento = false;
        bloquearAcessoVisual("Usuário não identificado. Faça login novamente.");
        return;
    }

    console.log("[Auth] Verificando:", userData.name);

    const userCargo = userData.cargo || "";
    const userRole = userData.role || ""; 

    const temCargoPermitido = CARGOS_PERMITIDOS.some(role => userCargo.includes(role));
    const ehAdmin = userRole === "admin" || userRole === "dono";

    if (temCargoPermitido || ehAdmin) {
        sistemaIniciado = true;
        document.body.classList.remove('auth-loading');
        
        configurarFiltros();
        
        setTimeout(() => {
            carregarDadosDaPlanilha(); 
        }, 500);

    } else {
        inicializacaoEmAndamento = false;
        let motivo = `Seu cargo atual (<strong>${userCargo}</strong>) não possui permissão de acesso a esta área.`;
        bloquearAcessoVisual(motivo);
    }
}

// === TELA DE BLOQUEIO COM REDIRECIONAMENTO ===
function bloquearAcessoVisual(motivo) {
    document.body.classList.remove('auth-loading');
    
    document.body.innerHTML = `
        <div style="
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100vh; width: 100%; background: #0f172a; color: #fff;
            font-family: 'Montserrat', sans-serif; text-align: center; padding: 20px; box-sizing: border-box;
        ">
            <div style="
                background: rgba(239, 68, 68, 0.1); padding: 35px; border-radius: 50%;
                margin-bottom: 25px; border: 1px solid rgba(239, 68, 68, 0.2); animation: pulseRed 2s infinite;
            ">
                <i class="fa-solid fa-lock" style="font-size: 3.5rem; color: #ef4444;"></i>
            </div>
            
            <h1 style="font-size: 2rem; margin: 0 0 15px 0; font-weight: 700; letter-spacing: -0.5px;">Acesso Negado</h1>
            
            <p style="color: #94a3b8; margin-bottom: 20px; font-size: 1.1rem; max-width: 500px; line-height: 1.6;">
                ${motivo}
            </p>

            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 30px;">
                Você será redirecionado em <span id="countdown" style="color: #a855f7; font-weight: bold;">5</span> segundos...
            </p>
            
            <a href="index.html" style="
                background: #a855f7; color: white; padding: 14px 35px; border-radius: 12px;
                text-decoration: none; font-weight: 600; transition: all 0.3s ease;
                display: inline-flex; align-items: center; gap: 10px;
                box-shadow: 0 10px 20px -5px rgba(168, 85, 247, 0.4); border: 1px solid rgba(255,255,255,0.1);
            ">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Ir agora
            </a>

            <style>
                @keyframes pulseRed {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            </style>
        </div>
    `;

    let segundos = 4;
    const countSpan = document.getElementById('countdown');
    const intervalo = setInterval(() => {
        segundos--;
        if (countSpan) countSpan.innerText = segundos;
        if (segundos <= 0) {
            clearInterval(intervalo);
            window.location.href = "index.html"; 
        }
    }, 1000);
}

function configurarFiltros() {
    const inputBusca = document.getElementById('inputBusca');
    const filtroCargo = document.getElementById('filtro-cargo');
    const filtroPunicao = document.getElementById('filtro-punicao');

    if (inputBusca) inputBusca.addEventListener('input', filtrarTabela);
    if (filtroCargo) filtroCargo.addEventListener('change', filtrarTabela);
    if (filtroPunicao) filtroPunicao.addEventListener('change', filtrarTabela);
}

document.addEventListener('userDataReady', (e) => {
    initializeAppForUser(e.detail.userData);
});

document.addEventListener('DOMContentLoaded', () => {
    const cached = sessionStorage.getItem('currentUserCache');
    if (cached) {
        try {
            initializeAppForUser(JSON.parse(cached));
        } catch (e) {
            console.error("Erro cache:", e);
        }
    }
});

/* ==========================================================================
   CARREGAMENTO E FILTRAGEM
   ========================================================================== */
async function carregarDadosDaPlanilha() {
    const container = document.getElementById('container-quadro');
    const loaderBar = document.getElementById('nexus-loader-bar');
    
    if(loaderBar) loaderBar.classList.remove('hidden');
    if(container) container.innerHTML = ''; 

    try {
        console.log("🔥 Buscando Punições e Dados Externos...");
        
        const [snapshotPunicoes, docAuxiliar] = await Promise.all([
            db.collection(NOME_COLECAO).orderBy("data_iso", "desc").limit(300).get(),
            db.collection('nexus_config').doc('dados_externos').get()
        ]);

        // 1. Mapeia as Licenças e Status vindas de 'dados_externos'
        mapaDinamicoLicencas = {};
        if (docAuxiliar.exists) {
            const aux = docAuxiliar.data();
            const listaParaLicencas = aux.membros_ativos || []; 

            listaParaLicencas.forEach(item => {
                if (item.nick) {
                    const nickChave = item.nick.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    mapaDinamicoLicencas[nickChave] = {
                        dias: parseInt(item.licenca) || 0,
                        status: (item.status_licenca || 'inativo').toString().toLowerCase()
                    };
                }
            });

            globalMembrosAtivos = aux.membros_ativos || [];
            globalPromovidos = aux.promovidos || [];
        }

        // 2. Processa Punições
        const punicoesTemp = [];
        snapshotPunicoes.forEach((doc) => {
            const d = doc.data();
            punicoesTemp.push({
                id: doc.id,
                nick: d.nick,
                cargo: d.cargo,
                punicao: d.punicao,
                motivo: d.motivo,
                data: d.data_formatada,
                data_iso: d.data_iso,
                decisao: d.decisao || "PENDENTE",
                dataTermino: d.data_termino || ""
            });
        });
        dadosGlobais = punicoesTemp;

        filtrarTabela(); 
        // Sincroniza datas silenciosamente sem forçar novo carregamento
        sincronizarPrazosSilencioso();

    } catch (erro) {
        console.error("Erro ao carregar:", erro);
    }
}

function filtrarTabela() {
    console.log("🔍 Filtrando tabela... Total de dados:", dadosGlobais.length);

    const inputBusca = document.getElementById('inputBusca');
    const filtroCargo = document.getElementById('filtro-cargo');
    const filtroPunicao = document.getElementById('filtro-punicao');

    const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
    const cargoFiltro = filtroCargo ? filtroCargo.value : "";
    const punicaoFiltro = filtroPunicao ? filtroPunicao.value : "";

    const filtrados = dadosGlobais.filter(m => {
        const nick = (m.nick || "").toString().toLowerCase();
        const cargo = (m.cargo || "").toString();
        const punicao = (m.punicao || "").toString().toUpperCase();
        
        const decisao = (m.decisao || "PENDENTE").toString().toUpperCase().trim();
        const matchStatus = (decisao === "PENDENTE" || decisao === "APROVADA");

        const matchNome = nick.includes(termo);
        const matchCargo = cargoFiltro === "" || cargo.includes(cargoFiltro);
        const matchPunicao = punicaoFiltro === "" || punicao.includes(punicaoFiltro.toUpperCase());
        
        return matchNome && matchCargo && matchPunicao && matchStatus;
    });

    console.log("✅ Itens filtrados para exibir:", filtrados.length);
    
    renderizarListaDeMembros(filtrados);
    gerarAnaliseNexus(filtrados, globalMembrosAtivos, globalPromovidos, globalLicencas);
}

/* ==========================================================================
   RENDERIZAÇÃO DA TABELA
   ========================================================================== */
function renderizarListaDeMembros(membros) {
    const container = document.getElementById('container-quadro');
    
    if (membros.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px; color:#64748b;">Nenhum registro encontrado para os filtros atuais.</p>`;
        return;
    }

    const mapaCargos = {
        'Professor': 'Professor(a)',
        'Coordenador': 'Coordenador(a)',
        'Graduador': 'Graduador(a)',
        'Estagiário': 'Estagiário(a)',
        'Conselheiro': 'Conselheiro(a)',
    };
    
    const listaVisuais = Object.keys(mapaCargos);

    let html = `
        <div class="header-lista lista-row-edit">
            <div style="text-align: center; width: 40px;">#</div> 
            <div>CARGO</div>
            <div>NICKNAME</div>
            <div>PUNIÇÃO</div>
            <div>MOTIVO</div>
            <div>DATA</div>
            <div>STATUS</div>
            <div>OBSERVAÇÃO</div>
        </div>
    `;

    membros.forEach((m, index) => {
        let nickLimpo = m.nick ? m.nick.toString().trim() : '';
        nickLimpo = nickLimpo.replace(/^(a|o|do|da|de)\s+/i, '');
        
        const classePunicao = getCorPunicao(m.punicao);
        const classeDecisao = getCorDecisao(m.decisao);
        
        const linhaExcel = index + 1; 

        const cargoDoBanco = m.cargo || 'Professor(a)';
        const cargoBase = cargoDoBanco.replace(/\(a\)$/i, '').trim(); 

        let optionsCargo = listaVisuais.map(visual => {
            const valorParaSalvar = mapaCargos[visual];
            const isSelected = cargoBase.toLowerCase() === visual.toLowerCase();
            return `<option value="${valorParaSalvar}" ${isSelected ? 'selected' : ''}>${visual}</option>`;
        }).join('');

        const cargoEstaNoMapa = listaVisuais.some(v => v.toLowerCase() === cargoBase.toLowerCase());
        if (!cargoEstaNoMapa) {
            optionsCargo += `<option value="${cargoDoBanco}" selected>${cargoDoBanco}</option>`;
        }

        html += `
            <div class="item-lista lista-row-edit">
                <div class="col-linha" style="display: flex; align-items: center; justify-content: center; font-weight: bold; color: rgba(255,255,255,0.3);">
                    ${linhaExcel}
                </div>

                <div>
                    <select class="select-cargo" onchange="salvarCargo(this, '${m.id}')">
                        ${optionsCargo}
                    </select>
                </div>

                <div class="editable-cell" onclick="editarTexto(this, '${m.id}', 'nick')">
                    <span class="nick-text">${nickLimpo}</span>
                    <i class="fas fa-pencil-alt edit-icon"></i>
                </div>

                <div>
                    <select class="select-punicao ${classePunicao}" onchange="salvarPunicao(this, '${m.id}')">
                        <option value="Erro" ${m.punicao.toUpperCase() === 'ERRO' ? 'selected' : ''}>ERRO</option>
                        <option value="Notificação" ${m.punicao.toUpperCase().includes('NOTIFICAÇÃO') ? 'selected' : ''}>NOTIFICAÇÃO</option>
                        <option value="Advertência Interna" ${m.punicao.toUpperCase().includes('INTERNA') ? 'selected' : ''}>ADV. INTERNA</option>
                    </select>
                </div>

                <div class="editable-cell" onclick="editarTexto(this, '${m.id}', 'motivo')">
                    <span style="font-size:0.85rem; line-height:1.4; display:block;">${m.motivo}</span>
                </div>

                <div class="editable-cell" onclick="editarData(this, '${m.id}')">
                    <span style="font-weight:600; color:#cbd5e1;">${m.data}</span>
                </div>

                <div>
                    <select class="select-decisao ${classeDecisao}" onchange="salvarDecisao(this, '${m.id}')">
                        <option value="APROVADA" ${m.decisao == 'APROVADA' ? 'selected' : ''}>APROVADA</option>
                        <option value="CANCELADA" ${m.decisao == 'CANCELADA' ? 'selected' : ''}>CANCELADA</option>
                        <option value="CASO REVISTO" ${m.decisao == 'CASO REVISTO' ? 'selected' : ''}>CASO REVISTO</option>
                        <option value="ACÚMULO" ${m.decisao == 'ACÚMULO' ? 'selected' : ''}>ACÚMULO</option>
                        <option value="EXPIRADA" ${m.decisao == 'EXPIRADA' ? 'selected' : ''}>EXPIRADA</option>
                        <option value="INATIVO" ${m.decisao == 'INATIVO' ? 'selected' : ''}>INATIVO</option>
                        <option value="PENDENTE" ${!m.decisao || m.decisao == 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                    </select>
                </div>

                <div class="editable-cell" onclick="editarTexto(this, '${m.id}', 'observacao')">
                    <span class="${m.comentario ? '' : 'cell-text-muted'}">${m.comentario || 'Adicionar nota...'}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ==========================================================================
   FUNÇÕES DE EDIÇÃO E SALVAMENTO
   ========================================================================== */
function getCorPunicao(texto) {
    if (!texto) return 'p-padrao';
    const t = texto.toUpperCase();
    if (t.includes('ERRO')) return 'p-erro';
    if (t.includes('ADVERTÊNCIA')) return 'p-adv';
    if (t.includes('NOTIFICAÇÃO')) return 'p-notif';
    return 'p-padrao';
}

function getCorDecisao(status) {
    if(!status) return 'st-pendente';
    const s = status.toUpperCase().trim();
    if(s === 'APROVADA') return 'st-aprovada';
    if(s === 'CANCELADA') return 'st-cancelada';
    if(s === 'CASO REVISTO') return 'st-revisto';
    if(s === 'ACÚMULO') return 'st-acumulo';
    if(s === 'EXPIRADA') return 'st-expirada';
    if(s === 'INATIVO') return 'st-inativo';
    return 'st-pendente';
}

function salvarCargo(select, docId) {
    salvarEdicao(docId, 'cargo', select.value); 
}

function salvarPunicao(select, docId) {
    select.className = `select-punicao ${getCorPunicao(select.value)}`;
    salvarEdicao(docId, 'punicao', select.value); 
}

function salvarDecisao(select, docId) {
    const novoStatus = select.value;
    select.className = `select-decisao ${getCorDecisao(novoStatus)}`;
    salvarEdicao(docId, 'decisao', novoStatus);
    
    const statusQueFicam = ['PENDENTE', 'APROVADA'];
    const deveSumir = !statusQueFicam.includes(novoStatus.toUpperCase());

    const linha = select.closest('.item-lista');
    if (!linha) return;

    if (linha.dataset.timerRemove) {
        console.log("Cancelando remoção agendada...");
        clearTimeout(parseInt(linha.dataset.timerRemove));
        delete linha.dataset.timerRemove;
        linha.style.opacity = "1";
        linha.style.transform = "translateX(0)";
    }

    if (deveSumir) {
        console.log(`⏳ Status '${novoStatus}' detectado. Removendo em 10 minutos...`);
        const timerId = setTimeout(() => {
            linha.style.transition = "opacity 0.5s, transform 0.5s";
            linha.style.opacity = "0";
            linha.style.transform = "translateX(50px)";
            
            setTimeout(() => {
                linha.remove();
                console.log("Item removido da tela.");
            }, 500);
        }, 600000); 

        linha.dataset.timerRemove = timerId;
    }
}

function editarTexto(elemento, docId, campoDb) {
    if (elemento.querySelector('input')) return; 

    const span = elemento.tagName === 'SPAN' ? elemento : elemento.querySelector('span');
    const valorAtual = span.innerText;
    const parent = span.parentElement; 

    const input = document.createElement('input');
    input.type = 'text';
    input.value = valorAtual === 'Adicionar nota...' ? '' : valorAtual;
    input.className = 'input-inline-edit';
    
    span.style.display = 'none';
    parent.appendChild(input);
    input.focus();

    const salvar = () => {
        const novoValor = input.value;
        span.innerText = novoValor || (campoDb === 'observacao' ? 'Adicionar nota...' : valorAtual);
        span.style.display = 'inline';
        input.remove();
        
        if (novoValor !== valorAtual && novoValor.trim() !== "") {
            salvarEdicao(docId, campoDb, novoValor);
        } else if (novoValor === "" && campoDb === 'observacao') {
             salvarEdicao(docId, campoDb, "");
        }
    };

    input.addEventListener('blur', salvar);
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') salvar(); });
}

function editarData(elemento, docId) {
    if (elemento.querySelector('input')) return;
    const span = elemento.querySelector('span');
    const valorOriginal = span.innerText; 

    const partes = valorOriginal.split('/');
    const dataIso = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : '';

    const input = document.createElement('input');
    input.type = 'date';
    input.value = dataIso;
    input.className = 'input-inline-edit';

    span.style.display = 'none';
    elemento.appendChild(input);
    input.focus();

    input.addEventListener('blur', () => {
        let novoValor = input.value; 
        if (novoValor) {
            const p = novoValor.split('-');
            const dataBr = `${p[2]}/${p[1]}/${p[0]}`; 
            span.innerText = dataBr;
            
            salvarEdicao(docId, 'data_formatada', dataBr);
            salvarEdicao(docId, 'data_iso', novoValor);
        } else {
            span.innerText = valorOriginal;
        }
        span.style.display = 'inline';
        input.remove();
    });
}

// --- FUNÇÃO DE UPDATE NO FIREBASE ---
async function salvarEdicao(docId, campo, novoValor) {
    try {
        const updateData = { [campo]: novoValor, sincronizado_sheets: false };

        if (campo === 'nick' || campo === 'data_iso') {
            const snap = await db.collection(NOME_COLECAO).doc(docId).get();
            const dataRef = campo === 'data_iso' ? novoValor : snap.data().data_iso;
            const nickRef = campo === 'nick' ? novoValor : snap.data().nick;
            updateData.data_termino = calcularDataTerminoAutomatico(nickRef, dataRef);
        }

        await db.collection(NOME_COLECAO).doc(docId).update(updateData);

        console.log("Sucesso Firestore");
        
    } catch (error) {
        console.error("Erro ao atualizar:", error);
        alert("Erro ao salvar a alteração. Verifique sua conexão.");
    }
}

/* ==========================================================================
   FUNÇÕES DO IMPORTADOR 
   ========================================================================== */
function abrirImportadorAdv() {
    // Reseta estado anterior para evitar duplicação
    itensAprovados = [];
    actionQueue = [];
    actionQueueTotal = 0;
    const textarea = document.getElementById('textoForumInput');
    if (textarea) textarea.value = '';
    const modal = document.getElementById('modalImportTexto');
    if(modal) modal.classList.remove('hidden');
}

function fecharModais() {
    ['modalImportTexto', 'import-status-container', 'modalAddPunicao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    // Garante que uma fila de importação parcial não persista
    const areaRevisao = document.getElementById('area-revisao-resultados');
    if (areaRevisao && !areaRevisao.classList.contains('hidden')) {
        // Só reseta se estava em revisão ativa
        actionQueue = [];
        itensAprovados = [];
        areaRevisao.classList.add('hidden');
        const container = document.getElementById('container-quadro');
        if (container) container.classList.remove('hidden');
    }
}

function processarTextoParaFila() {
    const inputTexto = document.getElementById('textoForumInput');
    const textoRaw = inputTexto ? inputTexto.value : '';
    
    if (!textoRaw.trim()) {
        alert("Cole o texto das punições primeiro.");
        return;
    }

    fecharModais();
    const statusContainer = document.getElementById('import-status-container');
    if(statusContainer) statusContainer.classList.remove('hidden');

    const texto = textoRaw
        .replace(/\[.*?\]/g, '') 
        .replace(/\t/g, ' ')
        .replace(/\r\n/g, '\n')
        .trim();

    const regexDivisor = /(?:\n|^)(?=(?:ERRO|ADVERTÊNCIA|NOTIFICAÇÃO|CANCELAMENTO))/i;
    const blocos = texto.split(regexDivisor).filter(t => t.trim().length > 5);

    let encontrados = [];

    blocos.forEach(bloco => {
        const conteudo = bloco.trim();
        const mTipo = conteudo.match(/(ERRO|ADVERTÊNCIA INTERNA|NOTIFICAÇÃO)/i);
        if (!mTipo) return;
        const tipo = mTipo[0].toUpperCase();

        const mCargoNick = conteudo.match(/(?:Cargo e nick|Nick|Membro|Usuário|Nome)(?:.*?)[:\s]\s*([^\n\r]+)/i);
        
        if (!mCargoNick) return;

        let cargoNickTexto = mCargoNick[1].trim();
        
        let cargoIdentificado = "Professor(a)";
        let nickIsolado = cargoNickTexto;

        const listaCargos = ['Professor', 'Coordenador', 'Graduador', 'Estagiário', 'Conselheiro'];
        for (const c of listaCargos) {
            if (new RegExp(c, 'i').test(cargoNickTexto)) {
                cargoIdentificado = c + "(a)";
                
                nickIsolado = cargoNickTexto
                    .replace(new RegExp(c, 'i'), '') 
                    .replace(/\(a\)/gi, '')          
                    .replace(/do(?:a)?\s+notificado(?:a)?[:\s]*/gi, '') 
                    .trim();
                
                nickIsolado = nickIsolado.replace(/^(o|a|do|da|de)\s+/i, '');
                
                break;
            }
        }

        const mData = conteudo.match(/Data\s*[:\s-]*\s*(\d{2}\/\d{2}\/\d{4})/i);
        let dataIso = "", dataBr = "";
        if (mData) {
            dataBr = mData[1];
            const p = dataBr.split('/');
            dataIso = `${p[2]}-${p[1]}-${p[0]}`;
        } else {
            const hoje = new Date();
            dataIso = hoje.toISOString().split('T')[0];
            dataBr = hoje.toLocaleDateString('pt-BR');
        }

        const mMotivo = conteudo.match(/Motivo\(?s?\)?\s*[:\s]\s*([\s\S]*?)(?=\n\s*(?:Data|Permissão|Atenciosamente|@|$))/i);
        let motivo = mMotivo ? mMotivo[1].trim() : "MOTIVO NÃO ENCONTRADO";
        if (motivo === "MOTIVO NÃO ENCONTRADO") {
            const l = conteudo.split('\n').find(x => /Motivo/i.test(x));
            if(l) motivo = l.replace(/Motivo\(?s?\)?\s*[:\s]/i, '').trim();
        }

        const processarNick = (n) => {
            let limpo = n.trim();
            limpo = limpo.replace(/^(a|o|do|da|de)\s+/i, ''); 

            if (limpo.length > 0) {
                encontrados.push({ 
                    tipo: tipo, 
                    cargo: cargoIdentificado, 
                    nick: limpo, 
                    motivo: motivo, 
                    data_br: dataBr, 
                    data_iso: dataIso
                });
            }
        };

        if (nickIsolado.includes(' / ')) nickIsolado.split('/').forEach(processarNick);
        else processarNick(nickIsolado);
    });

    setTimeout(() => {
        if(statusContainer) statusContainer.classList.add('hidden');
        if (encontrados.length > 0) {
            actionQueue = encontrados;
            actionQueueTotal = encontrados.length;
            const containerTabela = document.getElementById('container-quadro');
            const areaRevisao = document.getElementById('area-revisao-resultados');
            if(containerTabela) containerTabela.classList.add('hidden');
            if(areaRevisao) areaRevisao.classList.remove('hidden');
            renderizarItemAtual();
        } else {
            alert("Nenhum dado encontrado.");
        }
    }, 800);
}

function renderizarItemAtual() {
    const areaRevisao = document.getElementById('area-revisao-resultados');
    if (actionQueue.length === 0) {
        areaRevisao.classList.add('hidden');
        document.getElementById('container-quadro').classList.remove('hidden');
        carregarDadosDaPlanilha();
        return;
    }

    const item = actionQueue[0];
    const nickParaImagem = item.nick.split(' ').pop();

    areaRevisao.innerHTML = `
        <div class="card-nexus-review">
            <div class="card-avatar-side">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickParaImagem}&action=std&direction=2&head_direction=3&gesture=std&size=l" class="avatar-img">
            </div>
            <div class="card-content-main">
                <div>
                    <span class="info-label">Tipo de Punição</span>
                    <span class="type-badge">${item.tipo}</span>
                    <div class="info-grid">
                        <div class="input-field">
                            <label class="info-label">Cargo + Nickname</label>
                            <input type="text" id="editNick" class="nexus-input-locked" value="${item.cargo} ${item.nick}" readonly>
                        </div>
                        <div class="input-field">
                            <label class="info-label">Data de Aplicação</label>
                            <input type="date" id="editData" class="nexus-input-locked" value="${item.data_iso}" readonly>
                        </div>
                    </div>
                    <div style="margin-top: 25px;">
                        <label class="info-label">Motivo Detalhado</label>
                        <textarea id="editMotivo" class="nexus-input-locked" style="height: 100px; resize: none;" readonly>${item.motivo}</textarea>
                    </div>
                </div>
                <div class="footer-actions">
                    <button onclick="pularAcao()" class="btn-glass btn-pular">Pular</button>
                    <div class="btn-group-right">
                        <button id="btnCorrigir" onclick="habilitarEdicao()" class="btn-glass btn-corrigir-gold">Corrigir</button>
                        <button onclick="confirmarAcao()" class="btn-glass btn-aprovar-purple">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function confirmarAcao() {
    const valorFull = document.getElementById('editNick').value;
    const dataIsoInput = document.getElementById('editData').value;
    
    let cargo = "Professor(a)";
    let nick = valorFull;
    
    if(actionQueue[0] && valorFull.includes(actionQueue[0].cargo)) {
        cargo = actionQueue[0].cargo;
        nick = valorFull.replace(cargo, '').trim();
    } else {
        const parts = valorFull.split(' ');
        if(parts.length > 1) { cargo = parts[0]; nick = parts.slice(1).join(' '); }
    }

    const p = dataIsoInput.split('-');
    const dataFormatada = `${p[2]}/${p[1]}/${p[0]}`;

    // --- CÁLCULO DINÂMICO APLICADO AQUI ---
    const terminoCalculado = calcularDataTerminoAutomatico(nick, dataIsoInput);

    itensAprovados.push({
        cargo: cargo,
        nick: nick,
        punicao: actionQueue[0].tipo,
        motivo: document.getElementById('editMotivo').value,
        data_formatada: dataFormatada,
        data_iso: dataIsoInput,
        data_termino: terminoCalculado, 
        decisao: "PENDENTE",
        observacao: "",
        sincronizado_sheets: false, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    actionQueue.shift();
    if (actionQueue.length === 0) {
        renderizarItemAtual();
        await finalizarExportacaoAutonoma();
    } else {
        renderizarItemAtual();
    }
}

function pularAcao() {
    actionQueue.shift();
    if (actionQueue.length === 0 && itensAprovados.length > 0) finalizarExportacaoAutonoma();
    else renderizarItemAtual();
}

function habilitarEdicao() {
    document.querySelectorAll('.nexus-input-locked').forEach(i => { 
        i.classList.add('unlocked'); 
        i.removeAttribute('readonly'); 
    });
    document.getElementById('btnCorrigir').innerText = "EDITANDO...";
}

// --- SALVAMENTO EM LOTE NO FIREBASE ---
async function finalizarExportacaoAutonoma() {
    const areaRevisao = document.getElementById('area-revisao-resultados');
    const toast = document.getElementById('toast-saving');
    const toastBar = document.getElementById('toast-bar');
    const toastTitle = document.querySelector('.toast-title');
    const toastDesc = document.querySelector('.toast-desc');

    if(areaRevisao) areaRevisao.classList.add('hidden');
    document.getElementById('container-quadro').classList.remove('hidden');

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('show'), 10);
    
    if(toastBar) toastBar.style.width = '30%';

    console.log("📦 Gravando lote no Firebase...");

    try {
        const batch = db.batch(); 
        const collectionRef = db.collection(NOME_COLECAO);

        itensAprovados.forEach(item => {
            const docRef = collectionRef.doc(); 
            batch.set(docRef, item);
        });

        await batch.commit();

        if(toastBar) toastBar.style.width = '100%'; 
        toast.classList.add('success');
        if(toastTitle) toastTitle.innerText = "Salvo com sucesso!";
        if(toastDesc) toastDesc.innerText = "Dados seguros no Firebase.";

        itensAprovados = [];
        await carregarDadosDaPlanilha();

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.classList.remove('success');
                if(toastBar) toastBar.style.width = '0%';
                if(toastTitle) toastTitle.innerText = "Salvando alterações...";
                if(toastDesc) toastDesc.innerText = "Sincronizando com a planilha";
            }, 500);
        }, 3000);

    } catch (e) {
        console.error("Erro ao gravar:", e);
        alert("Erro crítico ao salvar: " + e);
        toast.classList.remove('show'); 
    }
}

function mudarVisao(tipo) {
    const btnLista = document.getElementById('btn-lista');
    const btnCard = document.getElementById('btn-card');
    const container = document.getElementById('container-quadro');

    if (tipo === 'lista') {
        btnLista.classList.add('active');
        btnCard.classList.remove('active');
        container.classList.remove('view-card');
        container.classList.add('view-lista');
    } else {
        btnCard.classList.add('active');
        btnLista.classList.remove('active');
        container.classList.remove('view-lista');
        container.classList.add('view-card');
    }
}

/* ==========================================================================
   NEXUS AI (ANALISADOR) 
   ========================================================================== */
function gerarAnaliseNexus(listaPunicoes, listaMembrosReais, listaPromovidos, listaLicencas) {
    if (!listaPunicoes) return;

    const listaRec = document.getElementById('lista-recomendacoes');
    const badge = document.getElementById('badge-rec');
    
    const parseDataSegura = (str) => {
        if (!str || str.toUpperCase() === "PAUSADO") return null; // Prevenção extra
        let dia, mes, ano;
        if (str.includes('/')) { [dia, mes, ano] = str.split('/'); } 
        else if (str.includes('-')) { [ano, mes, dia] = str.split('-'); } 
        else { return new Date(str); }
        return new Date(ano, mes - 1, dia);
    };

    const limparString = (s) => {
        if (!s) return '';
        let limpo = s.toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .replace(/^(sr\.|sra\.|a |o |do |da |de )/g, '') 
            .replace(/\(a\)$/i, '') 
            .trim();
        limpo = limpo.replace(/^[.\-_]+/, '').replace(/[.\-_]+$/, '');
        limpo = limpo.replace(/[^a-z0-9:]/g, '');
        return limpo;
    };

    const mapaMembrosAtivos = {};
    if(listaMembrosReais && listaMembrosReais.length > 0) {
        listaMembrosReais.forEach(m => { if(m.nick) mapaMembrosAtivos[limparString(m.nick)] = m.cargo; });
    }
    
    const mapaPromovidos = {};
    if (listaPromovidos && listaPromovidos.length > 0) {
        listaPromovidos.forEach(p => { 
            if (p.nome && p.data) {
                mapaPromovidos[limparString(p.nome)] = parseDataSegura(p.data); 
            }
        });
    }

    const mapaLicencas = {};
    if(listaLicencas) {
        listaLicencas.forEach(l => { mapaLicencas[limparString(l.nick)] = l.data_fim; });
    }
    
    let historico = {};
    console.log("--- INICIANDO ANÁLISE NEXUS (VISUAL) ---");

    listaPunicoes.forEach((m, index) => {
        let nickRaw = m.nick ? m.nick.toString() : '';
        let nickKey = limparString(nickRaw);
        
        const numeroLinha = index + 1;

        if (!historico[nickKey]) {
            historico[nickKey] = { 
                nickOriginal: m.nick, 
                cargoPunicao: m.cargo || 'Professor',
                erros: 0, notificacoes: 0, advertencias: 0, 
                adv_meta_datas: [], 
                punicoes_vencidas: 0,
                datas_vencidas: [], 
                linhas: [],
                linhas_vencidas_real: [], 
                linhas_cancelar_promocao: [] 
            };
        }

        historico[nickKey].linhas.push(numeroLinha);

        const punicao = m.punicao ? m.punicao.toString().toUpperCase().trim() : '';
        const decisao = m.decisao ? m.decisao.toString().toUpperCase().trim() : '';
        const motivo = m.motivo ? m.motivo.toString().toLowerCase() : '';
        const dataAplicacaoStr = m.data_formatada || m.data;
        const dataTerminoStr = m.dataTermino || m.data_termino;

        const dataAplicacaoObj = parseDataSegura(dataAplicacaoStr);

        if (decisao !== 'CANCELADA' && decisao !== 'CASO REVISTO' && decisao !== 'INATIVO' && decisao !== 'EXPIRADA') {
            
            const dataPromocao = mapaPromovidos[nickKey];
            if (dataPromocao && dataAplicacaoObj) {
                const dataAppClone = new Date(dataAplicacaoObj);
                const dataPromClone = new Date(dataPromocao);
                dataAppClone.setHours(0,0,0,0);
                dataPromClone.setHours(0,0,0,0);
                
                if (dataAppClone < dataPromClone) {
                    historico[nickKey].linhas_cancelar_promocao.push(numeroLinha);
                }
            }

            if (punicao.includes('ERRO')) historico[nickKey].erros++;
            if (punicao.includes('NOTIFICAÇÃO')) historico[nickKey].notificacoes++;
            if (punicao.includes('ADVERTÊNCIA')) {
                historico[nickKey].advertencias++;
                if ((motivo.includes('meta') || motivo.includes('não cumprimento')) && dataAplicacaoStr) {
                    if(dataAplicacaoObj) historico[nickKey].adv_meta_datas.push(dataAplicacaoObj);
                }
            }
            
            // Impede de contar como vencida se estiver PAUSADA
            if (dataTerminoStr && dataTerminoStr.trim() !== "" && dataTerminoStr.toUpperCase() !== "PAUSADO") {
                const dataLimite = parseDataSegura(dataTerminoStr);
                if (dataLimite) {
                    const hoje = new Date();
                    hoje.setHours(0,0,0,0); dataLimite.setHours(0,0,0,0);
                    if (hoje > dataLimite) {
                        historico[nickKey].punicoes_vencidas++;
                        historico[nickKey].datas_vencidas.push(dataTerminoStr);
                        historico[nickKey].linhas_vencidas_real.push(numeroLinha); 
                    }
                }
            }
        }
    });

    let recomendacoesHTML = ''; 
    let totalRec = 0;

    Object.keys(historico).forEach(key => {
        const user = historico[key];
        const cargoReal = mapaMembrosAtivos[key]; 
        
        const linhasTextoGeral = user.linhas.length > 5 
            ? user.linhas.slice(0, 5).join(', ') + '...' 
            : user.linhas.join(', ');
            
        let tagLinha = `<div style="margin-top:5px; font-size:0.85rem; color:#94a3b8;"><i class="fa-solid fa-list-ol" style="margin-right:5px;"></i> Linha(s): <strong>${linhasTextoGeral}</strong></div>`;

        const dataFimLicenca = mapaLicencas[key];
        let estaDeLicenca = false;
        if (dataFimLicenca) {
            const hojeIso = new Date().toISOString().split('T')[0];
            if (dataFimLicenca >= hojeIso) estaDeLicenca = true;
        }

        let metaReincidente = false;
        if (user.adv_meta_datas.length >= 2) {
            user.adv_meta_datas.sort((a, b) => a - b);
            for (let i = 1; i < user.adv_meta_datas.length; i++) {
                const diffDias = Math.ceil(Math.abs(user.adv_meta_datas[i] - user.adv_meta_datas[i-1]) / (1000 * 60 * 60 * 24)); 
                if (diffDias <= 10) { metaReincidente = true; break; }
            }
        }

        let acao = null, tipoAlerta = '', icone = '';

        if (cargoReal === undefined && listaMembrosReais && listaMembrosReais.length > 0) { 
            acao = `Usuário <strong>${user.nickOriginal}</strong> não consta na listagem de membros ativos. Marque como <strong>Inativo</strong>.`; 
            tipoAlerta = 'alert-inactive'; icone = 'fa-user-slash'; 
        } 
        else if (user.linhas_cancelar_promocao.length > 0) { 
            const linhasCancelar = user.linhas_cancelar_promocao.join(', ');
            acao = `<strong>${user.nickOriginal}</strong> possui punição anterior à sua promoção. Atualize para <strong>CANCELADA</strong>.`; 
            tipoAlerta = 'alert-success'; icone = 'fa-award'; 
            tagLinha = `<div style="margin-top:5px; font-size:0.85rem; color:#94a3b8;"><i class="fa-solid fa-list-ol" style="margin-right:5px;"></i> Linha(s) p/ Cancelar: <strong>${linhasCancelar}</strong></div>`;
        } 
        else if (estaDeLicenca) {
            const dataBr = dataFimLicenca.split('-').reverse().join('/');
            acao = `<strong>${user.nickOriginal}</strong> está de <strong>Licença</strong> até ${dataBr}. Punições devem ser congeladas ou revisadas.`; 
            tipoAlerta = 'alert-info'; icone = 'fa-umbrella-beach';
        } 
        else if (user.punicoes_vencidas > 0) {
            const dataVenc = user.datas_vencidas[0];
            const linhasVencidas = user.linhas_vencidas_real.join(', ');
            acao = `O prazo de <strong>${user.nickOriginal}</strong> venceu em ${dataVenc}. Marque como <strong>EXPIRADA</strong>.`; 
            tipoAlerta = 'alert-warning'; icone = 'fa-history'; 
            tagLinha = `<div style="margin-top:5px; font-size:0.85rem; color:#94a3b8;"><i class="fa-solid fa-list-ol" style="margin-right:5px;"></i> Linha(s): <strong>${linhasVencidas}</strong></div>`;
        } 
        else if (metaReincidente) { 
            acao = `<strong>${user.nickOriginal}</strong> Consta com 2 Advertências por Meta consecutivas. Verifique e poste a expulsão.`; 
            tipoAlerta = 'alert-danger'; icone = 'fa-ban'; 
        } 
        else if (user.advertencias >= 3) { 
            acao = `<strong>EXPULSÃO/REBAIXAMENTO:</strong> ${user.nickOriginal} acumulou 3 Advertências Internas.`; 
            tipoAlerta = 'alert-danger'; icone = 'fa-level-down-alt'; 
        } 
        else if (user.notificacoes >= 3) { 
            const qtdAdv = Math.floor(user.notificacoes / 3);
            acao = `Aplicar <strong>${qtdAdv}x Advertência Interna</strong> em ${user.nickOriginal} (Acúmulo de ${user.notificacoes} Notificações).`; 
            tipoAlerta = 'alert-warning'; icone = 'fa-exclamation-triangle'; 
        } 
        else if (user.erros >= 3) { 
            const qtdNotif = Math.floor(user.erros / 3);
            acao = `Aplicar <strong>${qtdNotif}x Notificação</strong> em ${user.nickOriginal} (Acúmulo de ${user.erros} Erros).`; 
            tipoAlerta = 'alert-info'; icone = 'fa-info-circle'; 
        } 
        else {
            const cPunicaoLimpo = limparString(user.cargoPunicao);
            const cRealLimpo = limparString(cargoReal);
            let cargosDiferentes = cPunicaoLimpo !== cRealLimpo;
            if (cPunicaoLimpo.includes('conselheiro') && cRealLimpo.includes('conselheiro')) cargosDiferentes = false;
            if (cargosDiferentes) {
                acao = `<strong>${user.nickOriginal}</strong> consta na punição como <em>${user.cargoPunicao}</em> mas na listagem oficial é <strong>${cargoReal}</strong>. Atualize o cargo.`; 
                tipoAlerta = 'alert-warning'; icone = 'fa-sync-alt'; 
            }
        }

        if (acao) {
            recomendacoesHTML += `
                <div class="rec-item ${tipoAlerta}">
                    <div class="rec-icon-box"><i class="fa-solid ${icone}"></i></div>
                    <div class="rec-content"><h4>Ação Necessária</h4><p>${acao}</p>${tagLinha}</div>
                    <button class="btn-check-action" onclick="marcarResolvido(this)"><i class="fa-solid fa-check"></i></button>
                </div>`;
            totalRec++;
        }
    });

    if (totalRec > 0) { 
        listaRec.innerHTML = recomendacoesHTML; 
        badge.innerText = totalRec; 
        badge.classList.remove('hidden'); 
    } else { 
        listaRec.innerHTML = `<div class="rec-empty"><i class="fa-solid fa-check-circle"></i><p>Tudo limpo!</p></div>`; 
        badge.classList.add('hidden'); 
    }
}

// === FUNÇÕES GLOBAIS ===
function abrirModalAdd() {
    const modal = document.getElementById('modalAddPunicao');
    if(modal) {
        modal.classList.remove('hidden');
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('addData').value = hoje;
        setTimeout(() => document.getElementById('addNick').focus(), 100);
    }
}

function mostrarToastProcessando() {
    const toast = document.getElementById('toast-saving');
    const toastTitle = document.querySelector('.toast-title');
    const toastDesc = document.querySelector('.toast-desc');
    const toastBar = document.getElementById('toast-bar');

    if(toast) {
        toast.classList.remove('hidden', 'success');
        toast.classList.add('show');
        if(toastTitle) toastTitle.innerText = "Sincronizando...";
        if(toastDesc) toastDesc.innerText = "Enviando dados para a nuvem.";
        
        if(toastBar) {
            toastBar.style.width = '0%';
            toastBar.style.transition = 'width 10s linear'; 
            setTimeout(() => { toastBar.style.width = '80%'; }, 50);
        }
    }
}

function mostrarToastSucesso(nick) {
    const toast = document.getElementById('toast-saving');
    const toastTitle = document.querySelector('.toast-title');
    const toastDesc = document.querySelector('.toast-desc');
    const toastBar = document.getElementById('toast-bar');

    if(toast) {
        toast.classList.remove('hidden', 'show');
        toast.classList.add('success', 'show');
        
        if(toastTitle) toastTitle.innerText = "Registro Salvo!";
        if(toastDesc) toastDesc.innerText = `${nick} foi adicionado.`;
        if(toastBar) {
            toastBar.style.transition = 'width 0.3s ease';
            toastBar.style.width = '100%';
        }

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.classList.remove('success');
                if(toastBar) toastBar.style.width = '0%';
            }, 300);
        }, 3000);
    }
}

async function salvarPunicaoManual() {
    console.log("Iniciando salvamento manual...");
    
    const cargo = document.getElementById('addCargo').value;
    const nickInput = document.getElementById('addNick');
    const tipo = document.getElementById('addTipo').value;
    const dataIso = document.getElementById('addData').value;
    const motivo = document.getElementById('addMotivo').value.trim();

    let nicks = [];
    if (nickInput && nickInput.value.trim() !== "") {
        nicks = nickInput.value.split('/').map(n => n.trim()).filter(n => n !== "");
    }

    if (nicks.length === 0 || !dataIso || !motivo) {
        alert("Preencha todos os campos!");
        return;
    }

    fecharModais();
    mostrarToastProcessando();

    const p = dataIso.split('-');
    const dataFormatada = `${p[2]}/${p[1]}/${p[0]}`;

    try {
        console.log("Enviando manual para Firebase:", nicks);

        const batch = db.batch();
        const collectionRef = db.collection(NOME_COLECAO);

        nicks.forEach(unicoNick => {
            const terminoCalculado = calcularDataTerminoAutomatico(unicoNick, dataIso);
            const docRef = collectionRef.doc();
            batch.set(docRef, {
                cargo: cargo,
                nick: unicoNick,
                punicao: tipo,
                motivo: motivo,
                data_formatada: dataFormatada,
                data_iso: dataIso,
                decisao: "PENDENTE",
                sincronizado_sheets: false, 
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                observacao: ""
            });
        });

        await batch.commit();

        mostrarToastSucesso(nicks[0]);
        if(document.getElementById('addNick')) document.getElementById('addNick').value = '';
        if(document.getElementById('addMotivo')) document.getElementById('addMotivo').value = '';
        
        await carregarDadosDaPlanilha();

    } catch (erro) {
        console.error("Erro no envio:", erro);
        alert("Erro de conexão. Verifique o console.");
    }
}

window.postarRelatorioConclusao = function() {
    console.log("--- 🕵️ INICIANDO POSTAGEM ---");

    const user = auth.currentUser; 
    let nickUsuario = "Usuario";

    if (user && user.displayName) {
        nickUsuario = user.displayName;
    } else {
        const el = document.getElementById('header-user-name'); 
        if (el) nickUsuario = el.innerText.replace(/\.$/, '').trim();
        else {
            const elPopup = document.getElementById('dashboard-user-name');
            if (elPopup) nickUsuario = elPopup.innerText.replace(/\.$/, '').trim();
        }
    }

    const dataObj = new Date();
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const hoje = `${ano}-${mes}-${dia}`;

    const baseUrl = "/companhia/conselho/forms.html";
    const params = new URLSearchParams();

    params.append("entry.372789037", nickUsuario);       
    params.append("entry.1283543386", "Funções realizadas"); 
    params.append("entry.161138300", hoje);              
    params.append("entry.11080706", "Assistência");      

    window.open(`${baseUrl}?usp=pp_url&${params.toString()}`, '_blank');
}

window.abrirModalAdd = abrirModalAdd;
window.fecharModais = fecharModais;
window.processarTextoParaFila = processarTextoParaFila;
window.confirmarAcao = confirmarAcao;
window.pularAcao = pularAcao;
window.habilitarEdicao = habilitarEdicao;
window.salvarPunicaoManual = salvarPunicaoManual;
window.mudarVisao = mudarVisao;
window.editarTexto = editarTexto;
window.editarData = editarData;
window.salvarCargo = salvarCargo;
window.salvarPunicao = salvarPunicao;
window.salvarDecisao = salvarDecisao;

window.marcarResolvido = function(botao) { 
    const item = botao.closest('.rec-item');
    item.classList.add('resolvido');
    const badge = document.getElementById('badge-rec');
    let total = parseInt(badge.innerText);
    
    if (total > 0) {
        total--;
        badge.innerText = total;
        if (total === 0) badge.classList.add('hidden');
    }

    setTimeout(() => {
        item.style.display = 'none'; 
        const lista = document.getElementById('lista-recomendacoes');
        const itensVisiveis = lista.querySelectorAll('.rec-item:not([style*="display: none"])');
        
        if (itensVisiveis.length === 0) {
            lista.innerHTML = `<div class="rec-empty"><i class="fa-solid fa-check-circle"></i><p>Tudo limpo! Você zerou as pendências.</p></div>`;
        }
    }, 400);
}

window.toggleRecomendacoes = function() {
    const painel = document.getElementById('nexus-recomenda');
    const icone = document.getElementById('rec-icon');

    if (painel) {
        painel.classList.toggle('minimized');
        if(icone) {
            if(painel.classList.contains('minimized')) {
                icone.classList.remove('fa-chevron-down');
                icone.classList.add('fa-chevron-up');
            } else {
                icone.classList.remove('fa-chevron-up');
                icone.classList.add('fa-chevron-down');
            }
        }
    }
}

async function sincronizarPrazosSilencioso() {
    const batch = db.batch();
    let houveAlteracao = false;

    dadosGlobais.forEach(m => {
        if (m.decisao === "PENDENTE" || m.decisao === "APROVADA") {
            const dataCorreta = calcularDataTerminoAutomatico(m.nick, m.data_iso);
            
            if (m.dataTermino !== dataCorreta) {
                batch.update(db.collection(NOME_COLECAO).doc(m.id), { 
                    data_termino: dataCorreta 
                });
                houveAlteracao = true;
            }
        }
    });

    if (houveAlteracao) {
        await batch.commit();
        // Atualiza apenas o dado local sem recarregar tudo (evita loop)
        dadosGlobais.forEach(m => {
            if (m.decisao === "PENDENTE" || m.decisao === "APROVADA") {
                m.dataTermino = calcularDataTerminoAutomatico(m.nick, m.data_iso);
            }
        });
        console.log("✅ Datas de término sincronizadas silenciosamente.");
    }
}

/* ==========================================================================
   FUNÇÃO MESTRE: ATUALIZAR DADOS E SINCRONIZAR PRAZOS
   ========================================================================== */
async function atualizarSistemaNexus() {
    const btn = document.querySelector('.btn-refresh i');
    if(btn) btn.classList.add('fa-spin'); 

    try {
        console.log("🔄 Nexus AI: Iniciando atualização completa...");
        await carregarDadosDaPlanilha();
        await sincronizarPrazosSilencioso();
        console.log("✅ Nexus AI: Sistema sincronizado com sucesso!");
    } catch (error) {
        console.error("Erro na atualização mestre:", error);
    } finally {
        if(btn) setTimeout(() => btn.classList.remove('fa-spin'), 500);
    }
}

window.atualizarSistemaNexus = atualizarSistemaNexus;