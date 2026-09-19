// ==UserScript==
// @name         Gaijin Store Partner HUD
// @namespace    https://github.com/SempiternalSloth/WTcc-code-reminder
// @version      1.3
// @description  WTPB Reminder HUD.
// @author       SempiternalSloth
// @match        https://store.gaijin.net/*
// @grant        none
// @license      MIT
// @icon         https://raw.githubusercontent.com/SempiternalSloth/WTcc-code-reminder/refs/heads/main/gaijinreminderwtpb.ico
// @homepage     https://github.com/SempiternalSloth/WTcc-code-reminder
// @supportURL   https://github.com/SempiternalSloth/WTcc-code-reminder/issues
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        TARGET_URL: "https://wtpb.net/?category=decal&availability=available&method=discount",
        CACHE_KEY: 'gaijin_partner_data',
        CACHE_TTL: 3600000,
        SUPPORT_SELECTOR: '.shop-support-info, .purchase-support, body'
    };

    //Buy PopUp Recognition
    const BUY_POPUP_PARAM_KEY = 'ppupPurchaseItemId';

    const isBuyPopupUrl = (params) => {
        return params.has(BUY_POPUP_PARAM_KEY);
    };

    const THEME = {
        success: "#2ecc71",
        danger: "#de352c",
        warning: "#ffcc00",
        dark: "#1a1a1a",
        textLight: "#ffffff",
        textDark: "#000000",
        shadow: "0 6px 20px rgba(0,0,0,0.4)"
    };

    const TEXT = {
        activeHeader: "Supporting",
        activeButton: "Change Code",
        bannerWarning: "NO CREATOR CODE DETECTED",
        bannerButton: "GET A CODE",
        reminderHeader: "No active code",
        reminderLink: "Choose a creator",
        modalTitle: "ARE YOU SURE?",
        modalBody: "Buying without a code means no creator receives support.",
        modalButton: "GET A CODE NOW"
    };

    const STYLES = `
        .hud-ui { position: fixed; z-index: 2147483647; font-family: system-ui, sans-serif; pointer-events: none; transition: opacity 0.2s; }
        .hud-ui * { pointer-events: auto; }
        .wt-hidden { display: none !important; }
        .badge-active { bottom: 20px; right: 20px; background: ${THEME.success}; color: ${THEME.textLight}; padding: 12px 18px; border-radius: 8px; border-left: 5px solid rgba(0,0,0,0.2); box-shadow: ${THEME.shadow}; display: flex; flex-direction: column; align-items: center; }
        .badge-reminder { bottom: 20px; right: 20px; background: ${THEME.dark}; color: #eee; padding: 12px 18px; border-radius: 8px; border: 1px solid #333; text-align: center; }
        .banner-critical { top: 0; left: 0; width: 100%; background: ${THEME.danger}; color: ${THEME.textLight}; padding: 12px 0; text-align: center; font-weight: 900; border-bottom: 4px solid rgba(0,0,0,0.2); }
        .modal-menu { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #000; color: ${THEME.warning}; padding: 40px; text-align: center; border: 3px solid ${THEME.warning}; border-radius: 12px; box-shadow: 0 0 100px rgba(0,0,0,0.9); width: 320px; display: flex; flex-direction: column; gap: 15px; }
        .btn-main { background: ${THEME.warning}; color: ${THEME.textDark}; padding: 14px; text-decoration: none; font-weight: 900; border-radius: 6px; font-size: 16px; display: block; }
        .btn-white { background: white; color: ${THEME.danger}; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; margin-left: 10px; }
        .btn-switch { font-size: 10px; color: ${THEME.textLight}; text-decoration: none; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 4px 12px; border-radius: 12px; text-transform: uppercase; margin-top: 8px; }
    `;

    let state = {
        partnerName: null,
        isProductPage: false,
        isBuyPopup: false,
        dismissedUrl: null,
        lastHash: ""
    };

    const ui = {};

    const initDOM = () => {
        if (document.getElementById('wt-hud-container')) return;
        const style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);
        const container = document.createElement('div');
        container.id = 'wt-hud-container';
        container.innerHTML = `
            <div id="wt-active" class="hud-ui badge-active wt-hidden"></div>
            <div id="wt-banner" class="hud-ui banner-critical wt-hidden"></div>
            <div id="wt-reminder" class="hud-ui badge-reminder wt-hidden"></div>
            <div id="wt-modal" class="hud-ui modal-menu wt-hidden">
                <button id="wt-close" style="position:absolute; top:10px; right:15px; background:none; border:none; color:#888; font-size:24px; cursor:pointer;">×</button>
                <div style="font-size: 22px; font-weight: 900;">${TEXT.modalTitle}</div>
                <div style="font-size: 14px; color: #ccc;">${TEXT.modalBody}</div>
                <a href="${CONFIG.TARGET_URL}" target="_blank" class="btn-main">${TEXT.modalButton}</a>
            </div>
        `;
        document.body.appendChild(container);
        ui.active = document.getElementById('wt-active');
        ui.banner = document.getElementById('wt-banner');
        ui.reminder = document.getElementById('wt-reminder');
        ui.modal = document.getElementById('wt-modal');
        document.getElementById('wt-close').onclick = () => {
            state.dismissedUrl = window.location.href;
            updateState(false);
        };
    };

    const getPartner = (forceScrape) => {
        const params = new URLSearchParams(window.location.search);

        // Always try to find the "SUPPORTED" text to check against stored
        if (forceScrape) {
            const el = document.querySelector(CONFIG.SUPPORT_SELECTOR);
            const match = el?.innerText.match(/SUPPORTED\s*\n\s*([^\n\r]+)/i);
            if (match?.[1]) {
                const name = match[1].trim();
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ name, timestamp: Date.now() }));
                return name;
            }
        }

        // If on purchase page and nobody is being supported , clear cache
        if (window.location.pathname.includes('story.php')) {
            const el = document.querySelector(CONFIG.SUPPORT_SELECTOR);
            const hasText = el?.innerText.match(/SUPPORTED/i);
            if (!hasText) {
                localStorage.removeItem(CONFIG.CACHE_KEY);
                return null;
            }
        }

        const urlPartner = params.get('partner')?.trim();
        if (urlPartner && urlPartner.length > 1) {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ name: urlPartner, timestamp: Date.now() }));
            return urlPartner;
        }

        try {
            const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
            if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_TTL)) return cached.name;
        } catch (e) {}
        return null;
    };

    // Render menus
    const render = () => {
        const hash = `${state.partnerName}-${state.isProductPage}-${state.isBuyPopup}-${state.dismissedUrl === window.location.href}`;
        if (hash === state.lastHash) return;
        state.lastHash = hash;

        [ui.active, ui.banner, ui.reminder, ui.modal].forEach(el => el.classList.add('wt-hidden'));

        if (state.partnerName) {
            ui.active.innerHTML = `
                <span style="font-size:9px; font-weight:900; opacity:0.8; text-transform:uppercase;">${TEXT.activeHeader}</span>
                <span style="font-weight:800; font-size:16px; margin:2px 0; text-transform:uppercase;">${state.partnerName}</span>
                <a href="${CONFIG.TARGET_URL}" target="_blank" class="btn-switch">${TEXT.activeButton}</a>`;
            ui.active.classList.remove('wt-hidden');
        } else if (state.isProductPage) {
            ui.banner.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; gap:12px;">
                    <span>${TEXT.bannerWarning}</span>
                    <a href="${CONFIG.TARGET_URL}" target="_blank" class="btn-white">${TEXT.bannerButton}</a>
                </div>`;
            ui.banner.classList.remove('wt-hidden');

            // Trigger modal if purchase popup is active and no partner is found
            if (state.isBuyPopup && state.dismissedUrl !== window.location.href) {
                ui.modal.classList.remove('wt-hidden');
            }
        } else {
            ui.reminder.innerHTML = `
                <div style="font-size:13px; margin-bottom:5px;">${TEXT.reminderHeader}</div>
                <a href="${CONFIG.TARGET_URL}" target="_blank" style="color:${THEME.warning}; font-weight:bold; text-decoration:none; font-size:12px;">${TEXT.reminderLink}</a>`;
            ui.reminder.classList.remove('wt-hidden');
        }
    };

    let timer;
    const updateState = (force) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            state.isBuyPopup = isBuyPopupUrl(params);
            state.isProductPage = window.location.pathname.includes('story.php');
            state.partnerName = getPartner(force || state.isBuyPopup);
            render();
        }, 30);
    };

    initDOM();
    const observer = new MutationObserver((m) => {
        // Trigger update after a change
        updateState(m.some(n => n.addedNodes.length > 0 || n.type === 'attributes'));
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('popstate', () => updateState(true));
    updateState(true);
})();
