const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDo4DagZchii1cPKFighZU5KAjppp98HJE',
    authDomain: 'nexusprof.firebaseapp.com',
    projectId: 'nexusprof',
    storageBucket: 'nexusprof.appspot.com',
    messagingSenderId: '268861178598',
    appId: '1:268861178598:web:9686b81bb003f9514fb127',
};

// Deve acompanhar a chave de `netlify/functions/nexus-auth-state.mjs`.
// A reativação exige autorização explícita.
const NEXUS_LOGIN_API_ENABLED = false;

function applyLoginAvailability() {
    const loginButton = document.querySelector('[data-login-endpoint]');
    const label = loginButton?.querySelector('.rccsystem-login-button__label');
    const note = document.getElementById('rcc-login-note');
    if (!loginButton) return;

    if (NEXUS_LOGIN_API_ENABLED) {
        loginButton.href = loginButton.dataset.loginEndpoint;
        loginButton.classList.remove('is-temporarily-disabled');
        loginButton.removeAttribute('aria-disabled');
        if (label) label.textContent = 'Entre com o RCCSystem';
        if (note) note.textContent = 'Você será redirecionado ao RCCSystem e retornará para a página inicial.';
        return;
    }

    loginButton.href = '#';
    loginButton.classList.add('is-temporarily-disabled');
    loginButton.setAttribute('aria-disabled', 'true');
    if (label) label.textContent = 'Login temporariamente indisponível';
    if (note) note.textContent = 'Novas entradas estão pausadas temporariamente. Sessões já ativas não serão afetadas.';
    loginButton.addEventListener('click', (event) => event.preventDefault());
}

function cleanLoginUrl(params) {
    ['motivo', 'oidc', 'erro'].forEach((key) => params.delete(key));
    const query = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

function showLoginMessage(message) {
    const element = document.getElementById('login-message');
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
}

async function completeRccSystemLogin(params) {
    showLoginMessage('Concluindo o login com o RCCSystem...');

    try {
        const response = await fetch('/api/auth/firebase-token', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 && payload.error === 'account_inactive') {
            throw new Error('account_inactive');
        }
        if (!response.ok || typeof payload.customToken !== 'string') {
            throw new Error(payload.error || 'Não foi possível criar a sessão.');
        }

        if (!window.firebase) throw new Error('O serviço de sessão não foi carregado.');
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        await firebase.auth().signInWithCustomToken(payload.customToken);

        cleanLoginUrl(params);
        window.location.replace('/index.html');
    } catch (error) {
        console.error('Falha ao concluir Login com RCCSystem.', { message: error?.message });
        showLoginMessage(error?.message === 'account_inactive'
            ? 'Sua conta não está ativa no NEXUS.'
            : 'Não foi possível concluir sua sessão. Tente entrar novamente.');
        params.delete('oidc');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function initializeParticles() {
    if (typeof window.particlesJS !== 'function') return;

    window.particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.6, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#7c319c', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, direction: 'none' },
        },
        interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' } },
            modes: { grab: { distance: 140, line_linked: { opacity: 1 } }, push: { particles_nb: 4 } },
        },
        retina_detect: true,
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyLoginAvailability();
    const params = new URLSearchParams(window.location.search);
    const messages = {
        'conta-inativa': 'Sua sessão foi encerrada porque esta conta não está ativa.',
        'sem-acesso': 'Seu vínculo atual não permite acessar este sistema.',
        expirado: 'O login expirou. Entre novamente para continuar.',
        vinculo: 'Não foi possível vincular sua conta automaticamente. Contate a liderança.',
        indisponivel: 'O Login com RCCSystem está temporariamente indisponível.',
        oidc: 'Não foi possível validar o Login com RCCSystem. Tente novamente.',
    };

    if (!NEXUS_LOGIN_API_ENABLED) {
        showLoginMessage(messages.indisponivel);
        cleanLoginUrl(params);
    } else if (params.get('oidc') === 'complete') {
        void completeRccSystemLogin(params);
    } else {
        const reason = params.get('motivo') || params.get('oidc') || params.get('erro');
        if (reason && messages[reason]) {
            showLoginMessage(messages[reason]);
            cleanLoginUrl(params);
        }
    }

    initializeParticles();
});
