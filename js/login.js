document.addEventListener('DOMContentLoaded', async () => {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: '#ffffff' },
                shape: { type: 'circle' },
                opacity: { value: 0.6, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: '#7c319c', opacity: 0.4, width: 1 },
                move: { enable: true, speed: 2, direction: 'none' }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' }
                },
                modes: {
                    grab: { distance: 140, line_linked: { opacity: 1 } },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });
    }

    const firebaseConfig = {
        apiKey: 'AIzaSyDo4DagZchii1cPKFighZU5KAjppp98HJE',
        authDomain: 'nexusprof.firebaseapp.com',
        projectId: 'nexusprof',
        storageBucket: 'nexusprof.appspot.com',
        messagingSenderId: '268861178598',
        appId: '1:268861178598:web:9686b81bb003f9514fb127'
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth();
    const loginButton = document.getElementById('rccsystem-login-button');
    const loginMessage = document.getElementById('login-message');
    const query = new URLSearchParams(window.location.search);
    let completingLogin = query.get('oidc') === 'complete';

    const messages = {
        'conta-inativa': 'Sua conta não está ativa no Nexus.',
        indisponivel: 'O login com RCCSystem está temporariamente indisponível. Tente novamente.',
        expirado: 'A tentativa de login expirou. Inicie o acesso novamente.',
        'sem-acesso': 'Sua conta RCCSystem não possui acesso ao Nexus.',
        vinculo: 'Não foi possível vincular sua conta automaticamente. Procure um administrador.',
        oidc: 'Não foi possível concluir o login com RCCSystem. Tente novamente.'
    };

    function showMessage(message, type = 'error') {
        if (!loginMessage) return;
        loginMessage.textContent = message;
        loginMessage.classList.toggle('success-message', type === 'success');
        loginMessage.classList.toggle('error-message', type !== 'success');
    }

    function setLoading(isLoading) {
        if (!loginButton) return;
        loginButton.classList.toggle('is-loading', isLoading);
        loginButton.setAttribute('aria-disabled', String(isLoading));
        loginButton.style.pointerEvents = isLoading ? 'none' : '';
        const label = loginButton.querySelector('.rccsystem-login-button__label');
        if (label) label.textContent = isLoading ? 'Concluindo acesso...' : 'Entre com o RCCSystem';
    }

    function cleanLoginQuery() {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    auth.onAuthStateChanged((user) => {
        if (user && !completingLogin) window.location.replace('/index.html');
    });

    const reason = query.get('motivo') || query.get('erro');
    if (reason && messages[reason]) {
        showMessage(messages[reason]);
        cleanLoginQuery();
    }

    if (!completingLogin) return;

    setLoading(true);
    showMessage('Validando sua sessão com o RCCSystem...', 'success');

    try {
        const response = await fetch('/api/auth/firebase-token', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || typeof result.customToken !== 'string') {
            if (result.error === 'bridge_expired') throw new Error(messages.expirado);
            if (result.error === 'account_inactive') throw new Error(messages['sem-acesso']);
            throw new Error(messages.indisponivel);
        }

        await auth.signInWithCustomToken(result.customToken);
        sessionStorage.removeItem('userProfile');
        localStorage.removeItem('nexus_trava_redefinicao');
        cleanLoginQuery();
        window.location.replace('/index.html');
    } catch (error) {
        completingLogin = false;
        cleanLoginQuery();
        setLoading(false);
        showMessage(error?.message || messages.oidc);
    }
});
