// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let isTeachMode = false;
let activeElement = null;
const RESERVED_TOGGLE_KEY = "C"; // Alt + Shift + C

// =======================================================
// 2. ACCESSIBILITY (Announcer & Notifications)
// =======================================================
const srAnnouncer = document.createElement('div');
srAnnouncer.id = "webkeybind-announcer";
srAnnouncer.setAttribute('aria-live', 'assertive');
srAnnouncer.setAttribute('aria-atomic', 'true');
srAnnouncer.style.cssText = 'position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);';
document.body.appendChild(srAnnouncer);

function announceToScreenReader(message, color = "default") {
    // 1. Show Visual Notification
    showNotification(message, color);
    
    // 2. Speak to Screen Reader
    srAnnouncer.textContent = '';
    setTimeout(() => { srAnnouncer.textContent = message; }, 50);
}

function showNotification(msg, colorType) {
    const existing = document.getElementById('webkeybind-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'webkeybind-notification';
    div.innerText = msg;
    div.setAttribute('aria-hidden', 'true'); 
    
    // --- COLOR LOGIC ---
    let bgColor = "#333333"; 
    if (colorType === "blue") bgColor = "#007BFF"; // Teach Mode ON
    if (colorType === "red")  bgColor = "#DC3545"; // Teach Mode OFF
    if (colorType === "green") bgColor = "#28A745"; // Saved

    div.style.cssText = `
        position: fixed !important; 
        top: 20px !important; 
        left: 50% !important; 
        transform: translateX(-50%) !important;
        background-color: ${bgColor} !important; 
        color: white !important; 
        padding: 12px 24px !important; 
        border-radius: 8px !important;
        z-index: 2147483647 !important; 
        font-family: sans-serif !important; 
        font-weight: bold !important;
        font-size: 16px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        transition: opacity 0.3s ease-in-out !important;
    `;
    
    document.body.appendChild(div);

    setTimeout(() => {
        if(div) {
            div.style.opacity = "0";
            setTimeout(() => div.remove(), 300);
        }
    }, 4000);
}

// =======================================================
// 3. IMMORTALITY ENGINE
// =======================================================
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

function findElementWithHealing(profile) {
    let candidate = null;
    if (profile.id) {
        candidate = document.getElementById(profile.id);
        if (candidate) return { element: candidate, healed: false };
    }
    if (profile.testId) {
        candidate = document.querySelector(`[data-testid="${profile.testId}"]`);
        if (candidate) return { element: candidate, healed: true };
    }
    if (profile.aria) {
        candidate = document.querySelector(`[aria-label="${profile.aria.replace(/"/g, '\\"')}"]`);
        if (candidate) return { element: candidate, healed: true };
    }
    if (profile.text) {
        const xpath = `//${profile.tag}[contains(text(), '${profile.text}')]`;
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            candidate = result.singleNodeValue;
            if (candidate) return { element: candidate, healed: true };
        } catch(e) {}
    }
    if (profile.path) {
        try {
            candidate = document.querySelector(profile.path);
            if (candidate) return { element: candidate, healed: true };
        } catch(e) {}
    }
    return { element: null, healed: false };
}

// =======================================================
// 4. LISTENERS
// =======================================================
document.addEventListener('mouseover', (e) => {
    if (!isTeachMode) return;
    const target = getClickableTarget(e.target);
    if (target && target !== activeElement) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
    }
}, true);

document.addEventListener('focus', (e) => {
    if (!isTeachMode) return;
    const target = getClickableTarget(e.target);
    if (target) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
    }
}, true);

window.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    if (event.altKey && event.shiftKey && key === RESERVED_TOGGLE_KEY) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleTeachMode();
        return;
    }

    if (isTeachMode) {
        if (key.match(/^[A-Z0-9]$/)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            
            let targetToSave = getClickableTarget(document.activeElement);
            if (!targetToSave) targetToSave = activeElement;

            if (targetToSave) {
                saveShortcut(targetToSave, key);
            } else {
                announceToScreenReader("No element selected. Tab to a button.", "red");
            }
        }
    } else {
        if (event.altKey || (event.ctrlKey && event.shiftKey)) { 
            loadAndRunShortcut(key);
        }
    }
}, true);

