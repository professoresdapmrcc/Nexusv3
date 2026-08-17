document.addEventListener("DOMContentLoaded", () => {
    // Identifica qual aula carregar baseado no atributo do body
    const aulaParaCarregar = document.body?.getAttribute("data-aula") || "cro";
    carregarConteudoAulaLocal(aulaParaCarregar);
});

function obterBancoFirestore() {
    if (window.db) return window.db;

    if (window.firebase && firebase.apps && firebase.apps.length && firebase.firestore) {
        window.db = firebase.firestore();
        return window.db;
    }

    return null;
}

function aguardarBancoFirestore(tentativas = 40, intervalo = 100) {
    return new Promise((resolve, reject) => {
        const tentar = () => {
            const banco = obterBancoFirestore();

            if (banco) {
                resolve(banco);
                return;
            }

            tentativas -= 1;

            if (tentativas <= 0) {
                reject(new Error("Banco de dados não inicializado."));
                return;
            }

            setTimeout(tentar, intervalo);
        };

        tentar();
    });
}

async function carregarConteudoAulaLocal(idAula) {
    const container = document.getElementById("corpo-script");
    const titulo = document.getElementById("aula-titulo");
    const subtitulo = document.getElementById("aula-subtitulo");

    let banco;

    try {
        banco = await aguardarBancoFirestore();
    } catch (err) {
        console.error("Banco de dados não inicializado:", err);

        if (container) {
            container.innerHTML = '<p class="instruction instruction-attention">Não foi possível conectar ao servidor. Atualize a página em alguns segundos.</p>';
        }

        return;
    }

    banco.collection("scripts_aulas").doc(idAula).get().then((doc) => {
        if (doc.exists) {
            const dados = doc.data();

            // 1. Injeta o HTML bruto do Firebase
            if (container) {
                container.innerHTML = dados.conteudo || "<p>Conteúdo vazio.</p>";
                
                // 2. Processa o conteúdo (botões de cópia, spoilers, etc)
                requestAnimationFrame(() => {
                    processarScriptCompleto(container);
                });
            }

            // 3. Preenche títulos
            if (titulo) titulo.innerText = dados.titulo || "Sem título";
            if (subtitulo) subtitulo.innerText = dados.subtitulo || "";

            console.log(`✅ Script [${idAula}] carregado com sucesso.`);
        } else {
            if (container) container.innerHTML = "<p>Aula não encontrada no servidor.</p>";
        }
    }).catch(err => {
        console.error("Erro ao buscar aula:", err);

        if (container) {
            container.innerHTML = '<p class="instruction instruction-attention">Erro ao buscar a aula no servidor.</p>';
        }
    });
}

// Função para os botões VIA SLIDE / VIA HABBO
window.alternarAula = function(tipo) {
    const container = document.getElementById("corpo-script");
    const secaoFinal = document.getElementById('secao-final');
    
    // 1. Lista de todos os IDs de conteúdo possíveis no seu sistema
    const todasAbas = ['slide', 'habbo', 'ori_1', 'ori_2', 'ori_3', 'ori_4', 'ori_5'];
    
    // 2. Esconde ABSOLUTAMENTE TUDO antes de mostrar o novo
    todasAbas.forEach(id => {
        const el = document.getElementById('conteudo-' + id);
        if (el) el.style.display = 'none';
    });

    // 3. Mostra apenas a aba que foi clicada
    const abaAlvo = document.getElementById('conteudo-' + tipo);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        // Faz um scroll suave para o início do conteúdo da orientação
        abaAlvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 4. Mostra a conclusão apenas se uma aba válida for selecionada
    if (secaoFinal) {
        secaoFinal.style.display = 'block';
    }

    // 5. RE-PROCESSA os botões de cópia para o novo texto que apareceu
    if (typeof processarScriptCompleto === "function") {
        processarScriptCompleto(container);
    }
};
function normalizarLinhasSoltas(root) {
    // Passo 1: dentro de cada <p> existente, substituir <br> por espaço
    // para evitar que quebras de linha virem cards separados.
    root.querySelectorAll("p").forEach(p => {
        if (p.closest(".bbcode-block, .script-line, .script-text, .aula-selector, .tabs-buttons")) return;
        p.querySelectorAll("br").forEach(br => {
            // Só substituímos se o <br> está separando texto dentro do mesmo parágrafo
            const espacoNode = document.createTextNode(" ");
            br.parentNode.replaceChild(espacoNode, br);
        });
        // Normaliza os nós de texto adjacentes que podem ter sido criados
        p.normalize();
    });

    const parents = [root, ...root.querySelectorAll("div, section, article, details")];
    // BR foi removido do Set — não deve mais ser tratado como inline agrupável
    const inlineTags = new Set(["A", "B", "CODE", "EM", "I", "MARK", "SMALL", "SPAN", "STRONG", "U"]);

    parents.forEach(parent => {
        if (parent.closest(".bbcode-block, .script-line, .script-text, .aula-selector, .tabs-buttons")) return;

        // Passo 2: dentro deste parent, substituir <br> soltos (fora de <p>) por espaços
        // antes de agrupar — para não criar múltiplos <p> a partir de um único bloco de texto
        Array.from(parent.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
                const espaco = document.createTextNode(" ");
                parent.replaceChild(espaco, node);
            }
        });

        const nodes = Array.from(parent.childNodes);
        let grupo = [];

        const ehTextoUtil = node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0;
        const ehInline = node => node.nodeType === Node.ELEMENT_NODE && inlineTags.has(node.tagName);

        const fecharGrupo = () => {
            if (!grupo.length) return;

            const temConteudo = grupo.some(node => node.nodeType !== Node.TEXT_NODE || node.textContent.trim().length > 0);
            const primeiro = grupo[0];

            if (temConteudo && primeiro.parentNode === parent) {
                const p = document.createElement("p");
                parent.insertBefore(p, primeiro);
                grupo.forEach(node => p.appendChild(node));
            }

            grupo = [];
        };

        nodes.forEach(node => {
            if (ehTextoUtil(node) || ehInline(node)) {
                grupo.push(node);
                return;
            }

            if (node.nodeType === Node.TEXT_NODE) {
                if (grupo.length) grupo.push(node);
                return;
            }

            fecharGrupo();
        });

        fecharGrupo();
    });
}

