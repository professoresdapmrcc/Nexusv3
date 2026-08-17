// Configurações de Coleções
const COLECAO_ESCALAS = 'escalas_cdc';
const COLECAO_PERIODOS = 'cdc_periodos'; // Nova coleção dedicada APENAS para gerir os períodos!

let hasAdminPrivileges = false;

document.addEventListener("DOMContentLoaded", () => {
    verificarPermissoesIniciais();
    configurarFiltrosBusca();
    configurarModaisGerais();
});

/* ==========================================================================
   1. PERMISSÕES E SINCRONIZAÇÃO DA NOVA COLEÇÃO "PERIODOS"
   ========================================================================== */
function verificarPermissoesIniciais() {
    const loading = document.getElementById('loading-overlay');
    loading.classList.remove('hidden');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    const cargosPermitidos = ['Secretário(a)', 'Vice-Diretor(a)', 'Diretor(a)'];
                    if (data.role === 'admin' || cargosPermitidos.includes(data.cargo)) {
                        hasAdminPrivileges = true;
                        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
                    }
                }
            } catch (e) { console.error(e); }
            iniciarListenersFirestore();
            escutarDatasPeriodos();
        } else { loading.classList.add('hidden'); }
    });
}

function escutarDatasPeriodos() {
    // Escuta individualmente cada documento (analistas, docentes, promotores) dentro da coleção "periodos"
    ['analistas', 'docentes', 'promotores'].forEach(tipo => {
        db.collection(COLECAO_PERIODOS).doc(tipo).onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();
                document.getElementById(`periodo-${tipo}`).innerText = formataDataTexto(d.inicio, d.fim);
                
                // Armazena as datas no botão de edição para puxar para o Modal
                const btnEdit = document.getElementById(`btn-edit-periodo-${tipo}`);
                if(btnEdit) {
                    btnEdit.dataset.inicio = d.inicio;
                    btnEdit.dataset.fim = d.fim;
                }
            } else {
                // Criação inicial caso a coleção ainda não exista no Firebase
                let inicio = '2026-05-01', fim = '2026-05-15';
                if(tipo === 'analistas') { inicio = '2026-04-29'; fim = '2026-05-12'; }
                if(tipo === 'docentes') { inicio = '2026-05-01'; fim = '2026-05-17'; }
                if(tipo === 'promotores') { inicio = '2026-05-02'; fim = '2026-05-08'; }
                db.collection(COLECAO_PERIODOS).doc(tipo).set({ inicio, fim });
            }
        });
    });
}

// O formato pedido: "01 de maio de 2026 a 15 de maio de 2026"
function formataDataTexto(i, f) {
    const start = dayjs(i).format('DD [de] MMMM [de] YYYY');
    const end = dayjs(f).format('DD [de] MMMM [de] YYYY');
    return `${start} a ${end}`;
}

/* ==========================================================================
   MODAL PARA EDIÇÃO MANUAL DO PERÍODO
   ========================================================================== */
window.abrirModalPeriodo = function(tipo) {
    const btn = document.getElementById(`btn-edit-periodo-${tipo}`);
    document.getElementById('periodo-tipo').value = tipo;
    document.getElementById('periodo-inicio').value = btn.dataset.inicio;
    document.getElementById('periodo-fim').value = btn.dataset.fim;
    document.getElementById('periodo-modal').classList.remove('hidden');
}

window.fecharModalPeriodo = function() {
    document.getElementById('periodo-modal').classList.add('hidden');
}

document.getElementById('form-periodo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('periodo-tipo').value;
    const inicio = document.getElementById('periodo-inicio').value;
    const fim = document.getElementById('periodo-fim').value;
    
    try {
        await db.collection(COLECAO_PERIODOS).doc(tipo).update({ inicio, fim });
        fecharModalPeriodo();
        mostrarToast('Datas do período atualizadas com sucesso!', 'success');
    } catch(error) {
        mostrarToast('Erro ao atualizar datas.', 'error');
    }
});

/* ==========================================================================
   2. LÓGICA DE BACKUP E HISTÓRICO (SEPARANDO AS COLEÇÕES)
   ========================================================================== */
