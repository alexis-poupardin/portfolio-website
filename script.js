// ------------------- lighbox ----------------- // 

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('global-lightbox');
    if (!lightbox) return;
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    // Add click event to every image with class "images"
    document.querySelectorAll('.images').forEach(img => {
        img.addEventListener('click', () => {
            // 1. Copy image source and alt text to the popup
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            
            // 2. Find the caption paragraph associated with this image
            let caption = null;
            if (img.nextElementSibling && img.nextElementSibling.classList.contains('caption')) {
                caption = img.nextElementSibling;
            } else {
                const wrapper = img.closest('.image-wrapper');
                caption = wrapper ? wrapper.querySelector('.caption') : null;
            }
            
            // 3. Copy the caption text into the popup
            lightboxCaption.textContent = caption ? caption.textContent : '';

            // 4. Display the popup
            lightbox.classList.add('active');
        });
    });

    // Close popup on clicking the 'X' or outside the image container
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === closeBtn) {
            lightbox.classList.remove('active');
        }
    });

    // Close popup with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            lightbox.classList.remove('active');
        }
    });
});




// ------------------- map mosaic + carousel ----------------- //

document.addEventListener('DOMContentLoaded', () => {
    let carousel = document.getElementById('map-carousel');

    if (!carousel) {
        if (!document.querySelector('.map-wrapper')) return; // no mosaic on this page: nothing to do

        carousel = document.createElement('div');
        carousel.id = 'map-carousel';
        carousel.className = 'lightbox';
        carousel.innerHTML = `
            <div class="lightbox-content">
                <span class="lightbox-close map-carousel-close">&times;</span>
                <img id="map-carousel-img" src="" alt="">

                <div class="map-carousel-controls">
                    <span class="map-carousel-arrow map-carousel-prev" aria-label="Previous map">&#10094;</span>
                    <p id="map-caption"></p>
                    <span class="map-carousel-arrow map-carousel-next" aria-label="Next map">&#10095;</span>
                </div>
            </div>`;
        document.body.appendChild(carousel);
    }

    const carouselImg = document.getElementById('map-carousel-img');
    const mapCaption = document.getElementById('map-caption') || carousel.querySelector('.caption');
    const closeBtn = carousel.querySelector('.map-carousel-close');
    const prevBtn = carousel.querySelector('.map-carousel-prev');
    const nextBtn = carousel.querySelector('.map-carousel-next');
    const lightboxContent = carousel.querySelector('.lightbox-content');

    let currentTiles = [];
    let currentIndex = 0;

    // Magnifier state
    let isMagnifierActive = false;
    const ZOOM_FACTOR = 2.5;
    const TARGET_SIZE = 340; // twice the previous 170px size

    // Create magnifying glass element in the carousel
    let magnifier = carousel.querySelector('.map-magnifier');
    if (!magnifier) {
        magnifier = document.createElement('div');
        magnifier.className = 'map-magnifier';
        magnifier.setAttribute('aria-hidden', 'true');
        carousel.appendChild(magnifier);
    }

    // Informative pill indicating zoom status and how to exit
    let magnifierPill = lightboxContent ? lightboxContent.querySelector('.map-magnifier-pill') : null;
    if (!magnifierPill && lightboxContent) {
        magnifierPill = document.createElement('div');
        magnifierPill.className = 'map-magnifier-pill';
        magnifierPill.setAttribute('aria-hidden', 'true');
        magnifierPill.textContent = window.matchMedia('(pointer: coarse)').matches
            ? 'Tap image to exit zoom'
            : 'Click image to exit zoom';
        lightboxContent.appendChild(magnifierPill);
    }

    function updateMagnifierSrc() {
        if (!carouselImg) return;
        const src = carouselImg.currentSrc || carouselImg.src;
        if (src) {
            magnifier.style.backgroundImage = `url("${src}")`;
        }
    }

    function updateMagnifierPosition(clientX, clientY, isTouch = false) {
        if (!isMagnifierActive || !carouselImg) return;

        const rect = carouselImg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        // Position clamped to image bounds
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

        const glassSize = Math.min(
            TARGET_SIZE,
            Math.floor(window.innerWidth * 0.88),
            Math.floor(window.innerHeight * 0.55)
        );
        const glassRadius = glassSize / 2;

        magnifier.style.width = `${glassSize}px`;
        magnifier.style.height = `${glassSize}px`;

        let glassLeft = clientX - glassRadius;
        let glassTop = clientY - glassRadius;

        if (isTouch) {
            // On touch devices (mobile), position the lens above the finger so it is never obstructed
            const touchOffsetAbove = glassRadius + 45;
            if (clientY - touchOffsetAbove >= 15) {
                glassTop = clientY - touchOffsetAbove;
            } else {
                // If touching near the top edge of screen, position below the finger
                glassTop = clientY + 45;
            }
        }

        // Clamp inside the visible viewport
        glassLeft = Math.max(12, Math.min(glassLeft, window.innerWidth - glassSize - 12));
        glassTop = Math.max(12, Math.min(glassTop, window.innerHeight - glassSize - 12));

        magnifier.style.left = `${glassLeft}px`;
        magnifier.style.top = `${glassTop}px`;

        // Background size and position for 2.5x magnification
        const bgW = rect.width * ZOOM_FACTOR;
        const bgH = rect.height * ZOOM_FACTOR;

        const bgX = -(x * ZOOM_FACTOR - glassRadius);
        const bgY = -(y * ZOOM_FACTOR - glassRadius);

        magnifier.style.backgroundSize = `${bgW}px ${bgH}px`;
        magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }

    function activateMagnifier(clientX, clientY, isTouch = false) {
        isMagnifierActive = true;
        updateMagnifierSrc();
        carousel.classList.add('is-magnifier-active');
        magnifier.classList.add('is-active');
        updateMagnifierPosition(clientX, clientY, isTouch);
    }

    function deactivateMagnifier() {
        if (!isMagnifierActive) return;
        isMagnifierActive = false;
        carousel.classList.remove('is-magnifier-active');
        magnifier.classList.remove('is-active');
    }

    // Only activate/toggle magnifying glass when the opened carousel image is clicked
    if (carouselImg) {
        carouselImg.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isMagnifierActive) {
                deactivateMagnifier();
            } else {
                activateMagnifier(e.clientX, e.clientY, e.pointerType === 'touch');
            }
        });

        // Desktop mouse tracking while magnifier is active
        carouselImg.addEventListener('pointermove', (e) => {
            if (!isMagnifierActive) return;
            if (e.pointerType === 'mouse') {
                updateMagnifierPosition(e.clientX, e.clientY, false);
            }
        });

        // Mobile touch tracking while magnifier is active
        carouselImg.addEventListener('touchstart', (e) => {
            if (!isMagnifierActive) return;
            const touch = e.touches[0];
            if (touch) {
                updateMagnifierPosition(touch.clientX, touch.clientY, true);
            }
        }, { passive: true });

        carouselImg.addEventListener('touchmove', (e) => {
            if (!isMagnifierActive) return;
            e.preventDefault(); // prevent viewport scrolling while dragging magnifier on mobile
            const touch = e.touches[0];
            if (touch) {
                updateMagnifierPosition(touch.clientX, touch.clientY, true);
            }
        }, { passive: false });
    }

    // Counter element positioned below the caption in the viewing window
    let mapCounter = carousel.querySelector('#map-counter') || carousel.querySelector('.map-counter');
    if (!mapCounter && mapCaption) {
        mapCounter = document.createElement('div');
        mapCounter.id = 'map-counter';
        mapCounter.className = 'map-counter';

        let captionWrapper = mapCaption.closest('.map-carousel-caption-wrapper');
        if (!captionWrapper) {
            captionWrapper = document.createElement('div');
            captionWrapper.className = 'map-carousel-caption-wrapper';
            mapCaption.parentNode.insertBefore(captionWrapper, mapCaption);
            captionWrapper.appendChild(mapCaption);
        }
        captionWrapper.appendChild(mapCounter);
    }

    // Credits line, created right under the caption (above the counter).
    // It is filled from the hidden <p class="credits"> of the active tile.
    let mapCredits = carousel.querySelector('#map-credits');
    if (!mapCredits && mapCaption) {
        mapCredits = document.createElement('p');
        mapCredits.id = 'map-credits';
        mapCredits.className = 'credits';
        mapCredits.hidden = true;                       // stays hidden for tiles without credits
        mapCaption.insertAdjacentElement('afterend', mapCredits);
    }

    // Displays the tile at "index", wrapping around at both ends
    function showSlide(index) {
        currentIndex = (index + currentTiles.length) % currentTiles.length;
        const tile = currentTiles[currentIndex];
        const img = tile.querySelector('.map');
        const caption = tile.querySelector('.caption');

        deactivateMagnifier();

        carouselImg.src = img.src;
        carouselImg.alt = img.alt;
        mapCaption.textContent = caption ? caption.textContent : '';

        // Copy the credits as HTML (not text) so the link inside stays clickable.
        // The source is your own page markup, so innerHTML is safe here.
        const credits = tile.querySelector('.credits');
        if (mapCredits) {
            mapCredits.innerHTML = credits ? credits.innerHTML : '';
            mapCredits.hidden = !credits;               // no credits on this tile: hide the line
        }

        if (mapCounter) {
            mapCounter.textContent = currentTiles.length > 0
                ? `${currentIndex + 1} / ${currentTiles.length}`
                : '';
        }

        // No point showing arrows when there is nothing else to browse to
        const hasMultiple = currentTiles.length > 1;
        prevBtn.style.display = hasMultiple ? '' : 'none';
        nextBtn.style.display = hasMultiple ? '' : 'none';
    }

    // Clicking any mosaic tile opens the carousel on that tile (thumbnails themselves do not magnify)
    document.querySelectorAll('.map-wrapper').forEach(wrapper => {
        const tiles = Array.from(wrapper.querySelectorAll('.map-tile'));

        tiles.forEach(tile => {
            tile.addEventListener('click', () => {
                currentTiles = tiles;              // this wrapper's mosaic order
                showSlide(tiles.indexOf(tile));    // open on the clicked tile
                carousel.classList.add('active');
            });
        });
    });

    // Previous / next slide
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't let the click reach the close handler below
        showSlide(currentIndex - 1);
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(currentIndex + 1);
    });

    // Close popup on clicking the 'X' or outside the image container
    carousel.addEventListener('click', (e) => {
        if (e.target === carousel || e.target === closeBtn) {
            deactivateMagnifier();
            carousel.classList.remove('active');
        } else if (isMagnifierActive && e.target !== carouselImg) {
            deactivateMagnifier();
        }
    });

    // Keyboard navigation: Escape closes magnifier or popup, left/right arrows browse.
    document.addEventListener('keydown', (e) => {
        if (!carousel.classList.contains('active')) return;

        if (e.key === 'Escape') {
            if (isMagnifierActive) {
                deactivateMagnifier();
            } else {
                carousel.classList.remove('active');
            }
        } else if (e.key === 'ArrowLeft') {
            showSlide(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showSlide(currentIndex + 1);
        }
    });

    // Touch swipe, so mobile visitors can browse with a finger when magnifier is not active.
    let touchStartX = 0;
    let touchStartY = 0;

    carousel.addEventListener('touchstart', (e) => {
        if (isMagnifierActive) return;
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    });

    carousel.addEventListener('touchend', (e) => {
        if (isMagnifierActive) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const swipeThreshold = 40; // minimum px to count as an intentional swipe

        if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                showSlide(currentIndex - 1); // swiped right -> previous
            } else {
                showSlide(currentIndex + 1); // swiped left -> next
            }
        }
    });
});





