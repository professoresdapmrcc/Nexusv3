const CONFIG = {
    API_KEY: "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34",
    SPREADSHEETS: {
        GERADOR: "1KQXx7TFtbNzMYHzOM5LMT7Fh61hiGOKZHux4K3Q6YpM",
        RANKING: "1qL4S-vNDI2iONCVtl6fUuWo6EK0v62IWFGydrLKhlbQ",
        SPP: "1kFnRqlQ-8Bzlv578t9uC_T0C74jjsK3nbzBgRFTlAJM",
        DA: "1zksr3s1X3-JYTTnVEN8qzgJvZhHjxcUH0SF2lwpzjCk",
        CDC: "1BJwyIbKfLl8arTIsA4vxtBvHlvx05HPG6VmauBBxlPo",
        METAS_PROF: "1L5t72kbIlRnHRp_OaOMbHdDjkOy_3QlGJdYqarhh-ac",
        METAS_COORD: "1EzyhvK4zEI_940ATXnaNQ8KUCxr-2Xj0qRY1MS6extI",
        METAS_GRAD: "154ToDPq8wakIM9W0LIiM_TExwAjunT696pqq0xmP2I8"
    }
};

const SUBGRUPOS = {
    spp: { name: "SPP", logo: "/imgs/spp-imagem.png", sheet: CONFIG.SPREADSHEETS.SPP, range: "'Gerador'!B16:C37" },
    da: { name: "DA", logo: "/imgs/da-imagem.png", sheet: CONFIG.SPREADSHEETS.DA, range: "'Listagem'!B15:C35" },
    cdc: { name: "CDC", logo: "/imgs/cdc-imagem.png", sheet: CONFIG.SPREADSHEETS.CDC, range: "'Listagem'!B16:C36" }
};

const STATE = { 
    avaliador: "Visitante", 
    listaAtual: [], 
    index: 0, 
    cargoAtual: "", 
    avaliacoes: { professor: {}, coordenador: {}, graduador: {} }, 
    cache: { professor: { nicks:[], vagas:0 }, coordenador: { nicks:[], vagas:0 }, graduador: { nicks:[], vagas:0 } } 
};
let db;
window.currentColleagueVotes = []; 