async function executarBackupEscala(tipo) {
    const loading = document.getElementById('loading-overlay');
    loading.classList.remove('hidden');

    try {
        const docCfg = await db.collection(COLECAO_PERIODOS).doc(tipo).get();
        const p = docCfg.data();

        const snap = await db.collection(COLECAO_ESCALAS).where('tipo', '==', tipo).get();
        
        if (!snap.empty) {
            const backupArray = [];
            snap.forEach(doc => backupArray.push(doc.data()));

            const nomeDoPeriodoNoBanco = `${tipo}_${p.inicio}_ate_${p.fim}`;
            const nomeVisivel = formataDataTexto(p.inicio, p.fim);

            await db.collection(COLECAO_ESCALAS).doc('historico').collection('periodos').doc(nomeDoPeriodoNoBanco).set({
                tipo: tipo,
                periodo: nomeVisivel,
                data_inicio: p.inicio,
                data_fim: p.fim,
                escalas: backupArray,
                realizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });

            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        let novoInicio, novoFim;
        if (tipo === 'analistas') {
            const diaInicio = dayjs(p.inicio).date();
            if (diaInicio <= 10) { 
                novoInicio = dayjs(p.inicio).date(17).format('YYYY-MM-DD');
                novoFim = dayjs(p.inicio).endOf('month').format('YYYY-MM-DD');
            } else { 
                novoInicio = dayjs(p.inicio).add(1, 'month').date(1).format('YYYY-MM-DD');
                novoFim = dayjs(novoInicio).date(16).format('YYYY-MM-DD');
            }
        } else {
            let salto = (tipo === 'docentes') ? 17 : 7;
            novoInicio = dayjs(p.inicio).add(salto, 'day').format('YYYY-MM-DD');
            novoFim = dayjs(p.fim).add(salto, 'day').format('YYYY-MM-DD');
        }

        await db.collection(COLECAO_PERIODOS).doc(tipo).update({
            inicio: novoInicio,
            fim: novoFim
        });

        mostrarToast(`Backup de ${tipo} salvo no histórico e tabela zerada!`, 'success');
    } catch (e) { 
        console.error(e);
        mostrarToast('Erro ao realizar o backup', 'error'); 
    } 
    finally { loading.classList.add('hidden'); }
}

/* ==========================================================================
   3. CRIAÇÃO DE LINHAS E STATUS AUTOMÁTICO
   ========================================================================== */
function iniciarListenersFirestore() {
    db.collection(COLECAO_ESCALAS).orderBy('createdAt', 'asc').onSnapshot((snapshot) => {
        const analistas = [], docentes = [], promotores = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.tipo === 'analistas') analistas.push(doc);
            else if (data.tipo === 'docentes') docentes.push(doc);
            else if (data.tipo === 'promotores') promotores.push(doc);
        });

        renderizarTabela('analistas-table', 'analistas', analistas);
        renderizarTabela('docentes-table', 'docentes', docentes);
        renderizarTabela('promotores-table', 'promotores', promotores);
    });
}

function renderizarTabela(containerId, tipo, documentos) {
    const tbody = document.getElementById(containerId);
    tbody.innerHTML = '';

    documentos.forEach(doc => {
        tbody.appendChild(criarElementoLinha(doc.id, tipo, doc.data()));
    });

    const btnContainer = document.getElementById(`add-btn-container-${tipo}`);
    if (btnContainer) {
        if (hasAdminPrivileges) btnContainer.classList.remove('hidden');
    }
}

window.adicionarLinhaVazia = function(containerId, tipo) {
    const tbody = document.getElementById(containerId);
    if (!tbody.querySelector('tr[data-id="novo"]')) {
        tbody.appendChild(criarElementoLinha('novo', tipo, {
            ordem: '', prazo: '', nick: '', funcao: '', status: 'Pendente'
        }));
    }
};

