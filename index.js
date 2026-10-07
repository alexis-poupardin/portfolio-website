// index.js — homepage only
// Adds the class "nav-over-hero" to <body> while the navigation bar is above the hero image.
// index.css uses that class to make the nav more transparent.

(() => {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;                 // safety guard: do nothing on pages without a hero

    const FALLBACK_NAV_MIDDLE = 60;    // px, used until includes.js has injected the nav
    let ticking = false;               // avoids running the check more than once per frame

    function update() {
        // The nav is injected by includes.js after a fetch(), so look it up at call time
        const nav = document.querySelector('.navigation');
        const navMiddle = nav
            ? nav.getBoundingClientRect().top + nav.offsetHeight / 2
            : FALLBACK_NAV_MIDDLE;

        // Over the hero as long as the hero's bottom edge is still below the nav's middle
        const overHero = hero.getBoundingClientRect().bottom > navMiddle;
        document.body.classList.toggle('nav-over-hero', overHero);
    }

    // Throttle scroll events with requestAnimationFrame (smooth + cheap)
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            update();
            ticking = false;
        });
    }, { passive: true });

    window.addEventListener('resize', update);
    update();                          // set the right state on page load
})();



// ---------------- carousel homepage --------------- //

(() => {
    const carousel = document.querySelector('#carousel-index');
    if (!carousel) return;

    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dots = [...carousel.querySelectorAll('.carousel-dot')];
    const previousButton = carousel.querySelector('.carousel-control--previous');
    const nextButton = carousel.querySelector('.carousel-control--next');
    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    let activeIndex = 0;
    let autoplayId = null;
    let swipeStart = null;

    if (slides.length < 2 || dots.length !== slides.length || !previousButton || !nextButton) {
        return;
    }

    const wrapIndex = (index) => (index + slides.length) % slides.length;

    function render(index) {
        activeIndex = wrapIndex(index);
        const previousIndex = wrapIndex(activeIndex - 1);
        const nextIndex = wrapIndex(activeIndex + 1);

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === activeIndex;

            slide.classList.toggle('is-active', isActive);
            slide.classList.toggle('is-previous', slideIndex === previousIndex);
            slide.classList.toggle('is-next', slideIndex === nextIndex);
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === activeIndex;
            dot.classList.toggle('is-active', isActive);
            dot.toggleAttribute('aria-current', isActive);
        });
    }

    function stopAutoplay() {
        if (autoplayId === null) return;

        window.clearInterval(autoplayId);
        autoplayId = null;
        carousel.dataset.autoplay = 'off';
    }

    function showPrevious() {
        stopAutoplay();
        render(activeIndex - 1);
    }

    function showNext() {
        stopAutoplay();
        render(activeIndex + 1);
    }

    previousButton.addEventListener('click', showPrevious);
    nextButton.addEventListener('click', showNext);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoplay();
            render(index);
        });
    });

    carousel.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch') return;
        if (event.target.closest('.carousel-control, .carousel-dot')) return;

        swipeStart = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY
        };

        carousel.setPointerCapture?.(event.pointerId);
    });

    carousel.addEventListener('pointerup', (event) => {
        if (!swipeStart || event.pointerId !== swipeStart.id) return;

        const distanceX = event.clientX - swipeStart.x;
        const distanceY = event.clientY - swipeStart.y;
        swipeStart = null;

        carousel.releasePointerCapture?.(event.pointerId);

        /* Ignore taps and vertical page-scroll gestures. */
        if (Math.abs(distanceX) < 48 || Math.abs(distanceX) <= Math.abs(distanceY)) {
            return;
        }

        if (distanceX > 0) {
            showPrevious();
        } else {
            showNext();
        }
    });

    carousel.addEventListener('pointercancel', () => {
        swipeStart = null;
    });

    render(activeIndex);

    if (!prefersReducedMotion) {
        autoplayId = window.setInterval(() => {
            render(activeIndex + 1);
        }, 5000);
    }
})();