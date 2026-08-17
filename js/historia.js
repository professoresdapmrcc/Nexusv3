/**
 * DADOS DA HISTÓRIA - COMPANHIA DOS PROFESSORES
 */
const HISTORY_DATA = [
  {
    year: 'O Início',
    title: 'A Gênese da Instituição',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        O ano de 2011 marca o ponto zero de nossa trajetória. Em um cenário onde a instrução militar carecia de aprofundamento acadêmico, a semente da <strong class="text-white font-semibold">Companhia dos Professores</strong> foi plantada. Nossa missão primordial nasceu de um ideal nobre e ambicioso: democratizar o conhecimento acadêmico dentro da Polícia RCC. 
      </p>
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95 mt-6">
         O foco inicial não era apenas o militarismo, mas a elevação intelectual da tropa através das disciplinas do currículo escolar tradicional — Português, Matemática e História. Era o início de uma cultura onde a caneta passaria a ser tão poderosa quanto a patente.
      </p>
    `,
    image: null,
    leaders: []
  },
  {
    year: '2012',
    title: 'A Grande Reestruturação',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Após um breve hiato estratégico, 2012 representou o renascimento estrutural da companhia. Uma nova mentalidade de gestão assumiu o comando, redirecionando o foco puramente escolar para algo mais alinhado à realidade da instituição: as <strong class="text-white font-semibold">Aulas Gerais</strong>. Foi neste ano que as bases modernas da companhia foram cimentadas, estabelecendo protocolos que perduram até hoje.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div class="bg-transparent border border-white/20 rounded-xl p-6">
              <div class="flex items-center gap-3 mb-4 pb-3 border-b border-white/20">
                  <i class="fas fa-flag text-purple-300"></i>
                  <h4 class="text-sm font-bold text-gray-100 uppercase tracking-widest">Marco Histórico</h4>
              </div>
              <p class="text-sm text-gray-200">O professor <strong>ApocalipseAnjo</strong> ministrou a histórica aula de "Disciplina Policial", oficializando o retorno das atividades.</p>
          </div>
          <div class="bg-transparent border border-white/20 rounded-xl p-6">
              <div class="flex items-center gap-3 mb-4 pb-3 border-b border-white/20">
                  <i class="fas fa-layer-group text-purple-300"></i>
                  <h4 class="text-sm font-bold text-gray-100 uppercase tracking-widest">Estrutura</h4>
              </div>
              <p class="text-sm text-gray-200">Implementação do cargo de <strong>Coordenador</strong>, peça chave para a organização das salas de aula.</p>
          </div>
      </div>
    `,
    image: "URL_DA_IMAGEM_2012", // Legenda original: Primeira Sala de Aula Oficial (2012)
    leaders: [
        { nickname: "Well31", role: "Líder" },
        { nickname: "GehRuiz", role: "Vice-Líder" }
    ],
    extra: `<div class="flex items-center gap-6 p-6 border border-yellow-500/30 rounded-xl bg-yellow-500/5 mt-6">
             <i class="fas fa-trophy text-yellow-500 text-2xl"></i>
             <div>
                 <h4 class="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-1">Reconhecimento RCC Awards</h4>
                 <p class="text-xs text-gray-300">Well31 (Líder de Tarefas) e ?x:Andrey:x? (Melhor Professor).</p>
             </div>
        </div>`
  },
  {
    year: '2013',
    title: 'Transição e Legado',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Março de 2013 foi um momento de celebração e transição. Com a ascensão do líder Well31 à supremacia da RCC, o bastão da liderança foi passado adiante. Este ano foi marcado pela consolidação dos processos pedagógicos e pela prova de que a instituição possuía uma base sólida o suficiente para prosperar sob nova gestão.
      </p>
    `,
    image: "URL_DA_IMAGEM_2013", // Legenda original: Expansão do Corpo Docente (2013)
    leaders: [
        { nickname: "LariiMattos", role: "Líder" },
        { nickname: "-DarkShot_", role: "Vice-Líder" },
        { nickname: "LuddT", role: "Vice-Líder" }
    ]
  },
  {
    year: '2014',
    title: 'A Era da Expansão Física',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        O ano de 2014 foi caracterizado por um dinamismo sem precedentes. A demanda por conhecimento cresceu exponencialmente, obrigando a companhia a realizar uma expansão física de suas instalações. Foi necessário inaugurar múltiplas salas de aula simultâneas para comportar o efetivo interessado.
      </p>
      <div class="p-5 border-l-4 border-purple-500 rounded-r-xl bg-white/5 mt-8">
            <p class="text-sm text-gray-200">
                <strong class="text-purple-300">Destaque Operacional:</strong> O ano foi dominado pela excelência docente de <span class="bg-purple-500/20 px-2 rounded text-purple-200">-Damelly..</span>, que deteve 40% das aulas ministradas.
            </p>
      </div>
    `,
    image: "URL_DA_IMAGEM_2014", // Legenda original: Salas de Instrução A e B
    leaders: [
        { nickname: "-Luc@sMaciel-", role: "Líder" },
        { nickname: "-Gold.White", role: "Líder" },
        { nickname: "x-emeli-x", role: "Vice-Líder" },
        { nickname: "MeniinadeOuro.", role: "Vice-Líder" }
    ]
  },
  {
    year: '2015',
    title: 'Estabilidade Institucional',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Enquanto os anos anteriores foram de expansão explosiva, 2015 foi o ano da estabilidade e maturação. Sob o comando de veteranos altamente experientes, a companhia focou na manutenção da qualidade e na padronização rigorosa dos métodos de ensino. Foi um período de "calmaria produtiva", onde os processos internos foram refinados à perfeição.
      </p>
    `,
    leaders: [
        { nickname: "?x:Andrey:x?", role: "Líder" },
        { nickname: "-Edward81", role: "Líder" }
    ]
  },
  {
    year: '2017',
    title: 'Inovação Pedagógica',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Após um período estratégico de recesso, 2017 marcou o retorno com foco total na <strong>Inovação Curricular</strong>. A liderança compreendeu que diferentes patentes exigiam diferentes níveis de profundidade no conhecimento. Assim, o ensino foi segmentado e especializado para Sargentos e Subtenentes.
      </p>
      <div class="bg-transparent border border-white/20 rounded-xl p-6 mt-8">
          <div class="flex items-center gap-3 mb-4 pb-3 border-b border-white/20">
              <i class="fas fa-book-reader text-purple-300"></i>
              <h4 class="text-sm font-bold text-gray-100 uppercase tracking-widest">Projeto de Aperfeiçoamento</h4>
          </div>
          <p class="text-sm text-gray-200">Idealizado pelo visionário <strong>@BrunoHery@</strong>, este projeto introduziu módulos avançados de gramática e oratória.</p>
      </div>
    `,
    leaders: [{ nickname: "Simi23", role: "Líder" }]
  },
  {
    year: '2018',
    title: 'Novos Horizontes',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        O ano de 2018 trouxe uma revolução na porta de entrada da companhia. Foi identificado que muitos talentos eram perdidos por falta de treinamento prático. Em resposta, criou-se o programa de estágio e uma nova hierarquia interna.
      </p>
    `,
    leaders: [
        { nickname: "TeoLopes98", role: "Líder" },
        { nickname: "?x:Andrey:x?", role: "Líder" },
        { nickname: "Oo=dudu=pq..", role: "Líder" }
    ]
  },
  {
    year: '2019',
    title: 'A Era da Especialização',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Com o crescimento exponencial da companhia, a gestão centralizada tornou-se inviável. 2019 foi o ano da descentralização e da especialização. A companhia transformou-se em uma organização complexa, subdividida em departamentos autônomos.
      </p>
    `,
    leaders: [
        { nickname: ".MeninaOculta.", role: "Líder" },
        { nickname: "DoutorAragom", role: "Líder" }
    ]
  },
  {
    year: '2021',
    title: 'Democratização do Ensino',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Sob a gestão visionária de Akantcha, 2021 derrubou muros. A campanha "Portas Abertas" redefiniu o conceito de pertencimento na companhia, permitindo que conhecimentos externos fossem integrados.
      </p>
    `,
    leaders: [{ nickname: "Akantcha", role: "Líder" }]
  },
  {
    year: '2022',
    title: 'Cultura e Intelecto',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        A companhia transcendeu a sala de aula física. Em 2022, o foco expandiu-se para o desenvolvimento cultural e intelectual em múltiplas plataformas, integrando-se massivamente com o Discord.
      </p>
    `,
    leaders: [{ nickname: ",-Rapunzel", role: "Líder" }]
  },
  {
    year: '2023',
    title: 'Humanização do Ensino',
    content: `
      <p class="text-lg text-gray-200 leading-8 font-light text-justify tracking-wide opacity-95">
        Uma mudança de paradigma. O ensino militar deixou de ser apenas técnico para se tornar humano e construtivo. O foco migrou para o desenvolvimento das <em>Soft Skills</em>.
      </p>
    `,
    leaders: [{ nickname: "-Kevinho1Habbo-", role: "Líder" }]
  },
  {
    year: 'Hoje',
    title: 'O Legado Continua',
    content: `
      <p class="text-center text-gray-300 text-lg max-w-3xl mx-auto font-light leading-relaxed mb-12">
        Hoje, a Companhia dos Professores é liderada por uma trindade de excelência, unindo experiência, inovação e dedicação.
      </p>
      
      <div class="w-full flex flex-col xl:flex-row items-center justify-center gap-8">
          <div class="w-full max-w-[280px] p-6 border border-white/10 rounded-2xl text-center bg-white/5 transition-all hover:border-purple-500/50">
              <img src="URL_WANDERSON" class="w-32 mx-auto drop-shadow-lg mb-4" alt=":_Wanderson_:">
              <h4 class="text-white font-bold text-xl">:_Wanderson_:</h4>
              <span class="text-purple-400 text-xs uppercase font-bold tracking-widest">Vice-Líder</span>
          </div>

          <div class="w-full max-w-[300px] p-8 border border-purple-500/50 rounded-2xl text-center bg-purple-900/10 shadow-[0_0_40px_rgba(168,85,247,0.2)] scale-105 z-10 transition-all hover:bg-purple-900/20">
              <div class="mb-4 text-[10px] text-white bg-purple-600 inline-block px-3 py-1 rounded-full uppercase font-bold">Liderança</div>
              <img src="URL_AMY" class="w-36 mx-auto drop-shadow-xl mb-4" alt="Amy.Love.Girl">
              <h4 class="text-white font-black text-2xl">Amy.Love.Girl</h4>
              <span class="text-pink-400 text-xs uppercase font-bold tracking-widest">Líder</span>
          </div>

          <div class="w-full max-w-[280px] p-6 border border-white/10 rounded-2xl text-center bg-white/5 transition-all hover:border-purple-500/50">
              <img src="URL_GABRIEL" class="w-32 mx-auto drop-shadow-lg mb-4" alt="Sr.Gabriel.">
              <h4 class="text-white font-bold text-xl">Sr.Gabriel.</h4>
              <span class="text-purple-400 text-xs uppercase font-bold tracking-widest">Vice-Líder</span>
          </div>
      </div>
    `,
    image: null,
    leaders: []
  }
];

