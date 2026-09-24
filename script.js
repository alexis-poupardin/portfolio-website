// ------------------- lighbox ----------------- // 

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('global-lightbox');
    if (!lightbox) return;
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');

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




// ------------------- map carousel lightbox ----------------- //

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('map-carousel');
    if (!carousel) return; // this page has no map carousel, stop here

    const carouselImg = document.getElementById('map-carousel-img');
    const mapCaption = document.getElementById('map-caption');
    const closeBtn = carousel.querySelector('.map-carousel-close');
    const prevBtn = carousel.querySelector('.map-carousel-prev');
    const nextBtn = carousel.querySelector('.map-carousel-next');

    // The set of images currently being browsed (all the .map images that
    // share the .map-wrapper the user clicked into), and which one is active
    let currentSlides = [];
    let currentIndex = 0;

    // Displays the slide at "index", wrapping around at both ends
    function showSlide(index) {
        currentIndex = (index + currentSlides.length) % currentSlides.length;
        const activeImg = currentSlides[currentIndex];

        // 1. Copy image source and alt text to the popup
        carouselImg.src = activeImg.src;
        carouselImg.alt = activeImg.alt;

        // 2. Each map image is immediately followed by its own <p class="caption">
        const caption = activeImg.nextElementSibling;
        mapCaption.textContent = (caption && caption.classList.contains('caption'))
            ? caption.textContent
            : '';

        // 3. No point showing arrows when there is nothing else to browse to
        const hasMultiple = currentSlides.length > 1;
        prevBtn.style.display = hasMultiple ? '' : 'none';
        nextBtn.style.display = hasMultiple ? '' : 'none';
    }

    // Add click event to every image with class "map", grouped by wrapper
    document.querySelectorAll('.map-wrapper').forEach(wrapper => {
        const slides = Array.from(wrapper.querySelectorAll('.map'));

        slides.forEach(img => {
            img.addEventListener('click', () => {
                // a. This image's siblings become the carousel's slide set
                currentSlides = slides;

                // b. Show the clicked image first
                showSlide(slides.indexOf(img));

                // c. Display the popup
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

