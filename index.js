
// ---------------- carousel-unfolding-map --------------- //


function carouselUnfoldingMap() {

    /* ================= SETTINGS: tweak the animation from here ================= */
    const UNFOLD_DURATION     = 2000;  // ms: a map unfolds in 2 s
    const FOLD_DURATION       = 2000;  // ms: folding back = the unfolding played in reverse
    const TRANSITION_DURATION = 1000;  // ms: short slide transition between pictures
    const START_DELAY         = 400;   // ms: pause between reaching the section and the first unfolding
    const BORDERS_DELAY       = 100;   // ms: once unfolded, wait this long before the borders vanish
    const BORDERS_FADE        = 500;   // ms: time the borders / shadows take to fade out
    const VISIBLE_RATIO       = 0.5;   // share of the carousel that must be on screen to launch it

    // Ease-in-out (cubic): t goes 0 -> 1, the result goes 0 -> 1 with a soft start and end.
    const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

    /* ================= Elements ================= */
    if (typeof updateMobileNav === 'function') {
        updateMobileNav();
    }

    const carousel = document.querySelector('#carousel-index');
    if (!carousel) return;

    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const previousButton = carousel.querySelector('.carousel-control--previous');
    const nextButton = carousel.querySelector('.carousel-control--next');

    if (slides.length === 0) {
        if (previousButton) previousButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        return;
    }

    const hasMultiple = slides.length > 1;

    // Show or hide previous/next buttons depending on whether multiple slides exist
    if (previousButton) {
        previousButton.style.display = hasMultiple ? '' : 'none';
        previousButton.hidden = !hasMultiple;
    }
    if (nextButton) {
        nextButton.style.display = hasMultiple ? '' : 'none';
        nextButton.hidden = !hasMultiple;
    }

    const speed = 1;

    /* ================= State ================= */
    // Starts with the first article class="carousel-slide" in index.html starting from the top
    let activeIndex = 0;                                       // map currently on screen
    let targetIndex = 0;                                       // map the visitor asked for (differs from activeIndex while folding)
    let progress = 0;         // 0 = folded, 1 = fully unfolded
    let runId = 0;            // increases at each request, so older sequences stop by themselves
    let frameId = 0;          // id of the running requestAnimationFrame
    let settlePending = null; // resolves the promise of the running animation
    let hasStarted = false;   // true once the first unfolding was launched (or the visitor clicked)
    let observer = null;
    let dots = [];            // dynamically managed to always match slides.length

    const wrapIndex = (index) => (index + slides.length) % slides.length;
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms * speed));
    const getFrame = (slide) => slide?.querySelector('.carousel-image-frame');

    /* ================= Building the 3 panels ================= */
    function buildMap(slide) {
        const frame = getFrame(slide);
        if (!frame) return;
        const image = frame.querySelector('img');
        if (!image) return;

        // One wrapper holding the three panels. They are decorative: the <img> keeps the alt text.
        let panels = frame.querySelector('.map-panels');
        if (!panels) {
            panels = document.createElement('div');
            panels.className = 'map-panels';
            panels.setAttribute('aria-hidden', 'true');

            ['left', 'center', 'right'].forEach((side) => {
                const panel = document.createElement('div');
                panel.className = `map-panel map-panel--${side}`;
                panels.append(panel);
            });
            frame.append(panels);
        }

        // The image address is given once to CSS: each panel shows one third of it.
        const updateImageSrc = () => {
            const src = image.currentSrc || image.src;
            if (src) {
                frame.style.setProperty('--map-image', `url("${src}")`);
            }
        };
        updateImageSrc();
        if (!image.complete) {
            image.addEventListener('load', updateImageSrc, { once: true });
        }
    }

    /* ================= Animation engine ================= */
    // Writes the folding state (0..1) on the active map: the CSS does the rest.
    function setProgress(value) {
        progress = value;
        const activeSlide = slides[activeIndex];
        if (activeSlide) {
            const frame = getFrame(activeSlide);
            if (frame) {
                frame.style.setProperty('--unfold', value.toFixed(4));
            }
        }
    }

    // Removes any temporary inline styles applied during slide transitions.
    function clearTransitionStyles() {
        slides.forEach((slide) => {
            slide.style.removeProperty('transform');
            slide.style.removeProperty('opacity');
            slide.style.removeProperty('visibility');
            slide.style.removeProperty('pointer-events');
            slide.style.removeProperty('will-change');
        });
    }

    // Cancels the running animation (its promise resolves with false).
    function stopAnimation() {
        window.cancelAnimationFrame(frameId);
        clearTransitionStyles();
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

    // Short slide transition between pictures (duration: 1 second).
    // direction > 0: unfolding new picture from the right (current -> left, new from right -> middle)
    // direction < 0: unfolding picture from the left (current -> right, new from left -> middle)
    function animateSlideTransition(fromSlide, toSlide, direction, fullDuration) {
        stopAnimation();

        const duration = fullDuration || 1000;

        if (!fromSlide || !toSlide) {
            return Promise.resolve(true);
        }

        const exitSign = direction > 0 ? -1 : 1;
        const enterSign = direction > 0 ? 1 : -1;

        // Ensure toSlide is prepared in folded state (progress = 0)
        const toFrame = getFrame(toSlide);
        if (toFrame) {
            toFrame.style.setProperty('--unfold', '0');
            const toImg = toSlide.querySelector('img');
            if (toImg) {
                const src = toImg.currentSrc || toImg.src;
                if (src) toFrame.style.setProperty('--map-image', `url("${src}")`);
            }
        }
        toSlide.classList.remove('is-borderless', 'is-settled');

        fromSlide.classList.add('is-active');
        fromSlide.style.visibility = 'visible';
        fromSlide.style.pointerEvents = 'none';
        fromSlide.style.willChange = 'transform, opacity';
        fromSlide.style.transform = 'translateX(0%)';
        fromSlide.style.opacity = '1';

        toSlide.classList.add('is-active');
        toSlide.style.visibility = 'visible';
        toSlide.style.pointerEvents = 'none';
        toSlide.style.willChange = 'transform, opacity';
        toSlide.style.transform = `translateX(${enterSign * 100}%)`;
        toSlide.style.opacity = '0';

        return new Promise((resolve) => {
            settlePending = resolve;
            const startTime = performance.now();

            const step = (now) => {
                const t = Math.min(Math.max((now - startTime) / duration, 0), 1);
                const easedT = ease(t);

                // Current folded map goes to the side until it disappears / fades away
                const fromX = exitSign * 100 * easedT;
                const fromOpacity = 1 - easedT;
                fromSlide.style.transform = `translateX(${fromX.toFixed(2)}%)`;
                fromSlide.style.opacity = fromOpacity.toFixed(4);

                // New folded map comes from the side into the middle
                const toX = enterSign * 100 * (1 - easedT);
                const toOpacity = easedT;
                toSlide.style.transform = `translateX(${toX.toFixed(2)}%)`;
                toSlide.style.opacity = toOpacity.toFixed(4);

                if (t < 1) {
                    frameId = window.requestAnimationFrame(step);
                } else {
                    settlePending = null;
                    clearTransitionStyles();
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
            slide.style.removeProperty('transform');
            slide.style.removeProperty('opacity');
            slide.style.removeProperty('visibility');
            slide.style.removeProperty('pointer-events');
            slide.style.removeProperty('will-change');

            // Keep accessibility label in sync with current slide count
            if (hasMultiple) {
                slide.setAttribute('aria-label', `${slideIndex + 1} of ${slides.length}`);
            }
        });

        setProgress(0);
    }

    // Full sequence: fold the current map back, slide transition (1 s), swap, unfold the new one, then clean the borders.
    // If the visitor asks for another map meanwhile, runId changes and this sequence stops.
    async function showSlide(index, direction = 1) {
        const myRun = ++runId;
        const isOutdated = () => myRun !== runId;

        stopAnimation();

        // Borders, shadows and the flat image go back at once (they fade back in while folding).
        if (slides[activeIndex]) {
            slides[activeIndex].classList.remove('is-borderless', 'is-settled');
        }

        if (index !== activeIndex) {
            const fromSlide = slides[activeIndex];
            const toSlide = slides[index];

            // Pre-decode target image early so it's ready when sliding into view
            const targetImg = toSlide?.querySelector('img');
            if (targetImg && targetImg.decode) {
                targetImg.decode().catch(() => {});
            }

            // 1. Fold the current map back (reversed animation).
            await animateTo(0, FOLD_DURATION);
            if (isOutdated()) return;

            // 2. Short slide transition between pictures (duration : 1 second).
            // Current folded map goes to the side and fades away; new folded map comes in from the opposite side.
            await animateSlideTransition(fromSlide, toSlide, direction, TRANSITION_DURATION);
            if (isOutdated()) return;

            // 3. Swap to the new map, folded at middle.
            render(index);
        }

        const slide = slides[activeIndex];
        if (!slide) return;

        // Make sure the picture is ready, otherwise the unfolding would show an empty map.
        const img = slide.querySelector('img');
        if (img) {
            try {
                await img.decode();
            } catch (error) {
                /* A broken image must not block the carousel. */
            }
        }
        if (isOutdated()) return;

        // 4. When the new picture reaches the middle, unfold as usual (2 s).
        await animateTo(1, UNFOLD_DURATION);
        if (isOutdated()) return;

        // 5. 1.5 s later the borders, shadows and crease shading fade away...
        await wait(BORDERS_DELAY);
        if (isOutdated()) return;
        slide.classList.add('is-borderless');

        // 6. ...then the three panels are replaced by the plain image (nothing left over it).
        await wait(BORDERS_FADE);
        if (isOutdated()) return;
        slide.classList.add('is-settled');
    }

    /* ================= Navigation: arrows, dots, swipe ================= */
    function goTo(index, direction) {
        if (!hasMultiple) return;
        const wanted = wrapIndex(index);
        if (wanted === targetIndex) return;

        // Determine direction if not provided (e.g. from dot click):
        // 1 = new picture comes from right; -1 = new picture comes from left
        const dir = direction !== undefined
            ? direction
            : (wanted > targetIndex ? 1 : (wanted < targetIndex ? -1 : (wanted > activeIndex ? 1 : -1)));

        targetIndex = wanted;
        hasStarted = true;                 // the visitor took over: no automatic first unfolding
        if (observer) observer.disconnect();

        updateDots(wanted);                // immediate feedback on the dots
        showSlide(wanted, dir);
    }

    const showPrevious = () => {
        if (hasMultiple) goTo(targetIndex - 1, -1);
    };
    const showNext = () => {
        if (hasMultiple) goTo(targetIndex + 1, 1);
    };

    if (previousButton) {
        previousButton.addEventListener('click', showPrevious);
    }
    if (nextButton) {
        nextButton.addEventListener('click', showNext);
    }

    // Creates dots dynamically based on the number of slides
    function setupDots() {
        if (!dotsContainer) return;

        dotsContainer.style.display = hasMultiple ? '' : 'none';
        dotsContainer.hidden = !hasMultiple;
        dotsContainer.innerHTML = '';

        if (hasMultiple) {
            dots = slides.map((_, index) => {
                const dot = document.createElement('button');
                dot.className = 'carousel-dot';
                dot.type = 'button';
                dot.setAttribute('aria-label', `Show image ${index + 1}`);
                dot.addEventListener('click', () => goTo(index));
                dotsContainer.append(dot);
                return dot;
            });
        }
    }

    // Native touch swipe handling for mobile devices (iOS, iPadOS, Android)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let touchDeltaY = 0;

    carousel.addEventListener('touchstart', (event) => {
        if (!hasMultiple) return;
        if (event.target.closest('.carousel-control, .carousel-dot')) return;
        const touch = event.touches[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchDeltaX = 0;
        touchDeltaY = 0;
    }, { passive: true });

    carousel.addEventListener('touchmove', (event) => {
        if (!touchStartX) return;
        const touch = event.touches[0];
        if (!touch) return;
        touchDeltaX = touch.clientX - touchStartX;
        touchDeltaY = touch.clientY - touchStartY;
    }, { passive: true });

    carousel.addEventListener('touchend', () => {
        if (!touchStartX) return;
        const distX = touchDeltaX;
        const distY = touchDeltaY;
        touchStartX = 0;
        touchStartY = 0;
        touchDeltaX = 0;
        touchDeltaY = 0;

        /* Ignore taps and vertical page-scroll gestures. */
        if (Math.abs(distX) < 40 || Math.abs(distX) <= Math.abs(distY)) {
            return;
        }

        if (!hasMultiple) return;

        if (distX > 0) {
            showPrevious();
        } else {
            showNext();
        }
    }, { passive: true });

    // Pointer-based drag handling for desktop mouse/pen interaction
    let isPointerDragging = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerDeltaX = 0;
    let pointerDeltaY = 0;

    carousel.addEventListener('pointerdown', (event) => {
        if (!hasMultiple) return;
        if (event.pointerType === 'touch') return; // touch handled by touchstart/touchend
        if (event.target.closest('.carousel-control, .carousel-dot')) return;
        isPointerDragging = true;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        pointerDeltaX = 0;
        pointerDeltaY = 0;
    });

    carousel.addEventListener('pointermove', (event) => {
        if (!isPointerDragging) return;
        pointerDeltaX = event.clientX - pointerStartX;
        pointerDeltaY = event.clientY - pointerStartY;
    });

    const endPointerDrag = () => {
        if (!isPointerDragging) return;
        isPointerDragging = false;
        const distX = pointerDeltaX;
        const distY = pointerDeltaY;
        pointerDeltaX = 0;
        pointerDeltaY = 0;

        if (Math.abs(distX) < 40 || Math.abs(distX) <= Math.abs(distY)) {
            return;
        }

        if (!hasMultiple) return;

        if (distX > 0) {
            showPrevious();
        } else {
            showNext();
        }
    };

    carousel.addEventListener('pointerup', endPointerDrag);
    carousel.addEventListener('pointercancel', () => { isPointerDragging = false; });

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
    setupDots();
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carouselUnfoldingMap);
} else {
    carouselUnfoldingMap();
}
