// =====================================================================
// == ESCOPO GLOBAL - Acessível por QUALQUER arquivo JS da página  ==
// =====================================================================

// Variáveis que precisam ser globais, declaradas com 'let' sem valor inicial.
let auth;
let db;

// A "biblioteca" de templates de notificações.
const NOTIFICATION_TEMPLATES = {

    'cdc_entrada': {
    icone: 'fa-user-check',
    cor_icone: '#22c55e', // green-500
    getTexto: (dados) => ({
        titulo: 'Bem-vindo(a) a CDC!',
        corpo: `Olá, ${dados.nomeUsuario}. Sua entrada na CDC foi registrada com sucesso.`
    })
},

'cdc_promocao': {
    icone: 'fa-arrow-trend-up',
    cor_icone: '#3b82f6', // blue-500
    getTexto: (dados) => ({
        titulo: 'Promoção na CDC!',
        corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} na CDC.`
    })
},

'cdc_rebaixamento': {
    icone: 'fa-arrow-trend-down',
    cor_icone: '#f97316', // orange-500
    getTexto: (dados) => ({
        titulo: 'Rebaixamento no Corpo de Controle',
        corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo na CDC foi alterado para ${dados.novoCargo}.`
    })
},

'cdc_ouvidoria': {
    icone: 'fa-gavel',
    cor_icone: '#8b5cf6', // violet-500
    getTexto: (dados) => ({
        titulo: `Nova ${dados.tipoProposta} aprovado(a) na Ouvidoria da CDC.`,
        corpo: `O membro ${dados.nomeUsuario} teve ${dados.tipoProposta} aprovado(a).`
    })
},

    'spp_entrada': {
    icone: 'fa-user-shield',
    cor_icone: '#10b981', // emerald-500
    getTexto: (dados) => ({
        titulo: 'Bem-vindo(a) ao SPP!',
        corpo: `Olá, ${dados.nomeUsuario}. Sua entrada no Serviço de Proteção dos Professores foi registrada.`
    })
},

'spp_promocao': {
    icone: 'fa-angles-up',
    cor_icone: '#84cc16', // lime-500
    getTexto: (dados) => ({
        titulo: 'Promoção no SPP!',
        corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} no SPP.`
    })
},

'spp_rebaixamento': {
    icone: 'fa-angles-down',
    cor_icone: '#f59e0b', // amber-500
    getTexto: (dados) => ({
        titulo: 'Rebaixamento no SPP!',
        corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo no SPP foi alterado para ${dados.novoCargo}.`
    })
},

'spp_ouvidoria': {
    icone: 'fa-inbox',
    cor_icone: '#6366f1', // indigo-500
    getTexto: (dados) => ({
        titulo: `Nova ${dados.tipoProposta} aprovado(a) na Ouvidoria do SPP.`,
        corpo: `O membro ${dados.nomeUsuario} teve ${dados.tipoProposta} aprovado(a).`
    })
},

    'entrada_membro': {
        icone: 'fa-right-to-bracket',
        cor_icone: '#a855f7',
        getTexto: (dados) => ({
            titulo: 'Bem-vindo(a) aos Professores!',
            corpo: `Olá ${dados.nomeUsuario}, seu registro de entrada foi feito.`
        })
    },
    'promocao_membro': {
        icone: 'fa-arrow-up-wide-short',
        cor_icone: '#22c55e',
        getTexto: (dados) => ({
            titulo: 'Você foi promovido(a)!',
            corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para o cargo de ${dados.novoCargo}.`
        })
    },
    'rebaixamento_membro': {
        icone: 'fa-arrow-down-wide-short',
        cor_icone: '#f97316',
        getTexto: (dados) => ({
            titulo: 'Atualização sobre seu cargo',
            corpo: `Olá, ${dados.nomeUsuario}. Seu cargo foi atualizado para ${dados.novoCargo}.`
        })
    },
    'nova_ouvidoria': {
        icone: 'fa-bullhorn',
        cor_icone: '#3b82f6',
        getTexto: (dados) => ({
            titulo: `${dados.tipoProposta} aprovado(a) na Ouvidoria`,
            corpo: `O membro ${dados.nomeUsuario} teve ${dados.tipoProposta} aprovado(a).`
        })
    },
    'quebra_recorde': {
        icone: 'fa-trophy',
        cor_icone: '#eab308',
        getTexto: (dados) => ({
            titulo: 'Um novo recorde foi quebrado!',
            corpo: `${dados.nomeUsuario} quebrou o recorde de "${dados.tipoRecorde}" com ${dados.percentual}%!`
        })
    }, // <<--- VÍRGULA ADICIONADA AQUI

    'da_entrada': {
    icone: 'fa-person-chalkboard',
    cor_icone: '#06b6d4', // cyan-500
    getTexto: (dados) => ({
        titulo: 'Bem-vindo(a) ao DA!',
        corpo: `Olá, ${dados.nomeUsuario}. Sua entrada no Departamento de Aplicação como ${dados.cargo} foi registrada.`
    })
},

'da_promocao': {
    icone: 'fa-circle-chevron-up',
    cor_icone: '#14b8a6', // teal-500
    getTexto: (dados) => ({
        titulo: 'Promoção no DA!',
        corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} no Departamento de Aplicação.`
    })
},

