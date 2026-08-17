// =========================================================
// 1. AVALIAÇÃO DE PROPOSTAS E MÉTRICAS - 100% FIREBASE
// =========================================================

const ALLOWED_ROLES = ["Estagiário(a)", "Conselheiro(a)", "Vice-Líder", "Líder"];

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

let proposals = [];
let userEvaluations = {};
let currentUserNick = null;
let filteredProposals = [];
let allEvaluations = []; 
let currentIndex = 0; 
let viewMode = 'gallery'; 
window.currentColleagueVotes = []; 

function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `toast-modern ${type}`;
    div.innerHTML = `<i class="fas ${type === 'loading' ? 'fa-circle-notch fa-spin text-purple-400' : type === 'success' ? 'fa-check text-purple-400' : 'fa-times text-red-400'}"></i> <span>${msg}</span>`;
    document.body.appendChild(div);
    if (type !== 'loading') setTimeout(() => div.remove(), 3000);
    return div;
}

function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function toggleDisplay(id, show) { const el = document.getElementById(id); if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden'); }

// =========================================================
// 2. INICIALIZAÇÃO, BLOQUEIO E BUSCA NO FIREBASE
// =========================================================
document.addEventListener('userDataReady', async (e) => {
    const userData = e.detail.userData;
    
    if (!userData) {
        toggleDisplay('access-denied-screen', true);
        return;
    }
    
    window.userCargo = userData.cargo || "";
    window.isAuthorized = ALLOWED_ROLES.some(role => window.userCargo.includes(role));
    window.isLeadership = ["Vice-Líder", "Líder", "Liderança"].some(role => window.userCargo.includes(role));
    
    // SISTEMA DE BLOQUEIO DE HORÁRIO (0 = Dom, 1 = Seg, 2 = Ter...)
    const currentDay = dayjs().day();
    
    // Fechado na Segunda-Feira (1) apenas para quem não é Liderança
    window.isVotingClosed = (currentDay === 1 && !window.isLeadership); 

    if (window.isVotingClosed) {
        toggleDisplay('access-denied-screen', false);
        toggleDisplay('app-screen', false);
        toggleDisplay('time-block-screen', true); 
        return; 
    }

    db = firebase.firestore();
    currentUserNick = userData.name || userData.nick;
    
    toggleDisplay('access-denied-screen', false);
    toggleDisplay('time-block-screen', false); 
    toggleDisplay('app-screen', true);
    
    const syncStatus = document.getElementById('sync-status');
    if(syncStatus) syncStatus.innerHTML = '<i class="fas fa-sync fa-spin mr-1"></i> Carregando base (Firebase)...';

    try {
        const now = dayjs();
        let daysSinceTuesday = now.day() - 2;
        if (daysSinceTuesday < 0) daysSinceTuesday += 7; 
        window.lastTuesday = now.subtract(daysSinceTuesday, 'day').startOf('day');

        // 1. PUXAR TODOS OS VOTOS PRIMEIRO
        const votosSnap = await db.collection("nexus_config").doc("Propostas").collection("votos_conselho").get();
        allEvaluations = []; 
        votosSnap.forEach(doc => {
            const data = doc.data();
            allEvaluations.push(data);
            // Salva os votos do usuário logado
            if (data.Nick === currentUserNick) {
                userEvaluations[data.Ordem] = { veredito: data.Veredito, comentario: data.Comentario };
            }
        });

        // 2. PUXAR PROPOSTAS ATIVAS
        const propsSnap = await db.collection("nexus_config").doc("Propostas").collection("lista_propostas").orderBy("ordem", "desc").get();
        proposals = [];
        
        propsSnap.forEach(doc => {
            let p = doc.data();
            let isLeftover = false;
            
            const votosDesta = allEvaluations.filter(v => parseInt(v.Ordem) === parseInt(p.ordem));
            
            // CONTAGEM DE VOTOS PARA SABER SE REALMENTE É UM EMPATE/TUTELA RESIDUAL
            let contagem = { aprovada: 0, reprovada: 0, tutela: 0, reuniao: 0, lideranca: 0, autoria: 0 };
            votosDesta.forEach(v => {
                const vVer = (v.Veredito || '').toLowerCase();
                if (vVer.includes('aprovada')) contagem.aprovada++;
                else if (vVer.includes('reprovada')) contagem.reprovada++;
                else if (vVer.includes('tutela')) contagem.tutela++;
                else if (vVer.includes('reunião') || vVer.includes('reuniao')) contagem.reuniao++;
                else if (vVer.includes('liderança') || vVer.includes('lideranca')) contagem.lideranca++;
                else if (vVer.includes('autoria')) contagem.autoria++;
            });

            let maxVotos = 0;
            let vencedores = [];
            for (const [tipo, qtd] of Object.entries(contagem)) {
                if (qtd > maxVotos) { maxVotos = qtd; vencedores = [tipo]; }
                else if (qtd === maxVotos && qtd > 0) { vencedores.push(tipo); }
            }

            // Só marca como Pendente Liderança se for antigo E (tiver empate OU a maioria não for Aprovada/Reprovada)
            if (p.data && dayjs(p.data).isBefore(window.lastTuesday)) {
                if (vencedores.length > 1 || vencedores.length === 0 || !['aprovada', 'reprovada'].includes(vencedores[0])) {
                    isLeftover = true;
                }
            }
            
            p.isLeftover = isLeftover; 
            proposals.push(p);
        });
        
        filteredProposals = proposals;

        if(syncStatus) {
            syncStatus.innerHTML = '<i class="fas fa-check-circle text-purple-400 mr-1"></i> Base Sincronizada';
            setTimeout(() => syncStatus.style.opacity = '0', 3000);
        }

        renderProposals();
    } catch (e) {
        console.error("Erro no Firebase:", e);
        if(syncStatus) syncStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-red-400 mr-1"></i> Falha no Firebase';
    }
});

// =========================================================
// 3. NAVEGAÇÃO
// =========================================================
function switchTab(activeId, viewId) {
    ['nav-gallery', 'nav-insights'].forEach(id => {
        document.getElementById(id).classList.remove('active-tab', 'text-white');
        document.getElementById(id).classList.add('text-slate-500');
    });
    document.getElementById(activeId).classList.add('active-tab', 'text-white');
    document.getElementById(activeId).classList.remove('text-slate-500');

    ['view-gallery', 'view-reading', 'view-insights'].forEach(id => toggleDisplay(id, false));
    toggleDisplay(viewId, true);
}

document.getElementById('nav-gallery').addEventListener('click', () => { viewMode = 'gallery'; switchTab('nav-gallery', 'view-gallery'); renderProposals(); });
document.getElementById('nav-insights').addEventListener('click', () => { switchTab('nav-insights', 'view-insights'); renderInsightsTab(); });

// =========================================================
// 4. GALERIA E LEITURA DE PROPOSTAS
// =========================================================
function renderProposals(list = filteredProposals) {
    if (viewMode === 'gallery') {
        toggleDisplay('view-gallery', true); toggleDisplay('view-reading', false); renderGallery(list);
    } else {
        toggleDisplay('view-gallery', false); toggleDisplay('view-reading', true); renderReadingMode(list);
    }
    updateStats();
}

function renderGallery(list) {
    const container = document.getElementById('proposals-container');
    if (!list || list.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-16 opacity-50"><i class="fas fa-inbox text-5xl mb-4"></i><p class="font-bold">Nenhuma proposta disponível para você no momento.</p></div>`;
        return;
    }

    container.innerHTML = list.map((p, index) => {
        let dataFormatada = 'SEM DATA';
        if(p.data) {
            const d = dayjs(p.data);
            if(d.isValid()) dataFormatada = d.format('DD MMM YYYY').toUpperCase();
        }
        
        const ordem = p.ordem;
        const autor = p.autor || 'Autor Desconhecido';
        const tipo = p.tipo || 'Desconhecido';
        const titulo = p.titulo || 'Sem Título';
        
        const saved = userEvaluations[ordem] || { veredito: '' };
        const vereditoText = saved.veredito || 'Pendente';
        const config = VEREDICT_ICONS[vereditoText] || VEREDICT_ICONS["Pendente"];

        // Selo de aviso para a Liderança (Propostas de Empate)
        let leftoverBadge = '';
        if (p.isLeftover && window.isLeadership) {
            leftoverBadge = `<div class="absolute -top-3 -right-2 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-blue-900/50 uppercase tracking-widest border border-blue-400 z-20 flex items-center gap-1"><i class="fas fa-crown"></i> Pendente Liderança</div>`;
        }

        return `
        <div class="glass-panel p-5 rounded-2xl cursor-pointer hover:border-purple-500 transition-all border border-slate-800 border-l-4 border-l-purple-500 shadow-lg hover:scale-[1.02] relative" onclick="openProposal(${index})">
            ${leftoverBadge}
            <div class="flex justify-between items-start mb-3">
                <span class="bg-[#05070c] text-purple-400 px-3 py-1 rounded-lg text-xs font-black border border-slate-800">Nº ${ordem}</span>
                <span class="text-[9px] font-black uppercase px-2 py-1 border rounded-full flex items-center gap-1 ${config.class}"><i class="fas ${config.icon}"></i> ${vereditoText}</span>
            </div>
            
            <h3 class="text-white font-black text-base mb-2 line-clamp-2 leading-tight">${titulo}</h3>
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4"><i class="far fa-calendar-alt mr-1"></i> ${dataFormatada}</p>
            
            <div class="flex items-center gap-3 bg-[#05070c] p-3 rounded-xl border border-slate-800 shadow-inner">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(autor)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-8 h-8 rounded-full bg-black/50 border border-slate-700">
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-200 truncate">${tipo}</p>
                    <p class="text-[9px] text-purple-400 uppercase font-black tracking-widest">${autor}</p>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.openProposal = function(index) { currentIndex = index; viewMode = 'voting'; renderProposals(); };
window.voltarGaleria = function() { viewMode = 'gallery'; renderProposals(); };

async function renderReadingMode(list) {
    if (currentIndex >= list.length) currentIndex = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const p = list[currentIndex];
    const ordem = p.ordem;
    const autor = p.autor || 'Desconhecido';
    const tipo = p.tipo || 'Documento';
    const titulo = p.titulo || 'Sem Título Declarado';
    const conteudo = p.conteudo || 'Conteúdo não disponibilizado.';
    const saved = userEvaluations[ordem] || { comentario: '', veredito: '' };
    
    document.getElementById('progress-bar-voting').style.width = `${((currentIndex + 1) / list.length) * 100}%`;
    document.getElementById('card-counter').innerText = `${currentIndex + 1} / ${list.length}`;
    
    document.getElementById('display-ordem').innerText = ordem;
    
    // Título com aviso se for Pendente Liderança
    let titlePrefix = (p.isLeftover && window.isLeadership) ? `<span class="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-md uppercase tracking-widest font-black mr-2 align-middle shadow-lg"><i class="fas fa-crown"></i> Pendente Liderança</span>` : '';
    document.getElementById('display-titulo').innerHTML = titlePrefix + titulo;

    document.getElementById('display-autor').innerText = autor;
    document.getElementById('display-tipo').innerText = tipo;
    document.getElementById('display-conteudo').innerText = (conteudo || '').replace(/\\n/g, '\n'); 
    
    document.getElementById('character-avatar').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(autor)}&direction=2&head_direction=3&gesture=sml&size=l&headonly=1`;

    const verdictSelect = document.getElementById('verdict-select');
    const dissertacaoText = document.getElementById('dissertacao-text');
    const saveBtn = document.getElementById('save-btn');
    
    verdictSelect.value = saved.veredito || "";
    verdictSelect.classList.remove('border-red-500');
    dissertacaoText.value = saved.comentario || "";
    dissertacaoText.classList.remove('border-red-500');

    // Travas de segurança e horário
    if (!window.isAuthorized) {
        verdictSelect.disabled = true; dissertacaoText.disabled = true; saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-lock text-sm"></i> Leitura Apenas';
        dissertacaoText.placeholder = "Apenas membros do conselho podem avaliar propostas.";
    } else {
        verdictSelect.disabled = false; dissertacaoText.disabled = false; saveBtn.disabled = false;
        saveBtn.innerHTML = 'Confirmar Voto <i class="fas fa-check"></i>';
        dissertacaoText.placeholder = "Descreva os motivos que fundamentam a sua decisão...";
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.disabled = (!window.isAuthorized); });
    document.getElementById('prev-button').disabled = currentIndex === 0;
    document.getElementById('next-button').disabled = currentIndex === list.length - 1;

    const hasVoted = !!saved.veredito;
    setHTML('colleagues-votes-placeholder', '<div class="text-center py-4"><i class="fas fa-circle-notch fa-spin text-purple-500 text-xl"></i></div>');
    await fetchColleagueVotes(ordem, 'colleagues-votes-placeholder', hasVoted);
}

// =========================================================
// 5. REGISTRO DE VOTOS E SINCRONIZAÇÃO
// =========================================================
async function fetchColleagueVotes(ordem, targetId, hasVoted) {
    const container = document.getElementById(targetId);
    // Libera se for Leitura Apenas (não autorizado) OU se for Liderança (Líder/Vice-Líder)
    const canBypassBlur = !window.isAuthorized || window.isLeadership;

    if (!hasVoted && !canBypassBlur) {
        container.innerHTML = `
        <div class="relative bg-[#05070c] border border-slate-800 rounded-xl p-4 shadow-inner min-h-[110px] flex flex-col justify-center overflow-hidden">
            <div class="absolute inset-0 backdrop-blur-md bg-[#0b0f19]/90 flex flex-col items-center justify-center z-10 p-3 text-center transition-all duration-300">
                <i class="fas fa-lock text-2xl text-pink-500 mb-2 drop-shadow-md"></i>
                <p class="text-[10px] font-black text-slate-200 uppercase tracking-widest">Acesso Restrito</p>
                <p class="text-[9px] text-slate-400 mt-1 leading-tight px-2">Avalie antes de ver o conselho.</p>
            </div>
        </div>`;
        return;
    }

    try {
        const snapshot = await db.collection("nexus_config").doc("Propostas").collection("votos_conselho").where("Ordem", "==", parseInt(ordem)).get();
        const tally = {};
        window.currentColleagueVotes = []; 

        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.Nick !== currentUserNick) { 
                window.currentColleagueVotes.push(data);
                if(!tally[data.Veredito]) tally[data.Veredito] = 0;
                tally[data.Veredito]++;
            }
        });

        if(window.currentColleagueVotes.length > 0) {
            const topText = Object.entries(tally).sort((a,b) => b[1] - a[1]).map(([v, qtd]) => `<span class="text-white font-black">${qtd}</span> <span class="text-slate-400">${v}</span>`).join('<br>');
            container.innerHTML = `
            <div class="bg-black/50 border border-slate-800 rounded-2xl p-4 shadow-inner flex flex-col gap-3 text-center">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resumo de Decisões</p>
                <p class="text-xs font-bold text-slate-300 leading-relaxed">${topText}</p>
                <button onclick="abrirModalVotosConselho('${ordem}')" class="w-full bg-indigo-900/30 hover:bg-indigo-600 text-indigo-300 hover:text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition border border-indigo-500/30 hover:border-indigo-500 mt-2 flex items-center justify-center gap-2">
                    <i class="fas fa-eye text-base"></i> Ler Pareceres
                </button>
            </div>`;
        } else {
            container.innerHTML = '<div class="text-slate-500 text-xs font-bold text-center py-6 bg-black/30 rounded-2xl border border-slate-800 shadow-inner">Nenhum colega avaliou.</div>';
        }
    } catch(e) {
        container.innerHTML = '<div class="text-red-400 font-bold text-center text-[10px] py-3">Erro ao sincronizar.</div>';
    }
}

