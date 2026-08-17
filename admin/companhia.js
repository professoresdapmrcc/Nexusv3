// js/companhia.js (VERSÃO PREMIUM COM SWEETALERT, LIVE CHECK E PREVIEW)

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ companhia.js carregado com recursos Premium.");

    // Configuração do SweetAlert Padrão (Dark Theme do NEXUS)
    const Toast = Swal.mixin({
        background: '#16161a',
        color: '#fff',
        confirmButtonColor: '#be29ec',
        cancelButtonColor: '#3b82f6'
    });

    // Variável global do autor (definida apenas uma vez)
    let autorLogado = { uid: null, nome: 'Sistema' };

    // Elementos da lista de aprovação
    const listElement = document.getElementById('pending-list');
    const loadingElement = document.getElementById('loading-aprovacao');

    // =====================================================================
    // == 1. TRAVA DE SEGURANÇA E IDENTIFICAÇÃO DO AUTOR
    // =====================================================================
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDocRef = db.collection("users").doc(user.uid);
                    const doc = await userDocRef.get();

                    if (doc.exists) {
                        const userData = doc.data();
                        const roleUsuario = userData.role;

                        // VERIFICAÇÃO RÍGIDA: Apenas Role Admin
                        if (roleUsuario === "admin") {
                            console.log("✅ Acesso de Administrador confirmado.");
                            autorLogado = { uid: user.uid, nome: userData.name };
                            
                            // Mostra a página
                            document.body.classList.add('autorizado');
                            
                            // Inicia a lista de aprovações
                            initApprovalList();

                            // Carrega a lista de aulas assim que o admin entra na página
                            carregarListaAulasDinamica();
                        } else {
                            Toast.fire('Acesso Restrito', 'Apenas administradores podem acessar esta área.', 'error')
                            .then(() => window.location.href = "../index.html"); 
                        }
                    } else {
                        window.location.href = "../login.html";
                    }
                } catch (error) {
                    console.error("Erro na verificação de admin:", error);
                    window.location.href = "../login.html";
                }
            } else {
                window.location.href = "../login.html";
            }
        });
    }

    // =====================================================================
    // == 2. NAVEGAÇÃO DA SIDEBAR (ABAS)
    // =====================================================================
    const sidebarLinks = document.querySelectorAll('.companhia-sidebar nav a');
    const contentPanels = document.querySelectorAll('.companhia-content .content-panel');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            sidebarLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            contentPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // =====================================================================
    // == 3. VALIDAÇÃO AO VIVO DE NICKNAME (LIVE CHECK)
    // =====================================================================
    async function checkNickLive(inputElement) {
        const nick = inputElement.value.trim();
        if(!nick) {
            inputElement.classList.remove('input-valid', 'input-invalid');
            return;
        }
        try {
            const uid = await getUserIdByNickname(nick);
            if(uid) {
                inputElement.classList.add('input-valid');
                inputElement.classList.remove('input-invalid');
            }
        } catch(e) {
            inputElement.classList.add('input-invalid');
            inputElement.classList.remove('input-valid');
        }
    }

    // Aplica a checagem aos campos com a classe 'live-check'
    document.querySelectorAll('.live-check').forEach(el => {
        el.addEventListener('blur', () => checkNickLive(el));
    });

    // =====================================================================
    // == 4. LÓGICA DE APROVAÇÃO (GRID DE CARDS)
    // =====================================================================
    function initApprovalList() {
        if(!listElement) return;

        db.collection('users')
          .where('status', '==', 'Pendente')
          .onSnapshot((snapshot) => {
              listElement.innerHTML = ''; 
              if(loadingElement) loadingElement.style.display = 'none';

              if (snapshot.empty) {
                  listElement.innerHTML = '<div class="empty-msg">Sem membros com status pendentes.</div>';
                  return;
              }

              snapshot.forEach(doc => {
                  renderUserCard(doc.data());
              });
          });
    }

    function renderUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        const habboImg = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${user.name}&action=std&direction=2&head_direction=3&gesture=sml&size=l&headonly=1`;
        
        card.innerHTML = `
            <img src="${habboImg}" alt="${user.name}" class="habbo-avatar" onerror="this.src='https://i.imgur.com/1I5Kj2c.png'">
            <h3 class="card-nick">${user.name}</h3>
            <p style="font-size:0.8rem; color:#666; margin-bottom:5px;">${user.email || ''}</p>
            <div class="card-date">Solicitação pendente</div>
            <div class="card-actions">
                <button class="btn-card btn-approve" onclick="updateStatus('${user.uid}', 'aprovar')">
                    <i class="fas fa-check"></i> Aprovar
                </button>
                <button class="btn-card btn-reject" onclick="updateStatus('${user.uid}', 'reprovar')">
                    <i class="fas fa-times"></i> Reprovar
                </button>
            </div>
        `;
        listElement.appendChild(card);
    }

    // =====================================================================
    // == 5. FUNÇÃO GLOBAL DE STATUS (Aprovar/Reprovar)
    // =====================================================================
    window.updateStatus = async function(uid, acao) {
        const isAprovar = acao === 'aprovar';
        const confirmText = isAprovar ? "APROVAR" : "REPROVAR";

        Toast.fire({
            title: `Deseja ${confirmText} este usuário?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sim, ${confirmText}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: isAprovar ? '#10b981' : '#ef4444'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    let updateData = {};
                    if (isAprovar) {
                        const hoje = new Date().toISOString().split('T')[0];
                        updateData = { 
                            status: 'Ativo', 
                            cargo: 'Professor(a)', 
                            dataEntrada: hoje,
                            email: '', 
                            frase: 'Ser professor é ser PROFissional!', 
                            imageUrl: ''
                        };
                    } else {
                        updateData = { status: 'Inativo' };
                    }

                    const userRef = db.collection('users').doc(uid);
                    await userRef.update(updateData);
                    
                    await db.collection('logs_admin').add({
                        acao: isAprovar ? 'Aprovação de Conta' : 'Reprovação de Conta',
                        alvoUid: uid,
                        autor: autorLogado.nome,
                        data: firebase.firestore.FieldValue.serverTimestamp(),
                        detalhes: updateData
                    });

                    if (isAprovar) {
                        await userRef.collection('historico').add({
                            titulo: 'Entrada nos Professores',
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            autor: autorLogado,
                            conteudo: `O membro ingressou nos Professores com o cargo de Professor(a).`,
                            dados: { operacao: 'entrada', cargo: 'Professor(a)', data: updateData.dataEntrada }
                        });
                    }
                    Toast.fire('Sucesso!', 'Operação concluída com sucesso.', 'success');
                } catch (error) {
                    console.error("Erro:", error);
                    Toast.fire('Erro', 'Não foi possível concluir a ação.', 'error');
                }
            }
        });
    };

    // =====================================================================
    // == 6. BUSCA HÍBRIDA E GESTÃO DE FORMULÁRIOS
    // =====================================================================
    async function getUserIdByNickname(nickname) {
        if (!nickname || typeof nickname !== 'string') throw new Error("Nickname inválido.");
        const nickLimpo = nickname.trim().toLowerCase();
        try {
            const nicknameBase64 = btoa(nickLimpo); 
            const docBase64 = await db.collection('nicknames').doc(nicknameBase64).get();
            if (docBase64.exists) return docBase64.data().uid;

            const docDireto = await db.collection('nicknames').doc(nickLimpo).get();
            if (docDireto.exists) return docDireto.data().uid;

            const fallbackQuery = await db.collection('nicknames').where('nickname', '==', nickLimpo).get();
            if (!fallbackQuery.empty) return fallbackQuery.docs[0].data().uid;
            
            throw new Error(`Membro "${nickname}" não encontrado.`);
        } catch (error) { throw error; }
    }

    async function handleFormSubmit(form, loadingText, processFunction) {
        if (!form) return; 
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;
        const originalButtonText = submitButton.innerHTML;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
            try {
                await processFunction(form);
            } catch (error) {
                Toast.fire("Erro", error.message, "error");
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }

    // Função para mostrar resumo Multi-nick
    function mostrarResumoMultiNick(titulo, sucessos, falhas) {
        let htmlResult = `<div style="text-align: left; font-size: 0.9rem;">`;
        if(sucessos.length > 0) htmlResult += `<p style="color:#10b981; margin-bottom: 10px;"><b>✅ Sucesso:</b><br>${sucessos.join(', ')}</p>`;
        if(falhas.length > 0) htmlResult += `<p style="color:#ef4444;"><b>❌ Não encontrados / Falha:</b><br>${falhas.join(', ')}</p>`;
        htmlResult += `</div>`;
        
        Toast.fire({ title: titulo, html: htmlResult, icon: falhas.length > 0 ? 'warning' : 'success' });
    }

    // --- FORMULÁRIO DE ENTRADA ---
    handleFormSubmit(document.querySelector('#entrada form'), 'Registrando...', async (form) => {
        const nickname = form.querySelector('#entrada-nickname').value;
        const cargo = form.querySelector('#cargo-entrada').value;
        const dataEntrada = form.querySelector('#entrada-data').value;
        
        const userId = await getUserIdByNickname(nickname);
        if (!userId) return;

        const userRef = db.collection('users').doc(userId);

        await userRef.update({ 
            cargo: cargo, 
            dataEntrada: dataEntrada,
            status: 'Ativo',
            email: '', 
            frase: 'Ser professor é ser PROFissional!', 
            imageUrl: ''
        });

        await userRef.collection('historico').add({
            titulo: 'Entrada nos Professores',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            autor: autorLogado,
            conteudo: `O membro ingressou nos Professores com o cargo de ${cargo} e status Ativo.`,
            dados: { operacao: 'entrada', cargo: cargo, data: dataEntrada }
        });

        Toast.fire('Sucesso!', `Entrada de ${nickname} registrada e status alterado para Ativo!`, 'success');
        form.reset();
        document.querySelector('#entrada-nickname').classList.remove('input-valid', 'input-invalid');
    });

    // --- FORMULÁRIO DE SAÍDA (MULTINICK) ---
    handleFormSubmit(document.querySelector('#saida form'), 'Registrando...', async (form) => {
        const nicknamesRaw = form.querySelector('#saida-nickname').value;
        const dataSaida = form.querySelector('#saida-data').value;
        const motivo = form.querySelector('#saida-motivo').value;

        const listaNicknames = nicknamesRaw.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; } 

                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                if (!doc.exists) { falhas.push(nickname); continue; }
                
                const currentData = doc.data();

                const makeEx = (valor) => {
                    if (valor && typeof valor === 'string' && valor.trim() !== '' && !valor.startsWith('Ex-')) {
                        return `Ex-${valor}`;
                    }
                    return valor; 
                };

                const updates = {
                    role: firebase.firestore.FieldValue.delete(),
                    status: 'Inativo',
                    dataEntrada: firebase.firestore.FieldValue.delete(),
                    cargo: makeEx(currentData.cargo),
                    spp: makeEx(currentData.spp),
                    da: makeEx(currentData.da),
                    cdc: makeEx(currentData.cdc)
                };
                Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

                await userRef.update(updates);

                await userRef.collection('historico').add({
                    titulo: 'Saída dos Professores',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado,
                    conteudo: `Nosso membro saiu dos Professores, pelo motivo de ${motivo}.`,
                    dados: { operacao: 'saida', motivo: motivo, data: dataSaida }
                });

                sucessos.push(nickname);
            } catch (e) {
                falhas.push(nickname);
            }
        }

        mostrarResumoMultiNick('Resumo de Saídas', sucessos, falhas);
        form.reset();
    });

    // --- FORMULÁRIO DE PROMOÇÃO (MULTINICK) ---
    handleFormSubmit(document.querySelector('#promocao form'), 'Promovendo...', async (form) => {
        const nicknamesRaw = form.querySelector('#promocao-nickname').value;
        const novoCargo = form.querySelector('#promocao-novo-cargo').value;

        const listaNicknames = nicknamesRaw.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }

                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                const cargoAnterior = userDoc.data().cargo || 'Não definido';

                await userRef.update({ cargo: novoCargo });

                await userRef.collection('historico').add({
                    titulo: 'Promoção',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado,
                    conteudo: `Promovido(a) de ${cargoAnterior} para ${novoCargo}.`,
                    dados: { operacao: 'promocao', de: cargoAnterior, para: novoCargo }
                });
                
                if(typeof criarNotificacao === 'function') {
                    const notificacao = criarNotificacao('promocao_membro', { nomeUsuario: nickname, novoCargo }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (notificacao) await db.collection('notificacoes').add(notificacao);
                }
                
                sucessos.push(nickname);
            } catch (e) {
                falhas.push(nickname);
            }
        }

        mostrarResumoMultiNick('Resumo de Promoções', sucessos, falhas);
        form.reset();
    });

    // --- FORMULÁRIO DE REBAIXAMENTO (MULTINICK) ---
    handleFormSubmit(document.querySelector('#rebaixamento form'), 'Rebaixando...', async (form) => {
        const nicknamesRaw = form.querySelector('#rebaixamento-nickname').value;
        const novoCargo = form.querySelector('#rebaixamento-novo-cargo').value;
        const motivo = form.querySelector('#rebaixamento-motivo').value;

        const listaNicknames = nicknamesRaw.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }

                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                const cargoAnterior = userDoc.data().cargo || 'Não definido';

                await userRef.update({ cargo: novoCargo });

                await userRef.collection('historico').add({
                    titulo: 'Rebaixamento',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado,
                    conteudo: `Rebaixado(a) de ${cargoAnterior} para ${novoCargo}. Motivo: ${motivo}`,
                    dados: { operacao: 'rebaixamento', de: cargoAnterior, para: novoCargo, motivo: motivo }
                });

                if(typeof criarNotificacao === 'function') {
                    const notificacao = criarNotificacao('rebaixamento_membro', { nomeUsuario: nickname, novoCargo }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (notificacao) await db.collection('notificacoes').add(notificacao);
                }

                sucessos.push(nickname);
            } catch (e) {
                falhas.push(nickname);
            }
        }

        mostrarResumoMultiNick('Resumo de Rebaixamentos', sucessos, falhas);
        form.reset();
    });

    // --- FORMULÁRIO DE OUVIDORIA (MULTINICK) ---
    handleFormSubmit(document.querySelector('#ouvidoria form'), 'Enviando...', async (form) => {
        const nicknamesRaw = form.querySelector('#ouvidoria-nickname').value;
        const tipo = form.querySelector('#ouvidoria-tipo').value;
        const titulo = form.querySelector('#ouvidoria-titulo').value;
        const ordem = form.querySelector('#ouvidoria-ordem').value;
        const sintese = form.querySelector('#ouvidoria-sintese').value;
        const data = form.querySelector('#ouvidoria-data').value;

        if (!nicknamesRaw || !tipo || !titulo || !sintese || !data) {
            throw new Error("Preencha todos os campos obrigatórios da ouvidoria.");
        }

        const listaNicknames = nicknamesRaw.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }

                const userRef = db.collection('users').doc(userId);

                await userRef.update({ propostas: firebase.firestore.FieldValue.increment(1) });

                const conteudo = `<b>Tipo:</b> ${tipo}<br><b>Ordem:</b> ${ordem}<b>Título:</b> ${titulo}<br><br><br><b>Síntese:</b> ${sintese}`;

                await userRef.collection('historico').add({
                    titulo: 'Proposta Aprovada na Ouvidoria',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    data: data,
                    autor: autorLogado,
                    conteudo: conteudo,
                    dados: { 
                        departamento: 'Companhia', 
                        tipo: tipo, 
                        ordem: ordem, 
                        titulo: titulo, 
                        sintese: sintese,
                        parceiros: nicknamesRaw 
                    }
                });

                if(typeof criarNotificacao === 'function') {
                    const notificacao = criarNotificacao('companhia_ouvidoria', { nomeUsuario: nickname, tipoProposta: tipo }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (notificacao) await db.collection('notificacoes').add(notificacao);
                }

                sucessos.push(nickname);
            } catch (error) {
                falhas.push(nickname);
            }
        }

        mostrarResumoMultiNick('Resumo de Propostas', sucessos, falhas);
        form.reset();
    });
        
    // --- FORMULÁRIO DE HOMOLOGAÇÃO ---
    handleFormSubmit(document.getElementById('form-homologacao'), 'Enviando...', async (form) => {
        const numero = form.querySelector('#homologacao-numero').value;
        const linkFixoHomologacao = 'https://www.policiarcc.com/t33340-prof-edital-de-homologacao';
        
        if(typeof criarNotificacao === 'function') {
            const notificacao = criarNotificacao('companhia_homologacao', { numero, autor: autorLogado.nome }, linkFixoHomologacao);
            if (notificacao) {
                await db.collection('notificacoes').add(notificacao);
                Toast.fire('Sucesso!', `Notificação de homologação Nº ${numero} enviada para todos!`, 'success');
                form.reset();
            }
        }
    });

    // =========================================================================
    // === FORMULÁRIO DE DESTAQUES ===
    // =========================================================================
    handleFormSubmit(document.querySelector('#destaques form'), 'Registrando...', async (form) => {
        const nickname = form.querySelector('#destaque-nickname').value;
        const cargo = form.querySelector('#destaque-cargo').value;
        const meta = form.querySelector('#destaque-meta').value;

        if (!nickname || !cargo || !meta) {
            throw new Error("Preencha todos os campos do destaque.");
        }

        const userId = await getUserIdByNickname(nickname);
        if (!userId) return;

        const userRef = db.collection('users').doc(userId);

        await userRef.collection('historico').add({
            titulo: 'Destaque Semanal',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            autor: autorLogado,
            conteudo: `O membro foi destaque no cargo de ${cargo}, atingiu a meta de ${meta}.`,
            dados: { operacao: 'destaque', cargo: cargo, meta: meta }
        });

        if(typeof criarNotificacao === 'function') {
            const notificacao = criarNotificacao('destaque_recebido', { autor: autorLogado.nome, meta: meta }, `/perfil/${userId}`, userId);
            if (notificacao) await db.collection('notificacoes').add(notificacao);
        }

        Toast.fire('Sucesso!', `Destaque registrado para ${nickname}!`, 'success');
        form.reset();
        document.querySelector('#destaque-nickname').classList.remove('input-valid', 'input-invalid');
    });

    // --- FORMULÁRIO DE TRANSFERÊNCIA DE CONTA ---
    handleFormSubmit(document.querySelector('#transferencia form'), 'Processando...', async (form) => {
        const oldNick = form.querySelector('#transf-old-nick').value;
        const newNick = form.querySelector('#transf-new-nick').value;
        const dataTransf = form.querySelector('#transf-data').value;

        const userId = await getUserIdByNickname(oldNick);
        if (!userId) return;

        const userRef = db.collection('users').doc(userId);
        
        await db.collection('users').doc(userId).update({ name: newNick });

        const oldNickLimpo = oldNick.trim().toLowerCase();
        const newNickLimpo = newNick.trim().toLowerCase();

        // 1. Cria os índices do NOVO nick primeiro (salva normal e Base64)
        await db.collection('nicknames').doc(newNickLimpo).set({ 
            uid: userId, 
            nickname: newNickLimpo 
        });
        
        const newNickBase64 = btoa(newNickLimpo);
        await db.collection('nicknames').doc(newNickBase64).set({ 
            uid: userId, 
            nickname: newNickLimpo 
        });

        // 2. Só deleta o antigo se for realmente diferente
        if (oldNickLimpo !== newNickLimpo) {
            const oldNickBase64 = btoa(oldNickLimpo);
            await db.collection('nicknames').doc(oldNickLimpo).delete().catch(() => {});
            await db.collection('nicknames').doc(oldNickBase64).delete().catch(() => {});
        }

        await userRef.collection('historico').add({
            titulo: 'Transferência de Nickname',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            autor: autorLogado,
            conteudo: `O membro alterou seu nickname de ${oldNick} para ${newNick}.`,
            dados: { operacao: 'transferencia', antigo: oldNick, novo: newNick, data: dataTransf }
        });

        Toast.fire('Sucesso!', `Transferência concluída! ${oldNick} agora é ${newNick}.`, 'success');
        form.reset();
        document.querySelector('#transf-old-nick').classList.remove('input-valid', 'input-invalid');
    });

    // --- FORMULÁRIO DE ADMINISTRADOR ---
    handleFormSubmit(document.querySelector('#admin-management form'), 'Atualizando...', async (form) => {
        const nickname = form.querySelector('#admin-nickname').value;
        const permissao = form.querySelector('#admin-permissao').value;
        const dataAdmin = form.querySelector('#admin-data').value;

        const userId = await getUserIdByNickname(nickname);
        if (!userId) return;

        const userRef = db.collection('users').doc(userId);

        await userRef.update({ role: permissao });

        await db.collection('logs_admininistrador').add({
            acao: 'Alteração de Nível de Acesso',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            autor: { uid: autorLogado.uid, nome: autorLogado.nome },
            alvo: { uid: userId, nome: nickname },
            detalhes: { novoNivel: permissao, dataEfetiva: dataAdmin }
        });

        await userRef.collection('historico').add({
            titulo: 'Novo administrador',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            autor: autorLogado,
            conteudo: `O membro agora é um ${permissao === 'admin' ? 'Administrador' : 'Usuário'} do Nexus.`,
            dados: { operacao: 'permissao', nivel: permissao, data: dataAdmin }
        });

        Toast.fire('Sucesso!', `Permissão de ${nickname} atualizada para ${permissao}!`, 'success');
        form.reset();
        document.querySelector('#admin-nickname').classList.remove('input-valid', 'input-invalid');
    });

    // =====================================================================
    // == 7. GERENCIAMENTO DINÂMICO DE SCRIPTS (EDITOR)
    // =====================================================================

    async function carregarListaAulasDinamica() {
        const select = document.getElementById('select-aula-admin');
        if (!select) return;

        try {
            const snapshot = await db.collection("scripts_aulas").get();
            select.innerHTML = '<option value="">Selecione uma aula para editar...</option>';

            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id; 
                option.textContent = doc.data().titulo || doc.id.toUpperCase();
                select.appendChild(option);
            });
            console.log("✅ Lista de scripts carregada do Firebase.");
        } catch (error) {
            console.error("Erro ao carregar lista de aulas:", error);
            Swal.fire('Erro', 'Não foi possível buscar as aulas do Firebase.', 'error');
        }
    }

    window.carregarAulaParaEditor = async function() {
        const idAula = document.getElementById('select-aula-admin').value;
        const container = document.getElementById('editor-container');
        
        if (!idAula) return Toast.fire("Atenção", "Por favor, selecione uma aula!", "warning");

        try {
            const doc = await db.collection("scripts_aulas").doc(idAula).get();
            if (doc.exists) {
                const dados = doc.data();
                document.getElementById('edit-titulo').value = dados.titulo || "";
                document.getElementById('edit-subtitulo').value = dados.subtitulo || "";
                
                let conteudoLimpo = dados.conteudo || "";
                conteudoLimpo = conteudoLimpo.replace(/<p class="instruction">/g, "");
                conteudoLimpo = conteudoLimpo.replace(/<\/p>/g, "\n");
                conteudoLimpo = conteudoLimpo.replace(/<p>/g, "");
                document.getElementById('edit-conteudo').value = conteudoLimpo.trim();
                
                container.style.display = 'block';
            }
        } catch (error) {
            Toast.fire("Erro", "Erro ao carregar conteúdo: " + error.message, "error");
        }
    };

    window.salvarAlteracoesAula = async function() {
        const idAula = document.getElementById('select-aula-admin').value;
        const areaTexto = document.getElementById('edit-conteudo').value;

        const linhas = areaTexto.split('\n'); 
        const conteudoProcessado = linhas.map(linha => {
            let texto = linha.trim();
            if (texto === "") return ""; 

            if (texto.startsWith('[') && texto.endsWith(']')) {
                return `<p class="instruction">${texto}</p>`;
            }
            if (texto.startsWith('<')) {
                return texto;
            }
            return `<p>${texto}</p>`;
        }).join('\n');

        const novosDados = {
            titulo: document.getElementById('edit-titulo').value,
            subtitulo: document.getElementById('edit-subtitulo').value,
            conteudo: conteudoProcessado,
            ultima_atualizacao: firebase.firestore.FieldValue.serverTimestamp(),
            editor: autorLogado.nome
        };

        Toast.fire({
            title: 'Salvar Aula?', 
            text: 'As instruções serão formatadas automaticamente.',
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar'
        }).then(async (res) => {
            if(res.isConfirmed) {
                try {
                    await db.collection("scripts_aulas").doc(idAula).update(novosDados);
                    Toast.fire("Sucesso!", "Script formatado e salvo com sucesso!", "success");
                    carregarAulaParaEditor(); 
                } catch (error) {
                    Toast.fire("Erro", "Erro ao salvar.", "error");
                }
            }
        });
    };

    // =====================================================================
    // == 8. LÓGICA DO EDITOR DE DOCUMENTOS OFICIAIS
    // =====================================================================

    window.carregarDocumentoParaEditor = async function() {
        const idDoc = document.getElementById('select-doc-admin').value;
        const container = document.getElementById('doc-editor-container');
        
        if (!idDoc) return Toast.fire("Atenção", "Por favor, selecione um documento!", "warning");

        try {
            const doc = await db.collection("documentos").doc(idDoc).get();
            if (doc.exists) {
                const dados = doc.data();
                document.getElementById('edit-doc-titulo').value = dados.titulo || "";
                document.getElementById('edit-doc-subtitulo').value = dados.subtitulo || "";
                document.getElementById('edit-doc-conteudo').value = dados.conteudo || "";
                
                container.style.display = 'block';
            } else {
                Toast.fire("Erro", "Documento não encontrado no Firebase.", "error");
            }
        } catch (error) {
            Toast.fire("Erro", "Erro ao carregar: " + error.message, "error");
        }
    };

    window.salvarAlteracoesDocumento = async function() {
        const idDoc = document.getElementById('select-doc-admin').value;
        
        const novosDados = {
            titulo: document.getElementById('edit-doc-titulo').value,
            subtitulo: document.getElementById('edit-doc-subtitulo').value,
            conteudo: document.getElementById('edit-doc-conteudo').value,
            ultima_edicao: firebase.firestore.FieldValue.serverTimestamp(),
            editado_por: autorLogado.nome
        };

        Toast.fire({
            title: 'Alterar Documento Oficial?', 
            text: 'Isto afetará todos os membros. Confirmar?',
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonText: 'Sim, Salvar'
        }).then(async (res) => {
            if(res.isConfirmed) {
                try {
                    await db.collection("documentos").doc(idDoc).update(novosDados);
                    Toast.fire("Sucesso!", "Documento Oficial atualizado com sucesso!", "success");
                } catch (error) {
                    Toast.fire("Erro", "Erro ao salvar documento.", "error");
                }
            }
        });
    };

    // =====================================================================
    // == 9. PRÉ-VISUALIZAÇÃO (PREVIEW) PARA OS EDITORES
    // =====================================================================
    window.previewHTML = function(textareaId, titulo) {
        const htmlContent = document.getElementById(textareaId).value;
        
        let processedHTML = htmlContent;
        if(textareaId === 'edit-conteudo') {
            processedHTML = htmlContent.split('\n').map(linha => {
                let t = linha.trim();
                if (t === "") return "";
                if (t.startsWith('[') && t.endsWith(']')) return `<p style="color:#e67e22; font-weight:bold; font-style:italic;">${t}</p>`;
                if (t.startsWith('<')) return t;
                return `<p style="margin-bottom:8px;">${t}</p>`;
            }).join('\n');
        }

        Swal.fire({
            title: titulo,
            html: `<div style="text-align: left; background: #fff; color: #333; padding: 20px; border-radius: 8px; max-height: 50vh; overflow-y: auto; border: 1px solid #ccc; font-family: sans-serif;">
                    ${processedHTML}
                   </div>`,
            width: '800px',
            background: '#16161a',
            color: '#fff',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Fechar Preview'
        });
    };

    // =====================================================================
    // == 10. FÁBRICAS DE FORMATAÇÃO E CÓPIAS
    // =====================================================================
    window.gerarECopiarTag = function() {
        const type = document.getElementById('factory-type').value;
        const input = document.getElementById('factory-input').value.trim();
        const preview = document.getElementById('factory-preview');
        let resultado = "";

        if (!input && type !== 'pun') {
            Toast.fire("Atenção", "Digite algo no campo de texto!", "warning");
            return;
        }

        switch (type) {
            case 'art': resultado = `<p><strong>Art. ${input}</strong> - </p>`; break;
            case 'par': resultado = `<p><strong>§${input}</strong> - </p>`; break;
            case 'pun': resultado = `<p><strong>Parágrafo único</strong> - </p>`; break;
            case 'tit': resultado = `<h3 class="script-section-title">${input.toUpperCase()}</h3>`; break;
            case 'sec': resultado = `<h5 class="script-subsection-title">${input.toUpperCase()}</h5>`; break;
            case 'inc': resultado = `<p><strong>${input}</strong> - </p>`; break;
        }

        navigator.clipboard.writeText(resultado).then(() => {
            preview.innerText = `Copiado: ${resultado}`;
            const inputField = document.getElementById('factory-input');
            inputField.style.borderColor = "#00b894";
            setTimeout(() => {
                inputField.style.borderColor = "";
                inputField.value = ""; 
            }, 1500);
        }).catch(err => {
            Toast.fire("Erro", "Erro ao copiar: " + err, "error");
        });
    };

    window.gerarECopiarScript = function() {
        const type = document.getElementById('script-factory-type').value;
        const input = document.getElementById('script-factory-input').value.trim();
        const preview = document.getElementById('script-factory-preview');
        let resultado = "";

        if (!input) {
            Toast.fire("Atenção", "Digite o conteúdo da fala ou instrução!", "warning");
            return;
        }

        switch (type) {
            case 'fala': resultado = `<p>${input}</p>`; break;
            case 'inst': resultado = `<p class="instruction">[${input.toUpperCase()}]</p>`; break;
            case 'neg': resultado = `<strong>${input}</strong>`; break;
        }

        navigator.clipboard.writeText(resultado).then(() => {
            preview.innerText = `Copiado: ${resultado}`;
            const inputField = document.getElementById('script-factory-input');
            inputField.style.borderColor = "#00b894";
            setTimeout(() => {
                inputField.style.borderColor = "";
                inputField.value = ""; 
            }, 1500);
        }).catch(err => {
            Toast.fire("Erro", "Erro ao copiar: " + err, "error");
        });
    };
});