'da_rebaixamento': {
    icone: 'fa-circle-chevron-down',
    cor_icone: '#facc15', // yellow-400
    getTexto: (dados) => ({
        titulo: 'Rebaixamento no DA',
        corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo no Departamento de Aplicação foi alterado para ${dados.novoCargo}.`
    })
},

'aniversario_membro': {
    icone: 'fa-cake-candles',       // Ícone de bolo de aniversário
    cor_icone: '#BA4FC0',            // Um roxo legal da sua paleta
    getTexto: (dados) => ({
        titulo: '🎉 Feliz Aniversário! 🎉',
        corpo: `Hoje é o dia de ${dados.nomeUsuario}! Deseje felicidades a ele(a)!`
    })
},

// Este modelo é para a notificação de SUBMISSÃO (envio) de uma proposta, 
// como configurado no seu script da.js
'da_ouvidoria': {
    icone: 'fa-lightbulb',
    cor_icone: '#ec4899', // pink-500
    getTexto: (dados) => ({
        titulo: 'Nova Proposta na Ouvidoria do DA',
        corpo: ` ${dados.nomeUsuario} teve um(a) "${dados.tipoProposta}" aprovado(a) no DA.`
    })
},
};

// A função que cria a notificação, agora acessível globalmente.
/**
 * Gera um objeto de notificação padronizado, pronto para salvar no Firebase.
 * @param {string} tipo - A chave do template a ser usado (ex: 'novo_membro').
 * @param {object} dados - Um objeto com os dados dinâmicos para o texto (ex: { nomeUsuario: 'Fulano' }).
 * @param {string} link - O link de destino da notificação.
 * @param {string|null} destinatarioId - O ID do usuário específico. Se null, a notificação é para todos.
 * @returns {object|null} O objeto da notificação ou null se o tipo for inválido.
 */
function criarNotificacao(tipo, dados, link = '#', destinatarioId = null) {
    const template = NOTIFICATION_TEMPLATES[tipo];
    if (!template) {
        console.error(`Tipo de notificação inválido: ${tipo}`);
        return null;
    }
    const { titulo, corpo } = template.getTexto(dados);
    return {
        titulo,
        corpo,
        icone: template.icone,
        cor_icone: template.cor_icone,
        link,
        read: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        destinatarioId
    };
}

async function getUserIdByNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') return null;
    try {
        console.log(`🟡 Buscando UID para o nickname: ${nickname.trim().toLowerCase()}`);
        const nickRef = db.collection('nicknames').doc(nickname.trim().toLowerCase());
        const doc = await nickRef.get();
        if (doc.exists) {
            const uid = doc.data().uid;
            console.log(`✅ UID encontrado: ${uid}`);
            return uid;
        } else {
            console.warn(`❌ Nickname não encontrado no banco de dados: ${nickname}`);
            alert(`O usuário "${nickname}" não foi encontrado no sistema.`);
            return null;
        }
    } catch (error) {
        console.error("🔥 Erro Crítico ao buscar UID por nickname:", error);
        alert("Ocorreu um erro ao verificar o usuário.");
        return null;
    }
}



// =====================================================================
// == CÓDIGO QUE SÓ EXECUTA QUANDO O HTML DA PÁGINA ESTÁ PRONTO
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // == INICIALIZAÇÃO DO FIREBASE
    // ===================================
    const firebaseConfig = {
        apiKey: "AIzaSyDo4DagZchii1cPKFighZU5KAjppp98HJE",
        authDomain: "nexusprof.firebaseapp.com",
        projectId: "nexusprof",
        storageBucket: "nexusprof.appspot.com",
        messagingSenderId: "268861178598",
        appId: "1:268861178598:web:9686b81bb003f9514fb127",
        measurementId: "G-MY150DZMTM"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Atribuímos os valores às variáveis GLOBAIS que criamos lá fora.
    auth = firebase.auth();
    db = firebase.firestore();


    // ===================================================================================
    // == INICIALIZADOR DE SCRIPTS GLOBAIS
    // ===================================================================================
    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.getElementById('menu-toggle')) {
            initializeGlobalScripts();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });


    // ===================================================================================
    // == FUNÇÃO PRINCIPAL QUE AGRUPA TODA A LÓGICA GLOBAL
    // ===================================================================================
    function initializeGlobalScripts() {

        auth.onAuthStateChanged(user => {
            // ✅ ADICIONE ESTA LINHA AQUI
            document.body.classList.remove('auth-loading');

            if (user) {
                updateUIAfterLogin(user);
            } else {
                updateUIAfterLogout();
            }
        });

        // --- SELETORES GERAIS ---
        const menuToggle = document.getElementById('menu-toggle');
        const topNavMenu = document.getElementById('top-nav-menu');
        const overlay = document.getElementById('overlay');
        const body = document.body;
        const searchPopup = document.getElementById('search-popup');
        const loginPopup = document.getElementById('login-popup');
        const notificationPanel = document.getElementById('notification-panel');

        function closeAllPopups() {
            if (topNavMenu) topNavMenu.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            if (searchPopup) searchPopup.classList.remove('active');
            if (loginPopup) loginPopup.classList.remove('active');
            if (notificationPanel) notificationPanel.classList.remove('active');
            body.classList.remove('noscroll');
        }

        // --- LÓGICA DO MENU SUPERIOR (NAVBAR) ---
        if (menuToggle && topNavMenu && overlay) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (topNavMenu.classList.contains('active')) {
                    closeAllPopups();
                } else {
                    closeAllPopups();
                    topNavMenu.classList.add('active');
                    overlay.classList.add('active');
                    body.classList.add('noscroll');
                }
            });
            overlay.addEventListener('click', closeAllPopups);
        }

        // --- LÓGICA PARA ABRIR/FECHAR SUBMENU NO MOBILE ---
        const dropdownLinks = document.querySelectorAll('.top-nav-menu .dropdown > a');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                if (window.innerWidth < 1024) {
                    event.preventDefault();
                    link.parentElement.classList.toggle('open');
                }
            });
        });

        // --- LÓGICA DO POPUP DE PESQUISA ---
        const searchToggleButton = document.getElementById('search-toggle-btn');
        const closeSearchButton = document.getElementById('close-search-btn');
        const popupSearchForm = document.getElementById('popup-search-form');

        if (searchToggleButton) {
            searchToggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                closeAllPopups();
                if (searchPopup) searchPopup.classList.add('active');
                body.classList.add('noscroll');
            });
        }
        if (closeSearchButton) closeSearchButton.addEventListener('click', closeAllPopups);
        if (searchPopup) {
            searchPopup.addEventListener('click', (e) => {
                if (e.target === searchPopup) {
                    closeAllPopups();
                }
            });
        }

        // --- LÓGICA DA PESQUISA DE MEMBRO (NO POPUP) ---
        if (popupSearchForm) {
    popupSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchInput = document.getElementById('popup-search-input');
        const memberNameOriginal = searchInput.value.trim(); // Pegamos o nome com maiúsculas/minúsculas originais
        
        if (memberNameOriginal) {
            const memberNameLowercase = memberNameOriginal.toLowerCase(); // Usamos o nome em minúsculas para a busca
            
            try {
                const nickRef = db.collection('nicknames').doc(memberNameLowercase);
                const nickDoc = await nickRef.get();
                
                if (nickDoc.exists) {
                    // SUCESSO! Redireciona para a nova URL amigável
                    // Usamos o nome original para a URL ficar mais bonita
                    window.location.href = `/membros/${encodeURIComponent(memberNameOriginal)}`;
                } else {
                    alert('Membro não encontrado! Verifique o nome digitado.');
                }
            } catch (error) {
                console.error('Erro ao buscar membro:', error);
                alert('Erro ao buscar membro. Tente novamente.');
            }
        }
    });
}

        // --- LÓGICA DO PAINEL DE NOTIFICAÇÕES ---
        const notificationToggleButton = document.getElementById('notification-toggle-btn');
        if (notificationToggleButton && notificationPanel) {
            notificationToggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (notificationPanel.classList.contains('active')) {
                    closeAllPopups();
                } else {
                    closeAllPopups();
                    notificationPanel.classList.add('active');
                    overlay.classList.add('active');
                    markNotificationsAsRead();
                }
            });
        }

    function initializeNotificationListener() {
    const notificationItemsList = document.getElementById('notification-items-list');
    const notificationCountElement = document.getElementById('notification-count');

    if (!notificationItemsList || !notificationCountElement) {
        console.warn("Elementos de notificação não encontrados no DOM.");
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            if (window.notificationListenerAttached) return;
            window.notificationListenerAttached = true;
            
            console.log("✅ Usuário logado! Iniciando listener de notificações.");
            const currentUserId = user.uid;

            db.collection('notificacoes').orderBy('timestamp', 'desc').limit(30).onSnapshot(snapshot => {
                notificationItemsList.innerHTML = '';
                let unreadCount = 0;
                const notificationsToShow = [];

                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const isBroadcast = !notification.destinatarioId;
                    const isForMe = notification.destinatarioId === currentUserId;

                    // [LÓGICA DE ARQUIVAMENTO] Verifica se o usuário atual já arquivou esta notificação
                    const isArchived = notification.arquivadoPor && notification.arquivadoPor.includes(currentUserId);

                    // A notificação só é considerada se for para o usuário E se não tiver sido arquivada por ele
                    if ((isBroadcast || isForMe) && !isArchived) {
                        notificationsToShow.push({ id: doc.id, ...notification });
                    }
                });

                if (notificationsToShow.length === 0) {
                    notificationItemsList.innerHTML = '<li class="no-notifications">Nenhuma notificação encontrada.</li>';
                } else {
                    notificationsToShow.forEach(notification => {
                        // A contagem de não lidas desconsidera as arquivadas, pois elas nem aparecem
                        if (notification.read === false) unreadCount++;

                        const notificationDate = (notification.timestamp && typeof notification.timestamp.toDate === 'function')
                            ? notification.timestamp.toDate()
                            : new Date();
                        const timeAgo = dayjs(notificationDate).fromNow(true);

                        const li = document.createElement('li');
                        li.className = `notification-item ${!notification.read ? 'unread' : ''}`;
                        li.setAttribute('data-id', notification.id);

                        li.innerHTML = `
                            <a href="${notification.link || '#'}">
                                <div class="notification-icon-wrapper" style="background-color: ${notification.cor_icone || '#717171'};">
                                    <i class="fa-solid ${notification.icone || 'fa-bell'}"></i>
                                </div>
                                <div class="notification-content">
                                    <p class="notification-title">${notification.titulo}</p>
                                    ${notification.corpo ? `<p class="notification-body">${notification.corpo}</p>` : ''}
                                    <span class="notification-time">há ${timeAgo}</span>
                                </div>
                            </a>
                            <button class="notification-delete-btn" title="Arquivar notificação">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        `;
                        notificationItemsList.appendChild(li);
                    });
                }

                if (unreadCount > 0) {
                    notificationCountElement.textContent = unreadCount;
                    notificationCountElement.style.display = 'flex';
                } else {
                    notificationCountElement.style.display = 'none';
                }
            }, error => {
                console.error("🔥 Erro ao buscar notificações: ", error);
            });

        } else {
            console.log("Usuário deslogado, listener de notificações parado.");
            window.notificationListenerAttached = false;
            notificationItemsList.innerHTML = '<li class="no-notifications">Faça login para ver suas notificações.</li>';
            notificationCountElement.style.display = 'none';
        }
    });
}

/**
 * Adiciona a funcionalidade de ARQUIVAMENTO ao painel de notificações.
 */
function setupNotificationDeletion() {
    const notificationPanel = document.getElementById('notification-panel');
    if (!notificationPanel) return;

    notificationPanel.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.notification-delete-btn');

        if (deleteButton) {
            e.preventDefault();
            e.stopPropagation();

            const notificationItem = deleteButton.closest('.notification-item');
            const notificationId = notificationItem.dataset.id;
            const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

            if (notificationId && currentUserId && confirm('Tem certeza de que deseja arquivar esta notificação?')) {
                try {
                    // [LÓGICA DE ARQUIVAMENTO] Atualiza o documento em vez de deletá-lo
                    const notificationRef = db.collection('notificacoes').doc(notificationId);
                    await notificationRef.update({
                        arquivadoPor: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                    });
                    
                    console.log(`Notificação ${notificationId} arquivada para o usuário.`);
                    // A UI vai se atualizar sozinha graças ao listener onSnapshot.
                } catch (error) {
                    console.error("Erro ao arquivar notificação:", error);
                    alert("Não foi possível arquivar a notificação.");
                }
            }
        }
    });
}

async function markNotificationsAsRead() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const currentUserId = currentUser.uid;

    const unreadQuery = db.collection('notificacoes').where('read', '==', false);
    try {
        const snapshot = await unreadQuery.get();
        if (snapshot.empty) return;

        const batch = db.batch();
        let updatesMade = 0;

        snapshot.docs.forEach(doc => {
            const notification = doc.data();
            const isBroadcast = !notification.destinatarioId;
            const isForMe = notification.destinatarioId === currentUserId;
            
            // Apenas marca como lida se for relevante para o usuário
            if (isBroadcast || isForMe) {
                batch.update(doc.ref, { read: true });
                updatesMade++;
            }
        });
        
        if (updatesMade > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error("Erro ao marcar notificações como lidas: ", error);
    }
}

// --- INICIA O SISTEMA DE NOTIFICAÇÕES ---
dayjs.extend(dayjs_plugin_relativeTime);
dayjs.locale('pt-br');

initializeNotificationListener();
setupNotificationDeletion();


        // --- LÓGICA DE LOGIN/LOGOUT E POPUP DO DASHBOARD ---
        const loggedOutView = document.getElementById('profile-icon-logged-out');
        const loggedInView = document.getElementById('header-user-info-logged-in');
        const logoutButton = document.getElementById('logout-button');

        if (loggedInView && loginPopup) {
            loggedInView.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (loginPopup.classList.contains('active')) {
                    closeAllPopups();
                } else {
                    closeAllPopups();
                    loginPopup.classList.add('active');
                    overlay.classList.add('active');
                }
            });
        }

        auth.onAuthStateChanged(user => {
            if (user) {
                updateUIAfterLogin(user);
            } else {
                updateUIAfterLogout();
            }
        });

        async function updateUIAfterLogin(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            console.log("Documento do usuário não encontrado, fazendo logout.");
            return auth.signOut();
        }
        
        const userProfileData = userDoc.data();
        const nickDoUsuario = userProfileData.name || "Usuário";
        
        
        const cargoDisplay = userProfileData.cargo || "Membro";
        
        const roles = [userProfileData.status,userProfileData.cargo, userProfileData.spp, userProfileData.da, userProfileData.cdc].filter(Boolean);

        // --- Atualização da UI ---
        const loggedOutView = document.getElementById('profile-icon-logged-out');
        const loggedInView = document.getElementById('header-user-info-logged-in');
        if(loggedOutView) loggedOutView.classList.add('hidden');
        if(loggedInView) loggedInView.classList.remove('hidden');
        
        document.getElementById('header-user-img').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(nickDoUsuario)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
        document.getElementById('header-user-name').textContent = nickDoUsuario;
        document.getElementById('user-main-role').textContent = cargoDisplay;

        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            dashboardView.classList.remove('hidden');
            document.getElementById('dashboard-user-photo').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(nickDoUsuario)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
            document.getElementById('dashboard-user-name').textContent = nickDoUsuario;
            const rolesContainer = document.getElementById('dashboard-user-roles-container');
            rolesContainer.innerHTML = '';
            
            if (roles.length > 0) {
                roles.forEach(roleText => {
                    const roleElement = document.createElement('span');
                    roleElement.className = 'user-role-item';
                    roleElement.textContent = roleText;
                    rolesContainer.appendChild(roleElement);
                });
            } else {
                rolesContainer.innerHTML = '<span class="user-role-item">Membro</span>';
            }
        }

        const rolesContainer = document.getElementById('dashboard-user-roles-container');
rolesContainer.innerHTML = ''; // Limpa o container antes de adicionar os novos itens

// 1. Defina a ORDEM em que você quer que os campos apareçam no perfil
const fieldsToShow = ['status', 'cargo', 'spp', 'da', 'cdc'];

// 2. Itere sobre cada nome de campo que definimos
fieldsToShow.forEach(fieldName => {
    // 3. Pegue o valor correspondente do perfil do usuário (ex: "Vice-Líder")
    const fieldValue = userProfileData[fieldName];

    // 4. Se o campo tiver um valor (não for nulo ou uma string vazia)...
    if (fieldValue) {
        // ...então vamos criar o item para ele.
        
        // Pega o ícone para este CAMPO (ex: o ícone de 'cargo')
        const iconUrl = FIELD_ICONS[fieldName]; 
        
        // Monta o HTML para esta linha
        const itemHTML = `
            <div class="role-item">
                ${iconUrl ? `<img src="${iconUrl}" alt="${fieldName}" class="role-icon">` : ''}
                <span class="role-text">${fieldValue}</span>
            </div>
        `;
        
        // Adiciona a linha pronta ao container
        rolesContainer.innerHTML += itemHTML;
    }
    // Se o campo for vazio, ele simplesmente não faz nada, como você pediu.
});


// Verifica se, após a verificação, o container continua vazio.
if (rolesContainer.innerHTML === '') {
    rolesContainer.innerHTML = `
        <div class="role-item">
            <span class="role-text">Membro</span>
        </div>
    `;
}
        
        // ==========================================================
        // === [LÓGICA ATUALIZADA] VERIFICA SE O USUÁRIO TEM A ROLE 'admin' ===
        // ==========================================================
        const adminButton = document.getElementById('admin-panel-button');
        if (adminButton) {
            // A verificação agora é direta no campo 'role'
            if (userProfileData.role === 'admin') {
                adminButton.classList.remove('hidden'); // Mostra o botão
            } else {
                adminButton.classList.add('hidden'); // Garante que o botão está escondido
            }
        }
        
        window.currentUserData = userProfileData;
        window.isUserDataReady = true;
        const event = new CustomEvent('userDataReady', { detail: { userData: userProfileData } });
        document.dispatchEvent(event);
    } catch (error) {
        console.error("Erro ao atualizar UI após login:", error);
    }
}


        function updateUIAfterLogout() {
            if(loggedInView) loggedInView.classList.add('hidden');
            if(loggedOutView) loggedOutView.classList.remove('hidden');
            closeAllPopups();

            window.currentUserData = null;
            window.isUserDataReady = true;
            const event = new CustomEvent('userDataReady', { detail: { userData: null } });
            document.dispatchEvent(event);
        }

        if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        const userToLogout = auth.currentUser;
        if (userToLogout) {
            try {
                // 1. Espera a função goOffline terminar
                await goOffline(userToLogout.uid); 
                console.log("Status atualizado para offline. Agora fazendo logout.");
                // 2. Só depois faz o logout
                await auth.signOut();
            } catch (error) {
                console.error("Erro ao tentar marcar como offline antes do logout:", error);
                // Mesmo se der erro, tenta fazer o logout
                await auth.signOut();
            }
        }
    });
}


        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllPopups();
            }
        });
    }

})

const FIELD_ICONS = {
    // A CHAVE é o nome do campo no Firestore. O VALOR é o caminho da imagem.
    'cargo': '/imgs/prof-imagem.png', // Ícone para a hierarquia principal
    'spp': '/imgs/spp-imagem.png',          // Ícone para Supervisor de Promoções
    'da': '/imgs/da-imagem.png',            // Ícone para Diretor de Ausências
    'cdc': '/imgs/cdc-imagem.png',          // Ícone para o Corpo de Controle
};