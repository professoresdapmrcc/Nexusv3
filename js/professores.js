// Aguarda o carregamento completo do conteúdo da página
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CONFIGURAÇÃO DE ACESSO ---
    const cargosPermitidos = [
        "Professor(a)",
        "Coordenador(a)",
        "Graduador(a)",
        "Estagiário(a)",
        "Conselheiro(a)",
        "Vice-Líder",
        "Líder"
    ];

    // --- 2. TRAVA DE SEGURANÇA E SAUDAÇÃO (FIREBASE GLOBAL) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Aqui você já estava buscando o usuário no banco!
                const userDocRef = db.collection("users").doc(user.uid);
                const doc = await userDocRef.get();

                if (doc.exists) {
                    const userData = doc.data();
                    const cargoUsuario = userData.cargo;
                    const roleUsuario = userData.role;
                    const nomeUsuario = userData.name; // <-- Puxando o nome também

                    // VERIFICAÇÃO: Cargo permitido OU se é administrador
                    if (cargosPermitidos.includes(cargoUsuario) || roleUsuario === "admin") {
                        console.log(`Acesso liberado: ${cargoUsuario || 'Admin'}`);
                        
                        // --- LÓGICA DA SAUDAÇÃO DINÂMICA ENTRA AQUI ---
                        const saudacaoElement = document.getElementById('saudacao-dinamica');
                        if (saudacaoElement && cargoUsuario && nomeUsuario) {
                            saudacaoElement.textContent = `o ${cargoUsuario} ${nomeUsuario}`;
                        }
                        // ----------------------------------------------
                        
                        // USA A CLASSE DO SEU CSS PARA MOSTRAR COM ANIMAÇÃO
                        document.body.classList.add('autorizado');
                        
                        // Só chama a API após validar o acesso
                        fetchDestaques();
                    } else {
                        alert(`Acesso negado. Você não tem permissão para acessar esta área.`);
                        window.location.href = "../index.html";
                    }
                } else {
                    console.error("Usuário não encontrado no banco de dados.");
                    window.location.href = "../login.html";
                }
            } catch (error) {
                console.error("Erro na verificação de permissões:", error);
                window.location.href = "../login.html";
            }
        } else {
            // Se não houver sessão ativa, manda para o login na raiz
            window.location.href = "../login.html";
        }
    });

    // --- 3. LÓGICA DA API DE DESTAQUES ---
    const urlDestaques = 'https://script.google.com/macros/s/AKfycby8sG2Yysd5tQmq_1ZgtKbjlkVGy2Mp-89bfhUnCGEhcVZJTP28zd2tGvg6YnPYv-c3/exec?output=json&v=' + Date.now();
    
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
                console.error('Erro ao buscar destaques:', error);
                avatarsContainer.innerHTML = '<p>Não foi possível carregar os destaques.</p>';
                dateRangeElement.textContent = 'Semana indisponível';
            });
    }
});