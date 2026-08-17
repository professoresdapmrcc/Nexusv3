let auth;
let db;
let userProfileListener = null; // Guarda a escuta do banco para podermos desligar no logout
let userProfileListenerUid = null;
let inactiveAccountBlockInProgress = false;

// =====================================================================
// == 🚀 ANTI-FLICKER (CARREGAMENTO IMEDIATO DO CACHE)
// == Executa ANTES do DOM carregar completamente para evitar o "piscar"
// =====================================================================
try {
    const cachedUserDataJSON = sessionStorage.getItem('currentUserCache');
    if (cachedUserDataJSON) {
        const cachedUserData = JSON.parse(cachedUserDataJSON);
        
        // Removemos o loading e mostramos o usuário imediatamente
        document.documentElement.classList.remove('auth-loading');
        document.body.classList.remove('auth-loading');
        document.body.classList.add('auth-state-determined', 'user-logged-in');
        
        // Salva na memória para aplicarmos assim que o DOM do Header existir
        window.preLoadedUserData = cachedUserData; 
    }
} catch(e) {
    console.error("Erro na leitura rápida do cache:", e);
    sessionStorage.removeItem('currentUserCache');
}


// A "biblioteca" de templates de notificações.
const NOTIFICATION_TEMPLATES = {

    'cdc_entrada': {
        icone: '/imgs/cdc-imagem.png',
        cor_icone: '#22c55e', // green-500
        getTexto: (dados) => ({
            titulo: 'Bem-vindo(a) a CDC!',
            corpo: `Olá, ${dados.nomeUsuario}. Sua entrada na CDC foi registrada com sucesso.`
        })
    },

    'cdc_promocao': {
        icone: '/imgs/cdc-imagem.png',
        cor_icone: '#3b82f6', // blue-500
        getTexto: (dados) => ({
            titulo: 'Promoção na CDC!',
            corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} na CDC.`
        })
    },

    'cdc_rebaixamento': {
        icone: '/imgs/cdc-imagem.png',
        cor_icone: '#f97316', // orange-500
        getTexto: (dados) => ({
            titulo: 'Rebaixamento no Corpo de Controle',
            corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo na CDC foi alterado para ${dados.novoCargo}.`
        })
    },

    'cdc_ouvidoria': {
        icone: '/imgs/cdc-imagem.png',
        cor_icone: '#8b5cf6', // violet-500
        getTexto: (dados) => ({
            titulo: `Nova ${dados.tipoProposta} aprovado(a) na Ouvidoria da CDC.`,
            corpo: `O membro ${dados.nomeUsuario} teve ${dados.tipoProposta} aprovado(a).`
        })
    },

    'spp_entrada': {
        icone: '/imgs/spp-imagem.png',
        cor_icone: '#10b981', // emerald-500
        getTexto: (dados) => ({
            titulo: 'Bem-vindo(a) ao SPP!',
            corpo: `Olá, ${dados.nomeUsuario}. Sua entrada no Serviço de Proteção dos Professores foi registrada.`
        })
    },

    'spp_promocao': {
        icone: '/imgs/spp-imagem.png',
        cor_icone: '#84cc16', // lime-500
        getTexto: (dados) => ({
            titulo: 'Promoção no SPP!',
            corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} no SPP.`
        })
    },

    'spp_rebaixamento': {
        icone: '/imgs/spp-imagem.png',
        cor_icone: '#f59e0b', // amber-500
        getTexto: (dados) => ({
            titulo: 'Rebaixamento no SPP!',
            corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo no SPP foi alterado para ${dados.novoCargo}.`
        })
    },

    'spp_ouvidoria': {
        icone: '/imgs/spp-imagem.png',
        cor_icone: '#6366f1', // indigo-500
        getTexto: (dados) => ({
            titulo: `Nova ${dados.tipoProposta} aprovado(a) na Ouvidoria do SPP.`,
            corpo: `O membro ${dados.nomeUsuario} teve um(a) ${dados.tipoProposta} aprovado(a).`
        })
    },

    'entrada_membro': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#a855f7',
        getTexto: (dados) => ({
            titulo: 'Bem-vindo(a) aos Professores!',
            corpo: `Olá ${dados.nomeUsuario}, seu registro de entrada foi feito.`
        })
    },
    'promocao_membro': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#22c55e',
        getTexto: (dados) => ({
            titulo: 'Você foi promovido(a)!',
            corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para o cargo de ${dados.novoCargo}.`
        })
    },
    'rebaixamento_membro': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#f97316',
        getTexto: (dados) => ({
            titulo: 'Atualização sobre seu cargo',
            corpo: `Olá, ${dados.nomeUsuario}. Seu cargo foi atualizado para ${dados.novoCargo}.`
        })
    },
    'nova_ouvidoria': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#3b82f6',
        getTexto: (dados) => ({
            titulo: `${dados.tipoProposta} aprovado(a) na Ouvidoria`,
            corpo: `O membro ${dados.nomeUsuario} teve ${dados.tipoProposta} aprovado(a).`
        })
    },
    'quebra_recorde': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#eab308',
        getTexto: (dados) => ({
            titulo: 'Um novo recorde foi quebrado!',
            corpo: `${dados.nomeUsuario} quebrou o recorde de "${dados.tipoRecorde}" com ${dados.percentual}%!`
        })
    },

    'companhia_homologacao': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#4b5563', // gray-600
        getTexto: (dados) => ({
            titulo: 'Nova Homologação Publicada',
            corpo: `A homologação de número ${dados.numero}, clique aqui para ficar por dentro!.`
        })
    },

    'companhia_reuniao_conselho': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#6d28d9', // violet-700
        getTexto: (dados) => ({
            titulo: 'Ata da Reunião do Conselho',
            corpo: `Olá, foi públicada a ata da reunião do Conselho, clique aqui para ficar por dentro!`
        })
    },

    'companhia_ouvidoria': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#8b5cf6', // violet-500
        getTexto: (dados) => ({
            titulo: `Nova ${dados.tipoProposta} aprovado(a) na ouvidoria da Companhia.`,
            corpo: `O membro ${dados.nomeUsuario} teve um(a) ${dados.tipoProposta} aprovada na Companhia.`
        })
    },

    'companhia_reuniao_geral': {
        icone: '/imgs/emblema-prof.png',
        cor_icone: '#0d9488', // teal-600
        getTexto: (dados) => ({
            titulo: 'Ata da Reunião Geral',
            corpo: `Olá, foi públicada a ata da reunião geral, clique aqui para ficar por dentro!`
        })
    },

    'da_entrada': {
        icone: '/imgs/da-imagem.png',
        cor_icone: '#06b6d4', // cyan-500
        getTexto: (dados) => ({
            titulo: 'Bem-vindo(a) ao DA!',
            corpo: `Olá, ${dados.nomeUsuario}. Sua entrada no Departamento de Aplicação como ${dados.cargo} foi registrada.`
        })
    },

    'da_promocao': {
        icone: '/imgs/da-imagem.png',
        cor_icone: '#14b8a6', // teal-500
        getTexto: (dados) => ({
            titulo: 'Promoção no DA!',
            corpo: `Parabéns, ${dados.nomeUsuario}! Você foi promovido(a) para ${dados.novoCargo} no Departamento de Aplicação.`
        })
    },

    'da_rebaixamento': {
        icone: '/imgs/da-imagem.png',
        cor_icone: '#facc15', // yellow-400
        getTexto: (dados) => ({
            titulo: 'Rebaixamento no DA',
            corpo: `Atenção, ${dados.nomeUsuario}. Seu cargo no Departamento de Aplicação foi alterado para ${dados.novoCargo}.`
        })
    },

    'da_ouvidoria': {
        icone: '/imgs/da-imagem.png',
        cor_icone: '#ec4899', // pink-500
        getTexto: (dados) => ({
            titulo: 'Nova Proposta na Ouvidoria do DA',
            corpo: ` ${dados.nomeUsuario} teve um(a) "${dados.tipoProposta}" aprovado(a) no DA.`
        })
    },
};

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

document.addEventListener('DOMContentLoaded', async () => {

    // ================================================================
    // == 🚀 INJEÇÃO IMEDIATA DO CACHE (Assim que o header carregar)
    // ================================================================
    if (window.preLoadedUserData) {
        const headerObserver = new MutationObserver((mutations, obs) => {
            if (document.getElementById('header-user-info-logged-in')) {
                populateUIWithUserData(window.preLoadedUserData, null);
                obs.disconnect(); 
            }
        });
        headerObserver.observe(document.body, { childList: true, subtree: true });
    }

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
        firebase.analytics(); 
        window.db = firebase.firestore();
    }
    
    auth = firebase.auth();
    db = firebase.firestore();

    function isActiveMemberProfile(userData) {
        return String(userData?.status || '').trim().toLowerCase() === 'ativo';
    }

    function renderInactiveAccountBlock(status) {
        let overlay = document.getElementById('inactive-account-block');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'inactive-account-block';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'inactive-account-title');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: grid;
            place-items: center;
            padding: 24px;
            background: rgba(10, 5, 15, 0.98);
            color: #fff;
            font-family: 'Poppins', sans-serif;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            width: min(460px, 100%);
            padding: 32px;
            border: 1px solid rgba(255, 51, 102, 0.45);
            border-radius: 18px;
            background: #150b1f;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65);
            text-align: center;
        `;

        const icon = document.createElement('div');
        icon.setAttribute('aria-hidden', 'true');
        icon.style.cssText = 'font-size: 42px; color: #ff3366; margin-bottom: 14px;';
        icon.innerHTML = '<i class="fa-solid fa-user-lock"></i>';

        const title = document.createElement('h1');
        title.id = 'inactive-account-title';
        title.textContent = 'Conta sem acesso';
        title.style.cssText = 'margin: 0 0 10px; font-size: 24px;';

        const message = document.createElement('p');
        message.textContent = 'Seu cadastro não está ativo. A sessão foi encerrada e todas as áreas de acesso e postagem foram bloqueadas.';
        message.style.cssText = 'margin: 0; color: #c9c1d3; line-height: 1.6;';

        const statusLabel = document.createElement('p');
        statusLabel.textContent = `Status atual: ${status || 'Inativo'}`;
        statusLabel.style.cssText = 'margin: 18px 0 0; color: #ff7998; font-size: 13px; font-weight: 700; text-transform: uppercase;';

        card.append(icon, title, message, statusLabel);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        return overlay;
    }

    async function blockInactiveAccount(status = 'Inativo') {
        if (inactiveAccountBlockInProgress) return;
        inactiveAccountBlockInProgress = true;
        window.__nexusAccountBlocked = true;

        sessionStorage.removeItem('currentUserCache');
        sessionStorage.removeItem('userProfile');
        renderInactiveAccountBlock(status);

        const stopBlockedInteraction = (event) => {
            if (event.target?.closest?.('#inactive-account-block')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        document.addEventListener('click', stopBlockedInteraction, true);
        document.addEventListener('submit', stopBlockedInteraction, true);
        document.dispatchEvent(new CustomEvent('accountAccessBlocked', { detail: { status } }));

        try {
            await Promise.allSettled([
                auth.signOut(),
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' }
                })
            ]);
        } catch (error) {
            console.error('Erro ao encerrar a sessão da conta inativa:', error);
        } finally {
            window.setTimeout(() => {
                window.location.replace('/login.html?motivo=conta-inativa');
            }, 1200);
        }
    }

    window.NexusAccessGuard = {
        isBlocked: () => window.__nexusAccountBlocked === true,
        isActive: () => Boolean(auth.currentUser) && isActiveMemberProfile(window.currentUserData),
        assertActive: () => {
            if (window.__nexusAccountBlocked || !auth.currentUser || !isActiveMemberProfile(window.currentUserData)) {
                throw new Error('Acesso bloqueado: a conta não está ativa.');
            }
            return true;
        }
    };

    const nomePagina = window.location.pathname.split("/").pop() || "home";
    firebase.analytics().logEvent('pagina_visitada', {
        pagina: nomePagina,
        url_completa: window.location.href
    });

    // ===================================================================================
    // == MONITOR DE AUTENTICAÇÃO
    // ===================================================================================
    auth.onAuthStateChanged(user => {
        console.log("🔐 AuthState alterado. Usuário:", user ? "Logado" : "Deslogado");
        
        document.body.classList.remove('auth-loading');

        if (user) {
            // Começa a vigiar o status antes de o cabeçalho terminar de carregar.
            updateUIAfterLogin(user);
        }

        // Função que aplica a visibilidade dos botões
        function aplicarVisualHeader() {
            const authLoader = document.querySelector('.auth-loader');
            const loggedOutView = document.getElementById('profile-icon-logged-out');
            const loggedInView = document.getElementById('header-user-info-logged-in');

            if (authLoader) authLoader.style.display = 'none';

            if (user) {
                if (loggedOutView) loggedOutView.classList.add('hidden'); 
                if (loggedInView) loggedInView.classList.remove('hidden'); 
                updateUIAfterLogin(user);
                initializeNotificationListener();
                setupNotificationDeletion();
            } else {
                if (loggedInView) loggedInView.classList.add('hidden'); 
                if (loggedOutView) loggedOutView.classList.remove('hidden'); // MOSTRA O BOTÃO DE LOGIN
                updateUIAfterLogout();
            }
        }

        // Se o loader.js já desenhou o menu na tela, aplica direto:
        if (document.getElementById('profile-icon-logged-out')) {
            aplicarVisualHeader();
        } else {
            // Se o menu ainda não existe, cria o "olheiro" e espera
            const authHeaderObserver = new MutationObserver((mutations, obs) => {
                if (document.getElementById('profile-icon-logged-out')) {
                    aplicarVisualHeader();
                    obs.disconnect(); // Desliga o olheiro depois que fez o trabalho
                }
            });
            authHeaderObserver.observe(document.body, { childList: true, subtree: true });
        }
    });


    // ===================================================================================
    // == INICIALIZADOR DE SCRIPTS GLOBAIS (OBSERVADOR)
    // ===================================================================================
    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.getElementById('menu-toggle')) {
            initializeGlobalScripts();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });


    // ===================================================================================
    // == FUNÇÃO PRINCIPAL QUE AGRUPA A LÓGICA VISUAL (MENU, POPUPS)
    // ===================================================================================
    function initializeGlobalScripts() {
        console.log("🎨 Inicializando scripts visuais globais...");
        
        try {
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

            const dropdownLinks = document.querySelectorAll('.top-nav-menu .dropdown > a');
            dropdownLinks.forEach(link => {
                link.addEventListener('click', (event) => {
                    if (window.innerWidth < 1024) {
                        event.preventDefault();
                        link.parentElement.classList.toggle('open');
                    }
                });
            });

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
                    if (e.target === searchPopup) closeAllPopups();
                });
            }

            if (popupSearchForm) {
                popupSearchForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const searchInput = document.getElementById('popup-search-input');
                    if (!searchInput) return;
                    
                    const memberNameOriginal = searchInput.value.trim();
                    
                    if (memberNameOriginal) {
                        const memberNameLowercase = memberNameOriginal.toLowerCase();
                        const memberNameEncoded = btoa(memberNameLowercase); 
                        
                        try {
                            const [normalCheck, encodedCheck] = await Promise.all([
                                db.collection('nicknames').doc(memberNameLowercase).get(),
                                db.collection('nicknames').doc(memberNameEncoded).get()
                            ]);
                            
                            if (normalCheck.exists || encodedCheck.exists) {
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

            const loggedInView = document.getElementById('header-user-info-logged-in');
            
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
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeAllPopups();
            });

        } catch (error) {
            console.error("⚠️ Erro nos scripts visuais (Menu/Popups):", error);
        }
    }


    // ===================================================================================
    // == FUNÇÕES DE LÓGICA DE USUÁRIO E UI
    // ===================================================================================

    function initializeNotificationListener() {
        const notificationItemsList = document.getElementById('notification-items-list');
        const notificationCountElement = document.getElementById('notification-count');

        if (!notificationItemsList || !notificationCountElement) return;

        const user = auth.currentUser;
        if (user) {
            if (window.notificationListenerAttached) return;
            window.notificationListenerAttached = true;
            
            console.log("✅ Iniciando listener de notificações.");
            const currentUserId = user.uid;

            db.collection('notificacoes').orderBy('timestamp', 'desc').limit(30).onSnapshot(snapshot => {
                notificationItemsList.innerHTML = '';
                let unreadCount = 0;
                const notificationsToShow = [];

                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const isBroadcast = !notification.destinatarioId;
                    const isForMe = notification.destinatarioId === currentUserId;
                    const isArchived = notification.arquivadoPor && notification.arquivadoPor.includes(currentUserId);

                    if ((isBroadcast || isForMe) && !isArchived) {
                        notificationsToShow.push({ id: doc.id, ...notification });
                    }
                });

                if (notificationsToShow.length === 0) {
                    notificationItemsList.innerHTML = '<li class="no-notifications">Nenhuma notificação encontrada.</li>';
                } else {
                    notificationsToShow.forEach(notification => {
                        if (notification.read === false) unreadCount++;

                        const notificationDate = (notification.timestamp && typeof notification.timestamp.toDate === 'function')
                            ? notification.timestamp.toDate()
                            : new Date();
                        const timeAgo = (typeof dayjs !== 'undefined') ? dayjs(notificationDate).fromNow(true) : "recentemente";

                        const li = document.createElement('li');
                        li.className = `notification-item ${!notification.read ? 'unread' : ''}`;
                        li.setAttribute('data-id', notification.id);

                        let visualMediaHTML = "";
                        if (notification.icone && (notification.icone.includes('.png') || notification.icone.includes('http'))) {
                            visualMediaHTML = `<img src="${notification.icone}" alt="Icon" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`;
                        } else {
                            visualMediaHTML = `<i class="fa-solid ${notification.icone || 'fa-bell'}"></i>`;
                        }

const sanitize = (val) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '') ? String(val).trim() : null;

const tituloExibicao = sanitize(notification.titulo)
    ?? sanitize(notification.title)
    ?? "Notificação do Sistema";

const corpoExibicao = sanitize(notification.corpo)
    ?? sanitize(notification.mensagem)
    ?? sanitize(notification.message)
    ?? "";

li.innerHTML = `
    <a href="${notification.link || '#'}">
        <div class="notification-icon-wrapper" style="background-color: ${notification.cor_icone || '#a29bfe'}20; color: ${notification.cor_icone || '#a29bfe'};">
            ${visualMediaHTML}
        </div>
        <div class="notification-content">
            <p class="notification-title">${tituloExibicao}</p>
            ${corpoExibicao ? `<p class="notification-body">${corpoExibicao}</p>` : ''}
            <span class="notification-time">há ${timeAgo}</span>
        </div>
    </a>
    <button class="notification-delete-btn" title="Arquivar notificação">
        <i class="fa-solid fa-trash-can"></i>
    </button>
`;
                        notificationItemsList.appendChild(li);
                    })
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
    }

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
                        const notificationRef = db.collection('notificacoes').doc(notificationId);
                        await notificationRef.update({
                            arquivadoPor: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                        });
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

    if (typeof dayjs !== 'undefined') {
        if (typeof dayjs_plugin_relativeTime !== 'undefined') dayjs.extend(dayjs_plugin_relativeTime);
        dayjs.locale('pt-br');
    }

    function populateUIWithUserData(userData, fullProfileData) {
        document.body.classList.add('auth-state-determined', 'user-logged-in');
        document.body.classList.remove('user-logged-out');

        const authLoader = document.querySelector('.auth-loader');
        const loggedOutView = document.getElementById('profile-icon-logged-out');
        const loggedInView = document.getElementById('header-user-info-logged-in');
        const elImg = document.getElementById('header-user-img');
        const elName = document.getElementById('header-user-name');
        const elRole = document.getElementById('user-main-role');

        if (authLoader) authLoader.style.display = 'none';
        if (loggedOutView) loggedOutView.classList.add('hidden');
        if (loggedInView) loggedInView.classList.remove('hidden');

        if(elImg) elImg.src = userData.photoURL;
        if(elName) elName.textContent = userData.name;
        if(elRole) elRole.textContent = userData.cargo;

        // Botão "Meu Perfil" dinâmico com fallback de seletor
        const meuPerfilBtn = document.getElementById('meu-perfil-btn') || document.querySelector('a.sys-btn.primary[href^="/perfil.html"]');
        if (meuPerfilBtn && userData.name) {
            const nickDoUsuario = userData.name;
            meuPerfilBtn.href = `/membros/${encodeURIComponent(nickDoUsuario)}`;
        }

        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView && fullProfileData) {
            const dashPhoto = document.getElementById('dashboard-user-photo');
            const dashName = document.getElementById('dashboard-user-name');
            if(dashPhoto) dashPhoto.src = userData.photoURL;
            if(dashName) dashName.textContent = userData.name;
            
            const rolesContainer = document.getElementById('dashboard-user-roles-container');
            if (rolesContainer) {
                rolesContainer.innerHTML = '';

                const fieldsToShow = ['status', 'cargo', 'spp', 'da', 'cdc'];
                fieldsToShow.forEach(fieldName => {
                    const fieldValue = fullProfileData[fieldName];
                    if (fieldValue) {
                        const iconUrl = FIELD_ICONS[fieldName];
                        const itemHTML = `
                            <div class="role-item">
                                ${iconUrl ? `<img src="${iconUrl}" alt="${fieldName}" class="role-icon">` : ''}
                                <span class="role-text">${fieldValue}</span>
                            </div>
                        `;
                        rolesContainer.innerHTML += itemHTML;
                    }
                });
                if (rolesContainer.innerHTML === '') {
                    rolesContainer.innerHTML = `<div class="role-item"><span class="role-text">Membro</span></div>`;
                }
            }

            // ====================================================================
            // == INJEÇÃO DA LÓGICA DE FAVORITOS (ESTILO 3)
            // ====================================================================
            const gridFavoritos = document.getElementById('favorites-grid');
            if (gridFavoritos) {
                gridFavoritos.innerHTML = ''; 
                
                const favoritosMembro = fullProfileData.favoritos || [
                    { id: 'ranking', nome: 'Ranking', link: '/ranking.html', icone: 'fa-trophy' },
                    { id: 'diario', nome: 'Diário', link: '/documentos.html', icone: 'fa-file-invoice' },
                    { id: 'mural', nome: 'Mural', link: '/mural.html', icone: 'fa-image' }
                ];

                favoritosMembro.forEach(fav => {
                    gridFavoritos.innerHTML += `
                        <a href="${fav.link}" class="fav-link">
                            <i class="fa-solid ${fav.icone}"></i>
                            <span>${fav.nome}</span>
                        </a>
                    `;
                });
            }
        }

        const adminButton = document.getElementById('admin-panel-button');
        if (adminButton) {
            if (userData.isAdmin) {
                adminButton.classList.remove('hidden');
            } else {
                adminButton.classList.add('hidden');
            }
        }
    }

    function updateUIAfterLogin(user) {
        try {
            if (userProfileListener && userProfileListenerUid === user.uid) {
                if (window.currentUserData && isActiveMemberProfile(window.currentUserData)) {
                    const cachedUserData = JSON.parse(sessionStorage.getItem('currentUserCache') || 'null');
                    if (cachedUserData) populateUIWithUserData(cachedUserData, window.currentUserData);
                }
                return;
            }

            if (userProfileListener) {
                userProfileListener();
            }

            userProfileListenerUid = user.uid;
            userProfileListener = db.collection('users').doc(user.uid).onSnapshot((userDoc) => {
                if (!userDoc.exists) {
                    console.log("Documento do usuário não encontrado, fazendo logout.");
                    return blockInactiveAccount('Cadastro não encontrado');
                }

                const userProfileData = userDoc.data();
                if (!isActiveMemberProfile(userProfileData)) {
                    console.warn('Conta sem status ativo. Bloqueando acesso e encerrando a sessão.');
                    return blockInactiveAccount(userProfileData.status || 'Inativo');
                }

                const nickDoUsuario = userProfileData.name || "Usuário";

                const cachedUserData = {
                    uid: user.uid,
                    name: nickDoUsuario,
                    cargo: userProfileData.cargo || "Membro",
                    photoURL: `https://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(nickDoUsuario)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`,
                    isAdmin: userProfileData.role === 'admin'
                };
                sessionStorage.setItem('currentUserCache', JSON.stringify(cachedUserData));
                
                populateUIWithUserData(cachedUserData, userProfileData);

                window.currentUserData = userProfileData;
                window.isUserDataReady = true;
                const event = new CustomEvent('userDataReady', { detail: { userData: userProfileData } });
                document.dispatchEvent(event);
            });

        } catch (error) {
            console.error("Erro ao configurar escuta do perfil após login:", error);
        }
    }

    function updateUIAfterLogout() {
        sessionStorage.removeItem('currentUserCache');
        window.preLoadedUserData = null; 

        if (userProfileListener) {
            userProfileListener();
            userProfileListener = null;
        }
        userProfileListenerUid = null;

        const loggedInView = document.getElementById('header-user-info-logged-in');
        const loggedOutView = document.getElementById('profile-icon-logged-out');

        if(loggedInView) loggedInView.classList.add('hidden');
        if(loggedOutView) loggedOutView.classList.remove('hidden');
        
        document.body.classList.remove('user-logged-in');
        document.body.classList.add('user-logged-out');

        const topNavMenu = document.getElementById('top-nav-menu');
        const overlay = document.getElementById('overlay');
        if(topNavMenu) topNavMenu.classList.remove('active');
        if(overlay) overlay.classList.remove('active');

        window.currentUserData = null;
        window.isUserDataReady = true;
        const event = new CustomEvent('userDataReady', { detail: { userData: null } });
        document.dispatchEvent(event);
    }

    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('#logout-button');
        
        if (logoutBtn) {
            e.preventDefault();
            console.log("Iniciando processo de logout...");
            const userToLogout = auth.currentUser;
            
            if (userToLogout) {
                try {
                    if (typeof goOffline === 'function') {
                        await goOffline(userToLogout.uid); 
                    }
                    
                    updateUIAfterLogout(); 
                    await Promise.allSettled([
                        auth.signOut(),
                        fetch('/api/auth/logout', {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' }
                        })
                    ]);
                    
                    console.log("Usuário deslogado com sucesso.");
                    window.location.href = "/index.html"; 
                } catch (error) {
                    console.error("Erro ao deslogar:", error);
                    await Promise.allSettled([
                        auth.signOut(),
                        fetch('/api/auth/logout', {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: { Accept: 'application/json' }
                        })
                    ]);
                    window.location.reload();
                }
            }
        }
    });

});

