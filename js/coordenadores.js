// Aguarda o carregamento completo do conteúdo da página
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CONFIGURAÇÃO DE ACESSO (SEM PROFESSOR) ---
    const cargosPermitidos = [
        "Coordenador(a)",
        "Graduador(a)",
        "Estagiário(a)",
        "Conselheiro(a)",
        "Vice-Líder",
        "Líder"
    ];

    // --- 2. TRAVA DE SEGURANÇA (FIREBASE GLOBAL) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDocRef = db.collection("users").doc(user.uid);
                const doc = await userDocRef.get();

                if (doc.exists) {
                    const userData = doc.data();
                    const cargoUsuario = userData.cargo;
                    const roleUsuario = userData.role;

                    if (cargosPermitidos.includes(cargoUsuario) || roleUsuario === "admin") {
                        console.log(`Acesso liberado: ${cargoUsuario || 'Admin'}`);
                        
                        // USA A CLASSE DO SEU CSS PARA MOSTRAR A PÁGINA COM ANIMAÇÃO
                        document.body.classList.add('autorizado');
                        
                        fetchDestaques();
                    } else {
                        alert(`Acesso negado. O cargo "${cargoUsuario}" não tem permissão.`);
                        // CORREÇÃO DO 404: Volta para a raiz do site
                        window.location.href = "../index.html";
                    }
                } else {
                    console.error("Usuário não encontrado no banco de dados.");
                    window.location.href = "../login.html"; // Também ajustado para garantir
                }
            } catch (error) {
                console.error("Erro ao validar permissões:", error);
                window.location.href = "../login.html";
            }
        } else {
            window.location.href = "../login.html";
        }
    });

    // --- 3. LÓGICA DA API DE DESTAQUES ---
    const urlDestaques = 'https://script.google.com/macros/s/AKfycbxGZ_q9epwqbn9L5KkLLwUMwEt3RsSKF7B7w8cvrcISpLMf7G-EFoCdxU-9JXLPYr1u/exec?output=json&v=' + Date.now();

    const dateRangeElement = document.getElementById('destaques-date-range');
    const avatarsContainer = document.getElementById('destaques-avatars-container');

    function fetchDestaques() {
        if (!dateRangeElement || !avatarsContainer) return;

        fetch(urlDestaques)
            .then(response => response.json())
            .then(data => {
                const dataInicio = data.startDate.replace('/', ' ');
                const dataFim = data.endDate.replace('/', ' ');
                dateRangeElement.textContent = `${dataInicio} A ${dataFim}`;

                avatarsContainer.innerHTML = '';
                data.destaques.forEach(destaque => {
                    const avatarItem = document.createElement('div');
                    avatarItem.className = 'avatar-item';
                    avatarItem.innerHTML = `
                        <img src="${destaque.avatar}" alt="Avatar de ${destaque.nick}">
                        <p>${destaque.nick}</p>
                    `;
                    avatarsContainer.appendChild(avatarItem);
                });
            })
            .catch(error => {
                console.error('Erro ao buscar destaque:', error);
                avatarsContainer.innerHTML = '<p>Não foi possível carregar o destaque.</p>';
            });
    }
});