window.changePage = function(step) {
    const ordem = filteredProposals[currentIndex].ordem;
    const verdict = document.getElementById('verdict-select').value;
    const comment = document.getElementById('dissertacao-text').value.trim();
    if (window.isAuthorized && verdict && comment.length >= 5) saveEvaluationInternal(ordem, verdict, comment, false);

    currentIndex += step;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= filteredProposals.length) currentIndex = filteredProposals.length - 1;
    renderProposals();
};

window.salvarVotoAtual = async function(silent = false) {
    if (!window.isAuthorized) return false;

    const ordem = filteredProposals[currentIndex].ordem;
    const verdictSelect = document.getElementById('verdict-select');
    const commentText = document.getElementById('dissertacao-text');
    
    if (!verdictSelect.value) { showToast('Decisão Obrigatória!', 'error'); return false; }
    if (commentText.value.trim().length < 5) { showToast('Escreva a justificativa.', 'error'); return false; }

    const t = showToast("Registrando Voto...", "loading");
    const success = await saveEvaluationInternal(ordem, verdictSelect.value, commentText.value.trim(), true);
    t.remove();

    if (success) {
        if(!silent) showToast("Parecer Registrado!", "success");
        setHTML('colleagues-votes-placeholder', '<div class="text-center py-4"><i class="fas fa-circle-notch fa-spin text-purple-500 text-xl"></i></div>');
        await fetchColleagueVotes(ordem, 'colleagues-votes-placeholder', true);
        
        await fetchAllEvaluations(); 
        updateStats();
        return true;
    }
    return false;
};