const FIELD_ICONS = {
    'cargo': '/imgs/prof-imagem.png', 
    'spp': '/imgs/spp-imagem.png',          
    'da': '/imgs/da-imagem.png',            
    'cdc': '/imgs/cdc-imagem.png',         
};

// =====================================================================
// == NEXUS ALERTS: TOASTS E MODAIS GLOBAIS
// =====================================================================

// Cria o container de toasts na tela
const toastContainer = document.createElement('div');
toastContainer.id = 'nexus-toast-container';
document.body.appendChild(toastContainer);

// Cria o modal de confirmação na tela
const confirmOverlay = document.createElement('div');
confirmOverlay.id = 'nexus-confirm-overlay';
confirmOverlay.innerHTML = `
    <div class="nexus-confirm-box">
        <i class="fas fa-exclamation-triangle nexus-confirm-icon"></i>
        <p class="nexus-confirm-text" id="nexus-confirm-msg">Tem certeza?</p>
        <div class="nexus-confirm-actions">
            <button class="nexus-confirm-btn cancel" id="nexus-confirm-no">Cancelar</button>
            <button class="nexus-confirm-btn confirm" id="nexus-confirm-yes">Confirmar</button>
        </div>
    </div>
`;
document.body.appendChild(confirmOverlay);

/**
 * Mostra uma notificação flutuante (Toast)
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - 'success', 'error', ou 'info'
 */
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `nexus-toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    
    document.getElementById('nexus-toast-container').appendChild(toast);

    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Animação de saída e remoção
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Espera a animação terminar
    }, 4000); // Fica na tela por 4 segundos
};

/**
 * Mostra um modal de confirmação (Substitui o window.confirm)
 * @param {string} message - A pergunta para o usuário
 * @param {function} onConfirm - O que fazer se ele clicar em "Confirmar"
 */
window.showConfirm = function(message, onConfirm) {
    const overlay = document.getElementById('nexus-confirm-overlay');
    const msgEl = document.getElementById('nexus-confirm-msg');
    const btnYes = document.getElementById('nexus-confirm-yes');
    const btnNo = document.getElementById('nexus-confirm-no');

    msgEl.textContent = message;
    overlay.classList.add('show');

    // Remove event listeners antigos para não acumular
    btnYes.onclick = null;
    btnNo.onclick = null;

    btnNo.onclick = () => {
        overlay.classList.remove('show');
    };

    btnYes.onclick = () => {
        overlay.classList.remove('show');
        if (typeof onConfirm === 'function') onConfirm();
    };
};

setTimeout(() => {
    if (document.body.classList.contains('auth-loading') && !sessionStorage.getItem('currentUserCache')) {
        console.log("Forçando remoção do loading por tempo limite.");
        document.body.classList.remove('auth-loading');
    }
}, 5000);

// ====================================================================
// == SISTEMA DE PERMISSÕES (RBAC) E CATÁLOGO DE PÁGINAS
// ====================================================================

// Arrays convertidos para minúsculo para garantir que não haja erro de digitação no banco de dados
const ROLES_COORDENADOR = ['coordenador', 'graduador', 'estagiário', 'conselheiro', 'vice-líder', 'líder'];
const ROLES_GRADUADOR = ['graduador', 'estagiário', 'conselheiro', 'vice-líder', 'líder'];
const ROLES_CONSELHO = ['estagiário', 'conselheiro', 'vice-líder', 'líder'];
const ROLES_LIDERANCA = ['vice-líder', 'líder'];

const PAGINAS_DISPONIVEIS = [
    // === PÁGINAS GERAIS (TODOS VÊEM) ===
    { id: 'inicio', nome: 'Início', link: '/index.html', icone: 'fa-house', categoria: 'Principal' },
    { id: 'dashboard', nome: 'Dashboard', link: '/dashboard.html', icone: 'fa-chart-line', categoria: 'Principal' },
    { id: 'aniversariantes', nome: 'Aniversariantes', link: '/aniversariantes.html', icone: 'fa-cake-candles', categoria: 'Principal' },
    { id: 'athena', nome: 'Athena IA', link: '/athena.html', icone: 'fa-robot', categoria: 'Principal' },
    { id: 'companhia', nome: 'Companhia', link: '/companhia.html', icone: 'fa-briefcase', categoria: 'Principal' },
    { id: 'consulta', nome: 'Desempenho', link: '/consulta.html', icone: 'fa-magnifying-glass-chart', categoria: 'Principal' },
    { id: 'contabilidade', nome: 'Contabilidade', link: '/contabilidade.html', icone: 'fa-calculator', categoria: 'Principal' },
    { id: 'mural', nome: 'Mural', link: '/mural.html', icone: 'fa-image', categoria: 'Principal' },
    { id: 'quadro', nome: 'Quadro', link: '/quadro.html', icone: 'fa-clipboard-list', categoria: 'Principal' },
    { id: 'ranking', nome: 'Ranking', link: '/ranking.html', icone: 'fa-trophy', categoria: 'Principal' },
    { id: 'subforum', nome: 'Subfórum', link: '/subforum.html', icone: 'fa-comments', categoria: 'Principal' },
    { id: 'subgrupos', nome: 'Subgrupos', link: '/subgrupos.html', icone: 'fa-users', categoria: 'Principal' },
    { id: 'weekly', nome: 'Weekly', link: '/weekly.html', icone: 'fa-newspaper', categoria: 'Principal' },

    // === DOCUMENTOS (TODOS VÊEM) ===
    { id: 'documentos', nome: 'Documentos', link: '/documentos.html', icone: 'fa-file-lines', categoria: 'Documentos' },
    { id: 'cod_penal', nome: 'Cód. Penal', link: '/documentos/codigo-penal.html', icone: 'fa-scale-balanced', categoria: 'Documentos' },
    { id: 'grupos_int', nome: 'Grupos Int.', link: '/documentos/grupos-internos.html', icone: 'fa-people-group', categoria: 'Documentos' },
    { id: 'regimento', nome: 'Regimento', link: '/documentos/regimento.html', icone: 'fa-book-section', categoria: 'Documentos' },

    // === CURSOS - PROFESSORES (TODOS VÊEM) ===
    { id: 'prof_acl', nome: 'Prof. ACL', link: '/cursos/professores/acl.html', icone: 'fa-person-chalkboard', categoria: 'Cursos - Professores' },
    { id: 'prof_cac', nome: 'Prof. CAC', link: '/cursos/professores/cac.html', icone: 'fa-person-chalkboard', categoria: 'Cursos - Professores' },
    { id: 'prof_cap', nome: 'Prof. CAP', link: '/cursos/professores/cap.html', icone: 'fa-person-chalkboard', categoria: 'Cursos - Professores' },
    { id: 'prof_cro', nome: 'Prof. CRO', link: '/cursos/professores/cro.html', icone: 'fa-person-chalkboard', categoria: 'Cursos - Professores' },

    // === CURSOS - COORDENADORES (RESTRITO) ===
    { id: 'cur_coord', nome: 'C. Coord.', link: '/cursos/coordenadores.html', icone: 'fa-user-tie', categoria: 'Cursos - Coordenadores', roles: ROLES_COORDENADOR },
    { id: 'coord_cda', nome: 'Coord. CDA', link: '/cursos/coordenadores/cda.html', icone: 'fa-chalkboard-user', categoria: 'Cursos - Coordenadores', roles: ROLES_COORDENADOR },
    { id: 'coord_cop', nome: 'Coord. COP', link: '/cursos/coordenadores/cop.html', icone: 'fa-chalkboard-user', categoria: 'Cursos - Coordenadores', roles: ROLES_COORDENADOR },
    { id: 'coord_man', nome: 'Manual Coord.', link: '/cursos/coordenadores/manual.html', icone: 'fa-book', categoria: 'Cursos - Coordenadores', roles: ROLES_COORDENADOR },
    { id: 'coord_ori', nome: 'Orient. Coord.', link: '/cursos/coordenadores/orientações.html', icone: 'fa-compass', categoria: 'Cursos - Coordenadores', roles: ROLES_COORDENADOR },

    // === CURSOS - GRADUADORES (RESTRITO) ===
    { id: 'cur_grad', nome: 'C. Grad.', link: '/cursos/graduadores.html', icone: 'fa-user-graduate', categoria: 'Cursos - Graduadores', roles: ROLES_GRADUADOR },
    { id: 'grad_mob', nome: 'Grad. Mobile', link: '/cursos/graduadores/grad-mobile.html', icone: 'fa-mobile-screen', categoria: 'Cursos - Graduadores', roles: ROLES_GRADUADOR },
    { id: 'grad_1', nome: 'Graduação 1', link: '/cursos/graduadores/graduacao1.html', icone: 'fa-graduation-cap', categoria: 'Cursos - Graduadores', roles: ROLES_GRADUADOR },
    { id: 'grad_2', nome: 'Graduação 2', link: '/cursos/graduadores/graduacao2.html', icone: 'fa-graduation-cap', categoria: 'Cursos - Graduadores', roles: ROLES_GRADUADOR },
    
    { id: 'cur_lid', nome: 'Liderança', link: '/cursos/lideranca.html', icone: 'fa-crown', categoria: 'Liderança', roles: ROLES_LIDERANCA },

    // === CONSELHO (RESTRITO) ===
    { id: 'cons_adm', nome: 'Administração', link: '/companhia/conselho/administracao.html', icone: 'fa-briefcase', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_ass', nome: 'Assistência', link: '/companhia/conselho/assistencia.html', icone: 'fa-hand-holding-heart', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_atu1', nome: 'Atualização 1', link: '/companhia/conselho/atualizacao1.html', icone: 'fa-arrows-rotate', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_atu2', nome: 'Atualização 2', link: '/companhia/conselho/atualizacao2.html', icone: 'fa-arrows-rotate', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_cont', nome: 'Contab. Cons.', link: '/companhia/conselho/contabilidade.html', icone: 'fa-calculator', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_diario', nome: 'Diário Cons.', link: '/companhia/conselho/diario.html', icone: 'fa-book-open', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_doc', nome: 'Doc. Cons.', link: '/companhia/conselho/documentacao.html', icone: 'fa-folder-open', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_fin', nome: 'Finanças', link: '/companhia/conselho/financas.html', icone: 'fa-coins', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_forms', nome: 'Forms Cons.', link: '/companhia/conselho/forms.html', icone: 'fa-clipboard', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_prom', nome: 'Promoções', link: '/companhia/conselho/promocoes.html', icone: 'fa-arrow-trend-up', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_prop', nome: 'Propostas', link: '/companhia/conselho/proposta.html', icone: 'fa-lightbulb', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },
    { id: 'cons_seg', nome: 'Segurança', link: '/companhia/conselho/seguranca.html', icone: 'fa-shield-halved', categoria: 'Abas do Conselho', roles: ROLES_CONSELHO },

    { id: 'cons_fun', nome: 'Fisc. Assistência', link: '/cons/assistencia.html', icone: 'fa-hand-holding-heart', categoria: 'Funções do Conselho', roles: ROLES_CONSELHO },    
    { id: 'cons_fun2', nome: 'Ger. Finanças', link: '/cons/financas.html', icone: 'fa-coins', categoria: 'Funções do Conselho', roles: ROLES_CONSELHO }, 

    // === ADMIN (RESTRITO APENAS PARA ADMIN) ===
    { id: 'adm_cdc', nome: 'Admin CDC', link: '/admin/cdc.html', icone: 'fa-user-shield', categoria: 'Painel Admin', adminOnly: true },
    { id: 'adm_comp', nome: 'Admin CIA', link: '/admin/companhia.html', icone: 'fa-building', categoria: 'Painel Admin', adminOnly: true },
    { id: 'adm_da', nome: 'Admin DA', link: '/admin/da.html', icone: 'fa-user-tie', categoria: 'Painel Admin', adminOnly: true },
    { id: 'adm_painel', nome: 'Painel Admin', link: '/admin/painel.html', icone: 'fa-gear', categoria: 'Painel Admin', adminOnly: true },
    { id: 'adm_spp', nome: 'Admin SPP', link: '/admin/spp.html', icone: 'fa-user-ninja', categoria: 'Painel Admin', adminOnly: true }
];

// ====================================================================
// == LÓGICA DO MODAL, PESQUISA E SEPARAÇÃO DE CARGOS
// ====================================================================

// Atualizador do Preview de Selecionados
function updateSelectedPreview() {
    const previewContainer = document.getElementById('fav-selected-preview');
    if (!previewContainer) return;
    
    const checkedBoxes = document.querySelectorAll('.fav-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        previewContainer.innerHTML = '<span style="color: #71717a; font-size: 0.8rem; width: 100%; text-align: center;">Nenhum atalho selecionado (0/3)</span>';
        return;
    }

    let html = `<span style="color: #a29bfe; font-size: 0.8rem; font-weight: bold; width: 100%; display: block; margin-bottom: 5px;">Selecionados (${checkedBoxes.length}/3):</span>`;
    
    checkedBoxes.forEach(cb => {
        const labelSpan = cb.closest('label').querySelector('span').innerText;
        const iconClass = cb.closest('label').querySelector('i').className;
        html += `<span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(162, 155, 254, 0.2); color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; margin-bottom: 5px; margin-right: 5px;"><i class="${iconClass}"></i> ${labelSpan}</span>`;
    });
    
    previewContainer.innerHTML = html;
}