// ==========================================
// UTILITÁRIOS E DATAS
// ==========================================
async function fetchSheet(sheetId, range) {
    try { const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${CONFIG.API_KEY}`); return await res.json(); } 
    catch (e) { return { values: [] }; }
}

function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `toast-modern ${type}`;
    div.innerHTML = `<i class="fas ${type === 'loading' ? 'fa-circle-notch fa-spin text-indigo-400' : type === 'success' ? 'fa-check text-emerald-400' : 'fa-times text-red-400'}"></i> <span>${msg}</span>`;
    document.body.appendChild(div);
    if (type !== 'loading') setTimeout(() => div.remove(), 3000);
    return div;
}

function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function toggleDisplay(id, show) { const el = document.getElementById(id); if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden'); }

function getWeekDates(weekOffset = 1) { 
    const today = new Date();
    today.setDate(today.getDate() - ((weekOffset - 1) * 7));
    const dayOfWeek = today.getDay(); 
    
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek); 
    start.setHours(0,0,0,0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); 
    end.setHours(23,59,59,999);
    return { start, end }; 
}

function getFortnightDates(offset = 1) {
    let d = new Date();
    // Retrocede os meses/dias com base no offset (1 = atual, 2 = passada, etc)
    for (let i = 1; i < offset; i++) {
        if (d.getDate() > 15) {
            d.setDate(15); // Se tá na segunda quinzena, volta pra primeira do mesmo mês
        } else {
            d.setDate(0); // Se tá na primeira quinzena, volta pro último dia do mês passado
        }
    }

    let year = d.getFullYear();
    let month = d.getMonth();
    let day = d.getDate();

    let start, end;
    if (day > 15) {
        start = new Date(year, month, 16);
        end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else {
        start = new Date(year, month, 1);
        end = new Date(year, month, 15, 23, 59, 59, 999);
    }
    return { start, end };
}

function formatDateFull(date) {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${String(date.getDate()).padStart(2, '0')} ${meses[date.getMonth()].toUpperCase()} ${date.getFullYear()}`;
}

function parseDate(str) { if(!str) return null; const parts = str.split(/[\/\s]/); if(parts.length >= 3) { const d = parseInt(parts[0]), m = parseInt(parts[1])-1, y = parseInt(parts[2].length===2 ? '20'+parts[2] : parts[2]); if(!isNaN(d)) return new Date(y, m, d); } return null; }
function getStatus(score, type) { if (score === -1) return { class: 'bg-[#0b0f19] border-slate-800 text-slate-500', msg: 'Sem Registro' }; if (type === 'grad' && score >= 2) return { class: 'bg-regular', msg: 'Regular' }; if (type === 'grad') return { class: 'bg-irregular', msg: 'Irregular' }; if (score >= 300) return { class: 'bg-excelente', msg: 'Excelente' }; if (score >= 150) return { class: 'bg-otimo', msg: 'Ótimo' }; if (score >= 100) return { class: 'bg-regular', msg: 'Regular' }; return { class: 'bg-irregular', msg: 'Irregular' }; }

// ==========================================
// BOOT SILENCIOSO VIA FIREBASE
// ==========================================
async function bootSystemSilent() {
    const syncStatus = document.getElementById('sync-status');
    
    try {
        const listasSnapshot = await db.collection('listas_promocao').get();
        listasSnapshot.forEach(doc => {
            const cargo = doc.id;
            const data = doc.data();
            if (STATE.cache[cargo]) {
                STATE.cache[cargo].nicks = data.nicks || [];
                STATE.cache[cargo].vagas = data.vagas || 0;
            }
        });
    } catch(e) {
        console.error("Erro ao puxar listas do Firebase", e);
    }
    
    await loadEvaluationsFromFirebase();
    updateBadges();
    
    document.querySelectorAll('.promo-btn').forEach(b => b.disabled = false);
    setupComparadorSelects();

    syncStatus.innerHTML = '<i class="fas fa-check-circle text-emerald-400"></i> Firebase Sincronizado';
    syncStatus.classList.remove('animate-pulse', 'text-amber-400');
    syncStatus.classList.add('text-emerald-400');
    setTimeout(() => syncStatus.style.opacity = '0', 4000);
}

function updateBadges() {
    document.querySelectorAll('.promo-btn').forEach(btn => {
        const cargo = btn.dataset.cargo;
        const total = STATE.cache[cargo].nicks.length;
        const done = Object.keys(STATE.avaliacoes[cargo]).length;
        const badge = btn.querySelector('.count-badge');
        badge.textContent = `${done}/${total}`;
        badge.classList.remove('hidden');
    });
}

// ==========================================
// NAVEGAÇÃO
// ==========================================
document.getElementById('nav-avaliacao').addEventListener('click', () => {
    document.getElementById('nav-avaliacao').classList.add('bg-indigo-600', 'text-white', 'shadow-md');
    document.getElementById('nav-avaliacao').classList.remove('text-slate-400', 'hover:bg-slate-800');
    document.getElementById('nav-comparador').classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
    document.getElementById('nav-comparador').classList.add('text-slate-400', 'hover:bg-slate-800');
    toggleDisplay('view-avaliacao', true); toggleDisplay('view-comparador', false);
});

document.getElementById('nav-comparador').addEventListener('click', () => {
    document.getElementById('nav-comparador').classList.add('bg-indigo-600', 'text-white', 'shadow-md');
    document.getElementById('nav-comparador').classList.remove('text-slate-400', 'hover:bg-slate-800');
    document.getElementById('nav-avaliacao').classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
    document.getElementById('nav-avaliacao').classList.add('text-slate-400', 'hover:bg-slate-800');
    toggleDisplay('view-comparador', true); toggleDisplay('view-avaliacao', false);
});

// ==========================================
// LÓGICA DO CARD AVALIAÇÃO GIGANTE
// ==========================================
function loadPromotionList(cargo) {
    STATE.cargoAtual = cargo; STATE.listaAtual = STATE.cache[cargo].nicks; STATE.index = 0;
    
    document.querySelectorAll('.promo-btn').forEach(b => {
        if(b.dataset.cargo === cargo) { b.classList.add('active-cargo'); b.classList.remove('bg-[#0b0f19]'); }
        else { b.classList.remove('active-cargo'); b.classList.add('bg-[#0b0f19]'); }
    });
    
    toggleDisplay('initial-message', false); 
    toggleDisplay('evaluation-container', true); 
    toggleDisplay('retrospecto-screen', false);
    loadCard();
}

function loadCard() {
    const nick = STATE.listaAtual[STATE.index];
    if(!nick) return;

    window.scrollTo({ top: 0, behavior: 'smooth' }); 

    setHTML('display-nick-avaliado', nick);
    setHTML('display-cargo-atual', `Avaliando ${STATE.cargoAtual}`);
    setHTML('card-counter', `${STATE.index + 1} / ${STATE.listaAtual.length}`);
    document.getElementById('character-avatar').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&direction=4&head_direction=3&gesture=sml&size=l`;

    document.getElementById('prev-button').disabled = STATE.index === 0;
    
    if(STATE.index === STATE.listaAtual.length - 1) {
        document.getElementById('next-button').innerHTML = 'Finalizar <i class="fas fa-check ml-1.5"></i>';
        document.getElementById('next-button').classList.replace('bg-indigo-600', 'bg-emerald-600');
        document.getElementById('next-button').classList.replace('hover:bg-indigo-500', 'hover:bg-emerald-500');
        document.getElementById('next-button').classList.replace('border-indigo-500', 'border-emerald-500');
    } else {
        document.getElementById('next-button').innerHTML = 'Próximo <i class="fas fa-chevron-right ml-1.5"></i>';
        document.getElementById('next-button').classList.replace('bg-emerald-600', 'bg-indigo-600');
        document.getElementById('next-button').classList.replace('hover:bg-emerald-500', 'hover:bg-indigo-500');
        document.getElementById('next-button').classList.replace('border-emerald-500', 'border-indigo-500');
    }

    const saved = STATE.avaliacoes[STATE.cargoAtual][nick] || {};
    document.getElementById('dissertacao-text').value = saved.dissertacao || '';
    document.getElementById('dissertacao-text').classList.remove('border-red-500'); 
    
    const radios = document.getElementsByName('veredito');
    radios.forEach(r => r.checked = false); 
    if(saved.veredito) {
        radios.forEach(r => { if(r.value === saved.veredito) r.checked = true; });
    }

    const spin = '<div class="w-full h-full flex items-center justify-center py-2"><i class="fas fa-circle-notch fa-spin text-indigo-500 text-xl"></i></div>';
    ['member-details-placeholder','internal-ranking-placeholder','propostas-placeholder','metas-current','metas-history','errors-warnings-placeholder','colleagues-votes-placeholder'].forEach(id => setHTML(id, spin));

    fetchMemberDetails(nick, 'member-details-placeholder', 'internal-ranking-placeholder', 'propostas-placeholder'); 
    fetchMetas(nick, 'metas-current'); 
    fetchErrorsFromFirebase(nick, 'errors-warnings-placeholder');
    fetchColleagueVotes(nick, 'colleagues-votes-placeholder');

    if (STATE.cargoAtual === 'professor') fetchHistoryProf(nick, 'metas-history'); 
    else if (STATE.cargoAtual === 'coordenador') fetchHistoryCoord(nick, 'metas-history'); 
    else fetchHistoryGrad(nick, 'metas-history');
    
    const vagas = STATE.cache[STATE.cargoAtual].vagas;
    const promoted = Object.values(STATE.avaliacoes[STATE.cargoAtual]).filter(x => x.veredito === 'Promovido').length;
    const alertaEl = document.getElementById('vagas-alerta');
    if(vagas > 0) {
        if(promoted >= vagas) alertaEl.innerHTML = `<span class="text-red-400"><i class="fas fa-exclamation-triangle"></i> Vagas Totais Esgotadas (${promoted}/${vagas})</span>`;
        else alertaEl.innerHTML = `<span class="text-slate-400">Vagas Ocupadas: <span class="text-white">${promoted} de ${vagas}</span></span>`;
    } else alertaEl.innerHTML = "";
}

// ==========================================
// BUSCAS (GERADOR, METAS, BD)
// ==========================================
async function fetchMemberDetails(nick, detId, rankId, propId) {
    const [gen, rank, prop] = await Promise.all([fetchSheet(CONFIG.SPREADSHEETS.GERADOR, "'Gerador'!C4:I193"), fetchSheet(CONFIG.SPREADSHEETS.RANKING, "'Ranking Interno'!I6:K18"), fetchSheet(CONFIG.SPREADSHEETS.GERADOR, "'Central de Dados'!DB4:DC1000")]);
    const row = (gen.values || []).find(r => r[0]?.toLowerCase() === nick.toLowerCase());
    
    let sgHtml = '<div class="flex gap-2">';
    for(const k in SUBGRUPOS) {
        const sg = SUBGRUPOS[k];
        const res = await fetchSheet(sg.sheet, sg.range);
        const found = (res.values || []).find(r => r[1]?.trim().toLowerCase() === nick.trim().toLowerCase());
        sgHtml += `<div class="flex flex-col items-center justify-center p-1.5 rounded-lg bg-[#0b0f19] border ${found ? 'border-indigo-500/50' : 'border-slate-800 opacity-40 grayscale'}"><img src="${sg.logo}" class="h-5 mb-0.5"><span class="text-[8px] font-bold text-slate-300">${sg.name}</span></div>`;
    }
    sgHtml += '</div>';

    if(detId) setHTML(detId, row ? `<div class="flex flex-col gap-3"><div class="flex justify-between items-center bg-[#0b0f19] p-2 rounded-lg border border-slate-800"><div class="text-center w-1/2 border-r border-slate-800"><p class="text-[9px] uppercase text-slate-500 font-bold mb-0.5">Entrada</p><p class="font-black text-slate-200 text-xs">${row[1]||'-'}</p></div><div class="text-center w-1/2"><p class="text-[9px] uppercase text-slate-500 font-bold mb-0.5">Últ. Promoção</p><p class="font-black text-slate-200 text-xs">${row[2]||'-'}</p></div></div><div><p class="text-[9px] uppercase text-slate-500 font-bold mb-1.5 text-center">Subgrupos</p><div class="flex justify-center">${sgHtml}</div></div></div>` : '<div class="text-slate-500 text-center font-bold text-xs">Registro Não Encontrado</div>');

    const rRow = (rank.values || []).find(r => r[1]?.toLowerCase() === nick.toLowerCase());
    if(rankId) setHTML(rankId, rRow ? `<div class="text-2xl font-black text-white drop-shadow-sm mb-1">${rRow[0]}º</div><div class="text-[10px] text-purple-300 font-bold bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/30">${rRow[2]} pts</div>` : '<div class="text-slate-500 text-xs font-bold">Sem Registro</div>');

    const pRows = (prop.values || []).filter(r => r[0]?.toLowerCase() === nick.toLowerCase());
    const counts = { Projeto: 0, Sugestão: 0, Correção: 0 }; pRows.forEach(p => { if(counts[p[1]] !== undefined) counts[p[1]]++; });
    if(propId) setHTML(propId, `<div class="grid grid-cols-1 gap-2"><div class="flex justify-between items-center bg-blue-900/10 p-2 rounded-lg border border-blue-500/20"><span class="text-[10px] font-bold text-blue-400">Projetos</span><span class="font-black text-slate-200 text-sm">${counts.Projeto}</span></div><div class="flex justify-between items-center bg-emerald-900/10 p-2 rounded-lg border border-emerald-500/20"><span class="text-[10px] font-bold text-emerald-400">Sugestões</span><span class="font-black text-slate-200 text-sm">${counts.Sugestão}</span></div><div class="flex justify-between items-center bg-purple-900/10 p-2 rounded-lg border border-purple-500/20"><span class="text-[10px] font-bold text-purple-400">Correções</span><span class="font-black text-slate-200 text-sm">${counts.Correção}</span></div></div>`);

    return { rankRow: rRow, propTotal: pRows.length }; 
}

async function fetchMetas(nick, targetId, cargoParams = STATE.cargoAtual) {
    const map = { professor: {id: CONFIG.SPREADSHEETS.METAS_PROF, r:"'Ranking & Filtro'!C5:H", i:5, unit: '%'}, coordenador: {id: CONFIG.SPREADSHEETS.METAS_COORD, r:"'Ranking & Filtro'!C5:I", i:6, unit: '%'}, graduador: {id: CONFIG.SPREADSHEETS.METAS_GRAD, r:"'Ranking'!C5:F", i:3, unit: 'grads'} };
    const cfg = map[cargoParams];
    if(!cfg) return { val: '-' };

    const data = await fetchSheet(cfg.id, cfg.r);
    const row = (data.values || []).find(r => r[0]?.toLowerCase() === nick.toLowerCase());
    if(row) {
        const val = row[cfg.i]; const num = parseFloat(val.replace(',', '.')) || 0;
        let st = getStatus(cargoParams==='graduador' ? num : num, cargoParams==='graduador' ? 'grad' : 'prof');
        if(targetId) setHTML(targetId, `<div class="flex flex-col items-center justify-center text-center"><p class="text-3xl font-black text-white mb-1 drop-shadow-sm">${val}<span class="text-xs font-normal text-slate-400 ml-1">${cfg.unit}</span></p><div class="badge-status ${st.class} w-full">${st.msg}</div></div>`);
        return { val: val, status: st }; 
    } else {
        if(targetId) setHTML(targetId, '<div class="text-slate-500 text-xs font-bold text-center">Sem meta no ciclo</div>');
        return { val: '0', status: {class: 'bg-[#0b0f19] text-slate-500 border-slate-800', msg: 'S/R'} };
    }
}

async function fetchHistoryProf(nick, id) { buildHistory(nick, CONFIG.SPREADSHEETS.METAS_PROF, "BACKUP!A:F", 4, 'prof', id); }
async function fetchHistoryCoord(nick, id) { buildHistory(nick, CONFIG.SPREADSHEETS.METAS_COORD, "BACKUP!A:E", 4, 'coord', id); }
async function fetchHistoryGrad(nick, id) { buildHistory(nick, CONFIG.SPREADSHEETS.METAS_GRAD, "'Graduações Passadas'!A:E", 4, 'grad', id); }

async function buildHistory(nick, sheetId, range, limit, type, targetId) {
    const data = await fetchSheet(sheetId, range); const rows = data.values || [];
    let html = '';
    for (let i = 1; i <= limit; i++) {
        let total = -1;
        let dateLabel = '';
        
        if(type === 'grad') {
            const { start, end } = getFortnightDates(i);
            dateLabel = `${formatDateFull(start)}<br><span class="opacity-50 text-[8px] block my-0.5">ATÉ</span>${formatDateFull(end)}`;
            
            rows.forEach(r => { 
                if(r[1]?.toLowerCase() === nick.toLowerCase()) { 
                    const d = parseDate(r[0]); 
                    if(d && d >= start && d <= end && r[4]?.includes('Graduação')) { 
                        if(total === -1) total = 0; total++; 
                    } 
                } 
            });
        } else {
            const { start, end } = getWeekDates(i);
            dateLabel = `${formatDateFull(start)}<br><span class="opacity-50 text-[8px] block my-0.5">ATÉ</span>${formatDateFull(end)}`;
            
            rows.forEach(r => { 
                if(r[1]?.toLowerCase() === nick.toLowerCase()) { 
                    const d = parseDate(r[0]); 
                    if(d && d >= start && d <= end) { 
                        if(total === -1) total = 0; 
                        total += (type==='prof' ? {'Curso de Aperfeiçoamento Comunicativo (CAC)': 50, 'Curso de Aperfeiçoamento de Praças (CAP)': 50, 'Curso de Revisão Ortográfica (CRO)': 45, 'Avaliação de Conhecimento Linguístico (ACL)': 45}[r[5]?.trim()]||0 : {'Acompanhamento de aula': 50, 'Orientação': 50, 'Curso de Oratória Pública (COP)': 50, 'Curso de Desenvolvimento Argumentativo (CDA)': 50}[r[4]] ? 50 : 0); 
                    } 
                } 
            });
        }
        
        const st = getStatus(total, type);
        html += `<div class="bg-[#0b0f19] p-2 rounded-lg border border-slate-800 text-center flex flex-col justify-center shadow-inner"><div class="text-[8px] leading-tight text-slate-400 font-bold uppercase mb-1 tracking-wider">${dateLabel}</div><div class="font-black text-white text-base mb-1">${total===-1?'-':total+(type==='grad'?' g':'%')}</div><span class="badge-status text-[8px] ${st.class} w-full block">${st.msg}</span></div>`;
    }
    if(targetId) setHTML(targetId, html);
}

async function fetchErrorsFromFirebase(nick, targetId) {
    try {
        let snapshot = await db.collection('assistencia_registros')
            .where('nick', '==', nick)
            .where('decisao', '==', 'APROVADA')
            .get();

        if (snapshot.empty) {
            snapshot = await db.collection('assistencia_registros')
                .where('nick', '==', nick.toLowerCase())
                .where('decisao', '==', 'APROVADA')
                .get();
        }

        let errs = []; 
        snapshot.forEach(doc => errs.push(doc.data()));
        
        if(targetId) {
            if(errs.length > 0) {
                errs.sort((a,b) => new Date(b.data_iso) - new Date(a.data_iso));
                let html = '';
                errs.forEach(e => { html += `<div class="bg-[#0b0f19] border-l-4 ${e.punicao?.includes('Demissão')?'border-red-500': 'border-amber-500'} p-3 rounded-r-lg border-y border-r border-slate-800"><div class="flex justify-between items-center mb-1"><span class="font-black text-slate-200 text-xs">${e.punicao||'Registro'}</span><span class="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">${e.data_formatada||''}</span></div><p class="text-[10px] text-slate-400 font-medium">${e.motivo||'Detalhes não preenchidos.'}</p></div>`; });
                setHTML(targetId, html);
            } else setHTML(targetId, '<div class="bg-[#0b0f19] border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-center shadow-inner"><i class="fas fa-check-circle text-xl mb-1 block opacity-80"></i> <span class="font-bold text-[10px]">Ficha Limpa na Assistência</span></div>');
        }
        return errs.length;
    } catch(e) { 
        if(targetId) setHTML(targetId, '<div class="text-red-400 font-bold text-center text-xs">Erro ao ler banco de dados.</div>'); 
        return 0;
    }
}

// VOTOS DO CONSELHO (NOVO MODELO)
async function fetchColleagueVotes(nick, targetId) {
    try {
        const snapshot = await db.collection('avaliacoes_nexus')
            .where('cargo', '==', STATE.cargoAtual)
            .where('nick_avaliado', '==', nick)
            .get();

        let promCount = 0;
        let mantCount = 0;
        window.currentColleagueVotes = []; 

        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.avaliador !== STATE.avaliador) { 
                window.currentColleagueVotes.push(data);
                if (data.veredito === 'Promovido') promCount++;
                if (data.veredito === 'Mantém') mantCount++;
            }
        });

        if(window.currentColleagueVotes.length > 0) {
            const html = `
            <div class="bg-black/40 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-inner">
                <div class="text-center sm:text-left">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Decisões</p>
                    <p class="text-xs font-bold text-slate-300">
                        <span class="text-emerald-400 font-black text-sm">${promCount}</span> PROMOVER / 
                        <span class="text-amber-400 font-black text-sm">${mantCount}</span> MANTER
                    </p>
                </div>
                <button onclick="abrirModalVotosConselho('${nick}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition shadow-md shadow-emerald-900/50 border border-emerald-500 flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto">
                    <i class="fas fa-eye"></i> Ver Pareceres
                </button>
            </div>`;
            setHTML(targetId, html);
        } else {
            setHTML(targetId, '<div class="text-slate-500 text-[10px] font-bold text-center py-3 bg-black/40 rounded-xl border border-slate-800 shadow-inner">Nenhum colega avaliou este membro ainda.</div>');
        }

    } catch(e) {
        console.error(e);
        setHTML(targetId, '<div class="text-red-400 font-bold text-center text-[10px] py-3">Erro ao sincronizar votos do conselho.</div>');
    }
}

// Funções para controlar o Modal Flutuante
window.abrirModalVotosConselho = (nick) => {
    document.getElementById('modal-conselho-nick').innerText = nick;
    const content = document.getElementById('modal-conselho-content');
    
    let html = '<div class="space-y-3">';
    window.currentColleagueVotes.forEach(v => {
        const isPromove = v.veredito === 'Promovido';
        const cor = isPromove ? 'emerald' : 'amber';
        const icon = isPromove ? 'fa-arrow-up' : 'fa-minus';
        
        html += `
        <div class="bg-black/40 border border-slate-800 rounded-xl p-4 relative shadow-inner">
            <div class="flex items-center gap-3 mb-2 border-b border-slate-800/50 pb-2">
                <div class="w-6 h-6 rounded-full bg-${cor}-900/20 border border-${cor}-500/30 flex items-center justify-center">
                    <i class="fas ${icon} text-${cor}-400 text-[10px]"></i>
                </div>
                <div>
                    <p class="text-xs font-black text-slate-200">${v.avaliador}</p>
                    <p class="text-[8px] text-${cor}-400 font-bold uppercase tracking-widest">${v.veredito}</p>
                </div>
                <span class="ml-auto text-[8px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">Voto Registrado</span>
            </div>
            <p class="text-xs text-slate-300 italic leading-relaxed">"${v.dissertacao || 'Sem justificativa detalhada.'}"</p>
        </div>
        `;
    });
    html += '</div>';
    content.innerHTML = html;
    
    document.getElementById('modal-votos-conselho').classList.remove('hidden');
};

window.fecharModalVotosConselho = () => {
    document.getElementById('modal-votos-conselho').classList.add('hidden');
};

// ==========================================
// SALVAMENTO & RETROSPECTO
// ==========================================
async function saveEvaluation() {
    const nick = STATE.listaAtual[STATE.index];
    const veredito = document.querySelector('input[name="veredito"]:checked')?.value;
    const dissertacao = document.getElementById('dissertacao-text').value.trim();
    if(!nick || (!veredito && !dissertacao)) return;

    STATE.avaliacoes[STATE.cargoAtual][nick] = { veredito, dissertacao };
    updateBadges();

    const safeAvaliador = STATE.avaliador.replace(/[^a-zA-Z0-9_]/g, ''); 
    const docId = `${STATE.cargoAtual}_${nick}_${safeAvaliador}`; 
    
    try {
        await db.collection('avaliacoes_nexus').doc(docId).set({ 
            avaliador: STATE.avaliador, 
            nick_avaliado: nick, 
            cargo: STATE.cargoAtual, 
            veredito: veredito || '', 
            dissertacao: dissertacao || '', 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
        
    } catch(e) { console.error("ERRO FIREBASE:", e); showToast('Erro de Conexão!', 'error'); }
}

async function loadEvaluationsFromFirebase() {
    try {
        const snapshot = await db.collection('avaliacoes_nexus').where('avaliador', '==', STATE.avaliador).get();
        snapshot.forEach(doc => { 
            const data = doc.data(); 
            if(STATE.avaliacoes[data.cargo]) {
                STATE.avaliacoes[data.cargo][data.nick_avaliado] = { veredito: data.veredito, dissertacao: data.dissertacao }; 
            }
        });
    } catch(e) { console.error("Falha ao puxar Avaliações pessoais", e); }
}

function toggleRetrospecto() {
    const screen = document.getElementById('retrospecto-screen');
    const btn = document.getElementById('toggle-retrospecto-btn');
    
    if(screen.classList.contains('hidden')) {
        toggleDisplay('evaluation-container', false); toggleDisplay('retrospecto-screen', true);
        
        let html = '';
        STATE.listaAtual.forEach((n, i) => {
            const d = STATE.avaliacoes[STATE.cargoAtual][n];
            let bg = 'bg-[#0b0f19]', borda = 'border-slate-800', cor = 'text-slate-500', icone = 'fa-clock';
            if(d) {
                if(d.veredito === 'Promovido') { bg = 'bg-emerald-900/20'; borda = 'border-emerald-500/50'; cor = 'text-emerald-400'; icone = 'fa-arrow-up'; }
                else if(d.veredito === 'Mantém') { bg = 'bg-amber-900/20'; borda = 'border-amber-500/50'; cor = 'text-amber-400'; icone = 'fa-minus'; }
            }
            html += `<div onclick="window.goToIndex(${i})" class="${bg} border ${borda} rounded-xl p-3 cursor-pointer hover:scale-105 transition flex items-center gap-3 shadow-md"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${n}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-10 h-10 rounded-full bg-black/40 drop-shadow border border-slate-700"><div class="flex-1 overflow-hidden"><div class="font-bold text-xs text-white truncate flex justify-between items-center mb-0.5">${n} <i class="fas ${icone} ${cor}"></i></div><div class="text-[9px] text-slate-400 truncate">${d?.dissertacao || 'Pendente de preenchimento.'}</div></div></div>`;
        });
        setHTML('retrospecto-content', html);
    } else {
        toggleDisplay('evaluation-container', true); toggleDisplay('retrospecto-screen', false);
    }
}
window.goToIndex = (i) => { STATE.index = i; toggleRetrospecto(); loadCard(); };

