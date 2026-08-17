// js/da.js (VERSÃO PREMIUM COM SWEETALERT, LIVE CHECK E MULTINICK)

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ da.js Premium carregado.");

    const Toast = Swal.mixin({
        background: '#16161a', color: '#fff', confirmButtonColor: '#be29ec', cancelButtonColor: '#3b82f6'
    });

    let autorLogado = { uid: null, nome: 'Sistema' };

    // 1. TRAVA DE SEGURANÇA EXCLUSIVA PARA ADMIN
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDocRef = db.collection("users").doc(user.uid);
                    const doc = await userDocRef.get();
                    if (doc.exists && doc.data().role === "admin") {
                        autorLogado = { uid: user.uid, nome: doc.data().name };
                        document.body.classList.add('autorizado');
                    } else {
                        Toast.fire('Acesso Restrito', 'Apenas administradores.', 'error').then(() => window.location.href = "../index.html"); 
                    }
                } catch (error) { window.location.href = "../login.html"; }
            } else { window.location.href = "../login.html"; }
        });
    }

    // 2. NAVEGAÇÃO DA SIDEBAR (ABAS)
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

    // 3. VALIDAÇÃO AO VIVO DE NICKNAME (LIVE CHECK)
    async function checkNickLive(inputElement) {
        const nick = inputElement.value.trim();
        if(!nick) { inputElement.classList.remove('input-valid', 'input-invalid'); return; }
        try {
            const uid = await getUserIdByNickname(nick);
            if(uid) { inputElement.classList.add('input-valid'); inputElement.classList.remove('input-invalid'); }
        } catch(e) { inputElement.classList.add('input-invalid'); inputElement.classList.remove('input-valid'); }
    }
    document.querySelectorAll('.live-check').forEach(el => el.addEventListener('blur', () => checkNickLive(el)));

    // 4. FUNÇÕES DE BUSCA E MULTINICK
    async function getUserIdByNickname(nickname) {
        const nickLimpo = nickname.trim().toLowerCase();
        try {
            const nicknameBase64 = btoa(nickLimpo); 
            const docBase64 = await db.collection('nicknames').doc(nicknameBase64).get();
            if (docBase64.exists) return docBase64.data().uid;

            const docDireto = await db.collection('nicknames').doc(nickLimpo).get();
            if (docDireto.exists) return docDireto.data().uid;

            const fallbackQuery = await db.collection('nicknames').where('nickname', '==', nickLimpo).get();
            if (!fallbackQuery.empty) return fallbackQuery.docs[0].data().uid;
            
            throw new Error(`Membro não encontrado.`);
        } catch (error) { throw error; }
    }

    async function handleFormSubmit(formSelector, loadingText, processFunction) {
        const form = document.querySelector(formSelector);
        if (!form) return; 
        const submitButton = form.querySelector('button[type="submit"]');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
            try { await processFunction(form); } 
            catch (error) { Toast.fire("Erro", error.message, "error"); } 
            finally { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
        });
    }

    function mostrarResumoMultiNick(titulo, sucessos, falhas) {
        let htmlResult = `<div style="text-align: left; font-size: 0.9rem;">`;
        if(sucessos.length > 0) htmlResult += `<p style="color:#10b981; margin-bottom: 10px;"><b>✅ Sucesso:</b><br>${sucessos.join(', ')}</p>`;
        if(falhas.length > 0) htmlResult += `<p style="color:#ef4444;"><b>❌ Falha:</b><br>${falhas.join(', ')}</p>`;
        htmlResult += `</div>`;
        Toast.fire({ title: titulo, html: htmlResult, icon: falhas.length > 0 ? 'warning' : 'success' });
    }

    // --- ENTRADA NO DA ---
    handleFormSubmit('#entrada form', 'Registrando...', async (form) => {
        const inputNicks = form.querySelector('#entrada-nickname').value;
        const cargoDA = form.querySelector('#cargoentrada').value;
        const dataEntrada = form.querySelector('#entrada-data').value;
        const listaNicknames = inputNicks.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }
                const userRef = db.collection('users').doc(userId);
                
                await userRef.set({ da: cargoDA, daDataEntrada: dataEntrada }, { merge: true });
                await userRef.collection('historico').add({
                    titulo: 'Entrada no DA', timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado, conteudo: `O membro ingressou no DA com o cargo de ${cargoDA}.`,
                    dados: { departamento: 'DA', cargo: cargoDA, dataEntrada: dataEntrada }
                });
                if (typeof criarNotificacao === 'function') {
                    const n = criarNotificacao('da_entrada', { nomeUsuario: nickname, cargo: cargoDA }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (n) await db.collection('notificacoes').add(n);
                }
                sucessos.push(nickname);
            } catch (e) { falhas.push(nickname); }
        }
        mostrarResumoMultiNick('Entrada no DA', sucessos, falhas);
        form.reset();
        document.querySelectorAll('.live-check').forEach(el => el.classList.remove('input-valid', 'input-invalid'));
    });

    // --- SAÍDA DO DA ---
    handleFormSubmit('#saida form', 'Registrando...', async (form) => {
        const inputNicks = form.querySelector('#saida-nickname').value;
        const dataSaida = form.querySelector('#saida-data').value;
        const motivo = form.querySelector('#saida-forma').value;
        const listaNicknames = inputNicks.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                const cargoAnterior = doc.data().da || 'Não definido';

                await userRef.update({ 
                    da: firebase.firestore.FieldValue.delete(),
                    daDataEntrada: firebase.firestore.FieldValue.delete()
                });
                await userRef.collection('historico').add({
                    titulo: 'Saída do DA', timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado, conteudo: `Registrou saída do DA. Motivo: ${motivo}. Cargo anterior: ${cargoAnterior}.`,
                    dados: { departamento: 'DA', cargoAnterior: cargoAnterior, dataSaida }
                });
                sucessos.push(nickname);
            } catch (e) { falhas.push(nickname); }
        }
        mostrarResumoMultiNick('Saída do DA', sucessos, falhas);
        form.reset();
    });

    // --- PROMOÇÃO NO DA ---
    handleFormSubmit('#promocao form', 'Promovendo...', async (form) => {
        const inputNicks = form.querySelector('#promocao-nickname').value;
        const novoCargo = form.querySelector('#promocao-novo-cargo').value;
        const motivo = form.querySelector('#promocao-motivo').value;
        const listaNicknames = inputNicks.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                const cargoAnterior = doc.data().da || 'Não definido';

                await userRef.update({ da: novoCargo });
                await userRef.collection('historico').add({
                    titulo: 'Promoção no DA', timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado, conteudo: `Promoção no DA de ${cargoAnterior} para ${novoCargo}. Motivo: ${motivo}`,
                    dados: { departamento: 'DA', cargoAnterior: cargoAnterior, novoCargo: novoCargo }
                });
                if (typeof criarNotificacao === 'function') {
                    const n = criarNotificacao('da_promocao', { nomeUsuario: nickname, novoCargo }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (n) await db.collection('notificacoes').add(n);
                }
                sucessos.push(nickname);
            } catch (e) { falhas.push(nickname); }
        }
        mostrarResumoMultiNick('Promoção no DA', sucessos, falhas);
        form.reset();
    });

    // --- REBAIXAMENTO NO DA ---
    handleFormSubmit('#rebaixamento form', 'Rebaixando...', async (form) => {
        const inputNicks = form.querySelector('#rebaixamento-nickname').value;
        const novoCargo = form.querySelector('#rebaixamento-novo-cargo').value;
        const motivo = form.querySelector('#rebaixamento-motivo').value;
        const listaNicknames = inputNicks.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                const cargoAnterior = doc.data().da || 'Não definido';

                await userRef.update({ da: novoCargo });
                await userRef.collection('historico').add({
                    titulo: 'Rebaixamento no DA', timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    autor: autorLogado, conteudo: `Rebaixamento no DA de ${cargoAnterior} para ${novoCargo}. Motivo: ${motivo}`,
                    dados: { departamento: 'DA', cargoAnterior: cargoAnterior, novoCargo: novoCargo }
                });
                if (typeof criarNotificacao === 'function') {
                    const n = criarNotificacao('da_rebaixamento', { nomeUsuario: nickname, novoCargo }, `/membros/${encodeURIComponent(nickname)}`, userId);
                    if (n) await db.collection('notificacoes').add(n);
                }
                sucessos.push(nickname);
            } catch (e) { falhas.push(nickname); }
        }
        mostrarResumoMultiNick('Rebaixamento no DA', sucessos, falhas);
        form.reset();
    });

    // --- OUVIDORIA DO DA ---
    handleFormSubmit('#ouvidoria form', 'Registrando...', async (form) => {
        const inputNicks = form.querySelector('#ouvidoria-nickname').value;
        const tipo = form.querySelector('#ouvidoria-tipo').value;
        const titulo = form.querySelector('#ouvidoria-titulo').value;
        const ordem = form.querySelector('#ouvidoria-ordem').value;
        const sintese = form.querySelector('#ouvidoria-sintese').value;
        const dataEnvio = form.querySelector('#ouvidoria-data').value;
        const listaNicknames = inputNicks.split('/').map(n => n.trim()).filter(n => n !== "");
        let sucessos = [], falhas = [];

        for (const nickname of listaNicknames) {
            try {
                const userId = await getUserIdByNickname(nickname);
                if (!userId) { falhas.push(nickname); continue; }
                const userRef = db.collection('users').doc(userId);

                await userRef.update({ propostas: firebase.firestore.FieldValue.increment(1) });
                const conteudo = `Tipo: ${tipo}<br>Título: ${titulo}<br>Ordem: ${ordem}<br>Síntese: ${sintese}`;

                await userRef.collection('historico').add({
                    titulo: 'Proposta Aprovada na Ouvidoria do DA', timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    data: dataEnvio, autor: autorLogado, conteudo: conteudo,
                    dados: { departamento: 'DA', tipoProposta: tipo, titulo: titulo, sintese: sintese }
                });
                if (typeof criarNotificacao === 'function') {
                    const n = criarNotificacao('da_ouvidoria', { nomeUsuario: nickname, tipoProposta: tipo }, `/admin/da.html`, userId);
                    if (n) await db.collection('notificacoes').add(n);
                }
                sucessos.push(nickname);
            } catch (e) { falhas.push(nickname); }
        }
        mostrarResumoMultiNick('Ouvidoria DA', sucessos, falhas);
        form.reset();
    });
});