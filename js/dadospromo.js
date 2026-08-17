let db;
let currentResultsData = []; 
let todosOsBackups = {}; 
window.allVotesRaw = []; 

function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `toast-modern ${type}`;
    div.innerHTML = `<i class="fas ${type === 'loading' ? 'fa-circle-notch fa-spin text-indigo-400' : type === 'success' ? 'fa-check text-emerald-400' : 'fa-times text-red-400'}"></i> <span>${msg}</span>`;
    document.body.appendChild(div);
    if (type !== 'loading') setTimeout(() => div.remove(), 3000);
    return div;
}

function toggleDisplay(id, show) {
    const el = document.getElementById(id);
    if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

function formatDateFull(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${String(d.getDate()).padStart(2, '0')} ${meses[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

// ==========================================
// NAVEGAÇÃO DE ABAS
// ==========================================
function switchTab(activeId) {
    ['nav-listas', 'nav-resultados', 'nav-historico'].forEach(id => {
        document.getElementById(id).classList.remove('active-cargo', 'text-white');
        document.getElementById(id).classList.add('text-slate-400');
    });
    document.getElementById(activeId).classList.add('active-cargo', 'text-white');
    document.getElementById(activeId).classList.remove('text-slate-400');

    ['view-listas', 'view-resultados', 'view-historico'].forEach(id => toggleDisplay(id, false));
    toggleDisplay(activeId.replace('nav', 'view'), true);
}

document.getElementById('nav-listas').addEventListener('click', () => switchTab('nav-listas'));
document.getElementById('nav-resultados').addEventListener('click', () => {
    switchTab('nav-resultados');
    carregarResultados(); 
});
document.getElementById('nav-historico').addEventListener('click', () => {
    switchTab('nav-historico');
    carregarListaBackups();
});

// ==========================================
// ABA 1: SALVAR LISTAS NO FIREBASE
// ==========================================
async function carregarListasAtuais() {
    try {
        ['professor', 'coordenador', 'graduador'].forEach(async (cargo) => {
            const doc = await db.collection('listas_promocao').doc(cargo).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById(`lista-${cargo}`).value = (data.nicks || []).join('\n');
                document.getElementById(`vagas-${cargo}`).value = data.vagas || 0;
            }
        });
    } catch (error) { console.error("Erro ao puxar listas:", error); }
}

window.salvarLista = async (cargo) => {
    const text = document.getElementById(`lista-${cargo}`).value;
    const nicks = text.split('\n').map(n => n.trim()).filter(Boolean);
    const vagas = parseInt(document.getElementById(`vagas-${cargo}`).value) || 0;

    const t = showToast(`Salvando lista de ${cargo}...`, 'loading');
    try {
        await db.collection('listas_promocao').doc(cargo).set({
            nicks: nicks,
            vagas: vagas,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        t.remove();
        showToast('Lista salva com sucesso!', 'success');
    } catch (error) {
        t.remove();
        showToast('Erro ao salvar no banco.', 'error');
    }
};

// ==========================================
// ABA 2: VER RESULTADOS E RELATÓRIOS
// ==========================================
window.copiarRelatorioPromovidos = async () => {
    const btn = document.getElementById('btn-copy-relatorio');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-lg"></i> Gerando...';
    btn.disabled = true;

    try {
        const dataStr = formatDateFull(); 
        let relatorio = `*Promovidos da semana #PROF - ${dataStr}*\n`;
        let teveAlguemPromovido = false;

        const ordemCargos = [
            { id: 'professor', titulo: '*Professor > Coordenador*' },
            { id: 'coordenador', titulo: '*Coordenador > Graduador*' },
            { id: 'graduador', titulo: '*Graduador > Estagiário*' }
        ];

        for (const cargo of ordemCargos) {
            const listDoc = await db.collection('listas_promocao').doc(cargo.id).get();
            const baseList = listDoc.exists ? (listDoc.data().nicks || []) : [];

            if(baseList.length === 0) continue;

            const avaliacoesRef = await db.collection('avaliacoes_nexus').where('cargo', '==', cargo.id).get();
            const votosMap = {};
            avaliacoesRef.forEach(doc => {
                const d = doc.data();
                const n = d.nick_avaliado.toLowerCase();
                if(!votosMap[n]) votosMap[n] = {p:0, m:0};
                if(d.veredito === 'Promovido') votosMap[n].p++;
                if(d.veredito === 'Mantém') votosMap[n].m++;
            });

            const promovidosReais = baseList.filter(nick => {
                const votos = votosMap[nick.toLowerCase()];
                return votos && votos.p > votos.m; 
            });

            if (promovidosReais.length > 0) {
                teveAlguemPromovido = true;
                relatorio += `\n${cargo.titulo}\n\n`;
                relatorio += promovidosReais.join('\n') + '\n';
            }
        }

        if (!teveAlguemPromovido) {
            showToast('Nenhum membro aprovado pela maioria em nenhum cargo.', 'error');
            btn.innerHTML = originalText; btn.disabled = false; return;
        }

        await navigator.clipboard.writeText(relatorio.trim());
        showToast('Relatório copiado com sucesso!', 'success');

    } catch (error) {
        showToast('Falha ao gerar relatório.', 'error');
    }
    btn.innerHTML = originalText; btn.disabled = false;
};

window.exportarPlanilha = () => {
    if(!window.allVotesRaw || window.allVotesRaw.length === 0) {
        showToast("Nenhum dado para exportar neste cargo.", "error");
        return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "Avaliador;Membro Avaliado;Status;Comentario;Data\n";

    window.allVotesRaw.forEach(voto => {
        const avaliador = voto.avaliador || "Desconhecido";
        const membro = voto.nick_avaliado || "Desconhecido";
        const status = voto.veredito || "Pendente";
        
        let comentario = (voto.dissertacao || "").replace(/"/g, '""').replace(/\n/g, ' ');
        comentario = `"${comentario}"`; 
        
        let dataStr = "";
        if (voto.timestamp) {
            const d = voto.timestamp.toDate ? voto.timestamp.toDate() : new Date(voto.timestamp);
            dataStr = formatDateFull(d);
        }

        csvContent += `${avaliador};${membro};${status};${comentario};${dataStr}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Exportacao_Votos_NEXUS_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Planilha Baixada com Sucesso!", "success");
};

document.getElementById('res-cargo-select').addEventListener('change', carregarResultados);

async function carregarResultados() {
    const cargo = document.getElementById('res-cargo-select').value;
    const grid = document.getElementById('resultados-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fas fa-circle-notch fa-spin text-3xl text-indigo-500 mb-4"></i><p class="text-slate-400 font-bold uppercase tracking-widest">Coletando votos do conselho...</p></div>';

    try {
        const listDoc = await db.collection('listas_promocao').doc(cargo).get();
        const baseList = listDoc.exists ? (listDoc.data().nicks || []) : [];

        const avaliacoesRef = await db.collection('avaliacoes_nexus').where('cargo', '==', cargo).get();
        
        const votosMap = {};
        window.allVotesRaw = []; 

        avaliacoesRef.forEach(doc => {
            const data = doc.data();
            window.allVotesRaw.push(data); 
            const nickLow = data.nick_avaliado.toLowerCase();
            if(!votosMap[nickLow]) votosMap[nickLow] = [];
            votosMap[nickLow].push(data);
        });

        currentResultsData = baseList.map(nick => {
            const votos = votosMap[nick.toLowerCase()] || [];
            let prom = 0, mant = 0;
            votos.forEach(v => {
                if(v.veredito === 'Promovido') prom++;
                if(v.veredito === 'Mantém') mant++;
            });

            let vFinal = 'Pendente';
            if (votos.length > 0) {
                if (prom > mant) vFinal = 'Promovido';
                else if (mant > prom) vFinal = 'Mantém';
                else vFinal = 'Empate';
            }

            return { nick: nick, veredito: vFinal, votos: votos, promovidos: prom, mantidos: mant };
        });

        await renderizarParticipacaoConselho(window.allVotesRaw, 'conselho-tracker-placeholder');
        renderizarGradeResultados(currentResultsData, 'resultados-grid', 'stat-');

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div class="col-span-full text-red-500 font-bold text-center py-10">Erro ao carregar dados do Firebase.</div>';
    }
}

// PARTICIPAÇÃO DO CONSELHO
async function renderizarParticipacaoConselho(votos, targetId) {
    const trackerDiv = document.getElementById(targetId);
    trackerDiv.innerHTML = '<div class="col-span-full text-center text-slate-500 text-sm py-4"><i class="fas fa-circle-notch fa-spin text-indigo-500 mb-2 text-2xl"></i><br>Buscando equipe...</div>';
    
    try {
        const cargosConselho = ['Estagiário(a)', 'Conselheiro(a)', 'Vice-Líder', 'Líder'];
        const usersSnap = await db.collection('users').where('cargo', 'in', cargosConselho).get();
        
        const conselheiros = [];
        usersSnap.forEach(doc => conselheiros.push(doc.data()));

        const votosPorAvaliador = {};
        votos.forEach(v => {
            const av = (v.avaliador || '').toLowerCase();
            votosPorAvaliador[av] = (votosPorAvaliador[av] || 0) + 1;
        });

        const ordemCargos = { 'Líder': 1, 'Vice-Líder': 2, 'Conselheiro(a)': 3, 'Estagiário(a)': 4 };

        conselheiros.sort((a,b) => {
            const pesoA = ordemCargos[a.cargo] || 99;
            const pesoB = ordemCargos[b.cargo] || 99;
            if(pesoA !== pesoB) return pesoA - pesoB; 
            
            const vA = votosPorAvaliador[(a.name || a.nick || '').toLowerCase()] || 0;
            const vB = votosPorAvaliador[(b.name || b.nick || '').toLowerCase()] || 0;
            return vB - vA; 
        });

        let html = '';
        conselheiros.forEach(c => {
            const nick = c.name || c.nick || 'Desconhecido';
            const cargo = c.cargo || 'Membro';
            const qtdVotos = votosPorAvaliador[nick.toLowerCase()] || 0;
            
            const isAltoComando = (cargo === 'Líder' || cargo === 'Vice-Líder');
            const votou = qtdVotos > 0;
            
            let bgClass = 'bg-black/40 border-slate-700/50';
            if(!isAltoComando) {
                bgClass = votou ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30';
            } else {
                bgClass = 'bg-indigo-900/10 border-indigo-500/30';
            }

            let statusHtml = '';
            if(!isAltoComando) {
                const iconClass = votou ? 'fa-check text-emerald-400' : 'fa-times text-red-400';
                const statusText = votou ? `${qtdVotos} Voto(s)` : 'Pendente';
                const colorClass = votou ? 'text-emerald-500' : 'text-red-500';
                statusHtml = `<p class="text-[10px] font-bold mt-0.5 flex items-center gap-1 ${colorClass}"><i class="fas ${iconClass}"></i> ${statusText}</p>`;
            } else {
                statusHtml = `<p class="text-[10px] font-bold mt-0.5 flex items-center gap-1 text-indigo-400 opacity-80"><i class="fas fa-eye"></i> Acompanhamento</p>`;
            }

            html += `
            <div class="border ${bgClass} rounded-xl p-3 flex items-center gap-3 shadow-inner transition hover:scale-105">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-10 h-10 rounded-full bg-slate-900 drop-shadow-md">
                <div class="overflow-hidden w-full">
                    <p class="text-xs font-black text-white truncate w-full leading-tight">${nick}</p>
                    <p class="text-[9px] text-slate-500 uppercase tracking-widest truncate w-full mt-0.5">${cargo}</p>
                    ${statusHtml}
                </div>
            </div>`;
        });

        if(conselheiros.length === 0) {
            html = '<div class="col-span-full text-center text-slate-500 text-xs py-4">Nenhum membro do Conselho encontrado no sistema.</div>';
        }
        trackerDiv.innerHTML = html;

    } catch(e) {
        console.error("Erro ao buscar a equipe do conselho:", e);
        trackerDiv.innerHTML = '<div class="col-span-full text-center text-red-500 text-xs py-4">Erro ao carregar o conselho. (Verifique suas regras do Firestore)</div>';
    }
}

// ==========================================
// ABA 3: SISTEMA DE BACKUP E HISTÓRICO
// ==========================================
window.encerrarCicloEArquivar = async () => {
    const confirmation = confirm("TEM CERTEZA ABSOLUTA?\n\nIsso criará um backup e APAGARÁ todas as listas e votos que estão em andamento atualmente.");
    if (!confirmation) return;

    const t = showToast('Gerando Backup e Zerando Sistema...', 'loading');

    try {
        const listasSnap = await db.collection('listas_promocao').get();
        const avaliacoesSnap = await db.collection('avaliacoes_nexus').get();

        if (listasSnap.empty && avaliacoesSnap.empty) {
            t.remove(); showToast('O sistema já está vazio. Nada para arquivar.', 'error'); return;
        }

        const listasData = [];
        listasSnap.forEach(doc => listasData.push({ id: doc.id, ...doc.data() }));

        const avaliacoesData = [];
        avaliacoesSnap.forEach(doc => avaliacoesData.push(doc.data()));

        const dataAtual = new Date();
        const docId = dataAtual.getTime().toString();
        const dataExibicao = `${formatDateFull(dataAtual.toISOString())} às ${String(dataAtual.getHours()).padStart(2,'0')}:${String(dataAtual.getMinutes()).padStart(2,'0')}`;

        await db.collection('historico_promocoes').doc(docId).set({
            data_formatada: dataExibicao,
            timestamp: dataAtual.toISOString(),
            listas: listasData,
            avaliacoes: avaliacoesData
        });

        const batch = db.batch();
        listasSnap.docs.forEach(doc => batch.delete(doc.ref));
        avaliacoesSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        ['professor', 'coordenador', 'graduador'].forEach(cargo => {
            document.getElementById(`lista-${cargo}`).value = '';
            document.getElementById(`vagas-${cargo}`).value = '0';
        });

        t.remove();
        showToast('Ciclo Encerrado! Tudo salvo no Histórico.', 'success');
        
        document.getElementById('nav-historico').click();

    } catch (error) {
        t.remove();
        showToast('Erro Crítico ao gerar backup.', 'error');
        console.error(error);
    }
};

async function carregarListaBackups() {
    const select = document.getElementById('hist-backup-select');
    select.innerHTML = '<option value="" disabled selected>Buscando no cofre...</option>';

    try {
        const snap = await db.collection('historico_promocoes').orderBy('timestamp', 'desc').get();
        
        if (snap.empty) {
            select.innerHTML = '<option value="" disabled selected>Nenhum backup encontrado</option>';
            return;
        }

        let options = '<option value="" disabled selected>Selecione uma data</option>';
        todosOsBackups = {}; 

        snap.forEach(doc => {
            const data = doc.data();
            todosOsBackups[doc.id] = data; 
            options += `<option value="${doc.id}">${data.data_formatada}</option>`;
        });

        select.innerHTML = options;
        document.getElementById('hist-cargo-select').disabled = false;

    } catch (e) {
        select.innerHTML = '<option value="" disabled selected>Erro de conexão</option>';
    }
}

document.getElementById('hist-backup-select').addEventListener('change', renderizarHistorico);
document.getElementById('hist-cargo-select').addEventListener('change', renderizarHistorico);

async function renderizarHistorico() {
    const backupId = document.getElementById('hist-backup-select').value;
    const cargo = document.getElementById('hist-cargo-select').value;
    const grid = document.getElementById('historico-grid');

    if(!backupId) return;

    const backupData = todosOsBackups[backupId];
    if(!backupData) return;

    const listaCargo = backupData.listas.find(l => l.id === cargo);
    const baseList = listaCargo ? (listaCargo.nicks || []) : [];

    const votosMap = {};
    backupData.avaliacoes.forEach(voto => {
        if(voto.cargo === cargo) {
            const nickLow = voto.nick_avaliado.toLowerCase();
            if(!votosMap[nickLow]) votosMap[nickLow] = [];
            votosMap[nickLow].push(voto);
        }
    });

    const historicoProcessado = baseList.map(nick => {
        const votos = votosMap[nick.toLowerCase()] || [];
        let prom = 0, mant = 0;
        votos.forEach(v => {
            if(v.veredito === 'Promovido') prom++;
            if(v.veredito === 'Mantém') mant++;
        });

        let vFinal = 'Pendente';
        if (votos.length > 0) {
            if (prom > mant) vFinal = 'Promovido';
            else if (mant > prom) vFinal = 'Mantém';
            else vFinal = 'Empate';
        }

        return { nick: nick, veredito: vFinal, votos: votos, promovidos: prom, mantidos: mant };
    });

    const votosDoCargo = backupData.avaliacoes.filter(v => v.cargo === cargo);
    await renderizarParticipacaoConselho(votosDoCargo, 'hist-conselho-tracker-placeholder');

    renderizarGradeResultados(historicoProcessado, 'historico-grid', 'hist-stat-');
}

// ==========================================
// FUNÇÃO COMPARTILHADA DE RENDERIZAÇÃO
// ==========================================
function renderizarGradeResultados(dataArray, gridId, statsPrefix) {
    const grid = document.getElementById(gridId);
    let html = '';
    
    let contPromovido = 0, contMantem = 0, contPendente = 0;

    dataArray.forEach(membro => {
        let bgStyle = 'bg-[#0b0f19] border-slate-800';
        let badgeHtml = '<span class="text-[10px] uppercase tracking-widest bg-slate-900 text-slate-500 px-2 py-1 rounded border border-slate-800 font-bold">Sem Votos</span>';
        
        if (membro.veredito === 'Promovido') {
            contPromovido++;
            bgStyle = 'bg-emerald-900/10 border-emerald-500/30';
            badgeHtml = '<span class="text-[10px] uppercase tracking-widest bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded border border-emerald-500 font-bold"><i class="fas fa-arrow-up mr-1"></i> Maioria Promove</span>';
        } else if (membro.veredito === 'Mantém') {
            contMantem++;
            bgStyle = 'bg-amber-900/10 border-amber-500/30';
            badgeHtml = '<span class="text-[10px] uppercase tracking-widest bg-amber-900/50 text-amber-400 px-2 py-1 rounded border border-amber-500 font-bold"><i class="fas fa-minus mr-1"></i> Maioria Mantém</span>';
        } else if (membro.veredito === 'Empate') {
            contPendente++;
            bgStyle = 'bg-blue-900/10 border-blue-500/30';
            badgeHtml = '<span class="text-[10px] uppercase tracking-widest bg-blue-900/50 text-blue-400 px-2 py-1 rounded border border-blue-500 font-bold"><i class="fas fa-balance-scale mr-1"></i> Empate</span>';
        } else {
            contPendente++;
        }

        let dissertacoesHtml = '';
        if(membro.votos.length > 0) {
            membro.votos.forEach(v => {
                const corText = v.veredito === 'Promovido' ? 'text-emerald-400' : 'text-amber-400';
                dissertacoesHtml += `
                <div class="mb-3 border-b border-slate-700/50 pb-2 last:border-0 last:pb-0 last:mb-0">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">${v.avaliador} (<span class="${corText}">${v.veredito}</span>):</span>
                    <p class="text-xs text-slate-300 italic mt-1 leading-relaxed">"${v.dissertacao || 'Sem justificativa.'}"</p>
                </div>`;
            });
        } else {
            dissertacoesHtml = '<p class="text-xs text-slate-500 font-bold text-center py-4">Aguardando Avaliações</p>';
        }

        html += `
        <div class="glass-panel border ${bgStyle} rounded-2xl p-5 shadow-lg flex flex-col relative transition hover:scale-[1.02]">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${membro.nick}&direction=2&head_direction=2&gesture=sml&size=s&headonly=1" class="w-12 h-12 rounded-full bg-black/40 border border-slate-700/50 drop-shadow-md">
                    <div>
                        <h4 class="font-black text-white text-lg leading-none">${membro.nick}</h4>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Votos: <span class="text-emerald-400 font-bold">${membro.promovidos} P</span> | <span class="text-amber-400 font-bold">${membro.mantidos} M</span></p>
                    </div>
                </div>
                ${badgeHtml}
            </div>
            <div class="flex-1 bg-black/40 rounded-xl p-4 border border-slate-800 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
                ${dissertacoesHtml}
            </div>
            <button onclick="copiarUm('${membro.nick}')" class="absolute top-5 right-4 text-slate-500 hover:text-indigo-400 transition" title="Copiar Nick">
                <i class="fas fa-copy"></i>
            </button>
        </div>`;
    });

    if (dataArray.length === 0) {
        html = '<div class="col-span-full text-slate-500 font-bold text-center py-10">Lista vazia ou não encontrada neste cargo.</div>';
    }

    grid.innerHTML = html;

    document.getElementById(`${statsPrefix}total`).textContent = dataArray.length;
    document.getElementById(`${statsPrefix}promovidos`).textContent = contPromovido;
    document.getElementById(`${statsPrefix}mantidos`).textContent = contMantem;
    document.getElementById(`${statsPrefix}pendentes`).textContent = contPendente;
}

window.copiarNicks = (veredito) => {
    const lista = currentResultsData.filter(m => m.veredito === veredito).map(m => m.nick);
    if (lista.length === 0) { showToast(`Nenhum membro em '${veredito}'.`, 'error'); return; }
    navigator.clipboard.writeText(lista.join('\n')).then(() => { showToast(`${lista.length} membros copiados!`, 'success'); });
};
window.copiarUm = (nick) => {
    navigator.clipboard.writeText(nick).then(() => { showToast(`'${nick}' copiado!`, 'success'); });
};

// ==========================================
// INICIALIZAÇÃO DE LOGIN
// ==========================================
document.addEventListener('userDataReady', (e) => {
    const user = e.detail.userData;
    if (user) {
        db = firebase.firestore();
        toggleDisplay('access-denied-screen', false); 
        toggleDisplay('main-app-screen', true);
        carregarListasAtuais();
    } else { 
        toggleDisplay('main-app-screen', false); 
        toggleDisplay('access-denied-screen', true); 
    }
});