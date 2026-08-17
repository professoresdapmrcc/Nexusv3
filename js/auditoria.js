// Aguarda o carregamento completo do conteúdo da página
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. CONFIGURAÇÃO DE ACESSO (SEM PROFESSOR) ---
    const cargosPermitidos = [
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

}); // <-- CORREÇÃO AQUI: Fechamento do DOMContentLoaded

const ESCALAS_GLOBAIS = {
    "Administração": [
        { funcao: "Atualização das Retificações de Erros", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Terça", papel: "conselho" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Quinta", papel: "conselho" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Atualização das Retificações de Erros", prazo: "Sábado", papel: "conselho" }, 
        { separador: true }, 
        { funcao: "Backup & Atualização da Planilha de Relatórios dos Professores", prazo: "Domingo", papel: "conselho" },
        { funcao: "Backup & Atualização da Planilha de Relatórios dos Coordenadores", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização da Escala de Envio da Carta de Auxílio dos Coordenadores", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Backup & Atualização da Planilha de Relatórios dos Graduadores", prazo: "Dias 01 e 16", papel: "conselho" }
    ],
    "Assistência": [
        { funcao: "Atualização do Quadro de Advertências", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Terça", papel: "conselho" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Quinta", papel: "conselho" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Advertências", prazo: "Sábado", papel: "conselho" }, 
        { separador: true }, 
        { funcao: "Fiscalização, Fechamento e MP de Avaliação da Ouvidoria", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Backup da Planilha de Avaliações", prazo: "Segunda", papel: "conselho" },
        { funcao: "Atualização da Consulta de Contribuições", prazo: "Segunda", papel: "conselho" },
        { funcao: "Atualização dos Vereditos na Ouvidoria", prazo: "Segunda", papel: "conselho" },
        { funcao: "Postagem das Medalhas dos Projetos", prazo: "Segunda", papel: "conselho" }
    ],
    "Atualização 1": [
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Terça", papel: "conselho" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Quinta", papel: "conselho" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Atualização dos Cursos no RCC System", prazo: "Sábado", papel: "conselho" }, 
        { separador: true }, 
        { funcao: "Conferência da Lista de Membros", prazo: "Sábado", papel: "conselho" },
        { funcao: "Atualização do Livro de Recordes (Professores)", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização do Livro de Recordes (Coordenadores)", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização do Livro de Recordes (Graduadores)", prazo: "Dias 01 e 16", papel: "conselho" }
    ],
    "Atualização 2": [
        { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Domingo", papel: "conselho" },
        { funcao: "Postagem dos Pontos da Categoria [A] & Atualização do Ranking Interno", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Postagem dos Pontos das Categorias [B] e [C] & Atualização do Ranking Interno", prazo: "Terça e dia 17", papel: "conselho" },
        { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Quinta", papel: "conselho" },
        { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Postagem dos Pontos da Categoria [D] & Atualização do Ranking Interno", prazo: "Sábado", papel: "conselho" },
        { separador: true },
        { funcao: "Postagem de Pontos Finais [A], [B], [C] e [D] & Atualização do Ranking Interno", prazo: "Dia 02", papel: "conselho" },
        { funcao: "Postagem do Destaque Mensal", prazo: "Dia 02", papel: "conselho" },
        { funcao: "Backup do Ranking Interno", prazo: "Dia 02", papel: "conselho" },
        { funcao: "Atualização do Calendário da Companhia", prazo: "Segunda", papel: "conselho" }
    ],
    "Contabilidade": [
        { funcao: "Porcentagem dos Professores", prazo: "Segunda", papel: "conselho" },
        { funcao: "Porcentagem dos Coordenadores", prazo: "Segunda", papel: "estagiario" }, 
        { funcao: "Porcentagem dos Graduadores", prazo: "Dias 16 & 01", papel: "conselho" },
        { separador: true },
        { funcao: "Postagem Advertências dos Professores", prazo: "Segunda", papel: "conselho" },
        { funcao: "Postagem Advertências dos Coordenadores", prazo: "Segunda", papel: "estagiario" }, 
        { funcao: "Postagem Advertências dos Graduadores", prazo: "Dias 16 & 01", papel: "conselho" },
        { separador: true },
        { funcao: "Troca dos Visuais dos BOT's no Corredor", prazo: "Segunda", papel: "conselho" },
        { funcao: "Postagem dos melhores da semana", prazo: "Segunda", papel: "estagiario" }, 
        { funcao: "Envio da MP de Justificativas", prazo: "Sábado", papel: "conselho" }
    ],
    "Documentação": [
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Terça", papel: "conselho" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Quinta", papel: "conselho" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Atualização e Backup da Lista de Membros", prazo: "Sábado", papel: "conselho" },
        { separador: true },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Domingo", papel: "conselho" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Terça", papel: "conselho" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Quinta", papel: "conselho" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Atualização do Quadro de Honra e Excelência", prazo: "Sábado", papel: "conselho" },
        { separador: true },
        { funcao: "Tópico Mensal no Controle de Arquivos", prazo: "Dia 01", papel: "conselho" }
    ],
    "Finanças": [
        { funcao: "Postagem das Medalhas dos Professores", prazo: "Terça", papel: "estagiario" },
        { funcao: "Postagem das Medalhas dos Coordenadores", prazo: "Terça", papel: "estagiario" },
        { funcao: "Postagem das Medalhas dos Graduadores", prazo: "Dias 17 e 02", papel: "conselho" },
        { funcao: "Postagem das Medalhas dos Estagiários", prazo: "Terça", papel: "conselho" },
        { funcao: "Postagem das Medalhas dos Conselheiros", prazo: "Terça", papel: "conselho" },
        { funcao: "Postagem das Medalhas da Liderança", prazo: "Dia 02", papel: "conselho" },
        { funcao: "Postagem das Medalhas dos Grupos Internos", prazo: "Dia 03", papel: "conselho" }
    ],
    "Segurança": [
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Domingo", papel: "conselho" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Terça", papel: "conselho" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Quarta", papel: "estagiario" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Quinta", papel: "conselho" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Sexta", papel: "estagiario" },
        { funcao: "Fiscalização da Listagem, Grupo e Subfórum", prazo: "Sábado", papel: "conselho" }
    ]
};

// ============================================================================
// SISTEMA DE MATCH INTELIGENTE (FUZZY MATCHER) E CATEGORIZADOR "IA"
// ============================================================================

function padronizarTexto(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[.,&/#!$%\^*;:{}=\-_`~()|]/g, " ") 
        .replace(/\s{2,}/g, " ") 
        .trim();
}

function verificaMatchFuncao(esperada, arrayLogsBrutos) {
    const espNorm = padronizarTexto(esperada);
    const palavrasIgnoradas = ['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'e', 'o', 'a', 'os', 'as'];
    const palavrasEsperadas = espNorm.split(' ').filter(p => p.length > 2 && !palavrasIgnoradas.includes(p));
    
    let requiredMatches = palavrasEsperadas.length;
    if (palavrasEsperadas.length >= 4) requiredMatches = Math.ceil(palavrasEsperadas.length / 2) + 1;
    else if (palavrasEsperadas.length === 3) requiredMatches = 2;

    return arrayLogsBrutos.some(logRaw => {
        const logNorm = padronizarTexto(logRaw);
        if (logNorm.includes(espNorm)) return true;
        if (espNorm.includes(logNorm) && logNorm.length > 8) return true;
        if (palavrasEsperadas.length > 0) {
            const matches = palavrasEsperadas.filter(p => logNorm.includes(p)).length;
            if (matches >= requiredMatches) return true;
        }
        return false;
    });
}

function categorizarLog(log) {
    const textoFuncao = (log.funcao_realizada || log.atividade || "").toLowerCase().trim();
    const textoTipo = (log.tipo_postagem || "").toLowerCase().trim();

    // Exceção Crítica: Se a pessoa fez a função da contabilidade, É TRABALHO, não desculpa.
    if (textoFuncao.includes("envio da mp de justificativa")) return "funcao";

    if (textoFuncao.includes("atividade") || textoFuncao.includes("extra") || textoTipo.includes("atividade")) {
        return "atividade";
    }

    if (textoFuncao === "justificativa" || 
        textoFuncao.includes("ausência") || 
        textoFuncao.includes("ausencia") || 
        textoTipo.includes("justificativa")) {
        return "justificativa";
    }

    return "funcao"; 
}

// --- FUNÇÕES VISUAIS E AUXILIARES ---
window.toggleRecomendacoes = function() {
    document.getElementById('nexus-recomenda').classList.toggle('minimized');
};

const nomeValido = (nome) => {
    if (!nome) return false;
    const n = nome.trim().toLowerCase();
    if (n.includes('sem respons')) return false;
    return /[a-z0-9]/i.test(n);
};

window.detalhesAuditoriaGlobal = [];

window.dadosSemanaAtual = {
    logs: [],
    equipes: {}
};

// ============================================================================
// 2. MOTOR DA AUDITORIA (COM ATUALIZAÇÃO DOS KPIs)
// ============================================================================
async function gerarRelatorio() {
    const dataInicioInput = document.getElementById('data-inicio').value;
    const dataFimInput = document.getElementById('data-fim').value;

    if (!dataInicioInput || !dataFimInput) {
        alert("Liderança, defina as datas na barra superior.");
        return;
    }

    const db = firebase.firestore();
    const corpo = document.getElementById('corpo-tabela');
    
    window.detalhesAuditoriaGlobal = [];
    
    corpo.innerHTML = `
        <div class="rec-empty" style="padding: 40px; text-align: center; color: #a855f7;">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px;">NEXUS IA: Cruzando Histórico e Estatuto...</p>
        </div>
    `;

    try {
        const dataInicioObj = new Date(dataInicioInput + "T12:00:00");
        const domingoInicio = new Date(dataInicioObj);
        domingoInicio.setDate(dataInicioObj.getDate() - dataInicioObj.getDay());

        const diaStr = String(domingoInicio.getDate()).padStart(2, '0');
        const mesStr = String(domingoInicio.getMonth() + 1).padStart(2, '0');
        const anoStr = domingoInicio.getFullYear();
        const nomePastaSemana = `escalas_semana_${diaStr}-${mesStr}-${anoStr}`;

        let estadoConselhos = {};
        let mapaCargosGlobais = {};

        const escalasBaseSnap = await db.collection('conselho').doc('painel_escalas').collection('itens').get();
        escalasBaseSnap.forEach(doc => {
            const d = doc.data();
            if (!estadoConselhos[d.conselho]) estadoConselhos[d.conselho] = { conselheiro: null, estagiario: null };
            
            const nickReal = (d.membro || d.estagiario || "").trim();
            const nickLower = nickReal.toLowerCase();

            if (doc.id.toLowerCase().startsWith('conselh') && nomeValido(nickReal)) {
                estadoConselhos[d.conselho].conselheiro = nickReal;
                mapaCargosGlobais[nickLower] = 'Conselheiro(a)';
            }
            if (doc.id.toLowerCase().startsWith('estagiario') && nomeValido(nickReal)) {
                estadoConselhos[d.conselho].estagiario = nickReal;
                mapaCargosGlobais[nickLower] = 'Estagiário(a)';
            }
        });

        const escalasBackupSnap = await db.collection('conselho').doc(nomePastaSemana).collection('itens').get();
        if (!escalasBackupSnap.empty) {
            escalasBackupSnap.forEach(doc => {
                const d = doc.data();
                if (!estadoConselhos[d.conselho]) estadoConselhos[d.conselho] = { conselheiro: null, estagiario: null };
                
                const nickReal = (d.membro || d.estagiario || "").trim();
                const nickLower = nickReal.toLowerCase();

                if (doc.id.toLowerCase().startsWith('conselh')) {
                    estadoConselhos[d.conselho].conselheiro = nomeValido(nickReal) ? nickReal : null;
                    if (nomeValido(nickReal)) mapaCargosGlobais[nickLower] = 'Conselheiro(a)';
                }
                if (doc.id.toLowerCase().startsWith('estagiario')) {
                    estadoConselhos[d.conselho].estagiario = nomeValido(nickReal) ? nickReal : null;
                    if (nomeValido(nickReal)) mapaCargosGlobais[nickLower] = 'Estagiário(a)';
                }
            });
        }

        const inicioData = new Date(dataInicioInput + "T00:00:00");
        const fimData = new Date(dataFimInput + "T23:59:59");
        
        let trintaDiasAtras = new Date(inicioData);
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        
        const logsSnap = await db.collection('conselho').doc('painel_registros').collection('historico')
            .where('timestamp', '>=', trintaDiasAtras)
            .where('timestamp', '<=', fimData)
            .get();

        let todosLogsPeriodoAtual = [];
        let todosLogsHistoricos = [];

        logsSnap.forEach(doc => {
            const data = doc.data();
            if (!data.timestamp) return; 
            
            const logDate = data.timestamp.toDate();
            if (logDate >= inicioData && logDate <= fimData) {
                todosLogsPeriodoAtual.push(data);
            } else {
                todosLogsHistoricos.push(data);
            }
        });

        window.dadosSemanaAtual.logs = todosLogsPeriodoAtual;
        window.dadosSemanaAtual.equipes = estadoConselhos;

        if(typeof dayjs !== 'undefined') {
            const dIniStr = dayjs(dataInicioInput).format('DD MMM YYYY');
            const dFimStr = dayjs(dataFimInput).format('DD MMM YYYY');
            document.getElementById('texto-semana').innerText = `${dIniStr} a ${dFimStr}`;
        }

        corpo.innerHTML = "";
        let insightsIA = [];
        let membrosProcessados = new Set();
        let analiseEstatuto = [];

        let listaMembrosAuditoria = [];

        for (const [conselhoNome, equipe] of Object.entries(estadoConselhos)) {
            if (equipe.conselheiro && nomeValido(equipe.conselheiro)) {
                listaMembrosAuditoria.push({ nick: equipe.conselheiro, cargo: 'Conselheiro(a)', conselhoNome: conselhoNome, temEstagiario: !!equipe.estagiario });
            }
            if (equipe.estagiario && nomeValido(equipe.estagiario)) {
                listaMembrosAuditoria.push({ nick: equipe.estagiario, cargo: 'Estagiário(a)', conselhoNome: conselhoNome, temEstagiario: true });
            }
        }

        todosLogsPeriodoAtual.forEach(log => {
            const nickLog = (log.nick || "").trim();
            const conselhoLog = log.conselho || "Sem Conselho";
            
            if (nickLog && nomeValido(nickLog)) {
                const jaExiste = listaMembrosAuditoria.some(m => m.nick.toLowerCase() === nickLog.toLowerCase());
                if (!jaExiste) {
                    let cargoLog = mapaCargosGlobais[nickLog.toLowerCase()];
                    if (!cargoLog) {
                        cargoLog = 'Estagiário(a)'; 
                        if (log.cargo && log.cargo.toLowerCase().includes('conselh')) cargoLog = 'Conselheiro(a)';
                    }
                    listaMembrosAuditoria.push({ nick: nickLog, cargo: cargoLog, conselhoNome: conselhoLog, temEstagiario: true });
                }
            }
        });

        listaMembrosAuditoria.forEach(membro => {
            const nickLower = membro.nick.toLowerCase();
            if (!membrosProcessados.has(nickLower)) {
                membrosProcessados.add(nickLower);
                
                const logsAtuais = todosLogsPeriodoAtual.filter(l => l.nick && l.nick.toLowerCase() === nickLower);
                const logsHistoricos = todosLogsHistoricos.filter(l => l.nick && l.nick.toLowerCase() === nickLower);
                
                const papel = membro.cargo === 'Conselheiro(a)' ? 'conselho' : 'estagiario';
                const esperadas = obterEscalaEsperada(membro.conselhoNome, papel, membro.temEstagiario, dataInicioInput, dataFimInput);
                
                const resultado = auditarMembro(membro.cargo, membro.nick, membro.conselhoNome, membro.temEstagiario, logsAtuais, logsHistoricos, esperadas.length, inicioData, esperadas);
                
                analiseEstatuto.push(resultado);
                window.detalhesAuditoriaGlobal.push(...resultado.detalhes);
            }
        });

        analiseEstatuto.sort((a, b) => {
            if (a.cargo === "Conselheiro(a)" && b.cargo === "Estagiário(a)") return -1;
            if (a.cargo === "Estagiário(a)" && b.cargo === "Conselheiro(a)") return 1;
            return a.nick.localeCompare(b.nick);
        });

        // ==========================================
        // 🔥 LÓGICA DE ATUALIZAÇÃO DOS KPIs
        // ==========================================
        const kpiTotal = document.getElementById('kpi-total');
        if (kpiTotal) {
            document.getElementById('kpi-total').innerText = analiseEstatuto.length;
            document.getElementById('kpi-regulares').innerText = analiseEstatuto.filter(r => r.status === "REGULAR").length;
            document.getElementById('kpi-especiais').innerText = analiseEstatuto.filter(r => r.status === "CASO ESPECIAL").length;
            document.getElementById('kpi-irregulares').innerText = analiseEstatuto.filter(r => r.status === "IRREGULAR").length;
            
            document.getElementById('kpi-section').classList.remove('hidden');
        }

        // ==========================================
        // RENDERIZAÇÃO DA TABELA (Com Tooltips)
        // ==========================================
        analiseEstatuto.forEach(res => {
            let textoTooltip = res.motivoHtml.replace(/<[^>]*>?/gm, ''); 
            if(textoTooltip === "") textoTooltip = "Desempenho aprovado pela IA.";

            corpo.innerHTML += `
                <div class="lista-row item-lista" data-cargo="${res.cargo}" data-nick="${res.nick}" data-status="${res.status}" data-motivo="${res.motivoStr}">
                    <div class="cargo-label">${res.cargo}</div>
                    <div class="nick-principal">${res.nick}</div>
                    <div class="col-center"><span class="badge-status ${res.classe}">${res.status}</span></div>
                    <div class="${res.textoClasse}" title="${textoTooltip}">${res.motivoHtml}</div>
                </div>
            `;

            if (res.insights) res.insights.forEach(i => insightsIA.push(i));
        });

        renderizarInsightsIA(insightsIA);
        renderizarTabelaDetalhada();

        const abaAtiva = document.querySelector('.btn-conselho.active');
        if(abaAtiva) abaAtiva.click();

    } catch (e) {
        console.error(e);
        corpo.innerHTML = '<div class="rec-empty"><p style="color:#ef4444;">Falha ao processar estatuto.</p></div>';
    }
}

// ============================================================================
// 3. O CÉREBRO DA AUDITORIA
// ============================================================================
function auditarMembro(cargo, nick, conselhoNome, temEstagiario, logsAtuais, logsHistoricos, meta, dataInicioAnalise, esperadas) {
    let res = { cargo, nick, status: "REGULAR", motivoHtml: "", motivoStr: "", classe: "badge-regular", textoClasse: "motivo-texto", tipoErro: null, feitos: 0, justs: 0, meta, faltas_reais: 0, insights: [], detalhes: [] };

    if (meta === 0) {
        res.motivoHtml = "Folga programada (Sem escala)";
        res.motivoStr = "Sem escala";
        res.textoClasse = "motivo-inativo";
        return res;
    }

    const funcoesFeitasBrutas = logsAtuais.filter(l => categorizarLog(l) === 'funcao').map(l => l.funcao_realizada || "");

    let pendentesDesc = [];
    let feitosContagem = 0;

    esperadas.forEach(esp => {
        const foiFeita = verificaMatchFuncao(esp.funcao, funcoesFeitasBrutas);

        let statusDetalhe = "PENDENTE";
        if (foiFeita) { statusDetalhe = "REALIZADA"; feitosContagem++; }

        res.detalhes.push({ nick: nick, conselho: conselhoNome, funcao: esp.funcao, data: esp.dataStr, status: statusDetalhe });

        if (statusDetalhe === "PENDENTE") {
            pendentesDesc.push(`<b>${esp.funcao}</b> <span style="color:#888;">(${esp.dataStr})</span>`);
        }
    });

    res.feitos = feitosContagem;

    const justificativasPostadas = logsAtuais.filter(l => categorizarLog(l) === 'justificativa');
    res.justs = justificativasPostadas.length;

    justificativasPostadas.forEach(l => {
        let dataMapeada = "---";
        if (l.data_realizacao) {
            const partes = l.data_realizacao.split('-');
            if (partes.length === 3) dataMapeada = `${partes[2]}/${partes[1]}`;
        } else if (l.timestamp && typeof l.timestamp.toDate === 'function') {
            const dataJust = l.timestamp.toDate();
            const dia = String(dataJust.getDate()).padStart(2, '0');
            const mes = String(dataJust.getMonth() + 1).padStart(2, '0');
            dataMapeada = `${dia}/${mes}`;
        }

        const alvo = l.referente_a || l.funcao_realizada || l.observacao || l.comentarios || l.comentario || "Justificativa";
        res.detalhes.push({ nick: nick, conselho: conselhoNome, funcao: `Justificativa postada: ${alvo}`, data: dataMapeada, status: "JUSTIFICADA" });
    });

    let atividadesExtras = logsAtuais.filter(l => categorizarLog(l) === 'atividade');
    atividadesExtras.forEach(l => {
        let dataMapeada = "---";
        if (l.data_realizacao) {
            const partes = l.data_realizacao.split('-');
            if (partes.length === 3) dataMapeada = `${partes[2]}/${partes[1]}`;
        }
        res.detalhes.push({ nick: nick, conselho: conselhoNome, funcao: l.descricao ? `Atividade Extra: ${l.descricao}` : "Atividade Extra", data: dataMapeada, status: "EXTRA" });
    });

    const trintaDiasAtras = new Date(dataInicioAnalise);
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const faltas_extras_30d = logsHistoricos.filter(l => {
        const d = l.timestamp.toDate();
        return d >= trintaDiasAtras && l.status_extra === "NAO_REALIZADO";
    }).length;

    const falta_extra_atual = logsAtuais.some(l => l.designado_extra && !l.realizado_extra);
    if (falta_extra_atual) {
        res.status = "IRREGULAR";
        res.classe = "badge-erro";
        
        if (faltas_extras_30d >= 1) {
            res.motivoHtml = "Negligência Crítica (2ª Notificação Extra)";
            res.motivoStr = "Abandono de dever (Extra)";
            res.tipoErro = 'ABANDONO_EXTRA';
            res.insights.push({ tipo: 'danger', titulo: 'Alerta Vermelho: Abandono', msg: `A NEXUS IA detectou que <strong>${nick}</strong> ignorou atividades extras designadas pela 2ª vez em menos de 30 dias.` });
        } else {
            res.motivoHtml = "Falta em Atividade Extra Designada";
            res.motivoStr = "Notificação Extra";
            res.tipoErro = 'NOTIFICACAO_EXTRA';
            res.insights.push({ tipo: 'warning', titulo: 'Infração Detectada', msg: `<strong>${nick}</strong> falhou na entrega de uma atividade extra obrigatória. Uma notificação deve ser gerada.` });
        }
        return res;
    }

    const faltas = Math.max(meta - res.feitos, 0);
    res.faltas_reais = faltas;

    if (faltas >= 2) {
        res.status = "IRREGULAR";
        res.classe = "badge-erro";
        res.motivoHtml = `Meta negativa: ${faltas} ordens não cumpridas`;
        res.motivoStr = "Meta negativa semanal";
        res.tipoErro = 'BAIXA_PRODUTIVIDADE';
        const txtJust = res.justs > 0 ? ` Registrou ${res.justs} justificativa(s), sem abonar a contagem de ordens.` : "";
        res.insights.push({ tipo: 'danger', titulo: `${nick} - Meta negativa`, msg: `O membro <strong>${nick}</strong> não cumpriu ${faltas} de ${meta} ordem(ns) da escala semanal.${txtJust}` });
    } else {
        res.status = "REGULAR";
        res.classe = "badge-regular";
        res.textoClasse = "motivo-texto";

        if (faltas === 1) {
            res.motivoHtml = "Gratificação proporcional";
            res.motivoStr = "Regular proporcional";
            const txtJust = res.justs > 0 ? ` Registrou ${res.justs} justificativa(s).` : "";
            res.insights.push({ tipo: 'warning', titulo: `${nick} - Proporcional`, msg: `O membro <strong>${nick}</strong> cumpriu ${res.feitos}/${meta} ordem(ns). Deve receber gratificação proporcional às ordens cumpridas.${txtJust}` });
        } else {
            res.motivoHtml = "";
            res.motivoStr = "";
            const txtJust = res.justs > 0 ? ` Também registrou ${res.justs} justificativa(s).` : "";
            res.insights.push({ tipo: 'success', titulo: `${nick} - Regular`, msg: `O membro <strong>${nick}</strong> cumpriu todas as ${meta} ordem(ns) da escala semanal.${txtJust}` });
        }
    }

    return res;
}

function obterEscalaEsperada(conselhoNome, papel, temEstagiario, startStr, endStr) {
    const escala = ESCALAS_GLOBAIS[conselhoNome];
    let esperadas = [];
    if (!escala) return esperadas;

    let atual = new Date(startStr + "T12:00:00"); 
    let fim = new Date(endStr + "T12:00:00");

    while (atual <= fim) {
        escala.forEach(t => {
            if (t.separador) return;
            let ehMinha = false;
            if (papel === 'estagiario' && t.papel === 'estagiario') ehMinha = true;
            if (papel === 'conselho') {
                if (t.papel === 'conselho') ehMinha = true;
                if (!temEstagiario && t.papel === 'estagiario') ehMinha = true;
            }
            if (ehMinha && verificaDia(t.prazo, atual)) {
                const dia = String(atual.getDate()).padStart(2, '0');
                const mes = String(atual.getMonth() + 1).padStart(2, '0');
                esperadas.push({ funcao: t.funcao, dataStr: `${dia}/${mes}` });
            }
        });
        atual.setDate(atual.getDate() + 1);
    }
    return esperadas;
}

function verificaDia(textoPrazo, dataObj) {
    const txt = padronizarTexto(textoPrazo);
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    if (txt.includes(diasSemana[dataObj.getDay()])) return true;
    const numeros = txt.match(/\d+/g);
    if (numeros) {
        for (let num of numeros) {
            if (parseInt(num) === dataObj.getDate()) return true;
        }
    }
    return false;
}

// ============================================================================
// 4. MÉTODOS VISUAIS E RAIO-X
// ============================================================================
function renderizarInsightsIA(insights) {
    const lista = document.getElementById('lista-recomendacoes');
    const badge = document.getElementById('badge-rec');
    
    if (insights.length === 0) {
        lista.innerHTML = '<div class="rec-empty"><i class="fa-solid fa-check-circle" style="color:#10b981;"></i><p>Tudo limpo! A NEXUS IA não encontrou infrações na equipe.</p></div>';
        badge.classList.add('hidden');
        document.getElementById('nexus-recomenda').classList.add('minimized');
        return;
    }

    lista.innerHTML = "";
    badge.innerText = insights.length;
    badge.classList.remove('hidden');

    const uniqueInsights = Array.from(new Set(insights.map(i => JSON.stringify(i)))).map(i => JSON.parse(i));

    uniqueInsights.forEach(ins => {
        let icon = 'fa-info-circle';
        if (ins.tipo === 'danger') icon = 'fa-triangle-exclamation';
        if (ins.tipo === 'warning') icon = 'fa-circle-exclamation';
        if (ins.tipo === 'success') icon = 'fa-award';

        lista.innerHTML += `
            <div class="rec-item alert-${ins.tipo}">
                <div class="rec-icon-box"><i class="fa-solid ${icon}"></i></div>
                <div class="rec-content">
                    <h4>${ins.titulo}</h4>
                    <p>${ins.msg}</p>
                </div>
            </div>
        `;
    });

    if(uniqueInsights.some(i => i.tipo === 'danger')) {
        document.getElementById('nexus-recomenda').classList.remove('minimized');
    }
}

function renderizarTabelaDetalhada() {
    const corpoTabelaPrincipal = document.getElementById('corpo-tabela');
    if (!corpoTabelaPrincipal) return;

    let containerDetalhes = document.getElementById('container-raiox-auditoria');
    
    if (!containerDetalhes) {
        containerDetalhes = document.createElement('div');
        containerDetalhes.id = 'container-raiox-auditoria';
        containerDetalhes.style.marginTop = '40px';
        containerDetalhes.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        containerDetalhes.style.paddingTop = '20px';
        
        corpoTabelaPrincipal.parentElement.parentElement.appendChild(containerDetalhes);
    }

    containerDetalhes.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap: wrap; gap: 15px;">
            <h3 style="color:#fff; font-size:1.3rem; margin:0; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-microscope" style="color:var(--cor-primaria-clara);"></i> Raio-X de Atividades
            </h3>
            
            <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                <select id="filtro-conselho-raiox" class="input-global" style="min-width: 180px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color:#fff; padding: 8px 12px; border-radius: 6px;" onchange="filtrarRaioX()">
                    <option value="Todos">Todos os Conselhos</option>
                    <option value="Administração">Administração</option>
                    <option value="Assistência">Assistência</option>
                    <option value="Atualização 1">Atualização 1</option>
                    <option value="Atualização 2">Atualização 2</option>
                    <option value="Contabilidade">Contabilidade</option>
                    <option value="Documentação">Documentação</option>
                    <option value="Finanças">Finanças</option>
                    <option value="Segurança">Segurança</option>
                </select>

                <select id="filtro-status-raiox" class="input-global" style="min-width: 180px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color:#fff; padding: 8px 12px; border-radius: 6px;" onchange="filtrarRaioX()">
                    <option value="Todos">Todos os Status</option>
                    <option value="PENDENTE">Pendentes</option>
                    <option value="REALIZADA">Realizadas</option>
                    <option value="JUSTIFICADA">Justificativas</option>
                    <option value="EXTRA">Atividades Extras</option>
                </select>
            </div>
        </div>
        
        <div style="overflow-x:auto; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <table style="width:100%; border-collapse: collapse; text-align:left; color:#ccc; font-size:0.9rem;">
                <thead>
                    <tr style="background: rgba(255,255,255,0.05); border-bottom: 2px solid var(--cor-primaria-clara);">
                        <th style="padding:12px; text-transform:uppercase; font-size:0.8rem; color:#fff;">Nick</th>
                        <th style="padding:12px; text-transform:uppercase; font-size:0.8rem; color:#fff;">Conselho</th>
                        <th style="padding:12px; text-transform:uppercase; font-size:0.8rem; color:#fff;">Função / Atividade</th>
                        <th style="padding:12px; text-transform:uppercase; font-size:0.8rem; color:#fff;">Data</th>
                        <th style="padding:12px; text-transform:uppercase; font-size:0.8rem; color:#fff;">Status</th>
                    </tr>
                </thead>
                <tbody id="tbody-raiox">
                </tbody>
            </table>
        </div>
    `;

    window.filtrarRaioX();
}

window.filtrarRaioX = function() {
    const filtroConselho = document.getElementById('filtro-conselho-raiox').value;
    const filtroStatus = document.getElementById('filtro-status-raiox').value;
    const tbody = document.getElementById('tbody-raiox');
    tbody.innerHTML = '';

    let filtrados = window.detalhesAuditoriaGlobal;
    
    if (filtroConselho !== 'Todos') {
        filtrados = filtrados.filter(d => d.conselho === filtroConselho);
    }

    if (filtroStatus !== 'Todos') {
        filtrados = filtrados.filter(d => d.status === filtroStatus);
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Nenhuma atividade encontrada para estes filtros.</td></tr>';
        return;
    }

    filtrados.forEach(d => {
        let corStatus = '#ccc';
        let iconeStatus = '';
        
        if (d.status === 'REALIZADA' || d.status === 'EXTRA') {
            corStatus = '#10b981'; 
            iconeStatus = '<i class="fa-solid fa-check"></i>';
        } else if (d.status === 'JUSTIFICADA') {
            corStatus = '#a855f7';
            iconeStatus = '<i class="fa-solid fa-file-signature"></i>';
        } else if (d.status === 'PENDENTE') {
            corStatus = '#ef4444'; 
            iconeStatus = '<i class="fa-solid fa-xmark"></i>';
        }

        tbody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition: background 0.2s;">
                <td style="padding:12px; font-weight:bold; color:#fff;">${d.nick}</td>
                <td style="padding:12px;">${d.conselho}</td>
                <td style="padding:12px; color: #fff;">${d.funcao}</td>
                <td style="padding:12px;">${d.data}</td>
                <td style="padding:12px; font-weight:bold; color:${corStatus};">
                    ${iconeStatus} ${d.status}
                </td>
            </tr>
        `;
    });
}

function copiarParaPlanilha() {
    const rows = document.querySelectorAll(".item-lista");
    if(rows.length === 0) return alert("Analise os dados antes de copiar.");

    let content = "";
    
    rows.forEach(row => {
        const cargo = row.getAttribute('data-cargo');
        const nick = row.getAttribute('data-nick');
        const status = row.getAttribute('data-status');
        const motivo = row.getAttribute('data-motivo');
        
        content += `${cargo}\t${nick}\t${status}\t${motivo}\n`;
    });

    navigator.clipboard.writeText(content).then(() => {
        alert("NEXUS: Relatório copiado com sucesso (sem o cabeçalho)!");
    });
}

// ============================================================================
// 5. FUNÇÃO PARA GERENCIAR A TELA DO DASHBOARD
// ============================================================================
window.abrirPainel = function(nomeConselho, elementoBotao) {
    if (window.dadosSemanaAtual.logs.length === 0) {
        alert("Por favor, clique em ANALISAR primeiro para carregar os dados desta semana.");
        return;
    }

    document.querySelectorAll('.btn-conselho').forEach(b => b.classList.remove('active'));
    if (elementoBotao) elementoBotao.classList.add('active');

    document.getElementById('dashboard-conselho').style.display = 'block';
    document.getElementById('titulo-conselho-dinamico').innerText = `CONSELHO DA ${nomeConselho.toUpperCase()}`;

    const tbody = document.getElementById('tbody-historico');
    tbody.innerHTML = "";
    
    const equipeAtiva = window.dadosSemanaAtual.equipes[nomeConselho] || { conselheiro: null, estagiario: null };
    const membrosDoConselho = [
        equipeAtiva.conselheiro ? equipeAtiva.conselheiro.toLowerCase() : null, 
        equipeAtiva.estagiario ? equipeAtiva.estagiario.toLowerCase() : null
    ].filter(Boolean);

    const logsConselho = window.dadosSemanaAtual.logs.filter(log => {
        const porConselho = log.conselho === nomeConselho;
        const porMembro = log.nick && membrosDoConselho.includes(log.nick.toLowerCase());
        return porConselho || porMembro;
    });
    
    if (logsConselho.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum registro encontrado para a equipe desta semana.</td></tr>`;
    } else {
        logsConselho.sort((a,b) => b.timestamp.toDate() - a.timestamp.toDate());

        logsConselho.forEach(log => {
            const dataObj = log.timestamp.toDate();
            const dataFmt = `${String(dataObj.getDate()).padStart(2,'0')}/${String(dataObj.getMonth()+1).padStart(2,'0')} <br> <span style="color:#94a3b8; font-size:0.8rem;">${String(dataObj.getHours()).padStart(2,'0')}:${String(dataObj.getMinutes()).padStart(2,'0')}</span>`;
            
            const txtFuncao = log.funcao_realizada || log.atividade || log.referente_a || "Registro Geral";
            const urlImagem = log.comprovacao_link || log.link_imagem || log.imagem || log.url;
            const btnImg = urlImagem ? `<button class="btn-ver-imagem" onclick="window.open('${urlImagem}','_blank')">VER IMAGEM</button>` : '<span style="color:#475569;">---</span>';
            const comentarios = log.observacao || log.comentarios || '<span style="color:#475569;">---</span>';

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:800; color:#fff;">${log.nick}</td>
                    <td>${dataFmt}</td>
                    <td class="funcao-realizada">${txtFuncao}</td>
                    <td>${btnImg}</td>
                    <td>${comentarios}</td>
                    <td><button class="btn-excluir" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });
    }

    const listaPrazos = document.getElementById('lista-prazos-dinamica');
    listaPrazos.innerHTML = "";

    const arrayEscala = ESCALAS_GLOBAIS[nomeConselho] || [];

    arrayEscala.forEach(tarefa => {
        if (tarefa.separador) {
            listaPrazos.innerHTML += `<div style="height:15px; margin-bottom:5px;"></div>`;
            return;
        }

        let nickResponsavel = "Sem Responsável";
        let avatarResponsavel = "https://www.habbo.com.br/habbo-imaging/avatarimage?user=Habbo&action=std&direction=2&head_direction=2&gesture=sml&size=m";

        if (tarefa.papel === 'conselho' && equipeAtiva.conselheiro) {
            nickResponsavel = equipeAtiva.conselheiro;
            avatarResponsavel = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickResponsavel}&action=std&direction=2&head_direction=2&gesture=sml&size=m`;
        } else if (tarefa.papel === 'estagiario' && equipeAtiva.estagiario) {
            nickResponsavel = equipeAtiva.estagiario;
            avatarResponsavel = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickResponsavel}&action=std&direction=2&head_direction=2&gesture=sml&size=m`;
        } else if (tarefa.papel === 'estagiario' && !equipeAtiva.estagiario && equipeAtiva.conselheiro) {
            nickResponsavel = equipeAtiva.conselheiro;
            avatarResponsavel = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickResponsavel}&action=std&direction=2&head_direction=2&gesture=sml&size=m`;
        }

        listaPrazos.innerHTML += `
            <div class="card-prazo">
                <div class="card-prazo-info">
                    <h4>${tarefa.funcao}</h4>
                    <div class="card-prazo-membro">
                        <img src="${avatarResponsavel}" alt="avatar" onerror="this.src='https://www.habbo.com.br/habbo-imaging/avatarimage?user=Habbo&action=std&direction=2&head_direction=2&gesture=sml&size=m'">
                        ${nickResponsavel}
                    </div>
                </div>
                <div class="badge-dia">${tarefa.prazo}</div>
            </div>
        `;
    });
};
