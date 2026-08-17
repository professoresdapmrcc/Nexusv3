// =========================================================================
// 1. BANCO DE ESCALAS DA NEXUS
// =========================================================================
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
        { funcao: "Porcentagem dos Professores", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Porcentagem dos Coordenadores", prazo: "Segunda", papel: "conselho" }, 
        { funcao: "Porcentagem dos Graduadores", prazo: "Dias 16 & 01", papel: "conselho" },
        { separador: true },
        { funcao: "Postagem Advertências dos Professores", prazo: "Segunda", papel: "estagiario" },
        { funcao: "Postagem Advertências dos Coordenadores", prazo: "Segunda", papel: "conselho" }, 
        { funcao: "Postagem Advertências dos Graduadores", prazo: "Dias 16 & 01", papel: "conselho" },
        { separador: true },
        { funcao: "Troca dos Visuais dos BOT's no Corredor", prazo: "Segunda", papel: "conselho" },
        { funcao: "Postagem dos melhores da semana", prazo: "Segunda", papel: "estagiario" }, 
        { funcao: "Postagem dos destaques no Nexus", prazo: "Segunda", papel: "estagiario" },
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

let conselhoDoUsuario = "";
let nickDoUsuario = "";
let papelDoUsuario = ""; 
let conselhoTemEstagiario = false; 

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. IDENTIFICAÇÃO DO USUÁRIO
    // =========================================================================
    const userProfileStorage = sessionStorage.getItem('userProfile');
    
    if (userProfileStorage) {
        try {
            const userData = JSON.parse(userProfileStorage);
            const nickLocal = userData.name || userData.nick || userData.nickname;
            
            if (nickLocal) {
                iniciarPerfil(nickLocal);
            }
        } catch (e) { console.error("Erro ao ler o Cache:", e); }
    } else {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const db = firebase.firestore();
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const nickFirebase = userDoc.data().name || userDoc.data().nick;
                        if (nickFirebase) iniciarPerfil(nickFirebase);
                    }
                } catch (error) { mostrarErro("Erro ao carregar perfil."); }
            } else { mostrarErro("Você precisa estar logado."); }
        });
    }

    // =========================================================================
    // 2. CONTROLE DOS BLOCOS E EVENTOS
    // =========================================================================
    const selectTipo = document.getElementById('tipo_postagem');
    const blocos = {
        funcao: document.getElementById('bloco-funcao'),
        atividade: document.getElementById('bloco-atividade'),
        justificativa: document.getElementById('bloco-justificativa')
    };

    function ocultarTodosBlocos() {
        Object.values(blocos).forEach(b => {
            if(b) {
                b.style.display = 'none';
                // Correção 1: Removido o seletor que ignorava os checkboxes para evitar que o envio trave
                const inputs = b.querySelectorAll('input, select, textarea');
                inputs.forEach(inp => inp.required = false);
            }
        });
    }

    if(selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            ocultarTodosBlocos();
            const tipo = e.target.value;
            const btnEnviar = document.getElementById('btn-enviar'); 
            
            if (blocos[tipo]) {
                blocos[tipo].style.display = 'flex'; 
                
                if(tipo === 'justificativa') {
                    document.getElementById('just_tipo').required = true;
                    document.getElementById('just_motivo').required = true;
                    document.getElementById('just_data').required = true;
                    document.getElementById('just_ciente').required = true;
                } else if (tipo === 'atividade') {
                    document.getElementById('ativ_data').required = true;
                    document.getElementById('ativ_link').required = true;
                } else if (tipo === 'funcao') {
                    document.getElementById('func_data').required = true;
                    
                    const chkSemAtt = document.getElementById('func_sem_att');
                    if (!chkSemAtt || !chkSemAtt.checked) {
                        document.getElementById('func_link').required = true;
                    }
                }
            }

            // CONTROLE DE DESBLOQUEIO DO BOTÃO
            if (tipo === 'funcao') {
                autoSelecionarFuncaoDoDia(); 
            } else {
                if (btnEnviar) btnEnviar.disabled = false;
            }
        });
    }

    const chkSemAtt = document.getElementById('func_sem_att');
    const inputLinkFunc = document.getElementById('func_link');

    if (chkSemAtt && inputLinkFunc) {
        chkSemAtt.addEventListener('change', (e) => {
            if (e.target.checked) {
                inputLinkFunc.required = false;
                inputLinkFunc.disabled = true;
                inputLinkFunc.value = "";
                inputLinkFunc.placeholder = "Não é necessário link";
                inputLinkFunc.style.opacity = "0.5";
            } else {
                inputLinkFunc.required = true;
                inputLinkFunc.disabled = false;
                inputLinkFunc.placeholder = "https://prnt.sc/...";
                inputLinkFunc.style.opacity = "1";
            }
        });
    }

    // Monitora a data da função para atualizar as opções de funções do dia
    const inputDataFunc = document.getElementById('func_data');
    if (inputDataFunc) {
        inputDataFunc.addEventListener('change', autoSelecionarFuncaoDoDia);
    }

    // =========================================================================
    // 3. ENVIO DOS DADOS AO FIREBASE
    // =========================================================================
    const formPostagem = document.getElementById('form-postagem-conselho');

    if (formPostagem) {
        formPostagem.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const btnEnviar = document.getElementById('btn-enviar');
            const textoOriginalBotao = btnEnviar.innerText;
            btnEnviar.innerText = "ENVIANDO...";
            btnEnviar.disabled = true;

            const tipo = document.getElementById('tipo_postagem').value;
            const db = firebase.firestore();

            let tipoFormatado = tipo;
            
            // Correção 2: Validação correta para diferenciar justificativa de função vs atividade
            if (tipo === 'justificativa') {
                const tipoJustificativaSelect = document.getElementById('just_tipo');
                
                if (tipoJustificativaSelect && tipoJustificativaSelect.value.toLowerCase().includes('atividade')) {
                    tipoFormatado = 'Justificativa de Atividade';
                } else {
                    tipoFormatado = 'Justificativa de Função';
                }
            } else if (tipo === 'atividade') {
                tipoFormatado = 'Conclusão de Atividade';
            } else if (tipo === 'funcao') {
                tipoFormatado = 'Função';
            }

            let dadosPostagem = {
                nick: nickDoUsuario,
                conselho: conselhoDoUsuario,
                tipo_postagem: tipoFormatado,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() 
            };

            let dataVisual; 

            if (tipo === 'funcao') {
                const checkboxesMarcadas = document.querySelectorAll('.chk-funcao-dinamica:checked');
                
                if (checkboxesMarcadas.length === 0) {
                    alert("Atenção: Selecione pelo menos uma função válida para enviar.");
                    btnEnviar.innerText = textoOriginalBotao;
                    btnEnviar.disabled = false;
                    return;
                }
                
                let funcoesArray = Array.from(checkboxesMarcadas).map(chk => chk.value);
                let textoFuncoesFinal = "";
                
                if (funcoesArray.length === 1) {
                    textoFuncoesFinal = funcoesArray[0];
                } else if (funcoesArray.length === 2) {
                    textoFuncoesFinal = `${funcoesArray[0]} & ${funcoesArray[1]}`;
                } else {
                    const ultima = funcoesArray.pop();
                    textoFuncoesFinal = `${funcoesArray.join(', ')} & ${ultima}`;
                }
                
                dadosPostagem.funcao_realizada = textoFuncoesFinal;

                dadosPostagem.data_realizacao = document.getElementById('func_data').value;
                
                const semAtualizacao = document.getElementById('func_sem_att') && document.getElementById('func_sem_att').checked;
                dadosPostagem.comprovacao_link = semAtualizacao ? "Não houve atualizações" : document.getElementById('func_link').value;
                
                dadosPostagem.observacao = document.getElementById('func_obs').value || "";
                dataVisual = dadosPostagem.data_realizacao;
            } 
            else if (tipo === 'atividade') {
                dadosPostagem.funcao_realizada = "Conclusão de Atividade"; 
                dadosPostagem.data_realizacao = document.getElementById('ativ_data').value;
                dadosPostagem.comprovacao_link = document.getElementById('ativ_link').value;
                dadosPostagem.descricao = document.getElementById('ativ_desc').value || "";
                dataVisual = dadosPostagem.data_realizacao;
            } 
            else if (tipo === 'justificativa') {
                dadosPostagem.funcao_realizada = tipoFormatado; 
                dadosPostagem.referente_a = document.getElementById('just_tipo').value;
                dadosPostagem.motivo = document.getElementById('just_motivo').value;
                dadosPostagem.data_original = document.getElementById('just_data').value;
                dadosPostagem.comunicou_lideranca = document.getElementById('just_ciente').checked;
                dataVisual = dadosPostagem.data_original;
            }

            // Mágica do Nome do Arquivo
            let diaMes = "DataIndefinida";
            if (dataVisual) {
                const partesData = dataVisual.split('-'); 
                if (partesData.length === 3) {
                    diaMes = `${partesData[2]}-${partesData[1]}`; 
                }
            }

            const nomeConselhoLimpo = conselhoDoUsuario.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            let nomeDocumentoBase = `${diaMes} - ${nomeConselhoLimpo} - ${tipoFormatado}`;
            let nomeDocumentoFinal = nomeDocumentoBase;
            let contador = 2;

            try {
                const colecaoRef = db.collection('conselho').doc('painel_registros').collection('historico');

                let docVerificador = await colecaoRef.doc(nomeDocumentoFinal).get();
                while (docVerificador.exists) {
                    nomeDocumentoFinal = `${nomeDocumentoBase} - ${contador}`;
                    docVerificador = await colecaoRef.doc(nomeDocumentoFinal).get();
                    contador++;
                }

                await colecaoRef.doc(nomeDocumentoFinal).set(dadosPostagem);

                const toast = document.getElementById('toast-sucesso');
                if(toast) toast.classList.add('show');

                const linksConselhos = {
                    "Administração": "administracao.html",
                    "Assistência": "assistencia.html",
                    "Atualização 1": "atualizacao1.html",
                    "Atualização 2": "atualizacao2.html",
                    "Contabilidade": "contabilidade.html",
                    "Documentação": "documentacao.html",
                    "Finanças": "financas.html",
                    "Segurança": "seguranca.html"
                };

                setTimeout(() => {
                    const destino = linksConselhos[conselhoDoUsuario];
                    window.location.href = destino ? destino : "index.html";
                }, 2500);
                
            } catch (error) {
                console.error("Erro ao salvar:", error);
                alert("Erro ao enviar registro.");
                btnEnviar.innerText = textoOriginalBotao;
                btnEnviar.disabled = false;
            }
        });
    }
});

