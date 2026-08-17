/* ==========================================================================
   LÓGICA DO RANKING MENSAL (Tabela Compacta + Conserto CSV)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSg-G30fjmZzff9mksRHRAlziHupJrTsDrB0MJZcHGcFCOFr8QKghTFXHxr6cyil8T1I3d5KxwUMAkf/pub?gid=658708908&single=true&output=csv';

    const rankingTitle = document.getElementById('ranking-title');
    const rankingTbody = document.getElementById('ranking-tbody');
    
    // Elementos do Pódio
    const winner1_avatar = document.getElementById('winner-1-avatar');
    const winner1_nick = document.getElementById('winner-1-nick');
    const winner1_points = document.getElementById('winner-1-points');
    
    const winner2_avatar = document.getElementById('winner-2-avatar');
    const winner2_nick = document.getElementById('winner-2-nick');
    const winner2_points = document.getElementById('winner-2-points');
    
    const winner3_avatar = document.getElementById('winner-3-avatar');
    const winner3_nick = document.getElementById('winner-3-nick');
    const winner3_points = document.getElementById('winner-3-points');

    // Função para gerar a URL do Avatar (Com alta resolução pro pódio)
    function getAvatarUrl(nickname) {
        const user = nickname && nickname.trim() !== '' ? nickname.replace(/"/g, '') : 'place.holder';
        return `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${user}&action=std&direction=3&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
    }

    // Função para preencher o Pódio (Top 3)
    function renderPodium(winners) {
        winner1_avatar.src = winners[0] ? getAvatarUrl(winners[0].nick) : getAvatarUrl('');
        winner1_nick.textContent = winners[0] ? winners[0].nick : '---';
        winner1_points.textContent = winners[0] ? winners[0].pontos + ' Pts' : '-';

        winner2_avatar.src = winners[1] ? getAvatarUrl(winners[1].nick) : getAvatarUrl('');
        winner2_nick.textContent = winners[1] ? winners[1].nick : '---';
        winner2_points.textContent = winners[1] ? winners[1].pontos + ' Pts' : '-';

        winner3_avatar.src = winners[2] ? getAvatarUrl(winners[2].nick) : getAvatarUrl('');
        winner3_nick.textContent = winners[2] ? winners[2].nick : '---';
        winner3_points.textContent = winners[2] ? winners[2].pontos + ' Pts' : '-';
    }

    // Função para renderizar a Tabela Completa (do 4º lugar em diante)
    function renderTable(data) {
        rankingTbody.innerHTML = ''; 
        
        const others = data.slice(3);
        
        if (others.length === 0) {
            rankingTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: rgba(255,255,255,0.6);">Não há mais membros pontuados este mês.</td></tr>';
            return;
        }

        others.forEach(player => {
            const tr = `
                <tr>
                    <td class="td-rank">${player.posicao}º</td>
                    <td class="td-nick">${player.nick}</td>
                    <td class="td-points">${player.pontos} Pts</td>
                </tr>
            `;
            rankingTbody.innerHTML += tr;
        });
    }

    // NOVA FUNÇÃO ROBUSTA DE PARSE DO CSV
    function parseCsvRow(row) {
        // Regex mágica para separar por vírgulas, IGNORANDO as vírgulas dentro de aspas duplas
        const parts = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (parts.length < 3) return null;

        // Limpa as aspas e espaços extras de cada pedaço
        const cleanPart = (str) => {
            return str ? str.replace(/^"|"$/g, '').trim() : '';
        };

        const posicao = cleanPart(parts[1]);
        const nick = cleanPart(parts[2]);
        const pontos = cleanPart(parts[3]);

        if (!posicao) return null;

        return { posicao, nick, pontos };
    }

    // Executa a busca e sincronização
    async function fetchData() {
        if (!rankingTitle || !rankingTbody || !winner1_avatar) {
            console.error("Elementos do ranking não encontrados na página.");
            return;
        }

        try {
            const response = await fetch(SPREADSHEET_URL);
            if (!response.ok) throw new Error('Falha ao carregar dados da planilha.');

            const csvText = await response.text();
            
            // Pula a primeira linha (cabeçalho da planilha) e filtra
            const data = csvText.trim().split('\n').slice(1).map(parseCsvRow).filter(item => item !== null && item.posicao);

            if (data.length > 0) {
                const dataAtual = new Date();
                const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                const nomeDoMes = meses[dataAtual.getMonth()];
                const anoAtual = dataAtual.getFullYear();

                rankingTitle.textContent = `Ranking - ${nomeDoMes} ${anoAtual}`;

                renderPodium(data.slice(0, 3));
                renderTable(data); 
            } else {
                rankingTitle.textContent = "Nenhum dado encontrado no ranking.";
                rankingTbody.innerHTML = '';
            }

        } catch (error) {
            console.error("Erro no processo de fetch:", error);
            rankingTitle.textContent = "Erro ao sincronizar.";
            rankingTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ff4d6d;">Não foi possível carregar a classificação. Verifique a planilha.</td></tr>';
        }
    }

    fetchData();
});