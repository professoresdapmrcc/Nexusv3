// =========================================================
// PORTAL DE TRANSPARÊNCIA - HISTÓRICO DE PROMOÇÕES AGRUPADO
// =========================================================

let lotesGlobais = [];
let pastaAtivaId = null; 

const STATUS_ESTILOS = {
    "promovido": { corTexto: "text-emerald-400", corBorda: "border-emerald-500/30", corFundo: "bg-emerald-900/20", icon: "fa-arrow-up" },
    "mantém": { corTexto: "text-blue-400", corBorda: "border-blue-500/30", corFundo: "bg-blue-900/20", icon: "fa-minus" },
    "mantem": { corTexto: "text-blue-400", corBorda: "border-blue-500/30", corFundo: "bg-blue-900/20", icon: "fa-minus" },
    "rebaixado": { corTexto: "text-red-400", corBorda: "border-red-500/30", corFundo: "bg-red-900/20", icon: "fa-arrow-down" },
    "demitido": { corTexto: "text-red-500", corBorda: "border-red-600/50", corFundo: "bg-red-950/40", icon: "fa-times" }
};

// Formatação padronizada para adicionar o (a)
const MAPA_CARGOS = {
    "PROFESSOR": "Professor(a)",
    "ESTAGIARIO": "Estagiário(a)",
    "ESTAGIÁRIO": "Estagiário(a)",
};

function formatarCargo(cargoRaw) {
    if (!cargoRaw) return "Membro";
    const cargoUpper = cargoRaw.toUpperCase().trim();
    return MAPA_CARGOS[cargoUpper] || cargoRaw;
}

