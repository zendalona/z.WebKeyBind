// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let currentMode = null; 
let activeHoverElement = null; 
let lastInteractionType = 'mouse'; 
let isSaving = false; 
let shortcutCache = []; 

// =======================================================
// 2. ACCESSIBILITY ENGINE (DUAL-TOGGLE FIX)
// =======================================================
const srAnnouncer1 = document.createElement('div');
const srAnnouncer2 = document.createElement('div');
const commonStyles = 'position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;';

srAnnouncer1.id = "wkb-announcer-1";
srAnnouncer1.setAttribute('aria-live', 'assertive');
srAnnouncer1.setAttribute('aria-atomic', 'true');
srAnnouncer1.style.cssText = commonStyles;

srAnnouncer2.id = "wkb-announcer-2";
srAnnouncer2.setAttribute('aria-live', 'assertive');
srAnnouncer2.setAttribute('aria-atomic', 'true');
srAnnouncer2.style.cssText = commonStyles;

if (document.body) {
    document.body.appendChild(srAnnouncer1);
    document.body.appendChild(srAnnouncer2);
}

let announcerToggle = true;

function announceToScreenReader(message, color = "default") {
    if (color !== "hidden") {
        showNotification(message, color);
    }

    const langMap = { "English": "en", "हिंदी": "hi", "मराठी": "mr", "മലയാളം": "ml" };
    const isoCode = langMap[window.currentLang] || "en";
    
    srAnnouncer1.setAttribute('lang', isoCode);
    srAnnouncer2.setAttribute('lang', isoCode);

    if (announcerToggle) {
        srAnnouncer2.textContent = ''; 
        srAnnouncer1.textContent = message; 
    } else {
        srAnnouncer1.textContent = ''; 
        srAnnouncer2.textContent = message; 
    }
    announcerToggle = !announcerToggle;
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
    if (colorType === "info") bgColor = "#17a2b8"; 

    div.style.cssText = `
        position: fixed !important; top: 20px !important; left: 50% !important; 
        transform: translateX(-50%) !important; background-color: ${bgColor} !important; 
        color: white !important; padding: 12px 24px !important; border-radius: 8px !important;
        z-index: 2147483647 !important; font-family: sans-serif !important; 
        font-weight: bold !important; font-size: 16px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; transition: opacity 0.3s ease-in-out !important; pointer-events: none;
    `;
    
    if (!document.body) return;
    document.body.appendChild(div);
    setTimeout(() => { 
        if(div && div.parentNode) { 
            div.style.opacity = "0"; 
            setTimeout(() => { if(div.parentNode) div.remove(); }, 300); 
        } 
    }, 4000);
}

// =======================================================
// 3. CACHE SYSTEM
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
// 4. LISTENERS
// =======================================================
function isInputActive() {
    const el = document.activeElement;
    if (!el) return false;
    const tagName = el.tagName.toLowerCase();
    const isEditable = el.getAttribute('contenteditable') === 'true';
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable;
}

document.addEventListener('mouseover', (e) => {
    if (currentMode !== 'creation') return; 
    lastInteractionType = 'mouse';
    const target = getClickableTarget(e.target);
    if (target !== activeHoverElement) {
        updateHighlight(target); 
        target.focus(); // Pull focus so SR recognizes the target
    }
}, true);

document.addEventListener('focus', (e) => {
    if (currentMode !== 'creation') return; 
    lastInteractionType = 'keyboard';
    const target = getClickableTarget(e.target);
    if (target) updateHighlight(target); 
}, true);

document.addEventListener('click', (e) => {
    // Prevent accidental clicks on links when in creation mode
    if (currentMode === 'creation') {
        const target = getClickableTarget(e.target);
        if (target) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }
}, true);

