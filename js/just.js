document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentNick = "";

    const nickInput = document.getElementById('nickname');
    const userNickSpan = document.getElementById('user-nick');
    const avatarImg = document.getElementById('avatar-img');
    const form = document.getElementById('justificativa-form');
    const btnSubmit = document.getElementById('btn-submit');
    const toast = document.getElementById('toast-sucesso');

    // Função para mostrar o Toast de sucesso
    function showToast() {
        toast.classList.add('show');
        // Oculta após 3 segundos (tempo da barra de progresso)
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Pega o nick do usuário logado
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentNick = doc.data().name;
                nickInput.value = currentNick;
                userNickSpan.textContent = currentNick;
                
                // Atualiza o avatar usando a API do jogo
                avatarImg.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${currentNick}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=b`;
            }
        } else {
            nickInput.value = "Usuário não logado";
            userNickSpan.textContent = "Visitante";
            alert("Você precisa estar logado para preencher a justificativa.");
        }
    });

    // Envio do Formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentNick) {
            alert("Erro: Você não está logado.");
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "ENVIANDO...";

        try {
            await db.collection('justificativas').add({
                nickname: currentNick,
                cargo: document.getElementById('cargo').value,
                periodo: document.getElementById('periodo').value,
                motivos: document.getElementById('motivos').value,
                tipo: "NÃO CUMPRIMENTO DE META",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Exibe a notificação premium
            showToast();
            
            // Reseta o form e restaura o nick
            form.reset();
            nickInput.value = currentNick; 
        } catch (error) {
            alert("Erro ao enviar: " + error.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "ENVIAR JUSTIFICATIVA";
        }
    });
});