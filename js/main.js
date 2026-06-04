'use strict';
// ═══════════════════════════════════════════════════════════════
// GSM OFİS PRO — Landing Page Main JavaScript
// Navbar, animations, interactions
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. Sticky Navbar ───
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const onScroll = () => {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // ─── 2. Mobile Hamburger Menu ───
    const hamburger = document.getElementById('nav-hamburger');
    const navMenu = document.getElementById('nav-menu');
    const langDropdownEl = document.getElementById('lang-dropdown');

    function closeMobileMenu() {
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        if (langDropdownEl) langDropdownEl.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isOpening = !navMenu.classList.contains('open');
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('open');
            document.body.style.overflow = isOpening ? 'hidden' : '';
            // Close lang dropdown when closing menu
            if (!isOpening && langDropdownEl) {
                langDropdownEl.classList.remove('open');
            }
        });

        // Close menu on link click
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
    }

    // ─── 3. Active Nav Link Highlighting ───
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // ─── 4. Scroll Reveal Animations ───
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // ─── 5. FAQ Accordion ───
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const answer = item.querySelector('.faq-answer');
            const isOpen = item.classList.contains('open');

            // Close all others
            document.querySelectorAll('.faq-item.open').forEach(openItem => {
                if (openItem !== item) {
                    openItem.classList.remove('open');
                    openItem.querySelector('.faq-answer').style.maxHeight = '0';
                }
            });

            // Toggle current
            if (isOpen) {
                item.classList.remove('open');
                answer.style.maxHeight = '0';
            } else {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    // ─── 6. Pricing Toggle ───
    const pricingSwitch = document.getElementById('pricing-switch');
    if (pricingSwitch) {
        pricingSwitch.addEventListener('click', () => {
            pricingSwitch.classList.toggle('yearly');
            
            const isYearly = pricingSwitch.classList.contains('yearly');
            
            // Toggle label active states
            const labels = document.querySelectorAll('.pricing-toggle-label');
            if (labels.length >= 2) {
                labels[0].classList.toggle('active', !isYearly);
                labels[1].classList.toggle('active', isYearly);
            }

            // Update prices (20% discount for yearly)
            document.querySelectorAll('[data-monthly]').forEach(el => {
                const monthly = parseInt(el.getAttribute('data-monthly'));
                const yearly = Math.round(monthly * 0.8);
                el.textContent = isYearly ? yearly : monthly;
            });

            // Update period text
            document.querySelectorAll('.pricing-period').forEach(el => {
                const monthText = el.getAttribute('data-month-text') || '/ay';
                const yearText = el.getAttribute('data-year-text') || '/yıl';
                el.textContent = isYearly ? yearText : monthText;
            });
        });
    }

    // ─── 7. Gallery Lightbox ───
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    if (lightbox && lightboxImg) {
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        };

        lightboxClose?.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    // ─── 8. Gallery Tabs Filter ───
    document.querySelectorAll('.gallery-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');

            // Update active tab
            document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Filter gallery items
            document.querySelectorAll('.gallery-item').forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = '';
                    item.style.animation = 'fadeInUp 0.4s ease forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // ─── 9. Smooth Counter Animation ───
    function animateCounter(el, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        const isFloat = String(target).includes('.');

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = start + (target - start) * eased;

            if (isFloat) {
                el.textContent = current.toFixed(1);
            } else {
                el.textContent = Math.round(current).toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // Observe stat counters
    document.querySelectorAll('.hero-stat-value[data-count]').forEach(el => {
        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseFloat(el.getAttribute('data-count'));
                    animateCounter(el, target);
                    countObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });
        countObserver.observe(el);
    });

    // Session-aware navbar: login varsa "Giriş" → "Hesabım"
    (function applyNavSession() {
        try {
            const link = document.querySelector('.nav-login-link');
            if (!link) return;
            const tokenKey = 'sb-cjwszktbrkoegbajanwp-auth-token';
            const raw = localStorage.getItem(tokenKey);
            if (!raw) return;
            const data = JSON.parse(raw);
            const expiresAt = data && data.expires_at ? data.expires_at * 1000 : 0;
            if (!expiresAt || expiresAt <= Date.now()) return;
            const isInAccount = window.location.pathname.indexOf('/account/') !== -1;
            link.href = isInAccount ? 'dashboard.html' : 'account/dashboard.html';
            link.setAttribute('data-i18n', 'nav.my_account');
            const translated = (typeof window.i18nT === 'function') ? window.i18nT('nav.my_account') : null;
            if (translated && translated !== 'nav.my_account') {
                link.textContent = translated;
            } else {
                link.textContent = 'Hesabım';
            }
        } catch (_) {
            // public sayfa bozulmasın
        }
    })();

});
