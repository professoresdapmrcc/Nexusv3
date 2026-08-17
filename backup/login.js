document.addEventListener('DOMContentLoaded', () => {

    // ========================================================
    // == INICIALIZAÇÃO DAS PARTÍCULAS (MUNDO ROXO)
    // ========================================================
    if (typeof particlesJS !== 'undefined') {
        particlesJS("particles-js", {
            "particles": {
                "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#ffffff" },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.6, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": true, "distance": 150, "color": "#7c319c", "opacity": 0.4, "width": 1 },
                "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" } },
                "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 1 } }, "push": { "particles_nb": 4 } }
            },
            "retina_detect": true
        });
    }

    // 1. Bloquear o botão direito do mouse (Context Menu)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Bloquear atalhos de teclado comuns para desenvolvedores
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.shiftKey) {
            const key = e.key.toUpperCase();
            if (key === 'I' || key === 'J' || key === 'C') {
                e.preventDefault();
                return false;
            }
        }
        if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            return false;
        }
    });

    let isRegistering = false; 

    const firebaseConfig = {
        apiKey: "AIzaSyDo4DagZchii1cPKFighZU5KAjppp98HJE", 
        authDomain: "nexusprof.firebaseapp.com",
        projectId: "nexusprof",
        storageBucket: "nexusprof.appspot.com",
        messagingSenderId: "268861178598",
        appId: "1:268861178598:web:9686b81bb003f9514fb127",
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const recoveryView = document.getElementById('recovery-view');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const recoveryForm = document.getElementById('recovery-form');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginFromRegisterLink = document.getElementById('show-login-from-register');
    const showLoginFromRecoveryLink = document.getElementById('show-login-from-recovery');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const recoveryMessage = document.getElementById('recovery-message');

    const verificationCodeEl = document.getElementById('verification-code');
    const recoveryVerificationCodeEl = document.getElementById('recovery-verification-code');
    const dobInput = document.getElementById('register-dob');
    const dobOptOutCheckbox = document.getElementById('register-dob-opt-out');
    
    if (dobOptOutCheckbox && dobInput) {
        dobOptOutCheckbox.addEventListener('change', () => {
            dobInput.disabled = dobOptOutCheckbox.checked;
            if (dobOptOutCheckbox.checked) dobInput.value = '';
        });
    }

    function generateVerificationCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `NEXUS-${result}`;
    }

    function displayNewCode(element) {
        if(element) element.textContent = generateVerificationCode();
    }
    
    async function verifyHabboMission(nickname, expectedCode) {
        if (!nickname || !expectedCode) return false;
        try {
            const response = await fetch(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nickname)}`);
            if (!response.ok) throw new Error('Usuário do Habbo não encontrado.');
            const data = await response.json();
            return data.motto === expectedCode;
        } catch (error) {
            console.error("Erro ao verificar missão:", error);
            throw new Error(error.message || 'Não foi possível verificar a missão.');
        }
    }
    
    auth.onAuthStateChanged(user => {
        if (user && !isRegistering) {
            window.location.href = 'index.html'; 
        }
    });

    function switchView(viewToShow) {
        [loginView, registerView, recoveryView].forEach(v => v.classList.add('hidden'));
        if (viewToShow) {
            viewToShow.classList.remove('hidden');
            if (viewToShow === registerView) displayNewCode(verificationCodeEl);
            if (viewToShow === recoveryView) displayNewCode(recoveryVerificationCodeEl);
        }
    }

    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchView(registerView); });
    if (showLoginFromRegisterLink) showLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); switchView(loginView); });
    if (showLoginFromRecoveryLink) showLoginFromRecoveryLink.addEventListener('click', (e) => { e.preventDefault(); switchView(loginView); });
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); switchView(recoveryView); });

    // --- Lógica de Registro ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            isRegistering = true; 
            
            setLoadingState(registerForm, true, "Verificando...");
            registerMessage.textContent = '';
            
            const nick = document.getElementById('register-usuario').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-senha').value;
            const dob = dobInput.disabled ? null : dobInput.value;
            const code = verificationCodeEl.textContent;
            
            try {
                // ETAPA 1
                const isMissionVerified = await verifyHabboMission(nick, code);
                if (!isMissionVerified) throw new Error('Código na missão não corresponde.');

                // ETAPA 2
                setLoadingState(registerForm, true, "Cadastrando...");
                const nickLower = nick.toLowerCase();
                const safeId = btoa(nickLower); 

                const checkNew = await db.collection('nicknames').doc(safeId).get();
                let exists = checkNew.exists;

                if (!exists) {
                    try {
                        if (!nickLower.startsWith('.')) { 
                             const checkOld = await db.collection('nicknames').doc(nickLower).get();
                             if (checkOld.exists) exists = true;
                        }
                    } catch(e) {}
                }

                if (exists) throw new Error('Este nome de usuário já está em uso.');

                // ETAPA 3, 4 e 5 - COM VERIFICAÇÃO E ROLLBACK
                let user = null;
                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    user = userCredential.user;
                    
                    // CORREÇÃO: removido { merge: true } para que o Firestore sempre trate
                    // como CREATE, garantindo que a regra allow create seja aplicada corretamente
                    // e o campo email seja sempre salvo.
                    await db.collection('users').doc(user.uid).set({
                        uid: user.uid, 
                        name: nick, 
                        email: email,
                        dob: dob,
                        cargo: 'Membro', 
                        spp: '', 
                        da: '', 
                        cdc: '', 
                        status: 'Pendente',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // CORREÇÃO: removido { merge: true } pelo mesmo motivo
                    await db.collection('nicknames').doc(safeId).set({ 
                        uid: user.uid,
                        email_vinculado: email
                    });
                    
                } catch (writeError) {
                    if (user) {
                        try {
                            await user.delete();
                            console.log("Rollback: conta do Auth deletada com sucesso.");
                        } catch (deleteError) {
                            console.error("ROLLBACK FALHOU — delete manualmente o UID:", user.uid, deleteError);
                        }
                    }
                    throw writeError;
                }
                
                await auth.signOut();

                registerMessage.className = 'success-message';
                registerMessage.innerHTML = 'Cadastro realizado! <br> Aguarde um administrador ativar sua conta.';
                
                setTimeout(() => {
                    switchView(loginView);
                    loginMessage.className = ''; 
                    loginMessage.style.color = 'orange';
                    loginMessage.textContent = 'Aguarde a ativação da sua conta para entrar.';
                }, 4000);
                
            } catch (error) {
                registerMessage.className = 'error-message';
                registerMessage.textContent = getFirebaseErrorMessage(error);
                
                if (auth.currentUser) await auth.signOut();
                isRegistering = false;

            } finally {
                setLoadingState(registerForm, false, "Verificar e Cadastrar");
            }
        });
    }

    // --- Lógica de Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoadingState(loginForm, true, 'Aguarde...');
            loginMessage.textContent = '';
            loginMessage.style.color = ''; 
            
            const nick = document.getElementById('login-usuario').value;
            const password = document.getElementById('login-senha').value;

            try {
                const nickLower = nick.toLowerCase();
                const safeId = btoa(nickLower);
                
                let nickRef = db.collection('nicknames').doc(safeId);
                let nickDoc = await nickRef.get();

                if (!nickDoc.exists) {
                    try {
                        const oldRef = db.collection('nicknames').doc(nickLower); 
                        const oldDoc = await oldRef.get();
                        if (oldDoc.exists) {
                            nickDoc = oldDoc;
                            nickRef = oldRef;
                        }
                    } catch (e) {}
                }

                if (!nickDoc.exists) throw new Error("Usuário ou senha inválidos.");
                
                const uid = nickDoc.data().uid;
                const userDoc = await db.collection('users').doc(uid).get();
                if (!userDoc.exists) throw new Error("Dados de perfil não encontrados.");
                
                const userProfileData = userDoc.data();

                if (userProfileData.status !== 'Ativo') {
                    if (userProfileData.status === 'Pendente') {
                        throw new Error("Cadastro em análise. Aguarde aprovação de um Administrador.");
                    } else if (userProfileData.status === 'Banido') {
                        throw new Error("Esta conta foi suspensa.");
                    } else {
                        throw new Error("Acesso negado: Conta inativa.");
                    }
                }
                
                const email = userProfileData.email;
                await auth.signInWithEmailAndPassword(email, password);

                sessionStorage.setItem('userProfile', JSON.stringify(userProfileData));

            } catch (error) {
                const customMessage = getFirebaseErrorMessage(error);

                if (error.message.includes('Cadastro em análise') || error.message.includes('Acesso negado') || error.message.includes('banida')) {
                    loginMessage.textContent = error.message;
                    loginMessage.style.color = 'orange'; 
                } else if (error.message.includes('Usuário ou senha inválidos') || customMessage.includes('Usuário ou senha')) {
                    loginMessage.textContent = "Usuário ou senha inválidos.";
                } else {
                    loginMessage.textContent = customMessage;
                }
            } finally {
                setLoadingState(loginForm, false, 'Avançar');
            }
        });
    }

    // --- Lógica de Recuperação de Senha ---
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoadingState(recoveryForm, true, "Verificando...");
            recoveryMessage.textContent = '';

            const email = document.getElementById('recovery-email').value;
            const code = recoveryVerificationCodeEl.textContent;

            try {
                const usersRef = db.collection('users');
                const query = usersRef.where('email', '==', email).limit(1);
                const snapshot = await query.get();

                if (snapshot.empty) throw new Error('E-mail não encontrado em nosso sistema.');
                
                const userData = snapshot.docs[0].data();
                const nickname = userData.name;

                const isMissionVerified = await verifyHabboMission(nickname, code);
                if (!isMissionVerified) throw new Error('Código na missão não corresponde.');

                setLoadingState(recoveryForm, true, "Enviando...");
                await auth.sendPasswordResetEmail(email);
                
                recoveryMessage.className = 'success-message';
                recoveryMessage.textContent = 'Link enviado! Verifique sua caixa de entrada e spam.';
                
                setTimeout(() => switchView(loginView), 4000);

            } catch (error) {
                recoveryMessage.className = 'error-message';
                recoveryMessage.textContent = getFirebaseErrorMessage(error);
            } finally {
                setLoadingState(recoveryForm, false, "Verificar e Enviar Link");
            }
        });
    }

    // --- Funções Auxiliares ---
    function setLoadingState(form, isLoading, text) {
        if (!form) return;
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = isLoading;
            button.textContent = isLoading ? text : (form.id === 'login-form' ? 'Avançar' : form.id === 'register-form' ? 'Verificar e Cadastrar' : 'Verificar e Enviar Link');
        }
    }

    function getFirebaseErrorMessage(error) {
        // Se for um erro que nós mesmos criamos (ex: conta pendente/banida), mostra ele:
        if (error.message && !error.code) return error.message;

        switch (error.code) {
            case 'auth/email-already-in-use': 
                return 'Este e-mail já está em uso.';
            case 'auth/weak-password': 
                return 'A senha deve ter no mínimo 6 caracteres.';
            
            // AGRUPANDO TODOS OS ERROS DE LOGIN EM UMA ÚNICA MENSAGEM:
            case 'auth/user-not-found': 
            case 'auth/wrong-password': 
            case 'auth/invalid-credential': 
            case 'auth/invalid-login-credentials':
            case 'auth/internal-error':
            case 'auth/invalid-email':
                return 'Usuário ou senha inválidos.';
                
            case 'auth/too-many-requests':
                return 'Muitas tentativas falhas. Aguarde um momento e tente novamente.';
                
            default: 
                console.error("Erro Firebase não tratado:", error);
                return 'Ocorreu um erro inesperado. Tente novamente. Detalhes no console.';
        }
    }

    // ========================================================
    // == LÓGICA DE MOSTRAR/OCULTAR SENHA (OLHINHO)
    // ========================================================
    window.togglePassword = function(inputId, iconElement) {
        const passwordInput = document.getElementById(inputId);
        if (!passwordInput) return;

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            iconElement.textContent = "🙈"; 
        } else {
            passwordInput.type = "password";
            iconElement.textContent = "👁️"; 
        }
    };
});