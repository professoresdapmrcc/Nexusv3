function initializePresenceSystem() {
    
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error("Firebase não foi inicializado. O sistema de presença não pode iniciar.");
        return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    
    console.log("✅ Sistema de Presença (Firestore) inicializado.");

    const goOnline = (uid) => {
        if (uid) db.collection('users').doc(uid).update({ estado: 'online' });
    };

    const goOffline = (uid) => {
        if (uid) db.collection('users').doc(uid).update({ estado: 'offline' });
    };

    // ==========================================================
    // == CORREÇÃO APLICADA AQUI
    // ==========================================================
    let currentUserId = null; // Variável para "lembrar" quem estava logado

    auth.onAuthStateChanged(user => {
        // Remove o listener antigo para não duplicar eventos de 'beforeunload'
        if (currentUserId) {
            window.removeEventListener('beforeunload', () => goOffline(currentUserId));
        }

        if (user) {
            // --- USUÁRIO ENTROU ---
            currentUserId = user.uid; // Guarda o ID do usuário atual
            goOnline(currentUserId);

            // Adiciona o evento para quando a aba for fechada
            window.addEventListener('beforeunload', () => goOffline(currentUserId));
        } else {
            // --- USUÁRIO SAIU (CLICOU EM LOGOUT) ---
            if (currentUserId) {
                goOffline(currentUserId); // Usa o ID guardado para marcar como offline
                currentUserId = null;     // Limpa a variável
            }
        }
    });

    const onlineCountElement = document.getElementById('online-count');
    const onlineUsersListElement = document.getElementById('online-users-list');

    function displayOnlineUsers() {
        if (!onlineUsersListElement || !onlineCountElement) {
            console.warn("⚠️ Elementos do painel de usuários online não encontrados no DOM.");
            return;
        }

        db.collection("users").where("estado", "==", "online")
            .onSnapshot((snapshot) => {
                onlineUsersListElement.innerHTML = '';
                const onlineCount = snapshot.size;
                onlineCountElement.textContent = onlineCount;

                if (snapshot.empty) {
                    onlineUsersListElement.innerHTML = '<li class="loading-message">Ninguém online no momento.</li>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    const nickname = userData.name || "Usuário";
                    const cargo = userData.cargo || "Membro";
                    
                    const li = document.createElement('li');
                    li.className = 'online-user-item';
                    
                    li.innerHTML = `
                        <a href="/membros/${encodeURIComponent(nickname)}" class="online-user-item">
                            <div class="avatar-container">
                                <img class="avatar" src="http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(nickname)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=1&size=b" alt="${nickname}">
                                <div class="online-indicator"></div>
                            </div>
                            <div class="user-info">
                                <span class="nickname">${nickname}</span>
                                <span class="cargo">${cargo}</span>
                            </div>
                        </a>
                    `;
                    onlineUsersListElement.appendChild(li);
                });

            }, (error) => {
                console.error("Erro ao buscar usuários online: ", error);
                onlineCountElement.textContent = "X";
                onlineUsersListElement.innerHTML = '<li class="loading-message">Erro ao carregar.</li>';
            });
    }

    displayOnlineUsers();

    const onlineToggleBtn = document.getElementById('online-toggle-btn');
    const onlinePanel = document.getElementById('online-panel');
    const closeOnlinePanelBtn = document.getElementById('close-online-panel-btn');
    const overlay = document.getElementById('overlay');

    if (onlineToggleBtn && onlinePanel && closeOnlinePanelBtn && overlay) {
        const closePanel = () => {
            onlinePanel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('noscroll');
        };
        onlineToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onlinePanel.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('noscroll');
        });
        closeOnlinePanelBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', () => {
             if (onlinePanel.classList.contains('active')) closePanel();
        });
    }
}

const observer = new MutationObserver((mutationsList, observer) => {
    if (document.getElementById('online-toggle-btn')) { 
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            initializePresenceSystem();
            observer.disconnect();
        } else {
            setTimeout(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    initializePresenceSystem();
                    observer.disconnect();
                }
            }, 500);
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });