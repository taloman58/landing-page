'use strict';

(function () {
    const SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';

    if (!window.supabase || !window.supabase.createClient) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const state = {
        user: null,
        profile: null,
        license: null,
        supportMessages: [],
        manualRequest: null,
        threads: [],
        activeThreadKey: null,
        composerMode: 'idle',
        isAdmin: false,
        lemonEnabled: false
    };

    const errorBox = document.getElementById('account-error');
    const successBox = document.getElementById('account-success');
    const supportForm = document.getElementById('account-support-form');
    const supportConversation = document.getElementById('support-conversation');
    const supportThreadList = document.getElementById('support-thread-list');
    const supportSubjectRow = document.getElementById('support-composer-subject-row');
    const supportSubjectInput = document.getElementById('support-subject');
    const supportMessageInput = document.getElementById('support-message');
    const supportComposerHint = document.getElementById('support-composer-hint');
    const supportEmptyState = document.getElementById('support-empty-state');
    let supportChannel = null;
    let supportPollTimer = null;

    function t(path, fallback) {
        if (typeof window.i18nT === 'function') {
            const val = window.i18nT(path);
            if (val && val !== path) return val;
        }
        return fallback;
    }

    function text(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '—';
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

    function show(el, visible) {
        if (!el) return;
        el.classList.toggle('is-hidden', !visible);
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value || '';
        return div.innerHTML;
    }

    function isLifetimeDate(value) {
        if (!value) return false;
        const d = new Date(value);
        return d.getFullYear() >= 9999;
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        if (isLifetimeDate(value)) return t('account.dashboard.lifetime', 'Lifetime');
        return date.toLocaleDateString();
    }

    function formatMessageDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString();
    }

    function relativeFromNow(value) {
        if (!value) return '';
        const then = new Date(value).getTime();
        if (Number.isNaN(then)) return '';
        const diffMs = Date.now() - then;
        const min = Math.round(diffMs / 60000);
        if (min < 1) return t('account.support.time_now', 'just now');
        if (min < 60) return t('account.support.time_min', '{{n}}m').replace('{{n}}', String(min));
        const hr = Math.round(min / 60);
        if (hr < 24) return t('account.support.time_hr', '{{n}}h').replace('{{n}}', String(hr));
        const day = Math.round(hr / 24);
        if (day < 14) return t('account.support.time_day', '{{n}}d').replace('{{n}}', String(day));
        return new Date(value).toLocaleDateString();
    }

    function statusInfo(license) {
        if (!license || !license.license_key) return null;
        if (license.is_frozen) return { tone: 'frozen', label: t('account.dashboard.frozen', 'Frozen') };
        return license.is_active
            ? { tone: 'active', label: t('account.dashboard.active', 'Active') }
            : { tone: 'inactive', label: t('account.dashboard.inactive', 'Inactive') };
    }

    function statusText(license) {
        const info = statusInfo(license);
        return info ? info.label : '—';
    }

    function userFullName(user) {
        const meta = user && user.user_metadata ? user.user_metadata : {};
        return meta.full_name || meta.name || meta.dealer_name || '';
    }

    function userPhone(user, profile) {
        const meta = user && user.user_metadata ? user.user_metadata : {};
        return (profile && profile.phone) || meta.phone || '';
    }

    function initials(name, email) {
        const source = (name || '').trim() || (email || '').trim();
        if (!source) return '·';
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        const first = parts[0] || '';
        return (first.length > 1 ? first.slice(0, 2) : first).toUpperCase() || '·';
    }

    function planLabel(planType) {
        const map = {
            yillik: t('account.dashboard.plan_yearly', 'Yıllık'),
            lifetime: t('account.dashboard.plan_lifetime', 'Lifetime'),
            trial: t('account.dashboard.plan_trial', 'Trial'),
            aylik: t('account.dashboard.plan_monthly', 'Aylık'),
            '3_aylik': t('account.dashboard.plan_3m', '3 Aylık'),
            '6_aylik': t('account.dashboard.plan_6m', '6 Aylık'),
            '2_yillik': t('account.dashboard.plan_2y', '2 Yıllık'),
            ozel: t('account.dashboard.plan_custom', 'Özel')
        };
        return map[planType] || (planType || '—');
    }

    function manualPlanLabel(planType) {
        if (planType === 'lifetime') return t('account.dashboard.manual_plan_lifetime', 'Ömür Boyu Lisans');
        return t('account.dashboard.manual_plan_yearly', 'Yıllık Plan');
    }

    function isLanguageTr() {
        const lang = (localStorage.getItem('appLang') || 'tr').toLowerCase();
        return lang === 'tr';
    }

    async function requireSession() {
        const { data } = await client.auth.getUser();
        if (!data || !data.user) {
            window.location.href = 'login.html';
            return null;
        }
        return data.user;
    }

    async function loadProfile(user) {
        const { data, error } = await client
            .from('user_profiles')
            .select('id, username, phone, license_id')
            .eq('id', user.id)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }

    async function loadLicense(profile) {
        if (!profile || !profile.license_id) return null;
        const { data, error } = await client
            .from('licenses')
            .select('id, license_key, plan_type, is_active, expires_at, max_users, current_users, is_frozen, frozen_reason, created_at')
            .eq('id', profile.license_id)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }

    function render() {
        const user = state.user;
        const profile = state.profile || {};
        const license = state.license;

        const fullName = userFullName(user) || (profile.username ? '@' + profile.username : '');
        const displayName = fullName || user.email || t('account.dashboard.welcome_back', 'Welcome back');

        text('account-hero-name', displayName);
        text('account-hero-email', user.email || '—');
        text('account-hero-username', profile.username || (user.user_metadata && user.user_metadata.username) || '—');
        const avatar = document.getElementById('account-avatar');
        if (avatar) avatar.textContent = initials(fullName, user.email);

        text('account-full-name', fullName);
        text('account-email', user.email);
        text('account-username', profile.username || (user.user_metadata && user.user_metadata.username) || '');
        text('account-phone', userPhone(user, profile));

        text('account-license-key', license && license.license_key);
        text('account-plan', license ? planLabel(license.plan_type) : '—');
        text('account-expires-at', license ? formatDate(license.expires_at) : '—');
        text('account-license-users', license ? `${license.current_users || 0}/${license.max_users || 1}` : '—');

        renderStatusPills();
        renderTrialMeter();
        renderUpgradeCta();
    }

    function renderStatusPills() {
        const planEl = document.getElementById('account-plan-badge');
        const statusEl = document.getElementById('account-status-pill');
        const license = state.license;

        if (planEl) {
            if (license && license.license_key) {
                planEl.textContent = planLabel(license.plan_type);
                planEl.dataset.plan = license.plan_type || 'unknown';
                planEl.classList.remove('is-hidden');
            } else {
                planEl.classList.add('is-hidden');
            }
        }

        if (statusEl) {
            const info = statusInfo(license);
            if (info) {
                statusEl.textContent = info.label;
                statusEl.dataset.tone = info.tone;
                statusEl.classList.remove('is-hidden');
            } else {
                statusEl.classList.add('is-hidden');
            }
        }
    }

    function renderTrialMeter() {
        const meter = document.getElementById('account-trial-meter');
        const fill = document.getElementById('account-meter-fill');
        const value = document.getElementById('account-meter-value');
        const label = document.getElementById('account-meter-label');
        if (!meter) return;

        const license = state.license;
        if (!license || !license.expires_at || isLifetimeDate(license.expires_at)) {
            meter.classList.add('is-hidden');
            return;
        }

        const expires = new Date(license.expires_at).getTime();
        const now = Date.now();
        const diffMs = expires - now;
        const totalDays = license.plan_type === 'trial' ? 33 : 365;
        const daysLeft = Math.max(0, Math.ceil(diffMs / 86400000));
        const pct = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));

        meter.classList.remove('is-hidden');
        meter.dataset.tone = daysLeft <= 7 ? 'danger' : (daysLeft <= 30 ? 'warning' : 'ok');
        if (value) value.textContent = String(daysLeft);
        if (label) label.textContent = t('account.dashboard.days_left', 'Days remaining');
        if (fill) fill.style.setProperty('--meter-pct', pct + '%');
    }

    function renderUpgradeCta() {
        const upgradeCard = document.getElementById('account-upgrade-card');
        const manualCard = document.getElementById('account-manual-card');
        const lifetimeCard = document.getElementById('account-lifetime-card');

        const license = state.license;
        const tr = isLanguageTr();

        const hasLifetime = license && license.plan_type === 'lifetime' && license.is_active && !license.is_frozen;
        const hasActiveYearly = license
            && (license.plan_type === 'yillik' || license.plan_type === '2_yillik')
            && license.is_active
            && !license.is_frozen;
        const isTrial = !license || license.plan_type === 'trial';

        // Reset
        show(upgradeCard, false);
        show(manualCard, false);
        show(lifetimeCard, false);

        if (hasLifetime) {
            show(lifetimeCard, true);
            return;
        }

        // Mode: 'upgrade-only' (yearly→lifetime), 'full' (trial / no license / inactive)
        const mode = hasActiveYearly ? 'upgrade-only' : 'full';

        if (tr) {
            renderManualCard(mode);
        } else {
            renderLsUpgradeCard(mode);
        }
    }

    function renderLsUpgradeCard(mode) {
        const upgradeCard = document.getElementById('account-upgrade-card');
        const titleEl = document.getElementById('account-upgrade-title');
        const subtitleEl = document.getElementById('account-upgrade-subtitle');
        const yearly = document.getElementById('account-upgrade-yearly');
        const lifetime = document.getElementById('account-upgrade-lifetime');
        if (!upgradeCard) return;

        show(upgradeCard, true);

        const email = encodeURIComponent(state.user?.email || '');

        if (mode === 'upgrade-only') {
            if (titleEl) titleEl.textContent = t('account.dashboard.upgrade_to_lifetime_title', 'Upgrade to Lifetime');
            if (subtitleEl) subtitleEl.textContent = t('account.dashboard.upgrade_to_lifetime_subtitle', 'Move from yearly to a one-time lifetime license.');
            show(yearly, false);
            show(lifetime, true);
            if (lifetime) lifetime.href = `../checkout.html?plan=lifetime&upgrade=1&email=${email}`;
        } else {
            if (titleEl) titleEl.textContent = t('account.dashboard.upgrade_title', 'Choose your plan');
            if (subtitleEl) subtitleEl.textContent = t('account.dashboard.upgrade_subtitle', 'Pick a plan that fits your shop.');
            show(yearly, true);
            show(lifetime, true);
            if (yearly) yearly.href = `../checkout.html?plan=yearly&upgrade=1&email=${email}`;
            if (lifetime) lifetime.href = `../checkout.html?plan=lifetime&upgrade=1&email=${email}`;
        }
    }

    function renderManualCard(mode) {
        const card = document.getElementById('account-manual-card');
        if (!card) return;

        const formEl = document.getElementById('manual-state-form');
        const pendingEl = document.getElementById('manual-state-pending');
        const rejectedEl = document.getElementById('manual-state-rejected');
        const titleEl = document.getElementById('account-manual-title');
        const subtitleEl = document.getElementById('account-manual-subtitle');
        const yearlyRow = card.querySelector('[data-plan-row="yillik"]');
        const lifetimeRow = card.querySelector('[data-plan-row="lifetime"]');
        const yearlyRadio = card.querySelector('input[name="manual_plan"][value="yillik"]');
        const lifetimeRadio = card.querySelector('input[name="manual_plan"][value="lifetime"]');

        show(card, true);
        show(formEl, false);
        show(pendingEl, false);
        show(rejectedEl, false);

        if (mode === 'upgrade-only') {
            if (titleEl) titleEl.textContent = t('account.dashboard.manual_upgrade_title', 'Lifetime\'a Yükselt');
            if (subtitleEl) subtitleEl.textContent = t('account.dashboard.manual_upgrade_subtitle', 'Yıllık planınız aktif. Tek ödemeyle ömür boyu lisansa geçin.');
            show(yearlyRow, false);
            if (yearlyRadio) yearlyRadio.disabled = true;
            if (lifetimeRadio) {
                lifetimeRadio.checked = true;
                lifetimeRadio.disabled = false;
            }
        } else {
            if (titleEl) titleEl.textContent = t('account.dashboard.manual_title', 'Plan Yükselt — Türkiye');
            if (subtitleEl) subtitleEl.textContent = t('account.dashboard.manual_subtitle', 'Banka havalesi veya kripto ile ödeme yapın, manuel onay sonrası lisansınız aktive olur.');
            show(yearlyRow, true);
            if (yearlyRadio) yearlyRadio.disabled = false;
            if (lifetimeRadio) lifetimeRadio.disabled = false;
        }

        const req = state.manualRequest;

        if (!req || req.status === 'awaiting_payment') {
            show(formEl, true);
            return;
        }

        if (req.status === 'awaiting_review') {
            const planEl = document.getElementById('manual-pending-plan');
            if (planEl) planEl.textContent = manualPlanLabel(req.plan_type);
            show(pendingEl, true);
            return;
        }

        if (req.status === 'rejected') {
            const reasonEl = document.getElementById('manual-rejected-reason');
            if (reasonEl) reasonEl.textContent = req.admin_notes || '';
            show(rejectedEl, true);
            return;
        }

        show(formEl, true);
    }

    async function loadManualRequest() {
        if (!state.user) return null;
        const { data, error } = await client
            .from('manual_payment_requests')
            .select('id, plan_type, status, marked_paid_at, admin_notes, license_key, created_at')
            .eq('user_id', state.user.id)
            .in('status', ['awaiting_payment', 'awaiting_review', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            console.warn('[manual-load]', error.message);
            return null;
        }
        return data || null;
    }

    async function manualMarkPaid() {
        const submit = document.getElementById('manual-paid-submit');
        const planRadio = document.querySelector('input[name="manual_plan"]:checked');
        const planType = planRadio ? planRadio.value : 'yillik';

        if (submit) submit.disabled = true;

        try {
            const { data: reqData, error: reqErr } = await client.rpc('request_manual_upgrade', {
                p_plan_type: planType
            });
            if (reqErr) throw new Error(reqErr.message);
            if (!reqData || reqData.success === false) {
                throw new Error(reqData?.error || 'request_failed');
            }
            const requestId = reqData.request_id;

            const { data: markData, error: markErr } = await client.rpc('mark_my_manual_payment_paid', {
                p_request_id: requestId
            });
            if (markErr) throw new Error(markErr.message);
            if (!markData || markData.success === false) {
                throw new Error(markData?.error || 'mark_failed');
            }

            const { data: sessionData } = await client.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
                const fnUrl = `${SUPABASE_URL}/functions/v1/manual-payment-action?action=notify`;
                fetch(fnUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ request_id: requestId })
                }).catch(err => console.warn('[manual-notify]', err));
            }

            state.manualRequest = await loadManualRequest();
            renderUpgradeCta();
            setSuccess(t('account.dashboard.manual_marked', 'Talebiniz alındı. Ödeme onayı sonrası lisansınız aktive edilecek.'));
        } catch (err) {
            console.error('[manual-mark-paid]', err);
            setError(t('account.dashboard.manual_error', 'Talep gönderilirken bir hata oluştu. Lütfen tekrar deneyin.'));
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    function manualRetry() {
        state.manualRequest = null;
        renderUpgradeCta();
    }

    async function manualCopy(targetId) {
        const el = document.getElementById(targetId);
        if (!el) return;
        try {
            await navigator.clipboard.writeText((el.textContent || '').trim());
            setSuccess(t('account.dashboard.manual_copied', 'Kopyalandı.'));
        } catch (_) {
            // sessizce yut
        }
    }

    async function checkAdmin() {
        try {
            const { data, error } = await client.rpc('is_admin');
            if (error) { console.warn('[is_admin]', error.message); return false; }
            return !!data;
        } catch (_) { return false; }
    }

    async function loadLemonFlag() {
        try {
            const { data, error } = await client
                .from('app_config')
                .select('config_value')
                .eq('config_key', 'lemon_enabled')
                .maybeSingle();
            if (error) { console.warn('[lemon-flag]', error.message); return false; }
            return data && data.config_value === 'true';
        } catch (_) { return false; }
    }

    async function toggleLemonFlag(enabled) {
        try {
            const { error } = await client
                .from('app_config')
                .update({ config_value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() })
                .eq('config_key', 'lemon_enabled');
            if (error) throw error;
            state.lemonEnabled = enabled;
            renderAdminLemonCard();
            setSuccess(t(
                enabled ? 'account.dashboard.admin_lemon_on' : 'account.dashboard.admin_lemon_off',
                enabled ? 'Lemon Squeezy payments enabled.' : 'Lemon Squeezy payments disabled.'
            ));
        } catch (err) {
            console.error('[toggle-lemon]', err);
            setError(t('account.dashboard.admin_lemon_error', 'Setting could not be saved.'));
            const checkbox = document.getElementById('admin-lemon-toggle');
            if (checkbox) checkbox.checked = !enabled;
        }
    }

    function renderAdminLemonCard() {
        const card = document.getElementById('admin-lemon-card');
        if (!card) return;
        if (!state.isAdmin) { show(card, false); return; }

        show(card, true);
        const checkbox = document.getElementById('admin-lemon-toggle');
        const statusEl = document.getElementById('admin-lemon-status');
        if (checkbox) checkbox.checked = state.lemonEnabled;
        if (statusEl) {
            statusEl.textContent = state.lemonEnabled
                ? t('account.dashboard.admin_lemon_status_on', 'Credit card payments are active for all languages.')
                : t('account.dashboard.admin_lemon_status_off', 'Credit card payments are disabled. Non-TR users will be directed to messaging.');
        }
    }

    async function loadDashboard() {
        try {
            const user = await requireSession();
            if (!user) return;
            state.user = user;
            state.profile = await loadProfile(user);
            state.license = await loadLicense(state.profile);
            state.manualRequest = await loadManualRequest();
            state.isAdmin = await checkAdmin();
            state.lemonEnabled = await loadLemonFlag();
            render();
            renderAdminLemonCard();
            await loadSupportMessages();
        } catch (error) {
            console.error('[account-dashboard]', error);
            setError(t('account.errors.dashboard_load', 'Account details could not be loaded.'));
        }
    }

    async function logout() {
        await client.auth.signOut();
        window.location.href = 'login.html';
    }

    async function copyLicense() {
        const key = state.license && state.license.license_key;
        if (!key) return;
        try {
            await navigator.clipboard.writeText(key);
            setSuccess(t('account.dashboard.copied', 'License key copied.'));
        } catch (_) { /* ignore */ }
    }

    /* ───────── Support inbox (subject-grouped tickets) ───────── */

    function supportSessionId(user) {
        return 'account_' + user.id;
    }

    function messageSubject(message) {
        const line = String(message || '').split('\n').find(item => item.startsWith('Subject: '));
        return line ? line.replace('Subject: ', '').trim() : '';
    }

    function visibleMessage(message) {
        const raw = String(message || '');
        const marker = '\n---\n';
        if (raw.includes(marker)) {
            return raw.split(marker).slice(1).join(marker).trim();
        }
        return raw.trim();
    }

    function groupThreads(messages) {
        const map = new Map();
        const fallbackKey = '__general__';
        const fallbackLabel = t('account.support.untitled_topic', 'General topic');

        messages.forEach(msg => {
            const subject = messageSubject(msg.message) || fallbackLabel;
            const key = subject === fallbackLabel ? fallbackKey : subject;
            if (!map.has(key)) {
                map.set(key, { key, subject, messages: [] });
            }
            map.get(key).messages.push(msg);
        });

        const threads = [];
        map.forEach(thread => {
            thread.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const last = thread.messages[thread.messages.length - 1];
            const lastReplyAt = thread.messages
                .filter(m => m.replied_at)
                .map(m => new Date(m.replied_at).getTime())
                .reduce((a, b) => Math.max(a, b), 0);
            const lastUserAt = new Date(last.created_at).getTime();
            thread.lastActivity = Math.max(lastReplyAt || 0, lastUserAt);
            thread.hasReply = thread.messages.some(m => m.admin_reply);
            thread.unread = thread.messages.some(m => m.admin_reply && m.is_read === false);
            thread.lastSnippet = visibleMessage(last.admin_reply || last.message);
            threads.push(thread);
        });

        threads.sort((a, b) => b.lastActivity - a.lastActivity);
        return threads;
    }

    function renderThreadList() {
        if (!supportThreadList) return;
        const threads = state.threads;
        const countEl = document.getElementById('support-threads-count');
        if (countEl) countEl.textContent = String(threads.length);

        if (!threads.length) {
            supportThreadList.innerHTML = `<div class="support-thread-empty">${escapeHtml(t('account.support.threads_empty', 'No topics yet.'))}</div>`;
            return;
        }

        supportThreadList.innerHTML = threads.map(thread => {
            const isActive = state.activeThreadKey === thread.key;
            const unreadDot = thread.unread ? '<span class="support-thread-dot" aria-label="Unread"></span>' : '';
            const replyBadge = thread.hasReply
                ? `<span class="support-thread-flag support-thread-flag--reply">${escapeHtml(t('account.support.flag_reply', 'Reply'))}</span>`
                : `<span class="support-thread-flag support-thread-flag--waiting">${escapeHtml(t('account.support.flag_waiting', 'Waiting'))}</span>`;
            return `
                <button type="button" class="support-thread-item${isActive ? ' is-active' : ''}" data-action="select-thread" data-thread-key="${escapeHtml(thread.key)}">
                    <div class="support-thread-item-head">
                        ${unreadDot}
                        <span class="support-thread-subject">${escapeHtml(thread.subject)}</span>
                    </div>
                    <div class="support-thread-snippet">${escapeHtml(thread.lastSnippet)}</div>
                    <div class="support-thread-foot">
                        ${replyBadge}
                        <span class="support-thread-time">${escapeHtml(relativeFromNow(new Date(thread.lastActivity).toISOString()))}</span>
                    </div>
                </button>
            `;
        }).join('');
    }

    function renderConversation() {
        if (!supportConversation) return;
        const thread = state.threads.find(item => item.key === state.activeThreadKey);

        if (state.composerMode === 'new') {
            supportConversation.innerHTML = `
                <div class="support-conversation-empty">
                    <div class="support-conversation-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <h3>${escapeHtml(t('account.support.new_topic_title', 'Open a new topic'))}</h3>
                    <p>${escapeHtml(t('account.support.new_topic_text', 'Add a short subject and your message. Your account context is attached automatically.'))}</p>
                </div>
            `;
            showComposer({ subjectVisible: true, hint: t('account.support.composer_hint_new', 'Subject and message will start a new ticket.') });
            return;
        }

        if (!thread) {
            supportConversation.innerHTML = `
                <div class="support-conversation-empty">
                    <div class="support-conversation-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3>${escapeHtml(t('account.support.empty_title', 'No conversation selected'))}</h3>
                    <p>${escapeHtml(t('account.support.empty_text', 'Pick a topic from the left or open a new one to start chatting with support.'))}</p>
                </div>
            `;
            hideComposer();
            return;
        }

        const userLabel = t('account.support.user_label', 'You');
        const adminLabel = t('account.support.admin_label', 'Support');
        const bubbles = [];
        thread.messages.forEach(msg => {
            const body = visibleMessage(msg.message);
            bubbles.push(`
                <article class="support-bubble support-bubble--user">
                    <div class="support-bubble-meta"><strong>${escapeHtml(userLabel)}</strong><span>${escapeHtml(formatMessageDate(msg.created_at))}</span></div>
                    <div class="support-bubble-body">${escapeHtml(body)}</div>
                </article>
            `);
            if (msg.admin_reply) {
                bubbles.push(`
                    <article class="support-bubble support-bubble--admin">
                        <div class="support-bubble-meta"><strong>${escapeHtml(adminLabel)}</strong><span>${escapeHtml(formatMessageDate(msg.replied_at))}</span></div>
                        <div class="support-bubble-body">${escapeHtml(msg.admin_reply)}</div>
                    </article>
                `);
            }
        });

        supportConversation.innerHTML = `
            <header class="support-conversation-head">
                <h3>${escapeHtml(thread.subject)}</h3>
                <span>${escapeHtml(t('account.support.message_count', '{{n}} messages').replace('{{n}}', String(thread.messages.length)))}</span>
            </header>
            <div class="support-conversation-stream">${bubbles.join('')}</div>
        `;

        showComposer({ subjectVisible: false, hint: t('account.support.composer_hint', 'Your reply will be added to this topic.') });

        const stream = supportConversation.querySelector('.support-conversation-stream');
        if (stream) stream.scrollTop = stream.scrollHeight;
    }

    function showComposer({ subjectVisible, hint }) {
        if (!supportForm) return;
        show(supportForm, true);
        show(supportEmptyState, false);
        show(supportSubjectRow, !!subjectVisible);
        if (supportSubjectInput) supportSubjectInput.required = !!subjectVisible;
        if (supportComposerHint) supportComposerHint.textContent = hint || '';
        if (supportMessageInput) {
            supportMessageInput.placeholder = subjectVisible
                ? t('account.support.message_placeholder_new', 'Describe your issue in detail…')
                : t('account.support.message_placeholder_reply', 'Type your reply…');
        }
    }

    function hideComposer() {
        show(supportForm, false);
        show(supportSubjectRow, false);
    }

    function selectThread(key) {
        state.activeThreadKey = key;
        state.composerMode = 'thread';
        renderThreadList();
        renderConversation();
    }

    function openNewTopic() {
        state.activeThreadKey = null;
        state.composerMode = 'new';
        if (supportForm) supportForm.reset();
        renderThreadList();
        renderConversation();
        if (supportSubjectInput) supportSubjectInput.focus();
    }

    async function loadSupportMessages() {
        if (!state.user) return;
        const { data, error } = await client
            .from('visitor_messages')
            .select('id, message, admin_reply, replied_at, created_at, is_read')
            .eq('session_id', supportSessionId(state.user))
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[account-support-history]', error.message);
            return;
        }

        state.supportMessages = data || [];
        state.threads = groupThreads(state.supportMessages);

        if (state.composerMode === 'idle' && state.threads.length) {
            state.activeThreadKey = state.threads[0].key;
            state.composerMode = 'thread';
        } else if (state.activeThreadKey && !state.threads.find(th => th.key === state.activeThreadKey)) {
            state.activeThreadKey = state.threads[0]?.key || null;
            state.composerMode = state.activeThreadKey ? 'thread' : 'idle';
        }

        renderThreadList();
        renderConversation();
        setupSupportRealtime();
        startSupportPolling();
    }

    function setupSupportRealtime() {
        if (!state.user || supportChannel) return;
        try {
            const sid = supportSessionId(state.user);
            supportChannel = client
                .channel('account_support_' + state.user.id)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'visitor_messages', filter: `session_id=eq.${sid}` },
                    () => { loadSupportMessages(); }
                )
                .subscribe();
        } catch (_) { /* polling remains active */ }
    }

    function startSupportPolling() {
        if (supportPollTimer) return;
        supportPollTimer = setInterval(loadSupportMessages, 10000);
    }

    function buildSupportMessage(subject, message) {
        const user = state.user;
        const profile = state.profile || {};
        const license = state.license || {};
        return [
            '[Account support report]',
            'Subject: ' + subject,
            'Email: ' + (user.email || '—'),
            'Name: ' + (userFullName(user) || '—'),
            'Username: ' + (profile.username || (user.user_metadata && user.user_metadata.username) || '—'),
            'Phone: ' + (userPhone(user, profile) || '—'),
            'License: ' + (license.license_key || '—'),
            'Plan: ' + (license.plan_type || '—'),
            'Status: ' + statusText(license),
            '---',
            message
        ].join('\n');
    }

    async function sendSupportReport(event) {
        event.preventDefault();
        const submit = document.getElementById('account-support-submit');
        const fd = new FormData(supportForm);
        const message = String(fd.get('message') || '').trim();

        if (!message) {
            setError(t('account.support.error_message_required', 'Type your message.'));
            return;
        }

        let subject;
        if (state.composerMode === 'new') {
            subject = String(fd.get('subject') || '').trim();
            if (!subject) {
                setError(t('account.support.error_subject_required', 'Enter a subject for the new topic.'));
                return;
            }
        } else {
            const activeThread = state.threads.find(th => th.key === state.activeThreadKey);
            subject = activeThread ? activeThread.subject : t('account.support.untitled_topic', 'General topic');
        }

        if (submit) submit.disabled = true;

        const payload = {
            visitor_name: userFullName(state.user) || state.profile?.username || null,
            visitor_phone: userPhone(state.user, state.profile) || null,
            message: buildSupportMessage(subject, message),
            session_id: supportSessionId(state.user),
            page_lang: localStorage.getItem('appLang') || 'tr',
            is_read: false
        };

        const { error } = await client.from('visitor_messages').insert([payload]);

        if (submit) submit.disabled = false;

        if (error) {
            console.error('[account-support]', error);
            setError(t('account.support.error_send', 'Message could not be sent.'));
            return;
        }

        if (supportMessageInput) supportMessageInput.value = '';
        if (supportSubjectInput) supportSubjectInput.value = '';

        // After insert, jump to the (possibly new) thread
        state.composerMode = 'thread';
        const newKey = subject || state.activeThreadKey;
        state.activeThreadKey = newKey;

        setSuccess(t('account.support.sent', 'Message delivered to support.'));
        await loadSupportMessages();
    }

    document.addEventListener('click', function (event) {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        if (action === 'logout') logout();
        else if (action === 'copy-license') copyLicense();
        else if (action === 'manual-mark-paid') manualMarkPaid();
        else if (action === 'manual-retry') manualRetry();
        else if (action === 'manual-copy') manualCopy(actionEl.dataset.copyTarget);
        else if (action === 'toggle-lemon') toggleLemonFlag(actionEl.checked);
        else if (action === 'support-new') openNewTopic();
        else if (action === 'select-thread') selectThread(actionEl.dataset.threadKey);
    });

    if (supportMessageInput) {
        supportMessageInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                supportForm?.requestSubmit();
            }
        });
    }

    supportForm?.addEventListener('submit', sendSupportReport);
    loadDashboard();
})();
