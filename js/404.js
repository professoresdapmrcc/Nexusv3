// js/404.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Garante que o vídeo do grifo reproduza no iOS/Mobile (Muted/Autoplay Policy)
    const grifoVideo = document.querySelector('.video-zero video');
    
    if (grifoVideo) {
        // Tenta forçar a reprodução silenciosa assim que a página carregar
        let playPromise = grifoVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Caso o navegador bloqueie o autoplay
                console.warn("Autoplay do grifo foi bloqueado pelo navegador. Tentando forçar...", error);
                grifoVideo.muted = true;
                grifoVideo.play();
            });
        }
    }

    // 2. Remove o loader caso exista (aproveitando o seu padrão de 'auth-loading')
    // Se o seu loader.js já faz isso, isso atua como um fallback para garantir 
    // que o 404 apareça mesmo se o usuário não estiver logado.
    setTimeout(() => {
        if(document.body.classList.contains('auth-loading')) {
            document.body.classList.remove('auth-loading');
        }
    }, 500);
});