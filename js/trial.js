'use strict';
// ═══════════════════════════════════════════════════════════════
// GSM OFİS PRO — Trial Signup Handler
// 33 günlük trial kayıt formunun submit akışı.
// Edge Function: /functions/v1/trial-signup (Supabase)
// ═══════════════════════════════════════════════════════════════

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';
    const ENDPOINT = SUPABASE_URL + '/functions/v1/trial-signup';

    const form = document.getElementById('trial-form');
    if (!form) return;

    const submitBtn = document.getElementById('trial-submit');
    const submitLabel = submitBtn ? submitBtn.querySelector('span') : null;
    const errorBox = document.getElementById('trial-error');
    const formWrap = document.getElementById('trial-form-wrap');
    const successCard = document.getElementById('trial-success');

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            // i18nT returns the key if not found; fall back if so
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function setError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.classList.remove('is-hidden');
    }

    function clearError() {
        if (!errorBox) return;
        errorBox.textContent = '';
        errorBox.classList.add('is-hidden');
    }

    function setLoading(loading) {
        if (!submitBtn || !submitLabel) return;
        submitBtn.disabled = loading;
        if (loading) {
            if (!submitBtn.dataset.originalText) {
                submitBtn.dataset.originalText = submitLabel.textContent;
            }
            submitLabel.textContent = t('trial.form.submit_loading', 'Oluşturuluyor...');
        } else if (submitBtn.dataset.originalText) {
            submitLabel.textContent = submitBtn.dataset.originalText;
        }
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return day + '/' + m + '/' + y;
        } catch (err) {
            return String(iso);
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearError();

        const fd = new FormData(form);
        const payload = {
            dealer_name: String(fd.get('dealer_name') || '').trim(),
            full_name: String(fd.get('full_name') || '').trim(),
            username: String(fd.get('username') || '').trim().toLowerCase(),
            email: String(fd.get('email') || '').trim().toLowerCase(),
            phone: String(fd.get('phone') || '').trim(),
            password: String(fd.get('password') || ''),
            website: String(fd.get('website') || '') // honeypot
        };

        // Client-side basic validation
        if (!payload.dealer_name || !payload.full_name || !payload.username ||
            !payload.email || !payload.phone || !payload.password) {
            setError(t('trial.form.error_required', 'Tüm zorunlu alanları doldurun.'));
            return;
        }
        if (payload.password.length < 6) {
            setError(t('trial.form.error_password_short', 'Şifre en az 6 karakter olmalı.'));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                setError(data.error || t('trial.form.error_generic', 'Beklenmedik hata. Tekrar deneyin.'));
                setLoading(false);
                return;
            }

            // Success — swap form for credentials card
            const emailEl = document.getElementById('success-email');
            const userEl = document.getElementById('success-username');
            const keyEl = document.getElementById('success-license-key');
            const expEl = document.getElementById('success-expires');

            if (emailEl) emailEl.textContent = data.email || payload.email;
            if (userEl) userEl.textContent = data.username || payload.username;
            if (keyEl) keyEl.textContent = data.license_key || '';
            if (expEl) expEl.textContent = formatDate(data.expires_at);

            if (formWrap) formWrap.classList.add('is-hidden');
            if (successCard) {
                successCard.classList.remove('is-hidden');
                successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err) {
            console.error('[trial-signup]', err);
            setError(t('trial.form.error_network', 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.'));
            setLoading(false);
        }
    });
})();
