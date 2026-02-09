// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let currentMode = null; 
let activeHoverElement = null; 
let lastInteractionType = 'mouse'; 
let isSaving = false; 
let isLocked = false;
let shortcutCache = []; 

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
    if (colorType === "blue") bgColor = "#007BFF";   
    if (colorType === "purple") bgColor = "#6f42c1"; 
    if (colorType === "orange") bgColor = "#FF9800"; 
    if (colorType === "red")  bgColor = "#DC3545";   
    if (colorType === "green") bgColor = "#28A745";  

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
// 3. UI INJECTION (Robust Alt+Shift+S)
// =======================================================
function toggleSettingsModal() {
    if (!chrome.runtime?.id) {
        announceToScreenReader("Extension context invalid. Refresh page.", "red");
        return;
    }

    const existing = document.getElementById('webkeybind-shadow-root');
    if (existing) { 
        existing.remove();
        announceToScreenReader("Settings window is closed", "red");
        currentMode = null;
        updateHighlight(null);
        return; 
    }

    try {
        const host = document.createElement('div');
        host.id = 'webkeybind-shadow-root';
        host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0;';
        document.body.appendChild(host);

        const shadow = host.attachShadow({mode: 'open'});
        
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); z-index: 2147483646;
            backdrop-filter: blur(2px);
        `;
        backdrop.onclick = () => {
            host.remove();
            announceToScreenReader("Settings window is closed", "red");
        };

        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL("index.html"); 
        iframe.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 900px; height: 650px; max-width: 95vw; max-height: 95vh;
            border: none; border-radius: 12px; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            z-index: 2147483647; background: white;
        `;

        shadow.appendChild(backdrop);
        shadow.appendChild(iframe);
        
        announceToScreenReader("Settings window is opened", "blue");
        
    } catch (err) {
        announceToScreenReader("Error opening settings. Refresh page.", "red");
    }
}

// =======================================================
// 4. CACHE SYSTEM
// =======================================================

function updateShortcutCache() {
    if (!chrome?.storage?.local) return;
    try {
        const currentHost = window.location.hostname;
        chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) return;
            shortcutCache = Object.values(items).filter(s => 
                s.key && (currentHost.includes(s.url) || s.url === "<URL>")
            );
        });
    } catch(e) {}
}

updateShortcutCache();

try {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') updateShortcutCache();
    });
} catch(e) {}

// =======================================================
// 5. LISTENERS
// =======================================================

function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    const tagName = el.tagName.toLowerCase();
    const isEditable = el.getAttribute('contenteditable') === 'true';
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable;
}

document.addEventListener('mouseover', (e) => {
    if (isLocked) return;
    if (currentMode !== 'mouse' && currentMode !== 'creation') return; 
    lastInteractionType = 'mouse';
    const target = getClickableTarget(e.target);
    if (target !== activeHoverElement) updateHighlight(target); 
}, true);

document.addEventListener('focus', (e) => {
    if (currentMode !== 'keyboard' && currentMode !== 'creation') return; 
    lastInteractionType = 'keyboard';
    const target = getClickableTarget(e.target);
    if (target) updateHighlight(target); 
}, true);

// --- MASTER KEY LISTENER ---
window.addEventListener('keydown', (event) => {
    if (event.repeat) return; 
    const key = event.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    if (event.altKey && event.shiftKey) {
        if (key === 'S') { 
            event.preventDefault(); event.stopImmediatePropagation(); 
            toggleSettingsModal(); 
            return;
        }
        if (key === 'M') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('mouse'); return; }
        if (key === 'K') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('keyboard'); return; }
        if (key === 'C') { event.preventDefault(); event.stopImmediatePropagation(); switchMode('creation'); return; }
        if (key === 'A') { event.preventDefault(); event.stopImmediatePropagation(); readAllShortcuts();return; }
    }

    if (isInputActive() && !event.altKey && !event.ctrlKey) return; 

    // SAVE LOGIC
    if (currentMode !== null) {
        if (key.match(/^[A-Z0-9]$/)) {
            if (isInputActive()) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            if (isSaving) return; 

            if (activeHoverElement) {
                saveShortcut(activeHoverElement, key);
            } else {
                announceToScreenReader("No element selected.", "red");
            }
        }
    } else {
        // EXECUTE SHORTCUT
        if (event.altKey || (event.ctrlKey && event.shiftKey)) { 
            const match = shortcutCache.find(s => s.key === key);
            if (match) {
                event.preventDefault(); 
                event.stopImmediatePropagation();
                runCachedShortcut(match);
            }
        }
    }
}, true);