function ehLinhaCopiavel(elemento) {
    if (!elemento || !elemento.innerText || elemento.innerText.trim().length < 2) return false;
    if (elemento.closest(".bbcode-block, .script-line, .script-text, .instruction, summary, button")) return false;

    const possuiBlocoInterno = elemento.querySelector(
        "article, button, details, div, form, h1, h2, h3, h4, h5, h6, ol, p, section, table, ul, .bbcode-block, .script-line, .aula-selector"
    );

    return !possuiBlocoInterno;
}

// --- FUNÇÃO DE PROCESSAMENTO DE LINHAS ATUALIZADA ---
function processarScriptCompleto(container) {
    normalizarLinhasSoltas(container);

    // Pegamos p, li e div simples para tolerar HTML vindo do Firebase/Gemini em formatos diferentes.
    const linhas = container.querySelectorAll("p, li, div");
    
    linhas.forEach(elemento => {
        if (!ehLinhaCopiavel(elemento)) return;

        criarEstruturaCopia(elemento, elemento.innerHTML);
    });

    // BBCODE - Botão de copiar o bloco inteiro
    const bbcodeBlocks = container.querySelectorAll(".bbcode-block");
    bbcodeBlocks.forEach(bloco => {
        // Verifica se o botão já existe antes do bloco
        const irmaoAnterior = bloco.previousElementSibling;
        if (irmaoAnterior && irmaoAnterior.classList.contains('btn-copy-all')) return;

        const btnAll = document.createElement("button");
        btnAll.className = "btn-copy-all";
        btnAll.innerHTML = '<i class="fa-solid fa-code"></i> COPIAR CÓDIGO';
        btnAll.onclick = (e) => {
            e.preventDefault();
            // Pegamos o innerText para garantir que quebras de linha sejam respeitadas
            copiarTexto(bloco.innerText.trim(), btnAll, true);
        };
        bloco.parentNode.insertBefore(btnAll, bloco);
    });

    // Garante que spoilers comecem fechados (opcional, já que você usa abas agora)
    container.querySelectorAll("details").forEach(d => {
        if (!d.classList.contains('indice-wrapper')) {
            d.removeAttribute("open");
        }
    });
}

function criarEstruturaCopia(elemento, htmlOriginal) {
    const wrapper = document.createElement("div");
    wrapper.className = "script-line";

    const textoDiv = document.createElement("div");
    textoDiv.className = "script-text";
    textoDiv.innerHTML = htmlOriginal;

    const btn = document.createElement("button");
    btn.className = "btn-copy-line";
    btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    
    const textoPuro = elemento.innerText.trim();
    btn.onclick = () => copiarTexto(textoPuro, btn, false);

    wrapper.appendChild(textoDiv);
    wrapper.appendChild(btn);
    elemento.parentNode.replaceChild(wrapper, elemento);
}

// Função de cópia com feedback
function copiarTexto(texto, btnElement, isCode) {
    const copiarComFallback = () => {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        return Promise.resolve();
    };

    const acaoCopiar = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(texto)
        : copiarComFallback();

    acaoCopiar.then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.classList.add("copied");
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i>';
        
        setTimeout(() => {
            btnElement.classList.remove("copied");
            btnElement.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error("Erro ao copiar texto:", err);
    });
}