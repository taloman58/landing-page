'use strict';

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';
    const POLL_INTERVAL_MS = 2000;
    const MAX_ATTEMPTS = 15;

    const titleEl = document.getElementById('success-title');
    const descEl = document.getElementById('success-desc');
    const statusEl = document.getElementById('success-status');
    const licenseWrap = document.getElementById('success-license');
    const licenseKeyEl = document.getElementById('success-license-key');
    const planEl = document.getElementById('success-plan');
    const emailEl = document.getElementById('success-email');
    const paidAtEl = document.getElementById('success-paid-at');
    const copyBtn = document.getElementById('success-copy');
    const downloadBtn = document.getElementById('success-download');
    const mailNote = document.getElementById('success-mail-note');

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function setText(el, text) {
        if (!el) return;
        el.removeAttribute('data-i18n');
        el.textContent = text || '';
    }

    function setStatus(kind, text) {
        if (!statusEl) return;
        statusEl.removeAttribute('data-i18n');
        statusEl.classList.remove('success-status--pending', 'success-status--paid', 'success-status--failed');
        statusEl.classList.add('success-status--' + kind);
        statusEl.textContent = text;
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    }

    function showPaid(order) {
        setText(titleEl, t('success.paid_title', 'Payment completed'));
        setText(descEl, t('success.paid_desc', 'Your license is ready.'));
        setStatus('paid', t('success.paid_status', 'License issued'));

        setText(licenseKeyEl, order.license_key || '');
        setText(planEl, order.plan_type || '');
        setText(emailEl, order.email || '');
        setText(paidAtEl, formatDate(order.paid_at));

        if (licenseWrap) licenseWrap.classList.remove('is-hidden');
        if (copyBtn) copyBtn.classList.remove('is-hidden');
        if (downloadBtn) downloadBtn.classList.remove('is-hidden');
        if (mailNote) mailNote.classList.remove('is-hidden');
    }

    function showFailed(message) {
        setText(titleEl, t('success.failed_title', 'Payment not completed'));
        setText(descEl, message || t('success.failed_desc', 'The payment status could not be completed.'));
        setStatus('failed', t('success.failed_status', 'Not completed'));
    }

    async function pollOrder(orderId) {
        if (!window.supabase || !window.supabase.createClient) {
            showFailed(t('success.error_client', 'Status client could not be loaded.'));
            return;
        }

        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
            const { data, error } = await client.rpc('get_order_status', { p_order_id: orderId });
            if (error) {
                console.error('[success]', error);
                showFailed(t('success.error_status_service', 'Order status service is not ready.'));
                return;
            }

            const status = String((data && data.status) || '').toLowerCase();

            if (data && data.found && status === 'paid') {
                showPaid(data);
                return;
            }

            if (data && data.found && ['failed', 'cancelled', 'canceled'].includes(status)) {
                showFailed(t('success.failed_desc', 'The payment status could not be completed.'));
                return;
            }

            setStatus('pending', t('success.pending', 'Payment is being confirmed...'));
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        setText(titleEl, t('success.timeout_title', 'Still processing'));
        setText(descEl, t('success.timeout_desc', 'Payment confirmation can take a little longer. Check your email shortly.'));
        setStatus('pending', t('success.pending', 'Payment is being confirmed...'));
    }

    document.addEventListener('click', async function (event) {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl || actionEl.dataset.action !== 'copy-license' || !licenseKeyEl) return;
        const key = licenseKeyEl.textContent.trim();
        if (!key) return;
        await navigator.clipboard.writeText(key);
        const previous = actionEl.textContent;
        actionEl.textContent = t('success.copied', 'Copied');
        setTimeout(() => { actionEl.textContent = previous; }, 1400);
    });

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');

    if (!orderId) {
        showFailed(t('success.missing_order', 'Order reference is missing.'));
        return;
    }

    pollOrder(orderId);
})();
