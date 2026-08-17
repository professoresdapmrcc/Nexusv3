// Removemos os 'imports' pois o Firebase já foi carregado globalmente pela versão 8 no HTML
const auth = firebase.auth();
const db = firebase.firestore();

// --- Configurações de Planilhas (Google Sheets API) ---
const API_KEY_PROMOVIDOS = "AIzaSyBwkD-BoMVjkUMGcqpIdc9xlIYWDML76fw";
const SPREADSHEET_ID_PROMOVIDOS = "10rnDavOJTY2fKxLGNdC6Ijvwovy_tMeXv_DnWSkPyi4";
const SHEET_NAME_PROMOVIDOS = "Promovidos";

const SPREADSHEET_ID_GERADOR = "1KQXx7TFtbNzMYHzOM5LMT7Fh61hiGOKZHux4K3Q6YpM";
const SHEET_NAME_GERADOR = "Gerador";
const API_KEY_GERADOR = "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34";

const SPREADSHEET_ID_RANKING_INTERNO = "1qL4S-vNDI2iONCVtl6fUuWo6EK0v62IWFGydrLKhlbQ";
const SHEET_NAME_RANKING_INTERNO = "Ranking Interno";
const API_KEY_RANKING_INTERNO = "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34";

const SPREADSHEET_ID_ERRORS_WARNINGS = "1UeZJRttSqMY6ZJzVYDNaaCcm8Ua6CTphJ9mw-wea44g";
const SHEET_NAME_ERRORS_WARNINGS = "Quadro de Erros & Advertências";
const API_KEY_ERRORS_WARNINGS = "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34";

// Configuração dos Subgrupos
const SUBGRUPOS_CONFIG = {
    spp: {
        nome: "Serviço de Proteção dos Professores",
        sigla: "SPP",
        logo: "https://i.imgur.com/VEWeefe.png",
        spreadsheetId: "1kFnRqlQ-8Bzlv578t9uC_T0C74jjsK3nbzBgRFTlAJM",
        sheetName: "Gerador",
        range: "B16:C37",
        apiKey: "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34",
        color: "from-purple-900 to-purple-800",
        borderColor: "border-purple-600"
    },
    da: {
        nome: "Departamento de Aplicação",
        sigla: "DA",
        logo: "https://i.imgur.com/Scl808D.png",
        spreadsheetId: "1zksr3s1X3-JYTTnVEN8qzgJvZhHjxcUH0SF2lwpzjCk",
        sheetName: "Listagem",
        range: "B15:C35",
        apiKey: "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34",
        color: "from-purple-700 via-purple-600 to-yellow-600",
        borderColor: "border-yellow-500"
    },
    cdc: {
        nome: "Centro de Desenvolvimento Cultural",
        sigla: "CDC",
        logo: "https://i.imgur.com/F0exubV.png",
        spreadsheetId: "1BJwyIbKfLl8arTIsA4vxtBvHlvx05HPG6VmauBBxlPo",
        sheetName: "Listagem",
        range: "B16:C36",
        apiKey: "AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34",
        color: "from-purple-400 to-purple-300",
        borderColor: "border-purple-400"
    }
};

// --- Variáveis de Estado ---
let avaliadorNick = "";
let avaliadorCargo = ""; 
let currentPromotionList = [];
let currentIndex = 0;
let currentPromotionName = "";
let currentCargo = "";

let preloadedData = {
    professor: { nicks: [], cargo: 'professor', vagas: 0 },
    coordenador: { nicks: [], cargo: 'coordenador', vagas: 0 },
    graduador: { nicks: [], cargo: 'graduador', vagas: 0 }
};

let evaluatedNicks = {
    professor: new Set(),
    coordenador: new Set(),
    graduador: new Set()
};

let promotedCount = {
    professor: 0,
    coordenador: 0,
    graduador: 0
};

let avaliacoes = {
    professor: {},
    coordenador: {},
    graduador: {}
};

// --- Elementos DOM ---
const mainAppScreen = document.getElementById('main-app-screen');
const choiceScreen = document.getElementById('choice-screen'); 
const preloadScreen = document.getElementById('preload-screen');
const loadingStatus = document.getElementById('loading-status');
const progressBar = document.getElementById('progress-bar');

const displayAvaliadorNick = document.getElementById('display-avaliador-nick');
const logoutButton = document.getElementById('logout-button');
const promoButtons = document.querySelectorAll('#promo-buttons button');

const initialMessage = document.getElementById('initial-message');
const statusMessage = document.getElementById('status-message');
const evaluationCard = document.getElementById('evaluation-card');
const displayNickAvaliado = document.getElementById('display-nick-avaliado');
const cardCounter = document.getElementById('card-counter');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const dissertacaoText = document.getElementById('dissertacao-text');
const memberDetailsPlaceholder = document.getElementById('member-details-placeholder');
const internalRankingPlaceholder = document.getElementById('internal-ranking-placeholder');
const propostasPlaceholder = document.getElementById('propostas-placeholder');
const errorsWarningsPlaceholder = document.getElementById('errors-warnings-placeholder');
const metasCurrent = document.getElementById('metas-current');
const metasHistory = document.getElementById('metas-history');
const retrospectoToggleContainer = document.getElementById('retrospecto-toggle-container');
const toggleRetrospectoBtn = document.getElementById('toggle-retrospecto-btn');

// --- FIREBASE AUTH & USER DATA (Padrão V8) ---

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("Usuário logado:", user.uid);
        
        avaliadorNick = user.displayName || "Usuário sem Nick";
        
        if (choiceScreen) choiceScreen.classList.add('hidden');
        if (preloadScreen) preloadScreen.classList.remove('hidden');
        if (loadingStatus) loadingStatus.textContent = `Bem-vindo, ${avaliadorNick}. Buscando suas permissões...`;
        
        try {
            const docRef = db.collection("usuarios").doc(user.uid);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const userData = docSnap.data();
                avaliadorCargo = userData.cargo || "Sem Cargo"; 
                console.log("Cargo recuperado:", avaliadorCargo);
            } else {
                console.log("Documento de usuário não encontrado no Firestore!");
                avaliadorCargo = "Desconhecido";
            }
        } catch (error) {
            console.error("Erro ao buscar cargo:", error);
            showToast("Erro ao recuperar dados do perfil.", "error");
        }

        if (displayAvaliadorNick) displayAvaliadorNick.textContent = `${avaliadorNick}`;

        await preloadSystem(); 
        await loadEvaluationsFromFirestore(); 
        
        if (preloadScreen) preloadScreen.classList.add('hidden');
        if (mainAppScreen) mainAppScreen.classList.remove('hidden');

    } else {
        console.log("Usuário não logado.");
        avaliadorNick = "";
        avaliadorCargo = "";
        if (mainAppScreen) mainAppScreen.classList.add('hidden');
        if (preloadScreen) preloadScreen.classList.add('hidden');
        if (choiceScreen) choiceScreen.classList.remove('hidden'); 
    }
});

