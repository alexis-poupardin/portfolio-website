// includes.js --- Loads the shared header and footer fragments into every page 

// Removes what the VS Code "Live Server" extension injects into every HTML file it serves
// (a <!-- Code injected by live-server --> comment followed by a <script> reload block).
// Strips any live-server / reload script blocks and removes any stray wrapper body/html tags
// so fragments are parsed cleanly without breaking SVGs or navigation elements.
// On GitHub Pages nothing is injected, so this then simply changes nothing.
function stripLiveServer(html) {
    return html
        .replace(/<!--\s*Code injected by live-server\s*-->[\s\S]*?<\/script>/gi, '')
        .replace(/<script[\s\S]*?(?:live-server|Live reload|WebSocket)[\s\S]*?<\/script>/gi, '')
        .replace(/<\/?(html|body)[\s\S]*?>/gi, '');
}

async function loadPartial(placeholderId, url) {
    const container = document.getElementById(placeholderId);
    if (!container) return;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to load ${url}: status ${response.status}`);
            return;
        }
        container.innerHTML = stripLiveServer(await response.text());
    } catch (err) {
        console.warn(`Error loading partial from ${url}:`, err);
    }
}

// Highlights the navigation link corresponding to the current page
function markActiveNavLink() {
    const nav = document.querySelector('.navigation');
    if (!nav) return;

    // Get current filename from path (defaults to index.html for root)
    const currentPath = window.location.pathname;
    let currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    if (!currentFile || currentFile === '') {
        currentFile = 'index.html';
    }

    const links = nav.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const linkFile = href.substring(href.lastIndexOf('/') + 1);

        if (linkFile === currentFile) {
            link.setAttribute('aria-current', 'page');
            link.classList.add('is-current');
        }
    });
}

async function loadPartials() {
    try {
        await Promise.all([
            loadPartial('header-placeholder', 'header.html'),
            loadPartial('footer-placeholder', 'footer.html'),
        ]);

        // ---------------- language switcher --------------- //
        const langSelect = document.getElementById('language');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                const targetLang = e.target.value;
                if (!targetLang) return;

                // Mark that the user explicitly chose a language,
                // so the auto-redirect won't override their choice
                sessionStorage.setItem('lang-redirected', '1');

                // Work out the current page filename and site root
                const path = window.location.pathname;
                const dir = path.substring(0, path.lastIndexOf('/') + 1);
                const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

                // Determine the site root by stripping any /fr/ or /de/ suffix
                let siteRoot;
                if (dir.endsWith('/fr/')) {
                    siteRoot = dir.slice(0, -3);      // remove "fr/"
                } else if (dir.endsWith('/de/')) {
                    siteRoot = dir.slice(0, -3);      // remove "de/"
                } else {
                    siteRoot = dir;
                }

                // Build the target URL — same page, different language folder
                const targetUrl = targetLang === 'en'
                    ? siteRoot + filename
                    : siteRoot + targetLang + '/' + filename;

                window.location.href = targetUrl;
            });
        }

        // ---------------- current page indicator ---------- //
        markActiveNavLink();
    } catch (err) {
        console.warn('Error during loadPartials:', err);
    }
}

loadPartials().finally(() => {
    document.dispatchEvent(new Event('partials-loaded'));
});
