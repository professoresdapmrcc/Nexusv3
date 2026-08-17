  document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO DE ACESSO (APENAS ESTAGIÁRIO + ADMIN) ---
    const cargosPermitidos = [
        "Estagiário(a)",
        "Conselheiro(a)",
        "Vice-Líder",
        "Líder"
    ];

    // --- 2. TRAVA DE SEGURANÇA (FIREBASE GLOBAL) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDocRef = db.collection("users").doc(user.uid);
                const doc = await userDocRef.get();

                if (doc.exists) {
                    const userData = doc.data();
                    const cargoUsuario = userData.cargo;
                    const roleUsuario = userData.role;

                    // Verifica se é Estagiário ou Admin
                    if (cargosPermitidos.includes(cargoUsuario) || roleUsuario === "admin") {
                        console.log(`Acesso liberado: ${cargoUsuario || 'Admin'}`);
                        document.body.style.display = "block"; // Libera a página
                    } else {
                        alert(`Acesso negado. Esta área é exclusiva para Estagiários.`);
                        window.location.href = "index.html";
                    }
                } else {
                    window.location.href = "login.html";
                }
            } catch (error) {
                console.error("Erro na verificação:", error);
                window.location.href = "login.html";
            }
        } else {
            window.location.href = "login.html";
        }
    });
    
            const usefulLinks = [
                { name: 'Atas de Reuniões', url: 'https://www.policiarcc.com/t31762-prof-cons-atas-de-reunioes-do-conselho', icon: 'fa-solid fa-handshake' },
                { name: 'Script de Admissão', url: 'https://www.policiarcc.com/t35034-prof-cons-script-do-teste-de-admissao', icon: 'fa-solid fa-file-signature' },
                { name: 'Aval. Propostas', url: '/companhia/conselho/proposta.html', icon: 'fa-solid fa-file-powerpoint' },
                { name: 'Aval. Promoções', url: '/companhia/conselho/promocoes.html', icon: 'fa-solid fa-user-graduate' },
                { name: 'Cód. Disciplina', url: 'https://www.policiarcc.com/t35032-prof-cons-codigo-de-disciplina-e-etica-do-conselho', icon: 'fa-solid fa-gavel' },
                { name: 'Portal de Envio', url: 'https://www.policiarcc.com/t31561-prof-cons-portal-de-envio', icon: 'fa-solid fa-paper-plane' },
                { name: 'Relatório Função', url: 'https://forms.gle/3jkYthrZmvboxpgb8', icon: 'fa-solid fa-list-check' },
                { name: 'Diário de Funções', url: 'https://docs.google.com/spreadsheets/d/1koWcj8bqXub5TeGYMO91QkiFHCjvUEN4EP9SKG_beOY/edit#gid=180977624', icon: 'fa-solid fa-calendar-week' },
                { name: 'Orient. Estagiários', url: 'https://www.policiarcc.com/t20673-prof-cons-conselho-aqui-vou-eu', icon: 'fa-solid fa-person-chalkboard' },
                { name: 'Regimento Interno', url: 'https://sites.google.com/view/nexusprof/regimento-interno?authuser=0', icon: 'fa-solid fa-landmark' },
                { name: 'Código Penal', url: 'https://sites.google.com/view/nexusprof/c%C3%B3digo-penal-dos-professores?authuser=0', icon: 'fa-solid fa-book-skull' },
                { name: 'Justificar Ausência', url: 'https://forms.gle/QcZaZ63Wx49MokGq8', icon: 'fa-solid fa-user-clock' },
                { name: 'Rel. Professores', url: 'https://docs.google.com/spreadsheets/d/1L5t72kbIlRnHRp_OaOMbHdDjkOy_3QlGJdYqarhh-ac/edit#gid=1528066399', icon: 'fa-solid fa-chalkboard-user' },
                { name: 'Rel. Coordenadores', url: 'https://docs.google.com/spreadsheets/d/1EzyhvK4zEI_940ATXnaNQ8KUCxr-2Xj0qRY1MS6extI/edit#gid=1528066399', icon: 'fa-solid fa-people-roof' },
                { name: 'Rel. Graduadores', url: 'https://docs.google.com/spreadsheets/d/154ToDPq8wakIM9W0LIiM_TExwAjunT696pqq0xmP2I8/edit#gid=230455547', icon: 'fa-solid fa-user-tie' },
                { name: 'Consulta Desempenho', url: 'https://www.policiarcc.com/t35830-prof-consulta-de-desempenho', icon: 'fa-solid fa-magnifying-glass-chart' },
                { name: 'Ouvidoria', url: 'https://www.policiarcc.com/t35734-prof-ouvidoria', icon: 'fa-solid fa-ear-listen' },
                { name: 'Requerimentos', url: 'https://www.policiarcc.com/t32243-prof-requerimentos-da-companhia', icon: 'fa-solid fa-file-import' },
                { name: 'Quadro de Erros', url: 'https://www.policiarcc.com/t32246-prof-quadro-de-erros-advertencias', icon: 'fa-solid fa-circle-exclamation' },
                { name: 'Discord', url: 'http://bit.ly/dcprof', icon: 'fa-brands fa-discord' },
                { name: 'Nexus', url: 'http://bit.ly/NEXUSPROF', icon: 'fa-solid fa-globe' }
            ];
            
            const linksContainer = document.querySelector('#useful-links-container');
            linksContainer.innerHTML = usefulLinks.map(link => `
                <a href="${link.url}" target="_blank" class="w-36 flex flex-col items-center justify-center text-center p-4 glass-card hover:border-violet-400/50 hover:bg-white/5 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                    <i class="${link.icon} text-2xl text-violet-400 mb-2"></i>
                    <span class="text-xs font-medium text-white">${link.name}</span>
                </a>
            `).join('');


            const allModals = document.querySelectorAll('.modal');
            
            document.querySelectorAll('[data-modal-target]').forEach(button => {
                button.addEventListener('click', () => {
                    const modal = document.querySelector(button.dataset.modalTarget);
                    if (modal) {
                        modal.style.display = 'flex';
                        setTimeout(() => {
                            modal.classList.add('show');
                        }, 10);
                        document.body.style.overflow = 'hidden';
                    }
                });
            });

            const closeModal = (modal) => {
                if (modal) {
                    modal.classList.remove('show');
                    const onTransitionEnd = () => {
                        modal.style.display = 'none';
                        modal.removeEventListener('transitionend', onTransitionEnd);
                    };
                    modal.addEventListener('transitionend', onTransitionEnd);
                    document.body.style.overflow = 'auto';
                }
            };
            
            const closeAllModals = () => {
                allModals.forEach(modal => {
                    if(modal.style.display === 'flex') {
                          closeModal(modal);
                    }
                });
            }

            allModals.forEach(modal => {
                const closeButton = modal.querySelector('[data-modal-close]');
                if (closeButton) {
                    closeButton.addEventListener('click', () => closeModal(modal));
                }
                modal.addEventListener('click', event => {
                    if (event.target === modal) {
                        closeModal(modal);
                    }
                });
            });
            
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    closeAllModals();
                }
            });


            const copyToClipboard = (text, button) => {
                if (!text) return;
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = text;
                document.body.appendChild(tempTextarea);
                tempTextarea.select();
                try {
                    document.execCommand('copy');
                    const originalHTML = button.innerHTML;
                    
                    button.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Copiado!';
                    button.classList.remove('bg-violet-600', 'hover:bg-violet-700');
                    button.classList.add('bg-green-600', 'cursor-not-allowed');
                    button.disabled = true;

                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                        button.classList.remove('bg-green-600', 'cursor-not-allowed');
                        button.classList.add('bg-violet-600', 'hover:bg-violet-700');
                        button.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.error('Falha ao copiar:', err);
                    button.textContent = 'Erro!';
                }
                document.body.removeChild(tempTextarea);
            };

            document.querySelectorAll('button[data-copy-target]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const targetElement = document.querySelector(e.currentTarget.dataset.copyTarget);
                    if (targetElement) copyToClipboard(targetElement.textContent, e.currentTarget);
                });
            });
            
            document.querySelectorAll('button[data-copy-text]').forEach(button => {
                button.addEventListener('click', (e) => {
                    copyToClipboard(e.currentTarget.dataset.copyText, e.currentTarget);
                });
            });


              const setupGenerator = (inputId, codeId, placeholder, isMultiLine = false, secondInputId = null, secondPlaceholder = null) => {
                const input = document.getElementById(inputId);
                const codeElement = document.getElementById(codeId);
                const secondInput = secondInputId ? document.getElementById(secondInputId) : null;
                if (!input || !codeElement) return;

                const originalCode = codeElement.textContent;

                const updateCode = () => {
                    let newCode = originalCode;
                    
                    let firstReplacement;
                    if (placeholder === '[TAG]') {
                        firstReplacement = input.value ? `[${input.value}]` : '[TAG]';
                    } else {
                        firstReplacement = input.value || placeholder;
                    }
                    newCode = newCode.replace(placeholder, firstReplacement);

                    if (secondInput && secondPlaceholder) {
                       const secondReplacement = secondInput.value || secondPlaceholder;
                       newCode = newCode.replace(secondPlaceholder, secondReplacement);
                    }
                    codeElement.textContent = newCode;
                };

                input.addEventListener('input', updateCode);
                if (secondInput) secondInput.addEventListener('input', updateCode);
            };
            
            setupGenerator('bb-att-tag-assist', 'bb-att-code-assist', '[TAG]');
            setupGenerator('bb-aviso-tag', 'bb-aviso-code', '[TAG]', false, 'bb-aviso-motivo', 'Acrescente aqui o motivo do aviso.');
            setupGenerator('bb-reprov-motivo', 'bb-reprov-code', 'Acrescente aqui o motivo.');
            setupGenerator('bb-fechamento-tag', 'bb-fechamento-code', '[TAG]', false, 'bb-fechamento-ordem', 'XXXX');
        });
z