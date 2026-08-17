const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler'); 
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Inicializa o Admin SDK do Firebase
admin.initializeApp();
const db = admin.firestore();

const app = express();
// Permite requisições do seu fórum (Forumeiros)
app.use(cors({ origin: true }));
app.use(express.json());

const PUBLIC_MEMBER_CARGOS = [
    'Professor(a)',
    'Coordenador(a)',
    'Graduador(a)',
    'Estagiário(a)',
    'Conselheiro(a)',
    'Vice-Líder',
    'Líder'
];

const PUBLIC_ADMIN_ROLES = new Set([
    'admin',
    'admin_custom',
    'admin_companhia',
    'admin_documentos',
    'admin_subgrupos',
    'adm_spp',
    'adm_cdc',
    'adm_da'
]);

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

async function getUserIdByNickname(nickname) {
    try {
        const nickBase64 = Buffer.from(nickname.trim().toLowerCase()).toString('base64');
        const doc = await db.collection('nicknames').doc(nickBase64).get();
        if (doc.exists) return doc.data().uid;
        return null;
    } catch (error) {
        console.error(`Erro ao buscar UID de '${nickname}':`, error);
        return null;
    }
}

function adicionarDiasData(dataString, dias) {
    const partes = dataString.split('/');
    if (partes.length !== 3) return dataString;
    const data = new Date(partes[2], partes[1] - 1, partes[0]);
    data.setDate(data.getDate() + dias);
    
    const diaFinal = String(data.getDate()).padStart(2, '0');
    const mesFinal = String(data.getMonth() + 1).padStart(2, '0');
    const anoFinal = data.getFullYear();
    
    return `${diaFinal}/${mesFinal}/${anoFinal}`;
}

