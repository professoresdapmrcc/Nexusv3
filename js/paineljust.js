document.addEventListener('DOMContentLoaded', () => {
    // Usa a instância do Firestore já inicializada pelo global.js
    const db = firebase.firestore();
    const listaDiv = document.getElementById('lista-justificativas');

    async function carregarJustificativas() {
        try {
            // Busca justificativas ordenadas pela data (mais recentes primeiro)
            const snapshot = await db.collection('justificativas')
                                     .orderBy('timestamp', 'desc')
                                     .get();
            
            listaDiv.innerHTML = ""; // Limpa a mensagem de carregamento

            if (snapshot.empty) {
                listaDiv.innerHTML = `
                    <div class="loading-glass">
                        <p>Nenhuma justificativa postada ainda.</p>
                    </div>`;
                return;
            }

            // Variável para criar um pequeno delay na animação de entrada de cada card
            let animDelay = 0;

            snapshot.forEach(doc => {
                const dados = doc.data();
                
                // Formatação da data
                let dataFormatada = "Data não registrada";
                if(dados.timestamp) {
                    const data = dados.timestamp.toDate();
                    dataFormatada = data.toLocaleDateString('pt-BR') + ' - ' + data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                }

                // Cria o Card Container
                const card = document.createElement('div');
                card.className = "card-glass";
                card.style.animationDelay = `${animDelay}s`;
                animDelay += 0.1; // Adiciona 100ms de atraso para o próximo card (efeito cascata)

                // Estrutura Interna do Card
                card.innerHTML = `
                    <div class="card-header">
                        <div class="avatar-box-pequeno">
                            <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nickname}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=m" alt="Avatar de ${dados.nickname}">
                        </div>
                        <div class="info-user-card">
                            <span class="nick">${dados.nickname}</span>
                            <span class="badge-cargo">${dados.cargo}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="campo-dado">
                            <label>Período de Ausência</label>
                            <p>${dados.periodo}</p>
                        </div>
                        <div class="campo-dado">
                            <label>Motivos Apresentados</label>
                            <p class="motivo-texto">"${dados.motivos}"</p>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="timestamp-badge">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${dataFormatada}
                        </div>
                    </div>
                `;
                listaDiv.appendChild(card);
            });

        } catch (error) {
            listaDiv.innerHTML = `
                <div class="loading-glass">
                    <p style="color: #ff453a;">Erro ao carregar dados: ${error.message}</p>
                </div>`;
        }
    }

    // Inicia a busca
    carregarJustificativas();
});