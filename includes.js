// includes.js --- Loads the shared header and footer fragments into every page 

// Removes what the VS Code "Live Server" extension injects into every HTML file it serves
// (a <!-- Code injected by live-server --> comment followed by a <script> reload block).
// It is added before each </svg> of header.html, i.e. INSIDE the logo and home-icon SVGs,
// and breaks the parsing of the navigation when the fragment is inserted with innerHTML.
// On GitHub Pages nothing is injected, so this regex then simply changes nothing.
function stripLiveServer(html) {
    return html.replace(/<!--\s*Code injected by live-server\s*-->\s*<script[\s\S]*?<\/script>/gi, '');
}

async function loadPartial(placeholderId, url) {
    const container = document.getElementById(placeholderId);
    if (!container) return; 

    const response = await fetch(url);
    container.innerHTML = stripLiveServer(await response.text());
}

async function loadPartials() {

    await Promise.all([
        loadPartial('header-placeholder', 'header.html'),
        loadPartial('footer-placeholder', 'footer.html'),
    ]);

// ---------------- language switcher --------------- //

    document.getElementById('language').addEventListener('change', (e) => {
        window.location.href = e.target.value;
    });
}

loadPartials().then(() => {
    document.dispatchEvent(new Event('partials-loaded'));
});