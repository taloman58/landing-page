'use strict';

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';
    const ENDPOINT = SUPABASE_URL + '/functions/v1/create-lemonsqueezy-checkout';
    const VALID_PLANS = new Set(['yearly', 'lifetime']);

    const form = document.getElementById('checkout-form');
    if (!form) return;

    function isManualTrFlow() {
        try {
            const lang = (localStorage.getItem('appLang') || 'tr').toLowerCase();
            const params = new URLSearchParams(window.location.search);
            return lang === 'tr' || params.get('from') === 'manual';
        } catch {
            return false;
        }
    }

    const submitBtn = document.getElementById('checkout-submit');
    const submitLabel = submitBtn ? submitBtn.querySelector('span') : null;
    const errorBox = document.getElementById('checkout-error');
    const planInput = document.getElementById('checkout-plan-input');
    const planName = document.getElementById('checkout-plan-name');
    const upgradeBanner = document.getElementById('checkout-upgrade-banner');
    const emailInput = document.getElementById('checkout-email');
    const passwordInput = document.getElementById('checkout-password');
    const passwordConfirmInput = document.getElementById('checkout-password-confirm');

    let isUpgrade = false;
    let lemonEnabled = null;

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function normalizePlan(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'yillik' || raw === 'annual') return 'yearly';
        if (raw === 'life' || raw === 'omur-boyu') return 'lifetime';
        return VALID_PLANS.has(raw) ? raw : 'yearly';
    }

    function setError(message) {
        if (!errorBox) return;
        errorBox.textContent = message;
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
            if (!submitBtn.dataset.originalText) submitBtn.dataset.originalText = submitLabel.textContent;
            submitLabel.textContent = t('checkout.submit_loading', 'Redirecting...');
            return;
        }
        if (submitBtn.dataset.originalText) submitLabel.textContent = submitBtn.dataset.originalText;
    }

    function isStrongEnough(password) {
        return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
    }

    function initPlan() {
        const params = new URLSearchParams(window.location.search);
        const plan = normalizePlan(params.get('plan'));
        if (planInput) planInput.value = plan;
        if (planName) {
            const key = plan === 'lifetime' ? 'pricing.lifetime_name' : 'pricing.yearly_name';
            const fallback = plan === 'lifetime' ? 'Lifetime License' : 'Yearly Plan';
            planName.removeAttribute('data-i18n');
            planName.textContent = t(key, fallback);
        }
    }

    function initUpgradeMode() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('upgrade') !== '1') return;
        isUpgrade = true;

        if (upgradeBanner) upgradeBanner.classList.remove('is-hidden');

        const prefilledEmail = (params.get('email') || '').trim().toLowerCase();
        if (emailInput && prefilledEmail) {
            emailInput.value = prefilledEmail;
            emailInput.readOnly = true;
        }

        const pwField = passwordInput ? passwordInput.closest('.form-field') : null;
        const pwConfirmField = passwordConfirmInput ? passwordConfirmInput.closest('.form-field') : null;
        if (pwField) pwField.classList.add('is-hidden');
        if (pwConfirmField) pwConfirmField.classList.add('is-hidden');
        if (passwordInput) passwordInput.required = false;
        if (passwordConfirmInput) passwordConfirmInput.required = false;
    }

    function generateRandomPassword() {
        const rand = () => Math.random().toString(36).slice(2, 12).toUpperCase();
        return 'Upg-' + rand() + rand() + '7!';
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

    function isNonTrLang() {
        const lang = (localStorage.getItem('appLang') || 'tr').toLowerCase();
        return lang !== 'tr';
    }

    async function checkLemonGate() {
        if (!isNonTrLang()) return; // TR → manuel akış, lemon kontrolü gerekmez
        lemonEnabled = await fetchLemonFlag();
        if (lemonEnabled) return; // Lemon açık → checkout normal çalışsın

        // Lemon kapalı + non-TR → formu gizle, bilgi mesajı göster
        if (form) form.classList.add('is-hidden');
        if (errorBox) {
            errorBox.innerHTML = t(
                'pricing.lemon_disabled_notice',
                'Credit card payments are currently unavailable. To purchase via cryptocurrency, please <a href="account/login.html">contact the admin</a>.'
            ).replace('{{link}}', 'account/login.html');
            errorBox.classList.remove('is-hidden');
        }
    }

    initPlan();
    initUpgradeMode();
    checkLemonGate();

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearError();

        const fd = new FormData(form);
        const plan = normalizePlan(fd.get('plan'));
        const userPassword = String(fd.get('password') || '');
        // Upgrade modunda kullanıcı şifre girmiyor; pending_orders.password_encrypted NOT NULL
        // olduğundan rastgele bir değer şifrelenir. Webhook mevcut user'ı listUsers ile bulup
        // bu değeri kullanmaz, eski şifre korunur.
        const effectivePassword = isUpgrade ? generateRandomPassword() : userPassword;
        const payload = {
            plan,
            plan_type: plan === 'lifetime' ? 'lifetime' : 'yillik',
            full_name: String(fd.get('full_name') || '').trim(),
            username: String(fd.get('username') || '').trim().toLowerCase(),
            email: String(fd.get('email') || '').trim().toLowerCase(),
            phone: String(fd.get('phone') || '').trim(),
            password: effectivePassword,
            website: String(fd.get('website') || '')
        };
        const confirmPassword = String(fd.get('password_confirm') || '');

        if (payload.website) return;
        if (!payload.full_name || !payload.username || !payload.email) {
            setError(t('checkout.error_required', 'Fill in all required fields.'));
            return;
        }
        if (!isUpgrade && !userPassword) {
            setError(t('checkout.error_required', 'Fill in all required fields.'));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            setError(t('checkout.error_email', 'Enter a valid email address.'));
            return;
        }
        if (!isUpgrade) {
            if (!isStrongEnough(userPassword)) {
                setError(t('checkout.error_password_rules', 'Use at least 8 characters with an uppercase letter and a number.'));
                return;
            }
            if (userPassword !== confirmPassword) {
                setError(t('checkout.error_password_match', 'Passwords do not match.'));
                return;
            }
        }

        setLoading(true);

        // ── Lemon kapalı + non-TR → engelle ──────────────────────
        if (isNonTrLang() && lemonEnabled === false) {
            setError(t('pricing.lemon_disabled_notice', 'Credit card payments are currently unavailable.').replace(/<[^>]*>/g, ''));
            setLoading(false);
            return;
        }

        // ── TR Manuel Akış ──────────────────────────────────────
        // LS endpoint'i çağrılmaz: doğrudan Supabase signUp + 33 günlük trial + dashboard.
        // Diğer dillerde aşağıdaki LS akışı aynen çalışır.
        if (isManualTrFlow() && !isUpgrade) {
            try {
                if (!window.supabase || !window.supabase.createClient) {
                    setError(t('checkout.error_generic', 'Checkout could not be created. Try again.'));
                    setLoading(false);
                    return;
                }
                const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { data: signUpData, error: signUpError } = await client.auth.signUp({
                    email: payload.email,
                    password: userPassword,
                    options: {
                        data: {
                            full_name: payload.full_name,
                            username: payload.username,
                            phone: payload.phone
                        }
                    }
                });

                if (signUpError) {
                    const msg = String(signUpError.message || '').toLowerCase();
                    if (msg.includes('registered') || msg.includes('already')) {
                        setError(t('checkout.error_email_registered', 'This email address is already registered.'));
                    } else {
                        setError(signUpError.message || t('checkout.error_generic', 'Checkout could not be created. Try again.'));
                    }
                    setLoading(false);
                    return;
                }

                const userId = signUpData && signUpData.user ? signUpData.user.id : null;
                const session = signUpData && signUpData.session ? signUpData.session : null;

                // Email confirmation açıksa session null gelir; o durumda kullanıcıdan
                // mail onayı sonrası login olması istenir.
                if (!session) {
                    setError(t('checkout.manual_check_email', 'Hesabınız oluşturuldu. E-posta adresinize gelen onay linkine tıklayıp ardından giriş yapın.'));
                    setLoading(false);
                    return;
                }

                // Trial lisansı oluştur
                const { data: trialData, error: trialError } = await client.rpc('create_trial_license', {
                    p_user_id: userId,
                    p_username: payload.username,
                    p_phone: payload.phone || null
                });

                if (trialError || (trialData && trialData.success === false)) {
                    const errMsg = (trialError && trialError.message) || (trialData && trialData.error) || '';
                    // Lisans zaten varsa yine de dashboard'a yönlendir
                    if (!String(errMsg).toLowerCase().includes('zaten')) {
                        setError(errMsg || t('checkout.error_generic', 'Checkout could not be created. Try again.'));
                        setLoading(false);
                        return;
                    }
                }

                window.location.href = `account/dashboard.html?plan=${encodeURIComponent(plan)}`;
                return;
            } catch (error) {
                console.error('[checkout][manual-tr]', error);
                setError(t('checkout.error_network', 'Connection error. Check your internet connection.'));
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            const checkoutUrl = data.checkout_url || data.checkoutUrl || data.url;

            if (!response.ok || !checkoutUrl) {
                if (data.error_code === 'email_registered') {
                    setError(t('checkout.error_email_registered', 'This email address is already registered.'));
                } else {
                    setError(data.error || t('checkout.error_generic', 'Checkout could not be created. Try again.'));
                }
                setLoading(false);
                return;
            }

            window.location.href = checkoutUrl;
        } catch (error) {
            console.error('[checkout]', error);
            setError(t('checkout.error_network', 'Connection error. Check your internet connection.'));
            setLoading(false);
        }
    });
})();
