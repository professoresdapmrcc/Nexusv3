document.addEventListener("DOMContentLoaded", function() {
    const URL_FOTO_IA = "/imgs/iaprof.png"; 

const BASE_CONHECIMENTO = [
// ===============================================
    // CÓDIGO PENAL DOS PROFESSORES (CPP)
    // ===============================================

    // --- SEÇÃO I: ERROS DE POSTAGEM ---
    {
        chaves: ["dados incorretos", "erro no system", "erro formulario", "dados errados", "erro de postagem","postagem incorreta", "postagem errada","postagem incorreta"],
        titulo: "Dados Incorretos na Postagem",
        resposta: `De acordo com o CPP (Cap. III, Seção I, Art. 1°, I), postar aula com dados incorretos no formulário ou no RCC System configura <b>Erro de Postagem</b>. <br><br>
        • <b>Punição:</b> Registro de erro de postagem. <br>
        • <b>Observação:</b> O acúmulo de três (3) erros resulta em uma Notificação.`
    },
    {
        chaves: ["postagem duplicada", "postei duas vezes", "aula repetida", "duplicada","postagem repetida","aula repetida"],
        titulo: "Postagem Duplicada",
        resposta: `Conforme o CPP (Cap. III, Seção I, Art. 1°, II), postagens duplicadas são classificadas como <b>Erros de Postagem</b>. <br><br>
        • <b>Consequência:</b> A aula será anulada e haverá o registro do erro. <br>
        • <b>Observação:</b> O acúmulo de três (3) erros gera uma Notificação.`
    },
    {
        chaves: ["postar própria aula", "minha propria aula", "autopostagem","aula própria","autopostagem"],
        titulo: "Autopostagem de Relatórios",
        resposta: `O Art. 1°, III da Seção I proíbe expressamente postar as próprias aulas nos relatórios do subfórum. <br><br>
        • <b>Punição:</b> Registro de erro de postagem e anulação da aula.`
    },

    // --- SEÇÃO II: APLICAÇÃO INCORRETA ---
    {
        chaves: ["aplicar cac na sala de aula", "cac fora do ci", "aula local errado", "local incorreto","aula fora do ci"],
        titulo: "Aplicação em Local Incorreto",
        resposta: `Aplicar cursos em locais não preestabelecidos (como o CAC fora do CI) viola a Seção II, Art. 1°, V do CPP. <br><br>
        • <b>Punição:</b> Notificação e anulação da aula. <br>
        • <b>Reincidência:</b> Punido com 10 medalhas efetivas negativas.`
    },
    {
        chaves: ["aplicar para membro", "aula para professor", "membro da companhia","aula para membro","aula para professor"],
        titulo: "Aplicação para Membro da Companhia",
        resposta: `Segundo o Art. 1°, III da Seção II, é proibido aplicar aulas para membros da própria companhia. <br><br>
        • <b>Punição:</b> Notificação e anulação da aula. <br>
        • <b>Exceção:</b> Não se aplica ao CAC para quem não concluiu a Graduação I.`
    },
    {
        chaves: ["aluno ja aprovado", "aplicar aula repetida", "policial ja aprovado"],
        titulo: "Aplicação de Aula já Aprovada",
        resposta: `Aplicar aula obrigatória para policial já aprovado anteriormente (Art. 1°, I) gera punição. <br><br>
        • <b>Consequência:</b> A aula será anulada e o membro receberá uma Notificação.`
    },

    // --- SEÇÃO III: NEGLIGÊNCIA ---
    {
        chaves: ["atraso postagem", "postar depois de uma hora", "demorei postar", "tempo limite","atraso postagem","tempo limite"],
        titulo: "Negligência de Prazo (Postagem)",
        resposta: `O Art. 1°, X da Seção III exige que a postagem ocorra em até <b>uma (01) hora</b> após a aula. <br><br>
        • <b>Punição:</b> Notificação. <br>
        • <b>Reincidência:</b> 10 medalhas efetivas negativas.`
    },
    {
        chaves: ["nao graduei", "prazo graduação", "7 dias graduar", "atraso graduacao","atraso na graduacao"],
        titulo: "Atraso na Graduação do Cargo",
        resposta: `Não realizar a graduação do cargo no prazo de 7 dias (Art. 1°, XI) é infração grave. <br><br>
        • <b>Punição:</b> Expulsão (Professores) ou Rebaixamento (Coordenadores).`
    },
    {
        chaves: ["abandonar aula", "negar aula", "abandonar aplicacao","nao aplicar","abandonar aplicacao","abandonar aplicacao"],
        titulo: "Abandono de Aplicação",
        resposta: `Negar ou abandonar aplicações sem motivo plausível (Art. 1°, VII) configura negligência. <br><br>
        • <b>Punição:</b> Notificação. <br>
        • <b>Reincidência:</b> Perda de 10 medalhas efetivas negativas.`
    },

    // --- SEÇÃO IV E V: CONDUTA E SCRIPT ---
    {
        chaves: ["pulei linha", "pulo de script", "pulei 4 linhas", "erro de conteudo","erro de conteudo"],
        titulo: "Pulo de Script",
        resposta: `O pulo de conteúdo (Seção V) é penalizado conforme a gravidade: <br><br>
        • <b>Até 4 linhas:</b> -50 medalhas efetivas negativas. <br>
        • <b>5 a 6 linhas:</b> -50 medalhas (Praças) ou Advertência (Oficiais). <br>
        • <b>Mais de 6 linhas:</b> Rebaixamento e expulsão.`
    },
    {
        chaves: ["comportamento rcc", "conduta impropria", "valores rcc", "etica policial","conduta rcc"],
        titulo: "Conduta Imprópria",
        resposta: `Atos contra os valores da RCC ou ética policial (Seção IV) geram punição gradativa. <br><br>
        • <b>Punição:</b> De Notificação até Exoneração por tempo indeterminado.`
    },

    // --- SEÇÃO VI A IX: CRIMES GRAVES ---
    {
        chaves: ["mentir", "falsificar", "dados falsos meta", "falsificacao","falsifiquei"],
        titulo: "Falsificação de Informação",
        resposta: `Falsificar dados para meta ou omitir informações ao SPP (Seção VI) é crime grave. <br><br>
        • <b>Punição:</b> De Advertência Interna até Exoneração.`
    },
    {
        chaves: ["vazar", "compartilhar script", "vazar grupo", "quebra de sigilo","fofoca","fofoquei"],
        titulo: "Quebra de Sigilo",
        resposta: `Vazar scripts ou informações de grupos internos/conselho (Seção VII) gera punição severa. <br><br>
        • <b>Punição:</b> De Advertência Interna até Exoneração.`
    },
    {
        chaves: ["abuso", "humilhar", "usar cargo", "abuso de poder", "poder hierarquico"],
        titulo: "Abuso de Poder",
        resposta: `Usar poder hierárquico para meta ou atitudes vexatórias (Seção VIII) é proibido. <br><br>
        • <b>Punição:</b> De Notificação até Expulsão.`
    },
    {
        chaves: ["amigo", "favorecer", "nepotismo", "amizade promocao","amizade"],
        titulo: "Nepotismo",
        resposta: `Favorecer amigos ou familiares em promoções ou avaliações de grupos (Seção IX). <br><br>
        • <b>Punição:</b> De Advertência Interna até Exoneração.`
    },

    // --- CAPÍTULO IV: JUSTIÇA E RECURSOS ---
    {
        chaves: ["denunciar", "fazer denuncia", "instancia", "denuncia"],
        titulo: "Direito de Denúncia",
        resposta: `Todo membro pode apresentar denúncia às instâncias (SPP, Conselho ou Liderança) ao constatar infrações (Cap. IV, Art. 3°).`
    },
    {
        chaves: ["recurso", "recorrer", "7 dias recurso", "recorrer punicao"],
        titulo: "Interposição de Recursos",
        resposta: `O prazo para recorrer de decisões ou punições é de <b>até sete (7) dias</b> (Cap. IV, Art. 5°). <br><br>
        • <b>Procedimento:</b> O recurso deve ser dirigido formalmente à Liderança.`
    },
    // --- HIERARQUIA E VAGAS ---
{
    chaves: ["hierarquia", "cargos", "vagas", "quais os cargos", "quantas vagas", "vaga", "cargo","hierarquia interna", "hierarquia externa", "hierarquia geral"],
    titulo: "Hierarquia Interna e Disponibilidade de Vagas",
    resposta: `De acordo com o Cap. II, Seção I, Art. 1° do RI, a hierarquia interna da companhia dos Professores é constituída por sete (7) cargos que garantem o bom funcionamento do grupo. <br><br>
    Confira os cargos e as respectivas vagas em ordem crescente:<br><br>
    • <b>I - Professor (PROF):</b> 35 vagas.<br>
    • <b>II - Coordenador (Coord.PROF):</b> 15 vagas.<br>
    • <b>III - Graduador (Grad.PROF):</b> 08 vagas.<br>
    • <b>IV - Estagiário (Est.PROF):</b> 05 vagas.<br>
    • <b>V - Conselheiro (Cons.PROF):</b> 08 vagas.<br>
    • <b>VI - Vice-Líder (VL.PROF):</b> 02 vagas.<br>
    • <b>VII - Líder (L.PROF):</b> 01 vaga.<br><br>
    <b>Nota Importante (Art. 2°):</b> Nenhum membro pode desempenhar função não definida na documentação, exceto por necessidade hierárquica ou designação explícita da Liderança.`
},

    // --- IDENTIFICAÇÃO VISUAL (BREVÊS) ---
{
    chaves: ["breve", "cor do breve", "qual breve usar", "farda", "roupa", "visual", "identificacao"],
    titulo: "Identificação Visual e Cores de Brevê",
    resposta: `De acordo com o Cap. II, Seção I, Art. 4º do RI, é obrigatório utilizar a cor do brevê correspondente ao seu cargo para identificação clara. Confira as cores oficiais:<br><br>
    • <b>Professor:</b> 12ª cor da 1ª fileira (Sem HC) e 12ª cor da 3ª fileira (Com HC).<br>
    • <b>Coordenador:</b> 12ª cor da 1ª fileira (Sem HC) e 8ª cor da 3ª fileira (Com HC).<br>
    • <b>Graduador:</b> 10ª cor da 1ª fileira (Sem HC) e 13ª cor da 3ª fileira (Com HC).<br>
    • <b>Estagiário:</b> 11ª cor da 1ª fileira (Sem HC) e 14ª cor da 3ª fileira (Com HC).<br>
    • <b>Conselheiro:</b> 9ª cor da 1ª fileira (Sem HC) e 9ª cor da 3ª fileira (Com HC).`
},

    // --- CURSOS E AULAS ---
{
    chaves: ["cursos", "quais cursos", "aplicar aula", "cac", "cap", "cro", "acl", "meta aula", "onde aplicar"],
    titulo: "Cursos, Metas e Normas de Aplicação",
    resposta: `De acordo com o Cap. II, Seção II do RI, aqui estão as diretrizes completas para a aplicação de cursos:<br><br>
    <b>1. Cursos Disponíveis e Metas (Art. 2°):</b><br>
    • <b>CAC (Obrigatório):</b> Destinado a Sargentos+; contabiliza 50% na meta.<br>
    • <b>CAP (Obrigatório):</b> Destinado a Subtenentes; contabiliza 50% na meta.<br>
    • <b>CRO (Opcional):</b> Destinado a Cabos+; contabiliza 45% na meta.<br>
    • <b>ACL (Opcional):</b> Destinado a Cabos+; contabiliza 45% na meta.<br><br>
    <b>2. Locais Oficiais de Aplicação (§7°):</b><br>
    • <b>ACL, CRO e CAC:</b> Exclusivamente no Centro de Instrução (CI) ou nos cubículos (em Batalhão Auxiliar).<br>
    • <b>CAP:</b> Exclusivamente nas salas de aplicação. Na indisponibilidade destes, permite-se o uso de quartos particulares.<br><br>
    <b>3. Regras Importantes:</b><br>
    • <b>Validação (§1°):</b> Relatórios só são válidos se o aplicador possuir a Graduação I.<br>
    • <b>Cálculo (§5°):</b> A meta é baseada na quantidade de alunos presentes; não é necessário postar múltiplos relatórios para uma mesma aula com vários alunos.<br>
    • <b>Queda de Aluno (§4°):</b> Se o aluno desconectar, o professor deve tirar print do histórico e do perfil offline, hospedar no Imgur e anexar ao relatório.<br>
    • <b>Restrição de Opcionais (§3°):</b> CRO e ACL não podem ser aplicados ao mesmo aluno em um período inferior a 15 dias.`
},

// --- ATIVIDADES DE COORDENADOR ---
{
    chaves: ["coordenador", "aula coordenador", "cop", "cda", "carta de auxilio", "acompanhamento", "orientacao", "meta coordenador","atividade coordenador","aulas que coordenador aplica"],
    titulo: "Atividades e Cursos de Coordenador",
    resposta: `De acordo com o Cap. II, Seção III do RI, as funções e metas do Coordenador são:<br><br>
    <b>1. Cursos e Atividades (Art. 2°):</b><br>
    • <b>COP (Oratória Pública):</b> Opcional (50% meta); destinado a Aspirantes+ com cursos obrigatórios concluídos.<br>
    • <b>CDA (Desenv. Argumentativo):</b> Opcional (50% meta); destinado a Subtenentes+ com cursos obrigatórios concluídos.<br>
    • <b>Acompanhamento:</b> Destinado a professores; contabiliza 50% na meta.<br>
    • <b>Orientações:</b> Destinadas a professores; contabilizam 50% na meta.<br>
    • <b>Carta de Auxílio (Art. 2°, I):</b> Envio obrigatório via MP ao professor escalado até às <b>23h59 BR de quarta-feira</b>.<br><br>
    <b>2. Regras de Aplicação e Validação:</b><br>
    • <b>Validação (§2°):</b> Relatórios só valem se o Coordenador possuir a <b>Graduação II</b> e o professor assistido possuir a Graduação I.<br>
    • <b>Frequência de Opcionais (§6°):</b> COP e CDA não podem ser aplicados ao mesmo aluno em período inferior a 15 dias.<br>
    • <b>Acompanhamento em Quarto Particular (§4°):</b> O professor deve permitir o acesso do coordenador; evitar o acompanhamento gera punição.<br>
    • <b>Limites de Orientação (§5°):</b> É permitida apenas uma orientação por professor na semana, e não se pode repetir uma orientação já recebida anteriormente.`
},

    // --- JUSTIFICATIVAS DE META ---
{
    chaves: ["justificativa", "justificar", "nao bati meta", "perdi meta", "prazo justificativa", "licenca e meta"],
    titulo: "Justificativa de Desempenho e Prazos",
    resposta: `Conforme o Cap. III (Art. 2º e 3º) do RI, as regras para justificar o não cumprimento de meta são:<br><br>
    <b>1. Justificativa Mensal (Art. 2º):</b><br>
    • É permitida <b>uma (01) justificativa mensal</b> para os cargos de Professor a Coordenador.<br>
    • <b>Local:</b> Formulário na página respectiva do NEXUS.<br>
    • <b>Prazo:</b> Deve ser postada até às <b>23h59 de domingo</b>.<br>
    • <b>Restrição:</b> Não pode ser utilizada em semanas consecutivas.<br><br>
    <b>2. Licença e Meta Não Cumprida (Art. 3º):</b><br>
    • <b>Professores e Coordenadores:</b> Se a meta não for cumprida até quarta-feira (23h59 BR), a solicitação de licença após esse prazo na mesma semana pode resultar em <b>advertência interna</b>.<br>
    • <b>Graduadores (Prazos Quinzenais):</b> A mesma punição se aplica se a meta não for batida e a licença for pedida após:<br>
    &nbsp;&nbsp; I - Dia 7 (1ª quinzena).<br>
    &nbsp;&nbsp; II - Dia 22 (2ª quinzena).`
},

   // --- METAS E GRATIFICAÇÕES ---
{
    chaves: ["meta", "metas", "prazos", "horario meta", "medalhas", "ganhar medalhas", "perder meta", "nao bati meta", "justificativa","gratificações","quais as gratificações"],
    titulo: "Metas, Gratificações e Prazos",
    resposta: `Conforme o Cap. III (Art. 1° ao 6°), as regras de desempenho são:<br><br>
    <b>1. Prazos para Cumprimento:</b><br>
    • <b>Professores e Coordenadores:</b> De domingo (00h00) até sábado (23h59) da mesma semana.<br>
    • <b>Graduadores:</b> 1ª quinzena (dia 1 ao 15) e 2ª quinzena (dia 16 ao último dia do mês).<br><br>
    <b>2. Gratificações (Medalhas Efetivas):</b><br>
    • <b>Professor/Coordenador:</b> 10 positivas/semana.<br>
    • <b>Graduador:</b> 25 positivas/quinzena.<br>
    • <b>Estagiário/Conselho:</b> 15 positivas/semana.<br>
    • <b>Liderança:</b> 65 positivas/mês.<br><br>
    <b>3. Penalidades:</b><br>
    • O não cumprimento gera <b>medalhas negativas</b> no mesmo valor da gratificação e uma <b>advertência interna</b>.<br>
    • Duas metas negativas consecutivas resultam em <b>rebaixamento</b> (-50 medalhas) ou <b>expulsão</b> para professores (-100 medalhas).<br><br>
    <b>4. Justificativa:</b><br>
    • Permitida uma (01) por mês via NEXUS, até às 23h59 de domingo, desde que não sejam semanas consecutivas.`
},
    // --- PROMOÇÕES ---
{
    chaves: ["promocao", "ser promovido", "subir de cargo", "requisito promocao", "quero subir", "meta positiva", "proposta aprovada"],
    titulo: "Promoções e Requisitos de Carreira",
    resposta: `A elevação na hierarquia é uma ação honrosa. Conforme o Cap. III, Art. 9° do RI, os critérios são:<br><br>
    <b>1. Requisitos Obrigatórios (§1°):</b><br>
    • <b>Professor a Coordenador:</b> Mínimo de duas (2) metas positivas, sendo obrigatória a da semana da promoção.<br>
    • <b>Coordenador a Graduador:</b> Mínimo de duas (2) metas positivas, sendo obrigatória a da semana da promoção.<br>
    • <b>Graduador a Estagiário:</b> Mínimo de duas (2) metas positivas, sendo obrigatória a da quinzena da promoção.<br>
    • <b>Estagiário a Conselheiro:</b> Estagiar em todos os conselhos e possuir, no mínimo, um <b>Projeto Aprovado (PA)</b> registrado na Ouvidoria.<br><br>
    <b>2. Requisitos Extras (§2°):</b><br>
    Além das metas, pesam na avaliação: presença em atividades, desempenho em subgrupos, envio de propostas, auxílio aos membros, boa ortografia, responsabilidade, pulso firme e ser destaque mensal.<br><br>
    <b>3. Proposta Aprovada (PA) (§4°):</b><br>
    Deve ser solicitada formalmente via Mensagem Privada (MP) à Liderança, mencionando as contribuições relevantes para apreciação.`
},

    // --- COMPROMISSOS ---
    {
        chaves: ["dia da reuniao", "hora da reuniao", "reuniao geral", "reuniao conselho", "aulas gerais"],
        titulo: "Compromissos",
        resposta: `Nossos compromissos oficiais são as reniões gerais, as reuniões do conselho e as aulas gerais (Regimento Interno, Cap. IV): <br><br>
        • <b>Reunião Geral</b>: Quinzenal, aos domingos, às <b>18h BR</b>. <br>
        • <b>Reunião do Conselho</b>: Ocorre conforme demanda da Liderança, aos sábados, às<b> 14h BR</b> (Obrigatória para estagiários+).`
    },

    // --- ENTRADAS E SAÍDAS ---
    {
        chaves: ["requisitos para entrar", "teste admissional", "patente minima","entrar na companhia"],
        titulo: "Ingresso na Companhia",
        resposta: `O membro que queira entrar na companhia deve ter os seguintes requisitos (Regimento Interno, Cap. V, Art. 4°): <br><br>
        • Conta ativa no Fórum e RCC System. <br>
        • Patente/cargo mínimo de <b>Cabo/Assessor</b> com cursos obrigatórios. <br>
        • Boa ortografia e tempo para cumprir metas.`
    },

    {
        chaves: ["pedir desligamento", "sair da companhia", "como sair honroso","desligamento", "desligar", "sair",],
        titulo: "Saída da Companhia",
        resposta: `Para sair de forma honrosa (Regimento Interno, Cap. V, Art. 5°): <br><br>
        • Para sair de fora honrosa deve obter autorização de um Conselheiro +. Caso saia sem aviso gera expulsão e 100 medalhas negativas. <br>
        • O tempo de adaptação dura até os primeiros 14 dias, se sair entre 15 a 30 dias de serviço, perde 50 medalhas.`
    },

    {
        chaves: ["tempo off","offline", "dias sem entrar", "dias off", "dias de folga"],
        titulo: "Tempo offline",
        resposta: `Punições para o membro que fica dias offline(Regimento Interno, Cap. V, Art. 7°): <br><br>
        • O professor que permanecer offline por período igual ou superior a cinco (05) dias será expulso da companhia e receberá cem (100) medalhas efetivas negativas.<br>
        • O coordenador+ que alcançar o período de cinco (05) dias offline será rebaixado e receberá cinquenta (50) medalhas efetivas negativas. Em caso de não retorno, receberá um novo rebaixamento a cada vinte e quatro (24) horas, estando igualmente sujeito a ser expulso.`
    },

    // --- LICENÇAS ---
    {
        chaves: ["pedir licenca", "tempo de licenca", "posso folgar", "tempo minimo", "tempo maximo", "dias off", "dias de folga",],
        titulo: "Licença de Serviço",
        resposta: `Regras de licença (Cap. VI): <br><br>
        • A duração mínima é de 7 e máximo 30 dias. <br>
        • Caso a licença for inferior a 20 dias, a vaga é mantida. <br>
        • Pra conseguir a licença, requer aval de um Conselheiro + (ou Liderança para Estagiários+).`
    }
];

    // ===============================================
    // 1. OBJETO DE USUÁRIO (ALIMENTADO PELO FIREBASE)
    // ===============================================
    let currentUser = {
        name: "Visitante",
        photo: "https://ui-avatars.com/api/?name=V&background=333&color=fff",
        role: "Membro",
        isLogged: false
    };

    // Função que seu script de Firebase deve chamar ao carregar dados
    window.applyUserData = function(nameFromDb, roleFromDb) {
        currentUser.isLogged = true;
        currentUser.name = nameFromDb || "Membro Nexus";
        currentUser.role = roleFromDb || "Membro";
        
        // Limpa o nick (remove ponto inicial se houver) para a imagem do Habbo
        const habboNick = currentUser.name.replace(/^\./, '').trim();
        currentUser.photo = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${habboNick}&headonly=1&size=l`;
        
        console.log("✅ Dados do usuário aplicados ao Chat:", currentUser.name);
    };

    // ===============================================
    // 2. MOTOR DE BUSCA (INTELIGÊNCIA DE RESPOSTA)
    // ===============================================
    function normalizar(texto) {
        return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function buscarResposta(pergunta) {
        const texto = normalizar(pergunta);
        
        // BASE_CONHECIMENTO deve estar definida globalmente ou antes deste ponto
        for (let item of BASE_CONHECIMENTO) {
            for (let chave of item.chaves) {
                if (texto.includes(normalizar(chave))) {
                    return `Com certeza, <b>${currentUser.name}</b>! Analisando os documentos, encontrei o seguinte sobre <b>${item.titulo}</b>:<br>
                    ${item.resposta}<br><br>
                    Ficou claro? Se precisar de algo mais, estou aqui!`;
                }
            }
        }

        return `Hmm, <b>${currentUser.name}</b>, não encontrei uma infração ou regra específica para esse termo nos documentos oficiais. 
        <br>Para sua tirar sua dúvida, recomendo consultar um <b>Estagiário +</b>!`;
    }

    // ===============================================
    // 3. LÓGICA DO CHAT E INTERFACE
    // ===============================================
    const chatFeed = document.getElementById('chat-feed');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';
        const loadingId = showLoading();

        setTimeout(() => {
            const resposta = buscarResposta(text);
            removeElement(loadingId);
            addMessage(resposta, 'system');
        }, 600);
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message-row ${sender}`;
        
        // Define nome, cargo e foto baseado no remetente
        const name = sender === 'user' ? currentUser.name : "Athena";
        const role = sender === 'user' ? currentUser.role : "IA Oficial";
        const photo = sender === 'user' ? currentUser.photo : URL_FOTO_IA;

        // Melhora a formatação: Suporta **negrito** e quebras de linha
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\n/g, '<br>');

        div.innerHTML = `
            <div class="avatar-holder"><img src="${photo}" alt="${name}"></div>
            <div class="bubble-group">
                <div class="bubble">${formattedText}</div>
                <div class="meta-info">${name} • ${role}</div>
            </div>`;
            
        chatFeed.appendChild(div);
        chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    function showLoading() {
        const id = 'load-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'message-row system';
        div.innerHTML = `
            <div class="avatar-holder"><img src="${URL_FOTO_IA}"></div>
            <div class="bubble-group">
                <div class="bubble" style="color:#a0a0a5;">Analisando regimento...</div>
            </div>`;
        chatFeed.appendChild(div);
        chatFeed.scrollTop = chatFeed.scrollHeight;
        return id;
    }

    function removeElement(id) { const el = document.getElementById(id); if (el) el.remove(); }
    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    // Monitor de autenticação Firebase (exemplo de como conectar)
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            firebase.firestore().collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    applyUserData(data.name, data.cargo);
                }
            });
        }
    });
});