// =========================================================================
// FUNÇÕES DE APOIO (INTELIGÊNCIA DE ESCALA E VISOR)
// =========================================================================

function iniciarPerfil(nickEncontrado) {
    nickDoUsuario = nickEncontrado;
    document.getElementById('user-nick').innerText = nickDoUsuario;
    const avatarImg = document.getElementById('user-avatar');
    if(avatarImg) {
        avatarImg.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickDoUsuario}&action=std&direction=2&head_direction=3&gesture=sml&size=m&headonly=1`;
        avatarImg.style.display = 'block';
    }
    buscarConselhoDoUsuario(nickDoUsuario);
}

async function buscarConselhoDoUsuario(nick) {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('conselho').doc('painel_escalas').collection('itens').get();
        
        let conselhoEncontrado = null;
        const nickFormatado = nick.trim().toLowerCase(); 

        snapshot.forEach(doc => {
            const data = doc.data();
            const m = data.membro ? data.membro.trim().toLowerCase() : "";
            const e = data.estagiario ? data.estagiario.trim().toLowerCase() : "";
            
            if (m === nickFormatado) {
                conselhoEncontrado = data.conselho;
                papelDoUsuario = 'conselho';
                conselhoTemEstagiario = (e !== "");
            } else if (e === nickFormatado) {
                conselhoEncontrado = data.conselho;
                papelDoUsuario = 'estagiario';
                conselhoTemEstagiario = true;
            }
        });

        if (conselhoEncontrado) {
            conselhoDoUsuario = conselhoEncontrado;
            const badge = document.getElementById('user-conselho');
            badge.innerText = `Conselho da ${conselhoDoUsuario}`;
            document.getElementById('form-postagem-conselho').style.display = 'flex'; 
            
            prepararFuncoesDoConselho();
        } else {
            mostrarErro("VOCÊ NÃO ESTÁ ESCALADO EM NENHUM CONSELHO.");
        }
    } catch (error) { mostrarErro("Erro ao buscar escala."); }
}

function prepararFuncoesDoConselho() {
    const inputDataFunc = document.getElementById('func_data');
    if (inputDataFunc && !inputDataFunc.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        inputDataFunc.value = `${ano}-${mes}-${dia}`;
    }
    
    autoSelecionarFuncaoDoDia();
}

function autoSelecionarFuncaoDoDia() {
    const inputData = document.getElementById('func_data').value;
    if(!inputData) return;

    let funcoesDoDia = [];

    if (conselhoDoUsuario === "Segurança") {
        funcoesDoDia.push("Fiscalização da Listagem, Grupo e Subfórum");
    } else {
        const dataObj = new Date(inputData + "T12:00:00"); 
        const escala = ESCALAS_GLOBAIS[conselhoDoUsuario] || [];
        
        escala.forEach(t => {
            if (t.separador) return;
            let ehMinha = false;
            
            if (papelDoUsuario === 'estagiario' && t.papel === 'estagiario') ehMinha = true;
            if (papelDoUsuario === 'conselho') {
                if (t.papel === 'conselho') ehMinha = true;
                if (!conselhoTemEstagiario && t.papel === 'estagiario') ehMinha = true;
            }

            if (ehMinha && verificaDiaMagico(t.prazo, dataObj)) {
                funcoesDoDia.push(t.funcao);
            }
        });
    }

    funcoesDoDia = [...new Set(funcoesDoDia)];

    const containerReferencia = document.getElementById('caixa-selecao-funcao');
    if (!containerReferencia) return;

    containerReferencia.innerHTML = '';
    containerReferencia.style.display = 'flex';
    containerReferencia.style.flexDirection = 'column';
    containerReferencia.style.gap = '8px';

    const label = document.createElement('label');
    label.innerText = 'Selecione a(s) Função(ões) Realizada(s):';
    label.style.fontWeight = 'bold';
    label.style.color = '#fff';
    containerReferencia.appendChild(label);

    const btnEnviar = document.getElementById('btn-enviar');

    if (btnEnviar) btnEnviar.disabled = true;

    if (funcoesDoDia.length === 0) {
        const msgVazio = document.createElement('div');
        msgVazio.innerText = 'Nenhuma função vinculada para você nesta data';
        msgVazio.style.padding = '10px';
        msgVazio.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        msgVazio.style.color = '#ef4444';
        msgVazio.style.border = '1px solid #ef4444';
        msgVazio.style.borderRadius = '6px';
        containerReferencia.appendChild(msgVazio);
    } else {
        const checkContainer = document.createElement('div');
        checkContainer.style.display = 'flex';
        checkContainer.style.flexDirection = 'column';
        checkContainer.style.gap = '8px';

        funcoesDoDia.forEach(f => {
            const labelItem = document.createElement('label');
            labelItem.style.display = 'flex';
            labelItem.style.alignItems = 'center';
            labelItem.style.gap = '10px';
            labelItem.style.padding = '10px 15px';
            labelItem.style.backgroundColor = 'rgba(255,255,255,0.05)';
            labelItem.style.border = '1px solid rgba(255,255,255,0.1)';
            labelItem.style.borderRadius = '6px';
            labelItem.style.cursor = 'pointer';
            labelItem.style.color = '#fff';
            labelItem.style.transition = 'all 0.2s ease';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = f;
            checkbox.className = 'chk-funcao-dinamica';
            checkbox.style.cursor = 'pointer';
            checkbox.style.width = '18px';
            checkbox.style.height = '18px';
            checkbox.style.accentColor = '#10b981';

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    labelItem.style.borderColor = '#10b981';
                    labelItem.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                } else {
                    labelItem.style.borderColor = 'rgba(255,255,255,0.1)';
                    labelItem.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
                
                const marcados = document.querySelectorAll('.chk-funcao-dinamica:checked').length;
                if (btnEnviar) btnEnviar.disabled = (marcados === 0);
            });

            const spanTexto = document.createElement('span');
            spanTexto.innerText = f;

            labelItem.appendChild(checkbox);
            labelItem.appendChild(spanTexto);
            checkContainer.appendChild(labelItem);
        });

        containerReferencia.appendChild(checkContainer);
    }
}

function verificaDiaMagico(textoPrazo, dataObj) {
    const txt = textoPrazo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
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

function mostrarErro(mensagem) {
    document.getElementById('user-nick').innerText = "Acesso Negado";
    const badge = document.getElementById('user-conselho');
    badge.innerText = mensagem;
    badge.style.backgroundColor = "rgba(231, 76, 60, 0.2)";
    badge.style.color = "#e74c3c";
}