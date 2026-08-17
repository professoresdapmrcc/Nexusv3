document.addEventListener('DOMContentLoaded', () => {
    const filters = [...document.querySelectorAll('[data-course-filter]')];
    const cards = [...document.querySelectorAll('[data-course-track]')];

    filters.forEach((filter) => {
        filter.addEventListener('click', () => {
            const selectedTrack = filter.dataset.courseFilter;
            filters.forEach((item) => {
                const isCurrent = item === filter;
                item.classList.toggle('is-active', isCurrent);
                item.setAttribute('aria-pressed', String(isCurrent));
            });

            cards.forEach((card) => {
                const isVisible = selectedTrack === 'all' || card.dataset.courseTrack === selectedTrack;
                card.classList.toggle('is-filtered', !isVisible);
            });
        });
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        cards.forEach((card, index) => {
            card.style.setProperty('--course-delay', `${(index % 4) * 70}ms`);
            card.classList.add('course-card--reveal');
            observer.observe(card);
        });
    }
});
