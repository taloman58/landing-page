'use strict';
// ═══════════════════════════════════════════════════════════════
// GSM OFİS PRO — i18n (Internationalization) Engine
// JSON-based multi-language support with RTL handling
// ═══════════════════════════════════════════════════════════════

const supportedLangs = ['tr', 'en', 'es', 'de', 'fr', 'ar', 'it', 'pt'];
const defaultLang = 'tr';

// Flag icon file mapping
const langFlags = {
    tr: 'icon/tr.png',
    en: 'icon/eng.png',
    de: 'icon/ger.png',
    fr: 'icon/france.png',
    es: 'icon/esp.png',
    ar: 'icon/arabic.png',
    it: 'icon/it.png',
    pt: 'icon/port.png'
};

// Display names for each language
const langNames = {
    tr: 'Türkçe',
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    it: 'Italiano',
    pt: 'Português'
};

// Short codes for display
const langShort = {
    tr: 'TR', en: 'EN', de: 'DE', fr: 'FR',
    es: 'ES', ar: 'AR', it: 'IT', pt: 'PT'
};

// RTL languages
const rtlLangs = ['ar'];

// ─── Country → Language map (ISO 3166-1 alpha-2 codes) ───
const countryToLang = {
    // Turkish
    TR: 'tr', CY: 'tr',
    // Spanish (Spain + Latin America)
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', VE: 'es',
    EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
    SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
    // German
    DE: 'de', AT: 'de', CH: 'de', LI: 'de',
    // French
    FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', CI: 'fr', SN: 'fr',
    CM: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', TD: 'fr', MG: 'fr',
    // Italian
    IT: 'it', SM: 'it', VA: 'it',
    // Portuguese
    PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
    // Arabic
    SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar',
    JO: 'ar', LB: 'ar', SY: 'ar', IQ: 'ar', YE: 'ar', MA: 'ar', DZ: 'ar',
    TN: 'ar', LY: 'ar', SD: 'ar', PS: 'ar', MR: 'ar'
    // Everything else → 'en' fallback
};

let currentLang = localStorage.getItem('appLang') || defaultLang;
let currentTranslations = null;

// ─── Deep property retrieval ───
function getDeepVal(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// ─── Variable replacement {{key}} ───
function applyVariables(text, obj) {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
        return getDeepVal(obj, p1) || match;
    });
}

// ─── Update DOM with translations ───
function updateDOM(json) {
    currentTranslations = json;

    // 1. Text / innerHTML translation
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = getDeepVal(json, key);
        if (val) {
            el.innerHTML = applyVariables(val, json);
        }
    });

    // 2. Attribute translation (placeholder, title, aria-label, content)
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const attrs = el.getAttribute('data-i18n-attr').split(',');
        const val = getDeepVal(json, key);
        if (val) {
            attrs.forEach(attr => {
                el.setAttribute(attr.trim(), applyVariables(val, json));
            });
        }
    });

    // 3. Schema JSON update
    const schemaEl = document.getElementById('seo-schema');
    if (schemaEl && schemaEl.hasAttribute('data-i18n-schema')) {
        let schemaHtml = schemaEl.innerHTML;
        schemaHtml = applyVariables(schemaHtml, json);
        schemaEl.innerHTML = schemaHtml;
    }

    // 4. Update page title and meta description
    const pageType = document.body.getAttribute('data-page') || 'home';
    if (pageType === 'home') {
        if (json.meta?.title) document.title = json.meta.title;
    } else {
        const titleKey = `meta.${pageType}_title`;
        const titleVal = getDeepVal(json, titleKey);
        if (titleVal) document.title = titleVal;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        if (pageType === 'home') {
            if (json.meta?.description) metaDesc.setAttribute('content', json.meta.description);
        } else {
            const descKey = `meta.${pageType}_desc`;
            const descVal = getDeepVal(json, descKey);
            if (descVal) metaDesc.setAttribute('content', descVal);
        }
    }

    // 5. RTL handling
    if (rtlLangs.includes(currentLang)) {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }

    // 6. Set html lang
    document.documentElement.lang = currentLang;

    // 7. Update language dropdown display
    updateLangDropdown();

    // 8. Reveal body (lifts the i18n boot gate in style.css)
    document.documentElement.classList.add('i18n-ready');
}