if(logoutButton) {
    logoutButton.addEventListener('click', () => {
        void fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });
        auth.signOut().then(() => {
            showToast("Desconectado com sucesso.", "success");
            window.location.reload(); 
        }).catch((error) => {
            showToast("Erro ao sair.", "error");
        });
    });
}

// --- SISTEMA DE TOAST ---
function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    if (type === 'success') {
        toast.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else if (type === 'loading') {
        toast.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }
    
    let icon = '';
    if (type === 'success') icon = 'fa-check-circle';
    else if (type === 'error') icon = 'fa-exclamation-circle';
    else if (type === 'loading') icon = 'fa-spinner fa-spin';
    
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    
    if (type !== 'loading') {
        setTimeout(() => { toast.remove(); }, 3000);
    }
    return toast;
}

// --- LEITURA E ESCRITA NO FIRESTORE (AVALIAÇÕES) ---

async function saveCurrentEvaluation() {
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = dissertacaoText ? dissertacaoText.value.trim() : '';
    const nickAvaliado = currentPromotionList[currentIndex];
    
    if ((veredito || dissertacao) && nickAvaliado && currentCargo) {
        const avaliacaoSalva = avaliacoes[currentCargo][nickAvaliado];
        const vereditoValue = veredito ? veredito.value : '';
        
        const houveMudanca = !avaliacaoSalva || avaliacaoSalva.veredito !== vereditoValue || avaliacaoSalva.dissertacao !== dissertacao;
        
        if (houveMudanca) {
            const loadingToast = showToast('Salvando...', 'loading');
            
            avaliacoes[currentCargo][nickAvaliado] = {
                veredito: vereditoValue,
                dissertacao: dissertacao
            };
            
            try {
                const docId = `${currentCargo}_${nickAvaliado.replace(/\s+/g, '_')}_${avaliadorNick.replace(/\s+/g, '_')}`;
                
                await db.collection("avaliacoes").doc(docId).set({
                    avaliador: avaliadorNick,
                    avaliadorCargo: avaliadorCargo,
                    nick_avaliado: nickAvaliado,
                    cargo_lista: currentCargo,
                    veredito: vereditoValue,
                    dissertacao: dissertacao,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log(`Avaliação de ${nickAvaliado} salva no Firestore.`);
                
                if (loadingToast) loadingToast.remove();
                showToast('Avaliação salva!', 'success');

            } catch (error) {
                console.error("Erro ao salvar no Firestore:", error);
                if (loadingToast) loadingToast.remove();
                showToast('Erro ao salvar no banco.', 'error');
            }
        }
    }
}

async function loadEvaluationsFromFirestore() {
    if (!avaliadorNick) return;
    console.log('Buscando avaliações anteriores no Firestore...');

    try {
        const querySnapshot = await db.collection("avaliacoes").where("avaliador", "==", avaliadorNick).get();
        
        avaliacoes = { professor: {}, coordenador: {}, graduador: {} };
        evaluatedNicks = { professor: new Set(), coordenador: new Set(), graduador: new Set() };
        promotedCount = { professor: 0, coordenador: 0, graduador: 0 };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cargoLista = data.cargo_lista; 
            const nickAvaliado = data.nick_avaliado;

            if (avaliacoes[cargoLista]) {
                avaliacoes[cargoLista][nickAvaliado] = {
                    veredito: data.veredito,
                    dissertacao: data.dissertacao
                };

                if (data.veredito || data.dissertacao) {
                    evaluatedNicks[cargoLista].add(nickAvaliado);
                }
                if (data.veredito === 'Promovido') {
                    promotedCount[cargoLista]++;
                }
            }
        });

        updateBadgeCounts();
        console.log('Avaliações carregadas.');

    } catch (error) {
        console.error("Erro ao carregar avaliações:", error);
        showToast("Erro ao carregar avaliações antigas.", "error");
    }
}

// --- PRE-LOADING DE DADOS DO GOOGLE SHEETS ---

async function preloadSystem() {
    const preloadScreen = document.getElementById('preload-screen');
    const progressBar = document.getElementById('progress-bar');
    const loadingStatus = document.getElementById('loading-status');
    
    try {
        if (loadingStatus) loadingStatus.textContent = 'Carregando Professores...';
        if (progressBar) progressBar.style.width = '20%';
        const profUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!B9:B30?key=${API_KEY_PROMOVIDOS}`;
        const profResponse = await fetch(profUrl);
        if (profResponse.ok) {
            const profData = await profResponse.json();
            preloadedData.professor.nicks = (profData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        if (loadingStatus) loadingStatus.textContent = 'Carregando Coordenadores...';
        if (progressBar) progressBar.style.width = '40%';
        const coordUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!C9:C30?key=${API_KEY_PROMOVIDOS}`;
        const coordResponse = await fetch(coordUrl);
        if (coordResponse.ok) {
            const coordData = await coordResponse.json();
            preloadedData.coordenador.nicks = (coordData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        if (loadingStatus) loadingStatus.textContent = 'Carregando Graduadores...';
        if (progressBar) progressBar.style.width = '60%';
        const gradUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!D9:D30?key=${API_KEY_PROMOVIDOS}`;
        const gradResponse = await fetch(gradUrl);
        if (gradResponse.ok) {
            const gradData = await gradResponse.json();
            preloadedData.graduador.nicks = (gradData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        if (loadingStatus) loadingStatus.textContent = 'Carregando Vagas Disponíveis...';
        if (progressBar) progressBar.style.width = '80%';
        const vagasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!B8:D8?key=${API_KEY_PROMOVIDOS}`;
        const vagasResponse = await fetch(vagasUrl);
        if (vagasResponse.ok) {
            const vagasData = await vagasResponse.json();
            const vagasRow = vagasData.values ? vagasData.values[0] : [];
            preloadedData.professor.vagas = parseInt(vagasRow[0]) || 0;
            preloadedData.coordenador.vagas = parseInt(vagasRow[1]) || 0;
            preloadedData.graduador.vagas = parseInt(vagasRow[2]) || 0;
        }
        
        if (loadingStatus) loadingStatus.textContent = 'Finalizando...';
        if (progressBar) progressBar.style.width = '100%';
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateBadgeCounts();
        
        if (preloadScreen) preloadScreen.classList.add('hidden');
        if (mainAppScreen) mainAppScreen.classList.remove('hidden');
        resetMainScreen();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (loadingStatus) loadingStatus.textContent = 'Erro ao carregar. Tentando novamente...';
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// --- Helpers de Data e Lógica de Negócio ---

function getWeekDates(weekOffset = 0) {
    const now = new Date();
    now.setDate(now.getDate() - (7 * weekOffset));
    const dayOfWeek = now.getDay();
    const startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { start: startDate, end: endDate };
}

// Lógica corrigida das Quinzenas
function getFortnightPeriods(count = 4) {
    const periods = [];
    let date = new Date(); 

    for (let i = 0; i < count; i++) {
        let year = date.getFullYear();
        let month = date.getMonth();
        let day = date.getDate();

        let start, end;
        if (day > 15) {
            start = new Date(year, month, 16);
            end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            date = new Date(year, month, 15);
        } else {
            start = new Date(year, month, 1);
            end = new Date(year, month, 15, 23, 59, 59, 999);
            date = new Date(year, month, 0); 
        }
        periods.push({ start: start, end: end });
    }
    return periods;
}

const monthMap = { 'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11 };

function parseSheetDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length === 3) {
            const year = parseInt(parts[2], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[0], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) return new Date(year, month, day);
        }
    }
    const parts = dateStr.replace('.', '').toLowerCase().split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthIndex = monthMap[parts[1]];
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && monthIndex !== undefined && !isNaN(year)) return new Date(year, monthIndex, day);
    }
    return null;
}

