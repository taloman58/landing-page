'use strict';
// pricing-router.js — TR kullanıcılarda "Satın Al" butonu LS yerine
// manuel ödeme akışına yönlendirir (login → dashboard → IBAN/ERC20 kartı).
// Lemon kapalıyken diğer dillerde de mesajlaşmaya yönlendirir.

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';
    const SUPABASE_PROJECT_REF = 'cjwszktbrkoegbajanwp';
    const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

    let lemonEnabled = false; // false = kapalı (default, fetch sonrası güncellenir)

    function getButtons() {
        return document.querySelectorAll('a.btn[href^="checkout.html?plan="]');
    }

    function getOriginalHref(btn) {
        if (!btn.dataset.defaultHref) {
            btn.dataset.defaultHref = btn.getAttribute('href') || '';
        }
        return btn.dataset.defaultHref;
    }

    function planFromHref(href) {
        try {
            const url = new URL(href, window.location.href);
            return url.searchParams.get('plan') || 'yearly';
        } catch {
            return 'yearly';
        }
    }

    function isTrLang() {
        const lang = (localStorage.getItem('appLang') || 'tr').toLowerCase();
        return lang === 'tr';
    }

    function hasActiveSession() {
        try {
            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!raw) return false;
            const session = JSON.parse(raw);
            if (!session || !session.access_token) return false;
            if (session.expires_at && Date.now() / 1000 > Number(session.expires_at)) return false;
            return true;
        } catch {
            return false;
        }
    }

    function manualTargetHref(plan) {
        if (hasActiveSession()) {
            return `account/dashboard.html?plan=${encodeURIComponent(plan)}`;
        }
        // Login değil → kayıt formu (checkout.html) ama submit zamanı manuel akışa düşer
        return `checkout.html?plan=${encodeURIComponent(plan)}&from=manual`;
    }

    function contactTargetHref() {
        if (hasActiveSession()) {
            return 'account/dashboard.html';
        }
        return 'account/login.html';
    }

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function showDisabledNotice() {
        if (document.getElementById('lemon-disabled-notice')) return;
        const pricingGrid = document.querySelector('.pricing-grid');
        if (!pricingGrid) return;

        const notice = document.createElement('div');
        notice.id = 'lemon-disabled-notice';
        notice.className = 'lemon-disabled-notice';
        notice.innerHTML = t(
            'pricing.lemon_disabled_notice',
            'Credit card payments are currently unavailable. To purchase via cryptocurrency, please <a href="account/login.html">contact the admin</a>.'
        );

        // i18n'den gelen metin {{link}} placeholder içerebilir
        const raw = notice.innerHTML;
        if (raw.includes('{{link}}')) {
            notice.innerHTML = raw.replace('{{link}}', contactTargetHref());
        }

        pricingGrid.insertAdjacentElement('afterend', notice);
    }

    function hideDisabledNotice() {
        const el = document.getElementById('lemon-disabled-notice');
        if (el) el.remove();
    }

    async function fetchLemonFlag() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/app_config?config_key=eq.lemon_enabled&select=config_value`,
                { headers: { 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
            );
            if (!res.ok) return false;
            const rows = await res.json();
            return rows && rows.length > 0 && rows[0].config_value === 'true';
        } catch (_) {
            return false;
        }
    }

    function applyRouting() {
        const buttons = getButtons();
        if (!buttons.length) return;
        const tr = isTrLang();

        buttons.forEach(btn => {
            const original = getOriginalHref(btn);
            const plan = planFromHref(original);

            if (tr) {
                btn.setAttribute('href', manualTargetHref(plan));
            } else if (lemonEnabled === false) {
                // Lemon kapalı + non-TR → mesajlaşmaya yönlendir
                btn.setAttribute('href', contactTargetHref());
            } else if (original) {
                btn.setAttribute('href', original);
            }
        });

        // Lemon kapalı + non-TR → bilgi notu göster
        if (!tr && lemonEnabled === false) {
            showDisabledNotice();
        } else {
            hideDisabledNotice();
        }
    }

    // Senkron click yakalayıcı — async yarış yok, her tıklamada güncel auth state'e bakar
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a.btn[href]');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        const original = link.dataset.defaultHref || href;
        // Sadece pricing CTA butonları (orijinal href checkout.html?plan=... ile başlıyorsa)
        if (!/^checkout\.html\?plan=/.test(original)) return;

        const tr = isTrLang();

        if (tr) {
            event.preventDefault();
            const plan = planFromHref(original);
            window.location.href = manualTargetHref(plan);
            return;
        }

        // Lemon kapalı + non-TR → mesajlaşmaya yönlendir
        if (lemonEnabled === false) {
            event.preventDefault();
            window.location.href = contactTargetHref();
        }
    }, true); // capture: true — daha önceki handler'lardan önce çalışsın

    async function init() {
        // İlk routing: lemonEnabled=false default ile hemen uygula (buton href'leri güncelle)
        applyRouting();
        // Sonra Supabase'den gerçek değeri al ve tekrar uygula
        lemonEnabled = await fetchLemonFlag();
        applyRouting();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init(); });
    } else {
        init();
    }

    // Dil değişiminde (i18n setLang sonrası localStorage güncellenir) yeniden uygula
    window.addEventListener('storage', (e) => {
        if (e.key === 'appLang') applyRouting();
    });
    document.addEventListener('i18n:changed', applyRouting);
})();