// Evento Global de Delegação (Mais seguro para modais dinâmicos)
document.addEventListener('input', (e) => {
    // 1. PESQUISA INTELIGENTE DENTRO DO MODAL
    if (e.target.id === 'fav-search-input') {
        const termo = e.target.value.toLowerCase();
        const groups = document.querySelectorAll('.fav-category-group');
        
        groups.forEach(group => {
            let hasVisibleItem = false;
            const labels = group.querySelectorAll('.fav-option-label');
            
            labels.forEach(label => {
                const texto = label.querySelector('span').innerText.toLowerCase();
                if (texto.includes(termo)) {
                    label.style.display = 'flex';
                    hasVisibleItem = true;
                } else {
                    label.style.display = 'none';
                }
            });
            
            // Esconde ou mostra a categoria inteira
            group.style.display = hasVisibleItem ? 'block' : 'none';
        });
    }
});

// Delegação para mudança dos checkboxes (Limita a 3 visuais)
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('fav-checkbox')) {
        const checkedBoxes = document.querySelectorAll('.fav-checkbox:checked');
        if (checkedBoxes.length > 3) {
            e.target.checked = false; 
            if(typeof showToast === 'function') showToast('Você só pode escolher até 3 atalhos!', 'error');
        }
        updateSelectedPreview();
    }
});


