document.addEventListener("DOMContentLoaded", () => {
    // Detecta o ID do documento pelo atributo do body ou pela URL se estiver vazio
    const urlParams = new URLSearchParams(window.location.search);
    const idDoc = document.body.getAttribute("data-doc") || urlParams.get("id");
    
    if (idDoc) {
        carregarConteudoUniversal(idDoc);
    }
});

async function carregarConteudoUniversal(id) {
    const container = document.getElementById("corpo-documento");
    const titulo = document.getElementById("doc-titulo");
    const subtitulo = document.getElementById("doc-subtitulo");

    if (!window.db) {
        console.error("❌ Firebase não inicializado. Verifique se o config.js foi carregado.");
        return;
    }

    try {
        const doc = await window.db.collection("documentos").doc(id).get();
        
        if (doc.exists) {
            const dados = doc.data();

            // Preenche Título e Subtítulo (Strings do Firebase)
            if (titulo && dados.titulo) titulo.innerText = dados.titulo;
            if (subtitulo && dados.subtitulo) subtitulo.innerText = dados.subtitulo;
            
            if (container) {
                // Injeta o HTML integral
                container.innerHTML = dados.conteudo;
                
                // --- Lógica de Pós-Carregamento ---
                
                // 1. Se tiver índice, configura o scroll suave
                configurarNavegacaoIndice();

                // 2. Se for um SCRIPT de aula, ativa os botões de copiar linha por linha
                if (container.querySelector('.script-content') || document.body.classList.contains('page-script')) {
                    ativarFuncoesDeScript();
                }
                
                // 3. Inicializa event listeners de Accordions/Spoilers injetados
                inicializarSpoilers();
            }
            console.log(`✅ Conteúdo [${id}] renderizado com sucesso.`);
        } else {
            if (container) container.innerHTML = "<div class='error-msg'>Documento não encontrado no banco de dados.</div>";
        }
    } catch (err) {
        console.error("❌ Erro ao buscar no Firestore:", err);
    }
}

// Configura Scroll Suave para o Índice
function configurarNavegacaoIndice() {
    const links = document.querySelectorAll('.indice-container a, .indice-wrapper a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.getElementById(href.substring(1));
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 110, // Ajuste para o header fixo
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Transforma parágrafos de Scripts em linhas clicáveis com botão de copiar
function ativarFuncoesDeScript() {
    const paragrafos = document.querySelectorAll('.script-content p:not(.instruction)');
    
    paragrafos.forEach(p => {
        // Evita duplicar botões caso a função rode duas vezes
        if (p.querySelector('.btn-copy-line')) return;

        const textoOriginal = p.innerText;
        const containerLinha = document.createElement('div');
        containerLinha.className = 'script-line';

        const spanTexto = document.createElement('span');
        spanTexto.className = 'script-text';
        spanTexto.innerText = textoOriginal;

        const btnCopy = document.createElement('button');
        btnCopy.className = 'btn-copy-line';
        btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i>';
        btnCopy.title = "Copiar linha";

        btnCopy.onclick = () => {
            navigator.clipboard.writeText(textoOriginal).then(() => {
                btnCopy.classList.add('copied');
                btnCopy.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => {
                    btnCopy.classList.remove('copied');
                    btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i>';
                }, 2000);
            });
        };

        p.innerText = '';
        containerLinha.appendChild(spanTexto);
        containerLinha.appendChild(btnCopy);
        p.appendChild(containerLinha);
    });
}

// Inicializa lógica de spoilers se houver botões internos (como BBCode)
function inicializarSpoilers() {
    const copyAllBtns = document.querySelectorAll('.btn-copy-all');
    copyAllBtns.forEach(btn => {
        btn.onclick = () => {
            const codeBlock = btn.nextElementSibling;
            if (codeBlock && codeBlock.classList.contains('bbcode-block')) {
                navigator.clipboard.writeText(codeBlock.innerText).then(() => {
                    btn.innerText = 'COPIADO!';
                    setTimeout(() => btn.innerText = 'COPIAR BBCODE', 2000);
                });
            }
        };
    });
}