let currentIndex = 0;

/**
 * Inicialização
 */
function init() {
    renderTimelineNav();
    updateView();
}

/**
 * Renderiza os botões da barra lateral
 */
function renderTimelineNav() {
    const nav = document.getElementById('timeline-nav');
    if (!nav) return;

    nav.innerHTML = HISTORY_DATA.map((item, index) => `
        <button onclick="goToYear(${index})" class="w-full text-left px-6 py-4 rounded-xl transition-all duration-300 group ${index === currentIndex ? 'bg-purple-600 shadow-lg shadow-purple-900/20' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}">
            <div class="text-xs uppercase tracking-tighter mb-1 ${index === currentIndex ? 'text-purple-200' : 'text-gray-400'}">Linha do Tempo</div>
            <div class="font-black text-xl">${item.year}</div>
            ${index === currentIndex ? '<div class="h-0.5 bg-white/40 mt-2 w-full"></div>' : ''}
        </button>
    `).join('');
}

/**
 * Atualiza o conteúdo principal
 */
function updateView() {
    const data = HISTORY_DATA[currentIndex];
    const mainArea = document.getElementById('main-content-area');
    const headerYear = document.getElementById('current-year-header');
    const scrollContainer = document.getElementById('content-scroll-container');

    if (headerYear) headerYear.innerText = data.year;

    // Gerar HTML de imagem se houver
    const imageHtml = data.image ? `
        <div class="w-full relative rounded-xl overflow-hidden border border-white/20 shadow-lg group my-8 bg-white/5 h-[250px]">
            <img src="${data.image}" class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" onerror="this.src='https://placehold.co/800x250/180820/purple?text=Imagem+da+História'">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-6">
                <span class="text-white/90 font-semibold text-sm tracking-widest border-l-4 border-purple-500 pl-3">Visualização Histórica</span>
            </div>
        </div>
    ` : '';

    // Líderes dos anos anteriores
    const leadersListHtml = (data.leaders && data.leaders.length > 0) ? `
        <div class="mt-10 pt-6 border-t border-white/10">
            <p class="text-[10px] uppercase text-gray-400 font-bold mb-4 tracking-wider">Liderança do Período</p>
            <div class="flex flex-wrap gap-4">
                ${data.leaders.map(l => `
                    <div class="bg-white/5 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                        <i class="fas fa-crown text-[10px] text-purple-400"></i>
                        <span class="text-purple-300 font-bold text-sm">@${l.nickname}</span>
                        <span class="text-gray-400 text-xs ml-1">— ${l.role}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    mainArea.innerHTML = `
        <div class="fade-up">
            <h3 class="text-4xl font-black text-white mb-6 tracking-tight">${data.title}</h3>
            ${data.content}
            ${imageHtml}
            ${leadersListHtml}
            ${data.extra || ''}
        </div>
    `;

    if (scrollContainer) scrollContainer.scrollTop = 0;
}

/**
 * Navegação por passos (+1 ou -1)
 */
function changeStep(step) {
    currentIndex = (currentIndex + step + HISTORY_DATA.length) % HISTORY_DATA.length;
    updateView();
    renderTimelineNav();
}

/**
 * Pula para um ano específico
 */
function goToYear(index) {
    if(index === currentIndex) return;
    currentIndex = index;
    updateView();
    renderTimelineNav();
    
    // Fecha sidebar no mobile ao selecionar
    if (window.innerWidth < 1024) {
        toggleSidebar();
    }
}

/**
 * Menu hambúrguer mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
    if (overlay) overlay.classList.toggle('hidden');
}

/**
 * Atalhos de Teclado
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') changeStep(-1);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') changeStep(1);
});

// Inicia a aplicação
init();