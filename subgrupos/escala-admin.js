// =====================================================================
// == ESCALA DAS ADMINISTRAÇÕES v2
// == Formato de cards com múltiplas entradas por função
// == Lógica de "postar", auto-status por prazo, função de hoje
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

    // =====================================================================
    // == CONFIGURAÇÃO DOS GRUPOS
    // =====================================================================
    const GRUPOS_CONFIG = {
        da: {
            nome: 'Departamento de Aplicação',
            sigla: 'DA',
            imagem: '/imgs/da-imagem.png',
            campoFirestore: 'da',
            cargosAcesso: ['Fiscal', 'Vice-Intendente', 'Intendente'],
            cargosAdmin: ['Vice-Intendente', 'Intendente'],
            funcoes: [
                'FISCALIZAÇÃO DO RELATÓRIO DE ATIVIDADES',
                'BACKUP E DESEMPENHO SEMANAL',
                'ATUALIZAÇÃO E FISCALIZAÇÃO DA LISTA DE MEMBROS & QUADRO DE ADVERTÊNCIAS',
                'OUVIDORIA',
                'RANKING INTERNO',
                'RETIFICAÇÕES DE ERROS'
            ]
        },
        cdc: {
            nome: 'Comissão de Desenvolvimento Cultural',
            sigla: 'CDC',
            imagem: '/imgs/cdc-imagem.png',
            campoFirestore: 'cdc',
            cargosAcesso: ['Secretário(a)', 'Vice-Diretor(a)', 'Diretor(a)'],
            cargosAdmin: ['Vice-Diretor(a)', 'Diretor(a)'],
            funcoes: [
                'ESCALA - ANALISTAS',
                'ESCALA - DOCENTES / ATUALIZAÇÃO DA LISTA DE TEMAS',
                'DESEMPENHO DOS MEMBROS / PONTOS & OUVIDORIA',
                'FISCALIZAÇÃO WEEKLY',
                'ESCALA - PROMOTORES',
                'LISTAGEM DE MEMBROS E QUADRO DE ADVS'
            ]
        },
        spp: {
            nome: 'Serviço de Proteção dos Professores',
            sigla: 'SPP',
            imagem: '/imgs/spp-imagem.png',
            campoFirestore: 'spp',
            cargosAcesso: ['Subcomandante', 'Comandante'],
            cargosAdmin: ['Subcomandante', 'Comandante'],
            funcoes: [
                'LISTAGEM DE MEMBROS E QUADRO DE ADVERTÊNCIAS',
                'OUVIDORIA',
                'ESCALA ANALISTAS E PERITOS',
                'DESEMPENHO SEMANAL'
            ]
        }
    };

    const CARGOS_GLOBAIS_ACESSO = ['Vice-Líder', 'Líder'];
    const ROLE_ADMIN = 'admin';

    const STATUS_LABELS = {
        'atualizado': 'OK',
        'pendente': 'AGUARDANDO',
        'aguardando_justificativa': 'ATRASADO',
        'nao_feito': 'NÃO FEITO',
        'justificado': 'JUSTIFICADO',
        'nao_escalado': 'PENDENTE'
    };

    // =====================================================================
    // == DOM ELEMENTS
    // =====================================================================
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const grupoTabs = document.getElementById('grupo-tabs');
    const loadingState = document.getElementById('loading-state');
    const accessDeniedState = document.getElementById('access-denied-state');
    const escalaContent = document.getElementById('escala-content');
    const mesReferencia = document.getElementById('mes-referencia');
    const btnBackup = document.getElementById('btn-backup');
    const filtroFuncaoInput = document.getElementById('filtro-funcao');
    const filtroMembroInput = document.getElementById('filtro-membro');
    const funcoesGrid = document.getElementById('funcoes-grid');
    const emptyState = document.getElementById('empty-state');
    const btnCriarEscala = document.getElementById('btn-criar-escala');
    const saveIndicator = document.getElementById('save-indicator');
    const funcaoHojeBanner = document.getElementById('funcao-hoje-banner');
    const hojeListaFuncoes = document.getElementById('hoje-lista-funcoes');
    const funcaoAtrasadaBanner = document.getElementById('funcao-atrasada-banner');
    const atrasadaListaFuncoes = document.getElementById('atrasada-lista-funcoes');
    const modalPostar = document.getElementById('modal-postar');
    const modalFuncaoNome = document.getElementById('modal-funcao-nome');
    const modalPrazoTexto = document.getElementById('modal-prazo-texto');
    const modalNickSelect = document.getElementById('modal-nick-select');
    const modalBtnCancelar = document.getElementById('modal-btn-cancelar');
    const modalBtnConfirmar = document.getElementById('modal-btn-confirmar');

    const modalJustificar = document.getElementById('modal-justificar');
    const justFuncaoNome = document.getElementById('justificativa-funcao-nome');
    const justPrazoTexto = document.getElementById('justificativa-prazo-texto');
    const justTexto = document.getElementById('justificativa-texto');
    const justBtnCancelar = document.getElementById('justificativa-btn-cancelar');
    const justBtnConfirmar = document.getElementById('justificativa-btn-confirmar');

    const justificativasContainer = document.getElementById('justificativas-container');
    const justificativasGrid = document.getElementById('justificativas-grid');
    const naoFeitasContainer = document.getElementById('nao-feitas-container');
    const naoFeitasGrid = document.getElementById('nao-feitas-grid');

    // =====================================================================
    // == STATE
    // =====================================================================
    let grupoAtual = null;
    let configGrupo = null;
    let isAdmin = false;
    let currentDocId = null;
    let currentEscalaData = null;
    let currentUserNick = null;
    let modoSelecao = false;
    let ehAdminDoG = false; // Controle global de permissão admin para o grupo atual
    let membrosCache = null; // cache dos membros do grupo
    let pendingPost = null; // { funcaoIndex, entradaIndex } para o modal de postar
    let pendingJustificativa = null; // { fIdx, eIdx } para o modal de justificativa
    let filtroAtualFuncao = ''; // Guarda a busca ativa por função
    let filtroAtualMembro = ''; // Guarda a busca ativa por membro
    let expandedWeeksState = {}; // Guarda { 'week-YYYY-WW': true (expandida), false (encolhida) }
    let isLiderancaGlobal = false; // Flag para permissão suprema das Lideranças
    let pendingLideranca = null;

    const modalLideranca = document.getElementById('modal-lideranca');
    const lidFuncaoNome = document.getElementById('lideranca-funcao-nome');
    const lidPrazoTexto = document.getElementById('lideranca-prazo-texto');
    const lidStatusSelect = document.getElementById('lideranca-status-select');
    const lidMotivo = document.getElementById('lideranca-motivo');
    const lidBtnCancelar = document.getElementById('lideranca-btn-cancelar');
    const lidBtnConfirmar = document.getElementById('lideranca-btn-confirmar');

    // =====================================================================
    // == URL DETECTION
    // =====================================================================
    const urlParams = new URLSearchParams(window.location.search);
    const grupoParam = urlParams.get('grupo');

    if (!grupoParam || !GRUPOS_CONFIG[grupoParam]) {
        modoSelecao = true;
        pageSubtitle.textContent = '';
        // Preencher o vazio com um aviso amigável
        funcoesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; opacity: 0.3; text-align: center;">
                <i class="fas fa-mouse-pointer" style="font-size: 3rem; margin-bottom: 1.5rem;"></i>
                <p style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">AGUARDANDO SELEÇÃO</p>
                <p style="font-size: 0.85rem;">Escolha um dos departamentos acima para visualizar a escala correspondente.</p>
            </div>
        `;
    } else {
        grupoAtual = grupoParam;
        configGrupo = GRUPOS_CONFIG[grupoAtual];
        pageTitle.textContent = 'ESCALA DA ADMINISTRAÇÃO';
        pageSubtitle.textContent = configGrupo.nome;
        document.title = `NEXUS - Escala ADM ${configGrupo.sigla}`;
    }

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    mesReferencia.value = mesAtual;

    // =====================================================================
    // == PERMISSÕES
    // =====================================================================
    const verificarPermissoes = (userData, grupoDesejado = null) => {
        if (!userData) return { temAcesso: false, ehAdmin: false };

        // Cargos de Liderança (Passe livre total)
        const cargosLideranca = ['Vice-Líder', 'Líder', 'Vice-Lider', 'Lider'];
        const meuCargoG = (userData.cargo || '').trim();
        const ehLideranca = cargosLideranca.includes(meuCargoG);
        isLiderancaGlobal = ehLideranca;

        if (ehLideranca) return { temAcesso: true, ehAdmin: true };

        // Se for um cargo específico de um subgrupo
        const meusCargosNosGrupos = {
            da: userData.da || '',
            cdc: userData.cdc || '',
            spp: userData.spp || ''
        };

        const checkGrupo = (g) => {
            const meuCargo = meusCargosNosGrupos[g];
            return meuCargo && GRUPOS_CONFIG[g].cargosAcesso.includes(meuCargo);
        };

        // Se o código pediu para verificar um grupo específico (ex: clicou na tab CDC)
        if (grupoDesejado) {
            const temAcessoAoGrupo = checkGrupo(grupoDesejado);
            // Verifica se no grupo também tem cargo de admin
            const meuCargoNoG = meusCargosNosGrupos[grupoDesejado];
            const ehAdminNoG = meuCargoNoG && GRUPOS_CONFIG[grupoDesejado].cargosAdmin.includes(meuCargoNoG);
            return { temAcesso: temAcessoAoGrupo, ehAdmin: ehAdminNoG };
        }

        // Caso geral (inicialização)
        const temAlgumAcesso = Object.keys(GRUPOS_CONFIG).some(g => checkGrupo(g));
        return { temAcesso: temAlgumAcesso, ehAdmin: false };
    };

    const montarGrupoTabs = (userData, showAllIfAdmin = true) => {
        grupoTabs.innerHTML = '';
        grupoTabs.style.display = 'flex';

        Object.keys(GRUPOS_CONFIG).forEach(key => {
            const config = GRUPOS_CONFIG[key];
            const { temAcesso } = verificarPermissoes(userData, key);

            // SÓ CRIA A TAB SE TIVER ACESSO (ou for Líder/Vice)
            if (temAcesso) {
                const tab = document.createElement('a');
                tab.href = `escala-admin.html?grupo=${key}`;
                tab.className = `grupo-tab ${key === grupoAtual ? 'active' : ''}`;
                tab.innerHTML = `<img src="${config.imagem}" alt="${config.sigla}"><span>${config.sigla}</span>`;
                grupoTabs.appendChild(tab);
            }
        });
    };

    // =====================================================================
    // == DATE HELPERS
    // =====================================================================
    function getHojeStr() {
        const h = new Date();
        return `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
    }

    function parsePrazo(prazoStr) {
        if (!prazoStr) return null;
        const parts = prazoStr.split('/');
        if (parts.length !== 3) return null;
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    function getWeekInfo(dStrOrDate) {
        let d = typeof dStrOrDate === 'string' ? parsePrazo(dStrOrDate) : dStrOrDate;
        if (!d) return null;

        // Strip time info specifically para evitar bugs de horas quebradas no JS
        const dateNormal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const startOfYear = new Date(dateNormal.getFullYear(), 0, 1);

        // Usa Math.round ao invés de division float para tolerância a DST (horário verão)
        const pastDays = Math.round((dateNormal - startOfYear) / 86400000);
        const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

        return {
            year: dateNormal.getFullYear(),
            weekNumber: weekNumber,
            id: `week-${dateNormal.getFullYear()}-${weekNumber}`,
            dateNormal: dateNormal
        };
    }

    function calcularStatusAutomatico(entrada) {
        // Se já foi postado ou justificado, não muda
        if (['atualizado', 'justificado'].includes(entrada.status)) return entrada.status;

        // Se a Liderança reabriu e forçou um status, esse deve prevalecer (pendente, aguardando, nao_feito)
        if (entrada.statusOverride) return entrada.statusOverride.status;

        // Auto-correção: se estava "não escalado" mas agora tem um responsável no banco
        if (entrada.status === 'nao_escalado') {
            if (entrada.responsavel && entrada.responsavel.trim() !== '') {
                entrada.status = 'pendente';
            } else {
                return 'nao_escalado';
            }
        }

        const prazoDate = parsePrazo(entrada.prazo);
        if (!prazoDate) return entrada.status || 'pendente';

        const agora = new Date();
        agora.setHours(0, 0, 0, 0);
        prazoDate.setHours(0, 0, 0, 0);

        const diffMs = agora - prazoDate;
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDias <= 0) return 'pendente'; // ainda no prazo ou futuro
        if (diffDias === 1) return 'aguardando_justificativa'; // 1 dia atrasado
        return 'nao_feito'; // mais de 1 dia atrasado
    }

    /**
     * Gera as datas de um mês com base no intervalo em dias.
     * @param {string} mesRef - Mês no formato "YYYY-MM"
     * @param {number} intervaloDias - A cada quantos dias (ex: 7 = semanal)
     * @returns {string[]} Array de datas no formato "dd/mm/aaaa"
     */
    function gerarDatasFrequencia(mesRef, intervaloDias) {
        const [ano, mes] = mesRef.split('-').map(Number);
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const datas = [];
        const intervalo = Math.max(1, Math.min(intervaloDias || 7, 31));

        let dia = 1;
        while (dia <= diasNoMes) {
            datas.push(`${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`);
            dia += intervalo;
        }

        return datas;
    }

    function aplicarFrequencia(funcaoIndex, intervaloDias) {
        if (!currentEscalaData) return;
        const mesRef = mesReferencia.value;
        if (!mesRef) return;

        const funcao = currentEscalaData.funcoes[funcaoIndex];
        funcao.frequencia = intervaloDias; // armazena como número de dias

        // Guardar entradas existentes
        const todosExistentes = {};
        const existentesComDados = {};
        (funcao.entradas || []).forEach(e => {
            if (e.prazo) {
                todosExistentes[e.prazo] = e;
                // Considera ter dados se tiver responsável, status alterado, postagem ou justificativa
                if ((e.responsavel && e.responsavel.trim() !== '') ||
                    e.status !== 'nao_escalado' ||
                    e.postadoEm ||
                    (e.justificativaTexto && e.justificativaTexto.trim() !== '')) {
                    existentesComDados[e.prazo] = e;
                }
            }
        });

        const novasDatas = gerarDatasFrequencia(mesRef, intervaloDias);
        const mapFinais = {};

        // Injeta as novas datas que a frequência gerou
        novasDatas.forEach(data => {
            if (todosExistentes[data]) {
                mapFinais[data] = todosExistentes[data]; // se a data já existia, recupera do jeito que tava
            } else {
                mapFinais[data] = { prazo: data, responsavel: '', status: 'nao_escalado', postadoEm: null };
            }
        });

        // Resgata os dias aleatórios "fora da frequência" que já tinham membros logados / dados lançados
        Object.keys(existentesComDados).forEach(dataPrazo => {
            if (!mapFinais[dataPrazo]) {
                mapFinais[dataPrazo] = existentesComDados[dataPrazo];
            }
        });

        // Converte pra Array o mapa e ordena pelo dia pra tabela não ficar desorganizada
        funcao.entradas = Object.values(mapFinais).sort((a, b) => {
            const pA = parsePrazo(a.prazo);
            const pB = parsePrazo(b.prazo);
            return (pA || 0) - (pB || 0);
        });

        salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);

        // Salvar também como padrão para futuros meses
        salvarPadrao();
    }

    function adaptarDatas(funcaoIndex, dataInicialStr, intervaloDias) {
        if (!currentEscalaData) return;
        const funcao = currentEscalaData.funcoes[funcaoIndex];
        const dtInicio = parsePrazo(dataInicialStr);
        if (!dtInicio) return;

        const mesRef = mesReferencia.value;
        const [ano, mes] = mesRef.split('-').map(Number);
        const ultimoDiaMes = new Date(ano, mes, 0);

        const todosExistentes = {};
        const existentesComDados = {};
        (funcao.entradas || []).forEach(e => {
            if (e.prazo) {
                todosExistentes[e.prazo] = e;
                if ((e.responsavel && e.responsavel.trim() !== '') ||
                    e.status !== 'nao_escalado' ||
                    e.postadoEm ||
                    (e.justificativaTexto && e.justificativaTexto.trim() !== '')) {
                    existentesComDados[e.prazo] = e;
                }
            }
        });

        const novasDatas = [];
        let dataAtual = dtInicio;
        while (dataAtual <= ultimoDiaMes) {
            novasDatas.push(`${String(dataAtual.getDate()).padStart(2, '0')}/${String(dataAtual.getMonth() + 1).padStart(2, '0')}/${dataAtual.getFullYear()}`);
            dataAtual.setDate(dataAtual.getDate() + intervaloDias);
        }

        const mapFinais = {};
        novasDatas.forEach(data => {
            if (todosExistentes[data]) {
                mapFinais[data] = todosExistentes[data];
            } else {
                mapFinais[data] = { prazo: data, responsavel: '', status: 'nao_escalado', postadoEm: null };
            }
        });

        Object.keys(existentesComDados).forEach(dataPrazo => {
            if (!mapFinais[dataPrazo]) {
                mapFinais[dataPrazo] = existentesComDados[dataPrazo];
            }
        });

        funcao.entradas = Object.values(mapFinais).sort((a, b) => {
            const pA = parsePrazo(a.prazo);
            const pB = parsePrazo(b.prazo);
            return (pA || 0) - (pB || 0);
        });

        salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
        salvarPadrao();
    }

    /**
     * Salva os padrões de frequência de todas as funções no Firestore.
     * Documento: padrao_{grupo} (ex: padrao_da)
     */
    async function salvarPadrao() {
        if (!currentEscalaData || !grupoAtual) return;
        const padroes = {};
        currentEscalaData.funcoes.forEach(f => {
            padroes[f.nome] = { frequencia: f.frequencia || 7 };
        });

        try {
            await db.collection('escalasgruposinternos').doc(`padrao_${grupoAtual}`).set({
                grupo: grupoAtual,
                padroes: padroes,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('📋 [Escala] Padrões salvos.');
        } catch (error) {
            console.error('🔥 Erro ao salvar padrões:', error);
        }
    }

    /**
     * Carrega os padrões salvos para o grupo atual.
     * @returns {object|null} Mapa de { nomeFuncao: { frequencia: number } }
     */
    async function carregarPadrao() {
        if (!grupoAtual) return null;
        try {
            const doc = await db.collection('escalasgruposinternos').doc(`padrao_${grupoAtual}`).get();
            if (doc.exists) {
                return doc.data().padroes || null;
            }
        } catch (error) {
            console.error('🔥 Erro ao carregar padrões:', error);
        }
        return null;
    }

    // =====================================================================
    // == FIRESTORE
    // =====================================================================
    function getDocId(mes) {
        const [ano, mesNum] = mes.split('-');
        return `${grupoAtual}_${ano}_${mesNum}`;
    }

    async function carregarEscala(ehAdminDoG) {
        const mesSelecionado = mesReferencia.value;
        if (!mesSelecionado || !grupoAtual) return;

        currentDocId = getDocId(mesSelecionado);
        funcoesGrid.innerHTML = '';
        emptyState.style.display = 'none';
        funcaoHojeBanner.style.display = 'none';

        try {
            const docSnap = await db.collection('escalasgruposinternos').doc(currentDocId).get();
            await carregarMembrosGrupo(); // pré-carrega membros para popular os dropdowns

            if (docSnap.exists) {
                currentEscalaData = docSnap.data();

                // Atualizar dropdown de funções
                if (filtroFuncaoInput && filtroFuncaoInput.tagName === 'SELECT') {
                    const currentFiltro = filtroFuncaoInput.value;
                    filtroFuncaoInput.innerHTML = '<option value="">Todas Funções</option>';
                    if (currentEscalaData && currentEscalaData.funcoes) {
                        currentEscalaData.funcoes.forEach(f => {
                            const opt = document.createElement('option');
                            opt.value = f.nome.toLowerCase();
                            opt.textContent = f.nome;
                            filtroFuncaoInput.appendChild(opt);
                        });
                    }
                    filtroFuncaoInput.value = currentFiltro; // restaura se já estivesse pesquisando
                }

                renderizarEscala(currentEscalaData.funcoes);
            } else {
                currentEscalaData = null;
                funcoesGrid.innerHTML = '';
                emptyState.style.display = 'block';
                btnCriarEscala.style.display = ehAdminDoG ? 'inline-flex' : 'none';
            }

            const btnNova = document.getElementById('btn-nova-escala');
            if (btnNova) btnNova.style.display = (ehAdminDoG && currentEscalaData) ? 'inline-flex' : 'none';
            const btnImportar = document.getElementById('btn-importar-escala');
            if (btnImportar) btnImportar.style.display = (ehAdminDoG && currentEscalaData) ? 'inline-flex' : 'none';

        } catch (error) {
            console.error('🔥 Erro ao carregar escala:', error);
            mostrarIndicador('Erro ao carregar escala', true);
        }
    }

    async function criarEscala() {
        const mesSelecionado = mesReferencia.value;
        if (!mesSelecionado) return;

        const docId = getDocId(mesSelecionado);

        const padroes = await carregarPadrao();

        let funcoesNomes = [];
        if (padroes && Object.keys(padroes).length > 0) {
            funcoesNomes = Object.keys(padroes);
        } else {
            funcoesNomes = configGrupo.funcoes;
        }

        const funcoesIniciais = funcoesNomes.map(nome => {
            const freq = (padroes && padroes[nome]) ? padroes[nome].frequencia : 7;
            return {
                nome,
                frequencia: freq,
                entradas: gerarDatasFrequencia(mesSelecionado, freq).map(data => ({
                    prazo: data,
                    responsavel: '',
                    status: 'nao_escalado',
                    postadoEm: null
                }))
            };
        });

        try {
            await db.collection('escalasgruposinternos').doc(docId).set({
                grupo: grupoAtual,
                mesReferencia: mesSelecionado,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                funcoes: funcoesIniciais
            });
            mostrarIndicador('Escala criada com padrões salvos!');
            await carregarEscala();
        } catch (error) {
            console.error('🔥 Erro ao criar escala:', error);
            mostrarIndicador('Erro ao criar escala', true);
        }
    }

    async function salvarEscalaCompleta() {
        if (!currentDocId || !currentEscalaData) return;
        try {
            await db.collection('escalasgruposinternos').doc(currentDocId).update({
                funcoes: currentEscalaData.funcoes,
                ultimaEdicao: firebase.firestore.FieldValue.serverTimestamp()
            });
            mostrarIndicador('Salvo com sucesso!');
        } catch (error) {
            console.error('🔥 Erro ao salvar:', error);
            mostrarIndicador('Erro ao salvar', true);
        }
    }

    /**
     * Busca os membros do grupo atual no Firestore.
     * Retorna array de { nick, cargo } e cacheia o resultado.
     */
    async function carregarMembrosGrupo() {
        if (membrosCache) return membrosCache;
        if (!configGrupo) return [];

        try {
            const snapshot = await db.collection('users').get();
            const membros = [];
            const CARGOS_GLOBAIS = ['Líder', 'Vice-Líder', 'Admin'];

            snapshot.forEach(doc => {
                const data = doc.data();
                const cargoNoGrupo = data[configGrupo.campoFirestore];

                // Tem acesso específico no grupo?
                const temAcessoLocal = cargoNoGrupo && cargoNoGrupo.trim() !== '' && configGrupo.cargosAcesso.includes(cargoNoGrupo);

                // Apenas membros específicos do grupo devem aparecer na escala (no dropdown)
                // Líderes e Admins podem ver a página e gerenciar, mas não são escalados.
                if (temAcessoLocal) {
                    membros.push({
                        nick: data.name || doc.id,
                        cargo: cargoNoGrupo || data.cargo || 'Admin'
                    });
                }
            });
            membros.sort((a, b) => a.nick.localeCompare(b.nick));
            membrosCache = membros;
            return membros;
        } catch (error) {
            console.error('🔥 Erro ao carregar membros:', error);
            return [];
        }
    }

    /**
     * Abre o modal de confirmação de postagem.
     */
    async function abrirModalPostar(funcaoIndex, entradaIndex) {
        if (!currentEscalaData) return;
        const funcao = currentEscalaData.funcoes[funcaoIndex];
        const entrada = funcao.entradas[entradaIndex];

        pendingPost = { funcaoIndex, entradaIndex };

        // Preencher info do modal
        modalFuncaoNome.textContent = funcao.nome;
        modalPrazoTexto.textContent = `Prazo: ${entrada.prazo || '—'}`;

        // Carregar membros no dropdown
        modalNickSelect.innerHTML = '<option value="">Carregando...</option>';
        modalPostar.style.display = 'flex';

        const membros = await carregarMembrosGrupo();
        modalNickSelect.innerHTML = '';

        membros.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.nick;
            opt.textContent = m.nick;
            // Pré-selecionar o usuário logado
            if (currentUserNick && m.nick.toLowerCase() === currentUserNick.toLowerCase()) {
                opt.selected = true;
            }
            modalNickSelect.appendChild(opt);
        });
    }

    function fecharModal() {
        modalPostar.style.display = 'none';
        pendingPost = null;
    }

    async function confirmarPostagem() {
        if (!pendingPost || !currentEscalaData) return;
        const nick = modalNickSelect.value;
        if (!nick) { alert('Selecione quem realizou a função.'); return; }

        const entrada = currentEscalaData.funcoes[pendingPost.funcaoIndex].entradas[pendingPost.entradaIndex];
        entrada.status = 'atualizado';
        entrada.responsavel = nick;
        entrada.postadoEm = new Date().toISOString();

        if (entrada.statusOverride) {
            entrada.reabertoPorLideranca = entrada.statusOverride;
            delete entrada.statusOverride;
        }

        fecharModal();
        await salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
    }

    // Event listeners do modal
    modalBtnCancelar.addEventListener('click', fecharModal);
    modalBtnConfirmar.addEventListener('click', confirmarPostagem);
    modalPostar.addEventListener('click', (e) => {
        if (e.target === modalPostar) fecharModal(); // Click fora fecha
    });

    async function justificarEntrada(fIdx, eIdx) {
        if (!currentEscalaData) return;
        const funcao = currentEscalaData.funcoes[fIdx];
        const entrada = funcao.entradas[eIdx];

        pendingJustificativa = { fIdx, eIdx };
        justFuncaoNome.textContent = funcao.nome;
        justPrazoTexto.textContent = `Prazo perdido: ${entrada.prazo || '—'} - Responsável: ${entrada.responsavel || '—'}`;
        justTexto.value = '';

        modalJustificar.style.display = 'flex';
        justTexto.focus();
    }

    function fecharModalJustificar() {
        modalJustificar.style.display = 'none';
        pendingJustificativa = null;
    }

    async function confirmarJustificativa() {
        if (!pendingJustificativa || !currentEscalaData) return;
        const motivo = justTexto.value.trim();
        if (!motivo) { alert('Escreva o motivo da justificativa.'); return; }

        const entrada = currentEscalaData.funcoes[pendingJustificativa.fIdx].entradas[pendingJustificativa.eIdx];
        entrada.status = 'justificado';
        entrada.justificativaTexto = motivo;

        if (entrada.statusOverride) {
            entrada.reabertoPorLideranca = entrada.statusOverride;
            delete entrada.statusOverride;
        }

        entrada.justificadoEm = new Date().toISOString();

        fecharModalJustificar();
        await salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
    }

    // Modal Liderança (Poder Supremo)
    function abrirModalLideranca(fIdx, eIdx) {
        if (!currentEscalaData) return;
        const funcao = currentEscalaData.funcoes[fIdx];
        const entrada = funcao.entradas[eIdx];

        pendingLideranca = { fIdx, eIdx };

        lidFuncaoNome.textContent = funcao.nome;
        lidPrazoTexto.textContent = `Prazo original: ${entrada.prazo || '—'} - Resp: ${entrada.responsavel || '—'}`;

        if (entrada.statusOverride) {
            lidStatusSelect.value = entrada.statusOverride.status;
            lidMotivo.value = entrada.statusOverride.motivo || '';
        } else {
            // Incialmente tenta colocar pro pendente pra ser facil
            lidStatusSelect.value = 'pendente';
            lidMotivo.value = '';
        }

        modalLideranca.style.display = 'flex';
    }

    function fecharModalLideranca() {
        if (modalLideranca) modalLideranca.style.display = 'none';
        pendingLideranca = null;
    }

    async function confirmarLideranca() {
        if (!pendingLideranca || !currentEscalaData) return;

        const novostatus = lidStatusSelect.value;
        const motivo = lidMotivo.value.trim();

        if (!motivo) {
            alert('A liderança precisa informar o motivo (o "pq") dessa alteração.');
            return;
        }

        const entrada = currentEscalaData.funcoes[pendingLideranca.fIdx].entradas[pendingLideranca.eIdx];

        entrada.status = novostatus;
        entrada.postadoEm = null;
        entrada.justificadoEm = null;
        entrada.justificativaTexto = null;

        entrada.statusOverride = {
            status: novostatus,
            motivo: motivo,
            autor: currentUserNick || 'Liderança'
        };

        fecharModalLideranca();
        await salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
        mostrarIndicador('Status alterado pela Liderança!');
    }

    if (lidBtnCancelar) lidBtnCancelar.addEventListener('click', fecharModalLideranca);
    if (lidBtnConfirmar) lidBtnConfirmar.addEventListener('click', confirmarLideranca);
    if (modalLideranca) {
        modalLideranca.addEventListener('click', (e) => {
            if (e.target === modalLideranca) fecharModalLideranca();
        });
    }

    // Event listeners do modal justificar
    justBtnCancelar.addEventListener('click', fecharModalJustificar);
    justBtnConfirmar.addEventListener('click', confirmarJustificativa);
    modalJustificar.addEventListener('click', (e) => {
        if (e.target === modalJustificar) fecharModalJustificar();
    });

    // =====================================================================
    // == RENDERIZAÇÃO
    // =====================================================================
    function renderizarJustificativas(funcoes) {
        if (!justificativasGrid) return;
        justificativasGrid.innerHTML = '';
        let count = 0;

        funcoes.forEach(funcao => {
            (funcao.entradas || []).forEach(entrada => {
                if (entrada.status === 'justificado' && entrada.justificativaTexto) {
                    count++;
                    const dataObj = entrada.justificadoEm ? dayjs(entrada.justificadoEm) : dayjs();
                    const justDate = dataObj.format('DD/MM [às] HH:mm');

                    const div = document.createElement('div');
                    div.className = 'justificativa-card';

                    let tagLideranca = '';
                    if (entrada.reabertoPorLideranca) {
                        tagLideranca = `<div style="font-size: 0.70rem; color: #9b59b6; margin-bottom: 0.5rem; font-weight: bold;"><i class="fas fa-user-shield"></i> Reaberto pela Liderança: "${escapeHtml(entrada.reabertoPorLideranca.motivo)}"</div>`;
                    }

                    div.innerHTML = `
                        <div class="jus-func"><i class="fas fa-file-alt" style="color:#f39c12"></i> ${escapeHtml(funcao.nome)}</div>
                        <div class="jus-meta">
                            <span><i class="fas fa-calendar-alt"></i> Prazo original: ${escapeHtml(entrada.prazo)}</span>
                            <span><i class="fas fa-user"></i> ${escapeHtml(entrada.responsavel || 'Sem dono')}</span>
                            <span style="font-size:0.75rem; opacity:0.6; margin-left:auto;">Enviado: ${justDate}</span>
                        </div>
                        ${tagLideranca}
                        <div class="jus-text">"${escapeHtml(entrada.justificativaTexto)}"</div>
                    `;
                    justificativasGrid.appendChild(div);
                }
            });
        });

        if (count > 0) {
            justificativasContainer.style.display = 'block';
        } else {
            justificativasContainer.style.display = 'none';
        }
    }

    function renderizarNaoFeitas(funcoes) {
        if (!naoFeitasGrid) return;
        naoFeitasGrid.innerHTML = '';
        let count = 0;

        funcoes.forEach(funcao => {
            (funcao.entradas || []).forEach(entrada => {
                const statusReal = calcularStatusAutomatico(entrada);
                if (statusReal === 'nao_feito') {
                    count++;
                    const item = document.createElement('div');
                    item.className = 'justificativa-card';
                    item.style.borderLeftColor = '#e74c3c';

                    if (entrada.statusOverride && entrada.statusOverride.status === 'nao_feito') {
                        item.innerHTML = `
                            <div class="jus-func" style="color: #e74c3c;"><i class="fas fa-times-circle"></i> ${escapeHtml(funcao.nome)}</div>
                            <div class="jus-meta">
                                <span><i class="fas fa-calendar-alt"></i> Prazo: ${escapeHtml(entrada.prazo)}</span>
                                <span><i class="fas fa-user-slash"></i> ${escapeHtml(entrada.responsavel || 'Não Escalado')}</span>
                            </div>
                            <div style="font-size: 0.70rem; color: #9b59b6; margin-top: 0.6rem; font-weight: bold; text-transform: uppercase;"><i class="fas fa-user-shield"></i> Liderança aplicou falta: "${escapeHtml(entrada.statusOverride.motivo)}"</div>
                        `;
                    } else {
                        item.innerHTML = `
                            <div class="jus-func" style="color: #e74c3c;"><i class="fas fa-times-circle"></i> ${escapeHtml(funcao.nome)}</div>
                            <div class="jus-meta">
                                <span><i class="fas fa-calendar-alt"></i> Prazo: ${escapeHtml(entrada.prazo)}</span>
                                <span><i class="fas fa-user-slash"></i> ${escapeHtml(entrada.responsavel || 'Não Escalado')}</span>
                            </div>
                            <div style="font-size: 0.65rem; color: #e74c3c; margin-top: 0.6rem; font-weight: bold; text-transform: uppercase;"><i class="fas fa-exclamation-triangle"></i> Falta automática (prazo de justificativa expirado)</div>
                        `;
                    }

                    naoFeitasGrid.appendChild(item);
                }
            });
        });

        if (count > 0) {
            naoFeitasContainer.style.display = 'block';
        } else {
            naoFeitasContainer.style.display = 'none';
        }
    }

    function renderizarEscala(funcoes) {
        funcoesGrid.innerHTML = '';
        const hojeStr = getHojeStr();
        let funcoesDeHoje = [];
        let funcoesAtrasadas = [];

        funcoes.forEach((funcao, fIdx) => {
            if (filtroAtualFuncao && funcao.nome.toLowerCase() !== filtroAtualFuncao) {
                return; // Ignora se não bater com o dropdown (match exato em minúsculo)
            }

            const card = document.createElement('div');
            card.className = 'funcao-card';

            // Header do card
            const header = document.createElement('div');
            header.className = 'funcao-card-header';

            const freqAtual = funcao.frequencia || 7;
            const freqControls = ehAdminDoG ? `
                <div class="header-actions">
                    <button class="btn-icon btn-rename-funcao" data-fidx="${fIdx}" title="Renomear Escala"><i class="fas fa-pencil-alt"></i></button>
                    <div class="freq-group">
                        <span class="freq-label">A cada</span>
                        <input type="number" class="freq-input" data-fidx="${fIdx}" value="${freqAtual}" min="1" max="31">
                        <span class="freq-label">dias</span>
                        <div class="freq-presets">
                            <button class="freq-preset ${freqAtual == 7 ? 'active' : ''}" data-fidx="${fIdx}" data-dias="7">7d</button>
                            <button class="freq-preset ${freqAtual == 15 ? 'active' : ''}" data-fidx="${fIdx}" data-dias="15">15d</button>
                            <button class="freq-preset ${freqAtual == 30 ? 'active' : ''}" data-fidx="${fIdx}" data-dias="30">30d</button>
                        </div>
                    </div>
                    <button class="btn-add-entrada" data-fidx="${fIdx}" title="Adicionar entrada manual"><i class="fas fa-plus"></i></button>
                    <button class="btn-icon btn-icon-danger btn-delete-funcao" data-fidx="${fIdx}" title="Excluir Escala Inteira"><i class="fas fa-trash-alt"></i></button>
                </div>` : '';

            header.innerHTML = `
                <span class="funcao-card-title"><i class="fas fa-layer-group"></i> ${escapeHtml(funcao.nome)}</span>
                ${freqControls}
            `;
            card.appendChild(header);

            // Tabela de entradas
            if (funcao.entradas && funcao.entradas.length > 0) {
                const table = document.createElement('table');
                table.className = 'funcao-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Prazo</th>
                            <th>Responsável</th>
                            <th>Status</th>
                            ${ehAdminDoG ? '<th></th>' : ''}
                        </tr>
                    </thead>
                `;
                const tbody = document.createElement('tbody');

                let currentWeekNumber = -1;

                funcao.entradas.forEach((entrada, eIdx) => {
                    // Fitragem de membro na linha (se houver)
                    if (filtroAtualMembro) {
                        const mName = (entrada.responsavel || '').toLowerCase();
                        if (!mName.includes(filtroAtualMembro)) {
                            return; // não exibe essa linha no render 
                        }
                    }

                    // Calcular status automático baseado no prazo
                    const statusReal = calcularStatusAutomatico(entrada);

                    // Agrupamento Semanal (apenas para funções com mais de 10 dias)
                    const isLongScale = funcao.entradas.length > 10;
                    let isStartCollapsed = false;
                    let weekId = '';

                    const pWeekInfo = isLongScale ? getWeekInfo(entrada.prazo) : null;

                    if (isLongScale && pWeekInfo) {
                        const weekNumber = pWeekInfo.weekNumber;
                        weekId = pWeekInfo.id;
                        const pDate = pWeekInfo.dateNormal;

                        const todayWeekInfo = getWeekInfo(new Date());

                        // Somente deixamos expandida a semana atual ou semanas que tenham pendência de justificativa
                        const isCurrentWeek = pWeekInfo.id === todayWeekInfo.id;

                        if (typeof expandedWeeksState[weekId] !== 'undefined') {
                            isStartCollapsed = !expandedWeeksState[weekId];
                        } else {
                            // Verifica se há alguma pendência de justificativa nesta semana específica
                            const hasAwaiting = funcao.entradas.some(eTemp => {
                                const wT = getWeekInfo(eTemp.prazo);
                                if (wT && wT.id === weekId) {
                                    return calcularStatusAutomatico(eTemp) === 'aguardando_justificativa';
                                }
                                return false;
                            });
                            isStartCollapsed = !isCurrentWeek && !hasAwaiting;
                        }

                        if (weekNumber !== currentWeekNumber) {
                            currentWeekNumber = weekNumber;
                            const trDiv = document.createElement('tr');
                            trDiv.className = 'week-divider';
                            trDiv.style.cursor = 'pointer';
                            trDiv.title = 'Expandir ou encolher semana';

                            const dtInicio = new Date(pDate);
                            dtInicio.setDate(pDate.getDate() - pDate.getDay());
                            const dtFim = new Date(dtInicio);
                            dtFim.setDate(dtFim.getDate() + 6);

                            const strI = `${String(dtInicio.getDate()).padStart(2, '0')}/${String(dtInicio.getMonth() + 1).padStart(2, '0')}`;
                            const strF = `${String(dtFim.getDate()).padStart(2, '0')}/${String(dtFim.getMonth() + 1).padStart(2, '0')}`;

                            // Calcular estatísticas só dessa semana
                            let cOK = 0, cJustificado = 0, cFalta = 0;
                            funcao.entradas.forEach(eTemp => {
                                const wT = getWeekInfo(eTemp.prazo);
                                if (wT && wT.id === weekId) {
                                    const stT = calcularStatusAutomatico(eTemp);
                                    if (stT === 'atualizado') cOK++;
                                    else if (stT === 'justificado') cJustificado++;
                                    else if (stT === 'nao_feito' || stT === 'aguardando_justificativa') cFalta++;
                                }
                            });

                            const statsHtml = `<span class="week-stats">
                                <span class="week-stat week-stat-ok" title="Concluídas"><i class="fas fa-check-circle"></i> ${cOK}</span>
                                <span class="week-stat week-stat-justificado" title="Justificadas"><i class="fas fa-balance-scale"></i> ${cJustificado}</span>
                                <span class="week-stat week-stat-falta" title="Atrasadas / Não Feitas"><i class="fas fa-times-circle"></i> ${cFalta}</span>
                            </span>`;

                            trDiv.innerHTML = `<td colspan="${ehAdminDoG ? 4 : 3}" class="week-divider-cell">
                                <i class="fas fa-chevron-${isStartCollapsed ? 'right' : 'down'} week-toggle-icon"></i>
                                <span class="week-label">Semana de ${strI} a ${strF}</span>
                                ${statsHtml}
                            </td>`;

                            trDiv.onclick = () => {
                                const isCollapsing = trDiv.querySelector('.week-toggle-icon').classList.contains('fa-chevron-down');
                                trDiv.querySelector('.week-toggle-icon').className = `fas fa-chevron-${isCollapsing ? 'right' : 'down'} week-toggle-icon`;
                                tbody.querySelectorAll(`tr[data-week="${weekId}"]`).forEach(row => {
                                    row.style.display = isCollapsing ? 'none' : '';
                                });

                                // Salvar o estado da interação manual para não fechar no re-render (auto-save)
                                expandedWeeksState[weekId] = !isCollapsing;
                            };

                            tbody.appendChild(trDiv);
                        }
                    }

                    const tr = document.createElement('tr');
                    if (weekId) tr.dataset.week = weekId;
                    if (isStartCollapsed) tr.style.display = 'none';

                    const ehHoje = entrada.prazo === hojeStr;
                    if (ehHoje) {
                        tr.classList.add('entrada-hoje');
                        funcoesDeHoje.push({ funcao: funcao.nome, entrada, fIdx, eIdx });
                    }

                    if (statusReal === 'aguardando_justificativa') {
                        funcoesAtrasadas.push({ funcao: funcao.nome, entrada, fIdx, eIdx });
                    }

                    // Coluna Prazo
                    const tdPrazo = document.createElement('td');
                    tdPrazo.dataset.label = 'Prazo';
                    if (ehAdminDoG) {
                        tdPrazo.innerHTML = `<input type="text" class="entrada-input entrada-input-prazo" value="${escapeHtml(entrada.prazo || '')}" placeholder="dd/mm/aaaa" data-fidx="${fIdx}" data-eidx="${eIdx}" data-field="prazo">`;
                    } else {
                        tdPrazo.textContent = entrada.prazo || '—';
                    }
                    tr.appendChild(tdPrazo);

                    // Coluna Responsável
                    const tdResp = document.createElement('td');
                    tdResp.dataset.label = 'Responsável';
                    if (ehAdminDoG) {
                        let optHtml = '<option value="">Atribuir membro...</option>';
                        (membrosCache || []).forEach(m => {
                            const sel = (entrada.responsavel === m.nick) ? 'selected' : '';
                            optHtml += `<option value="${escapeHtml(m.nick)}" ${sel}>${escapeHtml(m.nick)}</option>`;
                        });
                        const opacoCls = !entrada.responsavel ? 'vazio' : '';
                        tdResp.innerHTML = `<select class="entrada-input entrada-input-resp select-resp ${opacoCls}" data-fidx="${fIdx}" data-eidx="${eIdx}" data-field="responsavel">${optHtml}</select>`;
                    } else {
                        tdResp.textContent = entrada.responsavel || '—';
                    }
                    tr.appendChild(tdResp);

                    // Coluna Status
                    const tdStatus = document.createElement('td');
                    tdStatus.dataset.label = 'Status';

                    let shieldIcon = '';
                    if (entrada.statusOverride || entrada.reabertoPorLideranca) {
                        const mot = entrada.statusOverride ? entrada.statusOverride.motivo : entrada.reabertoPorLideranca.motivo;
                        shieldIcon = ` <i class="fas fa-user-shield" title="Intervenção da Liderança: ${escapeHtml(mot)}" style="color: #9b59b6; margin-left: 5px;"></i>`;
                    }

                    if (statusReal === 'pendente' && (ehHoje || entrada.statusOverride)) {
                        // Hoje é o dia ou foi liberado por Liderança — mostrar botão de postar
                        tdStatus.innerHTML = `<button class="btn-postar" data-fidx="${fIdx}" data-eidx="${eIdx}"><i class="fas fa-check"></i> Postar</button>${shieldIcon}`;
                    } else if (statusReal === 'aguardando_justificativa') {
                        tdStatus.innerHTML = `
                            <button class="btn-justificar btn-postar" data-fidx="${fIdx}" data-eidx="${eIdx}" style="background: #e67e22;">
                                <i class="fas fa-file-signature"></i> JUSTIFICAR
                            </button>${shieldIcon}
                        `;
                    } else {
                        let titleAttr = '';
                        if (statusReal === 'atualizado' && entrada.postadoEm) {
                            titleAttr = ` title="Postado dia ${dayjs(entrada.postadoEm).format('DD/MM [às] HH:mm')}"`;
                        } else if (statusReal === 'justificado' && (entrada.justificadoEm || entrada.postadoEm)) {
                            const dataJust = entrada.justificadoEm || entrada.postadoEm;
                            titleAttr = ` title="Justificado dia ${dayjs(dataJust).format('DD/MM [às] HH:mm')}"`;
                        }
                        tdStatus.innerHTML = `<span class="status-badge status-${statusReal}"${titleAttr}>${STATUS_LABELS[statusReal] || statusReal}</span>${shieldIcon}`;
                    }
                    tr.appendChild(tdStatus);

                    // Coluna de ações admin (remover)
                    if (ehAdminDoG) {
                        const tdActions = document.createElement('td');
                        tdActions.dataset.label = 'Ações';
                        let liderBtn = isLiderancaGlobal ? `<button class="btn-lideranca-status" data-fidx="${fIdx}" data-eidx="${eIdx}" title="Poder Supremo (Liderança)"><i class="fas fa-user-shield"></i></button>` : '';

                        tdActions.innerHTML = `
                            ${liderBtn}
                            <button class="btn-reset-entrada" data-fidx="${fIdx}" data-eidx="${eIdx}" title="Resetar Status (Voltar para Pendente)"><i class="fas fa-arrows-rotate"></i></button>
                            <button class="btn-remover-entrada" data-fidx="${fIdx}" data-eidx="${eIdx}" title="Remover"><i class="fas fa-trash-can"></i></button>
                        `;
                        tr.appendChild(tdActions);
                    }

                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);
                card.appendChild(table);
            } else {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'padding: 1.5rem; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem;';
                emptyMsg.textContent = 'Nenhuma entrada adicionada.';
                card.appendChild(emptyMsg);
            }

            funcoesGrid.appendChild(card);
        });

        // Renderizar justificativas do mês
        renderizarJustificativas(funcoes);
        // Renderizar não feitas do mês
        renderizarNaoFeitas(funcoes);

        // Banner "Funções de Hoje"
        if (funcoesDeHoje.length > 0) {
            funcaoHojeBanner.style.display = 'flex';
            hojeListaFuncoes.innerHTML = '';

            const labelText = document.getElementById('hoje-label-text');
            if (funcoesDeHoje.length > 1) {
                labelText.textContent = `📌 Múltiplas Funções de Hoje`;
                funcaoHojeBanner.style.borderLeft = 'none';
            } else {
                labelText.textContent = '📌 Função de Hoje';
                funcaoHojeBanner.style.borderLeft = 'none';
            }

            funcoesDeHoje.forEach(item => {
                const status = calcularStatusAutomatico(item.entrada);
                const ehMinhaVez = currentUserNick && item.entrada.responsavel &&
                    item.entrada.responsavel.trim().toLowerCase() === currentUserNick.trim().toLowerCase();

                const cardHo = document.createElement('div');
                cardHo.style.cssText = 'background: rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); min-width: 200px; flex: 1;';

                let btnPostarHtml = '';
                if (status === 'pendente') {
                    btnPostarHtml = `<button class="btn-postar-hoje-item" style="margin-top: 0.5rem; width: 100%; padding: 0.4rem; border-radius: 4px; background: #27ae60; color: #fff; border: none; cursor: pointer; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;"><i class="fas fa-check"></i> Postar Agora</button>`;
                } else if (status === 'atualizado' || status === 'justificado') {
                    const isJust = status === 'justificado';
                    const dataTS = isJust ? (item.entrada.justificadoEm || item.entrada.postadoEm) : item.entrada.postadoEm;
                    const titleAtt = dataTS ? ` title="${isJust ? 'Justificado' : 'Postado'} dia ${dayjs(dataTS).format('DD/MM [às] HH:mm')}"` : '';
                    btnPostarHtml = `<div style="margin-top: 0.5rem; text-align: center; color: #2ecc71; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;"${titleAtt}><i class="fas fa-check-double"></i> Concluído</div>`;
                }

                cardHo.innerHTML = `
                    <div style="font-weight: 700; color: #fff; font-size: 0.8rem; margin-bottom: 0.2rem;">${escapeHtml(item.funcao)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.7;">Resp: ${escapeHtml(item.entrada.responsavel || '—')}</div>
                    ${btnPostarHtml}
                `;

                const btn = cardHo.querySelector('.btn-postar-hoje-item');
                if (btn) btn.onclick = () => abrirModalPostar(item.fIdx, item.eIdx);

                hojeListaFuncoes.appendChild(cardHo);
            });
        } else {
            funcaoHojeBanner.style.display = 'none';
        }

        // Banner "Aguardando Justificativa"
        if (funcoesAtrasadas.length > 0) {
            funcaoAtrasadaBanner.style.display = 'flex';
            atrasadaListaFuncoes.innerHTML = '';

            funcoesAtrasadas.forEach(item => {
                const cardAt = document.createElement('div');
                cardAt.style.cssText = 'background: rgba(230, 126, 34, 0.05); padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(230, 126, 34, 0.2); min-width: 200px; flex: 1;';

                cardAt.innerHTML = `
                    <div style="font-weight: 700; color: #e67e22; font-size: 0.8rem; margin-bottom: 0.2rem;">${escapeHtml(item.funcao)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.7;">Prazo original: ${escapeHtml(item.entrada.prazo || '—')}</div>
                    <div style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 0.5rem;">Resp: ${escapeHtml(item.entrada.responsavel || '—')}</div>
                    <button class="btn-justificar-hoje" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: #e67e22; color: #fff; border: none; cursor: pointer; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;"><i class="fas fa-file-signature"></i> Justificar Agora</button>
                `;

                cardAt.querySelector('.btn-justificar-hoje').onclick = () => justificarEntrada(item.fIdx, item.eIdx);
                atrasadaListaFuncoes.appendChild(cardAt);
            });
        } else {
            funcaoAtrasadaBanner.style.display = 'none';
        }

        // Event listeners
        adicionarEventListeners();
    }

    function adicionarEventListeners() {
        // Botões de postar
        document.querySelectorAll('.btn-postar:not(.btn-justificar)').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const eIdx = parseInt(btn.dataset.eidx);
                abrirModalPostar(fIdx, eIdx);
            });
        });

        // Botões de justificar
        document.querySelectorAll('.btn-justificar').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const eIdx = parseInt(btn.dataset.eidx);
                justificarEntrada(fIdx, eIdx);
            });
        });

        if (!ehAdminDoG) return;

        // Botões de adicionar entrada (admin)
        document.querySelectorAll('.btn-add-entrada').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                adicionarEntrada(fIdx);
            });
        });

        // Botões de remover entrada (admin)
        document.querySelectorAll('.btn-remover-entrada').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const eIdx = parseInt(btn.dataset.eidx);
                if (confirm('Remover esta entrada?')) {
                    removerEntrada(fIdx, eIdx);
                }
            });
        });

        // Botão Liderança Supremo
        document.querySelectorAll('.btn-lideranca-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const eIdx = parseInt(btn.dataset.eidx);
                abrirModalLideranca(fIdx, eIdx);
            });
        });

        // Botões de resetar entrada (admin)
        document.querySelectorAll('.btn-reset-entrada').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const eIdx = parseInt(btn.dataset.eidx);
                if (confirm('Deseja RESETAR o status desta entrada?')) {
                    resetarEntrada(fIdx, eIdx);
                }
            });
        });

        // Inputs inline (admin)
        let saveTimeout;
        document.querySelectorAll('.entrada-input').forEach(input => {
            input.addEventListener('input', () => {
                const fIdx = parseInt(input.dataset.fidx);
                const eIdx = parseInt(input.dataset.eidx);
                const field = input.dataset.field;
                const entrada = currentEscalaData.funcoes[fIdx].entradas[eIdx];

                entrada[field] = input.value;

                let shouldReRender = false;

                // Transição automática de status ao alocar/remover responsável
                if (field === 'responsavel') {
                    if (input.value && entrada.status === 'nao_escalado') entrada.status = 'pendente';
                    else if (!input.value && entrada.status === 'pendente') entrada.status = 'nao_escalado';
                    shouldReRender = true;
                }

                // Atualizar status automático imediatamente se completou a data (10 caracteres)
                if (field === 'prazo' && input.value.length === 10) {
                    shouldReRender = true;

                    const freq = currentEscalaData.funcoes[fIdx].frequencia || 7;
                    if (eIdx === 0 && freq > 1) {
                        const adapt = confirm(`Você quer que as outras datas se adaptem também para seguir a mesma frequência a partir de ${input.value}?\n\n(Trabalhos já salvos em outros dias não serão perdidos)`);
                        if (adapt) {
                            setTimeout(() => {
                                adaptarDatas(fIdx, input.value, freq);
                            }, 50);
                        }
                    }
                }

                if (shouldReRender) {
                    renderizarEscala(currentEscalaData.funcoes);
                    // Restaura o foco para o input exato onde o admin estava escrevendo
                    const restoredInput = document.querySelector(`.entrada-input[data-fidx="${fIdx}"][data-eidx="${eIdx}"][data-field="${field}"]`);
                    if (restoredInput) {
                        restoredInput.focus();
                        if (restoredInput.setSelectionRange) {
                            const len = restoredInput.value.length;
                            restoredInput.setSelectionRange(len, len); // mantém o cursor no fim
                        }
                    }
                }

                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => salvarEscalaCompleta(), 1000);
            });
        });

        // Input de frequência customizada (admin)
        document.querySelectorAll('.freq-input').forEach(input => {
            input.addEventListener('change', () => {
                const fIdx = parseInt(input.dataset.fidx);
                const dias = parseInt(input.value);
                if (dias >= 1 && dias <= 31) {
                    aplicarFrequencia(fIdx, dias);
                } else {
                    input.value = currentEscalaData.funcoes[fIdx].frequencia || 7;
                }
            });
        });

        // Botões de preset de frequência (admin)
        document.querySelectorAll('.freq-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const dias = parseInt(btn.dataset.dias);
                aplicarFrequencia(fIdx, dias);
            });
        });

        // Botão renomear função
        document.querySelectorAll('.btn-rename-funcao').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const funcao = currentEscalaData.funcoes[fIdx];
                const novoNome = prompt('Digite o novo nome para esta escala:', funcao.nome);
                if (novoNome && novoNome.trim() !== '' && novoNome !== funcao.nome) {
                    funcao.nome = novoNome.trim();
                    salvarEscalaCompleta().then(() => {
                        salvarPadrao();
                        renderizarEscala(currentEscalaData.funcoes);
                    });
                }
            });
        });

        // Botão deletar função
        document.querySelectorAll('.btn-delete-funcao').forEach(btn => {
            btn.addEventListener('click', () => {
                const fIdx = parseInt(btn.dataset.fidx);
                const funcao = currentEscalaData.funcoes[fIdx];
                if (confirm(`AVISO: Tem certeza que deseja DELETAR a escala "${funcao.nome}" e todas as suas entradas APENAS DESTE MÊS?\n\nIsso também removerá o padrão dela em futuros meses.`)) {
                    currentEscalaData.funcoes.splice(fIdx, 1);
                    salvarEscalaCompleta().then(() => {
                        salvarPadrao();
                        renderizarEscala(currentEscalaData.funcoes);
                    });
                }
            });
        });
    }

    // Inicialização do botão Nova Escala Global
    const btnNova = document.getElementById('btn-nova-escala');
    if (btnNova) {
        btnNova.addEventListener('click', () => {
            if (!currentEscalaData) return alert('Você precisa criar ou abrir o mês primeiro!');
            const nome = prompt('Qual o NOME da nova escala? (ex: Vice-Diretoria)');
            if (!nome || nome.trim() === '') return;

            let freq = prompt('Gerar dias a cada quantos dias? (ex: 7 para semanal, 1 para todo dia)', '7');
            freq = parseInt(freq);
            if (isNaN(freq) || freq < 1) freq = 7;

            const novaFuncao = {
                nome: nome.trim(),
                frequencia: freq,
                entradas: gerarDatasFrequencia(mesReferencia.value, freq).map(data => ({
                    prazo: data,
                    responsavel: '',
                    status: 'nao_escalado',
                    postadoEm: null
                }))
            };
            currentEscalaData.funcoes.push(novaFuncao);
            salvarEscalaCompleta().then(() => {
                salvarPadrao();
                renderizarEscala(currentEscalaData.funcoes);
            });
        });
    }

    // Inicialização do Importador (Removido conforme pedido)
    /*
    const btnImportar = document.getElementById('btn-importar-escala');
    ...
    */

    /**
     * Normaliza formatos variados de data para DD/MM/YYYY
     * Suporta: "06/04/2026", "06 abr. 2026", "20/maio/2026", etc.
     */
    function normalizarDataImportada(s) {
        if (!s) return null;
        s = s.toLowerCase().trim();

        // Caso já esteja no padrão dd/mm/aaaa
        if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const p = s.split('/');
            return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
        }

        // Tenta detectar formatos com nomes de meses (ex: "06 abr. 2026" ou "06 de abril de 2026")
        const mesesPT = {
            'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };

        // Remove "de" e pontos
        const limpo = s.replace(/ de /g, ' ').replace(/\./g, ' ').replace(/ +/g, ' ');
        const partes = limpo.split(' ');

        if (partes.length >= 3) {
            const dia = partes[0].padStart(2, '0');
            const mesStr = partes[1].substring(0, 3);
            const ano = partes[2].length === 2 ? '20' + partes[2] : partes[2];

            if (mesesPT[mesStr]) {
                return `${dia}/${mesesPT[mesStr]}/${ano}`;
            }
        }

        return null; // Não conseguiu identificar
    }

    function adicionarEntrada(funcaoIndex) {
        if (!currentEscalaData) return;
        currentEscalaData.funcoes[funcaoIndex].entradas.push({
            prazo: '',
            responsavel: '',
            status: 'nao_escalado',
            postadoEm: null
        });
        salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
    }

    function resetarEntrada(fIdx, eIdx) {
        if (!currentEscalaData) return;
        const entrada = currentEscalaData.funcoes[fIdx].entradas[eIdx];
        entrada.status = (entrada.responsavel && entrada.responsavel.trim() !== '') ? 'pendente' : 'nao_escalado';
        entrada.postadoEm = null;
        entrada.justificativaTexto = null;
        entrada.justificadoEm = null;
        salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
        mostrarIndicador('Status resetado!');
    }

    function removerEntrada(funcaoIndex, entradaIndex) {
        if (!currentEscalaData) return;
        currentEscalaData.funcoes[funcaoIndex].entradas.splice(entradaIndex, 1);
        salvarEscalaCompleta();
        renderizarEscala(currentEscalaData.funcoes);
    }

    // =====================================================================
    // == BACKUP
    // =====================================================================
    function gerarBackup() {
        if (!currentEscalaData) { alert('Sem dados para backup.'); return; }
        const [ano, mes] = (mesReferencia.value || '').split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        let txt = `═══════════════════════════════════\n`;
        txt += `  ESCALA - ${configGrupo.sigla}\n`;
        txt += `  ${meses[parseInt(mes) - 1]} de ${ano}\n`;
        txt += `═══════════════════════════════════\n\n`;

        currentEscalaData.funcoes.forEach(f => {
            txt += `📌 ${f.nome}\n`;
            if (f.entradas.length === 0) {
                txt += `   (sem entradas)\n\n`;
            } else {
                f.entradas.forEach(e => {
                    const st = calcularStatusAutomatico(e);
                    txt += `   ${e.prazo || '—'} | ${e.responsavel || '—'} | ${STATUS_LABELS[st] || st}\n`;
                });
                txt += `\n`;
            }
        });

        txt += `───────────────────────────────────\n`;
        txt += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
        txt += `NEXUS - Professores da PMRCC`;

        navigator.clipboard.writeText(txt).then(async () => {
            mostrarIndicador('Backup copiado!');
            // Avançar para o próximo mês automaticamente e criar a escala dele baseada nos padrões salvos
            const proximo = dayjs(`${ano}-${mes}-01`).add(1, 'month');
            mesReferencia.value = proximo.format('YYYY-MM');
            await carregarEscala();
            if (!currentEscalaData) {
                // Se o mês seguinte estiver vazio, gera os templates de uma vez.
                await criarEscala();
                mostrarIndicador('Backup feito! Novo mês iniciado.');
            }
        }).catch(err => {
            const ta = document.createElement('textarea');
            ta.value = txt; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
            mostrarIndicador('Backup copiado!');
        });
    }

    // =====================================================================
    // == UTILS
    // =====================================================================
    function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function mostrarIndicador(msg, isError = false) {
        const icon = saveIndicator.querySelector('i');
        const text = saveIndicator.querySelector('span');
        text.textContent = msg;
        saveIndicator.classList.toggle('error', isError);
        icon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        saveIndicator.classList.add('visible');
        setTimeout(() => saveIndicator.classList.remove('visible'), 2500);
    }

    function mostrarConteudo() {
        loadingState.style.display = 'none';
        accessDeniedState.style.display = 'none';
        escalaContent.style.display = 'block';
    }

    function mostrarAcessoNegado() {
        loadingState.style.display = 'none';
        accessDeniedState.style.display = 'block';
        escalaContent.style.display = 'none';
    }

    // =====================================================================
    // == EVENT LISTENERS GERAIS
    // =====================================================================
    if (filtroFuncaoInput) {
        filtroFuncaoInput.addEventListener('change', (e) => {
            filtroAtualFuncao = e.target.value.toLowerCase().trim();
            if (currentEscalaData && currentEscalaData.funcoes) renderizarEscala(currentEscalaData.funcoes);
        });
    }
    if (filtroMembroInput) {
        filtroMembroInput.addEventListener('input', (e) => {
            filtroAtualMembro = e.target.value.toLowerCase().trim();
            if (currentEscalaData && currentEscalaData.funcoes) renderizarEscala(currentEscalaData.funcoes);
        });
    }

    mesReferencia.addEventListener('change', () => carregarEscala());
    btnCriarEscala.addEventListener('click', () => {
        if (confirm('Criar escala para este mês?')) criarEscala();
    });
    btnBackup.addEventListener('click', () => gerarBackup());

    // =====================================================================
    // == GOOGLE SHEETS / APP SCRIPT - INSCRIÇÕES DEPARTAMENTAIS
    // =====================================================================
    const btnVerInscricoes = document.getElementById('btn-ver-inscricoes');
    const modalInscricoes = document.getElementById('modal-inscricoes');
    const inscricoesLoading = document.getElementById('inscricoes-loading');
    const inscricoesError = document.getElementById('inscricoes-error');
    const inscricoesGridContainer = document.getElementById('inscricoes-grid-container');
    const inscricoesBtnFechar = document.getElementById('inscricoes-btn-fechar');

    // INSIRA AQUI A URL DO SEU APP SCRIPT DEPOIS DE PUBLICAR COMO WEB APP
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEePXTujDidSOtdQMdrSM7Vu8ggBO5t1Mszro4szwNtP0otwcNOuwZVrVRredoLb2vNg/exec';

    const SHEET_NAMES = {
        da: 'Departamento de Aplicação dos Professores',
        spp: 'Serviço de Proteção dos Professores',
        cdc: 'Comissão de Desenvolvimento Cultural'
    };

    if (btnVerInscricoes) {
        btnVerInscricoes.addEventListener('click', abrirModalInscricoes);
    }

    if (inscricoesBtnFechar) {
        inscricoesBtnFechar.addEventListener('click', () => {
            if (modalInscricoes) modalInscricoes.style.display = 'none';
        });
    }

    if (modalInscricoes) {
        modalInscricoes.addEventListener('click', (e) => {
            if (e.target === modalInscricoes) modalInscricoes.style.display = 'none';
        });
    }

    const modalDetalhesInscricao = document.getElementById('modal-detalhes-inscricao');
    const detalhesInscricaoBtnFechar = document.getElementById('detalhes-inscricao-btn-fechar');

    if (detalhesInscricaoBtnFechar) {
        detalhesInscricaoBtnFechar.addEventListener('click', () => {
            if (modalDetalhesInscricao) modalDetalhesInscricao.style.display = 'none';
        });
    }

    if (modalDetalhesInscricao) {
        modalDetalhesInscricao.addEventListener('click', (e) => {
            if (e.target === modalDetalhesInscricao) modalDetalhesInscricao.style.display = 'none';
        });
    }

    async function abrirModalInscricoes() {
        if (!grupoAtual || !SHEET_NAMES[grupoAtual]) {
            alert('Aba de inscrições não configurada para este subgrupo.');
            return;
        }

        if (APP_SCRIPT_URL === 'COLOQUE_SUA_URL_DO_APP_SCRIPT_AQUI') {
            alert('A URL do App Script não foi configurada no escala-admin.js');
            return;
        }

        modalInscricoes.style.display = 'flex';
        inscricoesLoading.style.display = 'block';
        inscricoesError.style.display = 'none';
        if (inscricoesGridContainer) inscricoesGridContainer.style.display = 'none';

        try {
            const sheetName = SHEET_NAMES[grupoAtual];
            const urlComParam = `${APP_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`;

            const response = await fetch(urlComParam);

            if (!response.ok) {
                throw new Error('Falha ao comunicar com o Google Apps Script.');
            }

            const json = await response.json();

            if (json.result !== 'success') {
                throw new Error(json.error || 'Erro interno no script.');
            }

            const dataValues = json.values;

            if (!dataValues || dataValues.length < 3) {
                throw new Error('Nenhuma inscrição encontrada na planilha.');
            }

            renderizarInscricoes(dataValues);

        } catch (error) {
            console.error('🔥 Erro ao buscar inscrições via App Script:', error);
            inscricoesLoading.style.display = 'none';
            inscricoesError.style.display = 'block';
            document.getElementById('inscricoes-error-text').textContent = error.message || 'Ocorreu um erro ao carregar as inscrições.';
        }
    }

    function renderizarInscricoes(rows) {
        if (!inscricoesGridContainer) return;
        inscricoesGridContainer.innerHTML = '';

        // Linha 0 (Planilha 4) = Categoria maior
        // Linha 1 (Planilha 5) = Sub-cabeçalhos
        const row4 = rows[0] || [];
        const row5 = rows[1] || [];
        
        // Verifica se a primeira coluna é a Data ou se é direto o Nickname
        // Se a coluna 1 for NICKNAME, significa que a coluna 0 é a Data (Carimbo).
        const temColunaData = row5.length > 1 && (row5[1] || '').toUpperCase().includes('NICKNAME');
        const offset = temColunaData ? 1 : 0;
        
        const headers = [];
        const maxCols = Math.max(row4.length, row5.length);
        
        // Propagar cabeçalhos mesclados da linha 4
        let lastCat = '';
        for (let j = 0; j < maxCols; j++) {
            let cat = row4[j] ? row4[j].trim() : '';
            if (cat && cat !== '') {
                lastCat = cat;
            } else if (j < row4.length && !cat) {
                cat = lastCat;
            } else {
                cat = '';
            }
            
            const sub = row5[j] ? row5[j].trim() : '';
            
            if (cat && sub) headers.push(`${cat} - ${sub}`);
            else if (cat) headers.push(cat);
            else if (sub) headers.push(sub);
            else headers.push(`-`);
        }

        // Os dados começam no índice 2 (Linha 6)
        let dataRows = rows.slice(2);
        
        // Remover linhas vazias (sem nickname)
        dataRows = dataRows.filter(rowData => {
            const nickname = rowData[offset];
            return nickname && nickname.trim() !== '';
        });

        // Inverter para ficar do mais recente (último da planilha) para o mais antigo (primeiro)
        dataRows.reverse();

        let contagem = 0;
        dataRows.forEach((rowData, index) => {
            const dateStr = temColunaData ? (rowData[0] || 'Data desconhecida') : '';
            const nickname = escapeHtml(rowData[offset] || 'Desconhecido');
            const cargo = escapeHtml(rowData[offset + 1] || 'Sem Cargo');
            
            // Calcular opacidade baseada na ordem. Mais antigos vão ficando esmaecidos.
            let opacidade = 1.0;
            if (index > 2) {
                // A partir do 4º mais recente, começa a esmaecer, chegando até um mínimo de 0.4
                opacidade = Math.max(0.4, 1.0 - ((index - 2) * 0.15));
            }

            const card = document.createElement('div');
            card.style.cssText = `background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(155, 89, 182, 0.3); border-radius: 8px; padding: 1.2rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: transform 0.2s, background 0.2s, box-shadow 0.2s, opacity 0.2s; opacity: ${opacidade};`;
            
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                card.style.borderColor = 'rgba(155, 89, 182, 0.6)';
                card.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                card.style.opacity = '1'; // Sempre fica 100% visível ao passar o mouse
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'none';
                card.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                card.style.borderColor = 'rgba(155, 89, 182, 0.3)';
                card.style.boxShadow = 'none';
                card.style.opacity = opacidade; // Volta ao esmaecido original
            });

            // Formatar exibição de data
            let dataHtml = '';
            if (dateStr) {
                dataHtml = `<div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 4px;"><i class="far fa-clock"></i> ${escapeHtml(dateStr)}</div>`;
            }
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; overflow: hidden;">
                    <i class="fas fa-user-circle" style="color: #9b59b6; font-size: 2.2rem; flex-shrink: 0;"></i>
                    <div style="display: flex; flex-direction: column; overflow: hidden;">
                        <span style="font-weight: 800; font-size: 1.1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nickname}</span>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                            <span style="font-size: 0.75rem; background: rgba(155, 89, 182, 0.15); padding: 3px 8px; border-radius: 20px; color: #e0b0ff; font-weight: 600;">${cargo}</span>
                        </div>
                        ${dataHtml}
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: rgba(255,255,255,0.3); font-size: 1.2rem; padding-left: 10px;"></i>
            `;
            
            const respostas = [];
            // O loop de respostas começa depois do cargo
            const inicioRespostas = offset + 2; 
            for (let j = inicioRespostas; j < headers.length; j++) {
                if (headers[j] === '-') continue;
                
                const answer = rowData[j] ? rowData[j].trim() : '';
                if (!answer || answer === '') continue;

                respostas.push({ pergunta: headers[j], resposta: answer });
            }

            card.addEventListener('click', () => abrirDetalhesInscricao(nickname, cargo, respostas, dateStr));
            
            inscricoesGridContainer.appendChild(card);
            contagem++;
        });

        if (contagem === 0) {
            inscricoesLoading.style.display = 'none';
            inscricoesError.style.display = 'block';
            document.getElementById('inscricoes-error-text').textContent = 'Nenhuma inscrição preenchida ainda.';
            return;
        }

        inscricoesLoading.style.display = 'none';
        if (inscricoesGridContainer) inscricoesGridContainer.style.display = 'grid';
    }

    function abrirDetalhesInscricao(nickname, cargo, respostas, dateStr) {
        if (!modalDetalhesInscricao) return;

        let dataHtml = '';
        if (dateStr) {
            dataHtml = `<span style="font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: normal; margin-left: auto;"><i class="far fa-calendar-alt"></i> Enviado em: ${escapeHtml(dateStr)}</span>`;
        }

        document.getElementById('detalhes-inscricao-nome').innerHTML = `
            <div style="display: flex; align-items: center; width: 100%;">
                <i class="fas fa-user-circle" style="margin-right: 8px;"></i> Inscrição de ${nickname} 
                <span style="font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 20px; font-weight: normal; margin-left: 10px; vertical-align: middle;">${cargo}</span>
                ${dataHtml}
            </div>
        `;
        
        const body = document.getElementById('detalhes-inscricao-body');
        body.innerHTML = '';

        if (respostas.length === 0) {
            body.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.3); font-style: italic; padding: 2rem 0;">Nenhum detalhe preenchido</div>`;
        } else {
            respostas.forEach(resp => {
                const item = document.createElement('div');
                item.innerHTML = `
                    <div style="color: #a87ebb; font-weight: 700; font-size: 0.85rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-caret-right"></i> ${escapeHtml(resp.pergunta)}</div> 
                    <div style="color: #fff; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 6px; border-left: 3px solid #8e44ad; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(resp.resposta)}</div>
                `;
                body.appendChild(item);
            });
        }

        modalDetalhesInscricao.style.display = 'flex';
    }

    // =====================================================================
    // == INICIALIZAÇÃO
    // =====================================================================
    const processarAcesso = (userData) => {
        if (!userData) { mostrarAcessoNegado(); return; }

        // Guardar nick do usuário logado
        currentUserNick = userData.name || null;

        if (modoSelecao) {
            loadingState.style.display = 'none';
            montarGrupoTabs(userData, true);

            const { temAcesso } = verificarPermissoes(userData);
            if (!temAcesso) {
                mostrarAcessoNegado();
            } else {
                // Se tem permissão, mostra o palco (escalaContent) para exibir o aviso de seleção
                mostrarConteudo();
                // Esconde os controles de escala (filtros, data) pois não fazem sentido sem grupo
                const controls = document.querySelector('.escala-controls');
                if (controls) controls.style.display = 'none';
            }
            return;
        }

        const { temAcesso, ehAdmin } = verificarPermissoes(userData, grupoAtual);
        if (!temAcesso) { mostrarAcessoNegado(); return; }

        ehAdminDoG = ehAdmin;
        mesReferencia.disabled = !ehAdminDoG;

        // Regra do Backup: Só do dia 1 ao dia 7
        const diaAtual = new Date().getDate();
        btnBackup.disabled = !(ehAdminDoG && diaAtual >= 1 && diaAtual <= 7);
        if (ehAdminDoG && (diaAtual < 1 || diaAtual > 7)) {
            btnBackup.title = "O backup (fechamento) só pode ser feito entre os dias 1 e 7.";
        } else {
            btnBackup.title = "Copiar relatório e gerar escala do próximo mês";
        }

        montarGrupoTabs(userData, false);
        mostrarConteudo();

        // Exibir o botão de inscrições se tiver acesso
        const btnVerInscricoes = document.getElementById('btn-ver-inscricoes');
        if (btnVerInscricoes) btnVerInscricoes.style.display = 'inline-flex';

        carregarEscala();
    };

    document.addEventListener('userDataReady', (e) => processarAcesso(e.detail.userData));

    if (window.isUserDataReady) {
        processarAcesso(window.currentUserData);
    } else {
        let t = 0;
        const iv = setInterval(() => {
            t++;
            if (window.isUserDataReady) { clearInterval(iv); processarAcesso(window.currentUserData); }
            else if (t >= 20) { clearInterval(iv); mostrarAcessoNegado(); }
        }, 500);
    }

    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(u => { if (!u) mostrarAcessoNegado(); });
    }
});