function getDataAtualBRT() {
    const dataHojeObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dia = String(dataHojeObj.getDate()).padStart(2, '0');
    const mes = String(dataHojeObj.getMonth() + 1).padStart(2, '0');
    const ano = dataHojeObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function normalizePublicValue(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function canonicalizePublicCargo(value) {
    const normalizedCargo = normalizePublicValue(value);
    return PUBLIC_MEMBER_CARGOS.find(cargo => normalizePublicValue(cargo) === normalizedCargo) || null;
}

function serializePublicTimestamp(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return null;
}

function getPublicMember(doc) {
    const data = doc.data() || {};
    const cargo = canonicalizePublicCargo(data.cargo);
    const name = String(data.name || data.nick || '').trim();
    const nick = String(data.nick || data.name || '').trim();
    const role = normalizePublicValue(data.role);
    const permissions = Array.isArray(data.adminPermissoes) ? data.adminPermissoes : [];
    const isLeadership = cargo === 'Líder' || cargo === 'Vice-Líder';

    if (!cargo || !name || normalizePublicValue(data.status) !== 'ativo') return null;

    return {
        id: normalizePublicValue(nick || name).replace(/\s+/g, '-'),
        name,
        nick,
        cargo,
        status: 'Ativo',
        dataEntrada: String(data.dataEntrada || '').trim(),
        atualizadoEm: serializePublicTimestamp(data.atualizadoEm || data.createdAt),
        cdc: typeof data.cdc === 'string' ? data.cdc.trim() : '',
        spp: typeof data.spp === 'string' ? data.spp.trim() : '',
        da: typeof data.da === 'string' ? data.da.trim() : '',
        isAdmin: !isLeadership && (PUBLIC_ADMIN_ROLES.has(role) || permissions.length > 0)
    };
}

// ==========================================
// ROTAS DA API HTTP
// ==========================================

// Lista pública e sanitizada para consumidores externos, como a listagem do GTI.
// O Admin SDK consulta o Firestore no servidor; nenhum segredo é enviado ao navegador.
app.get('/membros', async (req, res) => {
    try {
        const snapshot = await db.collection('users').where('status', '==', 'Ativo').get();
        const membros = snapshot.docs
            .map(getPublicMember)
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

        res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({
            sucesso: true,
            atualizadoEm: new Date().toISOString(),
            total: membros.length,
            membros
        });
    } catch (error) {
        console.error('Erro na rota GET /membros:', error);
        return res.status(500).json({ sucesso: false, erro: 'Falha ao carregar a listagem de membros.' });
    }
});

app.post('/promocao', async (req, res) => {
    const { nicknames, novoCargo, autor } = req.body;
    if (!nicknames || !novoCargo) return res.status(400).json({ erro: 'Dados incompletos.' });
    const listaNicknames = nicknames.split('/').map(n => n.trim()).filter(n => n !== "");
    let processados = 0;

    try {
        for (const nickname of listaNicknames) {
            const userId = await getUserIdByNickname(nickname);
            if (!userId) continue;

            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const cargoAnterior = userDoc.data()?.cargo || 'Não definido';

            await userRef.update({ cargo: novoCargo });
            await userRef.collection('historico').add({
                titulo: 'Promoção', timestamp: admin.firestore.FieldValue.serverTimestamp(),
                autor: autor, conteudo: `Promovido(a) de ${cargoAnterior} para ${novoCargo}.`,
                dados: { operacao: 'promocao', de: cargoAnterior, para: novoCargo }
            });
            await db.collection('notificacoes').add({
                tipo: 'promocao_membro', dados: { nomeUsuario: nickname, novoCargo }, 
                link: `/membros/${encodeURIComponent(nickname)}`, userId: userId 
            });
            processados++;
        }
        res.status(200).json({ sucesso: true, mensagem: `${processados} promoções registradas!` });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/rebaixamento', async (req, res) => {
    const { nicknames, novoCargo, motivo, autor } = req.body;
    if (!nicknames || !novoCargo) return res.status(400).json({ erro: 'Dados incompletos.' });
    const listaNicknames = nicknames.split('/').map(n => n.trim()).filter(n => n !== "");
    let processados = 0;

    try {
        for (const nickname of listaNicknames) {
            const userId = await getUserIdByNickname(nickname);
            if (!userId) continue;

            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const cargoAnterior = userDoc.data()?.cargo || 'Não definido';

            await userRef.update({ cargo: novoCargo });
            await userRef.collection('historico').add({
                titulo: 'Rebaixamento', timestamp: admin.firestore.FieldValue.serverTimestamp(),
                autor: autor, conteudo: `Rebaixado(a) de ${cargoAnterior} para ${novoCargo}. Motivo: ${motivo}`,
                dados: { operacao: 'rebaixamento', de: cargoAnterior, para: novoCargo, motivo: motivo }
            });
            await db.collection('notificacoes').add({
                tipo: 'rebaixamento_membro', dados: { nomeUsuario: nickname, novoCargo }, 
                link: `/membros/${encodeURIComponent(nickname)}`, userId: userId 
            });
            processados++;
        }
        res.status(200).json({ sucesso: true, mensagem: `${processados} rebaixamentos registrados!` });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/saida', async (req, res) => {
    const { nicknames, motivo, data, autor } = req.body;
    if (!nicknames) return res.status(400).json({ erro: 'Dados incompletos.' });
    const listaNicknames = nicknames.split('/').map(n => n.trim()).filter(n => n !== "");
    
    try {
        for (const nickname of listaNicknames) {
            const userId = await getUserIdByNickname(nickname);
            if (!userId) continue;

            const userRef = db.collection('users').doc(userId);
            const doc = await userRef.get();
            if (!doc.exists) continue;
            
            const currentData = doc.data();
            const makeEx = (valor) => (valor && typeof valor === 'string' && valor.trim() !== '' && !valor.startsWith('Ex-')) ? `Ex-${valor}` : valor;

            const updates = {
                role: admin.firestore.FieldValue.delete(), status: 'Inativo', dataEntrada: admin.firestore.FieldValue.delete(),
                cargo: makeEx(currentData.cargo), spp: makeEx(currentData.spp), da: makeEx(currentData.da), cdc: makeEx(currentData.cdc)
            };
            Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

            await userRef.update(updates);
            await userRef.collection('historico').add({
                titulo: 'Saída dos Professores', timestamp: admin.firestore.FieldValue.serverTimestamp(),
                autor: autor, conteudo: `Nosso membro saiu dos Professores, pelo motivo de ${motivo}.`,
                dados: { operacao: 'saida', motivo: motivo, data: data }
            });
        }
        res.status(200).json({ sucesso: true, mensagem: 'Saídas processadas!' });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/transferencia', async (req, res) => {
    const { oldNick, newNick, data, autor } = req.body;
    if (!oldNick || !newNick) return res.status(400).json({ erro: 'Dados incompletos.' });

    try {
        const userId = await getUserIdByNickname(oldNick);
        if (!userId) return res.status(404).json({ erro: `Usuário ${oldNick} não encontrado.` });

        const userRef = db.collection('users').doc(userId);
        await userRef.update({ name: newNick });

        const newNickBase64 = Buffer.from(newNick.trim().toLowerCase()).toString('base64');
        const oldNickBase64 = Buffer.from(oldNick.trim().toLowerCase()).toString('base64');
        
        await db.collection('nicknames').doc(newNickBase64).set({ uid: userId, nickname: newNick.toLowerCase() });
        await db.collection('nicknames').doc(oldNickBase64).delete();

        await userRef.collection('historico').add({
            titulo: 'Transferência de Nickname', timestamp: admin.firestore.FieldValue.serverTimestamp(),
            autor: autor, conteudo: `O membro alterou seu nickname de ${oldNick} para ${newNick}.`,
            dados: { operacao: 'transferencia', antigo: oldNick, novo: newNick, data: data }
        });

        res.status(200).json({ sucesso: true, mensagem: `Transferência de ${oldNick} concluída!` });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/licenca', async (req, res) => {
    const { nicknames, dias, permissao, autor } = req.body;
    if (!nicknames || !dias) return res.status(400).json({ erro: 'Dados incompletos.' });

    const listaNicknames = nicknames.split('/').map(n => n.trim()).filter(n => n !== "");
    let processados = 0;
    const diasNum = parseInt(dias, 10);
    
    const dataInicioFormatada = getDataAtualBRT();
    const dataFimFormatada = adicionarDiasData(dataInicioFormatada, diasNum);

    try {
        for (const nickname of listaNicknames) {
            const userId = await getUserIdByNickname(nickname);
            if (!userId) continue;

            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const cargo = userDoc.data()?.cargo || 'Não definido';

            await db.collection('licencas').add({
                uid: userId, nickname: nickname, cargo: cargo, dias: diasNum,
                data_inicio: dataInicioFormatada, data_fim: dataFimFormatada,
                permissao: permissao || 'Não informada', autor_postagem: autor,
                status_licenca: 'Ativa', timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            await userRef.collection('historico').add({
                titulo: 'Afastamento (Licença)', timestamp: admin.firestore.FieldValue.serverTimestamp(),
                autor: autor, conteudo: `Registro de licença de ${diasNum} dias (${dataInicioFormatada} a ${dataFimFormatada}).`,
                dados: { operacao: 'licenca_registro', inicio: dataInicioFormatada, fim: dataFimFormatada }
            });
            processados++;
        }
        res.status(200).json({ sucesso: true, mensagem: `${processados} licenças registradas na nova coleção!` });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/retorno', async (req, res) => {
    const { nicknames, data, autor } = req.body;
    if (!nicknames) return res.status(400).json({ erro: 'Dados incompletos.' });
    const listaNicknames = nicknames.split('/').map(n => n.trim()).filter(n => n !== "");
    let processados = 0;

    try {
        for (const nickname of listaNicknames) {
            const userId = await getUserIdByNickname(nickname);
            if (!userId) continue;

            const licencasRef = db.collection('licencas').where('uid', '==', userId).where('status_licenca', '==', 'Ativa');
            const licencasSnapshot = await licencasRef.get();
            
            if (!licencasSnapshot.empty) {
                const batch = db.batch();
                licencasSnapshot.forEach(doc => {
                    batch.update(doc.ref, { status_licenca: 'Concluída', finalizacao: 'Retorno Manual', data_retorno_efetivo: data });
                });
                await batch.commit();
            }

            const userRef = db.collection('users').doc(userId);
            await userRef.collection('historico').add({
                titulo: 'Retorno de Licença', timestamp: admin.firestore.FieldValue.serverTimestamp(),
                autor: autor, conteudo: `O membro confirmou seu retorno de licença.`,
                dados: { operacao: 'retorno_licenca', data: data }
            });
            processados++;
        }
        res.status(200).json({ sucesso: true, mensagem: `${processados} retornos manuais registrados!` });
    } catch (error) { res.status(500).json({ erro: 'Falha no servidor.' }); }
});

app.post('/assistencia', async (req, res) => {
    const { tipoOcorrencia, cargoPunido, nickPunido, motivo, permissao, autor, dataAplicacao, enviaCarta } = req.body;

    if (!nickPunido || !motivo) {
        return res.status(400).json({ erro: 'Dados incompletos (Nick ou Motivo faltando).' });
    }

    const partesData = dataAplicacao.split('/');
    let dataTerminoFormatada = "--";
    let dataIso = "";
    
    if (partesData.length === 3) {
        const dataInclusao = new Date(partesData[2], partesData[1] - 1, partesData[0]);
        dataIso = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
        
        const dataTermino = new Date(dataInclusao);
        dataTermino.setDate(dataTermino.getDate() + 30);
        
        const diaFim = String(dataTermino.getDate()).padStart(2, '0');
        const mesFim = String(dataTermino.getMonth() + 1).padStart(2, '0');
        const anoFim = dataTermino.getFullYear();
        dataTerminoFormatada = `${diaFim}/${mesFim}/${anoFim}`;
    }

    let punicaoFormatada = "ERRO";
    if (tipoOcorrencia === 'adv_verbal') punicaoFormatada = "NOTIFICAÇÃO";
    if (tipoOcorrencia === 'adv_interna') punicaoFormatada = "ADVERTÊNCIA INTERNA";

    const listaNicknames = nickPunido.split('/').map(n => n.trim()).filter(n => n !== "");
    let processados = 0;

    try {
        for (const nickname of listaNicknames) {
            const novoRegistro = {
                cargo: cargoPunido,
                nick: nickname,
                punicao: punicaoFormatada,
                motivo: motivo,
                permissao: permissao,
                data_formatada: dataAplicacao,
                data_iso: dataIso,
                data_termino: dataTerminoFormatada,
                decisao: "PENDENTE",
                observacao: "",
                carta_enviada: enviaCarta,
                autor_postagem: autor,
                sincronizado_sheets: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('assistencia_registros').add(novoRegistro);

            const userId = await getUserIdByNickname(nickname);
            if (userId) {
                await db.collection('users').doc(userId).collection('historico').add({
                    titulo: 'Registro de Assistência',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    autor: autor,
                    conteudo: `Recebeu uma ${punicaoFormatada}. Motivo: ${motivo}`
                });
            }
            processados++;
        }

        res.status(200).json({ sucesso: true, mensagem: `${processados} registros inseridos na Assistência!` });
    } catch (error) {
        console.error("Erro na rota /assistencia:", error);
        res.status(500).json({ erro: 'Falha no servidor ao registrar assistência.' });
    }
});

app.post('/justificativa', async (req, res) => {
    const dados = req.body;
    const autor = dados.autor;
    const justifyType = dados.justify_type;

    if (!autor || !justifyType) {
        return res.status(400).json({ erro: 'Dados incompletos (Autor ou Tipo faltando).' });
    }

    try {
        const novaJustificativa = {
            tipo: justifyType,
            autor_postagem: autor,
            data_registro: getDataAtualBRT(),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        if (justifyType === 'meta') {
            novaJustificativa.cargo = dados.justify_meta_cargo;
            novaJustificativa.nick = dados.justify_meta_nick;
            novaJustificativa.periodo = dados.justify_meta_periodo;
            novaJustificativa.motivo = dados.justify_meta_motivo;
            novaJustificativa.no_prazo = dados.justify_meta_entregue;
        } else if (justifyType === 'reuniao') {
            novaJustificativa.nick = dados.justify_reuniao_nick;
            novaJustificativa.data_reuniao = dados.justify_reuniao_data;
            novaJustificativa.horario_reuniao = dados.justify_reuniao_horario;
            novaJustificativa.motivo = dados.justify_reuniao_motivo;
        } else if (justifyType === 'avaliacao') {
            novaJustificativa.nick = dados.justify_avaliacao_nick;
            novaJustificativa.motivo = dados.justify_avaliacao_motivo;
        }

        await db.collection('nexus_config').doc('justificativas').collection('registros').add(novaJustificativa);

        res.status(200).json({ sucesso: true, mensagem: 'Justificativa salva com sucesso na coleção nexus_config!' });
    } catch (error) {
        console.error("Erro na rota /justificativa:", error);
        res.status(500).json({ erro: 'Falha ao registrar justificativa no servidor.' });
    }
});

// ==========================================
// EXPORTAÇÕES DO CLOUD FUNCTIONS (V2 E V1)
// ==========================================

// 1. Exporta a API para comunicação com o Fórum (Mantém V1 que é padrão pro Express)
exports.api = functions.https.onRequest(app);

// 2. Exporta o CRON JOB: Robô diário (Atualizado para Sintaxe V2)
exports.verificarLicencasExpiradas = onSchedule({
    schedule: "0 0 * * *",
    timeZone: "America/Sao_Paulo"
}, async (event) => {
    const dataHojeObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    dataHojeObj.setHours(0, 0, 0, 0);

    console.log(`[Cron] Iniciando verificação de licenças expiradas...`);

    try {
        const snapshot = await db.collection('licencas').where('status_licenca', '==', 'Ativa').get();
        if (snapshot.empty) {
            console.log("[Cron] Nenhuma licença ativa encontrada.");
            return;
        }

        const batch = db.batch();
        let contagem = 0;

        snapshot.forEach(doc => {
            const dados = doc.data();
            const [d, m, a] = dados.data_fim.split('/');
            const dataFimObj = new Date(a, m - 1, d);
            dataFimObj.setHours(0, 0, 0, 0);

            if (dataFimObj < dataHojeObj) {
                batch.update(doc.ref, { 
                    status_licenca: 'Concluída',
                    finalizacao: 'Automática (Fim do Prazo)' 
                });
                contagem++;
            }
        });

        if (contagem > 0) await batch.commit();
        console.log(`[Cron] Sucesso! ${contagem} licenças foram concluídas automaticamente.`);
    } catch (error) {
        console.error("[Cron] Erro ao verificar licenças expiradas:", error);
    }
});

// Mantém o Firebase Authentication sincronizado com o status do cadastro.
// Inativar bloqueia novos logins e revoga sessões; reativar libera a conta.
exports.sincronizarStatusMembroNoAuth = onDocumentUpdated('users/{userId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
    const previousStatus = normalizeStatus(beforeData.status);
    const currentStatus = normalizeStatus(afterData.status);

    const becameInactive = previousStatus !== 'inativo' && currentStatus === 'inativo';
    const becameActive = previousStatus !== 'ativo' && currentStatus === 'ativo';
    if (!becameInactive && !becameActive) return;

    const userId = event.params.userId;

    try {
        await admin.auth().updateUser(userId, { disabled: becameInactive });

        if (becameInactive) {
            await admin.auth().revokeRefreshTokens(userId);
            console.log(`[Auth] Conta ${userId} desabilitada e sessões revogadas.`);
        } else {
            console.log(`[Auth] Conta ${userId} reabilitada após retorno ao status Ativo.`);
        }
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.warn(`[Auth] Usuário ${userId} não existe no Authentication; sincronização ignorada.`);
            return;
        }
        console.error(`[Auth] Falha ao sincronizar o status do usuário ${userId}:`, error);
        throw error;
    }
});