function formatDateForDisplay(date) {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function calculateDaysSince(dateStr) {
    if(!dateStr) return null;
    const date = parseSheetDate(dateStr);
    if(!date) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return Math.floor(Math.abs(today - date) / (1000*60*60*24));
}

function checkLicenseStatus(startDateStr, returnDateStr) {
    if (!startDateStr || !returnDateStr) return { onLeave: false };
    const start = parseSheetDate(startDateStr), end = parseSheetDate(returnDateStr), today = new Date();
    today.setHours(0,0,0,0);
    if(start) start.setHours(0,0,0,0);
    if(end) end.setHours(0,0,0,0);
    return { onLeave: start && end && today >= start && today <= end, returnDate: returnDateStr };
}

const professorCourseValues = { 'Curso de Aperfeiçoamento Comunicativo (CAC)': 50, 'Curso de Aperfeiçoamento de Praças (CAP)': 50, 'Curso de Revisão Ortográfica (CRO)': 45, 'Avaliação de Conhecimento Linguístico (ACL)': 45 };
const coordinatorCourseValues = { 'Acompanhamento de aula': 50, 'Orientação': 50, 'Curso de Oratória Pública (COP)': 50, 'Curso de Desenvolvimento Argumentativo (CDA)': 50 };

function getProfessorStatus(p) { 
     if (p >= 350) return { class: 'status-excelente', message: '<i class="fas fa-crown"></i> Excelente' }; 
     if (p >= 155) return { class: 'status-otimo', message: '<i class="fas fa-thumbs-up"></i> Ótimo' }; 
     if (p >= 100) return { class: 'status-regular', message: '<i class="fas fa-check-circle"></i> Regular' }; 
     return { class: 'status-irregular', message: '<i class="fas fa-exclamation-triangle"></i> Irregular' }; 
}

function getCoordinatorStatus(p, c) { 
     if (!c) return { class: 'status-irregular', message: '<i class="fas fa-file-excel"></i> Falta Carta' }; 
     if (p >= 200) return { class: 'status-excelente', message: '<i class="fas fa-crown"></i> Excelente' }; 
     if (p >= 125) return { class: 'status-otimo', message: '<i class="fas fa-thumbs-up"></i> Ótimo' }; 
     if (p >= 100) return { class: 'status-regular', message: '<i class="fas fa-check-circle"></i> Regular' }; 
     return { class: 'status-irregular', message: '<i class="fas fa-exclamation-triangle"></i> Irregular' }; 
}

function getGraduatorStatus(c) { 
     if (c >= 2) return { class: 'status-regular', message: '<i class="fas fa-check"></i> Regular' }; 
     return { class: 'status-irregular', message: '<i class="fas fa-times"></i> Irregular' }; 
}

const apiConfigs = {
    professor: { apiKey: 'AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34', spreadsheetId: '1L5t72kbIlRnHRp_OaOMbHdDjkOy_3QlGJdYqarhh-ac', range: "'Ranking & Filtro'!C5:H", valueIndex: 5, isPercentage: true },
    coordenador: { apiKey: 'AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34', spreadsheetId: '1EzyhvK4zEI_940ATXnaNQ8KUCxr-2Xj0qRY1MS6extI', range: "'Ranking & Filtro'!C5:I", valueIndex: 6, isPercentage: true },
    graduador: { apiKey: 'AIzaSyBQhWdy4iyFCk9Lh89x8weSIyl0knXgA34', spreadsheetId: '154ToDPq8wakIM9W0LIiM_TExwAjunT696pqq0xmP2I8', range: "'Ranking'!C5:F", valueIndex: 3, isPercentage: false }
};

// --- RENDERIZADOR DE CARDS DO HISTÓRICO ---
function renderHistoryCard(start, end, value, unit, status) {
    const formatShort = (d) => {
        const m = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        return `${String(d.getDate()).padStart(2, '0')} ${m[d.getMonth()]} ${d.getFullYear()}`;
    };

    let borderColor = 'border-slate-800';
    let badgeColor = 'border-slate-500/30 text-slate-400 bg-slate-500/10';
    let rawStatusText = status.message.replace(/<[^>]*>?/gm, '').trim().toUpperCase();

    if (status.class.includes('excelente') || status.class.includes('melhor')) {
        borderColor = 'border-amber-500/30';
        badgeColor = 'border-amber-500/50 text-amber-400 bg-amber-500/10';
    } else if (status.class.includes('otimo')) {
        borderColor = 'border-blue-500/30';
        badgeColor = 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    } else if (status.class.includes('regular') && !status.class.includes('irregular')) {
        borderColor = 'border-green-500/30';
        badgeColor = 'border-green-500/50 text-green-400 bg-green-500/10';
    } else if (status.class.includes('irregular')) {
        borderColor = 'border-red-500/30';
        badgeColor = 'border-red-500/50 text-red-400 bg-red-500/10';
    }

    return `
        <div class="bg-[#0b0f19] border ${borderColor} rounded-xl p-3 text-center flex flex-col justify-between shadow-md relative hover:border-slate-600 transition-colors">
            <div class="text-[9px] font-bold text-slate-400 mb-2 leading-tight uppercase tracking-wider">
                ${formatShort(start)}<br><span class="text-slate-600 text-[8px] my-0.5 inline-block">ATÉ</span><br>${formatShort(end)}
            </div>
            <div class="text-2xl font-black text-white mb-2 drop-shadow-md">
                ${value}<span class="text-sm text-slate-500 font-bold ml-1">${unit}</span>
            </div>
            <div class="text-[9px] font-black uppercase border ${badgeColor} rounded py-1 px-2 mx-auto inline-block tracking-widest">
                ${rawStatusText}
            </div>
        </div>
    `;
}

// --- Funções de Busca de Dados ---

async function fetchErrorsAndWarnings(nick) {
    if (!errorsWarningsPlaceholder) return;
    errorsWarningsPlaceholder.innerHTML = '<div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-slate-500 text-xl"></i></div>';

    try {
        let querySnapshot = await db.collection("assistencia_registros")
            .where("nick", "==", nick)
            .where("decisao", "==", "APROVADA")
            .get();

        if (querySnapshot.empty) {
            querySnapshot = await db.collection("assistencia_registros")
                .where("nick", "==", nick.toLowerCase())
                .where("decisao", "==", "APROVADA")
                .get();
        }

        const foundRecords = [];
        querySnapshot.forEach((doc) => foundRecords.push(doc.data()));

        let html = '';
        if (foundRecords.length > 0) {
            foundRecords.forEach(record => {
                const type = record.punicao || 'N/A';
                const reason = record.motivo || 'N/A';
                const dataFormatada = record.data_formatada || 'N/A';
                
                let borderColor = 'border-yellow-500/50';
                let bgColor = 'bg-yellow-500/10';
                let textColor = 'text-yellow-500';
                
                if(type.toUpperCase().includes('ERRO')) {
                    borderColor = 'border-red-500/50';
                    bgColor = 'bg-red-500/10';
                    textColor = 'text-red-500';
                }

                html += `
                <div class="border ${borderColor} ${bgColor} p-3 rounded-lg relative overflow-hidden group mb-2">
                    <div class="absolute left-0 top-0 bottom-0 w-1 ${bgColor.replace('/10', '/50')}"></div>
                    <div class="flex justify-between items-center text-[10px] ${textColor} font-bold mb-1 ml-2">
                        <span class="uppercase tracking-wider">${type}</span>
                        <span class="text-slate-400 opacity-80">${dataFormatada}</span>
                    </div>
                    <p class="text-xs text-slate-300 ml-2 font-medium">${reason}</p>
                </div>`;
            });
        } else {
            html = `<div class="bg-[#0b0f19] border border-emerald-500/30 rounded-lg p-3 text-center flex flex-col items-center">
                <i class="fas fa-check-circle text-emerald-500 mb-1"></i>
                <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Histórico Limpo</p>
            </div>`;
        }
        errorsWarningsPlaceholder.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao buscar erros e advertências do Firestore:', error);
        errorsWarningsPlaceholder.innerHTML = `<p class="text-red-400 text-xs">Erro ao buscar dados de erros. (${error.message})</p>`;
    }
}

async function fetchInternalRanking(nick) {
    if (!internalRankingPlaceholder) return;
    internalRankingPlaceholder.innerHTML = '<div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-slate-500 text-xl"></i></div>';
    const range = `'${SHEET_NAME_RANKING_INTERNO}'!I6:K18`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_RANKING_INTERNO}/values/${range}?key=${API_KEY_RANKING_INTERNO}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const row = (data.values || []).find(r => r[1] && r[1].trim().toLowerCase() === nick.trim().toLowerCase());
        if (row) {
            internalRankingPlaceholder.innerHTML = `
                <div class="text-xl font-black text-white drop-shadow-md">
                    ${row[0]}º<span class="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-wider">Lugar</span>
                </div>
                <div class="text-[10px] text-purple-300 font-bold mt-1">
                    ${row[2]} PONTOS
                </div>
            `;
        } else {
            internalRankingPlaceholder.innerHTML = `<p class="text-slate-500 text-xs font-bold uppercase">Sem Registro</p>`;
        }
    } catch (error) {
        console.error('Erro ao buscar ranking interno:', error);
        internalRankingPlaceholder.innerHTML = `<p class="text-red-400 text-xs">Erro.</p>`;
    }
}

