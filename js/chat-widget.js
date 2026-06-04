'use strict';
// ═══════════════════════════════════════════════════════════════
// GSM OFİS PRO — Landing Page İki Yönlü Canlı Chat Widget
// Senior-Master: Akıllı diff-render, cache, polling + realtime.
// ================================================================
const CHAT_SUPABASE_URL = 'https://cjwszktbrkoegbajanwp.supabase.co';
const CHAT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd3N6a3RicmtvZWdiYWphbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg1NjQsImV4cCI6MjA4ODI3NDU2NH0.l5x3wA5ZdDy6Jc6yU5PTUboDzkP9iaY42FEC8ukqXDc';

let chatSB = null;
let chatChannel = null;

if (typeof supabase !== 'undefined') {
    chatSB = supabase.createClient(CHAT_SUPABASE_URL, CHAT_SUPABASE_KEY);
}

// Helpers
function detectLang() {
    const p = window.location.pathname;
    if (p.includes('en.html')) return 'en';
    if (p.includes('es.html')) return 'es';
    if (p.includes('de.html')) return 'de';
    if (p.includes('fr.html')) return 'fr';
    if (p.includes('ar.html')) return 'ar';
    return 'tr';
}

const ChatI18n = {
    'tr': {
        welcomeHello: 'Merhaba',
        welcomeHelp: 'Size nasıl yardımcı olabiliriz?',
        supportName: 'GSM OFİS Destek',
        chatTitle: 'Canlı Destek',
        onlineDot: 'Genellikle birkaç dakika içinde yanıtlar',
        introTitle: 'Canlı Destek',
        introDesc: 'Merhaba! Bize mesaj göndermek için bilgilerinizi girin.',
        placeName: 'Adınız *',
        placePhone: 'Telefon (opsiyonel)',
        placeEmail: 'E-posta *',
        btnStart: 'Sohbeti Başlat',
        placeMsg: 'Mesajınızı yazın...',
        closeBtnTitle: 'Kapat',
        brandName: 'GSM OFİS PRO'
    },
    'en': {
        welcomeHello: 'Hello',
        welcomeHelp: 'How can we help you?',
        supportName: 'GSM OFİS Support',
        chatTitle: 'Live Support',
        onlineDot: 'Usually replies in a few minutes',
        introTitle: 'Live Support',
        introDesc: 'Hello! Enter your details to send us a message.',
        placeName: 'Your Name *',
        placePhone: 'Phone (optional)',
        placeEmail: 'Your Email *',
        btnStart: 'Start Chat',
        placeMsg: 'Type your message...',
        closeBtnTitle: 'Close',
        brandName: 'GSM OFİS PRO'
    },
    'es': {
        welcomeHello: '¡Hola',
        welcomeHelp: '¿Cómo podemos ayudarte?',
        supportName: 'Soporte GSM OFİS',
        chatTitle: 'Soporte en Vivo',
        onlineDot: 'Normalmente responde en unos minutos',
        introTitle: 'Soporte en Vivo',
        introDesc: '¡Hola! Ingresa tus datos para enviarnos un mensaje.',
        placeName: 'Tu Nombre *',
        placePhone: 'Teléfono (opcional)',
        placeEmail: 'Tu Correo *',
        btnStart: 'Iniciar Chat',
        placeMsg: 'Escribe tu mensaje...',
        closeBtnTitle: 'Cerrar',
        brandName: 'GSM OFİS PRO'
    },
    'de': {
        welcomeHello: 'Hallo',
        welcomeHelp: 'Wie können wir Ihnen helfen?',
        supportName: 'GSM OFİS Support',
        chatTitle: 'Live-Support',
        onlineDot: 'Antwortet normalerweise in wenigen Minuten',
        introTitle: 'Live-Support',
        introDesc: 'Hallo! Geben Sie Ihre Daten ein, um uns eine Nachricht zu senden.',
        placeName: 'Dein Name *',
        placePhone: 'Telefon (optional)',
        placeEmail: 'Ihre E-Mail *',
        btnStart: 'Chat Beginnen',
        placeMsg: 'Schreiben Sie Ihre Nachricht...',
        closeBtnTitle: 'Schließen',
        brandName: 'GSM OFİS PRO'
    },
    'fr': {
        welcomeHello: 'Bonjour',
        welcomeHelp: 'Comment pouvons-nous vous aider ?',
        supportName: 'Support GSM OFİS',
        chatTitle: 'Support en Direct',
        onlineDot: 'Répond généralement en quelques minutes',
        introTitle: 'Support en Direct',
        introDesc: 'Bonjour ! Entrez vos coordonnées pour nous envoyer un message.',
        placeName: 'Votre Nom *',
        placePhone: 'Téléphone (optionnel)',
        placeEmail: 'Votre E-mail *',
        btnStart: 'Démarrer le Chat',
        placeMsg: 'Tapez votre message...',
        closeBtnTitle: 'Fermer',
        brandName: 'GSM OFİS PRO'
    },
    'ar': {
        welcomeHello: 'مرحباً',
        welcomeHelp: 'كيف يمكننا مساعدتك؟',
        supportName: 'دعم GSM OFİS',
        chatTitle: 'الدعم المباشر',
        onlineDot: 'يرد عادة في غضون بضع دقائق',
        introTitle: 'الدعم المباشر',
        introDesc: 'مرحباً! أدخل بياناتك لترسل لنا رسالة.',
        placeName: 'اسمك *',
        placePhone: 'الهاتف (اختياري)',
        placeEmail: 'بريدك الإلكتروني *',
        btnStart: 'بدء الدردشة',
        placeMsg: 'اكتب رسالتك...',
        closeBtnTitle: 'إغلاق',
        brandName: 'GSM OFİS PRO'
    }
};

