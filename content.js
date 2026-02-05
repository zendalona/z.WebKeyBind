// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let currentMode = null; 
let activeHoverElement = null; 
let lastInteractionType = 'mouse'; 
let isSaving = false; 
let isLocked = false;

// =======================================================
// 2. ACCESSIBILITY ENGINE
// =======================================================
const srAnnouncer = document.createElement('div');
srAnnouncer.id = "webkeybind-announcer";
srAnnouncer.setAttribute('aria-live', 'assertive');
srAnnouncer.setAttribute('aria-atomic', 'true');
srAnnouncer.style.cssText = 'position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;';
document.body.appendChild(srAnnouncer);

function announceToScreenReader(message, color = "default") {
    showNotification(message, color);
    const langMap = { "English": "en", "हिंदी": "hi", "मराठी": "mr", "മലയാളം": "ml" };
    const isoCode = langMap[window.currentLang] || "en";
    // 2. Set the language attribute so NVDA switches its accent
    srAnnouncer.setAttribute('lang', isoCode);

    srAnnouncer.textContent = '';
    setTimeout(() => { srAnnouncer.textContent = message; }, 50);
}

function showNotification(msg, colorType) {
    if (colorType === "modal") return; 

    const existing = document.getElementById('webkeybind-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'webkeybind-notification';
    div.innerText = msg;
    div.setAttribute('aria-hidden', 'true'); 
    
    let bgColor = "#333333"; 
    if (colorType === "blue") bgColor = "#007BFF";   // Mouse Mode
    if (colorType === "purple") bgColor = "#6f42c1"; // Keyboard Mode
    if (colorType === "orange") bgColor = "#FF9800"; // Creation Mode
    if (colorType === "red")  bgColor = "#DC3545";   // OFF
    if (colorType === "green") bgColor = "#28A745";  // Saved

    div.style.cssText = `
        position: fixed !important; top: 20px !important; left: 50% !important; 
        transform: translateX(-50%) !important; background-color: ${bgColor} !important; 
        color: white !important; padding: 12px 24px !important; border-radius: 8px !important;
        z-index: 2147483647 !important; font-family: sans-serif !important; 
        font-weight: bold !important; font-size: 16px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; transition: opacity 0.3s ease-in-out !important; pointer-events: none;
    `;
    
    document.body.appendChild(div);
    setTimeout(() => { 
        if(div && div.parentNode) { 
            div.style.opacity = "0"; 
            setTimeout(() => { if(div.parentNode) div.remove(); }, 300); 
        } 
    }, 4000);
}

// =======================================================
// 3. LISTENERS
// =======================================================

function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    const tagName = el.tagName.toLowerCase();
    const isEditable = el.getAttribute('contenteditable') === 'true';
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable;
}

// A. MOUSE LISTENER
document.addEventListener('mouseover', (e) => {
    // Only active in 'mouse' or 'creation' modes
    if (isLocked) return;
    if (currentMode !== 'mouse' && currentMode !== 'creation') return; 
    
    lastInteractionType = 'mouse';
    const target = getClickableTarget(e.target);
    
    // Always run update to ensure cleanup happens
    if (target !== activeHoverElement) {
        updateHighlight(target); 
    }
}, true);

// B. FOCUS LISTENER
document.addEventListener('focus', (e) => {
    // Only active in 'keyboard' or 'creation' modes
    if (currentMode !== 'keyboard' && currentMode !== 'creation') return; 

    lastInteractionType = 'keyboard';
    const target = getClickableTarget(e.target);
    
    if (target) {
        updateHighlight(target); 
    }
}, true);

// C. MASTER KEY LISTENER
window.addEventListener('keydown', (event) => {
    if (event.repeat) return; // Anti-Repeat Protection
    const key = event.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    // GLOBAL SHORTCUTS
    if (event.altKey && event.shiftKey) {
        if (key === 'S') { event.preventDefault(); event.stopImmediatePropagation(); return;}
        if (key === 'M') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('mouse'); return; }
        if (key === 'K') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('keyboard'); return; }
        if (key === 'C') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('creation'); return; }
        if (key === 'A') { event.preventDefault(); event.stopImmediatePropagation(); readAllShortcuts();return; }
    }

    if (isInputActive()) return;

    // SAVE LOGIC
    if (currentMode !== null) {
        if (key.match(/^[A-Z0-9]$/)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isSaving) return; 

            // Use the currently highlighted element
            if (activeHoverElement) {
                saveShortcut(activeHoverElement, key);
            } else {
                announceToScreenReader("No element selected.", "red");
            }
        }
    } else {
        // Execute Shortcut
        if (event.altKey || (event.ctrlKey && event.shiftKey)) { 
            loadAndRunShortcut(key);
        }
    }
}, true);
document.addEventListener('click', (e) => {
    if (currentMode !== 'mouse' && currentMode !== 'creation') return;

    const target = getClickableTarget(e.target);
    if (target) {
        e.preventDefault();
        e.stopImmediatePropagation();

        isLocked = true; // Lock the focus
        updateHighlight(target);
        
        // Visual feedback: Orange outline for "Locked/Selected"
        target.style.outline = "4px solid #FF9800"; 
        announceToScreenReader("Button selected. Press a key to save shortcut.", "orange");
    }
}, true);
// =======================================================
// 4. HIGHLIGHT ENGINE
// =======================================================