async function fetchPropostas(nick) {
    if (!propostasPlaceholder) return;
    propostasPlaceholder.innerHTML = '<div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-slate-500 text-xl"></i></div>';
    const range = "'Central de Dados'!DB4:DC1000";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_GERADOR}/values/${range}?key=${API_KEY_GERADOR}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const rows = data.values || [];
        const propostasCount = { 'Projeto': 0, 'Sugestão': 0, 'Correção': 0 };
        rows.forEach(row => {
            const rowNick = row[0];
            const tipo = row[1];
            if (rowNick && rowNick.trim().toLowerCase() === nick.trim().toLowerCase() && tipo) {
                const tipoNormalized = tipo.trim();
                if (propostasCount.hasOwnProperty(tipoNormalized)) {
                    propostasCount[tipoNormalized]++;
                }
            }
        });
        
        let html = '<div class="flex flex-col gap-2 w-full">';
        
        const types = [
            { name: 'Projetos', count: propostasCount['Projeto'], color: 'blue' },
            { name: 'Sugestões', count: propostasCount['Sugestão'], color: 'green' },
            { name: 'Correções', count: propostasCount['Correção'], color: 'purple' }
        ];

        types.forEach(type => {
            html += `
                <div class="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-2 rounded-lg">
                    <span class="text-xs font-bold text-slate-400">${type.name}</span>
                    <span class="text-sm font-black text-white">${type.count}</span>
                </div>
            `;
        });
        
        html += '</div>';
        propostasPlaceholder.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao buscar propostas:', error);
        propostasPlaceholder.innerHTML = `<p class="text-red-400 text-xs">Erro ao buscar propostas.</p>`;
    }
}

async function fetchSubgrupo(nick) {
    const subgruposEncontrados = [];
    for (const [key, config] of Object.entries(SUBGRUPOS_CONFIG)) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/'${config.sheetName}'!${config.range}?key=${config.apiKey}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const rows = data.values || [];
                const found = rows.find(row => row[1] && row[1].trim().toLowerCase() === nick.trim().toLowerCase());
                if (found) {
                    subgruposEncontrados.push({ key: key, cargo: found[0] || 'N/A' });
                }
            }
        } catch (error) {
            console.error(`Erro ao buscar no subgrupo ${key}:`, error);
        }
    }
    return subgruposEncontrados;
}

