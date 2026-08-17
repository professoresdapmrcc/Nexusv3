// js/subforum.js - VERSÃO COM TUDO FECHADO

document.addEventListener('DOMContentLoaded', () => {
    const accordionItems = document.querySelectorAll('.accordion-item');

    // O bloco que abria o primeiro item foi REMOVIDO.

    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');

        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Fecha todos os outros itens antes de qualquer ação
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Se o item clicado não estava ativo, ele será aberto.
            // Se já estava, o passo anterior já o fechou.
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});