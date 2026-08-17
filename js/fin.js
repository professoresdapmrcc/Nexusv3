// =========================================================================
// VARIÁVEIS GLOBAIS
// =========================================================================
let membrosAtivosGlobais = [];
let cargoAtualSelecionado = "Professores";

// Salva as listas filtradas para enviar pro link do fórum (Cargos)
let ultimaListaPositivos = [];
let ultimaListaNegativos = [];

// Salva os dados processados dos Grupos Internos (DA, CDC, SPP)
let dadosGruposGlobais = {}; 

// =========================================================================
// CONTROLE DE ABAS DA SIDEBAR
// =========================================================================
window.abrirAba = function(idAba, elementoBtn, nomeCargo = null) {
    // Esconde todas as views
    document.querySelectorAll('.aba-view').forEach(aba => {
        aba.style.display = 'none';
        aba.classList.remove('active');
    });

    // Desmarca todos os botões da sidebar
    document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ativa a view solicitada
    const viewAlvo = document.getElementById(idAba);
    if(viewAlvo) {
        viewAlvo.style.display = 'block';
        setTimeout(() => viewAlvo.classList.add('active'), 10);
    }
    elementoBtn.classList.add('active');

    // Se for uma aba de Cargo, atualiza os títulos e limpa a tela
    if (nomeCargo) {
        cargoAtualSelecionado = nomeCargo;
        
        const tituloDinamico = document.getElementById('titulo-cargo-dinamico');
        if (tituloDinamico) {
            tituloDinamico.innerText = `Gerador: ${nomeCargo}`;
        }

        // Atualiza os valores das medalhas na UI
        window.atualizarValoresMedalhasUI();

        // Atualiza o link da planilha de consulta dinâmica
        const btnConsulta = document.getElementById('btn-consulta-dinamico');
        if (btnConsulta) {
            const links = {
                'Professores': 'https://docs.google.com/spreadsheets/d/1EQ2_6q0lrA4XIQQhaeJNmp9esYItkN6GKlIou9TkEZo/edit?gid=831559029#gid=831559029',
                'Coordenadores': 'https://docs.google.com/spreadsheets/d/1n3mMltgY0AmDCeO1vRDaYuz-jLaZ--4hO5f9UnTdtEw/edit?usp=sharing',
                'Graduadores': 'https://docs.google.com/spreadsheets/d/1-jR5kLgKHPJuRsXl3PBnz3sbi4mkDeRiQ9rWmmp8uAk/edit?gid=819832544#gid=819832544',
                'Estagiários': 'https://docs.google.com/spreadsheets/d/1bSd-zW1cfd1lcsCZg9cltlD2Fh9I4EED-o4XOOHUsOs/edit?gid=414017669#gid=414017669',
                'Conselho': 'https://docs.google.com/spreadsheets/d/1bSd-zW1cfd1lcsCZg9cltlD2Fh9I4EED-o4XOOHUsOs/edit?gid=414017669#gid=414017669'
            };
            btnConsulta.href = links[nomeCargo] || '#';
            btnConsulta.style.display = links[nomeCargo] ? 'inline-flex' : 'none';
        }
        
        if (typeof window.limparCamposCargo === 'function') {
            window.limparCamposCargo();
        }
    }
};

// =========================================================================
// ATUALIZAÇÃO DINÂMICA DE VALORES NA UI
// =========================================================================
window.getMedalhasPorCargo = function(cargo) {
    const mapa = {
        'Professores': 10,
        'Coordenadores': 10,
        'Graduadores': 25,
        'Estagiários': 15,
        'Conselho': 15
    };
    return mapa[cargo] || 10;
};

window.atualizarValoresMedalhasUI = function() {
    const qtd = window.getMedalhasPorCargo(cargoAtualSelecionado);
    
    // Atualiza botões
    const btnPos = document.getElementById('btn-postar-positivos');
    const btnNeg = document.getElementById('btn-postar-negativos');
    if (btnPos) btnPos.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Postar Positivos (+${qtd})`;
    if (btnNeg) btnNeg.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Postar Negativos (-${qtd})`;

    // Atualiza labels
    const labelPos = document.getElementById('label-positivos-qtd');
    const labelNeg = document.getElementById('label-negativos-qtd');
    if (labelPos) labelPos.innerText = `POSITIVOS (${qtd} MEDALHAS)`;
    if (labelNeg) labelNeg.innerText = `NEGATIVOS (-${qtd} MEDALHAS)`;
};

