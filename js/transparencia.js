// =========================================================
// PORTAL DE TRANSPARÊNCIA - BASEADO 100% NO ARQUIVO DE BACKUPS
// =========================================================

const VEREDICT_ICONS = {
    "Aprovada": { icon: "fa-check-circle", class: "text-emerald-400 border-emerald-500/30 bg-emerald-900/20" },
    "Aprovada com alterações": { icon: "fa-check-double", class: "text-amber-400 border-amber-500/30 bg-amber-900/20" },
    "Reprovada": { icon: "fa-times-circle", class: "text-red-400 border-red-500/30 bg-red-900/20" },
    "Reunião": { icon: "fa-users", class: "text-blue-400 border-blue-500/30 bg-blue-900/20" },
    "Tutela": { icon: "fa-shield-alt", class: "text-purple-400 border-purple-500/30 bg-purple-900/20" },
    "Enviado à liderança": { icon: "fa-arrow-up", class: "text-pink-400 border-pink-500/30 bg-pink-900/20" },
    "Autoria própria": { icon: "fa-user-edit", class: "text-cyan-400 border-cyan-500/30 bg-cyan-900/20" },
    "Pendente": { icon: "fa-clock", class: "text-slate-400 border-slate-700/50 bg-slate-800/40" }
};

let todosOsBackups = {};
let backupsEmOrdem = [];
let propostasDoBackupAtual = [];
let chartInstance = null;

function obterOrdemProposta(proposta) {
    const ordem = proposta?.ordem ?? proposta?.Ordem;
    const numero = Number.parseInt(ordem, 10);
    return Number.isFinite(numero) ? numero : null;
}

function obterOrdemVoto(voto) {
    const ordem = voto?.Ordem ?? voto?.ordem;
    const numero = Number.parseInt(ordem, 10);
    return Number.isFinite(numero) ? numero : null;
}

function normalizarNickVotante(voto) {
    return String(voto?.Nick ?? voto?.nick ?? '').trim().toLowerCase();
}

function obterDataVoto(voto) {
    const timestamp = voto?.Timestamp ?? voto?.timestamp;
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    const millis = new Date(timestamp).getTime();
    return Number.isFinite(millis) ? millis : 0;
}

function consolidarVotosDaProposta(proposta, votosGerais = []) {
    const ordem = obterOrdemProposta(proposta);
    if (ordem === null) return [];

    const votosInternos = Array.isArray(proposta?.votos)
        ? proposta.votos
        : (Array.isArray(proposta?.Votos) ? proposta.Votos : []);
    const votosDoLote = Array.isArray(votosGerais)
        ? votosGerais.filter(voto => obterOrdemVoto(voto) === ordem)
        : [];

    const votosPorAvaliador = new Map();
    [...votosInternos, ...votosDoLote].forEach((voto, index) => {
        const nick = normalizarNickVotante(voto);
        const chave = nick || String(voto?.id || `registro-${index}`);
        const votoAnterior = votosPorAvaliador.get(chave);

        if (!votoAnterior || obterDataVoto(voto) >= obterDataVoto(votoAnterior)) {
            votosPorAvaliador.set(chave, voto);
        }
    });

    return Array.from(votosPorAvaliador.values());
}

function prepararProposta(proposta, votosGerais = []) {
    return {
        ...proposta,
        votos: consolidarVotosDaProposta(proposta, votosGerais)
    };
}

function consolidarPropostasDosBackups(backupsOrdenados) {
    const propostasConsolidadas = [];
    const ordensAdicionadas = new Set();

    // Os backups chegam do mais recente para o mais antigo. A primeira
    // ocorrência de cada ordem é, portanto, a versão válida mais atual.
    backupsOrdenados.forEach(backup => {
        const propostas = Array.isArray(backup?.propostas) ? backup.propostas : [];
        const votosGerais = Array.isArray(backup?.votos) ? backup.votos : [];

        propostas.forEach(proposta => {
            const ordem = obterOrdemProposta(proposta);
            if (ordem === null || ordensAdicionadas.has(ordem)) return;

            ordensAdicionadas.add(ordem);
            propostasConsolidadas.push(prepararProposta(proposta, votosGerais));
        });
    });

    return propostasConsolidadas;
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
    
    document.getElementById('filter-id').addEventListener('input', filtrarPropostas);
    document.getElementById('btn-sync')?.addEventListener('click', atualizarPortalTransparencia);
    
    await carregarListaDeBackups();
});