// ==========================================
// LÓGICA DO COMPARADOR DINÂMICO
// ==========================================
let comparadorCargo = '';

function setupComparadorSelects() {
    const cargoSel = document.getElementById('cargo-select');
    cargoSel.innerHTML = '<option value="" disabled selected>Escolha um cargo...</option><option value="professor">Professores</option><option value="coordenador">Coordenadores</option><option value="graduador">Graduadores</option>';
    cargoSel.disabled = false;

    cargoSel.addEventListener('change', (e) => {
        comparadorCargo = e.target.value;
        const opts = `<option value="">Selecione um Membro</option>` + STATE.cache[comparadorCargo].nicks.map(n => `<option value="${n}">${n}</option>`).join('');
        const selA = document.getElementById('membro-a-select'); const selB = document.getElementById('membro-b-select');
        selA.innerHTML = opts; selA.disabled = false; selB.innerHTML = opts; selB.disabled = false;
        
        document.getElementById('card-a').innerHTML = ''; document.getElementById('card-b').innerHTML = '';
        document.getElementById('compare-arena').classList.add('hidden');
    });

    document.getElementById('membro-a-select').addEventListener('change', (e) => loadComparadorCard('a', e.target.value));
    document.getElementById('membro-b-select').addEventListener('change', (e) => loadComparadorCard('b', e.target.value));
}

