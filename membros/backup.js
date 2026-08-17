// Arquivo: /membros/perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // Assume que 'db' e 'auth' (Firebase) já existem e foram iniciados no global.js
    console.log("✅ perfil.js carregado com sucesso.");

    // ======================================================
    // 1. FUNÇÕES AUXILIARES (CÁLCULOS E FORMATAÇÃO)
    // ======================================================

    function calcularDiasTotais(dataString) {
        if (!dataString) return '0';
        const dataEntrada = new Date(dataString + "T00:00:00");
        const hoje = new Date();
        const diffTime = Math.abs(hoje - dataEntrada);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays;
    }

    function formatarAniversario(dataString) {
        if (!dataString) return '--/--';
        const partes = dataString.split('-'); 
        if (partes.length === 3) {
            const dia = partes[2];
            const mesIndex = parseInt(partes[1]) - 1; 
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const nomeMes = meses[mesIndex];
            if (nomeMes) return `${dia} ${nomeMes}`;
        }
        return dataString;
    }

    function getIconeTimeline(titulo) {
        const t = titulo.toLowerCase();
        if (t.includes('expulsão') || t.includes('demissão')) return 'fa-skull-crossbones';
        if (t.includes('promoção') || t.includes('contratação')) return 'fa-star';
        if (t.includes('advertência')) return 'fa-exclamation-triangle';
        if (t.includes('graduação') || t.includes('curso')) return 'fa-graduation-cap';
        if (t.includes('proposta') || t.includes('projeto')) return 'fa-file-lines';
        return 'fa-circle'; 
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // ======================================================
    // 2. LÓGICA DE RELACIONAMENTOS (VISUALIZAÇÃO)
    // ======================================================

    function gerarHTMLRelacionamentos(listaRels) {
        const container = document.getElementById('lista-relacionamentos');
        if (!container) return;

        if (!listaRels || listaRels.length === 0) {
            container.innerHTML = '<p style="font-size: 12px; text-align:center; color:#ccc; margin-top:10px;">Nenhum relacionamento.</p>';
            return;
        }

        const loves = listaRels.filter(r => r.tipo === 'love');
        const likes = listaRels.filter(r => r.tipo === 'like');
        const hates = listaRels.filter(r => r.tipo === 'hate');

        let html = '';

        const criarLinha = (tipo, arrayPessoas) => {
            if (arrayPessoas.length === 0) return '';
            const classeBadge = `badge-${tipo}`;
            const icone = tipo === 'love' ? 'fa-heart' : (tipo === 'like' ? 'fa-face-smile' : 'fa-skull');
            const principal = arrayPessoas[0].nick;
            const outrosCount = arrayPessoas.length - 1;
            const textoOutros = outrosCount > 0 ? `<span class="others">e ${outrosCount} outros</span>` : '';
            const linkPerfil = `perfil.html?nick=${principal}`; 

            return `
            <div class="rel-row">
                <div class="rel-badge ${classeBadge}">
                    <i class="fa-solid ${icone}"></i>
                </div>
                <div class="rel-text">
                    <a href="${linkPerfil}">${principal}</a> ${textoOutros}
                </div>
            </div>`;
        };

        html += criarLinha('love', loves);
        html += criarLinha('like', likes);
        html += criarLinha('hate', hates);
        container.innerHTML = html;
    }

    // ======================================================
    // 3. BUSCA E RENDERIZAÇÃO DO PERFIL
    // ======================================================

    async function carregarPerfilPeloNick(nickname) {
        console.log(`🔎 Buscando dados para: ${nickname}`);
        
        let uid = null;
        let userData = null;

        try {
            // --- TENTATIVA 1: Busca pelo ID normal (lowercase) ---
            // Ex: "amy.love.girl"
            let docRef = await db.collection('nicknames').doc(nickname.toLowerCase()).get();
            
            if (docRef.exists) {
                console.log("✅ Encontrado via Nickname normal.");
                uid = docRef.data().uid;
            } 
            else {
                // --- TENTATIVA 2: Busca pelo ID em Base64 ---
                // O código estranho na imagem é Base64. A função btoa() faz essa conversão.
                try {
                    const encodedNick = btoa(nickname); // Ex: "Gabriel" vira "R2FicmllbA=="
                    console.log(`⚠️ Tentando via Base64: ${encodedNick}`);
                    
                    docRef = await db.collection('nicknames').doc(encodedNick).get();
                    
                    if (docRef.exists) {
                        console.log("✅ Encontrado via Base64.");
                        uid = docRef.data().uid;
                    }
                } catch (e) {
                    console.log("Ignorando erro de Base64.");
                }
            }

            // Se achamos o UID nas tentativas acima, buscamos os dados do usuário
            if (uid) {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                }
            } 
            // --- TENTATIVA 3: Busca Direta na coleção 'users' (Plano C) ---
            // Se as tabelas de nickname falharem, procura onde o campo 'name' é igual ao nick
            else {
                console.log("⚠️ Nickname map falhou. Tentando busca direta em 'users'...");
                const querySnapshot = await db.collection('users').where('name', '==', nickname).get();
                
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    uid = doc.id;
                    userData = doc.data();
                    console.log("✅ Encontrado via Busca Direta.");
                }
            }

            // RESULTADO FINAL
            if (uid && userData) {
                renderizarPerfil({ uid: uid, ...userData });
            } else {
                // Última chance: Verifica se o "nickname" passado na URL já é o UID
                // Às vezes clicamos num link que passa o UID direto
                const userPorUid = await db.collection('users').doc(nickname).get();
                if(userPorUid.exists) {
                     renderizarPerfil({ uid: nickname, ...userPorUid.data() });
                } else {
                    alert("Usuário não encontrado em nenhuma lista!");
                }
            }

        } catch (error) {
            console.error("Erro fatal ao buscar perfil:", error);
        }
    }

    function renderizarPerfil(data) {
        // A. Dados Básicos
        const nick = data.name || 'Desconhecido';
        const nameEl = document.getElementById('profile-name');
        if(nameEl) nameEl.textContent = nick;

        const elFrase = document.getElementById('txt-frase');
        if(elFrase) elFrase.textContent = data.frase ? `"${data.frase}"` : '"Sem frase definida."';

        const avatarEl = document.querySelector('.avatar-card img');
        if(avatarEl) {
            const avatarUrl = data.imageUrl || `http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${nick}&action=wav&direction=3&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
            avatarEl.src = avatarUrl;
        }

        // B. Estatísticas
        setText('info-estado', data.status || 'Offline'); 
        setText('info-cargo', data.cargo || 'Membro');
        setText('info-aniversario', formatarAniversario(data.dob)); 
        setText('info-dias-cargo', calcularDiasTotais(data.dataEntrada || data.dataPromocao)); 
        setText('info-propostas', data.propostas || '0');

        // C. Grupos
        setText('info-spp', data.spp || 'Não Membro');
        setText('info-da', data.da || 'Não Membro');
        setText('info-cdc', data.cdc || 'Não Membro');

        // D. Outros
        gerarHTMLRelacionamentos(data.relacionamentos || []);
        if (data.uid) carregarTimeline(data.uid);

        // E. Permissão de Edição
        if (data.uid) verificarPermissaoEdicao(data.uid);
    }

    // ======================================================
    // 4. TIMELINE (CORRIGIDA)
    // ======================================================

    async function carregarTimeline(uid) {
        const container = document.querySelector('.timeline');
        if (!container) return;
        
        container.innerHTML = '<div class="timeline-item"><p>Carregando histórico...</p></div>';
        
        try {
            const snapshot = await db.collection('users').doc(uid)
                                     .collection('historico')
                                     .orderBy('timestamp', 'desc')
                                     .limit(10)
                                     .get();
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="timeline-item"><p>Nenhum registro encontrado.</p></div>';
                return;
            }
            
            let html = '';
            
            snapshot.forEach(doc => {
                const item = doc.data();
                const dataObj = item.timestamp ? item.timestamp.toDate() : new Date();
                
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                                      ' ' + 
                                      dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const icone = getIconeTimeline(item.titulo || '');
                
                // CORREÇÃO AQUI: Verifica se autor é objeto e pega o .nome, ou se é string, ou usa Sistema
                const autor = item.autor?.nome || item.autor || 'Sistema';
                
                html += `
                <div class="timeline-item">
                    <div class="icon-wrapper"><i class="fa-solid ${icone}"></i></div>
                    <h4>${item.titulo}</h4>
                    <p class="date">${dataFormatada} por ${autor}</p>
                    <p class="description">${item.descricao || item.conteudo || ''}</p>
                </div>`;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error(error);
            container.innerHTML = '<p>Erro ao carregar timeline.</p>';
        }
    }

    // ======================================================
    // 5. SISTEMA DE EDIÇÃO (MODAIS)
    // ======================================================

    // Variáveis e Helpers dos Modais
    let currentEditingUid = null;

    // Torna a função global para o HTML poder chamar no onclick="fecharModal()"
    window.fecharModal = function() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    function abrirModalFrase() {
        const fraseAtual = document.getElementById('txt-frase').textContent.replace(/"/g, '');
        document.getElementById('input-nova-frase').value = fraseAtual;
        
        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('modal-frase').style.display = 'block';
        document.getElementById('modal-relacionamentos').style.display = 'none';
    }

    async function abrirModalRelacionamentos(uid) {
        currentEditingUid = uid;
        document.getElementById('input-rel-nick').value = '';
        await carregarListaExclusao(uid);

        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('modal-frase').style.display = 'none';
        document.getElementById('modal-relacionamentos').style.display = 'block';
    }

    // --- Salvar Frase ---
    async function salvarFraseNoFirebase(uid) {
        const novaFrase = document.getElementById('input-nova-frase').value;
        const btnSalvar = document.getElementById('btn-salvar-frase');
        
        if (novaFrase.trim() === "") { alert("A frase não pode estar vazia."); return; }
        
        btnSalvar.textContent = "Salvando..."; 
        btnSalvar.disabled = true;

        try {
            await db.collection('users').doc(uid).update({ frase: novaFrase });
            document.getElementById('txt-frase').textContent = `"${novaFrase}"`;
            window.fecharModal();
        } catch (error) {
            console.error("Erro ao salvar frase:", error);
            alert("Erro ao salvar frase.");
        } finally {
            btnSalvar.textContent = "Salvar Frase"; 
            btnSalvar.disabled = false;
        }
    }

    // --- Relacionamentos (Add/Del) ---
    async function getRelacionamentosAtuais(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.data().relacionamentos || [];
    }

    async function adicionarRelacionamento() {
        if(!currentEditingUid) return;
        const nickInput = document.getElementById('input-rel-nick');
        const tipoInput = document.getElementById('input-rel-tipo');
        const btnAdd = document.getElementById('btn-add-rel');

        const novoNick = nickInput.value.trim();
        const novoTipo = tipoInput.value;

        if(!novoNick) { alert("Digite o nick do usuário."); return; }

        btnAdd.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; 
        btnAdd.disabled = true;

        try {
            const userRef = db.collection('users').doc(currentEditingUid);
            let relsAtuais = await getRelacionamentosAtuais(currentEditingUid);

            const existe = relsAtuais.some(r => r.nick.toLowerCase() === novoNick.toLowerCase());
            if(existe) { 
                alert("Este usuário já está na sua lista."); 
                btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar'; 
                btnAdd.disabled = false; return; 
            }

            relsAtuais.push({ nick: novoNick, tipo: novoTipo });
            await userRef.update({ relacionamentos: relsAtuais });
            
            gerarHTMLRelacionamentos(relsAtuais);
            await carregarListaExclusao(currentEditingUid);
            nickInput.value = ''; 

        } catch (error) {
            console.error(error); alert("Erro ao adicionar.");
        } finally {
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar'; 
            btnAdd.disabled = false;
        }
    }

    async function carregarListaExclusao(uid) {
        const listaEl = document.getElementById('modal-lista-rels');
        listaEl.innerHTML = '<li style="justify-content:center;">Carregando...</li>';
        const relsAtuais = await getRelacionamentosAtuais(uid);
        listaEl.innerHTML = '';

        if(relsAtuais.length === 0) {
             listaEl.innerHTML = '<li style="justify-content:center; color:#aaa;">Nenhum relacionamento para excluir.</li>';
             return;
        }

        relsAtuais.forEach((rel, index) => {
            const li = document.createElement('li');
            const iconClass = rel.tipo === 'love' ? 'fa-heart' : (rel.tipo === 'like' ? 'fa-face-smile' : 'fa-skull');
            li.innerHTML = `
                <span class="rel-badge badge-${rel.tipo}"><i class="fa-solid ${iconClass}"></i></span>
                <span class="rel-name">${rel.nick}</span>
            `;
            const deleteBtn = document.createElement('i');
            deleteBtn.className = 'fa-solid fa-trash delete-btn';
            deleteBtn.onclick = () => deletarRelacionamento(index);
            li.appendChild(deleteBtn);
            listaEl.appendChild(li);
        });
    }

    async function deletarRelacionamento(indexToDelete) {
        if(!currentEditingUid || !confirm("Tem certeza que deseja remover este relacionamento?")) return;
        try {
            const userRef = db.collection('users').doc(currentEditingUid);
            let relsAtuais = await getRelacionamentosAtuais(currentEditingUid);
            relsAtuais.splice(indexToDelete, 1);
            await userRef.update({ relacionamentos: relsAtuais });
            gerarHTMLRelacionamentos(relsAtuais);
            await carregarListaExclusao(currentEditingUid);
        } catch (error) {
            console.error(error); alert("Erro ao excluir.");
        }
    }

    // --- SETUP PRINCIPAL ---
    function verificarPermissaoEdicao(uidDoPerfil) {
        auth.onAuthStateChanged(user => {
            if (user && user.uid === uidDoPerfil) {
                const btnFrase = document.getElementById('btn-edit-frase');
                if(btnFrase) {
                    btnFrase.style.display = 'block';
                    btnFrase.onclick = abrirModalFrase;
                }
                document.getElementById('btn-salvar-frase').onclick = () => salvarFraseNoFirebase(uidDoPerfil);

                const btnRel = document.getElementById('btn-edit-rel');
                if(btnRel) {
                    btnRel.style.display = 'inline-block';
                    btnRel.onclick = () => abrirModalRelacionamentos(uidDoPerfil);
                }
                document.getElementById('btn-add-rel').onclick = adicionarRelacionamento;

            } else {
                if(document.getElementById('btn-edit-frase')) document.getElementById('btn-edit-frase').style.display = 'none';
                if(document.getElementById('btn-edit-rel')) document.getElementById('btn-edit-rel').style.display = 'none';
            }
        });
    }

    // ======================================================
    // 6. INICIALIZAÇÃO VIA URL
    // ======================================================
    function detectarUsuario() {
        const params = new URLSearchParams(window.location.search);
        const nickViaParam = params.get('nick'); 
        if (nickViaParam) {
            carregarPerfilPeloNick(nickViaParam);
            return;
        }
        const path = window.location.pathname;
        const parts = path.split('/');
        if (parts.length > 2 && (parts[1].toLowerCase() === 'membros' || parts[1].toLowerCase() === 'perfil')) {
            const nickURL = decodeURIComponent(parts[2]);
            if(nickURL) {
                carregarPerfilPeloNick(nickURL);
                return;
            }
        }
        console.warn('Nenhum nick detectado na URL.');
    }

    detectarUsuario();
});