// ---------------- autoscrolling to <section class="article-section"> ------------- //

// The auto-scroll is switched off on mobile devices (small screens or touch-only devices).
// Edit this media query to change what counts as "mobile".
const MOBILE_QUERY = '(max-width: 600px), (hover: none) and (pointer: coarse)';

document.addEventListener('DOMContentLoaded', () => {
    if (window.matchMedia(MOBILE_QUERY).matches) return;   // mobile: no auto-scroll

    const targetSection = document.querySelector('.article-section');

    if (targetSection) {
        setTimeout(() => {
            // Change duration in milliseconds to adjust speed (e.g., 1500 = 1.5 seconds)
            smoothScrollTo(targetSection, 1500); 
        }, 400);
    }
});

// Custom function to control scroll duration and speed
function smoothScrollTo(element, duration = 1000) {
    const navbarHeight = 110; // Match your scroll-margin-top
    const targetPosition = element.getBoundingClientRect().top + window.scrollY - navbarHeight;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    let startTime = null;

    // Easing function for smooth acceleration and deceleration (easeInOutQuad)
    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t + b;
        t--;
        return (-c / 2) * (t * (t - 2) - 1) + b;
    }

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        
        window.scrollTo(0, run);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}




// ---------------- mobile navigation bar scroll behavior ----------------- //
// On mobile devices (<= 960px), the navigation bar moves up as the visitor
// scrolls down, taking the place of the header and language switcher once
// scrolled down enough, and pinning at --header-top.

