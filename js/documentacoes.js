// Arquivo: /js/documentacoes.js
// Gerencia o acesso aos botões de documentação com base no status e cargo do usuário.

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ documentacoes.js carregado e DOM pronto.");

    // Array de cargos que podem acessar os documentos mesmo com status 'INATIVO'.
    // Adicione ou remova cargos conforme necessário.
    const cargosComAcessoInativo = [
        'Professor(a)',
        'Coordenador(a)',
        'Graduador(a)',
        'Estagiário(a)',
        'Conselheiro(a)',
        'Vice-Líder',
        'Líder',
        'admin'
    ];

    // Seleciona todos os itens de documento para poder manipulá-los.
    const docItems = document.querySelectorAll('.doc-item');

    /**
     * Função principal que habilita ou desabilita o acesso aos documentos.
     * @param {object | null} userData - Os dados do usuário do Firestore, ou null se deslogado.
     */
    const gerenciarAcessoDocumentos = (userData) => {
        // Se não houver dados do usuário, a verificação de auth já terá redirecionado.
        if (!userData) {
            console.log("Nenhum dado de usuário encontrado.");
            return;
        }

        console.log("Verificando permissões para o usuário:", userData.displayName);

        // Condições para o bloqueio:
        const isInactive = userData.status === 'Inativo';
        const hasBypassRole = cargosComAcessoInativo.includes(userData.cargo);

        // Bloqueia o acesso se o usuário estiver INATIVO e NÃO tiver um cargo de permissão.
        if (isInactive && !hasBypassRole) {
            console.warn("Acesso restrito: Usuário INATIVO sem cargo de permissão.");
            
            docItems.forEach(item => {
                const button = item.querySelector('.doc-button');
                const description = item.querySelector('.doc-description');

                // Adiciona a classe 'disabled' para aplicar o estilo CSS de bloqueio.
                item.classList.add('disabled');
                
                // Remove o link e adiciona uma dica sobre o motivo do bloqueio.
                if (button) {
                    button.removeAttribute('href');
                    button.setAttribute('title', 'Acesso negado. Seu status está como INATIVO.');
                }
                
                if (description) {
                    description.textContent = "Você não tem permissão para acessar este documento.";
                }
            });
        } else {
            // Caso contrário (usuário ATIVO ou com cargo de permissão), garante que o acesso está liberado.
            // O HTML já está correto por padrão, então nenhuma ação é necessária aqui,
            // a menos que o estado do usuário pudesse mudar dinamicamente na mesma página.
            console.log("Acesso aos documentos permitido.");
        }
    };

    // Observador do status de autenticação do Firebase.
    // É a primeira barreira: o usuário está logado ou não?
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado.
            // Agora, esperamos o evento 'userDataReady' do global.js para obter os dados do Firestore.
            console.log("Usuário autenticado. Aguardando dados do perfil...");
        } else {
            // Usuário não está logado. Redireciona para a página de criação de conta.
            console.error("Usuário não autenticado. Redirecionando...");
            window.location.href = '/login.html'; // Mude para sua página de login/registro
        }
    });

    // Ouve o evento 'userDataReady' que é disparado pelo seu global.js.
    // Este evento carrega os detalhes do usuário (status, cargo, etc.).
    document.addEventListener('userDataReady', (event) => {
        const userData = event.detail.userData;
        gerenciarAcessoDocumentos(userData);
    });
});