// ==========================================
// FUNÇÃO DE ATUALIZAÇÃO GLOBAL
// ==========================================
async function atualizarPortalTransparencia() {
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    
    if (icon) icon.classList.add('fa-spin');
    if (text) text.innerText = "Sincronizando (Firebase)...";
    
    try {
        const select = document.getElementById('filter-date');
        const backupIdAnterior = select ? select.value : null;

        await carregarListaDeBackups();

        if (backupIdAnterior && select) {
            select.value = backupIdAnterior;
            mudarBackupAtivo();
        }

        if (icon) icon.classList.replace('text-purple-500', 'text-emerald-500');
        if (text) text.innerText = "Tabela Atualizada";
        
        setTimeout(() => {
            if (icon) icon.classList.replace('text-emerald-500', 'text-purple-500');
            if (text) text.innerText = "Atualizar Tabela";
        }, 3000);

    } catch (err) {
        console.error("Erro ao atualizar portal:", err);
        if (text) text.innerText = "Erro de Conexão";
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

// ==========================================
// 2. CARREGA OS LOTES DE BACKUP DO FIREBASE
// ==========================================
async function carregarListaDeBackups() {
    const select = document.getElementById('filter-date'); 
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>Buscando históricos públicos...</option>';

    try {
        const snap = await db.collection("nexus_config")
                               .doc("backup_respostas")
                               .collection("historico")
                               .orderBy('timestamp', 'desc')
                               .get();

        if (snap.empty) {
            select.innerHTML = '<option value="" disabled selected>Nenhum backup localizado</option>';
            return;
        }

        let options = '<option value="__consolidado__" selected>Histórico consolidado (sem duplicatas)</option>';
        todosOsBackups = {};
        
        const backupsOrdenados = [];
        snap.forEach(doc => {
            const data = doc.data();
            todosOsBackups[doc.id] = data;
            backupsOrdenados.push(data);
            const nomeExibicao = data.nome_backup || data.data_formatada || `Lote ${doc.id}`;
            options += `<option value="${doc.id}">${nomeExibicao}</option>`;
        });
        
        select.innerHTML = options;
        select.removeEventListener('change', mudarBackupAtivo);
        select.addEventListener('change', mudarBackupAtivo);

        backupsEmOrdem = backupsOrdenados;
        propostasDoBackupAtual = consolidarPropostasDosBackups(backupsEmOrdem);
        filtrarPropostas();

    } catch (err) {
        console.error("Erro ao ler árvore do Firebase: ", err);
        select.innerHTML = '<option value="" disabled selected>Erro ao sincronizar Firestore</option>';
    }
}

function mudarBackupAtivo() {
    const backupId = document.getElementById('filter-date').value;
    if (backupId === '__consolidado__') {
        propostasDoBackupAtual = consolidarPropostasDosBackups(backupsEmOrdem);
        filtrarPropostas();
        return;
    }
    if (!backupId || !todosOsBackups[backupId]) return;

    const backupData = todosOsBackups[backupId];
    
    if (Array.isArray(backupData.propostas)) {
        const listaTodosVotos = backupData.votos || [];
        const ordensAdicionadas = new Set();

        propostasDoBackupAtual = backupData.propostas.reduce((lista, proposta) => {
            const ordem = obterOrdemProposta(proposta);
            if (ordem === null || ordensAdicionadas.has(ordem)) return lista;

            ordensAdicionadas.add(ordem);
            lista.push(prepararProposta(proposta, listaTodosVotos));
            return lista;
        }, []);
    } else {
        propostasDoBackupAtual = [];
    }

    filtrarPropostas();
}

// ==========================================
// 3. FILTRAGEM DOS DADOS
// ==========================================
function filtrarPropostas() {
    const filterId = document.getElementById('filter-id').value.trim();
    
    let listaFiltrada = propostasDoBackupAtual.filter(p => {
        const ordem = obterOrdemProposta(p);
        if (filterId && String(ordem) !== filterId) return false;
        return true;
    });

    listaFiltrada.sort((a, b) => (obterOrdemProposta(b) || 0) - (obterOrdemProposta(a) || 0));
    renderGallery(listaFiltrada);
}

// ==========================================
// 4. RENDERIZAÇÃO DA GALERIA DO PORTAL
// ==========================================
function renderGallery(lista) {
    const container = document.getElementById('gallery-container');
    
    if (lista.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20 text-slate-500 bg-[#05070c] border border-slate-800 rounded-3xl shadow-xl">
                <i class="fas fa-search text-6xl text-purple-500/50 mb-6 block"></i>
                <h3 class="text-2xl font-black text-white mb-2">Nenhum resultado</h3>
                <p class="text-sm">Nenhuma proposta encontrada com esse número neste lote.</p>
            </div>`;
        return;
    }

    let html = '';
    lista.forEach(p => {
        const ordem = obterOrdemProposta(p);
        const titulo = p.titulo || p.Titulo || 'Sem Título';
        const autor = p.autor || p.Autor || 'Desconhecido';
        const tipo = p.tipo || p.Categoria || 'Documento';
        const dataProp = p.data || p.Data || '';
        
        let dataFormatada = 'SEM DATA';
        if (dataProp) {
            const d = dayjs(dataProp);
            if (d.isValid()) dataFormatada = d.format('DD MMM YYYY').toUpperCase();
        }

        const listaVotos = p.votos || p.Votos || [];
        const qtdVotos = listaVotos.length;

        let favoraveis = 0, reprovadas = 0;
        let votoDoLider = null;

        listaVotos.forEach(v => {
            const veredito = v.Veredito || v.veredito || '';
            const nickAtavaliador = (v.Nick || v.nick || '').toLowerCase();

            if (veredito.includes('Aprovada')) favoraveis++;
            else if (veredito.includes('Reprovada')) reprovadas++;

            if (nickAtavaliador === 'sr.gabriel.' || nickAtavaliador === 'pegas' || nickAtavaliador === ':_wanderson_:') {
                votoDoLider = v;
            }
        });

        const totalValidos = favoraveis + reprovadas;
        const taxaFav = totalValidos > 0 ? Math.round((favoraveis / totalValidos) * 100) : 0;
        const taxaRep = totalValidos > 0 ? Math.round((reprovadas / totalValidos) * 100) : 0;

        let statusTextoVisual = "Em discussão";
        let barColor = "bg-blue-500";
        let txtColor = "text-blue-400";
        let porcentagemExibicao = taxaFav;

        let temVereditoLider = false;

        if (votoDoLider) {
            const vLider = votoDoLider.Veredito || votoDoLider.veredito || '';
            if (vLider.includes('Aprovada')) {
                statusTextoVisual = "Aprovada (Liderança)";
                barColor = "bg-emerald-500"; txtColor = "text-emerald-400";
                porcentagemExibicao = 100;
                temVereditoLider = true;
            } else if (vLider.includes('Reprovada')) {
                statusTextoVisual = "Reprovada (Liderança)";
                barColor = "bg-red-500"; txtColor = "text-red-400";
                porcentagemExibicao = 0;
                temVereditoLider = true;
            }
        }

        if (!temVereditoLider) {
            if (favoraveis > reprovadas) {
                statusTextoVisual = `Aprovada (${taxaFav}%)`;
                barColor = "bg-emerald-500"; txtColor = "text-emerald-400";
                porcentagemExibicao = taxaFav;
            } else if (reprovadas > favoraveis) {
                statusTextoVisual = `Reprovada (${taxaRep}%)`;
                barColor = "bg-red-500"; txtColor = "text-red-400";
                porcentagemExibicao = taxaFav; 
            } else if (qtdVotos > 0 && totalValidos > 0) {
                statusTextoVisual = "Empate Técnico";
                barColor = "bg-blue-500"; txtColor = "text-blue-400";
                porcentagemExibicao = 50;
            } else if (qtdVotos > 0 && totalValidos === 0) {
                statusTextoVisual = "Abstenção Geral";
                barColor = "bg-slate-500"; txtColor = "text-slate-400";
                porcentagemExibicao = 0;
            } else {
                statusTextoVisual = "Sem Votos";
                barColor = "bg-slate-500"; txtColor = "text-slate-400";
                porcentagemExibicao = 0;
            }
        }

        html += `
        <div class="bg-[#05070c] border border-slate-800 p-7 rounded-3xl cursor-pointer hover:border-purple-500 transition-all shadow-xl hover:shadow-purple-900/20 relative overflow-hidden" onclick="abrirDetalhes('${ordem}')">
            <div class="absolute top-0 left-0 w-1 h-full ${barColor}"></div>
            <div class="flex justify-between items-center mb-5 pl-3">
                <span class="bg-[#0b0f19] text-purple-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-800">Nº ${ordem}</span>
                <span class="text-[10px] font-black bg-[#0b0f19] px-3 py-1.5 rounded-xl border border-slate-800 ${txtColor} flex items-center gap-1.5"><i class="fas fa-poll"></i> ${qtdVotos} Votos</span>
            </div>
            <h3 class="text-lg font-black text-white leading-tight mb-4 line-clamp-2 pl-3">${titulo}</h3>
            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 pl-3"><i class="far fa-calendar-alt mr-1.5"></i> ${dataFormatada}</p>
            
            <div class="bg-[#0b0f19] p-4 rounded-2xl border border-slate-800/50 flex flex-col gap-3 ml-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(autor)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-6 h-6 rounded-full border border-slate-700 bg-black flex-shrink-0">
                        <span class="text-xs font-bold text-slate-300 truncate">${autor}</span>
                    </div>
                    <span class="text-[8px] font-black text-pink-400 bg-pink-900/10 px-2 py-1 rounded border border-pink-500/20 uppercase tracking-widest flex-shrink-0">${tipo}</span>
                </div>
                <div class="mt-1 border-t border-slate-800/50 pt-3">
                    <div class="flex justify-between items-end mb-1.5">
                        <span class="text-[9px] uppercase font-black text-slate-500 tracking-widest">Resultado</span>
                        <span class="text-xs font-black ${txtColor}">${statusTextoVisual}</span>
                    </div>
                    <div class="w-full bg-[#05070c] border border-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                        <div class="${barColor} h-full transition-all duration-1000" style="width: ${porcentagemExibicao}%"></div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ==========================================
// 5. EXIBIÇÃO DETALHADA (PARECERES INTERNOS)
// ==========================================
window.abrirDetalhes = function(ordem) {
    const pInfo = propostasDoBackupAtual.find(p => (p.ordem || p.Ordem) == ordem);
    if (!pInfo) return;

    document.getElementById('det-ordem').innerText = ordem;
    document.getElementById('det-autor').innerText = pInfo.autor || pInfo.Autor || 'Desconhecido';
    document.getElementById('det-tipo').innerText = pInfo.tipo || pInfo.Categoria || 'Documento';
    document.getElementById('det-titulo').innerText = pInfo.titulo || pInfo.Titulo || 'Sem Título';

    const votos = pInfo.votos || pInfo.Votos || [];
    document.getElementById('det-qtd').innerText = votos.length;

    let fav = 0, neg = 0, neu = 0;
    let votoDoLider = null;

    votos.forEach(v => {
        const veredito = v.Veredito || v.veredito || 'Pendente';
        const nickAtavaliador = (v.Nick || v.nick || '').toLowerCase();

        if (veredito.includes('Aprovada')) fav++;
        else if (veredito.includes('Reprovada')) neg++;
        else neu++;

        if (nickAtavaliador === 'sr.gabriel.' || nickAtavaliador === 'pegas' || nickAtavaliador === ':_wanderson_:') {
            votoDoLider = v;
        }
    });

    const totalValidos = fav + neg;
    const taxaFav = totalValidos > 0 ? Math.round((fav / totalValidos) * 100) : 0;
    
    let labelStatus = "Empate Técnico";
    let barCor = 'bg-blue-500';
    let txtPercent = `${taxaFav}%`;
    let barWidth = taxaFav;

    if (votoDoLider) {
        const vLider = votoDoLider.Veredito || votoDoLider.veredito || '';
        if (vLider.includes('Aprovada')) {
            labelStatus = "Aprovada (Liderança)";
            barCor = 'bg-emerald-500';
            barWidth = 100;
            txtPercent = "100%";
        } else if (vLider.includes('Reprovada')) {
            labelStatus = "Reprovada (Liderança)";
            barCor = 'bg-red-500';
            barWidth = 0;
            txtPercent = "0%";
        }
    } else {
        if (fav > neg) {
            labelStatus = "Aprovada";
            barCor = 'bg-emerald-500';
        } else if (neg > fav) {
            labelStatus = "Reprovada";
            barCor = 'bg-red-500';
        } else if (totalValidos === 0 && votos.length > 0) {
            labelStatus = "Abstenção";
            txtPercent = "0%";
            barWidth = 0;
            barCor = 'bg-slate-500';
        } else if (votos.length === 0) {
            labelStatus = "Sem Votos";
            txtPercent = "0%";
            barWidth = 0;
            barCor = 'bg-slate-500';
        }
    }

    document.getElementById('det-percent').innerText = txtPercent;
    
    const progressEl = document.getElementById('det-progress');
    progressEl.style.width = '0%';
    setTimeout(() => {
        progressEl.style.width = barWidth + '%';
        progressEl.className = `h-full transition-all duration-1000 ease-out ${barCor}`;
    }, 100);

    renderChart(fav, neg, neu, votos.length);
    renderVotesList(votos);

    document.getElementById('view-gallery').classList.add('hidden');
    document.getElementById('view-details').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.voltarGaleria = function() {
    document.getElementById('view-details').classList.add('hidden');
    document.getElementById('view-gallery').classList.remove('hidden');
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function renderVotesList(votos) {
    const listContainer = document.getElementById('det-votes-list');
    if (votos.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-10 text-slate-500 bg-[#0b0f19] rounded-2xl border border-slate-800"><p class="text-sm font-bold">Nenhum parecer salvo neste lote de histórico.</p></div>';
        return;
    }

    let html = '';
    votos.forEach(v => {
        const nick = v.Nick || v.nick || 'Membro';
        const veredito = v.Veredito || v.veredito || 'Pendente';
        const comentario = v.Comentario || v.comentario || 'Sem justificativa salva.';
        
        const config = VEREDICT_ICONS[veredito] || VEREDICT_ICONS["Pendente"];
        const safeComment = (comentario || '').replace(/\\n/g, '\n');

        let customClass = config.class;
        const lowerNick = nick.toLowerCase();
        if(lowerNick === 'sr.gabriel.' || lowerNick === 'pegas' || lowerNick === ':_wanderson_:') {
            customClass = "text-purple-400 border-purple-500/40 bg-purple-950/30 font-black";
        }

        html += `
        <div class="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 shadow-inner transition-colors hover:border-purple-500/40">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div class="flex items-center gap-4">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-12 h-12 rounded-full border-2 border-slate-700 bg-[#05070c]">
                    <div>
                        <p class="text-base font-black text-white">${nick}</p>
                        <p class="text-[9px] text-slate-500 uppercase tracking-widest font-black mt-0.5"><i class="fas fa-archive"></i> Registro Arquivado</p>
                    </div>
                </div>
                <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${customClass}"><i class="fas ${config.icon}"></i> ${veredito}</span>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-800/50">
                <p class="text-[14px] text-slate-300 italic leading-relaxed whitespace-pre-line pl-4 border-l-4 border-slate-800">"${safeComment}"</p>
            </div>
        </div>`;
    });
    listContainer.innerHTML = html;
}

function renderChart(fav, neg, neu, total) {
    document.getElementById('stat-fav').innerText = fav; 
    document.getElementById('stat-neg').innerText = neg;
    document.getElementById('stat-neu').innerText = neu; 
    document.getElementById('chart-total').innerText = total;

    const ctx = document.getElementById('votosChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    if (total === 0) {
        chartInstance = new Chart(ctx, { type: 'doughnut', data: { datasets: [{ data: [1], backgroundColor: ['#1e293b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { tooltip: { enabled: false } } } });
        return;
    }

    Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = "'Inter', sans-serif";
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Favoráveis', 'Negativos', 'Neutros/Outros'],
            datasets: [{ data: [fav, neg, neu], backgroundColor: ['#10b981', '#ef4444', '#3b82f6'], borderColor: '#05070c', borderWidth: 6, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '75%', 
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, weight: 'bold', family: "'Inter', sans-serif" }, bodyFont: { size: 14, weight: 'bold', family: "'Inter', sans-serif" }, padding: 15, cornerRadius: 12, displayColors: true,
                    callbacks: { label: function(c) { let v = c.raw || 0; let p = total > 0 ? Math.round((v / total) * 100) : 0; return ` ${v} Votos (${p}%)`; } }
                }
            }
        }
    });
}