// --- MASTER KEY LISTENER ---
window.addEventListener('keydown', (event) => {
    if (event.repeat) return; 
    const key = event.key.toUpperCase();

    if (event.key === 'Escape' || event.keyCode === 27) {
        if (currentMode !== null) {
            event.preventDefault();
            event.stopPropagation();
            switchMode(currentMode); 
            return;
        }
    }

    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    if (event.altKey && event.shiftKey) {
        if (key === 'A') { 
            event.preventDefault(); 
            event.stopImmediatePropagation(); 
            readAllShortcuts();
            return; 
        }
        if (key === 'C') { 
            event.preventDefault(); 
            event.stopImmediatePropagation(); 
            switchMode('creation'); 
            return; 
        }
    }

    if (isInputActive() && !event.altKey && !event.ctrlKey) return; 

    // === SAVE LOGIC ===
    if (currentMode === 'creation') {
        if (key.match(/^[A-Z0-9]$/)) {
            if (isInputActive()) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            if (isSaving) return; 

            // Save the key instantly to whatever is highlighted
            if (activeHoverElement) {
                saveShortcut(activeHoverElement, key);
            } else {
                announceToScreenReader("No element selected.", "red");
            }
        }
    } else {
        // === EXECUTE LOGIC ===
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

// =======================================================
// 5. HIGHLIGHT ENGINE & ACCESSIBILITY BYPASS
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

    // === FIX: Forces Screen Reader to pass keys through ONLY for this element ===
    if (currentMode === 'creation') {
        if (el.dataset.originalRole === undefined) {
            el.dataset.originalRole = el.getAttribute('role') || "null";
        }
        el.setAttribute('role', 'application'); 
    }
}

function removeHighlight(el) {
    if (!el) return;
    if (el.dataset.originalOutline !== undefined) {
        el.style.outline = el.dataset.originalOutline;
    } else {
        el.style.outline = "";
    }
    
    // Restore the element's original role so the site behaves normally again
    if (el.dataset.originalRole !== undefined) {
        if (el.dataset.originalRole === "null") {
            el.removeAttribute('role');
        } else {
            el.setAttribute('role', el.dataset.originalRole);
        }
        delete el.dataset.originalRole;
    }

    el.removeAttribute('data-webkeybind-highlight');
}

// =======================================================
// 6. MODE SWITCHING
// =======================================================
function switchMode(newMode) {
    if (!chrome.runtime?.id) { announceToScreenReader("Please refresh the page.", "red"); return; }
    
    if (currentMode === newMode) {
        currentMode = null;
        updateHighlight(null); 
        
        announceToScreenReader("Creation Mode Disabled", "red"); 
        document.body.style.cursor = "default";
        return;
    }

    currentMode = newMode;

    if (newMode === 'mouse' || newMode === 'creation') lastInteractionType = 'mouse';
    if (newMode === 'keyboard') lastInteractionType = 'keyboard';

    if (newMode === 'creation' && activeHoverElement) updateHighlight(activeHoverElement);

    if (newMode === 'creation') { 
        announceToScreenReader("Creation Mode Enabled", "orange"); 
        document.body.style.cursor = "crosshair"; 
    }
}

function getClickableTarget(el) {
    if (!el || el === document.body || el.nodeType !== Node.ELEMENT_NODE) return null;
    if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') return el;
    return el.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), [class*="btn"], [data-testid], [aria-label]');
}

// =======================================================
// 7. SAVE LOGIC
// =======================================================
function saveShortcut(element, key) {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    const profile = generateRobustProfile(element);
    
    const currentName = (profile.aria || profile.text || profile.tag || "Element").trim();
    const currentId = profile.id || "";
    const currentPath = profile.path || "";

    let simpleId = profile.path; 
    if (profile.id) {
        simpleId = `#${CSS.escape(profile.id)}`;
    } else if (profile.testId) {
        simpleId = `[data-testid="${CSS.escape(profile.testId)}"]`;
    } else if (element.className && typeof element.className === 'string' && element.className.trim()) {
        const safeClasses = element.className.trim().split(/\s+/).map(c => CSS.escape(c)).join('.');
        simpleId = `${profile.tag}.${safeClasses}`;
    }

    chrome.storage.local.get(null, (items) => {
        const userLang = items.ui_language || "English";
        const t = window.translations?.[userLang] || window.translations?.['English'] || {};
        const keyAlreadyUsedStr = t.key_already_used || "Key '{key}' is already used by '{name}'.";
        
        const allItems = Object.values(items);

        const keyConflict = allItems.find(item => 
            item.key === key && 
            (item.url === currentHost || item.url === "<URL>")
        );

        if (keyConflict) {
            const isSameButtonId = currentId !== "" && currentId === (keyConflict.profile?.id || "");
            const isSameButtonPath = currentPath === (keyConflict.profile?.path || "");
            if (!isSameButtonId && !isSameButtonPath) {
                const existingName = keyConflict.name || "another element";
                const msg = keyAlreadyUsedStr.replace("{key}", key).replace("{name}", existingName);
                
                announceToScreenReader(msg, "red");
                element.style.outline = "4px solid #DC3545"; 
                setTimeout(() => { if(currentMode) addHighlight(element); }, 1500);
                return;
            }
        }

        isSaving = true;
        if (keyConflict) {
             chrome.storage.local.remove(`shortcut_${keyConflict.id}`);
        }
        const uniqueId = Date.now().toString();
        const data = { id: uniqueId, url: currentHost, name: currentName, profile: profile, elementId: simpleId, key: key };

        chrome.storage.local.set({ [`shortcut_${uniqueId}`]: data }, () => {
            isSaving = false;
            announceToScreenReader(`Saved shortcut Alt ${key}`, "green");
            element.style.outline = "4px solid #00E676";
            
            setTimeout(() => {
                if(currentMode) {
                    // STAYS ACTIVE! Restore blue highlight so user can bind the next key instantly
                    addHighlight(element); 
                } else {
                    removeHighlight(element);
                }
            }, 1000);
        });
    });
}

// =======================================================
// 8. EXECUTION LOGIC
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

        announceToScreenReader(`Executing shortcut: ${match.name || "Action"}`, "blue");

        executeShortcut(result.element);
        
        if (result.healed) {
            match.profile = generateRobustProfile(result.element);
            
            let safeRebuild = match.profile.path;
            if (match.profile.id) safeRebuild = `#${CSS.escape(match.profile.id)}`;
            else if (result.element.className && typeof result.element.className === 'string' && result.element.className.trim()) {
                const c = result.element.className.trim().split(/\s+/).map(i => CSS.escape(i)).join('.');
                safeRebuild = `${match.profile.tag}.${c}`;
            }

            match.elementId = safeRebuild;
            chrome.storage.local.set({ [`shortcut_${match.id}`]: match });
        }
    } else {
        announceToScreenReader("Element not found on page.", "red");
    }
}

