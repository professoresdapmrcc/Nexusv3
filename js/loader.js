document.addEventListener("DOMContentLoaded", function() {
    
    // --- FUNÇÃO MÁGICA: Faz os scripts dentro do HTML carregado funcionarem ---
    const executeScripts = (containerElement) => {
        const scripts = containerElement.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Copia todos os atributos (src, type, id, etc.)
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copia o conteúdo interno (se for script inline)
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            
            // Substitui o script "morto" pelo "vivo" ou anexa ao corpo
            // O ideal para bibliotecas externas é anexar ao body
            oldScript.parentNode.removeChild(oldScript);
            document.body.appendChild(newScript);
        });
    };

    // --- CARREGADOR DE COMPONENTES ---
    const loadComponent = (url, elementId) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.text();
            })
            .then(data => {
                const element = document.getElementById(elementId);
                if (element) {
                    // 1. Injeta o HTML (Visual)
                    element.innerHTML = data;
                    
                    // 2. Executa os scripts que vieram junto (Lógica)
                    executeScripts(element); 
                } else {
                    console.warn(`Elemento com ID '${elementId}' não encontrado.`);
                }
            })
            .catch(error => console.error(`Erro ao carregar componente de '${url}':`, error));
    };

    // --- 1. Carregamos o HEADER ---
    fetch('/templates/header.html')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .then(data => {
            // Injeta o HTML no início do body
            document.body.insertAdjacentHTML('afterbegin', data);
        })
        .catch(error => console.error(`Erro ao carregar o header:`, error));

    // --- 2. Carregamos o FOOTER (Onde está o Chat) ---
    // Agora, quando o footer carregar, ele vai rodar a função executeScripts
    // e o seu chat vai funcionar!
    loadComponent('/templates/footer.html', 'footer-placeholder');
});
