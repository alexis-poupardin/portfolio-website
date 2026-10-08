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




// ------------------- navigation bar: light or dark colours ----------------- //
// Looks at what is displayed BEHIND the middle of the navigation bar and toggles the
// class "is-on-dark" on .navigation. common.css then draws the links and the home icon
// in sand colour when the class is present, and in dark colour when it is absent.
// A section can force the result with  data-nav-theme="dark"  or  data-nav-theme="light".

(() => {
    // ---- settings ----
    const NAV_SELECTOR = '.navigation';   // element that receives the class
    const BAR_SELECTOR = 'nav > ul';      // the glass bar inside it (its middle is the point we look at)
    const DARK_CLASS = 'is-on-dark';
    const BRIGHTNESS_LIMIT = 0.5;         // 0 = black ... 1 = white: a background below this counts as dark
    const MIN_OPACITY = 0.5;              // backgrounds more transparent than this are ignored (glass boxes...)

    let ticking = false;                  // avoids running the check more than once per frame

    // Reads a computed colour such as "rgb(0, 0, 0)" or "rgba(0, 0, 0, 0.5)"; null if unusable
    function parseColor(css) {
        const numbers = css.match(/[\d.]+/g);
        if (!numbers || numbers.length < 3 || css.startsWith('color(')) return null;
        const [r, g, b] = numbers.map(Number);
        const a = numbers.length > 3 ? Number(numbers[3]) : 1;
        return { r, g, b, a };
    }

    // Perceived brightness of a colour, from 0 (black) to 1 (white)
    function brightness({ r, g, b }) {
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    // true if the first "real" background found behind the bar is dark
    function isDarkBehind(navRoot, bar) {
        const box = bar.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;

        // every element under that point, from the topmost to the bottommost
        for (const el of document.elementsFromPoint(x, y)) {
            if (navRoot.contains(el)) continue;            // skip the navigation itself

            const forced = el.dataset.navTheme;            // optional manual override
            if (forced) return forced === 'dark';

            const color = parseColor(getComputedStyle(el).backgroundColor);
            if (color && color.a >= MIN_OPACITY) {
                return brightness(color) < BRIGHTNESS_LIMIT;
            }
        }
        return false;                                      // nothing found: the page background is light
    }

    function update() {
        // The nav is injected by includes.js after a fetch(), so look it up at call time
        const navRoot = document.querySelector(NAV_SELECTOR);
        const bar = navRoot && navRoot.querySelector(BAR_SELECTOR);
        if (!bar) return;                                  // header not injected yet
        navRoot.classList.toggle(DARK_CLASS, isDarkBehind(navRoot, bar));
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
    window.addEventListener('load', update);
    document.addEventListener('partials-loaded', update);  // fired by includes.js once the header exists
    update();                                              // in case the header is already there
})();