function updateHighlight(newElement) {
    // NUCLEAR OPTION: Find ANY element with our highlight attribute and strip it.
    document.querySelectorAll('[data-webkeybind-highlight="true"]').forEach(el => {
        removeHighlight(el);
    });

    // Update state
    activeHoverElement = newElement;
    
    // Apply new highlight
    if (activeHoverElement) {
        addHighlight(activeHoverElement);
    }
}

function addHighlight(el) {
    if (!el) return;
    if (el.dataset.originalOutline === undefined) {
        el.dataset.originalOutline = el.style.outline || "";
    }
    el.style.outline = "4px solid #2196F3"; // Blue
    el.style.outlineOffset = "2px";
    el.setAttribute('data-webkeybind-highlight', 'true');
}

function removeHighlight(el) {
    if (!el) return;
    if (el.dataset.originalOutline !== undefined) {
        el.style.outline = el.dataset.originalOutline;
    } else {
        el.style.outline = "";
    }
    el.removeAttribute('data-webkeybind-highlight');
}

// =======================================================
// 5. MODE SWITCHING (FIXED NAMES)
// =======================================================
function switchMode(newMode) {
    isLocked = false;
    // 1. Turning OFF?
    if (currentMode === newMode) {
        let modeName = "Teach Mode";
        if (currentMode === 'mouse') modeName = "Mouse Mode";
        if (currentMode === 'keyboard') modeName = "Keyboard Mode";
        if (currentMode === 'creation') modeName = "Creation Mode";

        currentMode = null;
        document.body.removeAttribute('role');
        updateHighlight(null); // Clean everything
        
        announceToScreenReader(`${modeName} OFF.`, "red"); // <--- FIXED: Dynamic Name
        document.body.style.cursor = "default";
        return;
    }

    // 2. Turning ON
    currentMode = newMode;
    document.body.setAttribute('role', 'application'); 

    if (newMode === 'mouse') lastInteractionType = 'mouse';
    if (newMode === 'keyboard') lastInteractionType = 'keyboard';

    if (newMode === 'mouse' && activeHoverElement) updateHighlight(activeHoverElement);
    if (newMode === 'keyboard') {
        const focused = getClickableTarget(document.activeElement);
        updateHighlight(focused); 
    }

    if (newMode === 'mouse') { announceToScreenReader("Mouse Mode ON.", "blue"); document.body.style.cursor = "crosshair"; } 
    else if (newMode === 'keyboard') { announceToScreenReader("Keyboard Mode ON.", "purple"); document.body.style.cursor = "default"; }
    else if (newMode === 'creation') { announceToScreenReader("Creation Mode ON.", "orange"); document.body.style.cursor = "crosshair"; }
}

function getClickableTarget(el) {
    if (!el || el === document.body || el.nodeType !== Node.ELEMENT_NODE) return null;
    if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') return el;
    return el.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), [class*="btn"], [data-testid]');
}

function saveShortcut(element, key) {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    const profile = generateRobustProfile(element);
    
    // 1. Define a name for the element globally within this function scope
    const currentElementName = profile.aria || profile.text || "Element";

    chrome.storage.local.get(null, (items) => {
        const userLang = items.ui_language || "English";

        // Conflict Check
        const conflict = Object.values(items).find(item => 
            item.key === key && 
            item.url === currentHost && 
            item.profile?.path !== profile.path
        );

        if (conflict) {
            isLocked = false;
            const existingBtnName = conflict.name || "another button";
            
            const msgs = {
                "English": `Please use another Key. This key '${key}' is already used for '${existingBtnName}'.`,
                "हिंदी": `कृपया दूसरी कुंजी का उपयोग करें। यह कुंजी '${key}' पहले से ही '${existingBtnName}' के लिए उपयोग की गई है।`,
                "मराठी": `कृपया दुसरी कळ वापरा. ही कळ '${key}' आधीच '${existingBtnName}' साठी वापरली गेली आहे।`,
                "മലയാളം": `ദയവായി മറ്റൊരു കീ ഉപയോഗിക്കുക. ഈ കീ '${key}' ഇതിനകം '${existingBtnName}' എന്നതിനായി ഉപയോഗിച്ചു.`
            };

            announceToScreenReader(msgs[userLang] || msgs["English"], "red");
            element.style.outline = "4px solid #DC3545"; 
            setTimeout(() => { if(currentMode) addHighlight(element); }, 1000);
            return; 
        }

        // 2. SAVE LOGIC
        isSaving = true;
        let simpleId = profile.id ? `#${profile.id}` : (profile.text || profile.path);

        const existingId = Object.keys(items).find(id => items[id].key === key && items[id].url === currentHost);
        if (existingId) chrome.storage.local.remove(existingId);

        const uniqueId = Date.now().toString();
        // Use currentElementName here
        const data = { id: uniqueId, url: currentHost, name: currentElementName, profile: profile, elementId: simpleId, key: key };

        chrome.storage.local.set({ [`shortcut_${uniqueId}`]: data }, () => {
            isSaving = false;
            isLocked = false;
            
            // Fixed the variable name here to currentElementName
            announceToScreenReader(`Saved shortcut for ${currentElementName} is Alt + ${key}`, "green");
            
            element.style.outline = "4px solid #00E676"; 
            setTimeout(() => {
                if(currentMode) addHighlight(element); 
                else removeHighlight(element);
            }, 1000);
        });
    });
}


