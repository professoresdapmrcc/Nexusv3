document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // == MOVIMENTO E ENTRADAS DA HOME
    // ===================================
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealElements = [...document.querySelectorAll('[data-reveal]')];

    document.documentElement.classList.add('motion-ready');

    if (reducedMotion || !('IntersectionObserver' in window)) {
        revealElements.forEach((element) => element.classList.add('is-visible'));
    } else {
        revealElements.forEach((element, index) => {
            element.style.transitionDelay = `${(index % 4) * 80}ms`;
        });

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        revealElements.forEach((element) => revealObserver.observe(element));
    }

    // ===================================
    // == NOVOS PROFESSORES (FIREBASE)
    // ===================================
    const arrivalsGrid = document.getElementById('new-arrivals-grid');

    if (arrivalsGrid) {
        const arrivalCards = [...arrivalsGrid.querySelectorAll('[data-arrival-slot]')];
        const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        function getMemberNickname(data) {
            return [data.nick, data.name, data.nickname]
                .find((value) => typeof value === 'string' && value.trim())?.trim() || '';
        }

        function getEntryDate(value) {
            if (!value) return null;
            if (typeof value.toDate === 'function') return value.toDate();
            if (value instanceof Date) return value;

            const text = String(value).trim();
            const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
                ? new Date(`${text}T12:00:00`)
                : new Date(text);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        function createElement(tag, className, text) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (text !== undefined) element.textContent = text;
            return element;
        }

        function renderArrivalCard(card, member, index) {
            card.replaceChildren();
            card.classList.remove('arrival-card--loading', 'arrival-card--empty');

            const number = createElement('span', 'cta-number', String(index + 1).padStart(2, '0'));
            const portrait = createElement('div', 'arrival-portrait');
            const orbit = createElement('span', 'arrival-orbit');
            orbit.setAttribute('aria-hidden', 'true');

            const image = createElement('img', 'arrival-avatar habbo-imager');
            image.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(member.nickname)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=l`;
            image.alt = `Habbo de ${member.nickname}`;
            image.loading = 'eager';
            image.decoding = 'async';
            image.referrerPolicy = 'no-referrer';
            image.addEventListener('load', () => portrait.classList.add('arrival-portrait--ready'), { once: true });
            image.addEventListener('error', () => {
                portrait.classList.add('arrival-portrait--error');
                image.remove();
            }, { once: true });
            portrait.append(orbit, image);

            const copy = createElement('div', 'cta-copy arrival-copy');
            copy.append(createElement('small', 'arrival-label', 'Nova entrada'));

            const nameLink = createElement('a', 'cta-main-text arrival-name', member.nickname);
            nameLink.href = `/membros/${encodeURIComponent(member.nickname)}`;
            copy.append(nameLink);
            copy.append(createElement('p', 'cta-subtext arrival-role', member.role));

            const date = createElement('time', 'arrival-date', `Em órbita desde ${dateFormatter.format(member.date)}`);
            date.dateTime = member.date.toISOString();
            copy.append(date);
            card.append(number, portrait, copy);
        }

        function renderEmptyCard(card, index, message = 'Aguardando uma nova chegada.') {
            card.replaceChildren();
            card.classList.remove('arrival-card--loading');
            card.classList.add('arrival-card--empty');
            card.append(
                createElement('span', 'cta-number', String(index + 1).padStart(2, '0')),
                createElement('span', 'arrival-empty-mark', '+')
            );
            const copy = createElement('div', 'cta-copy arrival-copy');
            copy.append(
                createElement('small', 'arrival-label', 'Próxima órbita'),
                createElement('span', 'cta-main-text', 'Lugar reservado'),
                createElement('p', 'cta-subtext', message)
            );
            card.append(copy);
        }

        function renderMembers(snapshot) {
            const members = snapshot.docs
                .map((documentSnapshot) => {
                    const data = documentSnapshot.data();
                    return {
                        nickname: getMemberNickname(data),
                        role: (typeof data.cargo === 'string' && data.cargo.trim()) || 'Professor(a)',
                        date: getEntryDate(data.dataEntrada)
                    };
                })
                .filter((member) => member.nickname && member.date)
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, arrivalCards.length);

            arrivalCards.forEach((card, index) => {
                if (members[index]) renderArrivalCard(card, members[index], index);
                else renderEmptyCard(card, index);
            });
            arrivalsGrid.setAttribute('aria-busy', 'false');
        }

        function connectArrivals(attempt = 0) {
            const firestore = window.db || (
                typeof firebase !== 'undefined' && firebase.apps?.length
                    ? firebase.firestore()
                    : null
            );

            if (!firestore) {
                if (attempt < 24) window.setTimeout(() => connectArrivals(attempt + 1), 250);
                else {
                    arrivalCards.forEach((card, index) => renderEmptyCard(card, index, 'Não foi possível consultar o Firebase agora.'));
                    arrivalsGrid.setAttribute('aria-busy', 'false');
                }
                return;
            }

            window.db = firestore;
            if (typeof window.__nexusArrivalsUnsubscribe === 'function') window.__nexusArrivalsUnsubscribe();
            const activeMembersQuery = firestore.collection('users').where('status', '==', 'Ativo');

            // A leitura inicial evita que o card dependa exclusivamente da abertura
            // do canal em tempo real. Depois, o onSnapshot mantém tudo atualizado.
            activeMembersQuery.get().then(renderMembers).catch((error) => {
                console.error('Erro na leitura inicial dos novos professores:', error);
            });

            window.__nexusArrivalsUnsubscribe = activeMembersQuery.onSnapshot(renderMembers, (error) => {
                    console.error('Erro ao carregar novos professores:', error);
                    arrivalCards.forEach((card, index) => renderEmptyCard(card, index, 'Não foi possível atualizar as chegadas.'));
                    arrivalsGrid.setAttribute('aria-busy', 'false');
            });
        }

        connectArrivals();
    }

    // ===================================
    // == LÓGICA DA SEÇÃO SUBGRUPOS
    // ===================================
    const subgroupsData = [
        {
            id: 3,
            title: 'Departamento de Aplicação',
            description: 'O Departamento de Aplicação é um grupo específico e subordinado à liderança dos Professores. Sua principal função é gerir a entrada de novos membros, servindo como um ponto de integração para garantir o contínuo fluxo e o crescimento da companhia.',
            crestUrl: "imgs/da-imagem.png",
            mainImageUrl: "imgs/da-imagem.png",
            formUrl: 'https://prof-inscricoesdep.netlify.app/'
        },
        {
            id: 2,
            title: 'Serviço de Proteção dos Professores',
            description: 'O Serviço de Proteção dos Professores segue as regras do Código de Conduta Militar, do Regimento Interno e do Código Penal dos Professores. O grupo atua na segurança da companhia, priorizando a integridade da instituição.',
            crestUrl: "imgs/spp-imagem.png",
            mainImageUrl: "imgs/spp-imagem.png",
            formUrl: 'https://prof-inscricoesdep.netlify.app/'
        },
        {
            id: 1,
            title: 'Comissão de Desenvolvimento Cultural',
            description: 'A Comissão de Desenvolvimento Cultural é responsável por fortalecer o marketing da companhia e organizar eventos e aulas. Conta com três cargos principais Analista, Docente e Arquiteto que exigem responsabilidade, aperfeiçoamento e criatividade.',
            crestUrl: "imgs/cdc-imagem.png",
            mainImageUrl: "imgs/cdc-imagem.png",
            formUrl: 'https://prof-inscricoesdep.netlify.app/'
        }
    ];

    const grid = document.getElementById('grupos-grid');
    const modalOverlay = document.getElementById('subgroup-modal-overlay');
    const modalContainer = document.getElementById('subgroup-modal-container');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.getElementById('modal-close-btn');

    function openModal(groupData) {
        if (!modalContent || !modalOverlay) return;

        modalContent.innerHTML = `
            <img src="${groupData.mainImageUrl}" alt="Imagem de ${groupData.title}">
            <h2>${groupData.title}</h2>
            <p>${groupData.description}</p>
            <div class="modal-link">
                <a href="${groupData.formUrl}" class="btn btn-primary" target="_blank">INSCREVA-SE</a>
            </div>
        `;
        modalOverlay.classList.remove('hidden');
        modalContainer.classList.remove('hidden');
    }

    function closeModal() {
        if (!modalOverlay || !modalContainer) return;
        modalOverlay.classList.add('hidden');
        modalContainer.classList.add('hidden');
    }

    if (grid) {
        grid.addEventListener('click', (e) => {
            const clickedItem = e.target.closest('.grupo-item');
            if (clickedItem) {
                const groupId = parseInt(clickedItem.dataset.id, 10);
                const groupData = subgroupsData.find(g => g.id === groupId);
                if (groupData) openModal(groupData);
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // ===================================
    // == LÓGICA DA SEÇÃO WEEKLY (AIRTABLE)
    // ===================================
    if (document.getElementById('weekly')) {
        function initWeekly() {
            const AIRTABLE_TOKEN = "patQE6E4PXnNeQ0mC.7f5f7a319cbce13e79e7880e7e9f39e121cad5e57d7f58334ac19b3345e44779";
            const BASE_ID = "appHfyxgdt5afGM2k";
            const TABLE_NAME = "Table 1";

            const currentView = document.getElementById('current-edition-view');
            const pastView = document.getElementById('past-editions-view');
            const showPastBtn = document.getElementById('show-past-btn');
            const backToCurrentBtn = document.getElementById('back-to-current-btn');
            
            const apiUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?sort%5B0%5D%5Bfield%5D=Data&sort%5B0%5D%5Bdirection%5D=desc`;

            async function fetchData() {
                try {
                    const response = await fetch(apiUrl, {
                        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
                    });
                    if (!response.ok) throw new Error(`Erro Airtable: ${response.statusText}`);
                    const data = await response.json();
                    const currentRecord = data.records.find(record => record.fields.EdicaoAtual === true);
                    const pastRecords = data.records.filter(record => !record.fields.EdicaoAtual);
                    
                    if (currentRecord) renderCurrentEdition(currentRecord.fields);
                    renderPastEditions(pastRecords);
                } catch (error) {
                    console.error('Erro Weekly:', error);
                }
            }

            function renderCurrentEdition(fields) {
                document.getElementById('current-volume').textContent = fields.Volume || "Volume Desconhecido";
                document.getElementById('current-date').textContent = fields.Data ? new Date(fields.Data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : "Data Desconhecida";
                document.getElementById('current-description').innerHTML = (fields.Descricao || "").replace(/\n/g, '<br>');
                document.getElementById('current-link').href = fields.LinkExterno || "#";
                const rightPanel = document.querySelector('#current-edition-view .right-panel');
                const imgUrl = fields.Imagem ? fields.Imagem[0].url : 'https://placehold.co/600x800';
                rightPanel.innerHTML = `
                    <figure class="weekly-cover-display">
                        <div class="weekly-cover-paper">
                            <img src="${imgUrl}" alt="Capa da edição atual do Weekly" class="edition-image-dynamic">
                        </div>
                        <figcaption><span>Capa da edição atual</span><small>Acabou de chegar</small></figcaption>
                    </figure>
                `;
            }
            
            function renderPastEditions(records) {
                const listContainer = document.getElementById('past-editions-list');
                listContainer.innerHTML = '';
                records.forEach(record => {
                    const link = document.createElement('a');
                    link.className = 'past-edition-link';
                    link.href = record.fields.LinkExterno || '#';
                    link.target = "_blank";
                    link.innerHTML = `<span class="past-volume">${record.fields.Volume}</span>`;
                    listContainer.appendChild(link);
                });
            }

            if (showPastBtn) showPastBtn.addEventListener('click', () => { currentView.classList.add('hidden'); pastView.classList.remove('hidden'); });
            if (backToCurrentBtn) backToCurrentBtn.addEventListener('click', () => { pastView.classList.add('hidden'); currentView.classList.remove('hidden'); });

            fetchData();
        }
        initWeekly();
    }

    // ===================================
    // == LÓGICA DO MURAL (FIREBASE) - ALEATÓRIO + VALIDAR PNG + LINK GALERIA
    // ===================================
    const photoGrid = document.getElementById('photoGrid');
    const addPhotoForm = document.getElementById('add-photo-form');
    let currentUserRole = 'membro'; 

    // 0. Função para Embaralhar (Randomizar)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 1. Função auxiliar para pegar o usuário
    function getCurrentUserSafe() {
        if (window.currentUser) return window.currentUser;
        if (typeof firebase !== 'undefined' && firebase.auth()) {
            return firebase.auth().currentUser;
        }
        return null;
    }

    // 2. Função de Criar o Card
    function createPhotoCardElement(photo, photoId) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.setAttribute('data-id', photoId);
        
        const user = getCurrentUserSafe();
        const isLiked = user && photo.likedBy && photo.likedBy.includes(user.uid);
        
        const heartColor = isLiked ? '#ff4d6d' : 'transparent';
        const heartStroke = isLiked ? '#ff4d6d' : '#fff';

        const isAdmin = currentUserRole === 'admin';
        const canDelete = isAdmin; 
        
        const deleteButtonHTML = canDelete ? `
            <div class="delete-btn" onclick="deletePhoto('${photoId}')" title="Apagar foto (Admin)" style="
                position: absolute; top: 10px; right: 10px; 
                background: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20;
                transition: background 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            " onmouseover="this.style.background='#ff0000'" onmouseout="this.style.background='rgba(255, 0, 0, 0.7)'">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #fff;">delete</span>
            </div>
        ` : '';

        card.innerHTML = `
            ${deleteButtonHTML}
            <img src="${photo.imageUrl}" alt="Mural" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; cursor: default; pointer-events: none;">
            
            <div class="photo-overlay">
                <p class="photo-description" style="
                    color: #fff; font-weight: 700; font-size: 14px; margin-bottom: 8px; text-shadow: 1px 1px 2px black;
                ">${photo.description || ''}</p>
                
                <div class="photo-meta" style="display: flex; justify-content: space-between; align-items: center;">
                    <a href="/membros/${photo.authorUsername}" style="
                        color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;
                    " onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                        ${photo.authorUsername}
                    </a>
                    <div id="like-btn-${photoId}" class="like-button" role="button" data-liked="${isLiked}" onclick="handleLikeClick('${photoId}')" style="
                        display: flex; align-items: center; gap: 6px; cursor: pointer; z-index: 10;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="${heartColor}" stroke="${heartStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="like-count" style="
                            font-size: 16px; font-weight: 600; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                        ">${photo.likeCount || 0}</span>
                    </div>
                </div>
            </div>`;
        return card;
    }

    // 3. Função de Deletar
    window.deletePhoto = async (photoId) => {
        if(!confirm("Tem certeza que deseja apagar esta foto?")) return;
        try {
            await window.db.collection('muralPhotos').doc(photoId).delete();
            if(window.showToast) window.showToast("Foto apagada.", "success");
        } catch(err) {
            console.error(err);
            alert("Erro ao apagar. Verifique permissões.");
        }
    };

    // 4. Função de Like
    window.handleLikeClick = async (photoId) => {
        const user = getCurrentUserSafe();
        if (!window.db && typeof firebase !== 'undefined') window.db = firebase.firestore();

        if (!user || !window.db) {
            if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
                window.currentUser = firebase.auth().currentUser;
                return window.handleLikeClick(photoId); 
            }
            return window.showToast ? window.showToast("Faça login...", "info") : alert("Faça login...");
        }
        
        const btn = document.getElementById(`like-btn-${photoId}`);
        if (!btn) return;
        
        const isCurrentlyLiked = btn.getAttribute('data-liked') === 'true';
        const svg = btn.querySelector('svg');
        const countSpan = btn.querySelector('.like-count');
        let currentCount = parseInt(countSpan.textContent) || 0;
        
        if (isCurrentlyLiked) {
            svg.setAttribute('fill', 'transparent');
            svg.setAttribute('stroke', '#ffffff');
            svg.style.transform = "scale(1)";
            countSpan.textContent = Math.max(0, currentCount - 1);
            btn.setAttribute('data-liked', 'false');
        } else {
            svg.setAttribute('fill', '#ff4d6d');
            svg.setAttribute('stroke', '#ff4d6d');
            svg.style.transform = "scale(1.2)";
            setTimeout(() => svg.style.transform = "scale(1)", 200);
            countSpan.textContent = currentCount + 1;
            btn.setAttribute('data-liked', 'true');
        }

        const photoRef = window.db.collection('muralPhotos').doc(photoId);
        try {
            await window.db.runTransaction(async (t) => {
                const doc = await t.get(photoRef);
                const data = doc.data();
                if (isCurrentlyLiked) {
                    t.update(photoRef, {
                        likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid),
                        likeCount: Math.max(0, (data.likeCount || 1) - 1)
                    });
                } else {
                    t.update(photoRef, {
                        likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid),
                        likeCount: (data.likeCount || 0) + 1
                    });
                }
            });
        } catch (e) { console.error("Erro Like:", e); }
    };

    // 5. Busca de Fotos (ALEATÓRIA + 4 LINHAS)
    function fetchPhotos() {
        if (!window.db) {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                window.db = firebase.firestore(); 
            } else {
                setTimeout(fetchPhotos, 800);
                return;
            }
        }

        function updateAdminButtons() {
            if (currentUserRole !== 'admin') return;
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach(card => {
                if (card.querySelector('.delete-btn')) return;
                const photoId = card.getAttribute('data-id');
                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'delete-btn';
                deleteBtn.setAttribute('title', 'Apagar foto (Admin)');
                deleteBtn.setAttribute('onclick', `deletePhoto('${photoId}')`);
                deleteBtn.style.cssText = `
                    position: absolute; top: 10px; right: 10px; 
                    background: rgba(255, 0, 0, 0.7); border-radius: 50%; width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20;
                    transition: background 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                `;
                deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; color: #fff;">delete</span>';
                deleteBtn.onmouseover = function() { this.style.background = '#ff0000'; };
                deleteBtn.onmouseout = function() { this.style.background = 'rgba(255, 0, 0, 0.7)'; };
                card.prepend(deleteBtn);
            });
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                window.currentUser = user;
                try {
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    if(userDoc.exists) {
                        currentUserRole = userDoc.data().role || 'membro';
                        if (currentUserRole === 'admin') updateAdminButtons();
                    }
                } catch(e) { console.log("Erro check admin", e); }
            }
        });

        // Trazemos tudo para poder embaralhar
        window.db.collection('muralPhotos').onSnapshot(snapshot => {
            if (!photoGrid) return;
            photoGrid.innerHTML = '';

            const oldBtn = document.getElementById('show-more-container');
            if(oldBtn) oldBtn.remove();

            if (snapshot.empty) {
                photoGrid.innerHTML = '<p class="text-center col-span-full opacity-50">Nenhuma foto ainda.</p>';
                return;
            }

            // 1. Converte para array e EMBARALHA (Shuffle)
            let allDocs = snapshot.docs;
            allDocs = shuffleArray(allDocs); // Função criada lá em cima

            // 2. Define limite de 16 fotos (4 linhas)
            const INITIAL_LIMIT = 16; 

            const renderBatch = (docs) => {
                docs.forEach(doc => {
                    photoGrid.appendChild(createPhotoCardElement(doc.data(), doc.id));
                });
                if (currentUserRole === 'admin') updateAdminButtons();
            };

            // 3. Renderiza apenas as primeiras 16 aleatórias
            renderBatch(allDocs.slice(0, INITIAL_LIMIT));

            // 4. Se tiver mais, mostra botão de "VER TUDO" que leva para outra página
            if (allDocs.length > INITIAL_LIMIT) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'show-more-container';
                btnContainer.style.cssText = 'text-align: center; width: 100%; margin-top: 30px; grid-column: 1 / -1;';

                const btn = document.createElement('button');
                btn.innerText = "VER TODAS AS FOTOS";
                btn.className = "btn btn-outline"; 
                btn.style.cssText = "padding: 12px 30px; cursor: pointer;";
                
                // --- REDIRECIONA PARA OUTRA PÁGINA ---
                btn.onclick = () => {
                    window.location.href = '/mural.html'; // <--- Mude o nome da página aqui se precisar
                };

                btnContainer.appendChild(btn);
                photoGrid.parentNode.insertBefore(btnContainer, photoGrid.nextSibling);
            }

        }, err => console.error("Erro Mural:", err));
    }

    // 6. Publicação com VALIDAÇÃO DE PNG
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getCurrentUserSafe();
            if (!user || !window.db) return window.showToast ? window.showToast("Erro de conexão", "error") : alert("Erro de conexão");
            
            const urlInput = document.getElementById('photo-url');
            const url = urlInput.value.trim();
            const desc = document.getElementById('photo-description-input').value;

            // --- VALIDAÇÃO PNG ---
            if (!url.toLowerCase().endsWith('.png')) {
                if(window.showToast) window.showToast("Insira o link com final .png", "error");
                else alert("Insira o link com final .png");
                
                // Destaca o campo com erro
                urlInput.style.borderColor = "red";
                setTimeout(() => urlInput.style.borderColor = "rgba(255, 255, 255, 0.2)", 3000);
                return; // Para tudo aqui
            }

            try {
                let authorName = user.displayName || "Membro";
                try {
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().name) authorName = userDoc.data().name;
                } catch(err) { console.log("Usando nome do Auth"); }

                await window.db.collection('muralPhotos').add({
                    imageUrl: url,
                    description: desc,
                    authorId: user.uid,
                    authorUsername: authorName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    likeCount: 0,
                    likedBy: []
                });
                document.getElementById('addPhotoModal').classList.add('hidden');
                addPhotoForm.reset();
                if(window.showToast) window.showToast("Publicado!", "success");
            } catch (err) { console.error(err); }
        });
    }

    fetchPhotos();
});

// ===================================
    // == LÓGICA DO MODAL (ABRIR/FECHAR) COM PROTEÇÃO ==
    // ===================================
    const openModalBtn = document.getElementById('showAddPhotoModalBtn');
    const modal = document.getElementById('addPhotoModal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // Função para abrir
    if (openModalBtn) {
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            // --- VERIFICAÇÃO DE LOGIN ---
            // Tenta pegar o usuário do Firebase ou da variável global
            const user = (typeof firebase !== 'undefined' && firebase.auth().currentUser) || window.currentUser;

            if (!user) {
                // Se NÃO estiver logado, manda para o login
                // Ajuste "login.html" se o nome do seu arquivo for diferente (ex: index.html)
                window.location.href = "login.html"; 
                return; 
            }

            // Se estiver logado, abre o modal normalmente
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex'; 
            }
        });
    }

    // Função para fechar
    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    // Eventos de Fechar
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Fechar clicando fora da janela
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