function criarElementoLinha(id, tipo, data) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    
    const hoje = dayjs().startOf('day');
    const prazo = data.prazo ? dayjs(data.prazo, 'YYYY-MM-DD').startOf('day') : null;
    const isConcluido = data.status === 'Concluído' || !!data.comprovacaoUrl;
    const isAtrasado = prazo && hoje.isAfter(prazo);

    let statusFinal = 'Pendente';
    if (isConcluido) statusFinal = 'Concluído';
    else if (isAtrasado) statusFinal = 'Não Realizado';

    let statusHTML = '', actionHTML = '';

    if (statusFinal === 'Concluído') {
        statusHTML = `<a href="${data.comprovacaoUrl || '#'}" target="_blank" class="status-badge status-concluido">Concluído <i class="fas fa-check"></i></a>`;
        actionHTML = `<i class="fas fa-check-circle text-green-500 text-xl mx-2" style="color:#2ecc71;"></i>`;
    } else if (statusFinal === 'Não Realizado') {
        statusHTML = `<span class="status-badge status-nao-realizado">Não Realizado</span>`;
        actionHTML = `<i class="fas fa-times-circle text-red-500 text-xl mx-2" style="color:#e74c3c;"></i>`;
    } else {
        statusHTML = `<span class="status-badge status-pendente">Pendente</span>`;
        actionHTML = `
            <button class="btn-action postar" onclick="abrirModalFormulario('${id}','Postar','','${data.nick}')"><i class="fas fa-upload"></i></button>
            <button class="btn-action justificar" onclick="abrirModalFormulario('${id}','Justificar','','${data.nick}')"><i class="fas fa-exclamation-triangle"></i></button>`;
    }

    if (hasAdminPrivileges && id !== 'novo') {
        if (statusFinal !== 'Pendente') {
            actionHTML += `<button class="btn-action" onclick="desfazerConclusao('${id}')" title="Desfazer"><i class="fas fa-undo"></i></button>`;
        }
        actionHTML += `<button class="btn-action" onclick="excluirRegistro('${id}')"><i class="fas fa-trash" style="color:var(--status-danger)"></i></button>`;
    } else if (id === 'novo') {
        actionHTML = '<span class="text-muted text-sm"><i class="fas fa-pencil-alt"></i> Editando</span>';
    }

    const avatar = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${data.nick || 'ADM'}&headonly=1&size=s`;

    tr.innerHTML = `
        <td>
            <input type="hidden" data-field="ordem" value="${data.ordem || ''}">
            <div class="nick-wrapper">
                <img src="${avatar}" class="habbo-head">
                <input type="text" class="cell-input font-bold" data-field="nick" value="${data.nick || ''}" placeholder="Nick...">
            </div>
        </td>
        <td><input type="text" class="cell-input" data-field="funcao" value="${data.funcao || ''}" placeholder="Ata, Relatório..."></td>
        <td><input type="date" class="cell-input" data-field="prazo" value="${data.prazo || ''}"></td>
        <td>${statusHTML}</td>
        <td class="action-cell">${actionHTML}</td>
    `;

    tr.querySelectorAll('.cell-input').forEach(i => i.addEventListener('change', e => salvarAlteracaoInline(e, id, tipo, tr)));
    return tr;
}

async function salvarAlteracaoInline(event, id, tipo, tr) {
    const input = event.target;
    const field = input.dataset.field;
    const value = input.value;

    if (field === 'nick') {
        const img = tr.querySelector('.habbo-head');
        if(img) img.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${value || 'ADM'}&action=std&direction=2&head_direction=2&gesture=sml&size=s&headonly=1`;
    }

    if (id === 'novo') {
        const nick = tr.querySelector('input[data-field="nick"]').value;
        const funcao = tr.querySelector('input[data-field="funcao"]').value;

        if (nick.trim() !== '' || funcao.trim() !== '') {
            try {
                await db.collection(COLECAO_ESCALAS).add({
                    tipo: tipo, 
                    ordem: tr.querySelector('input[data-field="ordem"]').value, 
                    prazo: tr.querySelector('input[data-field="prazo"]').value, 
                    nick: nick,
                    funcao: funcao, 
                    status: 'Pendente',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                mostrarToast('Linha adicionada com sucesso!', 'success');
            } catch (error) { console.error(error); }
        }
    } else {
        try {
            await db.collection(COLECAO_ESCALAS).doc(id).update({ [field]: value });
        } catch (error) { console.error(error); }
    }
}

window.desfazerConclusao = async function(id) {
    if (confirm("Deseja reverter o status deste registro?")) {
        try {
            await db.collection(COLECAO_ESCALAS).doc(id).update({
                status: 'Pendente',
                comprovacaoUrl: firebase.firestore.FieldValue.delete(), 
                comentariosAdicionais: firebase.firestore.FieldValue.delete()
            });
            mostrarToast('Status revertido para pendente.', 'info');
        } catch (error) { console.error(error); }
    }
}

window.excluirRegistro = async function (id) {
    if (confirm("Tem certeza que deseja apagar essa linha permanentemente?")) {
        try {
            await db.collection(COLECAO_ESCALAS).doc(id).delete();
            mostrarToast('Linha removida.', 'success');
        } catch (error) { console.error(error); }
    }
}

// RESTANTE DOS MODAIS (Links e Formulários da Tabela)
function configurarFiltrosBusca() {
    document.getElementById('search-nick').addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(linha => {
            if (linha.dataset.id === 'novo') return; 
            const nickInput = linha.querySelector('[data-field="nick"]');
            if(nickInput) linha.style.display = nickInput.value.toLowerCase().includes(termo) ? '' : 'none';
        });
    });

    const botoes = document.querySelectorAll('.filter-btn');
    botoes.forEach(btn => {
        if (btn.id === 'open-links-modal-btn') return; 
        btn.addEventListener('click', (e) => {
            botoes.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const f = e.currentTarget.dataset.filter;
            ['analistas', 'promotores', 'docentes'].forEach(secao => {
                document.getElementById(secao + '-section').style.display = (f === 'todos' || f === secao) ? 'block' : 'none';
            });
        });
    });
}