async function loadComparadorCard(side, nick) {
    const card = document.getElementById(`card-${side}`);
    document.getElementById('compare-arena').classList.remove('hidden');
    if(!nick) { card.innerHTML = ''; return; }

    const color = side === 'a' ? 'indigo' : 'pink';
    const bgGradient = side === 'a' ? 'from-indigo-900/30' : 'from-pink-900/30';

    card.innerHTML = `<div class="h-full flex flex-col items-center justify-center p-6"><i class="fas fa-circle-notch fa-spin text-3xl text-${color}-500 mb-3"></i><p class="text-slate-400 font-bold text-xs">Processando Dossiê...</p></div>`;

    const dataDetails = await fetchMemberDetails(nick, null, null, null);
    const dataMetas = await fetchMetas(nick, null, comparadorCargo);
    const errosQtd = await fetchErrorsFromFirebase(nick, null);

    const rankText = dataDetails.rankRow ? `${dataDetails.rankRow[0]}º <span class="text-[10px] text-slate-400">(${dataDetails.rankRow[2]} pts)</span>` : 'S/R';
    const historyHtmlId = `comp-history-${side}`;
    
    card.innerHTML = `
        <div class="comp-avatar-container border-4 border-${color}-500 shadow-${color}-500/30">
            <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&direction=3&head_direction=3&gesture=sml&size=l" class="mt-2 scale-110 drop-shadow-md" style="image-rendering: pixelated;">
        </div>
        
        <div class="bg-gradient-to-b ${bgGradient} to-transparent pt-12 pb-4 px-4 text-center border-b border-slate-800">
            <h2 class="text-xl font-black text-white">${nick}</h2>
            <p class="text-[10px] font-bold uppercase tracking-widest text-${color}-400 mt-0.5">${comparadorCargo}</p>
        </div>
        
        <div class="p-4 space-y-3">
            <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 shadow-inner">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5"><i class="fas fa-trophy text-${color}-500 mr-1"></i> Rank</span>
                    <span class="text-lg font-black text-white">${rankText}</span>
                </div>
                <div class="flex flex-col bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 shadow-inner">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5"><i class="fas fa-shield-alt text-${color}-500 mr-1"></i> Conduta</span>
                    <span class="text-sm font-black ${errosQtd > 0 ? 'text-red-400' : 'text-emerald-400'}">${errosQtd === 0 ? 'Ficha Limpa' : `${errosQtd} Erros`}</span>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 shadow-inner">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5"><i class="fas fa-lightbulb text-${color}-500 mr-1"></i> Aprovadas</span>
                    <span class="text-sm font-black text-white">${dataDetails.propTotal} prop.</span>
                </div>
                <div class="flex flex-col bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 shadow-inner">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5"><i class="fas fa-chart-line text-${color}-500 mr-1"></i> Meta Atual</span>
                    <span class="text-sm font-black text-white">${dataMetas.val}</span>
                </div>
            </div>

            <div class="flex flex-col bg-[#0b0f19] p-3 rounded-xl border border-slate-800 shadow-inner mt-2">
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><i class="fas fa-history text-${color}-500 mr-1"></i> Histórico</span>
                <div id="${historyHtmlId}" class="grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                    <div class="col-span-full text-center text-slate-500 text-[10px] py-2"><i class="fas fa-circle-notch fa-spin text-${color}-500"></i> Carregando...</div>
                </div>
            </div>
        </div>
    `;

    if(comparadorCargo === 'professor') fetchHistoryProf(nick, historyHtmlId);
    else if(comparadorCargo === 'coordenador') fetchHistoryCoord(nick, historyHtmlId);
    else fetchHistoryGrad(nick, historyHtmlId);
}

