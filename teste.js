document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ perfil.js carregado: Layout melhorado + Modal Full de Fotos.");

    // ==========================================
    // CONSTANTES
    // ==========================================
    const DEFAULT_BG_TINT = '#351e49';
    const DEFAULT_CARD    = '#821F88';

    let currentViewPhotoId  = null;
    let commentsUnsubscribe = null;

    // ==========================================
    // 1. FUNÇÕES AUXILIARES
    // ==========================================
    function calcularDiasTotais(dataString) {
        if (!dataString) return '0';
        const dataEntrada = new Date(dataString + "T00:00:00");
        const hoje = new Date();
        return Math.ceil(Math.abs(hoje - dataEntrada) / (1000 * 60 * 60 * 24));
    }

    function formatarAniversario(dataString) {
        if (!dataString) return '--/--';
        const partes = dataString.split('-');
        if (partes.length === 3) {
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            return `${partes[2]} ${meses[parseInt(partes[1]) - 1]}`;
        }
        return dataString;
    }

    function getIconeTimeline(titulo) {
        const t = titulo.toLowerCase();
        if (t.includes('expulsão') || t.includes('demissão'))   return 'fa-skull-crossbones';
        if (t.includes('promoção') || t.includes('contratação')) return 'fa-star';
        if (t.includes('advertência'))                           return 'fa-exclamation-triangle';
        if (t.includes('graduação')  || t.includes('curso'))     return 'fa-graduation-cap';
        if (t.includes('proposta')   || t.includes('projeto'))   return 'fa-file-lines';
        return 'fa-circle';
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // ==========================================
    // 2. SISTEMA DE CORES
    // ==========================================
    let alvoDaPintura = null;

    function aplicarTemaSalvo(temaData) {
        if (temaData && temaData.pageBackground) {
            document.documentElement.style.setProperty('--page-bg-color', temaData.pageBackground);
        } else {
            document.documentElement.style.setProperty('--page-bg-color', DEFAULT_BG_TINT);
        }
        if (temaData && temaData.cards) {
            for (const [cardId, color] of Object.entries(temaData.cards)) {
                const element = document.getElementById(cardId);
                if (element) element.style.backgroundColor = color;
            }
        }
    }

    window.selecionarCor = async function(cor) {
        if (!alvoDaPintura) return;

        if (alvoDaPintura === 'background') {
            document.documentElement.style.setProperty('--page-bg-color', cor);
            if (currentEditingUid) {
                try {
                    await window.db.collection('users').doc(currentEditingUid).set(
                        { tema: { pageBackground: cor } }, { merge: true }
                    );
                } catch (e) { console.error(e); }
            }
        } else {
            const cardElement = document.getElementById(alvoDaPintura);
            if (cardElement) {
                cardElement.style.backgroundColor = cor;
                if (currentEditingUid) {
                    try {
                        const updateData = {};
                        updateData[`tema.cards.${alvoDaPintura}`] = cor;
                        await window.db.collection('users').doc(currentEditingUid).update(updateData);
                    } catch (err) {
                        const payload = { tema: { cards: {} } };
                        payload.tema.cards[alvoDaPintura] = cor;
                        await window.db.collection('users').doc(currentEditingUid).set(payload, { merge: true });
                    }
                }
            }
        }
        fecharPalette();
    };

    window.resetarCorAlvo = async function() {
        if (!alvoDaPintura) return;

        if (alvoDaPintura === 'background') {
            document.documentElement.style.setProperty('--page-bg-color', DEFAULT_BG_TINT);
            if (currentEditingUid) {
                try {
                    await window.db.collection('users').doc(currentEditingUid).set(
                        { tema: { pageBackground: DEFAULT_BG_TINT } }, { merge: true }
                    );
                } catch(e) { console.error(e); }
            }
        } else {
            const el = document.getElementById(alvoDaPintura);
            if (el) el.style.backgroundColor = DEFAULT_CARD;
            if (currentEditingUid) {
                try {
                    const updateData = {};
                    updateData[`tema.cards.${alvoDaPintura}`] = DEFAULT_CARD;
                    await window.db.collection('users').doc(currentEditingUid).update(updateData);
                } catch(e) { /* silencioso */ }
            }
        }
        fecharPalette();
    };

    window.fecharPalette = function() {
        document.getElementById('modal-palette').style.display = 'none';
        alvoDaPintura = null;
    };

    window.ativarNativo = function() {
        const nativeInput = document.getElementById('native-picker-fallback');
        if (nativeInput) nativeInput.oninput = function() { selecionarCor(nativeInput.value); };
    };

    window.abrirModalTema = function() {
        alvoDaPintura = 'background';
        document.getElementById('modal-palette').style.display = 'flex';
    };

    function inicializarPinturaIndividual() {
        const cards = document.querySelectorAll('.card[id], #card-info');
        cards.forEach(card => {
            if (card.querySelector('.card-paint-btn')) return;

            const btn = document.createElement('div');
            btn.className = 'card-paint-btn';
            btn.innerHTML = '<i class="fa-solid fa-fill-drip"></i>';
            btn.title = "Alterar cor";

            if (card.id === 'card-info') {
                btn.style.position = 'absolute';
                btn.style.top = '10px';
                btn.style.right = '10px';
                const estiloComputado = window.getComputedStyle(card);
                if (estiloComputado.position === 'static') card.style.position = 'relative';
            }

            btn.onclick = (e) => {
                e.stopPropagation();
                alvoDaPintura = card.id;
                document.getElementById('modal-palette').style.display = 'flex';
            };
            card.appendChild(btn);
        });
    }

    // ==========================================
    // 3. MENÇÕES E TAGS (para modal de fotos)
    // ==========================================
    function parseMentions(text) {
        if (!text) return "";
        return text.replace(/@([a-zA-Z0-9_.\-:=?!]+)/g,
            '<a href="/membros/$1" class="mention-link" style="color:#d1b1ff;text-decoration:none;font-weight:bold;">$1</a>'
        );
    }

    function extractMentionsArray(text) {
        if (!text) return [];
        const mentionsMatch = text.match(/@([a-zA-Z0-9_.\-:=?!]+)/g);
        if (!mentionsMatch) return [];
        return [...new Set(mentionsMatch.map(m => m.replace('@', '')))];
    }

    async function getSilentUserId(nickname) {
        if (!nickname || !window.db) return null;
        try {
            const lowerNick = nickname.trim().toLowerCase();
            const normalDoc = await window.db.collection('nicknames').doc(lowerNick).get();
            if (normalDoc.exists) return normalDoc.data().uid;
            try {
                const encodedDoc = await window.db.collection('nicknames').doc(btoa(lowerNick)).get();
                if (encodedDoc.exists) return encodedDoc.data().uid;
            } catch(e) {}
        } catch (err) {}
        return null;
    }

    function generateTagsHTML(tagsArray) {
        if (!tagsArray || tagsArray.length === 0) return '';
        const mainText = tagsArray.length === 1
            ? `Com <span style="color:#d1b1ff;font-weight:bold;">${tagsArray[0]}</span>`
            : `Com <span style="color:#d1b1ff;font-weight:bold;">${tagsArray[0]}</span> e mais ${tagsArray.length - 1}`;
        return `<div style="font-size:0.78rem;color:#aaa;margin-top:4px;">${mainText}</div>`;
    }

    // ==========================================
    // 4. MINI MURAL — carregamento
    // ==========================================
    async function carregarMiniMural(uid, nickname) {
        const container = document.getElementById('mini-mural-grid');
        if (!container) return;

        try {
            const authorPromise = window.db.collection('muralPhotos').where('authorId', '==', uid).get();
            const taggedPromise = nickname
                ? window.db.collection('muralPhotos').where('taggedUsers', 'array-contains', nickname).get()
                : Promise.resolve({ docs: [] });

            const [authorSnapshot, taggedSnapshot] = await Promise.all([authorPromise, taggedPromise]);

            const photosMap = new Map();
            authorSnapshot.forEach(doc => photosMap.set(doc.id, { id: doc.id, ...doc.data() }));
            taggedSnapshot.forEach(doc => photosMap.set(doc.id, { id: doc.id, ...doc.data() }));

            let photos = Array.from(photosMap.values());

            if (photos.length === 0) {
                container.innerHTML = '<p style="font-size:12px;text-align:center;color:#ccc;grid-column:1/-1;">Nenhuma foto recente.</p>';
                return;
            }

            photos.sort((a, b) => {
                const tA = a.timestamp ? a.timestamp.toMillis() : 0;
                const tB = b.timestamp ? b.timestamp.toMillis() : 0;
                return tB - tA;
            });

            container.innerHTML = '';
            photos.slice(0, 9).forEach(photo => {
                const imgEl = document.createElement('img');
                imgEl.src = photo.imageUrl;
                imgEl.className = 'mini-photo-item';
                imgEl.title = "Clique para ver";

                const userLogado = firebase.auth().currentUser;
                const isLiked = userLogado && photo.likedBy && photo.likedBy.includes(userLogado.uid);

                imgEl.onclick = () => openPhotoViewModal(photo.id, photo, isLiked, photo.likeCount || 0);
                container.appendChild(imgEl);
            });

        } catch (error) {
            console.error("Erro ao carregar mini mural:", error);
            container.innerHTML = '<p style="font-size:12px;text-align:center;color:#ff5555;grid-column:1/-1;">Erro ao carregar imagens.</p>';
        }
    }

    // ==========================================
    // 5. MODAL FULL DE FOTO
    // ==========================================
    function openPhotoViewModal(photoId, photoData, isLiked, likeCount) {
        currentViewPhotoId = photoId;

        document.getElementById('viewModalImage').src = photoData.imageUrl;

        const authorLink = document.getElementById('viewModalAuthor');
        authorLink.textContent = photoData.authorUsername;
        authorLink.href = `/membros/${photoData.authorUsername}`;

        const authorImage = document.getElementById('viewModalAuthorImage');
        if (authorImage) {
            authorImage.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${photoData.authorUsername}&action=std&direction=2&head_direction=2&gesture=sml&size=m&headonly=1`;
        }

        document.getElementById('viewModalDesc').innerHTML  = parseMentions(photoData.description) || "";
        document.getElementById('viewModalTags').innerHTML  = generateTagsHTML(photoData.taggedUsers);

        const modalLikeBtn = document.getElementById('viewModalLikeBtn');
        modalLikeBtn.setAttribute('data-liked', isLiked ? 'true' : 'false');
        modalLikeBtn.onclick = (e) => handleLikeClick(photoId, e);

        const svg = modalLikeBtn.querySelector('svg');
        svg.setAttribute('fill',   isLiked ? '#ff4d6d' : 'transparent');
        svg.setAttribute('stroke', isLiked ? '#ff4d6d' : '#fff');
        modalLikeBtn.querySelector('.like-count').textContent = likeCount;

        document.getElementById('comment-input').value = '';

        const viewModal = document.getElementById('photoViewModal');
        viewModal.style.display = 'flex';
        viewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        loadComments(photoId);
    }

    window.closePhotoViewModal = function() {
        const viewModal = document.getElementById('photoViewModal');
        viewModal.style.display = 'none';
        viewModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        currentViewPhotoId = null;
        if (commentsUnsubscribe) {
            commentsUnsubscribe();
            commentsUnsubscribe = null;
        }
    };

    // Fechar modal de foto ao clicar no botão X ou fora
    const closeViewBtn = document.getElementById('close-view-modal-btn');
    if (closeViewBtn) closeViewBtn.addEventListener('click', closePhotoViewModal);

    const photoViewModal = document.getElementById('photoViewModal');
    if (photoViewModal) {
        photoViewModal.addEventListener('click', (e) => {
            if (e.target.id === 'photoViewModal') closePhotoViewModal();
        });
    }

    // ==========================================
    // 6. LIKES NO MODAL
    // ==========================================
    window.handleLikeClick = async (photoId, event) => {
        if (event) event.stopPropagation();

        const user = firebase.auth().currentUser;
        if (!user) {
            if (typeof showToast === 'function') showToast("Faça login para curtir.", "error");
            return;
        }

        const modalBtn = document.getElementById('viewModalLikeBtn');
        if (!modalBtn) return;

        const isCurrentlyLiked = modalBtn.getAttribute('data-liked') === 'true';
        const currentCount = parseInt(modalBtn.querySelector('.like-count').textContent) || 0;
        const newCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

        const svg = modalBtn.querySelector('svg');
        const countSpan = modalBtn.querySelector('.like-count');

        if (isCurrentlyLiked) {
            svg.setAttribute('fill',   'transparent');
            svg.setAttribute('stroke', '#ffffff');
            svg.style.transform = "scale(1)";
            countSpan.textContent = newCount;
            modalBtn.setAttribute('data-liked', 'false');
        } else {
            svg.setAttribute('fill',   '#ff4d6d');
            svg.setAttribute('stroke', '#ff4d6d');
            svg.style.transform = "scale(1.2)";
            setTimeout(() => { svg.style.transform = "scale(1)"; }, 200);
            countSpan.textContent = newCount;
            modalBtn.setAttribute('data-liked', 'true');
        }

        const photoRef = window.db.collection('muralPhotos').doc(photoId);
        try {
            await window.db.runTransaction(async (t) => {
                const doc = await t.get(photoRef);
                const data = doc.data();
                if (isCurrentlyLiked) {
                    t.update(photoRef, {
                        likedBy:   firebase.firestore.FieldValue.arrayRemove(user.uid),
                        likeCount: Math.max(0, (data.likeCount || 1) - 1)
                    });
                } else {
                    t.update(photoRef, {
                        likedBy:   firebase.firestore.FieldValue.arrayUnion(user.uid),
                        likeCount: (data.likeCount || 0) + 1
                    });
                }
            });
        } catch (e) { console.error("Erro Like:", e); }
    };

    // ==========================================
    // 7. COMENTÁRIOS NO MODAL
    // ==========================================
    function loadComments(photoId) {
        const commentsContainer = document.getElementById('viewModalComments');
        commentsContainer.innerHTML = '<div class="loading-comments">Carregando comentários...</div>';

        if (commentsUnsubscribe) commentsUnsubscribe();

        commentsUnsubscribe = window.db.collection('muralPhotos').doc(photoId)
            .collection('comments')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                commentsContainer.innerHTML = '';

                if (snapshot.empty) {
                    commentsContainer.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:20px;font-size:0.88rem;">Seja o primeiro a comentar!</div>';
                    return;
                }

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const formattedText = parseMentions(data.text);
                    commentsContainer.innerHTML += `
                        <div class="comment-item" style="display:flex;flex-direction:column;background:rgba(0,0,0,0.2);padding:11px;border-radius:8px;">
                            <a href="/membros/${data.authorUsername}" style="color:#d1b1ff;font-weight:bold;font-size:0.82rem;text-decoration:none;margin-bottom:3px;">${data.authorUsername}</a>
                            <span style="font-size:0.87rem;color:#fff;">${formattedText}</span>
                        </div>
                    `;
                });
                commentsContainer.scrollTop = commentsContainer.scrollHeight;
            });
    }

    // Form de comentário
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('comment-input');
            const text  = input.value.trim();

            if (!text || !currentViewPhotoId) return;

            const user = firebase.auth().currentUser;
            if (!user) {
                if (typeof showToast === 'function') showToast("Faça login para comentar.", "error");
                return;
            }

            let authorName = user.displayName || "Membro";
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().name) authorName = userDoc.data().name;
            } catch(err) {}

            const submitBtn = document.getElementById('send-comment-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '...';

            try {
                await window.db.collection('muralPhotos').doc(currentViewPhotoId).collection('comments').add({
                    text:           text,
                    authorId:       user.uid,
                    authorUsername: authorName,
                    timestamp:      firebase.firestore.FieldValue.serverTimestamp()
                });

                const mentionedUsers = extractMentionsArray(text);
                for (const taggedName of mentionedUsers) {
                    const uidDestino = await getSilentUserId(taggedName);
                    if (uidDestino) {
                        await window.db.collection('notificacoes').add({
                            destinatarioId: uidDestino,
                            titulo:         'Menção em comentário',
                            corpo:          `${authorName} mencionou você na foto.`,
                            icone:          'fa-comment-dots',
                            cor_icone:      '#ba4fc0',
                            link:           `/mural.html?photo=${currentViewPhotoId}`,
                            read:           false,
                            timestamp:      firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }

                input.value = '';
                if (typeof showToast === 'function') showToast("Comentário publicado!");

            } catch (err) {
                console.error("Erro ao publicar comentário", err);
                if (typeof showToast === 'function') showToast("Erro ao publicar comentário.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publicar';
                input.focus();
            }
        });
    }

    // ==========================================
    // 8. RENDERIZAÇÃO DO PERFIL
    // ==========================================
    async function carregarPerfilPeloNick(nickname) {
        try {
            let docRef = await window.db.collection('nicknames').doc(nickname.toLowerCase()).get();
            if (!docRef.exists) {
                try {
                    const encoded = btoa(nickname);
                    const docBase64 = await window.db.collection('nicknames').doc(encoded).get();
                    if (docBase64.exists) docRef = docBase64;
                } catch(e) {}
            }
            if (!docRef.exists) {
                const q = await window.db.collection('users').where('name', '==', nickname).get();
                if (!q.empty) { renderizarPerfil({ uid: q.docs[0].id, ...q.docs[0].data() }); return; }
                const userPorUid = await window.db.collection('users').doc(nickname).get();
                if (userPorUid.exists) { renderizarPerfil({ uid: nickname, ...userPorUid.data() }); return; }
                alert("Usuário não encontrado!");
                return;
            }
            const uid     = docRef.data().uid;
            const userDoc = await window.db.collection('users').doc(uid).get();
            if (userDoc.exists) renderizarPerfil({ uid, ...userDoc.data() });
        } catch (error) { console.error("Erro ao buscar perfil:", error); }
    }

    function renderizarPerfil(data) {
        aplicarTemaSalvo(data.tema);

        const nick = data.name || 'Desconhecido';
        document.title = nick;

        setText('profile-name', nick);

        const elFrase = document.getElementById('txt-frase');
        if (elFrase) elFrase.textContent = data.frase ? `"${data.frase}"` : '"#SOBERANIAROXA"';

        const avatarEl = document.querySelector('.avatar-card img');
        if (avatarEl) avatarEl.src = data.imageUrl
            || `http://www.habbo.com.br/habbo-imaging/avatarimage?&user=${nick}&action=wav&direction=3&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;

        setText('info-estado',     data.status   || 'Offline');
        setText('info-cargo',      data.cargo    || 'Membro');
        setText('info-aniversario', formatarAniversario(data.dob));
        setText('info-dias-cargo', calcularDiasTotais(data.dataEntrada || data.dataPromocao));
        setText('info-propostas',  data.propostas || '0');
        setText('info-spp',        data.spp  || 'Não Membro');
        setText('info-da',         data.da   || 'Não Membro');
        setText('info-cdc',        data.cdc  || 'Não Membro');

        gerarHTMLRelacionamentos(data.relacionamentos || []);

        if (data.uid) {
            carregarTimeline(data.uid);
            verificarPermissaoEdicao(data.uid);
            carregarMiniMural(data.uid, nick);
        }
    }

    // ==========================================
    // 9. RELACIONAMENTOS
    // ==========================================
    function gerarHTMLRelacionamentos(listaRels) {
        const container = document.getElementById('lista-relacionamentos');
        if (!container) return;
        if (!listaRels || listaRels.length === 0) {
            container.innerHTML = '<p style="font-size:12px;text-align:center;color:#ccc;">Nenhum relacionamento.</p>';
            return;
        }
        const loves = listaRels.filter(r => r.tipo === 'love');
        const likes = listaRels.filter(r => r.tipo === 'like');
        const hates = listaRels.filter(r => r.tipo === 'hate');

        const criarLinha = (tipo, arrayPessoas) => {
            if (arrayPessoas.length === 0) return '';
            const classeBadge  = `badge-${tipo}`;
            const icone        = tipo === 'love' ? 'fa-heart' : (tipo === 'like' ? 'fa-face-smile' : 'fa-skull');
            const principal    = arrayPessoas[0].nick;
            const outrosCount  = arrayPessoas.length - 1;
            const textoOutros  = outrosCount > 0 ? `<span class="others">e ${outrosCount} outros</span>` : '';
            return `<div class="rel-row"><div class="rel-badge ${classeBadge}"><i class="fa-solid ${icone}"></i></div><div class="rel-text"><a href="/membros/${principal}">${principal}</a> ${textoOutros}</div></div>`;
        };

        container.innerHTML = criarLinha('love', loves) + criarLinha('like', likes) + criarLinha('hate', hates);
    }

    // ==========================================
    // 10. TIMELINE
    // ==========================================
    async function carregarTimeline(uid) {
        const container = document.querySelector('.timeline');
        if (!container) return;
        container.innerHTML = '<div class="timeline-item"><p>Carregando histórico...</p></div>';
        try {
            const snapshot = await window.db.collection('users').doc(uid)
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
                const item        = doc.data();
                const dataObj     = item.timestamp ? item.timestamp.toDate() : new Date();
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    + ' ' + dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const icone  = getIconeTimeline(item.titulo || '');
                const autor  = item.autor?.nome || item.autor || 'Sistema';
                html += `<div class="timeline-item">
                    <div class="icon-wrapper"><i class="fa-solid ${icone}"></i></div>
                    <h4>${item.titulo}</h4>
                    <p class="date">${dataFormatada} por ${autor}</p>
                    <p class="description">${item.descricao || item.conteudo || ''}</p>
                </div>`;
            });
            container.innerHTML = html;

        } catch (error) {
            container.innerHTML = '<p>Erro ao carregar timeline.</p>';
        }
    }

    // ==========================================
    // 11. EDIÇÃO (MODAIS)
    // ==========================================
    let currentEditingUid = null;

    window.fecharModal = function() {
        document.getElementById('modal-overlay').style.display = 'none';
    };

    window.abrirModalFrase = function() {
        const fraseAtual = document.getElementById('txt-frase').textContent.replace(/"/g, '');
        document.getElementById('input-nova-frase').value = fraseAtual;
        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('modal-frase').style.display = 'block';
        document.getElementById('modal-relacionamentos').style.display = 'none';
        document.getElementById('modal-palette').style.display = 'none';
    };

    window.abrirModalRelacionamentos = async function(uid) {
        currentEditingUid = uid;
        document.getElementById('input-rel-nick').value = '';
        await carregarListaExclusao(uid);
        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('modal-frase').style.display = 'none';
        document.getElementById('modal-relacionamentos').style.display = 'block';
        document.getElementById('modal-palette').style.display = 'none';
    };

    async function salvarFraseNoFirebase(uid) {
        const novaFrase = document.getElementById('input-nova-frase').value;
        const btnSalvar = document.getElementById('btn-salvar-frase');
        if (novaFrase.trim() === "") { alert("A frase não pode estar vazia."); return; }
        btnSalvar.textContent = "Salvando...";
        btnSalvar.disabled = true;
        try {
            await window.db.collection('users').doc(uid).update({ frase: novaFrase });
            document.getElementById('txt-frase').textContent = `"${novaFrase}"`;
            window.fecharModal();
        } catch (error) { console.error("Erro ao salvar frase:", error); }
        finally { btnSalvar.textContent = "Salvar Frase"; btnSalvar.disabled = false; }
    }

    async function getRelacionamentosAtuais(uid) {
        const doc = await window.db.collection('users').doc(uid).get();
        return doc.data().relacionamentos || [];
    }

    async function adicionarRelacionamento() {
        if (!currentEditingUid) return;
        const nickInput = document.getElementById('input-rel-nick');
        const tipoInput = document.getElementById('input-rel-tipo');
        const btnAdd    = document.getElementById('btn-add-rel');
        const novoNick  = nickInput.value.trim();
        const novoTipo  = tipoInput.value;
        if (!novoNick) return;
        btnAdd.disabled = true;
        try {
            const userRef = window.db.collection('users').doc(currentEditingUid);
            const rels    = await getRelacionamentosAtuais(currentEditingUid);
            rels.push({ nick: novoNick, tipo: novoTipo });
            await userRef.update({ relacionamentos: rels });
            gerarHTMLRelacionamentos(rels);
            await carregarListaExclusao(currentEditingUid);
            nickInput.value = '';
        } catch(e) { alert("Erro ao adicionar"); }
        btnAdd.disabled = false;
    }

    async function carregarListaExclusao(uid) {
        const listaEl = document.getElementById('modal-lista-rels');
        listaEl.innerHTML = '<li>Carregando...</li>';
        const rels = await getRelacionamentosAtuais(uid);
        listaEl.innerHTML = '';
        rels.forEach((rel, index) => {
            const li = document.createElement('li');
            li.className = `rel-manager-item type-${rel.tipo}`;
            li.innerHTML = `
                <div class="rel-manager-info">
                    <span class="rel-name-text">${rel.nick}</span>
                    <span class="rel-type-text">${rel.tipo}</span>
                </div>
            `;
            const del = document.createElement('button');
            del.className = 'delete-btn-styled';
            del.innerHTML = '<i class="fa-solid fa-trash"></i>';
            del.onclick = () => deletarRelacionamento(index);
            li.appendChild(del);
            listaEl.appendChild(li);
        });
    }

    async function deletarRelacionamento(idx) {
        if (!currentEditingUid) return;
        const userRef = window.db.collection('users').doc(currentEditingUid);
        const rels    = await getRelacionamentosAtuais(currentEditingUid);
        rels.splice(idx, 1);
        await userRef.update({ relacionamentos: rels });
        gerarHTMLRelacionamentos(rels);
        await carregarListaExclusao(currentEditingUid);
    }

    // ==========================================
    // 12. PERMISSÕES DE EDIÇÃO
    // ==========================================
    function verificarPermissaoEdicao(uidDoPerfil) {
        firebase.auth().onAuthStateChanged(user => {
            if (user && user.uid === uidDoPerfil) {
                currentEditingUid = uidDoPerfil;

                const btnFrase = document.getElementById('btn-edit-frase');
                if (btnFrase) { btnFrase.style.display = 'block'; btnFrase.onclick = abrirModalFrase; }

                const btnSalvar = document.getElementById('btn-salvar-frase');
                if (btnSalvar) btnSalvar.onclick = () => salvarFraseNoFirebase(uidDoPerfil);

                const btnRel = document.getElementById('btn-edit-rel');
                if (btnRel) { btnRel.style.display = 'inline-block'; btnRel.onclick = () => abrirModalRelacionamentos(uidDoPerfil); }

                const btnAdd = document.getElementById('btn-add-rel');
                if (btnAdd) btnAdd.onclick = adicionarRelacionamento;

                const btnTema = document.getElementById('btn-customize');
                if (btnTema) { btnTema.style.display = 'flex'; btnTema.onclick = window.abrirModalTema; }

                inicializarPinturaIndividual();

            } else {
                ['btn-edit-frase', 'btn-edit-rel', 'btn-customize'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }
        });
    }

    // ==========================================
    // 13. DETECÇÃO DO USUÁRIO
    // ==========================================
    function detectingUsuario() {
        const params       = new URLSearchParams(window.location.search);
        const nickViaParam = params.get('nick');

        if (nickViaParam) { carregarPerfilPeloNick(nickViaParam); return; }

        const parts = window.location.pathname.split('/');
        if (parts.length > 2 && parts[1] === 'membros' && parts[2]) {
            const nickURL = decodeURIComponent(parts[2]);
            if (nickURL) { carregarPerfilPeloNick(nickURL); return; }
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        renderizarPerfil({ uid: user.uid, ...userDoc.data() });
                    } else {
                        document.getElementById('profile-name').textContent = "Perfil não encontrado.";
                    }
                } catch (error) { console.error("Erro ao carregar o próprio perfil:", error); }
            } else {
                window.location.href = '/index.html';
            }
        });
    }

    detectingUsuario();
});