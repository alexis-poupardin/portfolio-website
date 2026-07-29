// includes.js --- Loads the shared header and footer fragments into every page 

async function loadPartial(placeholderId, url) {
    const container = document.getElementById(placeholderId);
    if (!container) return; 

    const response = await fetch(url);
    container.innerHTML = await response.text();
}

async function loadPartials() {

    await Promise.all([
        loadPartial('header-placeholder', 'header.html'),
        loadPartial('footer-placeholder', 'footer.html')
    ]);

// ---------------- language switcher --------------- //

    document.getElementById('language').addEventListener('change', (e) => {
        window.location.href = e.target.value;
    });
}

loadPartials();