window.abrirAbaLideranca = function(elementoBtn) {
    window.abrirAba('aba-lideranca', elementoBtn);
    cargoAtualSelecionado = "Liderança";
    
    // Carrega automaticamente os líderes se a tabela estiver vazia
    const tbody = document.getElementById('tbody-lideranca-inputs');
    if(tbody.innerHTML.trim() === '') {
        window.carregarLideresFirebase();
    }
};

// =========================================================================
// LÓGICA DA ABA "SYSTEM" (IMPORTAR LISTA DE ATIVOS)
// =========================================================================
window.processarSystem = function() {
    const textoBruto = document.getElementById('texto-system').value;
    
    if (!textoBruto.trim()) {
        alert("Cole a lista do RCCSystem antes de processar.");
        return;
    }

    const linhas = textoBruto.split('\n');
    membrosAtivosGlobais = [];

    // Patentes/cargos conhecidos para validar se a linha pertence à tabela
    const patentesConhecidas = [
        'soldado', 'cabo', 'sargento', 'subtenente', 'tenente', 'capitão', 'capitao',
        'major', 'coronel', 'general', 'marechal', 'comandante', 'presidente', 'vice-presidente',
        'chanceler', 'vip', 'acionista', 'trainee', 'assessor', 'secretário', 'secretario', 'analista',
        'supervisor', 'inspetor', 'coordenador', 'superintendente', 'aspirante', 'sem patente',
        'comandante supremo', 'comandante-geral', 'assistente', 'superintendente-geral',
        'supervisor-geral', 'inspetor-geral', 'coordenador-geral', 'analista-chefe',
        'assistente-chefe', 'secretário-chefe'
    ];

    // Textos de navegação/UI e rodapé que devem ser sumariamente ignorados
    const lixoNavegacao = [
        'rcc', 'rccsystem', 'início', 'inicio', 'revofeed', 'membros', 'grupos', 'loja',
        'ferramentas', 'documentos', 'meu cfo', 'minha aqoi', 'central da aqoi',
        'listagens', 'soldados', 'corpo de praças', 'corpo de oficiais', 'corpo executivo',
        'gratificações', 'permissões', 'tags', 'reformados', 'exonerados', 'especializações',
        'requerimentos', 'tarefas', 'perfil', 'mail', 'conversas', 'procurar militar...',
        'procurar policial ou patente...', 'exportar para pdf', 'polícia rcc', 'acessar o fórum',
        'canais externos', 'fórum', 'canal whatsapp', 'discord', 'redes sociais', 'twitter',
        'facebook', 'instagram', 'youtube', 'revos', 'listagem de gratificações',
        'saldos consolidados de medalhas efetivas e temporárias.'
    ];

    linhas.forEach(linha => {
        const trimmed = linha.trim();
        if (!trimmed) return;

        const trimmedLower = trimmed.toLowerCase();

        // Pula se for lixo de navegação ou do rodapé
        if (lixoNavegacao.includes(trimmedLower)) return;
        if (
            trimmedLower.includes('© pmrcc') ||
            trimmedLower.includes('todos os direitos reservados') ||
            trimmedLower.includes('desenvolvido por') ||
            trimmedLower.includes('sulake corporation') ||
            trimmedLower.includes('política de fã sites') ||
            trimmedLower.includes('habbo hotel') ||
            trimmedLower.includes('polícia militar revolução') ||
            trimmedLower.includes('organização fictícia') ||
            trimmedLower.includes('registros') ||
            trimmedLower.includes('resultado(s)') ||
            trimmedLower.includes('joão dutra') ||
            trimmedLower.includes('mitojmcam')
        ) return;

        const colunas = trimmed.split('\t');
        if (colunas.length < 2) return;

        let nick = "";
        let patente = "";

        // Formato Novo: # \t Policial \t Patente/Cargo \t ...
        // Formato Antigo: Policial \t Patente/Cargo \t ...
        const primeiraCol = colunas[0].trim();
        
        // Verifica se a primeira coluna é o número da listagem (incluindo milhar como 1.153)
        if (/^-?[\d.]+$/.test(primeiraCol) && /\d/.test(primeiraCol)) {
            const numLimpo = primeiraCol.replace(/\./g, '');
            if (/^-?\d+$/.test(numLimpo) && colunas.length >= 3) {
                nick = colunas[1].trim();
                patente = colunas[2].trim().toLowerCase();
            } else {
                nick = primeiraCol;
                patente = colunas[1].trim().toLowerCase();
            }
        } else {
            nick = primeiraCol;
            patente = colunas[1].trim().toLowerCase();
        }

        // Valida se o nick e a patente são válidos
        const parecePatente = patentesConhecidas.some(p => patente.includes(p));
        const nickLower = nick.toLowerCase();

        if (nick && nickLower !== 'policial' && nick !== '#' && parecePatente) {
            // Limpa caracteres estranhos de nicks, mantendo válidos do Habbo
            const nickLimpo = nick.replace(/[^a-zA-Z0-9_.:\-?!,]/g, '');
            if (nickLimpo) {
                membrosAtivosGlobais.push(nickLimpo);
            }
        }
    });

    const contador = document.getElementById('contador-ativos');
    contador.innerText = `${membrosAtivosGlobais.length} Ativos Carregados`;
    contador.classList.replace('badge-regular', 'badge-concluida');

    alert(`NEXUS IA: ${membrosAtivosGlobais.length} membros ativos foram salvos na memória!`);
};

