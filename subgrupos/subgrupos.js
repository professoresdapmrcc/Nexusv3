// Arquivo: /subgrupos/subgrupos.js
// Lógica aprimorada para a página de subgrupos (SPP, CDC, DA)

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ subgrupos.js carregado e DOM pronto.");

    // Mapeamento dos cargos que concedem acesso total.
    // Qualquer cargo nesta lista desbloqueará todos os cards.
    const cargosDeAcessoTotal = [
        'Estagiário(a)',
        'Conselheiro(a)',
        'Vice-Líder',
        'Líder',
        'admin' // A role 'admin' também concede acesso total.
    ];

    /**
     * Função principal que verifica os dados do usuário e desbloqueia os cards.
     * @param {object | null} userData - Os dados do usuário logado ou null se estiver deslogado.
     */
    const verificarAcessoAosCards = (userData) => {
        const cardSPP = document.getElementById('spp-card');
        const cardCDC = document.getElementById('cdc-card');
        const cardDA = document.getElementById('da-card');
        const btnEscala = document.getElementById('escala-access-container');
        
        // Se o usuário não estiver logado, garante que tudo esteja bloqueado e oculto.
        if (!userData) {
            [cardSPP, cardCDC, cardDA].forEach(c => c?.classList.remove('unlocked'));
            if (btnEscala) btnEscala.style.display = 'none';
            return;
        }

        console.log("🔒 Verificando permissões para:", userData.name);

        // CONFIGURAÇÃO DE ACESSOS RESTRITOS (Sincronizada com escala-admin.js)
        const cargosAcessoDA = ['Fiscal', 'Vice-Intendente', 'Intendente'];
        const cargosAcessoCDC = ['Secretário(a)', 'Vice-Diretor(a)', 'Diretor(a)'];
        const cargosAcessoSPP = ['Subcomandante', 'Comandante'];
        const cargosLideranca = ['Vice-Líder', 'Líder']; // Apenas estes cargos vêm tudo. 'admin' removido.

        // Utilitário para checar se o cargo é válido (ignora placeholders)
        const temCargoReal = (val) => {
            if (!val) return false;
            const ignorar = ['não possuo', 'não possui', '-', 'sem cargo', 'n/a', 'NÃO POSSUO'];
            return val.trim() !== '' && !ignorar.includes(val.trim());
        };

        // Identificação de Permissões
        const ehLiderança = userData.cargo && cargosLideranca.includes(userData.cargo);
        
        const cargoDA = userData.da || '';
        const cargoCDC = userData.cdc || '';
        const cargoSPP = userData.spp || '';

        const podeVerEscala = ehLiderança || 
                             (temCargoReal(cargoDA) && cargosAcessoDA.includes(cargoDA)) ||
                             (temCargoReal(cargoCDC) && cargosAcessoCDC.includes(cargoCDC)) ||
                             (temCargoReal(cargoSPP) && cargosAcessoSPP.includes(cargoSPP));

        // 1. Controle do Botão de Escala
        if (btnEscala) {
            btnEscala.style.display = podeVerEscala ? 'flex' : 'none';
            if (podeVerEscala) btnEscala.classList.add('unlocked');
            else btnEscala.classList.remove('unlocked');
        }

        // 2. Controle dos Cards de Subgrupos (Desbloqueio Individual)
        // Card DA
        if (ehLiderança || temCargoReal(cargoDA)) {
            cardDA?.classList.add('unlocked');
            cardDA.style.display = 'flex';
        } else {
            cardDA?.classList.remove('unlocked');
            // Opcionalmente podemos esconder o card se não for membro (User pediu "bloqueia tlgd")
            // Se o usuário quer bloqueio total, podemos deixar grayscale ou esconder. 
            // Pelo comentário "tem pessoas de outros subgrupos conseguindo ver", vamos manter o bloqueio visual forte.
        }

        // Card CDC
        if (ehLiderança || temCargoReal(cargoCDC)) {
            cardCDC?.classList.add('unlocked');
            cardCDC.style.display = 'flex';
        } else {
            cardCDC?.classList.remove('unlocked');
        }

        // Card SPP
        if (ehLiderança || temCargoReal(cargoSPP)) {
            cardSPP?.classList.add('unlocked');
            cardSPP.style.display = 'flex';
        } else {
            cardSPP?.classList.remove('unlocked');
        }
    };

    // Ouve o evento 'userDataReady' que é disparado pelo seu global.js
    // Esta é a forma mais eficiente de obter os dados do usuário.
    document.addEventListener('userDataReady', (event) => {
        const userData = event.detail.userData;
        verificarAcessoAosCards(userData);
    });

    // Garante que, se o usuário deslogar, os cards sejam bloqueados.
    auth.onAuthStateChanged((user) => {
        if (!user) {
            verificarAcessoAosCards(null);
        }
    });

});