// ==========================================
// EVENT LISTENER BUTTONS E VALIDAÇÃO OBRIGATÓRIA
// ==========================================
document.querySelectorAll('.promo-btn').forEach(b => b.addEventListener('click', () => loadPromotionList(b.dataset.cargo)));

document.getElementById('next-button').addEventListener('click', async () => { 
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = document.getElementById('dissertacao-text').value.trim();
    
    // VALIDAÇÕES
    if (!veredito) {
        showToast('Selecione um veredito (Promovido/Mantém) antes de avançar!', 'error');
        return;
    }
    if (!dissertacao || dissertacao.length < 5) {
        showToast('Escreva uma dissertação justificando o voto antes de avançar!', 'error');
        document.getElementById('dissertacao-text').focus();
        document.getElementById('dissertacao-text').classList.add('border-red-500');
        setTimeout(() => document.getElementById('dissertacao-text').classList.remove('border-red-500'), 1500);
        return;
    }

    const savingToast = showToast('Salvando...', 'loading');
    await saveEvaluation(); 
    savingToast.remove();

    if(STATE.index < STATE.listaAtual.length - 1) { 
        STATE.index++; 
        loadCard(); 
    } else { 
        showToast('Lista Concluída!', 'success'); 
        toggleRetrospecto(); 
    } 
});

