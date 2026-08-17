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
    // 'auth' e 'db' vêm do seu arquivo global.js
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDocRef = db.collection("users").doc(user.uid);
                const doc = await userDocRef.get();

                if (doc.exists) {
                    const userData = doc.data();
                    const cargoUsuario = userData.cargo;
                    const roleUsuario = userData.role; // Puxa o campo role do Firestore
                    const nomeUsuario = userData.name; // <-- Puxa o nome do usuário

                    // VERIFICAÇÃO: Cargo permitido OU se é administrador
                    if (cargosPermitidos.includes(cargoUsuario) || roleUsuario === "admin") {
                        console.log(`Acesso liberado: ${cargoUsuario || 'Admin'}`);
                        
                        // --- LÓGICA DA SAUDAÇÃO DINÂMICA ---
                        const saudacaoElement = document.getElementById('saudacao-dinamica');
                        if (saudacaoElement && cargoUsuario && nomeUsuario) {
                            saudacaoElement.textContent = `o ${cargoUsuario} ${nomeUsuario}`;
                        }
                        
                        // USA A CLASSE DO SEU CSS PARA MOSTRAR COM ANIMAÇÃO (Fade-in)
                        document.body.classList.add('autorizado'); 
                    } else {
                        // Se não for autorizado, alerta e volta para a index na raiz (evita 404)
                        alert(`Acesso negado. O cargo "${cargoUsuario}" não tem permissão para esta área.`);
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
            // Se não houver ninguém logado, manda para o login na raiz
            window.location.href = "../login.html";
        }
    });
});