function getSessionId() {
    let sid = localStorage.getItem('gsmofis_chat_sid');
    if (!sid) {
        sid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('gsmofis_chat_sid', sid);
    }
    return sid;
}

function getSavedName() { return localStorage.getItem('gsmofis_chat_name') || ''; }
function setSavedName(n) { if (n) localStorage.setItem('gsmofis_chat_name', n); }
function getSavedPhone() { return localStorage.getItem('gsmofis_chat_phone') || ''; }
function setSavedPhone(p) { if (p) localStorage.setItem('gsmofis_chat_phone', p); }
function getSavedEmail() { return localStorage.getItem('gsmofis_chat_email') || ''; }
function setSavedEmail(e) { if (e) localStorage.setItem('gsmofis_chat_email', e); }

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Cache (2 gün TTL)
const CACHE_KEY = 'gsmofis_chat_cache';
const CACHE_TTL = 2 * 24 * 60 * 60 * 1000;

function getCachedMessages() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.data || [];
    } catch (_) { return null; }
}

function setCachedMessages(msgs) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: msgs }));
    } catch (_) { /* quota */ }
}

document.addEventListener('DOMContentLoaded', () => {
    const bubble     = document.getElementById('chat-bubble');
    const panel      = document.getElementById('chat-panel');
    const closeBtn   = document.getElementById('chat-close-btn');
    const unreadDot  = document.getElementById('chat-unread-dot');

    const messagesEl  = document.getElementById('chat-messages-list');
    const inputEl     = document.getElementById('chat-msg-input');
    const sendBtnEl   = document.getElementById('chat-send-msg-btn');
    const introWrap   = document.getElementById('chat-intro-wrap');
    const chatBody    = document.getElementById('chat-body-area');

    const introName   = document.getElementById('chat-intro-name');
    const introPhone  = document.getElementById('chat-intro-phone');
    const introEmail  = document.getElementById('chat-intro-email');
    const startBtn    = document.getElementById('chat-start-btn');

    if (!bubble || !panel) return;
    
    // Apply translations to UI elements based on current detected language
    const lang = detectLang();
    const t = ChatI18n[lang] || ChatI18n['tr'];
    
    bubble.setAttribute('title', t.chatTitle);
    bubble.setAttribute('aria-label', t.chatTitle);
    if (panel) panel.setAttribute('aria-label', t.chatTitle);
    if (closeBtn) { closeBtn.setAttribute('aria-label', t.closeBtnTitle); closeBtn.setAttribute('title', t.closeBtnTitle); }
    
    const panelBrandName = panel.querySelector('.chat-panel-brand > div > div:first-child');
    if (panelBrandName) panelBrandName.textContent = t.brandName;
    
    const panelOnlineDot = panel.querySelector('.chat-panel-brand > div > div:last-child');
    if (panelOnlineDot) panelOnlineDot.textContent = t.onlineDot;
    
    const introTitleEl = document.querySelector('.chat-intro-title');
    if (introTitleEl) introTitleEl.textContent = t.introTitle;
    
    const introDescEl = document.querySelector('.chat-intro-desc');
    if (introDescEl) introDescEl.textContent = t.introDesc;
    
    if (introName) introName.placeholder = t.placeName;
    if (introPhone) introPhone.placeholder = t.placePhone;
    if (introEmail) introEmail.placeholder = t.placeEmail;
    if (inputEl) inputEl.placeholder = t.placeMsg;
    
    if (startBtn) {
        startBtn.innerHTML = `
            ${t.btnStart}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        `;
    }

    let isOpen = false;
    let hasStarted = !!getSavedName();
    let localMessages = [];
    let renderedHash = '';
    let pollTimer = null;

    // ─── Toggle Panel ───
    function openPanel() {
        panel.classList.remove('is-hidden');
        bubble.classList.add('is-open');
        isOpen = true;
        if (unreadDot) unreadDot.classList.add('is-hidden');

        if (hasStarted) {
            showChatView();
            loadMessages();
        } else {
            showIntroView();
        }
    }

    function closePanel() {
        panel.classList.add('is-hidden');
        bubble.classList.remove('is-open');
        isOpen = false;
    }

    bubble.addEventListener('click', () => { isOpen ? closePanel() : openPanel(); });
    bubble.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
    });
    closeBtn?.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    // ─── Intro / Chat View ───
    function showIntroView() {
        if (introWrap) introWrap.classList.remove('is-hidden');
        if (chatBody) chatBody.classList.add('is-hidden');
        if (introName) introName.value = getSavedName();
        if (introPhone) introPhone.value = getSavedPhone();
        if (introEmail) introEmail.value = getSavedEmail();
    }

    function showChatView() {
        if (introWrap) introWrap.classList.add('is-hidden');
        if (chatBody) chatBody.classList.remove('is-hidden');
        inputEl?.focus();
    }

    startBtn?.addEventListener('click', () => {
        const name = (introName?.value || '').trim();
        const email = (introEmail?.value || '').trim();
        if (!name) { introName.style.borderColor = '#ef4444'; introName.focus(); return; }
        if (!email || !isValidEmail(email)) {
            if (introEmail) { introEmail.style.borderColor = '#ef4444'; introEmail.focus(); }
            return;
        }
        setSavedName(name);
        setSavedPhone((introPhone?.value || '').trim());
        setSavedEmail(email);
        hasStarted = true;
        showChatView();
        loadMessages();
    });

    // ─── Mesajları Yükle ───
    async function loadMessages() {
        // Cache'den hızlı göster
        const cached = getCachedMessages();
        if (cached && cached.length > 0 && localMessages.length === 0) {
            localMessages = cached;
            smartRender();
        }

        if (!chatSB) return;

        const sid = getSessionId();
        const { data, error } = await chatSB
            .from('visitor_messages')
            .select('*')
            .eq('session_id', sid)
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('Chat yüklenemedi:', error.message);
            return;
        }

        localMessages = data || [];
        setCachedMessages(localMessages);
        smartRender();
        setupRealtime();
        startPolling();
    }

    // ─── Akıllı Render (Diff-based) ───
    function smartRender() {
        if (!messagesEl) return;

        // Hash ile değişiklik kontrolü
        const newHash = simpleHash(JSON.stringify(localMessages));
        if (newHash === renderedHash) return; // Değişiklik yok, render atla
        renderedHash = newHash;

        const scrollAtBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 50;

        if (localMessages.length === 0) {
            const lang = detectLang();
            const t = ChatI18n[lang] || ChatI18n['tr'];
            messagesEl.innerHTML = `
                <div class="chat-welcome-msg">
                    <div class="chat-welcome-icon">👋</div>
                    <div class="chat-welcome-text">
                        ${t.welcomeHello} <strong>${escHtml(getSavedName())}</strong>!<br>
                        ${t.welcomeHelp}
                    </div>
                </div>
            `;
            return;
        }

        messagesEl.innerHTML = localMessages.map(msg => {
            let html = '';
            
            if (msg.message && msg.message !== '[Admin Yanıt]') {
                const time = new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                html += `<div class="chat-msg-bubble visitor">
                    <div class="chat-msg-text">${escHtml(msg.message)}</div>
                    <div class="chat-msg-time">${time}</div>
                </div>`;
            }

            if (msg.admin_reply) {
                const lang = detectLang();
                const t = ChatI18n[lang] || ChatI18n['tr'];
                const replyTime = msg.replied_at 
                    ? new Date(msg.replied_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                html += `<div class="chat-msg-bubble admin">
                    <div class="chat-msg-sender">${t.supportName}</div>
                    <div class="chat-msg-text">${escHtml(msg.admin_reply)}</div>
                    <div class="chat-msg-time">${replyTime}</div>
                </div>`;
            }

            return html;
        }).join('');

        // Sadece en alttaysa scroll et
        if (scrollAtBottom) {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    }

    // ─── Mesaj Gönder ───
    async function sendMessage() {
        const text = (inputEl?.value || '').trim();
        if (!text || !chatSB) return;

        inputEl.value = '';
        inputEl.focus();

        // Detect first visitor message in this session → prepend contact info
        const isFirstMessage = !localMessages.some(m =>
            m.message && !String(m.id).startsWith('temp_')
        );
        let finalText = text;
        if (isFirstMessage) {
            const infoLines = [];
            const nm = getSavedName();
            const em = getSavedEmail();
            const ph = getSavedPhone();
            if (nm) infoLines.push(`👤 ${nm}`);
            if (em) infoLines.push(`✉️ ${em}`);
            if (ph) infoLines.push(`📞 ${ph}`);
            if (infoLines.length) {
                finalText = infoLines.join('\n') + '\n─────────────\n' + text;
            }
        }

        const payload = {
            visitor_name: getSavedName() || null,
            visitor_phone: getSavedPhone() || null,
            message: finalText,
            session_id: getSessionId(),
            page_lang: detectLang(),
            is_read: false
        };

        // Optimistic UI
        const tempMsg = { ...payload, created_at: new Date().toISOString(), id: 'temp_' + Date.now() };
        localMessages.push(tempMsg);
        renderedHash = ''; // Force render
        smartRender();
        setCachedMessages(localMessages);

        const { error } = await chatSB.from('visitor_messages').insert([payload]);
        if (error) {
            console.error('Mesaj gönderilemedi:', error.message);
            localMessages = localMessages.filter(m => m.id !== tempMsg.id);
            renderedHash = '';
            smartRender();
        }
    }

    sendBtnEl?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // ─── Realtime ───
    function setupRealtime() {
        if (!chatSB || chatChannel) return;

        try {
            const sid = getSessionId();
            chatChannel = chatSB
                .channel('chat_' + sid)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'visitor_messages', filter: `session_id=eq.${sid}` },
                    (payload) => {
                        handleRealtimeEvent(payload);
                    }
                )
                .subscribe();
        } catch (_) { /* polling devam eder */ }
    }

    function handleRealtimeEvent(payload) {
        if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            const exists = localMessages.some(m => m.id === newMsg.id);
            if (exists) return;

            // temp mesajı bul ve değiştir
            const tempIdx = localMessages.findIndex(m => 
                String(m.id).startsWith('temp_') && m.message === newMsg.message
            );
            if (tempIdx >= 0) {
                localMessages[tempIdx] = newMsg;
            } else {
                localMessages.push(newMsg);
            }
        } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new;
            const idx = localMessages.findIndex(m => m.id === updatedMsg.id);
            if (idx >= 0) {
                localMessages[idx] = updatedMsg;
            } else {
                localMessages.push(updatedMsg);
            }
        }

        setCachedMessages(localMessages);
        renderedHash = '';
        smartRender();

        if (!isOpen) {
            const hasReply = localMessages.some(m => m.admin_reply);
            if (hasReply && unreadDot) unreadDot.classList.remove('is-hidden');
        }
    }

    // ─── Polling (10 sn) — Akıllı: sadece hash değişince render ───
    function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(async () => {
            if (!chatSB || !hasStarted) return;

            const sid = getSessionId();
            const { data } = await chatSB
                .from('visitor_messages')
                .select('*')
                .eq('session_id', sid)
                .order('created_at', { ascending: true });

            if (data) {
                const newHash = simpleHash(JSON.stringify(data));
                if (newHash !== renderedHash) {
                    const hadReply = localMessages.some(m => m.admin_reply);
                    localMessages = data;
                    setCachedMessages(localMessages);

                    const hasNewReply = data.some(m => m.admin_reply);
                    if (hasNewReply && !hadReply && !isOpen && unreadDot) {
                        unreadDot.classList.remove('is-hidden');
                    }

                    renderedHash = '';
                    smartRender();
                }
            }
        }, 10000);
    }

    // ─── Sayfa yüklenince ───
    async function checkUnread() {
        if (!chatSB || !getSavedName()) return;

        const sid = getSessionId();
        const { data } = await chatSB
            .from('visitor_messages')
            .select('id, admin_reply')
            .eq('session_id', sid)
            .not('admin_reply', 'is', null)
            .limit(1);

        if (data && data.length > 0 && unreadDot) {
            unreadDot.classList.remove('is-hidden');
        }

        setupRealtime();
        startPolling();
    }

    checkUnread();

    // ─── Utility ───
    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0;
        }
        return String(hash);
    }
});