// =========================================================================
// LÓGICA DA ABA DE CARGOS COMUNS (FILTRAR DESEMPENHO)
// =========================================================================
window.processarDesempenho = function() {
    const textoBruto = document.getElementById('cargo-texto-desempenho').value;

    if (!textoBruto.trim()) {
        alert("Cole a consulta de desempenho antes de filtrar.");
        return;
    }

    if (membrosAtivosGlobais.length === 0) {
        const confirmar = confirm("Você não carregou a lista de ativos na aba 'System'. A filtragem será feita, mas membros demitidos podem aparecer no resultado. Deseja continuar?");
        if (!confirmar) return;
    }

    const regexStatus = /(EXCELENTE|ÓTIMO|OTIMO|BOM|REGULAR|IRREGULAR|RUIM|CASO ESPECIAL)/i;
    
    ultimaListaPositivos = [];
    ultimaListaNegativos = [];
    const especiais = [];

    // Processa linha por linha para suportar colagem de tabelas
    const linhas = textoBruto.split('\n');

    linhas.forEach(linha => {
        const linhaTrim = linha.trim();
        if (!linhaTrim) return;

        let nick = "";
        let status = "";

        // Tenta detectar formato de tabela (Tab-Separated)
        if (linhaTrim.includes('\t')) {
            const colunas = linhaTrim.split('\t');
            // O nick costuma ser a primeira coluna (ex: Digitador ou ,Devir)
            nick = colunas[0].trim();
            
            // Busca o status em qualquer uma das colunas (geralmente a última)
            for (let i = colunas.length - 1; i >= 1; i--) {
                const sMatch = colunas[i].trim().match(regexStatus);
                if (sMatch) {
                    status = sMatch[0].toUpperCase();
                    break;
                }
            }
        } else {
            // Formato legado ou colagem simples sem abas: NickSTATUS
            const match = linhaTrim.match(/(.*?)(EXCELENTE|ÓTIMO|OTIMO|BOM|REGULAR|IRREGULAR|RUIM|CASO ESPECIAL)/i);
            if (match) {
                nick = match[1].trim();
                status = match[2].toUpperCase();
            }
        }

        if (nick && status) {
            // Limpeza de Nickname: Mantém apenas caracteres permitidos pela RCC e Habbo
            // Permitimos vírgula (,) além de _ . : - ? !
            nick = nick.replace(/[^a-zA-Z0-9_.:\-?!,]/g, '');

            if (!nick) return;

            if (membrosAtivosGlobais.length > 0) {
                const isActive = membrosAtivosGlobais.some(m => m.toLowerCase() === nick.toLowerCase());
                if (!isActive) return; 
            }

            if (["EXCELENTE", "ÓTIMO", "OTIMO", "BOM", "REGULAR"].includes(status)) {
                ultimaListaPositivos.push(nick);
            } else if (["IRREGULAR", "RUIM"].includes(status)) {
                ultimaListaNegativos.push(nick);
            } else if (status === "CASO ESPECIAL") {
                especiais.push(nick);
            }
        }
    });

    document.getElementById('out-positivos').value = ultimaListaPositivos.length > 0 ? ultimaListaPositivos.join(' / ') : "Nenhum membro";
    document.getElementById('out-negativos').value = ultimaListaNegativos.length > 0 ? ultimaListaNegativos.join(' / ') : "Nenhum membro";
    document.getElementById('out-especiais').value = especiais.length > 0 ? especiais.join(' / ') : "Nenhum membro";

    const btn = event.currentTarget;
    const btnOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Processado!';
    btn.classList.replace('btn-purple', 'btn-cyan');
    
    setTimeout(() => {
        btn.innerHTML = btnOriginal;
        btn.classList.replace('btn-cyan', 'btn-purple');
    }, 2000);
};

