// ==UserScript==
// @name         Gaijin Store Partner HUD
// @namespace    https://github.com/SempiternalSloth/WTcc-code-reminder
// @version      1.1
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
    const TARGET_URL = "https://wtpb.net/?category=decal&availability=available&method=discount";
    const CACHE_TTL = 3600000;
    let timer = null;

    const style = document.createElement('style');
    style.innerHTML = `
        .hud-ui { position: fixed; z-index: 99999; font-family: sans-serif; transition: opacity 0.3s; }
        .badge-active { bottom: 20px; right: 20px; background: #2ecc71; color: white; padding: 12px 18px; border-radius: 8px; border-left: 5px solid #1e8449; box-shadow: 0 6px 20px rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; }
        .badge-reminder { bottom: 20px; right: 20px; background: #1a1a1a; color: #eee; padding: 12px 18px; border-radius: 8px; border: 1px solid #333; text-align: center; }
        .banner-critical { top: 0; left: 0; width: 100%; background: #de352c; color: white; padding: 12px 0; text-align: center; font-weight: 900; border-bottom: 4px solid #8b1a14; }
    `;
    document.head.appendChild(style);

    const ui = document.createElement('div');
    ui.className = 'hud-ui';
    document.body.appendChild(ui);

    function getCachedPartner() {
        const cached = JSON.parse(localStorage.getItem('gaijin_partner_data'));
        if (!cached) return null;
        if (Date.now() - cached.timestamp > CACHE_TTL) {
            localStorage.removeItem('gaijin_partner_data');
            return null;
        }
        return cached.name;
    }

    function updateUI() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const isProductPage = window.location.href.includes('story.php');
            const urlParams = new URLSearchParams(window.location.search);
            let partnerName = null;

            const match = document.body.innerText.match(/SUPPORTED\s*\n\s*([^\n\r]+)/i);
            if (match && match[1].trim().length > 1) {
                partnerName = match[1].trim();
                localStorage.setItem('gaijin_partner_data', JSON.stringify({ name: partnerName, timestamp: Date.now() }));
            } else if (urlParams.has('partner')) {
                partnerName = urlParams.get('partner');
                localStorage.setItem('gaijin_partner_data', JSON.stringify({ name: partnerName, timestamp: Date.now() }));
            } else {
                partnerName = getCachedPartner();
            }

            if (partnerName) {
                ui.className = 'hud-ui badge-active';
                ui.innerHTML = `<div style="font-size:9px; font-weight:900; opacity:0.8; text-transform:uppercase;">Supporting</div>
                                <div style="font-weight:800; font-size:16px; margin:2px 0 8px 0; text-transform:uppercase;">${partnerName}</div>
                                <a href="${TARGET_URL}" target="_blank" style="font-size:9px; color:#fff; text-decoration:none; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.3); padding:2px 10px; border-radius:12px; text-transform:uppercase; font-weight:bold;">Switch</a>`;
            } else if (isProductPage) {
                ui.className = 'hud-ui banner-critical';
                ui.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; gap:12px;"><span>⚠️ NO CREATOR CODE DETECTED</span>
                                <a href="${TARGET_URL}" target="_blank" style="background:white; color:#de352c; padding:4px 12px; border-radius:4px; text-decoration:none; font-size:13px; font-weight:bold;">GET A CODE</a></div>`;
            } else {
                ui.className = 'hud-ui badge-reminder';
                ui.innerHTML = `<div style="font-size:13px; margin-bottom:5px;">Active code?</div>
                                <a href="${TARGET_URL}" target="_blank" style="background:#de352c; color:white; text-decoration:none; padding:4px 12px; border-radius:4px; font-weight:bold; font-size:12px;">Choose one</a>`;
            }
        }, 300);
    }

    const observer = new MutationObserver(updateUI);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    updateUI();
})();