// =======================================================
// 5. HELPER FUNCTIONS
// =======================================================
function toggleTeachMode() {
    isTeachMode = !isTeachMode;
    if (isTeachMode) {
        document.body.setAttribute('role', 'application'); 
        announceToScreenReader("Teach Mode ON. Navigation disabled. Select a button and press a Key", "blue");
        document.body.style.cursor = "crosshair";
    } else {
        document.body.removeAttribute('role');
        announceToScreenReader("Teach Mode OFF. Navigation restored.", "red");
        document.body.style.cursor = "default";
        if (activeElement) removeHighlight(activeElement);
        activeElement = null;
    }
}

function getClickableTarget(el) {
    if (!el || el === document.body) return null;
    if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') return el;
    return el.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), [class*="btn"], [data-testid]');
}

function saveShortcut(element, key) {
    if (!chrome?.storage?.local) {
        announceToScreenReader("Error: Reload Page.", "red");
        return;
    }

    const currentHost = window.location.hostname;
    const robustProfile = generateRobustProfile(element);
    let displayName = robustProfile.aria || robustProfile.text || "Element";
    
    // Create a simple ID string for the Popup Window to display
    let simpleIdDisplay = robustProfile.id ? `#${robustProfile.id}` : (robustProfile.text || robustProfile.path);

    chrome.storage.local.get(null, (items) => {
        const existingId = Object.keys(items).find(id => {
            const item = items[id];
            return item.key === key && item.url === currentHost;
        });
        if (existingId) chrome.storage.local.remove(existingId);

        const uniqueId = Date.now().toString();
        const data = {
            id: uniqueId,
            url: currentHost,
            name: displayName,
            profile: robustProfile,
            elementId: simpleIdDisplay, // <--- FIXED: ADDED THIS LINE SO POPUP SHOWS THE ID
            key: key
        };

        const storageKey = `shortcut_${uniqueId}`;
        chrome.storage.local.set({ [storageKey]: data }, () => {
            if (chrome.runtime.lastError) return;
            element.style.outline = "4px solid #00E676"; 
            announceToScreenReader(`Saved shortcut ${key}`, "green");

            setTimeout(() => {
                if (isTeachMode && activeElement === element) element.style.outline = "4px solid #2196F3"; 
                else removeHighlight(element);
            }, 1000);
        });
    });
}

function loadAndRunShortcut(pressedKey) {
    chrome.storage.local.get(null, (items) => {
        const currentHost = window.location.hostname;
        const match = Object.values(items).find(s => s.key === pressedKey && (currentHost.includes(s.url) || s.url === "<URL>"));

        if (match) {
            let result = { element: null, healed: false };
            if (match.profile) result = findElementWithHealing(match.profile);
            else result.element = findElementBySelector(match.elementId); // Backward compatibility
            
            if (result.element) {
                result.element.focus();
                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                    result.element.dispatchEvent(new MouseEvent(eventType, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
                });
                
                if (result.healed) {
                    match.profile = generateRobustProfile(result.element);
                    // Update elementId too so the popup updates
                    match.elementId = match.profile.id ? `#${match.profile.id}` : (match.profile.text || match.profile.path);
                    chrome.storage.local.set({ [`shortcut_${match.id}`]: match });
                }
            } else {
                announceToScreenReader("Element not found.", "red");
            }
        }
    });
}

// Fallback for old saved shortcuts that don't have a profile yet
function findElementBySelector(selector) {
    try { return document.querySelector(selector); } catch { return null; }
}

function addHighlight(el) {
    if (el.dataset.originalOutline === undefined) el.dataset.originalOutline = el.style.outline || "";
    el.style.outline = "4px solid #2196F3";
    el.style.outlineOffset = "2px";
}

function removeHighlight(el) {
    if (el.dataset.originalOutline !== undefined) {
        el.style.outline = el.dataset.originalOutline;
        delete el.dataset.originalOutline;
    } else {
        el.style.outline = "";
    }
}

function generateCssPath(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id && !/\d/.test(el.id)) { selector += '#' + CSS.escape(el.id); path.unshift(selector); break; }
        else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) { if (sib.nodeName.toLowerCase() === selector) nth++; }
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}