document.getElementById('prev-button').addEventListener('click', async () => { 
    // Para voltar, se tiver algo preenchido, salva. Mas não barra se estiver vazio.
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = document.getElementById('dissertacao-text').value.trim();
    if (veredito && dissertacao.length >= 5) {
        await saveEvaluation(); 
    }
    if(STATE.index > 0) { STATE.index--; loadCard(); } 
});

document.getElementById('toggle-retrospecto-btn').addEventListener('click', toggleRetrospecto);

document.addEventListener('change', (e) => { 
    if(e.target.name === 'veredito') {
        const dissertacao = document.getElementById('dissertacao-text').value.trim();
        if(dissertacao.length >= 5) saveEvaluation(); 
    }
});

// ==========================================
// HOOK DE LOGIN DO GLOBAL.JS
// ==========================================
document.addEventListener('userDataReady', (e) => {
    const user = e.detail.userData;
    if (user) {
        db = firebase.firestore();
        STATE.avaliador = user.name; 
        setHTML('display-avaliador-nick', user.name);
        toggleDisplay('access-denied-screen', false); 
        toggleDisplay('main-app-screen', true);
        
        bootSystemSilent();
    } else { 
        toggleDisplay('main-app-screen', false); 
        toggleDisplay('access-denied-screen', true); 
    }
});