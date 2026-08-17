(function () {
    const { useEffect, useMemo, useState } = React;
    const h = React.createElement;

    const MESES = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    const hoje = new Date();

    function classNames() {
        return Array.from(arguments).filter(Boolean).join(' ');
    }

    function aguardarFirebase() {
        return new Promise((resolve, reject) => {
            let tentativas = 0;
            const timer = window.setInterval(() => {
                const pronto = window.firebase && firebase.apps && firebase.apps.length && firebase.firestore;

                if (pronto) {
                    window.clearInterval(timer);
                    resolve(firebase.firestore());
                    return;
                }

                tentativas += 1;
                if (tentativas > 80) {
                    window.clearInterval(timer);
                    reject(new Error('Firebase não inicializou a tempo.'));
                }
            }, 100);
        });
    }

    function parseDob(valor) {
        if (!valor) return null;

        if (typeof valor.toDate === 'function') {
            const data = valor.toDate();
            return { day: data.getDate(), month: data.getMonth(), year: data.getFullYear() };
        }

        if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
            return { day: valor.getDate(), month: valor.getMonth(), year: valor.getFullYear() };
        }

        if (typeof valor === 'string') {
            const partes = valor.split('-').map(Number);
            if (partes.length >= 3 && partes.every(Boolean)) {
                return { year: partes[0], month: partes[1] - 1, day: partes[2] };
            }
        }

        return null;
    }

    function proximoAniversario(nascimento, base) {
        let data = new Date(base.getFullYear(), nascimento.month, nascimento.day);
        if (data < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
            data = new Date(base.getFullYear() + 1, nascimento.month, nascimento.day);
        }
        return data;
    }

    function diferencaEmDias(data, base) {
        const inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        const destino = new Date(data.getFullYear(), data.getMonth(), data.getDate());
        return Math.round((destino - inicio) / 86400000);
    }

    function normalizarMembro(membro) {
        const nascimento = parseDob(membro.dob);
        if (!nascimento || !membro.name) return null;

        const proximaData = proximoAniversario(nascimento, hoje);
        const diasRestantes = diferencaEmDias(proximaData, hoje);

        return {
            id: membro.id,
            name: membro.name,
            cargo: membro.cargo || 'Membro',
            dob: membro.dob,
            day: nascimento.day,
            month: nascimento.month,
            monthName: MESES[nascimento.month],
            dateLabel: `${String(nascimento.day).padStart(2, '0')} de ${MESES[nascimento.month]}`,
            nextDate: proximaData,
            daysUntil: diasRestantes,
            isToday: diasRestantes === 0,
            isCurrentMonth: nascimento.month === hoje.getMonth()
        };
    }

    function categorizar(membros) {
        const normalizados = membros.map(normalizarMembro).filter(Boolean);
        const ordenarPorDia = (a, b) => a.day - b.day || a.name.localeCompare(b.name);
        const ordenarPorProximidade = (a, b) => a.daysUntil - b.daysUntil || a.day - b.day || a.name.localeCompare(b.name);

        const aniversariantesHoje = normalizados.filter((membro) => membro.isToday).sort(ordenarPorDia);
        const aniversariantesMes = normalizados
            .filter((membro) => membro.isCurrentMonth && !membro.isToday)
            .sort(ordenarPorDia);
        const proximos = normalizados
            .filter((membro) => !membro.isCurrentMonth)
            .sort(ordenarPorProximidade);

        return { aniversariantesHoje, aniversariantesMes, proximos, total: normalizados.length };
    }

    function agruparPorMes(lista) {
        return lista.reduce((grupos, membro) => {
            const chave = membro.monthName;
            if (!grupos[chave]) grupos[chave] = [];
            grupos[chave].push(membro);
            return grupos;
        }, {});
    }

    function avatarUrl(nome, tamanho) {
        const size = tamanho || 'l';
        return `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(nome)}&action=std&direction=2&head_direction=3&img_format=png&gesture=sml&headonly=0&size=${size}`;
    }

    function abrirPerfil(nome) {
        window.location.href = `/membros/${encodeURIComponent(nome)}`;
    }

    function Icone(props) {
        return h('i', { className: `fa-solid ${props.name}`, 'aria-hidden': 'true' });
    }

    function StatCard({ icon, label, value, tone }) {
        return h('article', { className: classNames('anv-stat', tone) },
            h('span', { className: 'anv-stat__icon' }, h(Icone, { name: icon })),
            h('strong', null, value),
            h('span', null, label)
        );
    }

    function EmptyState({ icon, title, text }) {
        return h('div', { className: 'anv-empty' },
            h('span', { className: 'anv-empty__icon' }, h(Icone, { name: icon })),
            h('strong', null, title),
            h('p', null, text)
        );
    }

    function MemberCard({ membro, destaque }) {
        const textoDias = membro.isToday
            ? 'Hoje'
            : membro.daysUntil === 1
                ? 'Amanhã'
                : `Em ${membro.daysUntil} dias`;

        return h('button', {
            className: classNames('anv-member-card', destaque && 'anv-member-card--today'),
            type: 'button',
            onClick: () => abrirPerfil(membro.name),
            title: `Abrir perfil de ${membro.name}`
        },
            h('span', { className: 'anv-member-card__shine' }),
            h('span', { className: 'anv-member-card__date' },
                h(Icone, { name: 'fa-cake-candles' }),
                membro.dateLabel
            ),
            h('span', { className: 'anv-member-card__avatar-wrap' },
                h('img', {
                    className: 'anv-member-card__avatar',
                    src: avatarUrl(membro.name),
                    alt: membro.name,
                    loading: 'lazy',
                    onError: (event) => {
                        event.currentTarget.src = '/imgs/error-user.png';
                    }
                })
            ),
            h('span', { className: 'anv-member-card__body' },
                h('strong', { className: 'anv-member-card__name' }, membro.name),
                h('span', { className: 'anv-member-card__role' }, membro.cargo)
            ),
            h('span', { className: 'anv-member-card__footer' },
                h('span', null, textoDias),
                h('span', { className: 'anv-member-card__open' }, h(Icone, { name: 'fa-arrow-up-right-from-square' }))
            )
        );
    }

    function MemberGrid({ membros, destaque }) {
        return h('div', { className: classNames('anv-grid', destaque && 'anv-grid--spotlight') },
            membros.map((membro) => h(MemberCard, {
                key: membro.id || `${membro.name}-${membro.dateLabel}`,
                membro,
                destaque
            }))
        );
    }

    function UpcomingGroups({ membros }) {
        const grupos = agruparPorMes(membros);

        return h('div', { className: 'anv-month-groups' },
            Object.entries(grupos).map(([mes, lista]) => h('section', { className: 'anv-month-group', key: mes },
                h('header', { className: 'anv-month-group__header' },
                    h('h3', null, mes),
                    h('span', null, `${lista.length} ${lista.length === 1 ? 'membro' : 'membros'}`)
                ),
                h(MemberGrid, { membros: lista })
            ))
        );
    }

    function LoadingView() {
        return h('div', { className: 'anv-page anv-page--loading' },
            h('section', { className: 'anv-hero' },
                h('div', { className: 'anv-kicker' },
                    h(Icone, { name: 'fa-cake-candles' }),
                    'Calendário NEXUS'
                ),
                h('h1', null, 'Aniversariantes'),
                h('p', null, 'Carregando a constelação de membros ativos...')
            ),
            h('div', { className: 'anv-skeleton-grid' },
                Array.from({ length: 6 }).map((_, index) => h('span', { className: 'anv-skeleton-card', key: index }))
            )
        );
    }

    function ErrorView({ message, onRetry }) {
        return h('div', { className: 'anv-page' },
            h('section', { className: 'anv-hero' },
                h('div', { className: 'anv-kicker anv-kicker--danger' },
                    h(Icone, { name: 'fa-triangle-exclamation' }),
                    'Algo saiu errado'
                ),
                h('h1', null, 'Não foi possível carregar'),
                h('p', null, message || 'Tente novamente em alguns instantes.')
            ),
            h('button', { className: 'anv-retry', type: 'button', onClick: onRetry },
                h(Icone, { name: 'fa-rotate-right' }),
                'Tentar novamente'
            )
        );
    }

    function BirthdaysApp() {
        const [membros, setMembros] = useState([]);
        const [status, setStatus] = useState('loading');
        const [erro, setErro] = useState('');
        const [refreshKey, setRefreshKey] = useState(0);

        useEffect(() => {
            let cancelado = false;

            async function carregar() {
                setStatus('loading');
                setErro('');

                try {
                    const db = await aguardarFirebase();
                    const snapshot = await db.collection('users').where('status', '==', 'Ativo').get();
                    const dados = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

                    if (!cancelado) {
                        setMembros(dados);
                        setStatus('ready');
                    }
                } catch (error) {
                    console.error('Erro ao carregar aniversariantes:', error);
                    if (!cancelado) {
                        setErro('Não consegui conversar com o Firebase agora.');
                        setStatus('error');
                    }
                }
            }

            carregar();

            return () => {
                cancelado = true;
            };
        }, [refreshKey]);

        const dados = useMemo(() => categorizar(membros), [membros]);
        const dataAtual = hoje.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long'
        });

        if (status === 'loading') return h(LoadingView);
        if (status === 'error') {
            return h(ErrorView, {
                message: erro,
                onRetry: () => setRefreshKey((key) => key + 1)
            });
        }

        return h('div', { className: 'anv-page' },
            h('section', { className: 'anv-hero' },
                h('div', { className: 'anv-kicker' },
                    h(Icone, { name: 'fa-star' }),
                    'Dark nebula calendar'
                ),
                h('div', { className: 'anv-hero__content' },
                    h('div', null,
                        h('h1', null, 'Aniversariantes'),
                        h('p', null, 'Os aniversários dos membros ativos em uma vitrine mais bonita, rápida e organizada.')
                    ),
                    h('div', { className: 'anv-today-chip' },
                        h(Icone, { name: 'fa-calendar-day' }),
                        h('span', null, dataAtual)
                    )
                ),
                h('div', { className: 'anv-stats' },
                    h(StatCard, { icon: 'fa-star', label: 'fazem aniversário hoje', value: dados.aniversariantesHoje.length, tone: 'anv-stat--gold' }),
                    h(StatCard, { icon: 'fa-calendar-days', label: 'ainda neste mês', value: dados.aniversariantesMes.length, tone: 'anv-stat--violet' }),
                    h(StatCard, { icon: 'fa-user-astronaut', label: 'membros ativos no calendário', value: dados.total, tone: 'anv-stat--cyan' })
                )
            ),

            h('section', { className: 'anv-section anv-section--today' },
                h('div', { className: 'anv-section__header' },
                    h('span', { className: 'anv-section__eyebrow' }, 'Destaque do dia'),
                    h('h2', null, h(Icone, { name: 'fa-star' }), 'Hoje é o dia de...')
                ),
                dados.aniversariantesHoje.length
                    ? h(MemberGrid, { membros: dados.aniversariantesHoje, destaque: true })
                    : h(EmptyState, {
                        icon: 'fa-moon',
                        title: 'Ninguém soprando velinhas hoje',
                        text: 'A celebração continua no calendário do mês.'
                    })
            ),

            h('section', { className: 'anv-section' },
                h('div', { className: 'anv-section__header' },
                    h('span', { className: 'anv-section__eyebrow' }, MESES[hoje.getMonth()]),
                    h('h2', null, h(Icone, { name: 'fa-calendar-days' }), 'Aniversariantes do mês')
                ),
                dados.aniversariantesMes.length
                    ? h(MemberGrid, { membros: dados.aniversariantesMes })
                    : h(EmptyState, {
                        icon: 'fa-calendar-xmark',
                        title: 'Sem outros aniversários este mês',
                        text: 'Os próximos nomes aparecem logo abaixo.'
                    })
            ),

            h('section', { className: 'anv-section' },
                h('div', { className: 'anv-section__header' },
                    h('span', { className: 'anv-section__eyebrow' }, 'Próxima órbita'),
                    h('h2', null, h(Icone, { name: 'fa-calendar-alt' }), 'Próximos meses')
                ),
                dados.proximos.length
                    ? h(UpcomingGroups, { membros: dados.proximos })
                    : h(EmptyState, {
                        icon: 'fa-circle-check',
                        title: 'Nenhum aniversário futuro encontrado',
                        text: 'Quando houver novos cadastros ativos, eles entram aqui.'
                    })
            )
        );
    }

    document.addEventListener('DOMContentLoaded', () => {
        const rootElement = document.getElementById('aniversariantes-root');
        if (!rootElement) return;

        ReactDOM.createRoot(rootElement).render(h(BirthdaysApp));
    });
}());