document.addEventListener('click', (e) => {
    if (currentMode !== 'mouse' && currentMode !== 'creation') return;

    const target = getClickableTarget(e.target);
    if (target) {
        e.preventDefault();
        e.stopImmediatePropagation();

        isLocked = true; 
        updateHighlight(target);
        
        target.style.outline = "4px solid #FF9800"; 
        announceToScreenReader("Button selected. Press a key to save shortcut.", "orange");
    }
}, true);

// =======================================================
// 6. HIGHLIGHT ENGINE
// =======================================================

function updateHighlight(newElement) {
    document.querySelectorAll('[data-webkeybind-highlight="true"]').forEach(el => {
        removeHighlight(el);
    });
    activeHoverElement = newElement;
    if (activeHoverElement) {
        addHighlight(activeHoverElement);
    }
}

function addHighlight(el) {
    if (!el) return;
    if (el.dataset.originalOutline === undefined) {
        el.dataset.originalOutline = el.style.outline || "";
    }
    el.style.outline = "4px solid #2196F3"; 
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
// 7. MODE SWITCHING
// =======================================================
function switchMode(newMode) {
    if (!chrome.runtime?.id) { announceToScreenReader("Please refresh the page.", "red"); return; }
    isLocked = false;
    
    if (currentMode === newMode) {
        let modeName = "Teach Mode";
        if (currentMode === 'mouse') modeName = "Mouse Mode";
        if (currentMode === 'keyboard') modeName = "Keyboard Mode";
        if (currentMode === 'creation') modeName = "Creation Mode";

        currentMode = null;
        document.body.removeAttribute('role');
        updateHighlight(null); 
        
        announceToScreenReader(`${modeName} Disabled.`, "red"); 
        document.body.style.cursor = "default";
        return;
    }

    currentMode = newMode;
    document.body.setAttribute('role', 'application'); 

    if (newMode === 'mouse') lastInteractionType = 'mouse';
    if (newMode === 'keyboard') lastInteractionType = 'keyboard';

    if (newMode === 'mouse' && activeHoverElement) updateHighlight(activeHoverElement);
    if (newMode === 'keyboard') {
        const focused = getClickableTarget(document.activeElement);
        updateHighlight(focused); 
    }

    if (newMode === 'mouse') { announceToScreenReader("Mouse Mode Enabled.", "blue"); document.body.style.cursor = "crosshair"; } 
    else if (newMode === 'keyboard') { announceToScreenReader("Keyboard Mode Enabled.", "purple"); document.body.style.cursor = "default"; }
    else if (newMode === 'creation') { announceToScreenReader("Creation Mode Enabled.", "orange"); document.body.style.cursor = "crosshair"; }
}

function getClickableTarget(el) {
    if (!el || el === document.body || el.nodeType !== Node.ELEMENT_NODE) return null;
    if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') return el;
    return el.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), [class*="btn"], [data-testid]');
}

