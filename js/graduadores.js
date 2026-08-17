// Aguarda o carregamento completo do conteúdo da página
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CONFIGURAÇÃO DE ACESSO (SEM PROFESSOR) ---
    const cargosPermitidos = [
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

                    // VERIFICAÇÃO: Cargo permitido OU se é administrador
                    if (cargosPermitidos.includes(cargoUsuario) || roleUsuario === "admin") {
                        console.log(`Acesso liberado: ${cargoUsuario || 'Admin'}`);
                        
                        // USA A CLASSE DO SEU CSS PARA MOSTRAR COM ANIMAÇÃO
                        document.body.classList.add('autorizado');
                        
                        // Inicia o carregamento dos dados da API
                        fetchDestaques();
                    } else {
                        alert(`Acesso negado. O cargo "${cargoUsuario}" não tem permissão para esta área.`);
                        // AJUSTE: Volta para a raiz para evitar o erro 404
                        window.location.href = "../index.html";
                    }
                } else {
                    console.error("Usuário não encontrado no banco de dados.");
                    window.location.href = "../login.html";
                }
            } catch (error) {
                console.error("Erro ao validar permissões:", error);
                window.location.href = "../login.html";
            }
        } else {
            // Se não houver login ativo, redireciona
            window.location.href = "../login.html";
        }
    });

    // --- 3. LÓGICA DA API DE DESTAQUES ---
    const urlDestaques = 'https://script.google.com/macros/s/AKfycbwfhg0tybxhtQXu2O0SWwHUngJ3j93Z89kLB7H_pXUlPi7kY66h1zcZ-tW9N1yWOjDPLg/exec?output=json&v=' + Date.now();

    const dateRangeElement = document.getElementById('destaques-date-range');
    const avatarsContainer = document.getElementById('destaques-avatars-container');

    function fetchDestaques() {
        if (!dateRangeElement || !avatarsContainer) return;

        fetch(urlDestaques)
            .then(response => response.json())
            .then(data => {
                const anoAtual = new Date().getFullYear();

                function formatarData(textoData) {
                    let dataLimpa = textoData.replace(/\//g, ' '); 
                    if (!dataLimpa.includes(anoAtual)) {
                        dataLimpa = `${dataLimpa} ${anoAtual}`;
                    }
                    return dataLimpa;
                }

                const inicio = formatarData(data.startDate);
                const fim = formatarData(data.endDate);
                dateRangeElement.textContent = `${inicio} a ${fim}`;

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
                dateRangeElement.textContent = 'Indisponível';
            });
    }
});