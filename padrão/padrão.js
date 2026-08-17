// ====================================================================
// ==      SCRIPT COMPLETO E CORRIGIDO PARA O SISTEMA DE LOGIN      ==
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ---- INICIALIZAÇÃO DO FIREBASE (COM SEUS DADOS) ----
    const firebaseConfig = {
      apiKey: "AIzaSyDo4DagZchii1cPKFighZU5KAjppp98HJE",
      authDomain: "nexusprof.firebaseapp.com",
      projectId: "nexusprof",
      storageBucket: "nexusprof.appspot.com",
      messagingSenderId: "268861178598",
      appId: "1:268861178598:web:9686b81bb003f9514fb127",
      measurementId: "G-MY150DZMTM"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ---- REFERÊNCIAS E LÓGICA DO SEU SITE ----
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('overlay');
    const body = document.body;

    // ===================================
// == LÓGICA DO BOTÃO DE PESQUISA ==
// ===================================
const sidebarSearchForm = document.getElementById('sidebar-search-form');

if (sidebarSearchForm) {
    sidebarSearchForm.addEventListener('submit', (e) => {
        // 1. Impede o recarregamento padrão da página
        e.preventDefault();

        // 2. Pega o campo de input e o valor digitado
        const searchInput = document.getElementById('sidebar-search-input');
        const memberName = searchInput.value.trim(); // .trim() remove espaços

        // 3. Verifica se algo foi digitado
        if (memberName !== '') {
            // 4. Redireciona para a página de pesquisa
            // ATENÇÃO: Crie uma página chamada "pesquisa.html" ou mude o nome abaixo
            window.location.href = `/pesquisa.html?membro=${encodeURIComponent(memberName)}`;
        }
    });
}

    function closeMenu() { /* ... Lógica do seu menu ... */ }
    function openMenu() { /* ... Lógica do seu menu ... */ }
    if (menuToggle && sidebarMenu && overlay) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebarMenu.classList.contains('active')) { closeMenu(); } else { openMenu(); }
        });
        overlay.addEventListener('click', closeMenu);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebarMenu.classList.contains('active')) { closeMenu(); }
        });
    }

    const profileArea = document.querySelector('.profile-area');
    const loginPopup = document.getElementById('login-popup');
    const profileIconLoggedOut = document.getElementById('profile-icon-logged-out');
    const headerUserInfoLoggedIn = document.getElementById('header-user-info-logged-in');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutButton = document.getElementById('logout-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');

    // CORREÇÃO: Lógica do clique no perfil agora verifica o status de login
    if (profileArea) {
        profileArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. Verifica se o usuário está logado
            if (auth.currentUser) {
                // Se estiver, garante que a view do dashboard seja exibida
                switchView(dashboardView);
            } else {
                // Se não estiver, garante que a view de login seja exibida
                switchView(loginView);
            }

            // 2. Agora, abre ou fecha o popup
            if (loginPopup) {
                loginPopup.classList.toggle('active');
            }
        });
    }

    if (loginPopup) {
        document.addEventListener('click', (e) => {
            if (!loginPopup.contains(e.target) && profileArea && !profileArea.contains(e.target)) {
                loginPopup.classList.remove('active');
            }
        });
    }

    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchView(registerView); });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchView(loginView); });
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDocRef = db.collection('users').doc(user.uid);
            const doc = await userDocRef.get();
            if (doc.exists) {
                updateUIAfterLogin(doc.data());
            } else {
                console.error("Usuário autenticado mas sem perfil no Firestore. Deslogando.");
                auth.signOut();
            }
        } else {
            updateUIAfterLogout();
        }
    });

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoadingState(registerForm, true);
            registerMessage.textContent = '';
            
            const nick = document.getElementById('register-usuario').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-senha').value;
            
            const nickRef = db.collection('nicknames').doc(nick.toLowerCase());
            const nickDoc = await nickRef.get();

            if (nickDoc.exists) {
                registerMessage.textContent = 'Este nome de usuário já está em uso.';
                setLoadingState(registerForm, false);
                return;
            }

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                const userProfileData = {
                    uid: user.uid, name: nick, email: email, imageUrl: '',
                    cargo: 'Membro', spp: '', da: '', cdc: ''
                };
                await db.collection('users').doc(user.uid).set(userProfileData);
                await nickRef.set({ uid: user.uid });

                registerMessage.textContent = 'Cadastro realizado com sucesso!';
                registerMessage.style.color = '#34c759';
                setTimeout(() => { switchView(loginView); }, 2000);

            } catch (error) {
                registerMessage.textContent = error.message;
            } finally {
                setLoadingState(registerForm, false);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoadingState(loginForm, true);
            loginMessage.textContent = '';
            
            const nick = document.getElementById('login-usuario').value;
            const password = document.getElementById('login-senha').value;
            
            try {
                const nickRef = db.collection('nicknames').doc(nick.toLowerCase());
                const nickDoc = await nickRef.get();
                if (!nickDoc.exists) { throw new Error("Usuário ou senha inválidos."); }
                
                const uid = nickDoc.data().uid;
                const userDocRef = db.collection('users').doc(uid);
                const userDoc = await userDocRef.get();
                if (!userDoc.exists) { throw new Error("Dados de perfil não encontrados."); }
                const email = userDoc.data().email;

                await auth.signInWithEmailAndPassword(email, password);
                if (loginPopup) setTimeout(() => loginPopup.classList.remove('active'), 500);

            } catch(error) {
                loginMessage.textContent = "Usuário ou senha inválidos.";
            } finally {
                setLoadingState(loginForm, false);
            }
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Digite o e-mail associado à sua conta para receber o link de recuperação:");
            if (email) {
                auth.sendPasswordResetEmail(email)
                    .then(() => { alert("Link de recuperação enviado! Verifique sua caixa de entrada."); })
                    .catch((error) => { alert(`Erro: ${error.message}`); });
            }
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => { auth.signOut(); });
    }

    function switchView(viewToShow) {
        if (!loginView || !registerView || !dashboardView) return;
        [loginView, registerView, dashboardView].forEach(v => v.classList.add('hidden'));
        if (viewToShow) viewToShow.classList.remove('hidden');
    }

    // CORREÇÃO: A função abaixo agora usa os IDs corretos do seu HTML para preencher as informações
    function updateUIAfterLogin(firebaseUserData) {
        const perfilWebAppUrl = 'https://script.google.com/macros/s/AKfycbxkbXBIcfgHrmjVgb1ksj1AJnsVx-f1r83KnlJespGSghnhXs6J_wqASXWuB3IF0XTI/exec'; 
        const nickDoUsuario = firebaseUserData.name;

        // Mostra estado de carregamento inicial
        profileIconLoggedOut.classList.add('hidden');
        headerUserInfoLoggedIn.classList.remove('hidden');
        document.getElementById('header-user-img').src = `http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${nickDoUsuario}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
        document.getElementById('header-user-name').textContent = nickDoUsuario;
        document.getElementById('user-main-role').textContent = 'Carregando...';
        switchView(dashboardView);
        document.getElementById('dashboard-user-photo').src = `http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${nickDoUsuario}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
        document.getElementById('dashboard-user-name').textContent = nickDoUsuario;
        const rolesContainer = document.getElementById('dashboard-user-roles-container');
        rolesContainer.innerHTML = '<span class="user-role-item">Carregando perfil...</span>';
        
        // Busca os dados da planilha
        fetch(`${perfilWebAppUrl}?nick=${encodeURIComponent(nickDoUsuario)}`)
            .then(response => response.json())
            .then(perfilDaPlanilha => {
                if (perfilDaPlanilha && !perfilDaPlanilha.error) {
                    const imageUrl = perfilDaPlanilha.imageUrl && (perfilDaPlanilha.imageUrl.startsWith('https') || perfilDaPlanilha.imageUrl.startsWith('http')) 
                        ? perfilDaPlanilha.imageUrl 
                        : 'http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${nickDoUsuario}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l';

                    document.getElementById('header-user-img').src = imageUrl;
                    document.getElementById('dashboard-user-photo').src = imageUrl;
                    document.getElementById('user-main-role').textContent = perfilDaPlanilha.cargo || '';
                    const userSubgroupsContainer = document.getElementById('user-subgroups-container');
                    userSubgroupsContainer.innerHTML = '';
                    
                    rolesContainer.innerHTML = ''; 
                    const roles = [perfilDaPlanilha.cargo, perfilDaPlanilha.spp, perfilDaPlanilha.da, perfilDaPlanilha.cdc];
                    roles.forEach(roleText => {
                        if (roleText && roleText.trim() !== '') {
                            const roleElement = document.createElement('span');
                            roleElement.className = 'user-role-item';
                            roleElement.textContent = roleText;
                            rolesContainer.appendChild(roleElement);
                        }
                    });
                } else {
                    rolesContainer.innerHTML = `<span class="user-role-item">${perfilDaPlanilha.error || 'Perfil não encontrado.'}</span>`;
                }
            })
            .catch(error => {
                console.error("Erro na comunicação com a planilha:", error);
                rolesContainer.innerHTML = '<span class="user-role-item">Falha ao carregar perfil.</span>';
            });
    }

    function updateUIAfterLogout() {
        headerUserInfoLoggedIn.classList.add('hidden');
        profileIconLoggedOut.classList.remove('hidden');
        switchView(loginView);
        if(loginForm) loginForm.reset();
        if(loginPopup) loginPopup.classList.remove('active');
    }

    function setLoadingState(form, isLoading) {
        if (!form) return;
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Aguarde...' : (form.id === 'login-form' ? 'Avançar' : 'Cadastrar');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const menuToggle = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('overlay');
    const body = document.body;

    // Função para fechar o menu
    function closeMenu() {
        sidebarMenu.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('noscroll');
    }

    // Função para abrir o menu
    function openMenu() {
        sidebarMenu.classList.add('active');
        overlay.classList.add('active');
        body.classList.add('noscroll');
    }

    // Verifica se os elementos essenciais existem
    if (menuToggle && sidebarMenu && overlay) {
        
        // Evento de clique no ícone de menu
        menuToggle.addEventListener('click', (e) => {
            // Impede que o clique se propague para outros elementos
            e.stopPropagation(); 
            
            // Verifica se o menu já está aberto para decidir se abre ou fecha
            if (sidebarMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Evento de clique no overlay (para fechar o menu)
        overlay.addEventListener('click', closeMenu);
        
        // Evento para fechar o menu com a tecla "Escape"
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebarMenu.classList.contains('active')) {
                closeMenu();
            }
        });
    }

});
