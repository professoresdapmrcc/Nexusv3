// Removemos os imports da V10 pois estamos usando a V8 do HTML e do global.js
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
        
        if(choiceScreen) choiceScreen.classList.add('hidden');
        preloadScreen.classList.remove('hidden');
        loadingStatus.textContent = `Bem-vindo, ${avaliadorNick}. Buscando suas permissões...`;
        
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

        displayAvaliadorNick.textContent = `${avaliadorNick}`;

        await preloadSystem(); 
        await loadEvaluationsFromFirestore(); 
        
        preloadScreen.classList.add('hidden');
        mainAppScreen.classList.remove('hidden');

    } else {
        console.log("Usuário não logado.");
        avaliadorNick = "";
        avaliadorCargo = "";
        mainAppScreen.classList.add('hidden');
        preloadScreen.classList.add('hidden');
        if(choiceScreen) choiceScreen.classList.remove('hidden'); 
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

// --- LEITURA E ESCRITA NO FIRESTORE (AVALIAÇÕES) Padrão V8 ---

async function saveCurrentEvaluation() {
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = dissertacaoText.value.trim();
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
        loadingStatus.textContent = 'Carregando Professores...';
        progressBar.style.width = '20%';
        const profUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!B9:B30?key=${API_KEY_PROMOVIDOS}`;
        const profResponse = await fetch(profUrl);
        if (profResponse.ok) {
            const profData = await profResponse.json();
            preloadedData.professor.nicks = (profData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        loadingStatus.textContent = 'Carregando Coordenadores...';
        progressBar.style.width = '40%';
        const coordUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!C9:C30?key=${API_KEY_PROMOVIDOS}`;
        const coordResponse = await fetch(coordUrl);
        if (coordResponse.ok) {
            const coordData = await coordResponse.json();
            preloadedData.coordenador.nicks = (coordData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        loadingStatus.textContent = 'Carregando Graduadores...';
        progressBar.style.width = '60%';
        const gradUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!D9:D30?key=${API_KEY_PROMOVIDOS}`;
        const gradResponse = await fetch(gradUrl);
        if (gradResponse.ok) {
            const gradData = await gradResponse.json();
            preloadedData.graduador.nicks = (gradData.values || []).flat().map(n => n.trim()).filter(Boolean);
        }
        
        loadingStatus.textContent = 'Carregando Vagas Disponíveis...';
        progressBar.style.width = '80%';
        const vagasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_PROMOVIDOS}/values/'${SHEET_NAME_PROMOVIDOS}'!B8:D8?key=${API_KEY_PROMOVIDOS}`;
        const vagasResponse = await fetch(vagasUrl);
        if (vagasResponse.ok) {
            const vagasData = await vagasResponse.json();
            const vagasRow = vagasData.values ? vagasData.values[0] : [];
            preloadedData.professor.vagas = parseInt(vagasRow[0]) || 0;
            preloadedData.coordenador.vagas = parseInt(vagasRow[1]) || 0;
            preloadedData.graduador.vagas = parseInt(vagasRow[2]) || 0;
        }
        
        loadingStatus.textContent = 'Finalizando...';
        progressBar.style.width = '100%';
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateBadgeCounts();
        
        preloadScreen.classList.add('hidden');
        mainAppScreen.classList.remove('hidden');
        resetMainScreen();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadingStatus.textContent = 'Erro ao carregar. Tentando novamente...';
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

function getFortnightPeriods(count = 4) {
    const periods = [];
    let today = new Date();
    let periodEnd;
    if (today.getDate() > 15) {
        periodEnd = new Date(today.getFullYear(), today.getMonth(), 15, 23, 59, 59, 999);
    } else {
        periodEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    }
    for (let i = 0; i < count; i++) {
        let start;
        if (periodEnd.getDate() > 15 || periodEnd.getDate() < 1) { 
             start = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 16);
        } else {
            start = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
        }
        periods.push({ start: start, end: new Date(periodEnd.getTime()) });
        periodEnd = new Date(start.getTime() - 1);
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

// --- Funções de Busca de Dados ---

async function fetchErrorsAndWarnings(nick) {
    errorsWarningsPlaceholder.innerHTML = '<p class="text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando erros e advertências...</p>';
    const range = `'${SHEET_NAME_ERRORS_WARNINGS}'!C5:J200`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_ERRORS_WARNINGS}/values/${range}?key=${API_KEY_ERRORS_WARNINGS}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const rows = data.values || [];
        const foundRecords = rows.filter(r => r[0] && r[0].trim().toLowerCase() === nick.trim().toLowerCase());
        let html = '<h3 class="text-2xl font-bold mb-5 text-yellow-400 flex items-center"><i class="fas fa-exclamation-circle mr-3"></i>Erros & Advertências</h3>';
        if (foundRecords.length > 0) {
            html += '<ul class="space-y-3">';
            foundRecords.forEach(record => {
                const type = record[1] || 'N/A', reason = record[2] || 'N/A', start = record[5] || 'N/A', end = record[7] || 'N/A';
                html += `<li><p class="font-bold text-red-300 text-lg mb-1"><i class="fas fa-times-circle mr-2"></i>${type.toUpperCase()}</p><p class="mb-1"><strong>Motivo:</strong> ${reason}</p><p class="text-sm text-gray-400"><i class="far fa-calendar mr-2"></i><strong>Período:</strong> ${start} a ${end}</p></li>`;
            });
            html += '</ul>';
        } else {
            html += `<p class="text-green-400 text-lg"><i class="fas fa-check-circle mr-2"></i>Nenhum erro ou advertência encontrado.</p>`;
        }
        errorsWarningsPlaceholder.innerHTML = html;
    } catch (error) {
        console.error('Erro ao buscar erros e advertências:', error);
        errorsWarningsPlaceholder.innerHTML = `<p class="text-red-400">Erro ao buscar dados de erros. (${error.message})</p>`;
    }
}

async function fetchInternalRanking(nick) {
    internalRankingPlaceholder.innerHTML = '<p class="text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando no Ranking Interno...</p>';
    const range = `'${SHEET_NAME_RANKING_INTERNO}'!I6:K18`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_RANKING_INTERNO}/values/${range}?key=${API_KEY_RANKING_INTERNO}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const row = (data.values || []).find(r => r[1] && r[1].trim().toLowerCase() === nick.trim().toLowerCase());
        if (row) {
            internalRankingPlaceholder.innerHTML = `<div class="text-xl bg-purple-900 bg-opacity-30 p-4 rounded-lg border border-purple-700"><p><i class="fas fa-trophy mr-2 text-yellow-400"></i><strong class="font-bold text-white">${row[0]}º</strong> com <strong class="font-bold text-white">${row[2]}</strong> pontos.</p></div>`;
        } else {
            internalRankingPlaceholder.innerHTML = `<p class="text-yellow-400 text-lg"><i class="fas fa-info-circle mr-2"></i>Membro não localizado no Ranking Interno.</p>`;
        }
    } catch (error) {
        console.error('Erro ao buscar ranking interno:', error);
        internalRankingPlaceholder.innerHTML = `<p class="text-red-400">Erro ao buscar dados do Ranking. (${error.message})</p>`;
    }
}

async function fetchPropostas(nick) {
    propostasPlaceholder.innerHTML = '<p class="text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando propostas aprovadas...</p>';
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
        const total = propostasCount['Projeto'] + propostasCount['Sugestão'] + propostasCount['Correção'];
        if (total === 0) {
            propostasPlaceholder.innerHTML = `<p class="text-yellow-400 text-lg"><i class="fas fa-info-circle mr-2"></i>Nenhuma proposta aprovada encontrada.</p>`;
        } else {
            let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
            html += `<div class="bg-blue-900 bg-opacity-30 p-4 rounded-lg border border-blue-700 text-center"><i class="fas fa-project-diagram text-3xl text-blue-400 mb-2"></i><p class="text-sm text-blue-300 mb-1">Projetos</p><p class="text-3xl font-bold text-white">${propostasCount['Projeto']}</p></div>`;
            html += `<div class="bg-green-900 bg-opacity-30 p-4 rounded-lg border border-green-700 text-center"><i class="fas fa-comment-dots text-3xl text-green-400 mb-2"></i><p class="text-sm text-green-300 mb-1">Sugestões</p><p class="text-3xl font-bold text-white">${propostasCount['Sugestão']}</p></div>`;
            html += `<div class="bg-purple-900 bg-opacity-30 p-4 rounded-lg border border-purple-700 text-center"><i class="fas fa-check-circle text-3xl text-purple-400 mb-2"></i><p class="text-sm text-purple-300 mb-1">Correções</p><p class="text-3xl font-bold text-white">${propostasCount['Correção']}</p></div>`;
            html += '</div>';
            html += `<div class="mt-4 p-4 rounded-lg bg-gradient-to-r from-pink-900 to-purple-900 bg-opacity-40 border-2 border-pink-500 text-center"><p class="text-sm text-pink-200 mb-1"><i class="fas fa-lightbulb mr-2"></i>Total de Propostas Aprovadas</p><p class="text-4xl font-bold text-white">${total}</p></div>`;
            propostasPlaceholder.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao buscar propostas:', error);
        propostasPlaceholder.innerHTML = `<p class="text-red-400">Erro ao buscar propostas. (${error.message})</p>`;
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
    memberDetailsPlaceholder.innerHTML = '<p class="text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando detalhes do membro...</p>';
    const range = `'${SHEET_NAME_GERADOR}'!C4:I193`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID_GERADOR}/values/${range}?key=${API_KEY_GERADOR}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
        const data = await response.json();
        const row = (data.values || []).find(r => r[0] && r[0].trim().toLowerCase() === nick.trim().toLowerCase());
        if (!row) {
            memberDetailsPlaceholder.innerHTML = '<p class="text-center text-yellow-400 text-lg"><i class="fas fa-user-slash mr-2"></i>Nick não encontrado no Gerador.</p>';
            return;
        }
        const [entryDate, promoDate, , licenseStart, , licenseReturn] = [row[1], row[2], row[3], row[4], row[5], row[6]];
        const subgrupoInfo = await fetchSubgrupo(nick);
        let html = '';
        const licenseInfo = checkLicenseStatus(licenseStart, licenseReturn);
        if (licenseInfo.onLeave) {
            html += `<div class="p-4 mb-6 rounded-xl bg-red-900 bg-opacity-40 border-2 border-red-500 text-center text-red-100 shadow-xl"><i class="fas fa-exclamation-triangle mr-2 text-2xl"></i><strong class="text-xl">EM LICENÇA</strong><br><span class="text-sm">Retorno: ${licenseInfo.returnDate || 'N/A'}</span></div>`;
        }
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        const entryDays = calculateDaysSince(entryDate);
        if (entryDate) {
            html += `<div class="bg-cyan-900 bg-opacity-30 p-4 rounded-lg border border-cyan-700"><p class="text-sm text-cyan-300 mb-2"><i class="fas fa-door-open mr-2"></i>Data de Entrada</p><p class="text-lg font-bold text-white">${entryDate}</p>${entryDays !== null ? `<p class="text-sm text-gray-400 mt-1"><i class="far fa-clock mr-1"></i>${entryDays} dias atrás</p>` : ''}</div>`;
        } else {
            html += `<div class="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700"><p class="text-sm text-gray-400 mb-2"><i class="fas fa-door-open mr-2"></i>Data de Entrada</p><p class="text-yellow-400">Não informada</p></div>`;
        }
        const promoDays = calculateDaysSince(promoDate);
        if (promoDate) {
            html += `<div class="bg-blue-900 bg-opacity-30 p-4 rounded-lg border border-blue-700"><p class="text-sm text-blue-300 mb-2"><i class="fas fa-arrow-up mr-2"></i>Última Promo/Rebaix</p><p class="text-lg font-bold text-white">${promoDate}</p>${promoDays !== null ? `<p class="text-sm text-gray-400 mt-1"><i class="far fa-clock mr-1"></i>${promoDays} dias atrás</p>` : ''}</div>`;
        } else {
            html += `<div class="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700"><p class="text-sm text-gray-400 mb-2"><i class="fas fa-arrow-up mr-2"></i>Última Promo/Rebaix</p><p class="text-yellow-400">Não informada</p></div>`;
        }
        html += '</div>';
        const relevantDate = cargo === 'professor' ? entryDate : promoDate;
        const days = calculateDaysSince(relevantDate);
        const label = cargo === 'professor' ? 'entrada na companhia' : 'última promo/rebaixamento';
        if (days !== null) {
            html += `<div class="mt-6 p-5 rounded-xl bg-gradient-to-r from-blue-900 to-purple-900 bg-opacity-40 border-2 border-blue-500 text-center"><p class="text-sm text-blue-200 mb-2"><i class="fas fa-hourglass-half mr-2"></i>Tempo no Cargo Atual</p><p class="text-3xl font-bold text-white mb-1">${days} dias</p><p class="text-sm text-gray-300">desde a ${label}</p></div>`;
        }
        html += '<div class="mt-6"><h4 class="text-lg font-bold text-gray-300 mb-3"><i class="fas fa-building mr-2"></i>Subgrupos</h4><div class="grid grid-cols-1 md:grid-cols-3 gap-3">';
        for (const [key, config] of Object.entries(SUBGRUPOS_CONFIG)) {
            const subgrupoAtivo = subgrupoInfo.find(sg => sg.key === key);
            const isActive = !!subgrupoAtivo;
            const baseClasses = 'p-4 rounded-lg border-2 text-center transition-all duration-300';
            const activeClasses = isActive ? `bg-gradient-to-br ${config.color} bg-opacity-40 ${config.borderColor} shadow-lg scale-105` : 'bg-gray-800 bg-opacity-30 border-gray-600 opacity-50';
            html += `<div class="${baseClasses} ${activeClasses}"><div class="flex flex-col items-center"><img src="${config.logo}" alt="${config.sigla}" class="w-12 h-12 mb-2 object-contain ${isActive ? '' : 'grayscale opacity-50'}"><p class="font-bold text-sm ${isActive ? 'text-white' : 'text-gray-500'}">${config.sigla}</p>${isActive ? `<p class="text-xs text-gray-300 mt-1">${subgrupoAtivo.cargo}</p>` : ''}</div></div>`;
        }
        html += '</div></div>';
        memberDetailsPlaceholder.innerHTML = html;
    } catch(error) {
        console.error('Erro ao buscar detalhes do Gerador:', error);
        memberDetailsPlaceholder.innerHTML = `<p class="text-center text-red-400">Erro ao buscar detalhes do Gerador. (${error.message})</p>`;
    }
}

function fetchProfessorHistory(config, nick) {
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/BACKUP!A:F?key=${config.apiKey}`;
    metasHistory.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando histórico...</p>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length <= 1) { metasHistory.innerHTML = ''; return; }
        let weeklyTotals = [];
        for (let i = 1; i <= 4; i++) {
            const { start, end } = getWeekDates(i);
            let weekTotal = 0;
            backupRows.slice(1).forEach(row => {
                const [timestampStr, rowNick, , , , courseName] = row;
                if (timestampStr && rowNick && courseName && rowNick.trim().toLowerCase() === nick.trim().toLowerCase()) {
                    const timestamp = parseSheetDate(timestampStr);
                    if (timestamp && timestamp >= start && timestamp <= end) weekTotal += (professorCourseValues[courseName.trim()] || 0);
                }
            });
            weeklyTotals.push({ period: `${formatDateForDisplay(start)} a ${formatDateForDisplay(end)}`, total: weekTotal, status: getProfessorStatus(weekTotal) });
        }
        let historyHtml = '<hr><h3 class="result-title"><i class="fas fa-history mr-2"></i>Histórico Semanal</h3><ul>';
        weeklyTotals.forEach(week => {
            historyHtml += `<li><span><i class="far fa-calendar-alt mr-2 text-gray-400"></i><strong>${week.period}:</strong><span class="history-total">${week.total}%</span></span><span class="status-message ${week.status.class}">${week.status.message}</span></li>`;
        });
        metasHistory.innerHTML = historyHtml + '</ul>';
    }).catch(err => { console.error("Erro Histórico Prof:", err); metasHistory.innerHTML = '<p class="text-red-400 text-center">Erro ao carregar histórico de Professor.</p>'; });
}

function fetchCoordinatorHistory(config, nick) {
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/BACKUP!A:E?key=${config.apiKey}`;
    metasHistory.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando histórico...</p>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length === 0) { metasHistory.innerHTML = ''; return; }
        let weeklyTotals = [];
        for (let i = 1; i <= 4; i++) {
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
            weeklyTotals.push({ period: `${formatDateForDisplay(start)} a ${formatDateForDisplay(end)}`, total: weekTotal, status: getCoordinatorStatus(weekTotal, cartaEnviada) });
        }
        let historyHtml = '<hr><h3 class="result-title"><i class="fas fa-history mr-2"></i>Histórico Semanal</h3><ul>';
        weeklyTotals.forEach(week => {
            historyHtml += `<li><span><i class="far fa-calendar-alt mr-2 text-gray-400"></i><strong>${week.period}:</strong><span class="history-total">${week.total}%</span></span><span class="status-message ${week.status.class}">${week.status.message}</span></li>`;
        });
        metasHistory.innerHTML = historyHtml + '</ul>';
    }).catch(err => { console.error("Erro Histórico Coord:", err); metasHistory.innerHTML = '<p class="text-red-400 text-center">Erro ao carregar histórico de Coordenador.</p>'; });
}

