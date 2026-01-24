// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let isCreationMode = false;
let activeElement = null;

// CONFIGURATION
const RESERVED_TOGGLE_KEY = "C"; // Alt + Shift + C to toggle

// Safe Audio Feedback
const successSound = new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
function playSound() {
    successSound.currentTime = 0;
    successSound.play().catch(e => console.warn("Audio blocked by browser policy"));
}

// =======================================================
// 2. GLOBAL LISTENERS (Mouse & Keyboard Tracking)
// =======================================================

// A. MOUSE TRACKING
document.addEventListener('mouseover', (e) => {
    if (!isCreationMode) return;
    const target = getClickableTarget(e.target);
    if (target && target !== activeElement) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
    }
}, true);

// B. KEYBOARD TRACKING (Tab Navigation)
document.addEventListener('focus', (e) => {
    if (!isCreationMode) return;
    const target = getClickableTarget(e.target);
    if (target) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
        target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}, true);

// =======================================================
// 3. MASTER KEY LISTENER
// =======================================================
window.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    
    // Ignore modifier keys alone
    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    // --- TOGGLE TEACH MODE (Alt + Shift + C) ---
    if (event.altKey && event.shiftKey && key === RESERVED_TOGGLE_KEY) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleCreationMode();
        return;
    }

    // --- MODE 1: TEACH MODE (Assigning New Shortcuts) ---
    if (isCreationMode) {
        // Allow A-Z and 0-9
        if (key.match(/^[A-Z0-9]$/)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            
            if (activeElement) {
                saveShortcut(activeElement, key);
            } else {
                showNotification("⚠️ Hover over an element first!", "orange");
            }
        }
    } 
    // --- MODE 2: NORMAL MODE (Executing Shortcuts) ---
    else {
        // Trigger on Alt + Key OR Ctrl + Shift + Key
        if (event.altKey || (event.ctrlKey && event.shiftKey)) { 
            loadAndRunShortcut(key);
        }
    }
});

// =======================================================
// 4. TEACH MODE LOGIC (Renamed)
// =======================================================
function toggleCreationMode() {
    isCreationMode = !isCreationMode;

    if (isCreationMode) {
        showNotification("🔵 Creation Mode: ON (Press A-Z to assign)", "blue");
        document.body.style.cursor = "crosshair";
    } else {
        showNotification("⚪ Creation Mode: OFF", "grey");
        document.body.style.cursor = "default";
        if (activeElement) removeHighlight(activeElement);
        activeElement = null;
    }
}

function addHighlight(el) {
    // FIX: Only save the original outline if we haven't already.
    // This prevents overwriting the true original with "Blue" or "Green".
    if (el.dataset.originalOutline === undefined) {
        el.dataset.originalOutline = el.style.outline || "";
    }
    el.style.outline = "4px solid #2196F3"; // Blue
    el.style.outlineOffset = "2px";
}

function removeHighlight(el) {
    // Restore the true original outline
    if (el.dataset.originalOutline !== undefined) {
        el.style.outline = el.dataset.originalOutline;
        delete el.dataset.originalOutline;
    } else {
        el.style.outline = "";
    }
}

function getClickableTarget(el) {
    if (!el) return null;
    return el.closest('button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), [class*="btn"], [class*="button"]');
}

// =======================================================
// 5. SAVING LOGIC (FIXED BORDER REMOVAL)
// =======================================================
function saveShortcut(element, key) {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        alert("⚠️ Extension context invalidated. Please refresh the page.");
        return;
    }

    const selectorDetails = generateSmartSelector(element);
    
    const uniqueId = Date.now().toString();
    const data = {
        id: uniqueId,
        url: window.location.hostname,
        name: selectorDetails.name,
        elementId: selectorDetails.selector,
        key: key
    };

    const storageKey = `shortcut_${uniqueId}`;
    
    try {
        chrome.storage.local.set({ [storageKey]: data }, () => {
            if (chrome.runtime.lastError) return;

            playSound();
            
            // Turn GREEN immediately
            element.style.outline = "4px solid #00E676"; 
            showNotification(`✅ Shortcut 'Alt+${key}' saved!`, "green");

            setTimeout(() => {
                // FIXED LOGIC:
                // 1. If we are still in Teach Mode AND hovering this element -> Go back to BLUE
                if (isCreationMode && activeElement === element) {
                     element.style.outline = "4px solid #2196F3"; 
                } 
                // 2. Otherwise -> Completely REMOVE border (Restore original)
                else {
                    removeHighlight(element);
                }
            }, 1000);
        });
    } catch (e) {
        console.error(e);
        showNotification("❌ Error: Extension disconnected.", "red");
    }
}

function generateSmartSelector(element) {
    let selector = "";
    let name = (element.innerText || "Element").substring(0, 20).trim();

    if (element.id && element.id.length < 30 && !/\d{5}/.test(element.id)) {
        selector = `#${CSS.escape(element.id)}`;
    } else if (element.getAttribute('aria-label')) {
        selector = `[aria-label="${element.getAttribute('aria-label').replace(/"/g, '\\"')}"]`;
        name = element.getAttribute('aria-label');
    } else if (element.getAttribute('data-testid')) {
         selector = `[data-testid="${element.getAttribute('data-testid')}"]`;
    } else if (element.innerText && element.innerText.trim().length > 0 && element.innerText.trim().length < 30) {
        selector = `text:${element.innerText.trim()}`;
    } else {
        selector = generateCssPath(element);
    }
    return { selector, name };
}

// =======================================================
// 6. EXECUTION LOGIC
// =======================================================
function loadAndRunShortcut(pressedKey) {
    if (!chrome?.storage?.local) return;

    chrome.storage.local.get(null, (items) => {
        if (chrome.runtime.lastError) return;

        const currentHost = window.location.hostname;
        const match = Object.values(items).find(s => 
            s.key === pressedKey && (currentHost.includes(s.url) || s.url === "<URL>")
        );

        if (match) {
            executeShortcut(match);
        }
    });
}

function executeShortcut(shortcut) {
    let element = findElementBySelector(shortcut.elementId);

    if (element) {
        const originalBg = element.style.backgroundColor;
        const originalTransition = element.style.transition;
        
        element.style.transition = "all 0.1s";
        element.style.backgroundColor = "rgba(124, 77, 255, 0.5)"; 
        element.focus();
        
        triggerDeepClick(element);

        setTimeout(() => { 
            element.style.backgroundColor = originalBg; 
            element.style.transition = originalTransition;
        }, 300);
    } else {
        showNotification(`❌ Missing: ${shortcut.name}`, "red");
    }
}

function findElementBySelector(selector) {
    if (selector.startsWith('text:')) {
        const text = selector.replace('text:', '');
        const xpath = `//*[text()='${text}' or contains(text(), '${text}')]`;
        try {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) { return null; }
    }
    try { return document.querySelector(selector); } catch { return null; }
}

function triggerDeepClick(element) {
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });
        element.dispatchEvent(event);
    });
}

// =======================================================
// 7. UTILITIES
// =======================================================
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
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}

function showNotification(msg, color = "#333") {
    const div = document.createElement('div');
    div.innerText = msg;
    div.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: ${color === "blue" ? "#2196F3" : color === "green" ? "#00E676" : color === "red" ? "#D32F2F" : "#333"};
        color: white; padding: 12px 24px; border-radius: 8px;
        z-index: 2147483647; font-family: sans-serif; font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}