async function fetchMemberDetails(nick, cargo) {
    if (!memberDetailsPlaceholder) return;
    memberDetailsPlaceholder.innerHTML = '<div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-slate-500 text-xl"></i></div>';
    const range = `'${SHEET_NAME_GERADOR}'!C4:I193`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_GERADOR}/values/${range}?key=${API_KEY_GERADOR}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const row = (data.values || []).find(r => r[0] && r[0].trim().toLowerCase() === nick.trim().toLowerCase());
        
        if (!row) {
            memberDetailsPlaceholder.innerHTML = '<p class="text-center text-slate-500 text-xs font-bold uppercase">Não encontrado no Gerador</p>';
            return;
        }
        
        const [entryDate, promoDate, , licenseStart, , licenseReturn] = [row[1], row[2], row[3], row[4], row[5], row[6]];
        const subgrupoInfo = await fetchSubgrupo(nick);
        let html = '';
        const licenseInfo = checkLicenseStatus(licenseStart, licenseReturn);
        
        if (licenseInfo.onLeave) {
            html += `<div class="p-2 mb-3 rounded-lg bg-red-900/30 border border-red-500/50 text-center flex flex-col justify-center">
                        <span class="text-[10px] font-black text-red-400 uppercase tracking-widest"><i class="fas fa-exclamation-triangle mr-1"></i> Em Licença</span>
                        <span class="text-[9px] text-red-300">Retorno: ${licenseInfo.returnDate || 'N/A'}</span>
                     </div>`;
        }

        html += `
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="text-center border-r border-slate-800">
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entrada</p>
                    <p class="text-xs font-black text-white">${entryDate || 'N/A'}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Últ. Promoção</p>
                    <p class="text-xs font-black text-white">${promoDate || 'N/A'}</p>
                </div>
            </div>
        `;
        
        html += '<div class="text-center mt-4"><p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Subgrupos</p><div class="flex justify-center gap-3">';
        for (const [key, config] of Object.entries(SUBGRUPOS_CONFIG)) {
            const subgrupoAtivo = subgrupoInfo.find(sg => sg.key === key);
            const isActive = !!subgrupoAtivo;
            const opacidade = isActive ? 'opacity-100' : 'opacity-30 grayscale';
            const borderClass = isActive ? `border border-${config.borderColor.split('-')[1]}-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]` : 'border border-transparent';
            
            html += `
                <div class="flex flex-col items-center ${opacidade} transition-all duration-300" title="${isActive ? subgrupoAtivo.cargo : 'Não participa'}">
                    <div class="w-8 h-8 rounded-full bg-[#0b0f19] flex items-center justify-center p-1 mb-1 ${borderClass}">
                        <img src="${config.logo}" alt="${config.sigla}" class="w-full h-full object-contain">
                    </div>
                    <span class="text-[8px] font-bold ${isActive ? 'text-white' : 'text-slate-500'} uppercase">${config.sigla}</span>
                </div>
            `;
        }
        html += '</div></div>';
        
        memberDetailsPlaceholder.innerHTML = html;
    } catch(error) {
        console.error('Erro ao buscar detalhes do Gerador:', error);
        memberDetailsPlaceholder.innerHTML = `<p class="text-center text-red-400 text-xs">Erro ao buscar detalhes.</p>`;
    }
}

function fetchProfessorHistory(config, nick) {
    if (!metasHistory) return;
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/BACKUP!A:F?key=${config.apiKey}`;
    metasHistory.innerHTML = '<div class="col-span-full flex justify-center py-4"><i class="fas fa-spinner fa-spin text-slate-400 text-2xl"></i></div>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length <= 1) { metasHistory.innerHTML = '<p class="col-span-full text-slate-500 text-[10px] text-center">Sem histórico.</p>'; return; }
        
        let historyHtml = '';
        for (let i = 0; i < 4; i++) {
            const { start, end } = getWeekDates(i);
            let weekTotal = 0;
            backupRows.slice(1).forEach(row => {
                const [timestampStr, rowNick, , , , courseName] = row;
                if (timestampStr && rowNick && courseName && rowNick.trim().toLowerCase() === nick.trim().toLowerCase()) {
                    const timestamp = parseSheetDate(timestampStr);
                    if (timestamp && timestamp >= start && timestamp <= end) weekTotal += (professorCourseValues[courseName.trim()] || 0);
                }
            });
            const status = getProfessorStatus(weekTotal);
            historyHtml += renderHistoryCard(start, end, weekTotal, '%', status);
        }
        metasHistory.innerHTML = historyHtml;
    }).catch(err => { 
        console.error("Erro Histórico Prof:", err); 
        metasHistory.innerHTML = '<p class="text-red-400 text-center col-span-full text-[10px]">Erro ao carregar</p>'; 
    });
}

function fetchCoordinatorHistory(config, nick) {
    if (!metasHistory) return;
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/BACKUP!A:E?key=${config.apiKey}`;
    metasHistory.innerHTML = '<div class="col-span-full flex justify-center py-4"><i class="fas fa-spinner fa-spin text-slate-400 text-2xl"></i></div>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length === 0) { metasHistory.innerHTML = '<p class="col-span-full text-slate-500 text-[10px] text-center">Sem histórico.</p>'; return; }
        
        let historyHtml = '';
        for (let i = 0; i < 4; i++) {
            const { start, end } = getWeekDates(i);
            const deadline = new Date(start); deadline.setDate(start.getDate() + 3); deadline.setHours(23, 59, 59, 999);
            let weekTotal = 0, cartaEnviada = false;
            
            backupRows.forEach(row => {
                const [timestampStr, rowNick, , , activity] = row;
                if (timestampStr && rowNick && activity && rowNick.trim().toLowerCase() === nick.trim().toLowerCase()) {
                    const timestamp = parseSheetDate(timestampStr);
                    if (timestamp && timestamp >= start && timestamp <= end) {
                        if (activity === 'Envio da Carta de Auxílio' && timestamp <= deadline) cartaEnviada = true;
                        else {
                            if (activity.includes('Acompanhamento')) weekTotal += coordinatorCourseValues['Acompanhamento de aula'];
                            else if (activity.includes('Orientação')) weekTotal += coordinatorCourseValues['Orientação'];
                            else if (activity.includes('COP')) weekTotal += coordinatorCourseValues['Curso de Oratória Pública (COP)'];
                            else if (activity.includes('CDA')) weekTotal += coordinatorCourseValues['Curso de Desenvolvimento Argumentativo (CDA)'];
                        }
                    }
                }
            });
            const status = getCoordinatorStatus(weekTotal, cartaEnviada);
            historyHtml += renderHistoryCard(start, end, weekTotal, '%', status);
        }
        metasHistory.innerHTML = historyHtml;
    }).catch(err => { 
        console.error("Erro Histórico Coord:", err); 
        metasHistory.innerHTML = '<p class="text-red-400 text-center col-span-full text-[10px]">Erro ao carregar</p>'; 
    });
}