// =======================================================
// 8. SAVE LOGIC (ULTRA STRICT DUPLICATE CHECK)
// =======================================================
function saveShortcut(element, key) {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    const profile = generateRobustProfile(element);
    
    // Normalize Text to avoid whitespace mismatch issues
    const currentName = (profile.aria || profile.text || "Element").trim();
    const currentId = profile.id || "";
    const currentPath = profile.path || "";

    chrome.storage.local.get(null, (items) => {
        const userLang = items.ui_language || "English";

        // 1. Check if ANY shortcut uses this Key on this Host
        const existingKeyUsage = Object.values(items).find(item => 
            item.key === key && 
            (item.url === currentHost || item.url === "<URL>")
        );

        // 2. CONFLICT RESOLUTION
        if (existingKeyUsage) {
            const existingName = (existingKeyUsage.name || "Element").trim();
            const existingId = existingKeyUsage.profile?.id || "";
            const existingPath = existingKeyUsage.profile?.path || "";

            // "Is this the SAME button?" 
            // We require AT LEAST ONE specific identifier to match EXACTLY.
            // A) ID matches (Strongest)
            // B) Path matches (Medium)
            // C) Name matches (Weakest, but needed for visual confirmation)
            
            const isIdMatch = (currentId !== "" && currentId === existingId);
            const isPathMatch = (currentPath === existingPath);
            const isNameMatch = (currentName === existingName);

            // If it looks like a different button, BLOCK IT.
            // Rule: If Names differ -> Block. If Paths differ -> Block.
            if (!isIdMatch && (!isPathMatch || !isNameMatch)) {
                
                // *** HARD BLOCK ***
                isLocked = false;
                const msgs = {
                    "English": `Key '${key}' is already used for '${existingName}'.`,
                    "हिंदी": `कुंजी '${key}' का उपयोग पहले से ही '${existingName}' के लिए किया जा रहा है।`,
                    "मराठी": `कळ '${key}' आधीच '${existingName}' साठी वापरली आहे।`,
                    "മലയാളം": `കീ '${key}' ഇതിനകം '${existingName}' എന്നതിനായി ഉപയോഗിക്കുന്നു.`
                };
                
                announceToScreenReader(msgs[userLang] || msgs["English"], "red");
                element.style.outline = "4px solid #DC3545"; 
                setTimeout(() => { if(currentMode) addHighlight(element); }, 1500);
                
                return; // STOP. Do NOT Overwrite.
            }
        }

        // 3. PROCEED TO SAVE
        isSaving = true;
        let simpleId = profile.id ? `#${profile.id}` : (profile.text || profile.path);

        const idToDelete = Object.keys(items).find(id => items[id].key === key && items[id].url === currentHost);
        if (idToDelete) chrome.storage.local.remove(idToDelete);

        const uniqueId = Date.now().toString();
        const data = { id: uniqueId, url: currentHost, name: currentName, profile: profile, elementId: simpleId, key: key };

        chrome.storage.local.set({ [`shortcut_${uniqueId}`]: data }, () => {
            isSaving = false;
            isLocked = false;
            
            announceToScreenReader(`Saved shortcut Alt ${key}`, "green");
            
            element.style.outline = "4px solid #00E676"; 
            setTimeout(() => {
                if(currentMode) addHighlight(element); 
                else removeHighlight(element);
            }, 1000);
        });
    });
}

// =======================================================
// 9. EXECUTION LOGIC
// =======================================================
function runCachedShortcut(match) {
    let result = { element: null, healed: false };
    
    if (match.profile) result = findElementWithHealing(match.profile);
    else result.element = findElementBySelector(match.elementId);
    
    if (result.element) {
        if(result.element.offsetParent === null) {
            announceToScreenReader("Element is hidden.", "red");
            return;
        }

        executeShortcut(result.element);
        
        if (result.healed) {
            match.profile = generateRobustProfile(result.element);
            match.elementId = match.profile.id ? `#${match.profile.id}` : (match.profile.text || match.profile.path);
            chrome.storage.local.set({ [`shortcut_${match.id}`]: match });
        }
    } else {
        announceToScreenReader("Element not found.", "red");
    }
}

function executeShortcut(element) {
    if (!element) return;
    element.focus();
    element.click(); 
}

function findElementWithHealing(profile) {
    if (!profile) return { element: null, healed: false };
    let candidate = null;
    if (profile.id && document.getElementById(profile.id)) return { element: document.getElementById(profile.id), healed: false };
    if (profile.testId) { candidate = document.querySelector(`[data-testid="${profile.testId}"]`); if(candidate) return { element: candidate, healed: true }; }
    if (profile.aria) { candidate = document.querySelector(`[aria-label="${profile.aria.replace(/"/g, '\\"')}"]`); if(candidate) return { element: candidate, healed: true }; }
    if (profile.text) {
        try {
            const xpath = `//${profile.tag}[contains(text(), '${profile.text.trim()}')]`;
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

// UPDATED CSS PATH GENERATOR (More Unique)
function generateCssPath(el) { 
    if (!(el instanceof Element)) return; 
    const path = []; 
    while (el.nodeType === Node.ELEMENT_NODE) { 
        let selector = el.nodeName.toLowerCase(); 
        if (el.id && !/\d/.test(el.id)) { 
            selector += '#' + CSS.escape(el.id); 
            path.unshift(selector); 
            break; 
        } else { 
            let sib = el, nth = 1; 
            while (sib = sib.previousElementSibling) { 
                if (sib.nodeName.toLowerCase() === selector) nth++; 
            } 
            // Always add nth-of-type to be safe
            selector += `:nth-of-type(${nth})`; 
        } 
        path.unshift(selector); 
        el = el.parentNode; 
    } 
    return path.join(" > "); 
}

// =======================================================
// 10. AUDIO READER
// =======================================================
function readAllShortcuts() {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    chrome.storage.local.get(null, (items) => {
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