function fetchGraduatorHistory(config, nick) {
    const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/'Graduações Passadas'!A:E?key=${config.apiKey}`;
    metasHistory.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando histórico...</p>';

    fetch(backupUrl).then(res => res.json()).then(data => {
        const backupRows = data.values || [];
        if (backupRows.length <= 1) { metasHistory.innerHTML = ''; return; }
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
            const status = getGraduatorStatus(fortnightTotal);
            fortnightlyTotals.push({ period: `${formatDateForDisplay(start)} a ${formatDateForDisplay(end)}`, total: fortnightTotal, status: status });
        });
        let historyHtml = '<hr><h3 class="result-title"><i class="fas fa-history mr-2"></i>Histórico Quinzenal</h3><ul>';
        fortnightlyTotals.forEach(fortnight => {
            let finalStatus = fortnight.status;
            if (fortnightlyTotals.indexOf(fortnight) === 0 && fortnight.total >= 2) {
                const maxGrads = Math.max(...fortnightlyTotals.map(f => f.total));
                if (fortnight.total === maxGrads) {
                    finalStatus = { class: 'status-melhor', message: '<i class="fas fa-star"></i> Melhor Destaque' };
                }
            }
            historyHtml += `<li><span><i class="far fa-calendar-alt mr-2 text-gray-400"></i><strong>${fortnight.period}:</strong><span class="history-total">${fortnight.total} Graduações</span></span><span class="status-message ${finalStatus.class}">${finalStatus.message}</span></li>`;
        });
        metasHistory.innerHTML = historyHtml + '</ul>';
    }).catch(err => { console.error("Erro Histórico Grad:", err); metasHistory.innerHTML = '<p class="text-red-400 text-center">Erro ao carregar histórico de Graduador.</p>'; });
}

async function fetchMetas(nick, cargo) {
    metasCurrent.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando meta atual...</p>';
    metasHistory.innerHTML = '';
    const config = apiConfigs[cargo];
    if (!config) {
        metasCurrent.innerHTML = '<p class="text-red-400 text-center">Configuração de cargo inválida.</p>';
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
                    const valueStr = rows[i][config.valueIndex] || '0';
                    const numericValue = parseFloat(valueStr.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
                    let status, rankIcon = '';
                    if (i < 3) rankIcon = `<div class="rank-icon rank-${i+1}"><i class="fas fa-trophy"></i> ${i+1}º Lugar</div>`;

                    if (cargo === 'graduador') status = i === 0 ? { class: 'status-melhor', message: '<i class="fas fa-star"></i> Melhor Destaque' } : getGraduatorStatus(numericValue);
                    else if (cargo === 'coordenador') status = getCoordinatorStatus(numericValue, true);
                    else status = getProfessorStatus(numericValue);

                    const resultLabel = config.isPercentage ? "Meta Atual" : "Total";
                    const resultValue = config.isPercentage ? `${numericValue.toFixed(2).replace('.',',')}%` : numericValue;
                    metasCurrent.innerHTML = `${rankIcon}<div class="result-title">Resultado Atual</div><div class="result-details"><p><strong>${resultLabel}:</strong> ${resultValue}</p></div><div class="status-message ${status.class}">${status.message}</div>`;

                    if (cargo === 'professor') fetchProfessorHistory(config, nick);
                    if (cargo === 'coordenador') fetchCoordinatorHistory(config, nick);
                    if (cargo === 'graduador') fetchGraduatorHistory(config, nick);
                    break;
                }
            }
        }
        if (!found) {
            metasCurrent.innerHTML = `<div class="status-message status-not-found"><i class="fas fa-info-circle"></i> ${nick} não possui meta na semana/quinzena atual.</div>`;
            if (cargo === 'professor') fetchProfessorHistory(config, nick);
            if (cargo === 'coordenador') fetchCoordinatorHistory(config, nick);
            if (cargo === 'graduador') fetchGraduatorHistory(config, nick);
        }
    } catch (error) {
        console.error('Erro ao buscar metas:', error);
        metasCurrent.innerHTML = `<p class="text-red-400 text-center">Erro ao carregar meta atual. (${error.message})</p>`;
    }
}

// --- UI Logic Reset ---
function resetMainScreen() {
    initialMessage.classList.remove('hidden');
    evaluationCard.classList.add('hidden');
    statusMessage.classList.add('hidden');
    [currentPromotionList, currentPromotionName, currentCargo] = [[], "", ""];
    currentIndex = 0;
    [memberDetailsPlaceholder, internalRankingPlaceholder, errorsWarningsPlaceholder, metasCurrent, metasHistory].forEach(el => el.innerHTML = '');
    document.querySelectorAll('.count-badge').forEach(span => { span.textContent = ''; span.classList.add('hidden'); });
    retrospectoToggleContainer.classList.add('hidden');
    document.getElementById('retrospecto-screen').classList.add('hidden');
}

function showStatusMessage(message, type = 'loading') {
    statusMessage.innerHTML = `<i class="fas ${type === 'loading' ? 'fa-spinner fa-spin' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3 text-3xl"></i><span>${message}</span>`;
    statusMessage.classList.remove('hidden');
    initialMessage.classList.add('hidden');
    evaluationCard.classList.add('hidden');
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
        displayCurrentCard();
        statusMessage.classList.add('hidden');
        evaluationCard.classList.remove('hidden');
        retrospectoToggleContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        showStatusMessage(`Erro ao conectar com a planilha. (Detalhe: ${error.message})`, 'error');
    }
}

async function displayCurrentCard() {
    if (currentPromotionList.length === 0) return;
    const nick = currentPromotionList[currentIndex];
    displayNickAvaliado.textContent = nick;
    cardCounter.textContent = `${currentIndex + 1} / ${currentPromotionList.length}`;
    prevButton.disabled = (currentIndex === 0);
    
    if (currentIndex === currentPromotionList.length - 1) {
        nextButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Enviar';
        nextButton.disabled = false;
    } else {
        nextButton.innerHTML = 'Próximo<i class="fas fa-chevron-right ml-2"></i>';
        nextButton.disabled = false;
    }
    
    const saved = avaliacoes[currentCargo][nick];
    if (saved) {
        dissertacaoText.value = saved.dissertacao || '';
        const radioToCheck = saved.veredito ? document.querySelector(`input[name="veredito"][value="${saved.veredito}"]`) : null;
        if (radioToCheck) {
            radioToCheck.checked = true;
        } else {
            document.querySelectorAll('input[name="veredito"]').forEach(radio => radio.checked = false);
        }
    } else {
        dissertacaoText.value = '';
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
        [memberDetailsPlaceholder, internalRankingPlaceholder, propostasPlaceholder, errorsWarningsPlaceholder, metasCurrent, metasHistory].forEach(el => el.innerHTML = '<p class="text-yellow-400 text-center">Nick ou cargo não definidos.</p>');
    }
}

function checkIfEvaluated() {
    const veredito = document.querySelector('input[name="veredito"]:checked');
    const dissertacao = dissertacaoText.value.trim();
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
dissertacaoText.addEventListener('input', () => {
    clearTimeout(dissertacaoTimeout);
    dissertacaoTimeout = setTimeout(async () => {
        await saveCurrentEvaluation();
        checkIfEvaluated();
    }, 1000);
});

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
                vagasInfo.classList.add('hidden');
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
    
    evaluationCard.classList.add('hidden');
    retrospectoScreen.classList.remove('hidden');
    retrospectoContent.innerHTML = `
        <div class="text-center p-12 text-gray-400">
            <i class="fas fa-spinner fa-spin text-6xl mb-4 text-blue-400"></i>
            <p class="text-xl">Carregando avaliações...</p>
        </div>
    `;
    toggleBtn.innerHTML = '<i class="fas fa-arrow-left mr-2"></i><span>Voltar para Avaliação</span>';
    
    await saveCurrentEvaluation();
    await loadEvaluationsFromFirestore(); // Recarregar do Firebase
    
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
    
    retrospectoContent.innerHTML = html;
    
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
    retrospectoScreen.classList.add('hidden');
    evaluationCard.classList.remove('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-list-check mr-2"></i><span>Ver Retrospecto</span>';
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
    if (retrospectoScreen.classList.contains('hidden')) {
        showRetrospecto();
    } else {
        hideRetrospecto();
    }
}

// --- Event Listeners Básicos ---
promoButtons.forEach(button => {
    button.addEventListener('click', () => {
        const range = button.getAttribute('data-range');
        const buttonText = button.querySelector('span:first-child').textContent.trim();
        loadPromotionList(range, buttonText, button);
    });
});
nextButton.addEventListener('click', nextCard);
prevButton.addEventListener('click', prevCard);
toggleRetrospectoBtn.addEventListener('click', toggleRetrospecto);