function configurarModaisGerais() {
    document.getElementById('open-links-modal-btn').addEventListener('click', () => document.getElementById('links-modal').classList.remove('hidden'));
    document.getElementById('close-links-modal-btn').addEventListener('click', () => document.getElementById('links-modal').classList.add('hidden'));

    const formModal = document.getElementById('form-modal');
    window.abrirModalFormulario = function(idDocumento, acao, ordem, nick) {
        formModal.classList.remove('hidden');
        document.getElementById('form-action-type').value = acao;
        document.getElementById('form-ordem').value = ordem;
        document.getElementById('form-nick').value = nick;
        document.querySelector('#form-modal h3').innerHTML = `<i class="fas ${acao === 'Postar' ? 'fa-upload' : 'fa-exclamation-triangle'}"></i> ${acao} Ação`;
        document.getElementById('modal-form').dataset.docId = idDocumento;
    };
    document.getElementById('close-modal-btn').addEventListener('click', () => formModal.classList.add('hidden'));

    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = e.target.dataset.docId;
        const btn = document.getElementById('submit-form-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        try {
            await db.collection(COLECAO_ESCALAS).doc(id).update({
                comprovacaoUrl: document.getElementById('form-comprovacao').value,
                comentariosAdicionais: document.getElementById('form-comentarios').value,
                status: 'Concluído'
            });
            formModal.classList.add('hidden');
            e.target.reset(); 
            mostrarToast('Registro enviado com sucesso!', 'success');
        } catch (error) { mostrarToast('Erro ao enviar registro.', 'error'); } 
        finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Registro'; }
    });
}

function mostrarToast(msg, tipo) {
    const c = document.getElementById('nexus-toast-container');
    const t = document.createElement('div');
    t.className = `nexus-toast ${tipo}`;
    t.innerHTML = `<i class="fas ${tipo==='success'?'fa-check-circle':(tipo==='error'?'fa-exclamation-circle':'fa-info-circle')}"></i> <span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, 3000);
}

window.abrirConfirmacaoBackup = (tipo) => {
    const o = document.getElementById('nexus-confirm-overlay');
    document.getElementById('nexus-confirm-msg').innerText = `Confirmar o backup da escala de ${tipo}? Os dados atuais serão salvos no histórico e a tabela será zerada.`;
    o.classList.add('show');
    document.getElementById('nexus-confirm-ok').onclick = () => { o.classList.remove('show'); executarBackupEscala(tipo); };
    document.getElementById('nexus-confirm-cancel').onclick = () => o.classList.remove('show');
};