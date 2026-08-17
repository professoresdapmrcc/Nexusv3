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
let mapaDinamicoLicencas = {};

// Variáveis globais auxiliares para a IA
let globalMembrosAtivos = [];
let globalPromovidos = [];
let globalLicencas = [];

/* --- FUNÇÃO DE CÁLCULO AUTOMÁTICO (Adicione aqui) --- */
function calcularDataTerminoAutomatico(nick, dataInicioIso) {
    if (!dataInicioIso) return "--";
    const nickLimpo = nick.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const diasLicencaExtra = mapaDinamicoLicencas[nickLimpo] || 0;
    const data = new Date(dataInicioIso + "T12:00:00"); 
    data.setDate(data.getDate() + 30 + diasLicencaExtra);
    return data.toLocaleDateString('pt-BR');
}

/* ==========================================================================
   AUTENTICAÇÃO E INICIALIZAÇÃO SEGURA
   ========================================================================== */

async function initializeAppForUser(userData) {
    if (sistemaIniciado) return;

    // 1. Verifica se usuário existe
    if (!userData) {
        console.warn("[Auth] Usuário não detectado.");
        bloquearAcessoVisual("Usuário não identificado. Faça login novamente.");
        return;
    }

    console.log("[Auth] Verificando:", userData.name);

    // 2. Normaliza dados
    const userCargo = userData.cargo || "";
    const userRole = userData.role || ""; 

    // 3. Regras de Acesso
    const temCargoPermitido = CARGOS_PERMITIDOS.some(role => userCargo.includes(role));
    const ehAdmin = userRole === "admin" || userRole === "dono";

    // --- LÓGICA DE DECISÃO ---
    if (temCargoPermitido || ehAdmin) {
        // SUCESSO
        sistemaIniciado = true;
        document.body.classList.remove('auth-loading');
        
        configurarFiltros();
        
        // Pequeno delay para garantir que o 'db' do global.js esteja pronto
        setTimeout(() => {
            carregarDadosDaPlanilha(); 
        }, 500);

    } else {
        // FALHA
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

// Configura os filtros
function configurarFiltros() {
    const inputBusca = document.getElementById('inputBusca');
    const filtroCargo = document.getElementById('filtro-cargo');
    const filtroPunicao = document.getElementById('filtro-punicao');

    if (inputBusca) inputBusca.addEventListener('input', filtrarTabela);
    if (filtroCargo) filtroCargo.addEventListener('change', filtrarTabela);
    if (filtroPunicao) filtroPunicao.addEventListener('change', filtrarTabela);
}

// --- ESCUTA DE EVENTOS ---
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
   CARREGAMENTO E FILTRAGEM (USANDO GLOBAL 'db')
   ========================================================================== */
async function carregarDadosDaPlanilha() {
    const container = document.getElementById('container-quadro');
    const loaderBar = document.getElementById('nexus-loader-bar');
    
    if(loaderBar) loaderBar.classList.remove('hidden');
    if(container) container.innerHTML = ''; 

    try {
        console.log("🔥 Buscando Punições e Licenças Individuais...");
        
        const [snapshotPunicoes, docAuxiliar, snapshotLicencas] = await Promise.all([
            db.collection(NOME_COLECAO).orderBy("data_iso", "desc").limit(300).get(),
            db.collection('nexus_config').doc('dados_externos').get(),
            db.collection('licencas').get() // <--- NOVA BUSCA
        ]);

        // 1. Mapeia as Licenças Individuais (ID do documento é o nick limpo)
        mapaDinamicoLicencas = {};
        snapshotLicencas.forEach(doc => {
            const info = doc.data();
            mapaDinamicoLicencas[doc.id] = parseInt(info.licenca) || 0;
        });

        // 2. Processa Punições (mantém seu código atual)
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

        sincronizarDatasComLicencasAtuais();

        // 3. Dados Auxiliares (mantém seu código atual)
        if (docAuxiliar.exists) {
            const aux = docAuxiliar.data();
            globalMembrosAtivos = aux.membros_ativos || [];
            globalPromovidos = aux.promovidos || [];
        }

        filtrarTabela(); 

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
        
        // --- FILTRO DE STATUS (PENDENTE + APROVADA) ---
        const decisao = (m.decisao || "PENDENTE").toString().toUpperCase().trim();
        const matchStatus = (decisao === "PENDENTE" || decisao === "APROVADA");

        const matchNome = nick.includes(termo);
        const matchCargo = cargoFiltro === "" || cargo.includes(cargoFiltro);
        const matchPunicao = punicaoFiltro === "" || punicao.includes(punicaoFiltro.toUpperCase());
        
        return matchNome && matchCargo && matchPunicao && matchStatus;
    });

    console.log("✅ Itens filtrados para exibir:", filtrados.length);
    
    // 1. Renderiza a tabela visual
    renderizarListaDeMembros(filtrados);

    // 2. Chama a IA apenas com os dados filtrados (Sincronia Visual)
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
        
        // --- LIMPEZA APENAS VISUAL (Remove artigos do inicio) ---
        nickLimpo = nickLimpo.replace(/^(a|o|do|da|de)\s+/i, '');
        
        const classePunicao = getCorPunicao(m.punicao);
        const classeDecisao = getCorDecisao(m.decisao);
        
        // Linha visual (sincronizada com a IA)
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
   FUNÇÕES DE EDIÇÃO E SALVAMENTO (USANDO GLOBAL 'db')
   ========================================================================== */

// Helpers visuais
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

// Funções Trigger
function salvarCargo(select, docId) {
    salvarEdicao(docId, 'cargo', select.value); 
}

function salvarPunicao(select, docId) {
    select.className = `select-punicao ${getCorPunicao(select.value)}`;
    salvarEdicao(docId, 'punicao', select.value); // campo no DB é 'punicao'
}

function salvarDecisao(select, docId) {
    const novoStatus = select.value;
    
    // 1. Atualiza a cor do select imediatamente (Feedback visual)
    select.className = `select-decisao ${getCorDecisao(novoStatus)}`;
    
    // 2. Salva no Banco de Dados
    salvarEdicao(docId, 'decisao', novoStatus);
    
    // --- LÓGICA DO TEMPORIZADOR (10 MINUTOS) ---
    
    // Lista de status que DEVEM ficar na tela.
    // Qualquer coisa que NÃO esteja aqui, vai sumir após 10 min.
    const statusQueFicam = ['PENDENTE', 'APROVADA'];
    
    // Verifica se o status atual deve sumir (Inativo, Cancelada, Acúmulo, Expirada, Revisto...)
    const deveSumir = !statusQueFicam.includes(novoStatus.toUpperCase());

    const linha = select.closest('.item-lista');
    if (!linha) return;

    // A. Se já existe um timer rodando (ex: marcou Inativo, mas mudou de ideia), cancela ele.
    if (linha.dataset.timerRemove) {
        console.log("Cancelando remoção agendada...");
        clearTimeout(parseInt(linha.dataset.timerRemove));
        delete linha.dataset.timerRemove;
        
        // Remove qualquer estilo de "quase sumindo" caso tenha aplicado
        linha.style.opacity = "1";
        linha.style.transform = "translateX(0)";
    }

    // B. Se for um status de saída (Acúmulo, Inativo, etc), inicia a contagem
    if (deveSumir) {
        console.log(`⏳ Status '${novoStatus}' detectado. Removendo em 10 minutos...`);
        
        // 600000 ms = 10 minutos
        const timerId = setTimeout(() => {
            // Animação de saída suave
            linha.style.transition = "opacity 0.5s, transform 0.5s";
            linha.style.opacity = "0";
            linha.style.transform = "translateX(50px)";
            
            // Remove do HTML
            setTimeout(() => {
                linha.remove();
                console.log("Item removido da tela.");
            }, 500);
        }, 600000); 

        // Salva o ID do timer na linha para poder cancelar se você mudar de ideia
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
        let novoValor = input.value; // formato YYYY-MM-DD
        if (novoValor) {
            const p = novoValor.split('-');
            const dataBr = `${p[2]}/${p[1]}/${p[0]}`; 
            span.innerText = dataBr;
            
            // Salva tanto o formato visual quanto o ISO para ordenação
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

        // ADICIONE ESTE BLOCO ABAIXO
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
    const modal = document.getElementById('modalImportTexto');
    if(modal) modal.classList.remove('hidden');
}

function fecharModais() {
    ['modalImportTexto', 'import-status-container', 'modalAddPunicao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
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

        // Regex que captura a linha do nome
        const mCargoNick = conteudo.match(/(?:Cargo e nick|Nick|Membro|Usuário|Nome)(?:.*?)[:\s]\s*([^\n\r]+)/i);
        
        if (!mCargoNick) return;

        let cargoNickTexto = mCargoNick[1].trim();
        
        // --- SEPARAÇÃO DE CARGO E NICK ---
        let cargoIdentificado = "Professor(a)";
        let nickIsolado = cargoNickTexto;

        const listaCargos = ['Professor', 'Coordenador', 'Graduador', 'Estagiário', 'Conselheiro'];
        for (const c of listaCargos) {
            if (new RegExp(c, 'i').test(cargoNickTexto)) {
                cargoIdentificado = c + "(a)";
                
                // LIMPEZA ESPECÍFICA (Mantendo pontuação do Nick)
                nickIsolado = cargoNickTexto
                    .replace(new RegExp(c, 'i'), '') // Remove o cargo
                    .replace(/\(a\)/gi, '')          // Remove (a)
                    // Remove "do notificado" e seus dois pontos, mas não toca no nick
                    .replace(/do(?:a)?\s+notificado(?:a)?[:\s]*/gi, '') 
                    .trim();
                
                // Remove artigos soltos no início APENAS se tiver espaço depois (ex: "o User" vira "User", mas ".User" fica ".User")
                nickIsolado = nickIsolado.replace(/^(o|a|do|da|de)\s+/i, '');
                
                break;
            }
        }

        // --- DATA E MOTIVO ---
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
            
            // Remove artigos soltos novamente por segurança (apenas palavra+espaço)
            limpo = limpo.replace(/^(a|o|do|da|de)\s+/i, ''); 
            
            // --- REMOVIDO: A linha que deletava ':' do início foi apagada ---
            // Antes tinha: if (limpo.startsWith(':')) ... AGORA NÃO TEM MAIS.

            if (limpo.length > 0) {
                encontrados.push({ 
                    tipo: tipo, 
                    cargo: cargoIdentificado, 
                    nick: limpo, // Vai exatamente como está (com . , : se tiver)
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

    // --- FALTA ISSO AQUI ---
    const terminoCalculado = calcularDataTerminoAutomatico(nick, dataIsoInput);

    itensAprovados.push({
        cargo: cargo,
        nick: nick,
        punicao: actionQueue[0].tipo,
        motivo: document.getElementById('editMotivo').value,
        data_formatada: dataFormatada,
        data_iso: dataIsoInput,
        data_termino: terminoCalculado, // Agora a variável existe!
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
        const batch = db.batch(); // Batch é melhor para lotes na V8
        const collectionRef = db.collection(NOME_COLECAO);

        itensAprovados.forEach(item => {
            const docRef = collectionRef.doc(); // Gera ID automático
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
   NEXUS AI (ANALISADOR) - COM SINCRONIA VISUAL
   ========================================================================== */
function gerarAnaliseNexus(listaPunicoes, listaMembrosReais, listaPromovidos, listaLicencas) {
    if (!listaPunicoes) return;

    const listaRec = document.getElementById('lista-recomendacoes');
    const badge = document.getElementById('badge-rec');
    
    // 1. Funções Auxiliares
    const parseDataSegura = (str) => {
        if (!str) return null;
        let dia, mes, ano;
        if (str.includes('/')) { [dia, mes, ano] = str.split('/'); } 
        else if (str.includes('-')) { [ano, mes, dia] = str.split('-'); } 
        else { return new Date(str); }
        return new Date(ano, mes - 1, dia);
    };

    // LIMPEZA BLINDADA (Como definimos antes)
    const limparString = (s) => {
        if (!s) return '';
        let limpo = s.toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .replace(/^(sr\.|sra\.|a |o |do |da |de )/g, '') 
            .replace(/\(a\)$/i, '') 
            .trim();
        // Remove pontos/traços do começo e fim
        limpo = limpo.replace(/^[.\-_]+/, '').replace(/[.\-_]+$/, '');
        // Remove caracteres especiais, mantendo :
        limpo = limpo.replace(/[^a-z0-9:]/g, '');
        return limpo;
    };

    // 2. Mapeamento Externo
    const mapaMembrosAtivos = {};
    if(listaMembrosReais && listaMembrosReais.length > 0) {
        listaMembrosReais.forEach(m => { if(m.nick) mapaMembrosAtivos[limparString(m.nick)] = m.cargo; });
    }
    const nicksPromovidos = (listaPromovidos || []).map(n => limparString(n));
    const mapaLicencas = {};
    if(listaLicencas) {
        listaLicencas.forEach(l => { mapaLicencas[limparString(l.nick)] = l.data_fim; });
    }
    
    // 3. Análise
    let historico = {};
    console.log("--- INICIANDO ANÁLISE NEXUS (VISUAL) ---");

    // listaPunicoes aqui são os FILTRADOS (Visualmente sincronizados)
    listaPunicoes.forEach((m, index) => {
        let nickRaw = m.nick ? m.nick.toString() : '';
        let nickKey = limparString(nickRaw);
        
        // Número visual (1, 2, 3...) que bate com a tabela
        const numeroLinha = index + 1;

        if (!historico[nickKey]) {
            historico[nickKey] = { 
                nickOriginal: m.nick, 
                cargoPunicao: m.cargo || 'Professor',
                erros: 0, notificacoes: 0, advertencias: 0, 
                adv_meta_datas: [], punicoes_vencidas: 0,
                datas_vencidas: [], // Guarda a data que venceu para mostrar no HTML
                linhas: [] // Array para guardar as linhas visuais
            };
        }

        historico[nickKey].linhas.push(numeroLinha);

        const punicao = m.punicao ? m.punicao.toString().toUpperCase().trim() : '';
        const decisao = m.decisao ? m.decisao.toString().toUpperCase().trim() : '';
        const motivo = m.motivo ? m.motivo.toString().toLowerCase() : '';
        const dataAplicacaoStr = m.data_formatada || m.data;
        const dataTerminoStr = m.dataTermino || m.data_termino;

        if (decisao !== 'CANCELADA' && decisao !== 'CASO REVISTO' && decisao !== 'INATIVO' && decisao !== 'EXPIRADA') {
            if (punicao.includes('ERRO')) historico[nickKey].erros++;
            if (punicao.includes('NOTIFICAÇÃO')) historico[nickKey].notificacoes++;
            if (punicao.includes('ADVERTÊNCIA')) {
                historico[nickKey].advertencias++;
                if ((motivo.includes('meta') || motivo.includes('não cumprimento')) && dataAplicacaoStr) {
                    const dataObj = parseDataSegura(dataAplicacaoStr);
                    if(dataObj) historico[nickKey].adv_meta_datas.push(dataObj);
                }
            }
            
            // --- VERIFICAÇÃO DE PUNIÇÃO EXPIRADA ---
            if (dataTerminoStr && dataTerminoStr.trim() !== "") {
                const dataLimite = parseDataSegura(dataTerminoStr);
                if (dataLimite) {
                    const hoje = new Date();
                    hoje.setHours(0,0,0,0); dataLimite.setHours(0,0,0,0);
                    if (hoje > dataLimite) {
                        historico[nickKey].punicoes_vencidas++;
                        historico[nickKey].datas_vencidas.push(dataTerminoStr);
                    }
                }
            }
        }
    });

    // 4. Geração de Recomendações HTML
    let recomendacoesHTML = ''; 
    let totalRec = 0;

    Object.keys(historico).forEach(key => {
        const user = historico[key];
        const cargoReal = mapaMembrosAtivos[key]; 
        const foiPromovido = nicksPromovidos.includes(key); 
        
        // Formata as linhas para exibir (ex: Linha(s): 1, 5)
        const linhasTexto = user.linhas.length > 5 
            ? user.linhas.slice(0, 5).join(', ') + '...' 
            : user.linhas.join(', ');
        const tagLinha = `<div style="margin-top:5px; font-size:0.85rem; color:#94a3b8;"><i class="fa-solid fa-list-ol" style="margin-right:5px;"></i> Linha(s): <strong>${linhasTexto}</strong></div>`;

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
        } else if (foiPromovido) { 
            acao = `<strong>${user.nickOriginal}</strong> está na lista de Promovidos (P). Cancele as punições antigas.`; 
            tipoAlerta = 'alert-success'; icone = 'fa-award'; 
        } else if (estaDeLicenca) {
            const dataBr = dataFimLicenca.split('-').reverse().join('/');
            acao = `<strong>${user.nickOriginal}</strong> está de <strong>Licença</strong> até ${dataBr}. Punições devem ser congeladas ou revisadas.`; 
            tipoAlerta = 'alert-info'; icone = 'fa-umbrella-beach';
        } else if (user.punicoes_vencidas > 0) {
            // MOSTRA O ALERTA DE EXPIRADA CONFORME SOLICITADO
            const dataVenc = user.datas_vencidas[0];
            acao = `O prazo de <strong>${user.nickOriginal}</strong> venceu em ${dataVenc}. Marque como <strong>EXPIRADA</strong>.`; 
            tipoAlerta = 'alert-warning'; icone = 'fa-history'; 
        } else if (metaReincidente) { 
            acao = `<strong>${user.nickOriginal}</strong> Consta com 2 Advertências por Meta consecutivas. Verifique e poste a expulsão.`; 
            tipoAlerta = 'alert-danger'; icone = 'fa-ban'; 
        } else if (user.advertencias >= 3) { 
            acao = `<strong>EXPULSÃO/REBAIXAMENTO:</strong> ${user.nickOriginal} acumulou 3 Advertências Internas.`; 
            tipoAlerta = 'alert-danger'; icone = 'fa-level-down-alt'; 
        } else if (user.notificacoes >= 3) { 
            const qtdAdv = Math.floor(user.notificacoes / 3);
            acao = `Aplicar <strong>${qtdAdv}x Advertência Interna</strong> em ${user.nickOriginal} (Acúmulo de ${user.notificacoes} Notificações).`; 
            tipoAlerta = 'alert-warning'; icone = 'fa-exclamation-triangle'; 
        } else if (user.erros >= 3) { 
            const qtdNotif = Math.floor(user.erros / 3);
            acao = `Aplicar <strong>${qtdNotif}x Notificação</strong> em ${user.nickOriginal} (Acúmulo de ${user.erros} Erros).`; 
            tipoAlerta = 'alert-info'; icone = 'fa-info-circle'; 
        } else {
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

    const baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfFAsst6e6slOMWGlzqA3vECDPgcMEgcg6VQmncoi4geyVAhQ/viewform";
    const params = new URLSearchParams();

    params.append("entry.372789037", nickUsuario);       
    params.append("entry.1283543386", "Funções realizadas"); 
    params.append("entry.161138300", hoje);              
    params.append("entry.11080706", "Assistência");      

    window.open(`${baseUrl}?usp=pp_url&${params.toString()}`, '_blank');
}

// Expondo funções globais necessárias para o HTML (onclick)
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
    console.log("Tentando abrir o Nexus..."); 
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

async function sincronizarDatasComLicencasAtuais() {
    console.log("🔄 Verificando integridade das datas...");
    const batch = db.batch();
    let houveAjuste = false;

    dadosGlobais.forEach(m => {
        if (m.decisao === "PENDENTE" || m.decisao === "APROVADA") {
            const dataCorreta = calcularDataTerminoAutomatico(m.nick, m.data_iso);
            // Se o que está no banco (m.dataTermino) for diferente do cálculo atual
            if (m.dataTermino !== dataCorreta) {
                batch.update(db.collection(NOME_COLECAO).doc(m.id), { data_termino: dataCorreta });
                houveAjuste = true;
            }
        }
    });

    if (houveAjuste) {
        await batch.commit();
        console.log("✅ Datas de término sincronizadas com as licenças atuais.");
    }
}

/* ==========================================================================
   FUNÇÃO MESTRE: ATUALIZAR DADOS E SINCRONIZAR PRAZOS
   ========================================================================== */
async function atualizarSistemaNexus() {
    const btn = document.querySelector('.btn-refresh i');
    if(btn) btn.classList.add('fa-spin'); // Faz o ícone girar enquanto trabalha

    try {
        console.log("🔄 Nexus AI: Iniciando atualização completa...");
        
        // 1. Carrega os dados mais recentes do Firebase (Snapshots e Licenças)
        await carregarDadosDaPlanilha();
        
        // 2. Roda o recálculo automático silenciosamente para corrigir divergências
        await sincronizarPrazosSilencioso();
        
        console.log("✅ Nexus AI: Sistema sincronizado com sucesso!");
    } catch (error) {
        console.error("Erro na atualização mestre:", error);
    } finally {
        if(btn) setTimeout(() => btn.classList.remove('fa-spin'), 500);
    }
}

/* FUNÇÃO AUXILIAR: Varre e corrige o banco de dados sem janelas de alerta */
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
        // Recarrega a tabela visual uma última vez com as datas corrigidas
        await carregarDadosDaPlanilha();
    }
}

// Garante que a função mestre esteja disponível no HTML
window.atualizarSistemaNexus = atualizarSistemaNexus;