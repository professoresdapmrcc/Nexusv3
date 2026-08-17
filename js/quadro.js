// --- ESTADO GLOBAL ---
let registrosFirebase = [];
let visaoAtual = 'lista';
let mapaLicencasQuadro = {}; // Agora armazena { dias: X, status: 'ativo/inativo' }

// --- FUNÇÃO AUXILIAR: NORMALIZAR NICK ---
function normalizarNick(nick) {
    return (nick || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// --- CÁLCULO DE DIAS RESTANTES (Com suporte a Licença Pausada) ---
function calcularDiasRestantes(dataTermino) {
    if (!dataTermino || dataTermino === "" || dataTermino === "--") return null;
    
    // Se o banco salvou como "PAUSADO", retornamos o status especial
    if (dataTermino.toUpperCase() === "PAUSADO") return "PAUSADO";
    
    const partes = dataTermino.split('/');
    if (partes.length !== 3) return null;
    
    const [dia, mes, ano] = partes.map(Number);
    const fim = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    
    fim.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = fim.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// --- BUSCA DE DADOS (PUXANDO REGISTROS + LICENÇAS) ---
async function puxarDados() {
    try {
        console.log("🔄 Buscando registros e licenças atualizadas...");
        document.body.classList.add('auth-loading');

        const [querySnapshot, docAuxiliar] = await Promise.all([
            db.collection('assistencia_registros').get(),
            db.collection('nexus_config').doc('dados_externos').get()
        ]);

        // 1. Mapeia as Licenças e o Status de Licença
        mapaLicencasQuadro = {};
        if (docAuxiliar.exists) {
            const aux = docAuxiliar.data();
            const listaMembros = aux.membros_ativos || [];
            
            listaMembros.forEach(m => {
                if (m.nick) {
                    const nickChave = normalizarNick(m.nick);
                    mapaLicencasQuadro[nickChave] = {
                        dias: parseInt(m.licenca) || 0,
                        status: (m.status_licenca || 'inativo').toString().toLowerCase()
                    };
                }
            });
        }

        // 2. Processa os registros de punição
        registrosFirebase = []; 
        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            
            // Filtra apenas os aprovados para o quadro público
            if (dados.decisao === "APROVADA") {
                registrosFirebase.push({
                    id: doc.id,
                    ...dados,
                    data_termino: dados.data_termino || "--" 
                });
            }
        });

        console.log(`✅ Sucesso: ${registrosFirebase.length} punições e licenças carregadas.`);
        renderizar();
    } catch (e) {
        console.error("❌ Erro ao carregar dados:", e);
    } finally {
        document.body.classList.remove('auth-loading');
    }
}

// --- RENDERIZAÇÃO ---
function renderizar() {
    const container = document.getElementById('container-quadro');
    if (!container) return;

    const termo = document.getElementById('busca-nick')?.value.toLowerCase() || "";
    const filtroCargo = document.getElementById('filtro-cargo')?.value || "";
    const filtroPunicao = document.getElementById('filtro-punicao')?.value || "";

    const filtrados = registrosFirebase.filter(r => {
        const nick = (r.nick || "").toLowerCase();
        const cargo = (r.cargo || "");
        const punicao = (r.punicao || "");
        return nick.includes(termo) && (!filtroCargo || cargo.includes(filtroCargo)) && (!filtroPunicao || punicao.includes(filtroPunicao));
    });

    function gerarHtmlDias(r) {
        const dias = calcularDiasRestantes(r.data_termino);
        const nickChave = normalizarNick(r.nick);
        const infoLicenca = mapaLicencasQuadro[nickChave] || { dias: 0, status: 'inativo' };
        
        let badgeLicenca = "";
        
        // Se estiver ATIVAMENTE de licença, mostra o aviso de pausa azul
        if (dias === "PAUSADO" || infoLicenca.status === 'ativo') {
            badgeLicenca = `<span style="display:block; color: #3b82f6; font-size: 0.65rem;"><i class="fa-solid fa-snowflake"></i> Tempo Congelado</span>`;
            return `${badgeLicenca} <small style="color: #3b82f6; font-weight: bold;">(Licença Ativa)</small>`;
        }

        // Se já voltou (inativo), mas tem dias de bônus acumulados
        if (infoLicenca.dias > 0) {
            badgeLicenca = `<span style="display:block; color: #10b981; font-size: 0.65rem;">+${infoLicenca.dias}d de licença</span>`;
        }

        if (dias === null) return "";
        if (dias > 0) return `${badgeLicenca} <small style="color: #aeb9e1;">(${dias} dias restantes)</small>`;
        if (dias === 0) return `${badgeLicenca} <small style="color: #ffcc00; font-weight: bold;">(Vence Hoje)</small>`;
        return `${badgeLicenca} <small style="color: #ff5555; font-weight: bold;">(Expirado)</small>`;
    }

    // Lógica de exibição da Lista
    if (visaoAtual === 'lista') {
        container.className = 'view-lista';
        let html = `<div class="lista-row header-lista"><div>IMG</div><div>NICKNAME</div><div>CARGO</div><div>PUNIÇÃO</div><div style="flex: 2;">MOTIVO</div><div>INÍCIO</div><div>TÉRMINO</div></div>`;
        html += filtrados.map(r => {
            const punicao = r.punicao || "N/A";
            let badgeClass = punicao.toLowerCase().includes('erro') ? 'badge-erro' : (punicao.toLowerCase().includes('notificação') ? 'badge-notif' : 'badge-adv');
            
            return `
            <div class="lista-row item-lista">
                <div class="avatar-habbo"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${r.nick}&headonly=1"></div>
                <div class="nick-destaque">${r.nick}</div>
                <div style="font-size:0.85rem; opacity:0.9">${r.cargo}</div>
                <div><span class="badge-status ${badgeClass}">${punicao.replace(" ", "<br>")}</span></div>
                <div style="font-size:0.85rem; flex: 2; padding-right: 10px;">${r.motivo || ""}</div>
                <div style="font-size:0.85rem; opacity:0.7">${r.data_formatada || "--"}</div>
                <div style="font-size:0.85rem; font-weight:700; color:var(--cor-primaria-clara);">${r.data_termino} <br> ${gerarHtmlDias(r)}</div>
            </div>`;
        }).join('');
        container.innerHTML = html;
    } 
    // Lógica de exibição de Cards
    else {
        container.className = 'view-card';
        container.innerHTML = filtrados.map(r => `
            <div class="card-quadro" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div class="card-header-flex">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${r.nick}&headonly=1">
                    <div>
                        <span style="color:var(--cor-primaria-clara); font-size:0.7rem;">${r.cargo}</span>
                        <h2 class="nickname">${r.nick}</h2>
                    </div>
                </div>
                <div class="motivo-box" style="flex-grow: 1; margin-bottom: 15px;">
                    <p><strong>${r.punicao}:</strong> ${r.motivo}</p>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                    <div><span style="display:block; font-size: 0.65rem; opacity: 0.6;">Início</span><span>${r.data_formatada || "--"}</span></div>
                    <div style="text-align: right;">
                        <span style="display:block; font-size: 0.65rem; opacity: 0.6;">Término</span>
                        <span style="color: var(--cor-primaria-clara);">${r.data_termino}</span>
                        <div>${gerarHtmlDias(r)}</div>
                    </div>
                </div>
            </div>`).join('');
    }
}

// --- LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    ['busca-nick', 'filtro-cargo', 'filtro-punicao'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderizar);
    });
    document.getElementById('btn-lista')?.addEventListener('click', () => { visaoAtual = 'lista'; renderizar(); });
    document.getElementById('btn-card')?.addEventListener('click', () => { visaoAtual = 'card'; renderizar(); });
    puxarDados();
});