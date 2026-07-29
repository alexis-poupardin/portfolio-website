// includes.js
// Loads the shared header and footer fragments into every page that has
// the matching placeholder divs, then wires up the language switcher
// (it has to happen here, AFTER the header is injected — the <select>
// doesn't exist in the page until this fetch resolves).

async function loadPartial(placeholderId, url) {
    const container = document.getElementById(placeholderId);
    if (!container) return; // page doesn't use this placeholder, skip quietly

    const response = await fetch(url);
    container.innerHTML = await response.text();
}

async function loadPartials() {
    // Load header and footer at the same time rather than one after another
    await Promise.all([
        loadPartial('header-placeholder', 'header.html'),
        loadPartial('footer-placeholder', 'footer.html')
    ]);

// ---------------- language switcher --------------- //
    // Header is now in the DOM, so #language exists — safe to attach the listener
    document.getElementById('language').addEventListener('change', (e) => {
        window.location.href = e.target.value;
    });
}

loadPartials();


