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
            
            // 2. Find the caption paragraph inside the same .image-wrapper
            const wrapper = img.closest('.image-wrapper');
            const caption = wrapper ? wrapper.querySelector('.caption') : null;
            
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
    const carousel = document.getElementById('map-carousel');
    if (!carousel) return; // this page has no map carousel, stop here

    const carouselImg = document.getElementById('map-carousel-img');
    const mapCaption = document.getElementById('map-caption');
    const closeBtn = carousel.querySelector('.map-carousel-close');
    const prevBtn = carousel.querySelector('.map-carousel-prev');
    const nextBtn = carousel.querySelector('.map-carousel-next');

    // The tiles currently being browsed (all .map-tile elements that share
    // the .map-wrapper the visitor clicked into), and which one is active
    let currentTiles = [];
    let currentIndex = 0;

    // Displays the tile at "index", wrapping around at both ends
    function showSlide(index) {
        currentIndex = (index + currentTiles.length) % currentTiles.length;
        const tile = currentTiles[currentIndex];
        const img = tile.querySelector('.map');
        const caption = tile.querySelector('.caption');

        carouselImg.src = img.src;
        carouselImg.alt = img.alt;
        mapCaption.textContent = caption ? caption.textContent : '';

        // No point showing arrows when there is nothing else to browse to
        const hasMultiple = currentTiles.length > 1;
        prevBtn.style.display = hasMultiple ? '' : 'none';
        nextBtn.style.display = hasMultiple ? '' : 'none';
    }

    // Clicking any mosaic tile opens the carousel on that tile
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
            carousel.classList.remove('active');
        }
    });

    // Keyboard navigation: Escape closes, left/right arrows browse.
    // Guarded by .active so these keys stay silent while the popup is closed.
    document.addEventListener('keydown', (e) => {
        if (!carousel.classList.contains('active')) return;

        if (e.key === 'Escape') {
            carousel.classList.remove('active');
        } else if (e.key === 'ArrowLeft') {
            showSlide(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showSlide(currentIndex + 1);
        }
    });

    // Touch swipe, so mobile visitors can also browse with a finger.
    // Harmless to attach unconditionally: the popup has pointer-events: none
    // while closed, so these never fire until it's active.
    let touchStartX = 0;

    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
    });

    carousel.addEventListener('touchend', (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const swipeThreshold = 40; // minimum px to count as an intentional swipe

        if (deltaX > swipeThreshold) {
            showSlide(currentIndex - 1); // swiped right -> previous
        } else if (deltaX < -swipeThreshold) {
            showSlide(currentIndex + 1); // swiped left -> next
        }
    });
});





// ---------------- autoscrolling to <section class="article-section"> ------------- //

document.addEventListener('DOMContentLoaded', () => {
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




// ------------------- adaptive interface contrast ----------------- //
// Checks the background behind the shared interface elements.  They receive
// .is-on-dark for ivory text (and the white logo); otherwise they use dark ink.
// A section can force its result with data-ui-theme="dark" / "light".
// data-nav-theme remains supported for existing page markup.

(() => {
    const DARK_CLASS = 'is-on-dark';
    const BRIGHTNESS_LIMIT = 0.5;
    const MIN_OPACITY = 0.5;
    const THEME_TARGETS = [
        { root: '.navigation', probe: 'nav > ul' },
        { root: 'header#top', probe: '.header-inner' },
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
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;

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
                const probe = root.querySelector(probeSelector);
                if (probe) root.classList.toggle(DARK_CLASS, isDarkBehind(root, probe));
            });
        });
    }

    function queueUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
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

    window.addEventListener('resize', update);
    window.addEventListener('load', () => {
        watchImages();
        update();
    });
    document.addEventListener('partials-loaded', () => {
        watchImages();
        update();
    });
    watchImages();
    update();
})();
