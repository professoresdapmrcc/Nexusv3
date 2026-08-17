/**
 * Processa os dados da contabilidade aplicando as regras de metas e adaptação
 */
function processarContabilidade() {
    const rawData = document.getElementById('dados-planilha').value;
    const tbody = document.getElementById('tbody-contabilidade');
    const areaResultado = document.getElementById('area-resultado');

    if (!rawData.trim()) {
        alert("NEXUS: Cole os dados da planilha primeiro!");
        return;
    }

    areaResultado.style.display = 'block';
    tbody.innerHTML = "";

    // Define os limites da semana atual (Domingo a Sábado)
    const hoje = dayjs();
    const inicioSemana = hoje.startOf('week'); // Domingo
    const fimSemana = hoje.endOf('week');     // Sábado

    const linhas = rawData.split('\n');

    linhas.forEach(linha => {
        if (!linha.trim()) return;

        // Separa por TAB (formato padrão ao copiar do Excel/Sheets)
        const col = linha.split('\t');
        if (col.length < 5) return;

        const nick = col[2]; // Coluna C
        const dataEntrada = col[3]; // Coluna D
        const dataPromocao = col[4]; // Coluna E
        const porcentagemRaw = col[6] ? col[6].replace('%', '').replace(',', '.') : "0";
        const total = parseFloat(porcentagemRaw);
        const motivo = (col[8] || "").toUpperCase();

        let statusFinal = "IRREGULAR";
        let badgeClass = "status-irregular";

        // --- LÓGICA DE PRIORIDADE (EXCEÇÕES) ---
        
        if (motivo.includes("LICENÇA")) {
            statusFinal = "LICENÇA";
            badgeClass = "status-especial";
        } 
        else if (motivo.includes("PROMOÇÃO RECENTE")) {
            statusFinal = "PROM. RECENTE";
            badgeClass = "status-especial";
        }
        // LÓGICA DE ADAPTAÇÃO: Entrou entre Domingo e Sábado desta semana?
        else if (dataEntrada && total < 100) {
            const dataFormatada = dayjs(dataEntrada, "YYYY-MM-DD");
            if (dataFormatada.isAfter(inicioSemana.subtract(1, 'day')) && dataFormatada.isBefore(fimSemana.add(1, 'day'))) {
                statusFinal = "ADAPTAÇÃO";
                badgeClass = "status-adaptacao";
            }
        }

        // Se não caiu em nenhuma exceção, avalia a Meta Realizada
        if (statusFinal === "IRREGULAR") {
            if (total >= 350) {
                statusFinal = "EXCELENTE";
                badgeClass = "status-excelente";
            } else if (total >= 155) {
                statusFinal = "ÓTIMO";
                badgeClass = "status-otimo";
            } else if (total >= 100) {
                statusFinal = "REGULAR";
                badgeClass = "status-regular";
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left; font-weight: 800;">${nick}</td>
            <td>${dataEntrada || '---'}</td>
            <td>${dataPromocao || '---'}</td>
            <td style="color: #ba4fc0; font-weight: 800;">${total}%</td>
            <td><span class="badge-conta ${badgeClass}">${statusFinal}</span></td>
            <td style="text-align: left; color: #94a3b8; font-size: 0.8rem;">${col[8] || '---'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function copiarTabelaFinal() {
    const tbody = document.getElementById('tbody-contabilidade');
    let texto = "NICK\tENTRADA\tPROMOÇÃO\tMETA\tSTATUS\tMOTIVO\n";
    
    Array.from(tbody.rows).forEach(row => {
        const dados = Array.from(row.cells).map(c => c.innerText).join('\t');
        texto += dados + "\n";
    });

    navigator.clipboard.writeText(texto);
    alert("NEXUS: Dados copiados para a área de transferência!");
}