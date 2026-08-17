document.addEventListener('DOMContentLoaded', () => {
    // Mapa de hierarquia de permissões. Quanto maior o número, maior a permissão.
    const permissionLevels = {
        'Professor(a)': 1,
        'Coordenador(a)': 2,
        'Graduador(a)': 3,
        'Estagiário(a)': 4,
        'Conselheiro(a)': 5,
        'Vice-Líder': 6,
        'Líder': 7,
        'admin': 99 // Nível máximo para a role 'admin'
    };

    /**
     * Verifica todos os cargos de um usuário e retorna o seu maior nível de permissão.
     * @param {object} userData - O objeto com os dados do usuário.
     * @returns {number} - O maior nível de permissão do usuário.
     */
    const getUserPermissionLevel = (userData) => {
        if (!userData) return 0; // Nível 0 para usuários deslogados.

        // Lista de todos os campos que podem conter um cargo
        const userRoles = [
            userData.cargo,
            userData.spp,
            userData.da,
            userData.cdc,
            userData.role
        ].filter(Boolean); // Remove campos vazios ou nulos

        if (userRoles.length === 0) return 0; // Retorna 0 se não tiver nenhum cargo
        
        // Converte a lista de cargos em uma lista de níveis de permissão
        const userLevels = userRoles.map(role => permissionLevels[role] || 0);
        
        // Retorna o maior nível encontrado
        return Math.max(...userLevels);
    };

    /**
     * Configura a visibilidade e interatividade dos cards com base no nível de permissão do usuário.
     * @param {object} userData - O objeto com os dados do usuário.
     */
    const setupRolePermissions = (userData) => {
        const userLevel = getUserPermissionLevel(userData);
        const roleCards = document.querySelectorAll('.department-card');

        console.log(`Nível de permissão do usuário detectado: ${userLevel}`);

        roleCards.forEach(card => {
            const requiredRoleString = card.dataset.requiredRole;
            
            // Se o card não tiver restrição, ignora (ou desbloqueia, dependendo da sua lógica)
            if (!requiredRoleString) return; 

            // 1. Quebra a string "Cargo1, Cargo2" em uma lista
            // 2. Remove espaços extras com trim()
            const allowedRoles = requiredRoleString.split(',').map(r => r.trim());

            // 3. Descobre o nível numérico de cada cargo listado no HTML
            const levelsFound = allowedRoles.map(role => permissionLevels[role]).filter(lvl => lvl !== undefined);

            // 4. Se não achou nenhum nível válido na lista, bloqueia (999)
            // Se achou, pega o MÍNIMO. Ex: Se permite "Estagiário" (4) e "Líder" (7),
            // a barreira de entrada é 4. Quem for 6 (Vice-Líder) entra porque 6 >= 4.
            const minRequiredLevel = levelsFound.length > 0 ? Math.min(...levelsFound) : 999;

            console.log(`Card: ${card.id} | Nível Necessário: ${minRequiredLevel} | Nível Usuário: ${userLevel}`);

            // 5. Comparação Hierárquica
            if (userLevel >= minRequiredLevel) {
                card.classList.add('unlocked');
                
                // (Opcional) Ajustes visuais imediatos caso o CSS demore
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
                const icon = card.querySelector('.fa-lock');
                if(icon) {
                    icon.classList.remove('fa-lock');
                    icon.classList.add('fa-door-open'); // Ou outro ícone de sucesso
                }
            } else {
                // Garante que está bloqueado se o nível baixou
                card.classList.remove('unlocked');
            }
        });
    };

    // Ouve o evento 'userDataReady' para obter os dados do usuário.
    // Este evento deve ser disparado por outro script (ex: global.js) quando os dados estiverem prontos.
    document.addEventListener('userDataReady', (event) => {
        const userData = event.detail.userData;
        setupRolePermissions(userData);
    });
});