function fetchGraduatorHistory(config, nick) {
    if (!metasHistory) return;
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/'Graduações Passadas'!A:E?key=${config.apiKey}`;
    metasHistory.innerHTML = '<div class="col-span-full flex justify-center py-4"><i class="fas fa-spinner fa-spin text-slate-400 text-2xl"></i></div>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length <= 1) { metasHistory.innerHTML = '<p class="col-span-full text-slate-500 text-[10px] text-center">Sem histórico.</p>'; return; }
        
        let fortnightlyTotals = [];
        const periods = getFortnightPeriods(4); 
        
        periods.forEach(({start, end}) => {
            let fortnightTotal = 0;
            backupRows.slice(1).forEach(row => {
                const [timestampStr, rowNick, , , activity] = row;
                if (timestampStr && rowNick && activity && rowNick.trim().toLowerCase() === nick.trim().toLowerCase()) {
                    const timestamp = parseSheetDate(timestampStr);
                    if (timestamp && timestamp >= start && timestamp <= end && activity.includes('Graduação')) fortnightTotal++;
                }
            });
            fortnightlyTotals.push({ start, end, total: fortnightTotal, status: getGraduatorStatus(fortnightTotal) });
        });

        let historyHtml = '';
        fortnightlyTotals.forEach((fortnight, index) => {
            let finalStatus = fortnight.status;
            if (index === 0 && fortnight.total >= 2) {
                const maxGrads = Math.max(...fortnightlyTotals.map(f => f.total));
                if (fortnight.total === maxGrads) {
                    finalStatus = { class: 'status-melhor', message: '<i class="fas fa-star mr-1"></i> Destaque' };
                }
            }
            historyHtml += renderHistoryCard(fortnight.start, fortnight.end, fortnight.total, 'g', finalStatus);
        });
        metasHistory.innerHTML = historyHtml;
    }).catch(err => { 
        console.error("Erro Histórico Grad:", err); 
        metasHistory.innerHTML = '<p class="text-red-400 text-center col-span-full text-[10px]">Erro ao carregar</p>'; 
    });
}

async function fetchMetas(nick, cargo) {
    if (!metasCurrent) return;
    metasCurrent.innerHTML = '<div class="w-full flex justify-center"><i class="fas fa-spinner fa-spin text-slate-500 text-2xl"></i></div>';
    if (metasHistory) metasHistory.innerHTML = '';
    
    const config = apiConfigs[cargo];
    if (!config) {
        metasCurrent.innerHTML = '<p class="text-red-400 text-xs text-center">Configuração inválida.</p>';
        return;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}?key=${config.apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const rows = data.values || [];
        let found = false;
        
        if (rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                const userNick = rows[i][0];
                if (userNick && userNick.trim().toLowerCase() === nick.trim().toLowerCase()) {
                    found = true;
                    const numericValue = parseFloat((rows[i][config.valueIndex] || '0').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
                    
                    let status, rankLabel = '';
                    if (i < 3) rankLabel = `${i+1}º Lugar`;

                    if (cargo === 'graduador') status = i === 0 ? { class: 'status-melhor', message: 'Destaque' } : getGraduatorStatus(numericValue);
                    else if (cargo === 'coordenador') status = getCoordinatorStatus(numericValue, true);
                    else status = getProfessorStatus(numericValue);

                    let rawStatus = status.message.replace(/<[^>]*>?/gm, '').trim().toUpperCase();
                    let badgeColor = 'border-slate-500/30 text-slate-400 bg-slate-500/10';
                    if (status.class.includes('excelente') || status.class.includes('melhor')) badgeColor = 'border-amber-500/50 text-amber-400 bg-amber-500/10';
                    else if (status.class.includes('otimo')) badgeColor = 'border-blue-500/50 text-blue-400 bg-blue-500/10';
                    else if (status.class.includes('regular') && !status.class.includes('irregular')) badgeColor = 'border-green-500/50 text-green-400 bg-green-500/10';
                    else if (status.class.includes('irregular')) badgeColor = 'border-red-500/50 text-red-400 bg-red-500/10';

                    let unit = config.isPercentage ? '%' : (cargo === 'graduador' ? 'grads' : '');

                    metasCurrent.innerHTML = `
                        <div class="w-full flex flex-col items-center justify-center relative">
                            ${rankLabel ? `<div class="absolute -top-7 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-amber-300 uppercase"><i class="fas fa-trophy mr-1"></i>${rankLabel}</div>` : ''}
                            <div class="text-3xl font-black text-white drop-shadow-md">
                                ${numericValue}${unit ? `<span class="text-sm font-bold text-slate-500 ml-1">${unit}</span>` : ''}
                            </div>
                            <div class="mt-2 text-[9px] font-black uppercase tracking-widest border ${badgeColor} px-3 py-1 rounded">
                                ${rawStatus}
                            </div>
                        </div>
                    `;

                    if (cargo === 'professor') fetchProfessorHistory(config, nick);
                    if (cargo === 'coordenador') fetchCoordinatorHistory(config, nick);
                    if (cargo === 'graduador') fetchGraduatorHistory(config, nick);
                    break;
                }
            }
        }
        if (!found) {
            metasCurrent.innerHTML = `<div class="w-full text-center"><p class="text-slate-500 text-xs font-bold uppercase">Sem Registro</p></div>`;
            if (cargo === 'professor') fetchProfessorHistory(config, nick);
            if (cargo === 'coordenador') fetchCoordinatorHistory(config, nick);
            if (cargo === 'graduador') fetchGraduatorHistory(config, nick);
        }
    } catch (error) {
        console.error('Erro ao buscar metas:', error);
        metasCurrent.innerHTML = `<p class="text-red-400 text-xs text-center">Erro ao carregar meta atual.</p>`;
    }
}

// --- UI Logic Reset ---

function resetMainScreen() {
    if (initialMessage) initialMessage.classList.remove('hidden');
    if (evaluationCard) evaluationCard.classList.add('hidden');
    if (statusMessage) statusMessage.classList.add('hidden');
    [currentPromotionList, currentPromotionName, currentCargo] = [[], "", ""];
    currentIndex = 0;
    
    const placeholders = [memberDetailsPlaceholder, internalRankingPlaceholder, errorsWarningsPlaceholder, metasCurrent, metasHistory];
    placeholders.forEach(el => { if(el) el.innerHTML = ''; });
    
    document.querySelectorAll('.count-badge').forEach(span => { span.textContent = ''; span.classList.add('hidden'); });
    if (retrospectoToggleContainer) retrospectoToggleContainer.classList.add('hidden');
    const rs = document.getElementById('retrospecto-screen');
    if (rs) rs.classList.add('hidden');
}

function showStatusMessage(message, type = 'loading') {
    if (!statusMessage) return;
    statusMessage.innerHTML = `<i class="fas ${type === 'loading' ? 'fa-spinner fa-spin' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3 text-3xl"></i><span>${message}</span>`;
    statusMessage.classList.remove('hidden');
    if (initialMessage) initialMessage.classList.add('hidden');
    if (evaluationCard) evaluationCard.classList.add('hidden');
    const typeClasses = { loading: "glass-card bg-blue-900 bg-opacity-40 text-blue-200 border-blue-700", error: "glass-card bg-red-900 bg-opacity-40 text-red-200 border-red-700", info: "glass-card bg-gray-700 bg-opacity-60 text-gray-300 border-gray-600" };
    statusMessage.className = `mt-6 p-8 rounded-2xl text-xl flex items-center justify-center shadow-xl min-h-[200px] border ${typeClasses[type] || typeClasses.info}`;
}

// --- Navegação de Cards e Listas ---

async function loadPromotionList(range, buttonText, buttonEl) {
    resetMainScreen();
    showStatusMessage("Buscando dados na planilha...", 'loading');
    currentPromotionName = buttonText;
    currentCargo = buttonEl.getAttribute('data-cargo');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!${range}?key=${API_KEY_PROMOVIDOS}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
        const data = await response.json();
        currentPromotionList = (data.values || []).flat().map(nick => nick.trim()).filter(Boolean);
        if (currentPromotionList.length === 0) {
            showStatusMessage(`Nenhum nick encontrado na lista de "${currentPromotionName}".`, 'info');
            return;
        }
        const countSpan = buttonEl.querySelector('.count-badge');
        if (countSpan) { countSpan.textContent = currentPromotionList.length; countSpan.classList.remove('hidden'); }
        currentIndex = 0;
        await displayCurrentCard();
        if (statusMessage) statusMessage.classList.add('hidden');
        if (evaluationCard) evaluationCard.classList.remove('hidden');
        if (retrospectoToggleContainer) retrospectoToggleContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        showStatusMessage(`Erro ao conectar com a planilha. (Detalhe: ${error.message})`, 'error');
    }
}

async function displayCurrentCard() {
    if (currentPromotionList.length === 0) return;
    const nick = currentPromotionList[currentIndex];
    if (displayNickAvaliado) displayNickAvaliado.textContent = nick;
    if (cardCounter) cardCounter.textContent = `${currentIndex + 1} / ${currentPromotionList.length}`;
    if (prevButton) prevButton.disabled = (currentIndex === 0);
    
    if (nextButton) {
        if (currentIndex === currentPromotionList.length - 1) {
            nextButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Enviar';
            nextButton.disabled = false;
        } else {
            nextButton.innerHTML = 'Próximo<i class="fas fa-chevron-right ml-2"></i>';
            nextButton.disabled = false;
        }
    }
    
    const saved = avaliacoes[currentCargo][nick];
    if (saved) {
        if (dissertacaoText) dissertacaoText.value = saved.dissertacao || '';
        const radioToCheck = saved.veredito ? document.querySelector(`input[name="veredito"][value="${saved.veredito}"]`) : null;
        if (radioToCheck) {
            radioToCheck.checked = true;
        } else {
            document.querySelectorAll('input[name="veredito"]').forEach(radio => radio.checked = false);
        }
    } else {
        if (dissertacaoText) dissertacaoText.value = '';
        document.querySelectorAll('input[name="veredito"]').forEach(radio => radio.checked = false);
    }

    const consultaLink = document.getElementById('consulta-link');
    const consultaLinks = {
        professor: 'https://docs.google.com/spreadsheets/d/1EQ2_6q0lrA4XIQQhaeJNmp9esYItkN6GKlIou9TkEZo/edit?usp=drive_link',
        coordenador: 'https://docs.google.com/spreadsheets/d/1n3mMltgY0AmDCeO1vRDaYuz-jLaZ--4hO5f9UnTdtEw/edit?usp=drive_link',
        graduador: 'https://docs.google.com/spreadsheets/d/1-jR5kLgKHPJuRsXl3PBnz3sbi4mkDeRiQ9rWmmp8uAk/edit?usp=drive_link'
    };
    if (consultaLink && currentCargo && consultaLinks[currentCargo]) {
        consultaLink.href = consultaLinks[currentCargo];
    }

    if (nick && currentCargo) {
        fetchMemberDetails(nick, currentCargo);
        fetchInternalRanking(nick);
        fetchPropostas(nick);
        fetchErrorsAndWarnings(nick);
        fetchMetas(nick, currentCargo);
    } else {
        [memberDetailsPlaceholder, internalRankingPlaceholder, propostasPlaceholder, errorsWarningsPlaceholder, metasCurrent, metasHistory].forEach(el => {
            if(el) el.innerHTML = '<p class="text-yellow-400 text-center">Nick ou cargo não definidos.</p>';
        });
    }
}

function checkIfEvaluated() {
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = dissertacaoText ? dissertacaoText.value.trim() : '';
    const nick = currentPromotionList[currentIndex];
    
    if (veredito && dissertacao && nick && currentCargo) {
        if (!evaluatedNicks[currentCargo].has(nick)) {
            evaluatedNicks[currentCargo].add(nick);
            if (veredito.value === 'Promovido') {
                promotedCount[currentCargo]++;
            }
            updateBadgeCounts();
        }
    }
}

async function nextCard() {
    await saveCurrentEvaluation();
    checkIfEvaluated();
    if (currentIndex < currentPromotionList.length - 1) { 
         currentIndex++; 
         await displayCurrentCard(); 
     }
}

async function prevCard() {
    await saveCurrentEvaluation();
    checkIfEvaluated();
    if (currentIndex > 0) { 
         currentIndex--; 
         await displayCurrentCard(); 
     }
}

// Listeners para salvar automaticamente
document.querySelectorAll('input[name="veredito"]').forEach(radio => {
    radio.addEventListener('change', async () => {
        await saveCurrentEvaluation();
        checkIfEvaluated();
    });
});

let dissertacaoTimeout;
if (dissertacaoText) {
    dissertacaoText.addEventListener('input', () => {
        clearTimeout(dissertacaoTimeout);
        dissertacaoTimeout = setTimeout(async () => {
            await saveCurrentEvaluation();
            checkIfEvaluated();
        }, 1000);
    });
}

function updateBadgeCounts() {
    const buttons = document.querySelectorAll('#promo-buttons button');
    buttons.forEach(button => {
        const cargo = button.getAttribute('data-cargo');
        const countSpan = button.querySelector('.count-badge');
        const vagasInfo = button.querySelector('.vagas-info');
        const vagasText = button.querySelector('.vagas-text');
        
        if (countSpan && preloadedData[cargo]) {
            const total = preloadedData[cargo].nicks.length;
            const evaluated = evaluatedNicks[cargo].size;
            const remaining = total - evaluated;
            const vagas = preloadedData[cargo].vagas;
            const promovidos = promotedCount[cargo];
            const vagasRestantes = Math.max(0, vagas - promovidos);
            
            if (total === 0) {
                button.disabled = true;
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
                countSpan.textContent = '0';
                countSpan.classList.remove('hidden');
                if(vagasInfo) vagasInfo.classList.add('hidden');
            } else {
                button.disabled = false;
                button.classList.add('btn-primary');
                button.classList.remove('btn-secondary');
                countSpan.textContent = remaining;
                countSpan.classList.remove('hidden');
                
                if (vagas > 0 && vagasInfo && vagasText) {
                    vagasText.textContent = `${vagasRestantes} vaga${vagasRestantes !== 1 ? 's' : ''} disponível${vagasRestantes !== 1 ? 'eis' : ''}`;
                    vagasInfo.classList.remove('hidden');
                    if (vagasRestantes === 0) {
                        button.classList.add('vagas-esgotadas');
                    } else {
                        button.classList.remove('vagas-esgotadas');
                    }
                }
            }
        }
    });
}

// --- SISTEMA DE RETROSPECTO ---
async function showRetrospecto() {
    const retrospectoContent = document.getElementById('retrospecto-content');
    const retrospectoScreen = document.getElementById('retrospecto-screen');
    const toggleBtn = document.getElementById('toggle-retrospecto-btn');
    
    if (evaluationCard) evaluationCard.classList.add('hidden');
    if (retrospectoScreen) retrospectoScreen.classList.remove('hidden');
    if (retrospectoContent) {
        retrospectoContent.innerHTML = `
            <div class="text-center p-12 text-gray-400">
                <i class="fas fa-spinner fa-spin text-6xl mb-4 text-blue-400"></i>
                <p class="text-xl">Carregando avaliações...</p>
            </div>
        `;
    }
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-arrow-left mr-2"></i><span>Voltar para Avaliação</span>';
    
    await saveCurrentEvaluation();
    await loadEvaluationsFromFirestore(); 
    
    const avaliados = avaliacoes[currentCargo];
    const avaliadosArray = [];
    const pendentesArray = [];
    
    currentPromotionList.forEach(nick => {
        if (avaliados[nick] && (avaliados[nick].veredito || avaliados[nick].dissertacao)) {
            avaliadosArray.push(nick);
        } else {
            pendentesArray.push(nick);
        }
    });
    
    let html = '';
    html += `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-900 bg-opacity-30 p-4 rounded-lg border border-blue-700 text-center">
                <i class="fas fa-users text-3xl text-blue-400 mb-2"></i><p class="text-sm text-blue-300 mb-1">Total</p><p class="text-3xl font-bold text-white">${currentPromotionList.length}</p>
            </div>
            <div class="bg-green-900 bg-opacity-30 p-4 rounded-lg border border-green-700 text-center">
                <i class="fas fa-check-circle text-3xl text-green-400 mb-2"></i><p class="text-sm text-green-300 mb-1">Avaliados</p><p class="text-3xl font-bold text-white">${avaliadosArray.length}</p>
            </div>
            <div class="bg-yellow-900 bg-opacity-30 p-4 rounded-lg border border-yellow-700 text-center">
                <i class="fas fa-clock text-3xl text-yellow-400 mb-2"></i><p class="text-sm text-yellow-300 mb-1">Pendentes</p><p class="text-3xl font-bold text-white">${pendentesArray.length}</p>
            </div>
        </div>
    `;
    
    if (avaliadosArray.length > 0) {
        html += `<div class="mb-8"><h3 class="text-2xl font-bold mb-4 text-green-300 flex items-center border-b border-green-700 pb-3"><i class="fas fa-check-circle mr-3"></i>Avaliados (${avaliadosArray.length})</h3><div class="space-y-4">`;
        avaliadosArray.forEach(nick => {
            const { veredito, dissertacao } = avaliados[nick];
            const vereditoClass = veredito === 'Promovido' ? 'bg-green-900 bg-opacity-30 border-green-500' : veredito === 'Mantém' ? 'bg-orange-900 bg-opacity-30 border-orange-500' : 'bg-gray-900 bg-opacity-30 border-gray-500';
            const vereditoIcon = veredito === 'Promovido' ? 'fa-arrow-circle-up text-green-400' : veredito === 'Mantém' ? 'fa-minus-circle text-orange-400' : 'fa-question-circle text-gray-400';
            const vereditoDisplay = veredito || '(Sem veredito)';
            
            html += `<div class="glass-card p-6 rounded-xl border ${vereditoClass} hover:shadow-xl transition"><div class="flex justify-between items-start mb-4"><div><h3 class="text-2xl font-bold text-white mb-2"><i class="fas fa-user mr-2 text-blue-400"></i>${nick}</h3><div class="flex items-center gap-2"><i class="fas ${vereditoIcon} text-xl"></i><span class="text-lg font-semibold ${veredito === 'Promovido' ? 'text-green-300' : veredito === 'Mantém' ? 'text-orange-300' : 'text-gray-400'}">${vereditoDisplay}</span></div></div><button class="edit-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition" data-nick="${nick}"><i class="fas fa-edit mr-2"></i>Editar</button></div><div class="bg-gray-900 bg-opacity-50 p-4 rounded-lg"><p class="text-sm text-gray-400 mb-2"><i class="fas fa-pen-fancy mr-2"></i>Dissertação:</p><p class="text-gray-200 leading-relaxed">${dissertacao || '(Sem dissertação)'}</p></div></div>`;
        });
        html += `</div></div>`;
    }
    
    if (pendentesArray.length > 0) {
        html += `<div><h3 class="text-2xl font-bold mb-4 text-yellow-300 flex items-center border-b border-yellow-700 pb-3"><i class="fas fa-clock mr-3"></i>Pendentes (${pendentesArray.length})</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
        pendentesArray.forEach(nick => {
            html += `<div class="glass-card p-4 rounded-xl border border-yellow-700 bg-yellow-900 bg-opacity-20 hover:shadow-xl transition cursor-pointer" data-nick="${nick}"><div class="flex items-center justify-between mb-2"><h3 class="text-lg font-bold text-white"><i class="fas fa-user mr-2 text-yellow-400"></i>${nick}</h3></div><div class="flex items-center gap-2 text-yellow-300"><i class="fas fa-exclamation-triangle text-sm"></i><span class="text-sm font-semibold">Aguardando Avaliação</span></div><button class="avaliar-btn mt-3 w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition text-white font-semibold text-sm" data-nick="${nick}"><i class="fas fa-edit mr-2"></i>Avaliar Agora</button></div>`;
        });
        html += `</div></div>`;
    }
    
    if (retrospectoContent) retrospectoContent.innerHTML = html;
    
    document.querySelectorAll('.edit-btn, .avaliar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nickToEdit = btn.getAttribute('data-nick');
            editEvaluation(nickToEdit);
        });
    });
}

