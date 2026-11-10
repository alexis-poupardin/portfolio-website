// lang-redirect.js — Redirects first-time visitors to the version
// matching their browser language (fr → /fr/, de → /de/, else → English root).
// Once a visitor manually switches language via the dropdown, or has already
// been redirected once in this session, no further redirect happens.

(function () {
    // Skip if the user has already been redirected or chose a language this session
    if (sessionStorage.getItem('lang-redirected')) return;

    // Mark the session so we only redirect once
    sessionStorage.setItem('lang-redirected', '1');

    // Determine the preferred language (primary subtag only, e.g. "fr" from "fr-FR")
    const languages = navigator.languages || [navigator.language || navigator.userLanguage || ''];
    const preferred = languages[0].split('-')[0].toLowerCase();

    // Determine the current path segment to avoid unnecessary redirects
    const path = window.location.pathname;

    // Build the base path of the site (everything up to and including /portfolio-website/)
    // This works both on GitHub Pages and on local dev servers
    const baseMatch = path.match(/(.*\/portfolio-website\/)/);
    const base = baseMatch ? baseMatch[1] : path.substring(0, path.lastIndexOf('/') + 1);

    // Determine which language folder we're currently in
    const relativePath = path.substring(base.length);
    let currentLang = 'en';
    if (relativePath.startsWith('fr/') || relativePath.startsWith('fr')) {
        currentLang = 'fr';
    } else if (relativePath.startsWith('de/') || relativePath.startsWith('de')) {
        currentLang = 'de';
    }

    // Only redirect if the preferred language differs from the current one
    // and is one of our supported languages
    const supportedLangs = { fr: 'fr/', de: 'de/' };

    if (preferred === currentLang) return; // Already on the right version

    if (preferred in supportedLangs && currentLang === 'en') {
        // Visitor prefers FR or DE but is on the English root → redirect
        window.location.replace(base + supportedLangs[preferred]);
    } else if (!(preferred in supportedLangs) && currentLang !== 'en') {
        // Visitor prefers neither FR nor DE but is on a translated page → redirect to English
        window.location.replace(base);
    }
})();