window.limparCamposCargo = function() {
    const elTexto = document.getElementById('cargo-texto-desempenho');
    if (elTexto) elTexto.value = '';
    
    const outPos = document.getElementById('out-positivos');
    if (outPos) outPos.value = '';
    
    const outNeg = document.getElementById('out-negativos');
    if (outNeg) outNeg.value = '';
    
    const outEsp = document.getElementById('out-especiais');
    if (outEsp) outEsp.value = '';

    ultimaListaPositivos = [];
    ultimaListaNegativos = [];
};

// =========================================================================
// MÓDULO: LIDERANÇA
// =========================================================================
window.carregarLideresFirebase = async function() {
    const tbody = document.getElementById('tbody-lideranca-inputs');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando liderança no Firebase...</td></tr>';
    
    try {
        const db = firebase.firestore();
        let lideresEncontrados = [];
        
        const configDoc = await db.collection("nexus_config").doc("dados_externos").get();
        
        if(configDoc.exists && configDoc.data().membros_ativos) {
            const ativos = configDoc.data().membros_ativos;
            lideresEncontrados = ativos.filter(m => m.cargo && (m.cargo.toLowerCase().includes('lider') || m.cargo.toLowerCase().includes('líder')));
        }
        
        if (lideresEncontrados.length === 0) {
            const usersSnap = await db.collection('users').get();
            usersSnap.forEach(doc => {
                const d = doc.data();
                const cargo = (d.cargo || '').toLowerCase();
                if (cargo.includes('lider') || cargo.includes('líder')) {
                    lideresEncontrados.push({
                        nick: d.name || d.nick || 'Desconhecido',
                        cargo: d.cargo
                    });
                }
            });
        }
        
        tbody.innerHTML = '';
        
        if (lideresEncontrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 15px;">Nenhum líder encontrado. Clique em "Manual" para adicionar.</td></tr>';
            return;
        }

        lideresEncontrados.forEach(lider => {
            window.adicionarLinhaLideranca(lider.nick, lider.cargo);
        });

    } catch (e) {
        console.error("Erro ao buscar líderes:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 15px;">Erro de conexão. Clique em "Manual" para adicionar.</td></tr>';
    }
};

window.adicionarLinhaLideranca = function(nick = '', cargo = '') {
    const tbody = document.getElementById('tbody-lideranca-inputs');
    
    if(tbody.querySelector('td[colspan]')) {
        tbody.innerHTML = '';
    }

    const tr = document.createElement('tr');
    tr.className = 'linha-lider';
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    
    tr.innerHTML = `
        <td style="padding: 8px;">
            <input type="text" class="input-lider-nick nexus-input-dark" style="padding: 8px;" placeholder="Nick" value="${nick}">
        </td>
        <td style="padding: 8px;">
            <input type="text" class="input-lider-cargo nexus-input-dark" style="padding: 8px;" placeholder="Ex: Vice-Líder" value="${cargo}">
        </td>
        <td style="padding: 8px;">
            <input type="number" class="input-lider-ordens nexus-input-dark" style="padding: 8px; text-align: center;" placeholder="Ex: 6" min="0">
        </td>
        <td style="padding: 8px;">
            <input type="number" class="input-lider-cumpridas nexus-input-dark" style="padding: 8px; text-align: center;" placeholder="Ex: 6" min="0">
        </td>
    `;
    tbody.appendChild(tr);
};

window.calcularMedalhasLideranca = function() {
    const dataInicioStr = document.getElementById('lider-data-inicio').value;
    const dataFimStr = document.getElementById('lider-data-fim').value;
    const medalhasSemana = parseInt(document.getElementById('lider-teto').value) || 15;
    
    if (!dataInicioStr || !dataFimStr) {
        alert("Preencha a Data Inicial e Final da semana avaliada.");
        return;
    }

    const dataInicio = new Date(dataInicioStr + "T00:00:00");
    const dataFim = new Date(dataFimStr + "T00:00:00");

    if (dataFim < dataInicio) {
        alert("A data final deve ser maior ou igual à data inicial.");
        return;
    }

    const containerResultados = document.getElementById('resultados-lideranca-container');
    containerResultados.innerHTML = '';

    const linhas = document.querySelectorAll('#tbody-lideranca-inputs tr.linha-lider');
    
    if (linhas.length === 0) {
        containerResultados.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Adicione líderes à tabela primeiro.</div>';
        return;
    }

    linhas.forEach(tr => {
        const nick = tr.querySelector('.input-lider-nick').value.trim();
        const cargo = tr.querySelector('.input-lider-cargo').value.trim() || 'Líder';
        const ordensPrevistas = Math.max(0, parseInt(tr.querySelector('.input-lider-ordens').value) || 0);
        const ordensCumpridas = Math.max(0, parseInt(tr.querySelector('.input-lider-cumpridas').value) || 0);

        if (!nick) return;
        if (ordensPrevistas <= 0) return;

        const cumpridasValidas = Math.min(ordensCumpridas, ordensPrevistas);
        const faltas = Math.max(ordensPrevistas - cumpridasValidas, 0);
        const percentual = cumpridasValidas / ordensPrevistas;

        let medalhasFinais = Math.round(percentual * medalhasSemana);
        let tipoResultado = 'positivo';
        let tituloResultado = 'Gratificação semanal';
        let detalheResultado = `${cumpridasValidas}/${ordensPrevistas} ordens cumpridas`;
        let corResultado = '#10b981';

        if (faltas >= 2) {
            medalhasFinais = -Math.abs(medalhasSemana);
            tipoResultado = 'negativo';
            tituloResultado = 'Meta negativa semanal';
            detalheResultado = `${faltas} ordens não cumpridas`;
            corResultado = '#ef4444';
        } else if (faltas === 0) {
            medalhasFinais = medalhasSemana;
            detalheResultado = `Todas as ${ordensPrevistas} ordens cumpridas`;
        }

        const botaoPostagem = medalhasFinais === 0
            ? `<span style="color: #aaa; font-size: 0.8rem;">Sem postagem</span>`
            : `<button onclick="gerarLinkPostagemLideranca('${nick.replace(/'/g, "\\'")}', '${cargo.replace(/'/g, "\\'")}', ${medalhasFinais}, '${tipoResultado}')" class="btn-nexus" style="background: ${corResultado}; color: #fff; font-size: 0.85rem; padding: 8px 15px;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Postar
                </button>`;

        const cardHTML = `
            <div style="background: ${tipoResultado === 'negativo' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; border: 1px solid ${tipoResultado === 'negativo' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="display: block; font-size: 0.8rem; color: ${corResultado}; font-weight: bold; text-transform: uppercase;">${tituloResultado}: ${nick}</span>
                    <span style="font-size: 1.5rem; color: #fff; font-weight: 900;">${medalhasFinais}</span>
                    <span style="font-size: 0.75rem; color: #aaa; margin-left: 5px;">(${detalheResultado})</span>
                </div>
                ${botaoPostagem}
            </div>
        `;
        containerResultados.innerHTML += cardHTML;
    });
};

// =========================================================================
// MÓDULO NOVO: GRUPOS INTERNOS (3 CAIXAS SEPARADAS)
// =========================================================================
window.processarGruposInternos = function() {
    const textoDA = document.getElementById('grupos-da').value;
    const textoCDC = document.getElementById('grupos-cdc').value;
    const textoSPP = document.getElementById('grupos-spp').value;
    
    if (!textoDA.trim() && !textoCDC.trim() && !textoSPP.trim()) {
        alert("Cole os dados em pelo menos um dos grupos para processar.");
        return;
    }

    function normalizarNick(nick) {
        return nick.trim().toLowerCase();
    }

    function extrairDados(texto) {
        const linhas = texto.split('\n');
        const membrosPorNick = {};
        
        linhas.forEach(linha => {
            const colunas = linha.split('\t');
            if (colunas.length >= 2) {
                let nick = colunas[0].trim();
                let valor = colunas[colunas.length - 1].trim().replace(/[^0-9\-]/g, '');
                
                if (nick && nick.toUpperCase() !== "NICK" && valor !== "") {
                    let qtd = parseInt(valor);
                    if (qtd !== 0 && !isNaN(qtd)) {
                        const nickNormalizado = normalizarNick(nick);

                        if (!membrosPorNick[nickNormalizado]) {
                            membrosPorNick[nickNormalizado] = { nick, qtd: 0 };
                        }

                        membrosPorNick[nickNormalizado].nick = nick;
                        membrosPorNick[nickNormalizado].qtd += qtd;
                    }
                }
            }
        });

        return membrosPorNick;
    }

    function getTetoPorQuantidadeDeGrupos(qtdGrupos) {
        if (qtdGrupos >= 3) return 10;
        if (qtdGrupos === 2) return 15;
        return 20;
    }

    function ajustarMedalhasPorSubgrupos(dadosOriginais) {
        const participacoesPositivas = {};
        const gruposAjustados = {};

        Object.values(dadosOriginais).forEach(membros => {
            Object.entries(membros).forEach(([nickNormalizado, registro]) => {
                if (registro.qtd > 0) {
                    participacoesPositivas[nickNormalizado] = (participacoesPositivas[nickNormalizado] || 0) + 1;
                }
            });
        });

        Object.entries(dadosOriginais).forEach(([subgrupo, membros]) => {
            gruposAjustados[subgrupo] = {};

            Object.entries(membros).forEach(([nickNormalizado, registro]) => {
                const qtdGrupos = participacoesPositivas[nickNormalizado] || 1;
                const qtdAjustada = registro.qtd > 0
                    ? Math.min(registro.qtd, getTetoPorQuantidadeDeGrupos(qtdGrupos))
                    : registro.qtd;

                if (!gruposAjustados[subgrupo][qtdAjustada]) {
                    gruposAjustados[subgrupo][qtdAjustada] = [];
                }

                gruposAjustados[subgrupo][qtdAjustada].push(registro.nick);
            });
        });

        return gruposAjustados;
    }

    const dadosOriginais = {
        'DA': extrairDados(textoDA),
        'CDC': extrairDados(textoCDC),
        'SPP': extrairDados(textoSPP)
    };

    dadosGruposGlobais = ajustarMedalhasPorSubgrupos(dadosOriginais);

    renderizarResultadosGrupos();
    
    const btn = event.currentTarget;
    const btnOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Prontinho!';
    btn.classList.replace('btn-purple', 'btn-cyan');
    setTimeout(() => {
        btn.innerHTML = btnOriginal;
        btn.classList.replace('btn-cyan', 'btn-purple');
    }, 2000);
};

function renderizarResultadosGrupos() {
    const container = document.getElementById('resultados-grupos-container');
    container.innerHTML = '';

    let gerouAlgum = false;

    const nomesGrupos = ['DA', 'CDC', 'SPP'];
    const coresGrupos = {'DA': '#a855f7', 'CDC': '#3b82f6', 'SPP': '#f59e0b'};

    nomesGrupos.forEach(subgrupo => {
        const dados = dadosGruposGlobais[subgrupo];
        const qtds = Object.keys(dados).map(Number).sort((a, b) => b - a); 
        
        if (qtds.length > 0) {
            let htmlGrupo = `
                <div style="background: rgba(0,0,0,0.3); border-left: 4px solid ${coresGrupos[subgrupo]}; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <h4 style="color: ${coresGrupos[subgrupo]}; margin-top: 0; margin-bottom: 15px; font-size: 1.1rem;">${subgrupo}</h4>
            `;

            qtds.forEach(qtd => {
                gerouAlgum = true;
                const isPositivo = qtd > 0;
                const corBadge = isPositivo ? '#10b981' : '#ef4444';
                const sinal = isPositivo ? '+' : '';
                const nicks = dados[qtd].join(' / ');

                htmlGrupo += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <div style="flex: 1; padding-right: 15px;">
                            <span style="display: block; color: ${corBadge}; font-weight: bold; font-size: 0.85rem; margin-bottom: 5px;">${sinal}${qtd} MEDALHAS</span>
                            <span style="color: #ccc; font-family: monospace; font-size: 0.85rem;">${nicks}</span>
                        </div>
                        <button onclick="gerarLinkPostagemGrupos('${subgrupo}', ${qtd})" class="btn-nexus" style="background: ${corBadge}; color: white; font-size: 0.8rem; padding: 8px 15px; white-space: nowrap;">
                            <i class="fa-solid fa-paper-plane"></i> Postar ${sinal}${qtd}
                        </button>
                    </div>
                `;
            });

            htmlGrupo += `</div>`;
            container.innerHTML += htmlGrupo;
        }
    });

    if (!gerouAlgum) {
        container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Nenhum membro a receber medalhas encontrado nas tabelas.</div>';
    }
}

// =========================================================================
// MÁGICA: GERADOR DE LINKS AUTOMÁTICOS PRO FÓRUM
// =========================================================================
function formatarDataParaURL(dataString) {
    if (!dataString) return "";
    const partes = dataString.split('-'); 
    if (partes.length !== 3) return dataString;
    
    const mesesAbrv = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];
    const mesIndex = parseInt(partes[1], 10) - 1;
    
    return `${partes[2]} ${mesesAbrv[mesIndex]} ${partes[0]}`;
}

function getPeriodoMesParaGrupos(mesNome) {
    const mesesData = {
        'Janeiro': { abrv: 'Jan', mesNum: 0 },
        'Fevereiro': { abrv: 'Fev', mesNum: 1 },
        'Março': { abrv: 'Mar', mesNum: 2 },
        'Abril': { abrv: 'Abr', mesNum: 3 },
        'Maio': { abrv: 'Mai', mesNum: 4 },
        'Junho': { abrv: 'Jun', mesNum: 5 },
        'Julho': { abrv: 'Jul', mesNum: 6 },
        'Agosto': { abrv: 'Ago', mesNum: 7 },
        'Setembro': { abrv: 'Set', mesNum: 8 },
        'Outubro': { abrv: 'Out', mesNum: 9 },
        'Novembro': { abrv: 'Nov', mesNum: 10 },
        'Dezembro': { abrv: 'Dez', mesNum: 11 }
    };
    
    const anoAtual = new Date().getFullYear();
    const info = mesesData[mesNome];
    
    if(!info) return `Mês de ${mesNome}`;

    const ultimoDia = new Date(anoAtual, info.mesNum + 1, 0).getDate();
    const diaStr = ultimoDia < 10 ? '0' + ultimoDia : ultimoDia;
    
    return `01 ${info.abrv} ${anoAtual} até ${diaStr} ${info.abrv} ${anoAtual}`;
}

function getCargoSingular(cargoPlural) {
    const mapa = {
        'Professores': 'Professor',
        'Coordenadores': 'Coordenador',
        'Graduadores': 'Graduador',
        'Estagiários': 'Estagiário',
        'Conselho': 'Conselheiro',
        'Liderança': 'Líder'
    };
    return mapa[cargoPlural] || cargoPlural;
}

window.gerarLinkPostagem = function(tipo) {
    const responsavel = document.getElementById('cargo-responsavel').value.trim();
    const dataInicio = document.getElementById('cargo-data-inicio').value;
    const dataFim = document.getElementById('cargo-data-fim').value;

    if (!responsavel || !dataInicio || !dataFim) {
        alert("Atenção: Preencha o Responsável, Data Inicial e Data Final antes de postar!");
        return;
    }

    const nicksArray = tipo === 'positivos' ? ultimaListaPositivos : ultimaListaNegativos;
    
    if (!nicksArray || nicksArray.length === 0) {
        alert(`Não há membros ${tipo} filtrados para gerar a postagem.`);
        return;
    }

    const periodoStr = `${formatarDataParaURL(dataInicio)} até ${formatarDataParaURL(dataFim)}`;
    const gratificadosStr = nicksArray.join(' / ');
    const cargoSingular = getCargoSingular(cargoAtualSelecionado);
    
    const qtdMedalhasBase = window.getMedalhasPorCargo(cargoAtualSelecionado);
    const numeroMed = tipo === 'positivos' ? qtdMedalhasBase.toString() : `-${qtdMedalhasBase}`;
    
    const motivo = tipo === 'positivos' 
        ? "Cumprimento de meta do cargo de" 
        : "Não cumprimento de meta do cargo de";

    const urlBase = "https://www.policiarcc.com/h17-postagem-de-medalhas-af";
    
    const params = new URLSearchParams({
        responsavel_med: responsavel,
        grupo_tarefas: 'Professores',
        periodo_med: periodoStr,
        gratificados_med: gratificadosStr,
        cargo_med: cargoSingular,
        numero_med: numeroMed,
        motivo_grat: motivo
    });

    const urlFinal = `${urlBase}?${params.toString().replace(/\+/g, '%20')}`;
    window.open(urlFinal, '_blank');
};

window.gerarLinkPostagemLideranca = function(nick, cargo, medalhas, tipoResultado = 'positivo') {
    const responsavel = document.getElementById('lider-responsavel').value.trim();
    const dataInicio = document.getElementById('lider-data-inicio').value;
    const dataFim = document.getElementById('lider-data-fim').value;

    if (!responsavel || !dataInicio || !dataFim) {
        alert("Atenção: Preencha o Responsável, Data Inicial e Data Final no bloco da esquerda antes de postar!");
        return;
    }

    const periodoStr = `${formatarDataParaURL(dataInicio)} até ${formatarDataParaURL(dataFim)}`;
    const motivo = tipoResultado === 'negativo'
        ? `Não cumprimento de ordens do cargo de`
        : `Cumprimento de ordens do cargo de`;
    
    const params = new URLSearchParams({
        responsavel_med: responsavel,
        grupo_tarefas: 'Professores',
        periodo_med: periodoStr,
        gratificados_med: nick,
        cargo_med: cargo,
        numero_med: medalhas.toString(),
        motivo_grat: motivo
    });

    const urlFinal = `https://www.policiarcc.com/h17-postagem-de-medalhas-af?${params.toString().replace(/\+/g, '%20')}`;
    window.open(urlFinal, '_blank');
};

window.gerarLinkPostagemGrupos = function(subgrupo, qtdMedalhas) {
    const responsavel = document.getElementById('grupos-responsavel').value.trim();
    const mes = document.getElementById('grupos-mes').value;

    if (!responsavel) {
        alert("Atenção: Preencha o Responsável no topo antes de postar!");
        return;
    }

    const nicksArray = dadosGruposGlobais[subgrupo][qtdMedalhas];
    if (!nicksArray || nicksArray.length === 0) return;

    const gratificadosStr = nicksArray.join(' / ');
    
    const nomesSubgruposExtensos = {
        'DA': 'Departamento de Aplicação',
        'CDC': 'Comissão de Desenvolvimento Cultural',
        'SPP': 'Serviço de Proteção dos Professores'
    };

    const periodoFormatado = getPeriodoMesParaGrupos(mes);
    const urlBase = "https://www.policiarcc.com/h55-af-cofre-subgrupos";

    const params = new URLSearchParams({
        responsavel_med: responsavel,
        grupo_tarefas: 'Grupos Internos - Professores',
        sub_med: nomesSubgruposExtensos[subgrupo] || subgrupo,
        periodo_med: periodoFormatado,
        gratificados_med: gratificadosStr,
        numero_med: qtdMedalhas.toString()
    });

    const urlFinal = `${urlBase}?${params.toString().replace(/\+/g, '%20')}`;
    window.open(urlFinal, '_blank');
};

// =========================================================================
// SEGURANÇA: LIMITADOR DE CARGO (ESTAGIÁRIO+)
// =========================================================================
// Movido para o final para garantir que as funções da janela carreguem antes da verificação
document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica de Data Automática (Semana Vigente) ---
    const inputDataInicio = document.getElementById('cargo-data-inicio');
    const inputDataFim = document.getElementById('cargo-data-fim');

    if (inputDataInicio && inputDataFim) {
        inputDataInicio.addEventListener('change', function() {
            const cargosComSemanaVigente = ["Professores", "Coordenadores", "Estagiários", "Conselho"];
            
            if (cargosComSemanaVigente.includes(cargoAtualSelecionado)) {
                if (!this.value) return;
                
                const dataSelecionada = dayjs(this.value);
                if (dataSelecionada.isValid()) {
                    // Snaps para o Domingo daquela semana (0) e Sábado (6)
                    const domingo = dataSelecionada.day(0).format('YYYY-MM-DD');
                    const sabado = dataSelecionada.day(6).format('YYYY-MM-DD');
                    
                    this.value = domingo;
                    inputDataFim.value = sabado;
                }
            } else if (cargoAtualSelecionado === "Graduadores") {
                if (!this.value) return;
                
                const dataSelecionada = dayjs(this.value);
                if (dataSelecionada.isValid()) {
                    const dia = dataSelecionada.date();
                    let inicio, fim;
                    
                    if (dia <= 15) {
                        inicio = dataSelecionada.date(1).format('YYYY-MM-DD');
                        fim = dataSelecionada.date(15).format('YYYY-MM-DD');
                    } else {
                        inicio = dataSelecionada.date(16).format('YYYY-MM-DD');
                        fim = dataSelecionada.endOf('month').format('YYYY-MM-DD');
                    }
                    
                    this.value = inicio;
                    inputDataFim.value = fim;
                }
            }
        });
    }


    // --- Lógica de Data Automática (Liderança - Semana Vigente) ---
    const inputLiderInicio = document.getElementById('lider-data-inicio');
    const inputLiderFim = document.getElementById('lider-data-fim');

    if (inputLiderInicio && inputLiderFim) {
        inputLiderInicio.addEventListener('change', function() {
            if (!this.value) return;
            const dataSelecionada = dayjs(this.value);
            if (dataSelecionada.isValid()) {
                this.value = dataSelecionada.day(0).format('YYYY-MM-DD');
                inputLiderFim.value = dataSelecionada.day(6).format('YYYY-MM-DD');
            }
        });
    }

    try {

        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const db = firebase.firestore();
                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data() || {};
                        const cargo = String(userData.cargo || "").toLowerCase();
                        
                        // Busca pelas raízes das palavras (minúsculas)
                        const cargosPermitidos = ["estagi", "conselheir", "vice-l", "lider", "líder"];

                        const temAcesso = cargosPermitidos.some(c => cargo.includes(c));

                        if (!temAcesso) {
                            alert("Acesso Negado: Apenas membros com o cargo de Estagiário(a) ou superior podem acessar esta ferramenta.");
                            window.location.href = "/index.html"; 
                        }
                    } else {
                        window.location.href = "/index.html"; 
                    }
                }).catch(e => console.error("Erro na verificação de cargo:", e));
            } else {
                window.location.href = "/login.html"; 
            }
        });
    } catch(e) {
        console.error("Erro ao iniciar o Auth:", e);
    }
});
