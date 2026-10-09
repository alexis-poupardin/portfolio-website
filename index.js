
// ---------------- carousel-unfolding-map --------------- //

/*
 * Homepage carousel, turned into an unfolding paper map.
 * (Inspired by https://www.frontend.fyi/tutorials/making-a-foldable-map-with-framer-motion,
 *  rewritten in plain JS + CSS: no React / Framer Motion needed.)
 *
 * How it works
 * - Each slide's <img> is cut into 3 panels (left / centre / right) built by this script.
 * - This script only animates ONE number per map: --unfold, from 0 (folded) to 1 (open),
 *   written on the .carousel-image-frame element. All the geometry (panel shifts, skew,
 *   centre panel growing, tilt...) is computed from that number in index.css.
 * - The first unfolding starts when the carousel scrolls into view (this also covers the
 *   click on the compass, which scrolls to #lower-section).
 * - An arrow, a dot or a swipe folds the current map back, then unfolds the new one.
 *
 * (A JS function name cannot contain hyphens, hence "carouselUnfoldingMap".)
 */
function carouselUnfoldingMap() {

    /* ================= SETTINGS: tweak the animation from here ================= */
    const UNFOLD_DURATION = 2000;  // ms: a map unfolds in 2 s
    const FOLD_DURATION   = 2000;  // ms: folding back = the unfolding played in reverse
    const START_DELAY     = 400;   // ms: pause between reaching the section and the first unfolding
    const BORDERS_DELAY   = 1500;  // ms: once unfolded, wait this long before the borders vanish
    const BORDERS_FADE    = 600;   // ms: time the borders / shadows take to fade out
    const VISIBLE_RATIO   = 0.5;   // share of the carousel that must be on screen to launch it

    // Ease-in-out (cubic): t goes 0 -> 1, the result goes 0 -> 1 with a soft start and end.
    const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

    /* ================= Elements ================= */
    const carousel = document.querySelector('#carousel-index');
    if (!carousel) return;

    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dots = [...carousel.querySelectorAll('.carousel-dot')];
    const previousButton = carousel.querySelector('.carousel-control--previous');
    const nextButton = carousel.querySelector('.carousel-control--next');

    if (slides.length < 2 || dots.length !== slides.length || !previousButton || !nextButton) {
        return;
    }

    // Visitors who asked their system for less motion get the maps without any animation.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = prefersReducedMotion ? 0 : 1;   // multiplies every duration: 0 = instant

    /* ================= State ================= */
    let activeIndex = 0;      // map currently on screen
    let targetIndex = 0;      // map the visitor asked for (differs from activeIndex while folding)
    let progress = 0;         // 0 = folded, 1 = fully unfolded
    let runId = 0;            // increases at each request, so older sequences stop by themselves
    let frameId = 0;          // id of the running requestAnimationFrame
    let settlePending = null; // resolves the promise of the running animation
    let hasStarted = false;   // true once the first unfolding was launched (or the visitor clicked)
    let swipeStart = null;
    let observer = null;

    const wrapIndex = (index) => (index + slides.length) % slides.length;
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms * speed));
    const getFrame = (slide) => slide.querySelector('.carousel-image-frame');

    /* ================= Building the 3 panels ================= */
    function buildMap(slide) {
        const frame = getFrame(slide);
        const image = frame.querySelector('img');

        // One wrapper holding the three panels. They are decorative: the <img> keeps the alt text.
        const panels = document.createElement('div');
        panels.className = 'map-panels';
        panels.setAttribute('aria-hidden', 'true');

        ['left', 'center', 'right'].forEach((side) => {
            const panel = document.createElement('div');
            panel.className = `map-panel map-panel--${side}`;
            panels.append(panel);
        });
        frame.append(panels);

        // The image address is given once to CSS: each panel shows one third of it.
        frame.style.setProperty('--map-image', `url("${image.currentSrc || image.src}")`);
    }

    /* ================= Animation engine ================= */
    // Writes the folding state (0..1) on the active map: the CSS does the rest.
    function setProgress(value) {
        progress = value;
        getFrame(slides[activeIndex]).style.setProperty('--unfold', value.toFixed(4));
    }

    // Cancels the running animation (its promise resolves with false).
    function stopAnimation() {
        window.cancelAnimationFrame(frameId);
        if (settlePending) {
            settlePending(false);
            settlePending = null;
        }
    }

    // Moves `progress` to `target` (0 or 1). Resolves true when finished, false if cancelled.
    // The duration is proportional to the distance left, so reversing halfway is smooth.
    function animateTo(target, fullDuration) {
        stopAnimation();

        const from = progress;
        const duration = fullDuration * speed * Math.abs(target - from);

        if (duration <= 0) {
            setProgress(target);
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            settlePending = resolve;
            const startTime = performance.now();

            const step = (now) => {
                const t = Math.min(Math.max((now - startTime) / duration, 0), 1);
                setProgress(from + (target - from) * ease(t));

                if (t < 1) {
                    frameId = window.requestAnimationFrame(step);
                } else {
                    settlePending = null;
                    resolve(true);
                }
            };
            frameId = window.requestAnimationFrame(step);
        });
    }

    /* ================= Showing a map ================= */
    function updateDots(index) {
        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === index;
            dot.classList.toggle('is-active', isActive);

            if (isActive) {
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.removeAttribute('aria-current');
            }
        });
    }

    // Swaps the visible slide instantly (the new map starts folded).
    function render(index) {
        activeIndex = index;

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === activeIndex;

            slide.classList.toggle('is-active', isActive);
            slide.classList.remove('is-borderless', 'is-settled');
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        setProgress(0);
    }

    // Full sequence: fold the current map back, swap, unfold the new one, then clean the borders.
    // If the visitor asks for another map meanwhile, runId changes and this sequence stops.
    async function showSlide(index) {
        const myRun = ++runId;
        const isOutdated = () => myRun !== runId;

        stopAnimation();

        // Borders, shadows and the flat image go back at once (they fade back in while folding).
        slides[activeIndex].classList.remove('is-borderless', 'is-settled');

        if (index !== activeIndex) {
            // 1. Fold the current map back (reversed animation).
            await animateTo(0, FOLD_DURATION);
            if (isOutdated()) return;

            // 2. Swap to the new map, folded.
            render(index);
        }

        const slide = slides[activeIndex];

        // Make sure the picture is ready, otherwise the unfolding would show an empty map.
        try {
            await slide.querySelector('img').decode();
        } catch (error) {
            /* A broken image must not block the carousel. */
        }
        if (isOutdated()) return;

        // 3. Unfold (2 s).
        await animateTo(1, UNFOLD_DURATION);
        if (isOutdated()) return;

        // 4. 1.5 s later the borders, shadows and crease shading fade away...
        await wait(BORDERS_DELAY);
        if (isOutdated()) return;
        slide.classList.add('is-borderless');

        // 5. ...then the three panels are replaced by the plain image (nothing left over it).
        await wait(BORDERS_FADE);
        if (isOutdated()) return;
        slide.classList.add('is-settled');
    }

    /* ================= Navigation: arrows, dots, swipe ================= */
    function goTo(index) {
        const wanted = wrapIndex(index);
        if (wanted === targetIndex) return;

        targetIndex = wanted;
        hasStarted = true;                 // the visitor took over: no automatic first unfolding
        if (observer) observer.disconnect();

        updateDots(wanted);                // immediate feedback on the dots
        showSlide(wanted);
    }

    const showPrevious = () => goTo(targetIndex - 1);
    const showNext = () => goTo(targetIndex + 1);

    previousButton.addEventListener('click', showPrevious);
    nextButton.addEventListener('click', showNext);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goTo(index));
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

    /* ================= First unfolding: when the visitor reaches the section ================= */
    function launchFirstUnfolding() {
        if (hasStarted) return;
        hasStarted = true;
        if (observer) observer.disconnect();

        window.setTimeout(() => {
            if (runId === 0) showSlide(activeIndex);   // skipped if the visitor already clicked
        }, START_DELAY * speed);
    }

    /* ================= Start ================= */
    slides.forEach(buildMap);
    carousel.classList.add('is-enhanced');                          // CSS switches to the folding map
    carousel.style.setProperty('--borders-fade', `${BORDERS_FADE * speed}ms`);
    updateDots(activeIndex);
    render(activeIndex);                                            // first map shown folded

    if ('IntersectionObserver' in window) {
        // One callback covers the compass click (smooth scroll to #lower-section) and a manual scroll.
        // Thresholds every 5 % so the check below runs often enough while scrolling.
        observer = new IntersectionObserver(([entry]) => {
            const viewportHeight = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;
            // On very short screens the carousel can be taller than the screen: compare with the smaller one.
            const needed = Math.min(entry.boundingClientRect.height, viewportHeight) * VISIBLE_RATIO;

            if (entry.isIntersecting && entry.intersectionRect.height >= needed) {
                launchFirstUnfolding();
            }
        }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

        observer.observe(carousel);
    } else {
        launchFirstUnfolding();   // very old browsers: unfold straight away
    }
}

carouselUnfoldingMap();
