

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