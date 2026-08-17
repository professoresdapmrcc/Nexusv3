document.addEventListener('DOMContentLoaded', () => {
    
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

    // SETUP DE SEGURANÇA (FIREBASE APP CHECK)
    if (typeof firebase !== 'undefined' && firebase.appCheck) {
        const appCheck = firebase.appCheck();
        appCheck.activate('SUA_CHAVE_PUBLICA_DO_RECAPTCHA_V3', true);
    }

    const tabela = document.getElementById('tabela-membros');
    const totalEl = document.getElementById('total-membros');
    const searchInput = document.getElementById('search-input');
    const filterCargo = document.getElementById('filter-cargo');
    const btnExportar = document.getElementById('btn-export-csv');

    let allUsers = []; 
    let debounceTimer;

    const coresAcesso = {
        'Líder': '#9013fe',
        'Vice-Líder': '#be29ec',
        'Conselheiro(a)': '#d896ff',
        'Estagiário(a)': '#4ade80',
        'Graduador(a)': '#f59e0b',
        'Coordenador(a)': '#3b82f6',
        'Professor(a)': '#9494a0'
    };

    const prioridadeCargos = {
        'Líder': 1, 'Vice-Líder': 2, 'Conselheiro(a)': 3,
        'Estagiário(a)': 4, 'Graduador(a)': 5, 'Coordenador(a)': 6, 'Professor(a)': 7
    };

    // 1. OUVINTE DO FIRESTORE EM TEMPO REAL
    if (typeof db !== 'undefined') {
        db.collection('users').onSnapshot(snapshot => { 
            allUsers = []; 
            snapshot.forEach(doc => {
                // O UID do documento precisa prevalecer sobre o campo público `id`
                // (ex.: "itach-ban") salvo dentro do perfil.
                allUsers.push({ ...doc.data(), id: doc.id });
            });
            totalEl.textContent = allUsers.length;
            applyFilters();
        }, error => {
            console.error("Erro ao buscar membros:", error);
            tabela.innerHTML = '<tr><td colspan="8" class="text-center">Erro ao carregar dados.</td></tr>';
        });
    }

    // 2. EVENTOS DE FILTRO
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    filterCargo.addEventListener('change', applyFilters);

    function obterUsuariosFiltrados() {
        const termoBusca = searchInput.value.toLowerCase();
        const cargoSelecionado = filterCargo.value;

        let filtrados = allUsers.filter(user => {
            const nomeMatch = user.name && user.name.toLowerCase().includes(termoBusca);
            const cargoMatch = cargoSelecionado === "" || user.cargo === cargoSelecionado;
            return nomeMatch && cargoMatch;
        });

        filtrados.sort((a, b) => {
            const p1 = prioridadeCargos[a.cargo] || 100;
            const p2 = prioridadeCargos[b.cargo] || 100;
            const statusA = a.status === 'Inativo' ? 999 : 0;
            const statusB = b.status === 'Inativo' ? 999 : 0;
            return (p1 + statusA) - (p2 + statusB);
        });

        return filtrados;
    }

    function applyFilters() {
        renderTable(obterUsuariosFiltrados());
    }

    // 3. RENDERIZAÇÃO DA TABELA
    function renderTable(listaUsuarios) {
        tabela.innerHTML = '';

        if (listaUsuarios.length === 0) {
            tabela.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--text-muted);">Nenhum membro encontrado.</td></tr>';
            return;
        }

        listaUsuarios.forEach(user => {
            const tr = document.createElement('tr');
            const isAtivo = user.status !== 'Inativo';
            const statusStyle = isAtivo 
                ? 'background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2);' 
                : 'background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2);';
            
            const cargoLimpo = user.cargo ? user.cargo.replace('Ex-', '') : 'Membro';
            const corMembro = coresAcesso[cargoLimpo] || 'transparent';
            const isOnline = user.isOnline ? 'status-online' : 'status-offline';

            const checkIcon = '<i class="fas fa-check-circle" style="color: var(--primary); font-size: 1.1rem;"></i>';
            const dashIcon = '<span style="color: var(--text-muted); opacity: 0.3;">&mdash;</span>';

            const btnStatus = isAtivo
                ? `<button class="btn-action delete" onclick="alternarStatus('${user.id}', 'inativar')" title="Inativar/Desligar"><i class="fas fa-user-times"></i></button>`
                : `<button class="btn-action activate" onclick="alternarStatus('${user.id}', 'ativar')" title="Reativar Membro"><i class="fas fa-user-check"></i></button>`;

            tr.innerHTML = `
                <td style="border-left: 4px solid ${corMembro};">
                    <span class="status-dot ${isOnline}"></span>
                    <span style="font-weight: 600; color: #fff; text-shadow: 0 0 8px ${corMembro}80;">${user.name}</span>
                </td>
                <td style="color: var(--text-main);">${user.cargo || 'Membro'}</td>
                <td class="text-center"><span class="user-tag" style="${statusStyle}">${user.status || 'Indefinido'}</span></td>
                <td class="text-center">${(user.spp && !user.spp.startsWith('Ex-')) ? checkIcon : dashIcon}</td>
                <td class="text-center">${(user.cdc && !user.cdc.startsWith('Ex-')) ? checkIcon : dashIcon}</td>
                <td class="text-center">${(user.da && !user.da.startsWith('Ex-')) ? checkIcon : dashIcon}</td>
                <td class="text-center">${user.role === 'admin' ? checkIcon : dashIcon}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action edit" onclick="editarMembroCompleto('${user.id}')" title="Editar Perfil"><i class="fas fa-edit"></i></button>
                        ${btnStatus}
                    </div>
                </td>
            `;
            tabela.appendChild(tr);
        });
    }

    // 4. FUNÇÃO EDITAR COMPLETO (TODOS OS CAMPOS DO FIREBASE)
    window.editarMembroCompleto = (id) => {
        const user = allUsers.find(u => u.id === id);
        if(!user) return;

        Swal.fire({
            title: 'Editar Perfil NEXUS',
            width: '800px', 
            html: `
                <div class="swal-edit-grid" style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">
                    <div class="swal-form-group">
                        <label>Nickname</label>
                        <input id="edit-nick" class="swal2-input" value="${user.name || ''}">
                    </div>
                    <div class="swal-form-group">
                        <label>Acesso (Role)</label>
                        <select id="edit-role" class="swal2-select">
                            <option value="membro" ${user.role !== 'admin' ? 'selected' : ''}>Membro</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="swal-form-group">
                        <label>Cargo</label>
                        <input id="edit-cargo" class="swal2-input" value="${user.cargo || ''}">
                    </div>
                    <div class="swal-form-group">
                        <label>Status</label>
                        <select id="edit-status" class="swal2-select">
                            <option value="Ativo" ${user.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Inativo" ${user.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                    <div class="swal-form-group">
                        <label>SPP</label>
                        <input id="edit-spp" class="swal2-input" value="${user.spp || ''}">
                    </div>
                    <div class="swal-form-group">
                        <label>CDC</label>
                        <input id="edit-cdc" class="swal2-input" value="${user.cdc || ''}">
                    </div>
                    <div class="swal-form-group">
                        <label>DA</label>
                        <input id="edit-da" class="swal2-input" value="${user.da || ''}">
                    </div>
                    <div class="swal-form-group">
                        <label>Data de Entrada</label>
                        <input id="edit-entrada" type="date" class="swal2-input" value="${user.dataEntrada || ''}">
                    </div>
                    <div class="swal-form-group full-width">
                        <label>Data de Nascimento (DOB)</label>
                        <input id="edit-dob" type="date" class="swal2-input" value="${user.dob || ''}">
                    </div>
                    <div class="swal-form-group full-width">
                        <label>E-mail</label>
                        <input id="edit-email" type="email" class="swal2-input" value="${user.email || ''}">
                    </div>
                    <div class="swal-form-group full-width">
                        <label>Frase (Perfil)</label>
                        <input id="edit-frase" class="swal2-input" value="${user.frase || ''}">
                    </div>
                    <div class="swal-form-group full-width">
                        <label>URL da Imagem (Avatar / imageUrl)</label>
                        <input id="edit-imageurl" class="swal2-input" value="${user.imageUrl || ''}" placeholder="https://...">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-save"></i> Salvar no Firebase',
            cancelButtonText: 'Cancelar',
            background: '#16161a',
            color: '#fff',
            confirmButtonColor: '#be29ec',
            preConfirm: () => {
                return {
                    name: document.getElementById('edit-nick').value,
                    role: document.getElementById('edit-role').value,
                    cargo: document.getElementById('edit-cargo').value,
                    status: document.getElementById('edit-status').value,
                    spp: document.getElementById('edit-spp').value,
                    cdc: document.getElementById('edit-cdc').value,
                    da: document.getElementById('edit-da').value,
                    dataEntrada: document.getElementById('edit-entrada').value,
                    dob: document.getElementById('edit-dob').value,
                    email: document.getElementById('edit-email').value,
                    frase: document.getElementById('edit-frase').value,
                    imageUrl: document.getElementById('edit-imageurl').value
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                db.collection('users').doc(id).update(result.value)
                .then(() => Swal.fire({title: 'Sucesso!', text: 'As informações foram salvas.', icon: 'success', background: '#16161a', color: '#fff'}))
                .catch(err => Swal.fire({title: 'Erro!', text: err.message, icon: 'error', background: '#16161a', color: '#fff'}));
            }
        });
    };

    // 5. ALTERNAR STATUS COM REGRA DO "EX-"
    window.alternarStatus = (id, acao) => {
        const user = allUsers.find(u => u.id === id);
        if(!user) return;

        const isAtivando = acao === 'ativar';
        let novoCargo = user.cargo || '';

        if (!isAtivando) {
            if (!novoCargo.startsWith('Ex-')) novoCargo = 'Ex-' + novoCargo;
        } else {
            novoCargo = novoCargo.replace('Ex-', '');
        }

        Swal.fire({
            title: isAtivando ? 'Reativar?' : 'Inativar?',
            text: isAtivando ? `O cargo voltará para ${novoCargo}` : `O cargo mudará para ${novoCargo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isAtivando ? '#10b981' : '#ef4444',
            background: '#16161a',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                db.collection('users').doc(id).update({
                    status: isAtivando ? 'Ativo' : 'Inativo',
                    cargo: novoCargo
                })
                .then(() => Swal.fire({title: 'Atualizado!', icon: 'success', background: '#16161a', color: '#fff'}))
                .catch(err => Swal.fire({title: 'Erro!', text: err.message, icon: 'error', background: '#16161a', color: '#fff'}));
            }
        });
    };

});
