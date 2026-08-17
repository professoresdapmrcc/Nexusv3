document.addEventListener('DOMContentLoaded', () => {
    
    // ===================================
    // 1. VARIÁVEIS E CONFIGURAÇÕES
    // ===================================
    const photoGrid = document.getElementById('photoGrid');
    const addPhotoForm = document.getElementById('add-photo-form');
    const loadingElement = document.getElementById('loading-wrapper');
    
    let currentUserRole = 'membro'; 
    let lastVisibleDoc = null; 
    let isFetching = false;    
    let hasMorePhotos = true;  
    const PHOTOS_PER_PAGE = 16; 

    // Variáveis do Modal
    let currentViewPhotoId = null;
    let commentsUnsubscribe = null;

    // ===================================
    // 2. FUNÇÕES AUXILIARES E ALERTAS
    // ===================================

    // Sistema de Alerta Personalizado (Superior Direito)
    function showTopRightToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#22c55e' : '#ef4444'; 
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${bgColor};
            color: #ffffff;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 100000;
            transform: translateX(150%);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        setTimeout(() => {
            toast.style.transform = 'translateX(150%)';
            setTimeout(() => toast.remove(), 400); 
        }, 3000);
    }

    function getCurrentUserSafe() {
        if (window.currentUser) return window.currentUser;
        if (typeof firebase !== 'undefined' && firebase.auth()) {
            return firebase.auth().currentUser;
        }
        return null;
    }

    // Processa menções (@nome) em links clicáveis
    function parseMentions(text) {
        if (!text) return "";
        return text.replace(/@([a-zA-Z0-9_.\-:=?!]+)/g, '<a href="/membros/$1" class="mention-link">$1</a>');
    }

    // Extrai as menções (@nome) da legenda
    function extractMentionsArray(text) {
        if (!text) return [];
        const mentionsMatch = text.match(/@([a-zA-Z0-9_.\-:=?!]+)/g);
        if (!mentionsMatch) return [];
        const names = mentionsMatch.map(m => m.replace('@', ''));
        return [...new Set(names)];
    }

    // Busca o UID silenciosamente (versão normal e Base64)
    async function getSilentUserId(nickname) {
        if (!nickname || !window.db) return null;
        try {
            const lowerNick = nickname.trim().toLowerCase();
            
            const normalDoc = await window.db.collection('nicknames').doc(lowerNick).get();
            if (normalDoc.exists) return normalDoc.data().uid;
            
            try {
                const encodedNick = btoa(lowerNick);
                const encodedDoc = await window.db.collection('nicknames').doc(encodedNick).get();
                if (encodedDoc.exists) return encodedDoc.data().uid;
            } catch(e) { } 
            
        } catch (err) {
            console.error("Erro na busca silenciosa de UID:", err);
        }
        return null;
    }

    // Gera o HTML das tags
    function generateTagsHTML(tagsArray) {
        if (!tagsArray || tagsArray.length === 0) return '';

        let mainText = '';
        if (tagsArray.length === 1) {
            mainText = `Com <span class="tagged-users-text">${tagsArray[0]}</span>`;
        } else if (tagsArray.length === 2) {
            mainText = `Com <span class="tagged-users-text">${tagsArray[0]}</span> e <span class="tagged-users-text">${tagsArray[1]}</span>`;
        } else {
            mainText = `Com <span class="tagged-users-text">${tagsArray[0]}</span> e <span class="tagged-users-text">mais ${tagsArray.length - 1} membros</span>`;
        }

        let tooltipItems = tagsArray.map(tag => `
            <a href="/membros/${tag}" class="tagged-user-item">
                <div class="tagged-user-head">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${tag}&action=std&direction=2&head_direction=2&gesture=sml&size=m&headonly=1" alt="${tag}">
                </div>
                <span class="tagged-user-name">${tag}</span>
            </a>
        `).join('');

        return `
            <div class="tagged-users-container">
                ${mainText}
                <div class="tagged-tooltip">
                    ${tooltipItems}
                </div>
            </div>
        `;
    }

    function createPhotoCardElement(photo, photoId) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.setAttribute('data-id', photoId);
        
        const user = getCurrentUserSafe();
        const isLiked = user && photo.likedBy && photo.likedBy.includes(user.uid);
        
        const heartColor = isLiked ? '#ff4d6d' : 'transparent';
        const heartStroke = isLiked ? '#ff4d6d' : '#fff';

        const isAdmin = currentUserRole === 'admin';
        
        const deleteButtonHTML = isAdmin ? `
            <div class="delete-btn" onclick="deletePhoto('${photoId}', this, event)" title="Apagar foto (Admin)" style="
                position: absolute; top: 10px; right: 10px; 
                background: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20;
                transition: background 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            " onmouseover="this.style.background='#ff0000'" onmouseout="this.style.background='rgba(255, 0, 0, 0.7)'">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #fff;">delete</span>
            </div>
        ` : '';

        const imageSource = photo.imageUrl || 'https://placehold.co/600x600?text=Sem+Imagem';

        card.innerHTML = `
            ${deleteButtonHTML}
            <img src="${imageSource}" alt="Mural" loading="lazy"
                 style="width: 100%; height: 100%; object-fit: cover; display: block;"
                 onerror="this.onerror=null;this.src='https://placehold.co/600x600?text=Erro+Imagem';">
            
            <div class="photo-overlay" style="
                position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 15%, transparent 60%);
                display: flex; flex-direction: column; justify-content: flex-end; padding: 15px; opacity: 1; pointer-events: none;
            ">
                <p class="photo-description" style="
                    color: #fff; font-weight: 700; font-size: 14px; margin-bottom: 8px; text-shadow: 1px 1px 2px black; line-height: 1.2;
                ">${photo.description || ''}</p>
                
                ${generateTagsHTML(photo.taggedUsers)}
                
                <div class="photo-meta" style="display: flex; justify-content: space-between; align-items: center; pointer-events: auto;">
                    <a href="/membros/${photo.authorUsername}" style="color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;" 
                       onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                        ${photo.authorUsername}
                    </a>
                    
                    <div id="like-btn-grid-${photoId}" class="like-button" role="button" data-liked="${isLiked}" onclick="handleLikeClick('${photoId}', event)" style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #fff;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="${heartColor}" stroke="${heartStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="like-count" style="font-size: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${photo.likeCount || 0}</span>
                    </div>
                </div>
            </div>`;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.like-button') || e.target.closest('.delete-btn') || e.target.closest('a') || e.target.closest('.tagged-users-container')) return;
            openPhotoViewModal(photoId, photo, isLiked, photo.likeCount || 0);
        });

        return card;
    }

    // ===================================
    // 3. AÇÕES (DELETE E LIKE)
    // ===================================

    window.deletePhoto = async (photoId, btnElement, event) => {
        if(event) event.stopPropagation(); 
        
        if(!confirm("Admin: Tem certeza que deseja apagar esta foto permanentemente?")) return;
        
        try {
            await window.db.collection('muralPhotos').doc(photoId).delete();
            const card = btnElement.closest('.photo-card');
            if (card) card.remove();
            showTopRightToast("Foto apagada com sucesso!");
        } catch(err) { 
            console.error(err); 
            showTopRightToast("Erro ao apagar a foto.", "error"); 
        }
    };

    window.handleLikeClick = async (photoId, event) => {
        if(event) event.stopPropagation(); 

        const user = getCurrentUserSafe();
        
        if (!window.db) window.db = firebase.firestore();
        if (!user) {
            showTopRightToast("Faça login para curtir.", "error");
            return;
        }
        
        const gridBtn = document.getElementById(`like-btn-grid-${photoId}`);
        const modalBtn = document.getElementById('viewModalLikeBtn');
        const referenceBtn = gridBtn || modalBtn;
        
        if (!referenceBtn) return;
        
        const isCurrentlyLiked = referenceBtn.getAttribute('data-liked') === 'true';
        let currentCount = parseInt(referenceBtn.querySelector('.like-count').textContent) || 0;
        const newCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

        const updateUILIkeBtn = (btn) => {
            if(!btn) return;
            const svg = btn.querySelector('svg');
            const countSpan = btn.querySelector('.like-count');
            
            if (isCurrentlyLiked) {
                svg.setAttribute('fill', 'transparent'); 
                svg.setAttribute('stroke', '#ffffff'); 
                svg.style.transform = "scale(1)";
                countSpan.textContent = newCount; 
                btn.setAttribute('data-liked', 'false');
            } else {
                svg.setAttribute('fill', '#ff4d6d'); 
                svg.setAttribute('stroke', '#ff4d6d'); 
                svg.style.transform = "scale(1.2)";
                setTimeout(() => { svg.style.transform = "scale(1)"; }, 200);
                countSpan.textContent = newCount; 
                btn.setAttribute('data-liked', 'true');
            }
        };

        updateUILIkeBtn(gridBtn);
        if (currentViewPhotoId === photoId) updateUILIkeBtn(modalBtn);

        const photoRef = window.db.collection('muralPhotos').doc(photoId);
        try {
            await window.db.runTransaction(async (t) => {
                const doc = await t.get(photoRef);
                const data = doc.data();
                
                if (isCurrentlyLiked) {
                    t.update(photoRef, { likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid), likeCount: Math.max(0, (data.likeCount || 1) - 1) });
                } else {
                    t.update(photoRef, { likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid), likeCount: (data.likeCount || 0) + 1 });
                }
            });
        } catch (e) { console.error("Erro Like:", e); }
    };

    // ===================================
    // 4. LÓGICA DO MODAL DE VISUALIZAÇÃO E COMENTÁRIOS
    // ===================================

    const viewModal = document.getElementById('photoViewModal');
    const closeViewModalBtn = document.getElementById('close-view-modal-btn');
    const commentForm = document.getElementById('comment-form');

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
        
        document.getElementById('viewModalDesc').innerHTML = parseMentions(photoData.description) || "";
        document.getElementById('viewModalTags').innerHTML = generateTagsHTML(photoData.taggedUsers);

        const modalLikeBtn = document.getElementById('viewModalLikeBtn');
        modalLikeBtn.setAttribute('data-liked', isLiked ? 'true' : 'false');
        modalLikeBtn.onclick = (e) => handleLikeClick(photoId, e);
        
        const svg = modalLikeBtn.querySelector('svg');
        svg.setAttribute('fill', isLiked ? '#ff4d6d' : 'transparent');
        svg.setAttribute('stroke', isLiked ? '#ff4d6d' : '#fff');
        modalLikeBtn.querySelector('.like-count').textContent = likeCount;

        document.getElementById('comment-input').value = '';

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?photo=${photoId}`;
        window.history.pushState({path:newUrl}, '', newUrl);

        viewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
        
        loadComments(photoId);
    }

    function closePhotoViewModal() {
        viewModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; 
        currentViewPhotoId = null;
        
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path:cleanUrl}, '', cleanUrl);

        if (commentsUnsubscribe) { 
            commentsUnsubscribe(); 
            commentsUnsubscribe = null; 
        }
    }

    if(closeViewModalBtn) closeViewModalBtn.addEventListener('click', closePhotoViewModal);
    if(viewModal) viewModal.addEventListener('click', (e) => { if (e.target === viewModal) closePhotoViewModal(); });

    function loadComments(photoId) {
        const commentsContainer = document.getElementById('viewModalComments');
        commentsContainer.innerHTML = '<div class="loading-comments">Carregando comentários...</div>';

        if (commentsUnsubscribe) commentsUnsubscribe();

        commentsUnsubscribe = window.db.collection('muralPhotos').doc(photoId).collection('comments')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                commentsContainer.innerHTML = '';
                
                if (snapshot.empty) {
                    commentsContainer.innerHTML = '<div style="color: #aaa; text-align: center; margin-top: 20px; font-size: 0.9rem;">Seja o primeiro a comentar!</div>';
                    return;
                }

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const formattedText = parseMentions(data.text);
                    
                    commentsContainer.innerHTML += `
                        <div class="comment-item">
                            <a href="/membros/${data.authorUsername}" class="comment-author">${data.authorUsername}</a>
                            <span class="comment-text">${formattedText}</span>
                        </div>
                    `;
                });
                commentsContainer.scrollTop = commentsContainer.scrollHeight;
            });
    }

    if(commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('comment-input');
            const text = input.value.trim();
            
            if (!text || !currentViewPhotoId) return;

            const user = getCurrentUserSafe();
            if (!user) {
                showTopRightToast("Faça login para comentar.", "error");
                return;
            }

            let authorName = user.displayName || "Membro";
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().name) authorName = userDoc.data().name;
            } catch(err) { }

            const submitBtn = document.getElementById('send-comment-btn');
            submitBtn.disabled = true; 
            submitBtn.textContent = '...';

            try {
                await window.db.collection('muralPhotos').doc(currentViewPhotoId).collection('comments').add({
                    text: text, 
                    authorId: user.uid, 
                    authorUsername: authorName, 
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                const mentionedUsers = extractMentionsArray(text);
                if (mentionedUsers.length > 0) {
                    for (const taggedName of mentionedUsers) {
                        
                        // Trava removida! Você agora pode ser notificado.
                        
                        let uidDestino = await getSilentUserId(taggedName);
                        
                        if (uidDestino) {
                            await window.db.collection('notificacoes').add({
                                destinatarioId: uidDestino, 
                                titulo: 'Menção em comentário',
                                corpo: `${authorName} mencionou você em um comentário no Mural.`,
                                icone: 'fa-comment-dots', 
                                cor_icone: '#ba4fc0', 
                                link: `/mural.html?photo=${currentViewPhotoId}`, 
                                read: false,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
                
                input.value = ''; 
                showTopRightToast("Comentário publicado!");

            } catch (err) { 
                console.error("Erro ao publicar comentário", err); 
                showTopRightToast("Erro ao publicar comentário.", "error"); 
            } finally { 
                submitBtn.disabled = false; 
                submitBtn.textContent = 'Publicar'; 
                input.focus(); 
            }
        });
    }

    // ===================================
    // 5. CARREGAMENTO DA GRID & AUTO-OPEN
    // ===================================

    async function checkUrlForPhoto() {
        const urlParams = new URLSearchParams(window.location.search);
        const targetPhotoId = urlParams.get('photo');
        
        if (targetPhotoId && window.db) {
            try {
                const doc = await window.db.collection('muralPhotos').doc(targetPhotoId).get();
                if (doc.exists) {
                    const data = doc.data();
                    const user = getCurrentUserSafe();
                    const isLiked = user && data.likedBy && data.likedBy.includes(user.uid);
                    openPhotoViewModal(doc.id, data, isLiked, data.likeCount || 0);
                }
            } catch (err) { console.error("Erro ao auto-abrir foto:", err); }
        }
    }

    async function fetchNextBatch() {
        if (isFetching || !hasMorePhotos) return;
        
        if (!window.db) {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) { window.db = firebase.firestore(); } 
            else { setTimeout(fetchNextBatch, 500); return; }
        }

        isFetching = true;
        if (loadingElement) loadingElement.style.display = 'flex';

        try {
            let query = window.db.collection('muralPhotos').orderBy('timestamp', 'desc').limit(PHOTOS_PER_PAGE);
            if (lastVisibleDoc) query = query.startAfter(lastVisibleDoc);

            const snapshot = await query.get();

            if (snapshot.empty) {
                hasMorePhotos = false; isFetching = false;
                if (loadingElement) {
                    const icon = loadingElement.querySelector('.pulse-icon'); if (icon) icon.style.display = 'none';
                    const text = loadingElement.querySelector('.loading-text'); if (text) text.innerText = "Fim da galeria.";
                }
                return;
            }

            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            
            snapshot.forEach(doc => {
                const card = createPhotoCardElement(doc.data(), doc.id);
                if (loadingElement) photoGrid.insertBefore(card, loadingElement);
                else photoGrid.appendChild(card);
            });

            if (currentUserRole === 'admin') updateAdminButtons();

        } catch (err) { console.error(err); } 
        finally { isFetching = false; if (loadingElement && hasMorePhotos) loadingElement.style.display = 'none'; }
    }

    function handleScroll() {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 100) fetchNextBatch();
    }

    function updateAdminButtons() {
        if (currentUserRole !== 'admin') return;
        document.querySelectorAll('.photo-card').forEach(card => {
            if (card.querySelector('.delete-btn')) return;
            const photoId = card.getAttribute('data-id');
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-btn';
            deleteBtn.setAttribute('onclick', `deletePhoto('${photoId}', this, event)`);
            deleteBtn.style.cssText = `position: absolute; top: 10px; right: 10px; background: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20; transition: background 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.5);`;
            deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; color: #fff;">delete</span>';
            card.prepend(deleteBtn);
        });
    }

    // ===================================
    // 6. INICIALIZAÇÃO E AUTH
    // ===================================

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            window.currentUser = user;
            if(!window.db) window.db = firebase.firestore();
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                if(userDoc.exists) {
                    currentUserRole = userDoc.data().role || 'membro';
                    if (currentUserRole === 'admin') updateAdminButtons();
                }
            } catch(e) { }
            checkUrlForPhoto(); 
        } else {
            checkUrlForPhoto(); 
        }
    });

    window.addEventListener('scroll', handleScroll);
    fetchNextBatch();

    // ===================================
    // 7. PUBLICAR FOTO (LENDO LEGENDA E CAMPO DEDICADO)
    // ===================================
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = getCurrentUserSafe();
            if (!user) {
                showTopRightToast("Faça login para publicar.", "error");
                return;
            }
            
            const urlInput = document.getElementById('photo-url');
            const url = urlInput.value.trim();
            const desc = document.getElementById('photo-description-input').value;

            // Pega as tags do campo dedicado
            const tagsInputEl = document.getElementById('photo-tags-input');
            const tagsInput = tagsInputEl ? tagsInputEl.value : "";
            const tagsFromInput = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== "");

            // Extrai também quem foi marcado com @ na legenda
            const tagsFromDesc = extractMentionsArray(desc);

            // Junta os dois sem repetir nomes
            const taggedUsersArray = [...new Set([...tagsFromInput, ...tagsFromDesc])];

            if (!url.toLowerCase().endsWith('.png') && !url.toLowerCase().endsWith('.jpg') && !url.toLowerCase().endsWith('.jpeg') && !url.toLowerCase().endsWith('.gif') && !url.toLowerCase().endsWith('.webp')) {
                showTopRightToast("Por favor, insira um link de imagem válido.", "error");
                urlInput.style.borderColor = "red"; urlInput.focus(); return;
            }

            const btnSubmit = addPhotoForm.querySelector('.btn-primary');
            btnSubmit.disabled = true; btnSubmit.textContent = "Publicando...";

            try {
                let authorName = user.displayName || "Membro";
                try {
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().name) authorName = userDoc.data().name;
                } catch(err) { }

                const newPhotoRef = await window.db.collection('muralPhotos').add({
                    imageUrl: url, description: desc, taggedUsers: taggedUsersArray, authorId: user.uid,
                    authorUsername: authorName, timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    likeCount: 0, likedBy: []
                });

                if (taggedUsersArray.length > 0) {
                    for (const taggedName of taggedUsersArray) {
                        
                        // Trava removida! Você agora pode ser notificado.

                        let uidDestino = await getSilentUserId(taggedName);
                        
                        if (uidDestino) {
                            await window.db.collection('notificacoes').add({
                                destinatarioId: uidDestino, 
                                titulo: 'Nova menção no Mural',
                                corpo: `${authorName} marcou você em uma nova foto.`,
                                icone: 'fa-at', 
                                cor_icone: '#ba4fc0', 
                                link: `/mural.html?photo=${newPhotoRef.id}`, 
                                read: false,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
                
                const modal = document.getElementById('addPhotoModal');
                if(modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
                addPhotoForm.reset();
                
                showTopRightToast("Foto postada!");

                setTimeout(() => {
                    window.location.reload(); 
                }, 1500);
                
            } catch (err) { 
                console.error(err); 
                showTopRightToast("Erro ao publicar a foto.", "error"); 
                btnSubmit.disabled = false; btnSubmit.textContent = "Publicar Foto";
            }
        });
    }

    // ===================================
    // 8. EVENTOS DOS MODAIS E BOTÕES
    // ===================================
    const openModalBtn = document.getElementById('showAddPhotoModalBtn');
    const modal = document.getElementById('addPhotoModal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (openModalBtn) {
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            const user = (typeof firebase !== 'undefined' && firebase.auth().currentUser) || window.currentUser;
            if (!user) { window.location.href = "login.html"; return; }
            if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
        });
    }

    function closeModal() { if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; } }
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
});