// ==========================================
// 1. INICIALIZAÇÃO
// ==========================================
document.addEventListener('userDataReady', async (e) => {
    if (!e.detail.userData) {
        document.getElementById('access-denied-screen').classList.remove('hidden');
        return;
    }
    db = firebase.firestore();
    document.getElementById('access-denied-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    // Configura os 3 Filtros
    document.getElementById('filter-nick').addEventListener('input', executarFiltrosAtuais);
    document.getElementById('filter-cargo').addEventListener('change', executarFiltrosAtuais);
    document.getElementById('filter-mes').addEventListener('change', executarFiltrosAtuais);
    
    document.getElementById('btn-sync')?.addEventListener('click', carregarLotesIniciais);
    
    await carregarLotesIniciais();
});

// ==========================================
// 2. BUSCA NO BANCO DE DADOS
// ==========================================
async function carregarLotesIniciais() {
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    
    if (icon) icon.classList.add('fa-spin');
    if (text) text.innerText = "Sincronizando...";

    try {
        const snap = await db.collection("historico_promocoes").get();

        if (snap.empty) {
            document.getElementById('promocoes-container').innerHTML = `<div class="text-center py-20 text-slate-500 bg-[#05070c] border border-slate-800 rounded-3xl shadow-xl"><h3 class="text-xl font-black">Nenhum histórico encontrado.</h3></div>`;
            return;
        }

        lotesGlobais = [];
        snap.forEach(doc => {
            lotesGlobais.push({
                id: doc.id,
                timestamp: parseInt(doc.id),
                data: doc.data()
            });
        });

        lotesGlobais.sort((a, b) => b.timestamp - a.timestamp);

        if (icon) icon.classList.replace('text-pink-500', 'text-emerald-500');
        if (text) text.innerText = "Atualizado!";
        setTimeout(() => {
            if (icon) icon.classList.replace('text-emerald-500', 'text-pink-500');
            if (text) text.innerText = "Sincronizar Banco";
        }, 3000);

        voltarParaLotes();

    } catch (error) {
        console.error("Erro ao puxar lotes:", error);
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

// ==========================================
// 3. EXTRATOR INTELIGENTE E AGRUPADOR
// ==========================================
function extrairAvaliacoes(dadosDoLote, loteId) {
    let avaliacoes = [];

    function extrairDeObjeto(obj) {
        if (!obj || typeof obj !== 'object') return;
        const keys = Object.keys(obj).map(k => k.toLowerCase());
        const isAvaliacao = keys.includes('nick_avaliado') || keys.includes('nick') || keys.includes('veredito') || keys.includes('dissertacao');

        if (isAvaliacao) {
            const getVal = (chaves, padrao) => {
                for (let key of Object.keys(obj)) {
                    if (chaves.includes(key.toLowerCase())) return obj[key];
                }
                return padrao;
            };

            avaliacoes.push({
                nick: String(getVal(['nick_avaliado', 'nick'], 'Desconhecido')),
                cargo: String(getVal(['cargo', 'cargo_avaliado'], 'Membro')),
                veredito: String(getVal(['veredito', 'status'], 'Sem veredito')),
                avaliador: String(getVal(['avaliador', 'autor', 'promotor'], 'Gestão')),
                dissertacao: String(getVal(['dissertacao', 'comentario', 'motivo'], 'Sem justificativa gravada.')),
                dataLote: loteId
            });
        }

        Object.keys(obj).forEach(k => {
            const valor = obj[k];
            if (valor && typeof valor === 'object' && typeof valor.toDate !== 'function') extrairDeObjeto(valor);
        });
    }

    extrairDeObjeto(dadosDoLote);
    return avaliacoes;
}

function agruparPorMembro(avaliacoesArray) {
    const grupos = {};
    avaliacoesArray.forEach(av => {
        const nickKey = av.nick.toLowerCase();
        if (!grupos[nickKey]) {
            grupos[nickKey] = {
                nick: av.nick,
                cargo: av.cargo,
                dataLote: av.dataLote,
                votos: []
            };
        }
        grupos[nickKey].votos.push(av);
    });
    return Object.values(grupos).sort((a, b) => a.nick.localeCompare(b.nick));
}

// ==========================================
// 4. MÁQUINAS DE NAVEGAÇÃO E FILTROS DIRECIONADOS
// ==========================================
window.voltarParaLotes = function() {
    pastaAtivaId = null;
    document.getElementById('filter-nick').value = '';
    document.getElementById('filter-cargo').value = 'all';
    
    document.getElementById('btn-voltar-container').classList.add('hidden');
    document.getElementById('titulo-lote-ativo').classList.add('hidden');
    
    // Reativa o campo de mês ao voltar para a raiz global
    const selectMes = document.getElementById('filter-mes');
    selectMes.disabled = false;
    selectMes.classList.remove('opacity-50', 'cursor-not-allowed');

    renderizarGaleriaDePastas();
}

window.abrirLote = function(loteId) {
    pastaAtivaId = loteId;
    
    // Limpa o input de Nick e Cargo ao entrar na pasta para ver todo mundo dela primeiro
    document.getElementById('filter-nick').value = '';
    document.getElementById('filter-cargo').value = 'all';

    // Desativa o filtro de mês visualmente, pois já estamos dentro de uma data específica
    const selectMes = document.getElementById('filter-mes');
    selectMes.disabled = true;
    selectMes.classList.add('opacity-50', 'cursor-not-allowed');

    document.getElementById('btn-voltar-container').classList.remove('hidden');

    const loteSelecionado = lotesGlobais.find(l => String(l.id) === String(loteId));
    if (loteSelecionado) {
        const dataObj = dayjs(loteSelecionado.timestamp);
        const txtData = dataObj.isValid() ? dataObj.format('DD MMM YYYY') : '';
        const titulo = document.getElementById('titulo-lote-ativo');
        titulo.innerText = `Visualizando Fechamento: ${txtData}`;
        titulo.classList.remove('hidden');

        executarFiltrosAtuais(); // Roda a renderização filtrando localmente
    }
}

function executarFiltrosAtuais() {
    const termoNick = document.getElementById('filter-nick').value.toLowerCase().trim();
    const cargoFiltro = document.getElementById('filter-cargo').value;
    const cargoApenasLetras = cargoFiltro.replace(/[^A-Z]/g, '');
    const mesFiltro = document.getElementById('filter-mes').value;

    // CENÁRIO 1: PESQUISA DENTRO DO CARD/LOTE SELECIONADO
    if (pastaAtivaId) {
        const loteSelecionado = lotesGlobais.find(l => String(l.id) === String(pastaAtivaId));
        if (!loteSelecionado) return;

        const avaliacoesBrutas = extrairAvaliacoes(loteSelecionado.data, loteSelecionado.id);
        const agrupadosDesteLote = agruparPorMembro(avaliacoesBrutas);

        const encontrados = agrupadosDesteLote.filter(m => {
            const matchNick = termoNick === '' || (m.nick || '').toLowerCase().includes(termoNick);
            let matchCargo = true;
            if (cargoFiltro !== 'all') {
                const cargoMembroLetras = (m.cargo || '').toUpperCase().replace(/[^A-Z]/g, '');
                matchCargo = cargoMembroLetras.includes(cargoApenasLetras);
            }
            return matchNick && matchCargo;
        });

        renderizarGridMembros(encontrados, false);
        return;
    }

    // CENÁRIO 2: VISÃO GLOBAL (GALERIA DE PASTAS)
    // Se digitou Nick ou Cargo na raiz, ele procura o membro em TODOS os lotes do mês selecionado
    if (termoNick !== '' || cargoFiltro !== 'all') {
        document.getElementById('btn-voltar-container').classList.remove('hidden');
        document.getElementById('titulo-lote-ativo').classList.add('hidden');
        
        let todosAgrupadosGlobais = [];

        lotesGlobais.forEach(lote => {
            if (mesFiltro !== 'all') {
                const mesLote = dayjs(lote.timestamp).month().toString();
                if (mesLote !== mesFiltro) return;
            }

            const avaliacoesBrutas = extrairAvaliacoes(lote.data, lote.id);
            const agrupadosDesteLote = agruparPorMembro(avaliacoesBrutas);
            
            const encontrados = agrupadosDesteLote.filter(m => {
                const matchNick = termoNick === '' || (m.nick || '').toLowerCase().includes(termoNick);
                let matchCargo = true;
                if (cargoFiltro !== 'all') {
                    const cargoMembroLetras = (m.cargo || '').toUpperCase().replace(/[^A-Z]/g, '');
                    matchCargo = cargoMembroLetras.includes(cargoApenasLetras);
                }
                return matchNick && matchCargo;
            });
            
            todosAgrupadosGlobais = todosAgrupadosGlobais.concat(encontrados);
        });

        renderizarGridMembros(todosAgrupadosGlobais, true); // true = exibe o card da data na tela global
        return;
    }

    // Se estiver tudo vazio na Raiz Global, apenas mostra as Pastas filtradas pelo Mês escolhido
    renderizarGaleriaDePastas();
}

// ==========================================
// 5. RENDERIZAÇÃO DE INTERFACE
// ==========================================
function renderizarGaleriaDePastas() {
    const container = document.getElementById('promocoes-container');
    let html = ``;
    const mesFiltro = document.getElementById('filter-mes').value;

    lotesGlobais.forEach(lote => {
        // Filtro de Mês Global
        if (mesFiltro !== 'all') {
            const mesLote = dayjs(lote.timestamp).month().toString();
            if (mesLote !== mesFiltro) return;
        }

        const dataObj = dayjs(lote.timestamp);
        const dataExibicao = dataObj.isValid() ? dataObj.format('DD MMM YYYY').toUpperCase() : 'DATA DESCONHECIDA';
        
        const avaliacoes = extrairAvaliacoes(lote.data, lote.id);
        const membrosAgrupados = agruparPorMembro(avaliacoes);
        const qtdMembros = membrosAgrupados.length;
        
        let promovidosCount = 0;
        avaliacoes.forEach(a => { if((a.veredito || '').toLowerCase().includes('promovido')) promovidosCount++; });

        html += `
        <div class="bg-[#05070c] border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-pink-500/50 transition-all cursor-pointer" onclick="abrirLote('${lote.id}')">
            <div class="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-pink-500/10 transition-all"></div>
            
            <div class="flex items-center justify-between border-b border-slate-800/50 pb-4 mb-4">
                <span class="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center"><i class="far fa-calendar-alt mr-2 text-blue-400"></i> PROMOVIDOS</span>
                <span class="bg-purple-900/20 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner"><i class="fas fa-folder-open mr-1"></i> ${qtdMembros} Avaliados</span>
            </div>
            
            <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-2xl bg-[#0b0f19] border border-pink-500/30 flex flex-col items-center justify-center flex-shrink-0 shadow-inner group-hover:bg-pink-900/20 transition-colors">
                    <i class="fas fa-users text-pink-400 text-xl"></i>
                </div>
                <div>
                    <h3 class="text-xl font-black text-white leading-tight">Promovidos da Semana #PROF</h3>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">${dataExibicao}</p>
                </div>
            </div>

            <div class="bg-[#0b0f19] rounded-2xl p-3 border border-slate-800/50 shadow-inner flex justify-between items-center">
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Número de Promovidos</span>
                <span class="text-xs font-black text-emerald-400"><i class="fas fa-arrow-up mr-1"></i> ${promovidosCount} Promoções</span>
            </div>
        </div>`;
    });

    if (html === '') {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-[#05070c] border border-slate-800 rounded-3xl shadow-xl"><i class="fas fa-calendar-times text-6xl text-pink-500/30 mb-6 block"></i><h3 class="text-2xl font-black text-white mb-2">Nenhum Fechamento</h3><p class="text-sm">Não há lotes salvos no mês selecionado.</p></div>`;
    } else {
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">${html}</div>`;
    }
}

function renderizarGridMembros(membrosArray, isBuscaGlobal = false) {
    const container = document.getElementById('promocoes-container');

    if (membrosArray.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-[#05070c] border border-slate-800 rounded-3xl shadow-xl"><i class="fas fa-search text-6xl text-pink-500/30 mb-6 block"></i><h3 class="text-2xl font-black text-white mb-2">Nenhum registro</h3><p class="text-sm">Nenhum membro encontrado com os filtros aplicados.</p></div>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">`;
    
    membrosArray.forEach(m => {
        const dataObj = dayjs(parseInt(m.dataLote));
        const dataExibicao = dataObj.isValid() ? dataObj.format('DD MMM YYYY').toUpperCase() : 'DATA DESCONHECIDA';
        const infoExtra = isBuscaGlobal ? `<div class="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center"><span class="text-[9px] uppercase tracking-widest font-black text-slate-500"><i class="far fa-calendar-alt text-blue-400"></i> Lote da Avaliação</span><span class="text-xs font-black text-white">${dataExibicao}</span></div>` : '';

        let styleCard = 'border-slate-800 hover:border-pink-500/50';
        m.votos.forEach(v => {
            if((v.veredito || '').toLowerCase().includes('promovido')) styleCard = 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            if((v.veredito || '').toLowerCase().includes('demitido')) styleCard = 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
        });

        const safeMembroData = encodeURIComponent(JSON.stringify(m));

        html += `
        <div class="bg-[#05070c] border rounded-3xl p-6 shadow-xl relative overflow-hidden group transition-all cursor-pointer ${styleCard}" onclick="abrirDetalhesMembro('${safeMembroData}')">
            
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(m.nick)}&direction=2&head_direction=2&gesture=sml&size=l" class="w-14 h-14 rounded-full border-2 border-slate-700 bg-[#0b0f19] object-cover">
                    <div class="overflow-hidden">
                        <h3 class="text-lg font-black text-white truncate leading-tight">${m.nick}</h3>
                        <p class="text-[10px] text-pink-400 font-bold uppercase tracking-widest truncate mt-1">${formatarCargo(m.cargo)}</p>
                    </div>
                </div>
            </div>

            <div class="bg-[#0b0f19] rounded-2xl p-3 border border-slate-800/50 shadow-inner flex justify-between items-center">
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opiniões Registradas</span>
                <span class="text-xs font-black text-blue-400 bg-blue-900/20 px-2 py-1 rounded border border-blue-500/30"><i class="fas fa-comment-dots mr-1"></i> ${m.votos.length} Votos</span>
            </div>
            
            ${infoExtra}
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

window.abrirDetalhesMembro = function(membroDataStr) {
    const membro = JSON.parse(decodeURIComponent(membroDataStr));
    const container = document.getElementById('promocoes-container');
    
    document.getElementById('titulo-lote-ativo').innerText = `Ficha Completa: ${membro.nick}`;
    document.getElementById('titulo-lote-ativo').classList.remove('hidden');
    document.getElementById('btn-voltar-container').classList.remove('hidden');

    let promovidos = 0, mantens = 0, reprovacoesExternas = 0;
    
    membro.votos.forEach(v => {
        const vt = (v.veredito || '').toLowerCase();
        if(vt.includes('promovido')) promovidos++;
        else if(vt.includes('rebaixado') || vt.includes('demitido')) reprovacoesExternas++;
        else mantens++;
    });

    let linhaReprovacoes = '';
    if (reprovacoesExternas > 0) {
        linhaReprovacoes = `
            <div class="flex justify-between items-center text-xs mt-2">
                <span class="font-black text-slate-500 uppercase">Reprovações</span>
                <span class="font-black text-red-400">${reprovacoesExternas} Votos</span>
            </div>`;
    }

    let htmlVotos = '';
    membro.votos.forEach(v => {
        const chaveVeredito = (v.veredito || '').toLowerCase();
        let configEstilo = { corTexto: "text-slate-400", corBorda: "border-slate-700/50", corFundo: "bg-slate-800/40", icon: "fa-gavel" };
        
        for (const chave in STATUS_ESTILOS) {
            if (chaveVeredito.includes(chave)) {
                configEstilo = STATUS_ESTILOS[chave];
                break;
            }
        }
        
        const txtComentario = (v.dissertacao || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '<br>');

        htmlVotos += `
        <div class="bg-[#05070c] rounded-2xl p-5 border border-slate-800 shadow-xl mb-4 hover:border-pink-500/30 transition-colors">
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-black text-white flex items-center"><i class="fas fa-user-tie text-pink-500 mr-2"></i> ${v.avaliador}</span>
                <span class="${configEstilo.corFundo} ${configEstilo.corBorda} ${configEstilo.corTexto} border px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner"><i class="fas ${configEstilo.icon} mr-1"></i> ${v.veredito}</span>
            </div>
            <p class="text-sm text-slate-300 italic leading-relaxed pl-4 border-l-2 border-slate-800">"${txtComentario}"</p>
        </div>`;
    });

    container.innerHTML = `
    <div class="col-span-full flex flex-col lg:flex-row gap-8 w-full animate-fade-in">
        
        <div class="w-full lg:w-1/3 flex flex-col gap-6">
            <div class="bg-[#05070c] border border-slate-800 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-b from-pink-900/10 to-transparent pointer-events-none"></div>
                
                <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Membro Avaliado</h4>
                <h2 class="text-2xl font-black text-white mb-6 relative z-10 truncate w-full text-center">${membro.nick}</h2>
                
                <div class="relative w-40 h-40 mb-6 flex justify-center items-center">
                    <div class="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full"></div>
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(membro.nick)}&direction=2&head_direction=2&gesture=sml&size=l" class="w-32 h-32 object-cover rounded-full border-4 border-[#0b0f19] shadow-2xl relative z-10 bg-slate-900">
                </div>

                <div class="w-full bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 relative z-10 shadow-inner">
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-black text-slate-500 uppercase">Cargo</span>
                        <span class="font-bold text-pink-400">${formatarCargo(membro.cargo)}</span>
                    </div>
                    <div class="h-px bg-slate-800 w-full my-1"></div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-black text-slate-500 uppercase">Promoções</span>
                        <span class="font-black text-emerald-400">${promovidos} Votos</span>
                    </div>
                    <div class="flex justify-between items-center text-xs mt-2">
                        <span class="font-black text-slate-500 uppercase">Manter</span>
                        <span class="font-black text-blue-400">${mantens} Votos</span>
                    </div>
                    ${linhaReprovacoes}
                </div>
            </div>
        </div>

        <div class="w-full lg:w-2/3">
            <div class="bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl">
                <h3 class="text-base font-black text-white uppercase tracking-widest mb-6 border-b border-slate-800 pb-4"><i class="fas fa-gavel text-pink-500 mr-2"></i> Pareceres do Conselho</h3>
                
                <div class="space-y-4">
                    ${htmlVotos}
                </div>
            </div>
        </div>

    </div>`;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}