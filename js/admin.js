document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // == INICIALIZAÇÃO DO FIREBASE (COPIADO DO SEU SCRIPT)
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

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ===================================
    // == LÓGICA DA PÁGINA DE ADMIN
    // ===================================
    const statusMessage = document.getElementById('status-message');
    const editorContainer = document.getElementById('editor-container');
    const editorTextarea = document.getElementById('editor-de-texto');
    const saveButton = document.getElementById('btn-salvar');
    
    // Referência ao documento no Firestore onde o conteúdo será salvo
    const contentRef = db.collection('conteudoPublico').doc('paginaPrincipal');

    // VERIFICA AUTENTICAÇÃO E PERMISSÕES
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado. Agora, vamos verificar se ele é um Admin.
            const userDocRef = db.collection('users').doc(user.uid);
            userDocRef.get().then(doc => {
                if (doc.exists && doc.data().cargo === 'Admin') {
                    // Usuário é um Admin! Inicia o editor.
                    initializeEditor();
                } else {
                    // Usuário não é admin ou não tem o campo 'cargo'.
                    statusMessage.innerHTML = '<p>Acesso Negado. Você não tem permissão para ver esta página.</p>';
                }
            }).catch(error => {
                console.error("Erro ao buscar dados do usuário:", error);
                statusMessage.innerHTML = '<p>Ocorreu um erro ao verificar suas permissões.</p>';
            });
        } else {
            // Usuário não está logado.
            statusMessage.innerHTML = '<p>Por favor, faça login para acessar o painel de administração.</p>';
        }
    });

    // FUNÇÃO QUE INICIA O EDITOR
    function initializeEditor() {
        // Esconde a mensagem de status e mostra o editor
        statusMessage.classList.add('hidden');
        editorContainer.classList.remove('hidden');

        // Carrega o conteúdo existente do Firestore
        contentRef.get().then(doc => {
            if (doc.exists && doc.data().html) {
                editorTextarea.value = doc.data().html;
            }
        });

        // Adiciona a lógica ao botão de salvar
        saveButton.addEventListener('click', () => {
            const newContent = editorTextarea.value;
            saveButton.textContent = 'Salvando...';
            saveButton.disabled = true;

            contentRef.set({
                html: newContent,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp() // Salva a data da edição
            })
            .then(() => {
                alert('Conteúdo salvo e publicado com sucesso!');
                saveButton.textContent = 'Salvar Conteúdo';
                saveButton.disabled = false;
            })
            .catch(error => {
                console.error("Erro ao salvar:", error);
                alert('Ocorreu um erro. Tente novamente.');
                saveButton.textContent = 'Salvar Conteúdo';
                saveButton.disabled = false;
            });
        });
    }
});