function executeShortcut(element) {
    if (!element) return;
    element.focus();
    element.click(); 
}

function findElementWithHealing(profile) {
    if (!profile) return { element: null, healed: false };
    if (profile.id && document.getElementById(profile.id)) {
        return { element: document.getElementById(profile.id), healed: false };
    }
    if (profile.href) {
        try {
            const link = document.querySelector(`a[href="${profile.href.replace(/"/g, '\\"')}"]`);
            if (link) return { element: link, healed: true }; 
        } catch(e) {}
    }
    if (profile.testId) { 
        const e = document.querySelector(`[data-testid="${profile.testId}"]`); 
        if(e) return { element: e, healed: true }; 
    }
    if (profile.path) { 
        try { 
            const e = document.querySelector(profile.path); 
            if(e) return { element: e, healed: true }; 
        } catch(e){} 
    }
    if (profile.aria) { 
        const e = document.querySelector(`[aria-label="${profile.aria.replace(/"/g, '\\"')}"]`); 
        if(e) return { element: e, healed: true }; 
    }

    return { element: null, healed: false };
}

// HELPER UTILITIES
function generateRobustProfile(element) {
    if (!element) return null;
    let safeId = null;
    if (element.id) {
        const escapedId = CSS.escape(element.id);
        const count = document.querySelectorAll(`#${escapedId}`).length;
        if (count === 1) {
            safeId = element.id; 
        }
    }

    let href = element.getAttribute('href') || null;
    if (!href && element.closest('a')) {
        href = element.closest('a').getAttribute('href');
    }

    return {
        id: safeId,
        tag: element.tagName.toLowerCase(),
        text: element.innerText ? element.innerText.trim().substring(0, 50) : null,
        aria: element.getAttribute('aria-label') || null,
        testId: element.getAttribute('data-testid') || null,
        href: href,
        path: generateCssPath(element)
    };
}

function findElementBySelector(selector) { try { return document.querySelector(selector); } catch { return null; } }

// CSS PATH GENERATOR
function generateCssPath(el) { 
    if (!(el instanceof Element)) return; 
    const path = []; 
    while (el.nodeType === Node.ELEMENT_NODE) { 
        let selector = el.nodeName.toLowerCase(); 

        let isUnique = false;
        if (el.id) {
            const escaped = CSS.escape(el.id);
            if (document.querySelectorAll(`#${escaped}`).length === 1) {
                isUnique = true;
            }
        }

        if (isUnique) { 
            selector += '#' + CSS.escape(el.id); 
            path.unshift(selector); 
            break; 
        }else { 
            let sib = el, nth = 1; 
            while (sib = sib.previousElementSibling) { 
                if (sib.nodeName.toLowerCase() === selector) nth++; 
            } 
            selector += `:nth-of-type(${nth})`; 
        } 

        path.unshift(selector); 
        el = el.parentNode; 
    } 
    return path.join(" > "); 
}

// =======================================================
// 9. ARIA-ONLY SHORTCUT ANNOUNCER
// =======================================================
function readAllShortcuts() {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    
    chrome.storage.local.get(null, (items) => {
        const siteShortcuts = Object.values(items).filter(s =>
            s.key && (currentHost.includes(s.url) || s.url === "<URL>")
        );

        if (siteShortcuts.length === 0) {
            announceToScreenReader("No shortcuts are assigned for this webpage.", "red");
        } else {
            const spokenText = siteShortcuts
                .map(s => `Alt ${s.key} is for ${s.name}`)
                .join(". ");
            announceToScreenReader(`Found ${siteShortcuts.length} shortcuts. ${spokenText}`, "blue");
        }
    });
}