function updateMobileNav() {
    const nav = document.querySelector('.navigation');
    if (!nav) return;

    const isMobile = window.matchMedia('(max-width: 960px)').matches;
    if (!isMobile) {
        nav.style.top = '';
        nav.style.removeProperty('--mobile-nav-top');
        return;
    }

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const headerTop = 1 * rem;
    const logoWidth = 4 * rem;
    const extraGap = 0.75 * rem;

    const targetTop = headerTop;
    const initialTop = headerTop + logoWidth + extraGap;
    const maxShift = initialTop - targetTop;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const shift = Math.min(Math.max(scrollY, 0), maxShift);
    const currentTop = initialTop - shift;

    nav.style.top = `${currentTop}px`;
    nav.style.setProperty('--mobile-nav-top', `${currentTop}px`);
}




// ------------------- adaptive interface contrast ----------------- //
// Checks the background behind the shared interface elements (navigation bar,
// language switcher, footer).  They receive .is-on-dark for ivory text; otherwise
// they use dark ink.
// A section can force its result with data-ui-theme="dark" / "light".

(() => {
    const DARK_CLASS = 'is-on-dark';
    const BRIGHTNESS_LIMIT = 0.5;
    const MIN_OPACITY = 0.5;
    const THEME_TARGETS = [
        { root: '.navigation', probe: 'nav > ul' },
        { root: '.language-switcher', probe: 'select' },
        { root: 'footer', probe: '.footer-text' },
    ];

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleCanvas.height = 1;
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    let ticking = false;

    function parseColor(css) {
        const numbers = css.match(/[\d.]+/g);
        if (!numbers || numbers.length < 3 || css.startsWith('color(')) return null;
        const [r, g, b] = numbers.map(Number);
        const a = numbers.length > 3 ? Number(numbers[3]) : 1;
        return { r, g, b, a };
    }

    function brightness({ r, g, b }) {
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    // Returns the visible brightness of a same-origin <img> at a viewport point.
    // This makes the theme respond to the actual hero image rather than its fallback colour.
    function imageBrightness(image, x, y) {
        if (!sampleContext || !image.complete || !image.naturalWidth || !image.naturalHeight) return null;

        const rect = image.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const style = getComputedStyle(image);
        const fit = style.objectFit;
        const scale = fit === 'cover'
            ? Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
            : fit === 'contain'
                ? Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
                : null;
        const renderedWidth = scale ? image.naturalWidth * scale : rect.width;
        const renderedHeight = scale ? image.naturalHeight * scale : rect.height;
        const renderedLeft = rect.left + (rect.width - renderedWidth) / 2;
        const renderedTop = rect.top + (rect.height - renderedHeight) / 2;
        const sourceX = ((x - renderedLeft) / renderedWidth) * image.naturalWidth;
        const sourceY = ((y - renderedTop) / renderedHeight) * image.naturalHeight;

        if (sourceX < 0 || sourceY < 0 || sourceX >= image.naturalWidth || sourceY >= image.naturalHeight) return null;

        try {
            sampleContext.clearRect(0, 0, 1, 1);
            sampleContext.drawImage(image, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
            const [r, g, b] = sampleContext.getImageData(0, 0, 1, 1).data;
            return brightness({ r, g, b });
        } catch {
            // A cross-origin image without CORS permission cannot be read. Fall back to CSS colours.
            return null;
        }
    }

    function forcedTheme(element) {
        const source = element.closest('[data-ui-theme], [data-nav-theme]');
        return source?.dataset.uiTheme || source?.dataset.navTheme || null;
    }

    function isDarkBehind(root, probe) {
        const box = probe.getBoundingClientRect();
        if (!box.width || !box.height) return false;

        // If the element is scrolled completely off-screen, maintain its current contrast state
        if (box.bottom < 0 || box.top > window.innerHeight || box.right < 0 || box.left > window.innerWidth) {
            return root.classList.contains(DARK_CLASS);
        }

        const x = Math.max(0, Math.min(box.left + box.width / 2, window.innerWidth - 1));
        const y = Math.max(0, Math.min(box.top + box.height / 2, window.innerHeight - 1));

        for (const el of document.elementsFromPoint(x, y)) {
            if (root.contains(el)) continue;

            const forced = forcedTheme(el);
            if (forced === 'dark' || forced === 'light') return forced === 'dark';

            if (el instanceof HTMLImageElement) {
                const value = imageBrightness(el, x, y);
                if (value !== null) return value < BRIGHTNESS_LIMIT;
            }

            const color = parseColor(getComputedStyle(el).backgroundColor);
            if (color && color.a >= MIN_OPACITY) {
                return brightness(color) < BRIGHTNESS_LIMIT;
            }
        }
        return false;                                      // nothing found: the page background is light
    }

    function update() {
        THEME_TARGETS.forEach(({ root: rootSelector, probe: probeSelector }) => {
            document.querySelectorAll(rootSelector).forEach(root => {
                const probe = probeSelector
                    ? (root.matches?.(probeSelector) ? root : root.querySelector(probeSelector))
                    : root;
                if (probe) root.classList.toggle(DARK_CLASS, isDarkBehind(root, probe));
            });
        });
    }

    function queueUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateMobileNav();
            update();
            ticking = false;
        });
    }

    function watchImages() {
        document.querySelectorAll('img').forEach(image => {
            if (!image.complete) image.addEventListener('load', update, { once: true });
        });
    }

    window.addEventListener('scroll', queueUpdate, { passive: true });
    document.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('touchmove', queueUpdate, { passive: true });

    window.addEventListener('resize', () => {
        updateMobileNav();
        update();
    });
    window.addEventListener('load', () => {
        updateMobileNav();
        watchImages();
        update();
    });
    document.addEventListener('partials-loaded', () => {
        updateMobileNav();
        watchImages();
        update();
    });
    document.addEventListener('DOMContentLoaded', () => {
        updateMobileNav();
        watchImages();
        update();
    });
    updateMobileNav();
    watchImages();
    update();
})();