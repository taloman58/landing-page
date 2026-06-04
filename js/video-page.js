'use strict';
// ═══════════════════════════════════════════════════════════════
// Video Page — language-aware video swap
// TR: show 5-video grid, non-TR: show single localized video
// ═══════════════════════════════════════════════════════════════

const VIDEO_MAP = {
    en: 'jHYwQUoRgSY',
    de: 'LJnRHkKUcVg',
    fr: 'MzhN53PZz1Q',
    it: 'Se9iJERikDc',
    es: '-j8ji2aZwjk',
    pt: '1nyzDeRrvOg',
    ar: 'IPo9t-XM8tk'
};

function applyVideoLang(lang) {
    const isTr = lang === 'tr';
    const trEls = document.querySelectorAll('.tr-only');
    const nonTrEls = document.querySelectorAll('.non-tr');
    const iframe = document.getElementById('single-video-iframe');

    trEls.forEach(el => el.classList.toggle('is-hidden', !isTr));
    nonTrEls.forEach(el => el.classList.toggle('is-hidden', isTr));

    if (iframe) {
        if (isTr) {
            if (iframe.src) iframe.src = '';
        } else {
            const id = VIDEO_MAP[lang] || VIDEO_MAP.en;
            const target = `https://www.youtube.com/embed/${id}`;
            if (iframe.src !== target) iframe.src = target;
        }
    }
}

function currentHtmlLang() {
    return document.documentElement.lang || localStorage.getItem('appLang') || 'tr';
}

// Watch <html lang="…"> changes (i18n.js updates this on every changeLang)
const langObserver = new MutationObserver(() => applyVideoLang(currentHtmlLang()));
langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

document.addEventListener('DOMContentLoaded', () => {
    applyVideoLang(currentHtmlLang());
});