// ─── Language dropdown UI update ───
function updateLangDropdown() {
    // Update current flag and label
    const currentFlagEl = document.getElementById('current-flag');
    const currentNameEl = document.getElementById('current-lang-name');
    const assetBase = window.location.pathname.includes('/account/') ? '../' : '';
    
    if (currentFlagEl) {
        currentFlagEl.src = assetBase + (langFlags[currentLang] || langFlags.tr);
        currentFlagEl.alt = langShort[currentLang] || 'TR';
    }
    if (currentNameEl) {
        currentNameEl.textContent = langShort[currentLang] || 'TR';
    }

    // Update active state in dropdown
    document.querySelectorAll('.lang-menu a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-lang') === currentLang) {
            a.classList.add('active');
        }
    });

    // Legacy support: floating-lang
    document.querySelectorAll('.floating-lang a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-lang') === currentLang) {
            a.classList.add('active');
        }
    });
}

// ─── Load JSON (fetch with XHR fallback for file:// protocol) ───
function loadJSON(url) {
    return new Promise((resolve, reject) => {
        // Try fetch first
        if (typeof fetch === 'function' && window.location.protocol !== 'file:') {
            fetch(url)
                .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(resolve)
                .catch(() => xhrFallback(url, resolve, reject));
        } else {
            xhrFallback(url, resolve, reject);
        }
    });
}

function xhrFallback(url, resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 0) {
            // status 0 is normal for file:// protocol
            const data = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response;
            if (data) { resolve(data); } else { reject(new Error('Empty response')); }
        } else {
            reject(new Error('XHR status: ' + xhr.status));
        }
    };
    xhr.onerror = function () { reject(new Error('XHR error')); };
    xhr.send();
}

// ─── Change language ───
async function changeLang(lang, event) {
    if (event) event.preventDefault();
    if (!supportedLangs.includes(lang)) lang = defaultLang;

    try {
        const localeBase = window.location.pathname.includes('/account/') ? '../' : '';
        const json = await loadJSON(`${localeBase}${lang}.json`);

        currentLang = lang;
        localStorage.setItem('appLang', currentLang);
        updateDOM(json);

        // Close dropdown after selection
        const dropdown = document.getElementById('lang-dropdown');
        if (dropdown) dropdown.classList.remove('open');

    } catch (error) {
        console.error('Failed to load language: ', lang, error);
        if (lang !== defaultLang) {
            changeLang(defaultLang);
        }
    }
}

// ─── Get current translation value ───
function t(key) {
    if (!currentTranslations) return key;
    return getDeepVal(currentTranslations, key) || key;
}

// Expose for inline page scripts (e.g. trial.js error messages)
window.i18nT = t;

// ─── Geo IP detection (country code) ───
async function detectCountryCode() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch('https://api.country.is/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('geo http ' + resp.status);
        const data = await resp.json();
        return (data && data.country) ? String(data.country).toUpperCase() : null;
    } catch (e) {
        console.warn('Geo detection failed:', e.message || e);
        return null;
    }
}

// ─── Resolve best initial language for visitor (non-blocking) ───
function resolveInitialLang() {
    // 1) Manual user choice — always wins
    const manual = localStorage.getItem('appLang');
    if (manual && supportedLangs.includes(manual)) return manual;

    // 2) Cached geo result
    const cachedGeo = localStorage.getItem('geoLang');
    if (cachedGeo && supportedLangs.includes(cachedGeo)) return cachedGeo;

    // 3) Instant fallback: browser navigator language
    const navLang = (navigator.language || '').split('-')[0].toLowerCase();
    const fastGuess = supportedLangs.includes(navLang) ? navLang : 'en';

    // 4) Fire-and-forget geo lookup — caches result for NEXT visit, never blocks render
    detectCountryCode().then(country => {
        if (!country) return;
        const mapped = countryToLang[country] || 'en';
        const finalLang = supportedLangs.includes(mapped) ? mapped : 'en';
        try { localStorage.setItem('geoLang', finalLang); } catch (_) { /* storage disabled */ }
    });

    return fastGuess;
}

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
    // Safety: if JSON load fails, reveal body anyway after 800ms
    setTimeout(() => document.documentElement.classList.add('i18n-ready'), 800);

    // Language dropdown toggle
    const langBtn = document.getElementById('lang-btn');
    const langDropdown = document.getElementById('lang-dropdown');

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!langDropdown.contains(e.target)) {
                langDropdown.classList.remove('open');
            }
        });
    }

    // Language menu items (new dropdown)
    document.querySelectorAll('.lang-menu a').forEach(a => {
        a.addEventListener('click', (e) => {
            const lang = a.getAttribute('data-lang');
            if (lang) changeLang(lang, e);
        });
    });

    // Legacy: floating-lang items
    document.querySelectorAll('.floating-lang a').forEach(a => {
        a.addEventListener('click', (e) => {
            const lang = a.getAttribute('data-lang');
            if (lang) changeLang(lang, e);
        });
    });

    // Resolve best language: manual > geo cache > navigator > 'en' (non-blocking)
    const initialLang = resolveInitialLang();
    changeLang(initialLang);
});
