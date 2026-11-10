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
                if (e.target.value) {
                    window.location.href = e.target.value;
                }
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