window.avancarProxima = async function() {
    if (!window.isAuthorized) { changePage(1); return; }
    const salvo = await window.salvarVotoAtual(true); 
    if(salvo) changePage(1);
};

async function saveEvaluationInternal(ordem, verdict, comment, notifyError) {
    try {
        const safeNick = currentUserNick.replace(/[^a-zA-Z0-9_]/g, '');
        await db.collection("nexus_config").doc("Propostas").collection("votos_conselho").doc(`voto_${ordem}_${safeNick}`).set({
            Nick: currentUserNick, Ordem: parseInt(ordem), Comentario: comment, Veredito: verdict, Timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        userEvaluations[ordem] = { comentario: comment, veredito: verdict };
        return true;
    } catch (error) { return false; }
}

// =========================================================
// 6. ESTATÍSTICAS E FILTROS DA GALERIA
// =========================================================
function filterProposals() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filter = document.getElementById('filter-verdict').value;

    filteredProposals = proposals.filter(p => {
        const ordem = String(p.ordem || "").toLowerCase();
        const autoria = String(p.autor || "").toLowerCase();
        const titulo = String(p.titulo || "").toLowerCase();

        const matchTerm = !term || ordem.includes(term) || autoria.includes(term) || titulo.includes(term);
        const saved = userEvaluations[p.ordem];
        
        let matchFilter = true;
        if (filter === 'pending') matchFilter = !saved || !saved.veredito;
        else if (filter) matchFilter = saved && saved.veredito.includes(filter);
        
        return matchTerm && matchFilter;
    });

    viewMode = 'gallery'; 
    renderProposals(filteredProposals);
}

function updateStats() {
    const total = proposals.length;
    const done = Object.keys(userEvaluations).length;
    const statsContainer = document.getElementById('quick-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="glass-panel p-4 rounded-xl flex items-center justify-between border-b-2 border-b-purple-500 shadow-md">
                <div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Base Total</p><p class="text-2xl font-black text-white">${total}</p></div>
                <i class="fas fa-layer-group text-purple-500/50 text-2xl"></i>
            </div>
            <div class="glass-panel p-4 rounded-xl flex items-center justify-between border-b-2 border-b-emerald-500 shadow-md">
                <div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Já Lidas</p><p class="text-2xl font-black text-emerald-400">${done}</p></div>
                <i class="fas fa-check-double text-emerald-500/50 text-2xl"></i>
            </div>
            <div class="glass-panel p-4 rounded-xl flex items-center justify-between border-b-2 border-b-pink-500 shadow-md hidden md:flex">
                <div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Pendentes</p><p class="text-2xl font-black text-pink-400">${total - done}</p></div>
                <i class="fas fa-hourglass-half text-pink-500/50 text-2xl"></i>
            </div>
            <div class="glass-panel p-4 rounded-xl flex items-center justify-between border-b-2 border-b-blue-500 shadow-md hidden md:flex">
                <div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Progresso</p><p class="text-2xl font-black text-blue-400">${total > 0 ? Math.round((done/total)*100) : 0}%</p></div>
                <i class="fas fa-chart-line text-blue-500/50 text-2xl"></i>
            </div>
        `;
    }
}

document.getElementById('search-input')?.addEventListener('input', filterProposals);
document.getElementById('filter-verdict')?.addEventListener('change', filterProposals);


// =========================================================
// 7. ABA DESEMPENHO E INSIGHTS (MÉTRICAS DETALHADAS)
// =========================================================
async function fetchAllEvaluations() {
    try {
        const snap = await db.collection("nexus_config").doc("Propostas").collection("votos_conselho").get();
        allEvaluations = [];
        snap.forEach(doc => allEvaluations.push(doc.data()));
    } catch(e) { console.error("Erro ao puxar todos os votos", e); }
}

async function renderInsightsTab() {
    if(allEvaluations.length === 0) await fetchAllEvaluations();
    
    const select = document.getElementById('insight-proposal-select');
    if (select.options.length <= 1) {
        select.innerHTML = '<option value="" disabled selected>Selecione uma proposta para ver as métricas...</option>';
        proposals.forEach(p => { 
            let prefixo = (p.isLeftover && window.isLeadership) ? "[PENDENTE] " : "";
            select.innerHTML += `<option value="${p.ordem}">${prefixo}Nº ${p.ordem} - ${p.titulo}</option>`; 
        });
        select.addEventListener('change', (e) => renderInsightDetails(e.target.value));
    }
    
    document.getElementById('refresh-insights')?.addEventListener('click', async () => {
        const icon = document.querySelector('#refresh-insights i');
        icon.classList.add('fa-spin');
        await fetchAllEvaluations();
        if(select.value) renderInsightDetails(select.value);
        icon.classList.remove('fa-spin');
        showToast("Métricas atualizadas!", "success");
    });
}

async function renderInsightDetails(ordemId) {
    const ordem = parseInt(ordemId);
    const votosDesta = allEvaluations.filter(v => parseInt(v.Ordem) === ordem);
    
    let fav=0, neg=0, neu=0;
    votosDesta.forEach(v => {
        if(v.Veredito.includes('Aprovada')) fav++;
        else if(v.Veredito === 'Reprovada') neg++;
        else neu++;
    });
    
    document.getElementById('insights-stats').innerHTML = `
        <div class="glass-panel p-4 rounded-2xl border-b-2 border-emerald-500 shadow-inner flex flex-col justify-center items-center text-center">
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Aprovações</p>
            <p class="text-3xl font-black text-emerald-400">${fav}</p>
        </div>
        <div class="glass-panel p-4 rounded-2xl border-b-2 border-red-500 shadow-inner flex flex-col justify-center items-center text-center">
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Reprovações</p>
            <p class="text-3xl font-black text-red-400">${neg}</p>
        </div>
        <div class="glass-panel p-4 rounded-2xl border-b-2 border-blue-500 shadow-inner flex flex-col justify-center items-center text-center">
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Neutros/Outros</p>
            <p class="text-3xl font-black text-blue-400">${neu}</p>
        </div>
        <div class="glass-panel p-4 rounded-2xl border-b-2 border-purple-500 shadow-inner flex flex-col justify-center items-center text-center bg-purple-900/10">
            <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1">Total de Votos</p>
            <p class="text-3xl font-black text-white">${votosDesta.length}</p>
        </div>
    `;
    
    let htmlPareceres = '';
    if(votosDesta.length === 0) {
        htmlPareceres = '<div class="text-center py-10 opacity-50"><i class="fas fa-folder-open text-4xl text-slate-500 mb-3"></i><p class="text-slate-400 text-sm font-bold">Nenhum parecer registrado ainda.</p></div>';
    } else {
        votosDesta.forEach(v => {
            const config = VEREDICT_ICONS[v.Veredito] || VEREDICT_ICONS["Pendente"];
            htmlPareceres += `
            <div class="bg-[#05070c] border border-slate-800 rounded-2xl p-5 mb-3 shadow-inner hover:border-purple-500/30 transition-colors">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-black text-white flex items-center gap-2"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(v.Nick)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-6 h-6 rounded-full bg-slate-900 border border-slate-700"> ${v.Nick}</span>
                    <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${config.class}">${v.Veredito}</span>
                </div>
                <p class="text-xs text-slate-400 italic leading-relaxed border-l-2 border-slate-800 pl-3 whitespace-pre-line">"${(v.Comentario || '').replace(/\\n/g, '\n')}"</p>
            </div>`;
        });
    }
    document.getElementById('insights-container').innerHTML = htmlPareceres;
    
    const trackerDiv = document.getElementById('ranking-container');
    trackerDiv.innerHTML = '<div class="text-center text-slate-500 text-sm py-10"><i class="fas fa-circle-notch fa-spin text-purple-500 mb-3 text-3xl"></i><br>Consultando equipe oficial...</div>';
    
    try {
        const cargosConselho = ['Estagiário(a)', 'Conselheiro(a)', 'Vice-Líder', 'Líder', 'Liderança'];
        const usersSnap = await db.collection('users').where('cargo', 'in', cargosConselho).get();
        
        const conselheiros = [];
        usersSnap.forEach(doc => conselheiros.push(doc.data()));
        
        const ordemCargos = { 'Liderança': 1, 'Líder': 2, 'Vice-Líder': 3, 'Conselheiro(a)': 4, 'Estagiário(a)': 5 };
        conselheiros.sort((a,b) => (ordemCargos[a.cargo] || 99) - (ordemCargos[b.cargo] || 99));

        const votosPorAvaliador = {};
        votosDesta.forEach(v => {
            const av = (v.Nick || '').toLowerCase();
            if(!votosPorAvaliador[av]) votosPorAvaliador[av] = { fav:0, rep:0, neu:0, total:0 };
            if(v.Veredito.includes('Aprovada')) votosPorAvaliador[av].fav++;
            else if(v.Veredito.includes('Reprovada')) votosPorAvaliador[av].rep++;
            else votosPorAvaliador[av].neu++;
            votosPorAvaliador[av].total++;
        });

        let htmlEngajamento = '';
        conselheiros.forEach(c => {
            const nick = c.name || c.nick || 'Desconhecido';
            const cargo = c.cargo || 'Membro';
            const stats = votosPorAvaliador[nick.toLowerCase()] || { fav:0, rep:0, neu:0, total:0 };
            
            const isAltoComando = (cargo === 'Líder' || cargo === 'Vice-Líder' || cargo === 'Liderança');
            const votou = stats.total > 0;
            
            let bgClass = votou ? 'bg-emerald-900/10 border-emerald-500/30' : (isAltoComando ? 'bg-purple-900/10 border-purple-500/30' : 'bg-red-900/10 border-red-500/30');

            let statusHtml = '';
            if(votou) {
                statusHtml = `
                <div class="flex items-center gap-2 mt-1 text-[10px] font-bold">
                    <span class="text-emerald-400" title="Aprovadas"><i class="fas fa-check"></i> ${stats.fav}</span>
                    <span class="text-red-400" title="Reprovadas"><i class="fas fa-times"></i> ${stats.rep}</span>
                    <span class="text-blue-400" title="Neutros/Outros"><i class="fas fa-minus"></i> ${stats.neu}</span>
                </div>`;
            } else {
                statusHtml = isAltoComando 
                    ? `<p class="text-[10px] font-bold mt-0.5 text-purple-400 opacity-80"><i class="fas fa-eye"></i> Acompanhamento</p>` 
                    : `<p class="text-[10px] font-bold mt-0.5 text-red-500"><i class="fas fa-times"></i> Pendente</p>`;
            }

            htmlEngajamento += `
            <div class="flex items-center justify-between p-3 border ${bgClass} rounded-xl mb-2 shadow-inner hover:bg-slate-900 transition-colors">
                <div class="flex items-center gap-3">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nick)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 shadow-md">
                    <div>
                        <p class="text-xs font-black text-white">${nick}</p>
                        <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">${cargo}</p>
                    </div>
                </div>
                ${statusHtml}
            </div>`;
        });
        
        if(conselheiros.length === 0) htmlEngajamento = '<p class="text-center text-slate-500 py-4 text-xs font-bold">Nenhum membro na base.</p>';
        trackerDiv.innerHTML = htmlEngajamento;

    } catch(e) {
        trackerDiv.innerHTML = '<p class="text-red-500 text-xs text-center font-bold py-4">Erro ao carregar engajamento.</p>';
    }
}

// MODAIS
window.abrirModalVotosConselho = (ordem) => {
    document.getElementById('modal-conselho-ordem').innerText = `Proposta Nº ${ordem}`;
    const content = document.getElementById('modal-conselho-content');
    
    let html = '<div class="space-y-4">';
    window.currentColleagueVotes.forEach(v => {
        const config = VEREDICT_ICONS[v.Veredito] || VEREDICT_ICONS["Pendente"];
        html += `
        <div class="bg-black/40 border border-slate-800 rounded-2xl p-5 relative shadow-inner">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-3">
                <div class="flex items-center gap-3">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(v.Nick)}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-10 h-10 rounded-full bg-slate-900 border border-slate-700">
                    <div>
                        <p class="text-sm font-black text-white">${v.Nick}</p>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conselheiro(a)</span>
                    </div>
                </div>
                <span class="text-[9px] font-black uppercase px-2 py-1 border rounded-md flex items-center gap-1 ${config.class}"><i class="fas ${config.icon}"></i> ${v.Veredito}</span>
            </div>
            <p class="text-sm text-slate-300 italic leading-relaxed whitespace-pre-line">"${(v.Comentario || 'Sem justificativa.').replace(/\\n/g, '\n')}"</p>
        </div>`;
    });
    html += '</div>';
    content.innerHTML = html;
    document.getElementById('modal-votos-conselho').classList.remove('hidden');
};
window.fecharModalVotosConselho = () => { document.getElementById('modal-votos-conselho').classList.add('hidden'); };