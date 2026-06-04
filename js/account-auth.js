'use strict';

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';

    if (!window.supabase || !window.supabase.createClient) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const loginForm = document.getElementById('account-login-form');
    const resetForm = document.getElementById('account-reset-form');
    const updateForm = document.getElementById('account-update-form');
    const errorBox = document.getElementById('account-error');
    const successBox = document.getElementById('account-success');

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function setMessage(el, msg) {
        if (!el) return;
        el.textContent = msg || '';
        el.classList.toggle('is-hidden', !msg);
    }

    function setError(msg) {
        setMessage(successBox, '');
        setMessage(errorBox, msg);
    }

    function setSuccess(msg) {
        setMessage(errorBox, '');
        setMessage(successBox, msg);
    }

    function setLoading(button, loading, loadingText) {
        if (!button) return;
        const label = button.querySelector('span') || button;
        button.disabled = loading;
        if (loading) {
            if (!button.dataset.originalText) button.dataset.originalText = label.textContent;
            label.textContent = loadingText;
            return;
        }
        if (button.dataset.originalText) label.textContent = button.dataset.originalText;
    }

    function normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    function validEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function strongEnough(password) {
        return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
    }

    async function redirectIfLoggedIn() {
        if (!loginForm) return;
        const { data } = await client.auth.getSession();
        if (data && data.session) {
            window.location.href = 'dashboard.html';
        }
    }

    redirectIfLoggedIn();

    loginForm?.addEventListener('submit', async function (event) {
        event.preventDefault();
        const submit = document.getElementById('account-login-submit');
        const fd = new FormData(loginForm);
        const email = normalizeEmail(fd.get('email'));
        const password = String(fd.get('password') || '');

        if (!validEmail(email) || !password) {
            setError(t('account.errors.required_login', 'Enter your email and password.'));
            return;
        }

        setLoading(submit, true, t('account.login.loading', 'Signing in...'));
        const { error } = await client.auth.signInWithPassword({ email, password });
        setLoading(submit, false);

        if (error) {
            setError(t('account.errors.login_failed', 'Sign in failed. Check your details.'));
            return;
        }

        window.location.href = 'dashboard.html';
    });

    resetForm?.addEventListener('submit', async function (event) {
        event.preventDefault();
        const submit = document.getElementById('account-reset-submit');
        const fd = new FormData(resetForm);
        const email = normalizeEmail(fd.get('email'));

        if (!validEmail(email)) {
            setError(t('account.errors.email_invalid', 'Enter a valid email address.'));
            return;
        }

        setLoading(submit, true, t('account.reset.loading', 'Sending...'));
        const redirectTo = new URL('update-password.html', window.location.href).toString();
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        setLoading(submit, false);

        if (error) {
            setError(t('account.errors.reset_failed', 'Reset link could not be sent.'));
            return;
        }

        resetForm.reset();
        setSuccess(t('account.reset.sent', 'Reset link sent. Check your email.'));
    });

    if (updateForm) {
        const invalidBox = document.getElementById('account-update-invalid');
        const requestNewLink = document.getElementById('account-update-request-new');
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hasImplicitRecovery = /access_token=/.test(hash) && /type=recovery/.test(hash);
        const hasPkceCode = /[?&]code=/.test(search);

        function showForm() {
            updateForm.classList.remove('is-hidden');
            invalidBox?.classList.add('is-hidden');
            requestNewLink?.classList.add('is-hidden');
        }

        if (hasImplicitRecovery || hasPkceCode) {
            showForm();
        } else {
            client.auth.onAuthStateChange(function (event) {
                if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') showForm();
            });
        }
    }

    updateForm?.addEventListener('submit', async function (event) {
        event.preventDefault();
        const submit = document.getElementById('account-update-submit');
        const fd = new FormData(updateForm);
        const password = String(fd.get('password') || '');
        const confirm = String(fd.get('password_confirm') || '');

        if (!strongEnough(password)) {
            setError(t('account.errors.password_rules', 'Use at least 8 characters with an uppercase letter and a number.'));
            return;
        }

        if (password !== confirm) {
            setError(t('account.errors.password_match', 'Passwords do not match.'));
            return;
        }

        setLoading(submit, true, t('account.update.loading', 'Updating...'));
        const { error } = await client.auth.updateUser({ password });
        setLoading(submit, false);

        if (error) {
            setError(t('account.errors.update_failed', 'Password could not be updated.'));
            return;
        }

        await client.auth.signOut();
        setSuccess(t('account.update.done', 'Password updated. You can sign in now.'));
        setTimeout(() => { window.location.href = 'login.html'; }, 1600);
    });
})();
