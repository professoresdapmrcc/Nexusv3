// Aguarda o conteúdo da página carregar completamente antes de rodar o script
document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // == LÓGICA DA SEÇÃO WEEKLY (AIRTABLE)
    // ===================================
    
    if (document.getElementById('current-edition-view')) {
        function initWeekly() {
            // Suas credenciais do Airtable
            const AIRTABLE_TOKEN = "patQE6E4PXnNeQ0mC.7f5f7a319cbce13e79e7880e7e9f39e121cad5e57d7f58334ac19b3345e44779";
            const BASE_ID = "appHfyxgdt5afGM2k";
            const TABLE_NAME = "Table 1";

            const currentView = document.getElementById('current-edition-view');
            const pastView = document.getElementById('past-editions-view');
            const showPastBtn = document.getElementById('show-past-btn');
            const backToCurrentBtn = document.getElementById('back-to-current-btn');
            
            const apiUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?sort%5B0%5D%5Bfield%5D=Data&sort%5B0%5D%5Bdirection%5D=desc`;

            async function fetchData() {
                try {
                    const response = await fetch(apiUrl, {
                        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
                    });
                    if (!response.ok) throw new Error(`Erro no Airtable: ${response.statusText}`);
                    
                    const data = await response.json();
                    const allRecords = data.records;
                    
                    const currentRecord = allRecords.find(record => record.fields.EdicaoAtual === true);
                    const pastRecords = allRecords.filter(record => !record.fields.EdicaoAtual);
                    
                    if (currentRecord) {
                        renderCurrentEdition(currentRecord.fields);
                    } else {
                        throw new Error("Nenhuma edição marcada como 'EdicaoAtual' foi encontrada.");
                    }
                    renderPastEditions(pastRecords);
                } catch (error) {
                    console.error('Erro ao buscar dados:', error);
                    document.getElementById('current-volume').textContent = 'Erro ao carregar';
                    document.getElementById('current-date').textContent = 'Verifique a configuração.';
                    document.getElementById('current-description').textContent = '';
                }
            }

            function renderCurrentEdition(fields) {
                const edition = {
                    volume: fields.Volume || "Volume Desconhecido",
                    // CORREÇÃO: Forçando o fuso horário para UTC para evitar que perca 1 dia no Brasil
                    date: fields.Data ? new Date(fields.Data).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : "Data Desconhecida",
                    imageUrl: fields.Imagem ? fields.Imagem[0].url : 'https://placehold.co/600x800/1a0b2e/ffffff?text=Capa+Indisponível',
                    externalLink: fields.LinkExterno || "#",
                    description: fields.Descricao || "Descrição não disponível."
                };
                
                document.getElementById('current-volume').textContent = edition.volume;
                document.getElementById('current-date').innerHTML = `<i class="fa-regular fa-calendar"></i>${edition.date}`;
                document.getElementById('current-description').innerHTML = edition.description.replace(/\n/g, '<br>');
                document.getElementById('current-link').href = edition.externalLink;
                
                const imagePanel = document.getElementById('current-image-panel');
                if (imagePanel) {
                    imagePanel.innerHTML = `<img src="${edition.imageUrl}" alt="Capa da Edição Semanal" class="edition-image-dynamic">`;
                }
            }
            
            function renderPastEditions(records) {
                const listContainer = document.getElementById('past-editions-list');
                listContainer.innerHTML = '';
                
                if (records.length === 0) {
                    listContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5);">Nenhuma edição anterior registada.</p>';
                    return;
                }
                
                const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                
                records.forEach(record => {
                    const fields = record.fields;
                    let volumeFormatado = "Edição Especial";
                    
                    if (fields.Volume && fields.Volume.includes('VOL.')) {
                        volumeFormatado = `${fields.Volume.replace('VOL. ', '')}º Volume`;
                    } else if (fields.Volume) {
                        volumeFormatado = fields.Volume;
                    }

                    let dataFormatada = "Data Indisponível";
                    if (fields.Data) {
                        // CORREÇÃO: Usando os métodos getUTC para manter o dia exato da planilha
                        const d = new Date(fields.Data);
                        dataFormatada = `<i class="fa-regular fa-calendar-days"></i> ${String(d.getUTCDate()).padStart(2, '0')} ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
                    }

                    const link = document.createElement('a');
                    link.className = 'past-edition-link';
                    link.href = fields.LinkExterno || '#';
                    link.target = "_blank";
                    link.innerHTML = `
                        <span class="past-volume">${volumeFormatado}</span>
                        <span class="past-date">${dataFormatada}</span>
                    `;
                    listContainer.appendChild(link);
                });
            }

            // Animação de Troca entre Atual e Histórico
            if (showPastBtn && backToCurrentBtn && currentView && pastView) {
                showPastBtn.addEventListener('click', () => {
                    currentView.classList.add('hidden');
                    setTimeout(() => {
                        pastView.classList.remove('hidden');
                    }, 400); // Espera o fade out antes de dar fade in
                });

                backToCurrentBtn.addEventListener('click', () => {
                    pastView.classList.add('hidden');
                    setTimeout(() => {
                        currentView.classList.remove('hidden');
                    }, 400);
                });
            }

            // Inicia a busca
            fetchData();
        }

        initWeekly();
    }
});