function loadAndRunShortcut(pressedKey) {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get(null, (items) => {
        const currentHost = window.location.hostname;
        const match = Object.values(items).find(s => s.key === pressedKey && (currentHost.includes(s.url) || s.url === "<URL>"));
        if (match) {
            let result = { element: null, healed: false };
            if (match.profile) result = findElementWithHealing(match.profile);
            else result.element = findElementBySelector(match.elementId);
            
            if (result.element) {
                executeShortcut(result.element);
                if (result.healed) {
                    match.profile = generateRobustProfile(result.element);
                    match.elementId = match.profile.id ? `#${match.profile.id}` : (match.profile.text || match.profile.path);
                    chrome.storage.local.set({ [`shortcut_${match.id}`]: match });
                }
            } else announceToScreenReader("Element not found.", "red");
        }
    });
}

function executeShortcut(element) {
    if (!element) return;
    element.focus();
    const opts = { view: window, bubbles: true, cancelable: true, buttons: 1, composed: true };
    try {
        element.dispatchEvent(new PointerEvent('pointerdown', opts));
        element.dispatchEvent(new MouseEvent('mousedown', opts));
        element.dispatchEvent(new PointerEvent('pointerup', opts));
        element.dispatchEvent(new MouseEvent('mouseup', opts));
        element.dispatchEvent(new MouseEvent('click', opts));
        if (typeof element.click === 'function') element.click();
    } catch(e) {}
}

function findElementWithHealing(profile) {
    if (!profile) return { element: null, healed: false };
    let candidate = null;
    if (profile.id && document.getElementById(profile.id)) return { element: document.getElementById(profile.id), healed: false };
    if (profile.testId) { candidate = document.querySelector(`[data-testid="${profile.testId}"]`); if(candidate) return { element: candidate, healed: true }; }
    if (profile.aria) { candidate = document.querySelector(`[aria-label="${profile.aria.replace(/"/g, '\\"')}"]`); if(candidate) return { element: candidate, healed: true }; }
    if (profile.text) {
        try {
            const xpath = `//${profile.tag}[contains(text(), '${profile.text}')]`;
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if(result.singleNodeValue) return { element: result.singleNodeValue, healed: true };
        } catch(e) {}
    }
    if (profile.path) { try { if(document.querySelector(profile.path)) return { element: document.querySelector(profile.path), healed: true }; } catch(e){} }
    return { element: null, healed: false };
}
function generateRobustProfile(element) {
    if (!element) return null;
    return {
        id: element.id || null,
        tag: element.tagName.toLowerCase(),
        text: element.innerText ? element.innerText.trim().substring(0, 50) : null,
        aria: element.getAttribute('aria-label') || null,
        testId: element.getAttribute('data-testid') || null,
        path: generateCssPath(element)
    };
}
function findElementBySelector(selector) { try { return document.querySelector(selector); } catch { return null; } }
function generateCssPath(el) { if (!(el instanceof Element)) return; const path = []; while (el.nodeType === Node.ELEMENT_NODE) { let selector = el.nodeName.toLowerCase(); if (el.id && !/\d/.test(el.id)) { selector += '#' + CSS.escape(el.id); path.unshift(selector); break; } else { let sib = el, nth = 1; while (sib = sib.previousElementSibling) { if (sib.nodeName.toLowerCase() === selector) nth++; } if (nth !== 1) selector += `:nth-of-type(${nth})`; } path.unshift(selector); el = el.parentNode; } return path.join(" > "); }

// =======================================================
// 7. AUDIO READER (Alt + Shift + A Logic)
// =======================================================
function readAllShortcuts() {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    chrome.storage.local.get(null, (items) => {
        // Filter shortcuts for THIS specific website
        const siteShortcuts = Object.values(items).filter(s =>
            s.key && (currentHost.includes(s.url) || s.url === "<URL>")
        );
        if (siteShortcuts.length === 0) {
            announceToScreenReader("No shortcuts saved for this page.");
        } else {
            const spokenText = siteShortcuts
                .map(s => `Alt ${s.key} is for ${s.name}`)
                .join(". ");
 
            announceToScreenReader(`Found ${siteShortcuts.length} shortcuts. ${spokenText}`);
        }
    });
}
 
let isExtensionWindowOpen = false;
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "z-webkeybind-popup") {
        isExtensionWindowOpen = true;
        announceToScreenReader("setting window for z.WebkeyBind is open", "blue");
        port.onDisconnect.addListener(() => {
            isExtensionWindowOpen = false;
            announceToScreenReader("setting window for z.WebkeyBind is closed", "red");
            currentMode = null;
            updateHighlight(null);
            document.body.style.cursor = "default";
        });
    }
});