document.addEventListener('click', async (e) => {
    // 2. ABRIR O MODAL (Clique na Engrenagem)
    const btnEditFavs = e.target.closest('.edit-favs-btn');
    if (btnEditFavs) {
        e.preventDefault();
        e.stopPropagation();
        
        const modalFavs = document.getElementById('fav-modal-overlay');
        const gridOptions = document.getElementById('fav-options-grid');
        
        if (!modalFavs || !gridOptions) return;

        // Limpa a barra de pesquisa se houver
        const searchInputEl = document.getElementById('fav-search-input');
        if (searchInputEl) searchInputEl.value = ''; 

        // Cria o container do Preview se ele ainda não existir na tela
        let previewEl = document.getElementById('fav-selected-preview');
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.id = 'fav-selected-preview';
            previewEl.style.cssText = 'margin-bottom: 15px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);';
            gridOptions.parentNode.insertBefore(previewEl, gridOptions);
        }

        // Descobre quem está logado e seus cargos
        const cargoUsuario = (window.currentUserData && window.currentUserData.cargo) ? window.currentUserData.cargo.toLowerCase() : 'membro';
        const isAdmin = (window.currentUserData && (window.currentUserData.role === 'admin' || window.currentUserData.isAdmin)) ? true : false;
        
        const favoritosAtuais = (window.currentUserData && window.currentUserData.favoritos) ? window.currentUserData.favoritos : [];
        const idsAtuais = favoritosAtuais.map(fav => fav.id);

        // FILTRO DE PERMISSÕES (RBAC)
        const paginasPermitidas = PAGINAS_DISPONIVEIS.filter(pagina => {
            if (pagina.adminOnly && !isAdmin) return false;
            if (pagina.roles && !pagina.roles.includes(cargoUsuario)) return false;
            return true; // Se não tem restrição, permite
        });

        // AGRUPA AS PÁGINAS PERMITIDAS POR CATEGORIA
        const paginasPorCategoria = paginasPermitidas.reduce((acc, pagina) => {
            if (!acc[pagina.categoria]) acc[pagina.categoria] = [];
            acc[pagina.categoria].push(pagina);
            return acc;
        }, {});

        // GERA O HTML COM AS BARRINHAS DE SEPARAÇÃO E OS BOTÕES
        gridOptions.innerHTML = '';
        for (const [categoria, paginas] of Object.entries(paginasPorCategoria)) {
            let itemsHtml = '';
            paginas.forEach(pagina => {
                const isChecked = idsAtuais.includes(pagina.id) ? 'checked' : '';
                itemsHtml += `
                    <label class="fav-option-label">
                        <input type="checkbox" class="fav-checkbox" value="${pagina.id}" ${isChecked}>
                        <i class="fa-solid ${pagina.icone}"></i>
                        <span title="${pagina.nome}">${pagina.nome}</span>
                    </label>
                `;
            });
            
            gridOptions.innerHTML += `
                <div class="fav-category-group">
                    <div class="fav-category-header">
                        <span>${categoria}</span>
                        <hr>
                    </div>
                    <div class="fav-category-items">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }

        updateSelectedPreview(); // Atualiza a visualização assim que abrir
        modalFavs.classList.add('active');
    }

    // 3. FECHAR O MODAL
    const btnCloseFavs = e.target.closest('#close-fav-modal');
    if (btnCloseFavs || e.target.id === 'fav-modal-overlay') {
        const modalFavs = document.getElementById('fav-modal-overlay');
        if (modalFavs) modalFavs.classList.remove('active');
    }

    // 4. SALVAR ATALHOS NO BANCO COM TRAVA FORTE DE SEGURANÇA
    const btnSaveFavs = e.target.closest('#save-favs-btn');
    if (btnSaveFavs) {
        const user = auth.currentUser;
        if (!user) return;

        const selectedIds = Array.from(document.querySelectorAll('.fav-checkbox:checked')).map(cb => cb.value);
        
        // A TRAVA DE SEGURANÇA: Bloqueia o salvamento se tentar burlar o limite de 3
        if (selectedIds.length > 3) {
            if(typeof showToast === 'function') showToast('Máximo de 3 atalhos permitidos!', 'error');
            return;
        }

        const novosFavoritos = PAGINAS_DISPONIVEIS.filter(p => selectedIds.includes(p.id));

        try {
            btnSaveFavs.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            await db.collection('users').doc(user.uid).update({
                favoritos: novosFavoritos
            });
            
            if(typeof showToast === 'function') showToast('Atalhos atualizados com sucesso!', 'success');
            
            const modalFavs = document.getElementById('fav-modal-overlay');
            if (modalFavs) modalFavs.classList.remove('active');
            
            btnSaveFavs.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Atalhos';
        } catch (error) {
            console.error("Erro ao salvar favoritos:", error);
            if(typeof showToast === 'function') showToast('Erro ao salvar atalhos.', 'error');
            btnSaveFavs.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Atalhos';
        }
    }
});