function hideRetrospecto() {
    const retrospectoScreen = document.getElementById('retrospecto-screen');
    const toggleBtn = document.getElementById('toggle-retrospecto-btn');
    if (retrospectoScreen) retrospectoScreen.classList.add('hidden');
    if (evaluationCard) evaluationCard.classList.remove('hidden');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-list-check mr-2"></i><span>Ver Retrospecto</span>';
}

function editEvaluation(nick) {
    const index = currentPromotionList.indexOf(nick);
    if (index !== -1) {
        currentIndex = index;
        hideRetrospecto();
        displayCurrentCard();
    }
}

function toggleRetrospecto() {
    const retrospectoScreen = document.getElementById('retrospecto-screen');
    if (retrospectoScreen && retrospectoScreen.classList.contains('hidden')) {
        showRetrospecto();
    } else {
        hideRetrospecto();
    }
}

// --- Event Listeners Básicos ---
promoButtons.forEach(button => {
    button.addEventListener('click', () => {
        const range = button.getAttribute('data-range');
        const span = button.querySelector('span:first-child');
        const buttonText = span ? span.textContent.trim() : 'Lista';
        loadPromotionList(range, buttonText, button);
    });
});
if (nextButton) nextButton.addEventListener('click', nextCard);
if (prevButton) prevButton.addEventListener('click', prevCard);
if (toggleRetrospectoBtn) toggleRetrospectoBtn.addEventListener('click', toggleRetrospecto);
