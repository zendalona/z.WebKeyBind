// =======================================================
// 1. STATE & VARIABLES
// =======================================================
let isTeachMode = false;
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
// 2. IMMORTALITY ENGINE (The "Brain")
// =======================================================
function generateRobustProfile(element) {
    return {
        id: element.id || null,
        tag: element.tagName.toLowerCase(),
        text: element.innerText ? element.innerText.trim().substring(0, 50) : null,
        aria: element.getAttribute('aria-label') || null,
        title: element.getAttribute('title') || null,
        testId: element.getAttribute('data-testid') || null, // Crucial for ChatGPT
        placeholder: element.getAttribute('placeholder') || null,
        classes: element.className && typeof element.className === 'string' 
                 ? element.className.split(' ').filter(c => c.length > 4) // Filter short utility classes
                 : [],
        path: generateCssPath(element)
    };
}

function findElementWithHealing(profile) {
    let candidate = null;
    let healed = false;

    // STRATEGY 1: Exact ID
    if (profile.id) {
        candidate = document.getElementById(profile.id);
        if (candidate) return { element: candidate, healed: false };
    }

    // STRATEGY 2: Test ID (ChatGPT uses this heavily, e.g. "send-button")
    if (profile.testId) {
        candidate = document.querySelector(`[data-testid="${profile.testId}"]`);
        if (candidate) return { element: candidate, healed: true };
    }

    // STRATEGY 3: Aria Label
    if (profile.aria) {
        candidate = document.querySelector(`[aria-label="${profile.aria.replace(/"/g, '\\"')}"]`);
        if (candidate) return { element: candidate, healed: true };
    }

    // STRATEGY 4: Text Match
    if (profile.text) {
        const xpath = `//${profile.tag}[contains(text(), '${profile.text}')]`;
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            candidate = result.singleNodeValue;
            if (candidate) return { element: candidate, healed: true };
        } catch(e) {}
    }

    // STRATEGY 5: Placeholder (Good for Inputs)
    if (profile.placeholder) {
        candidate = document.querySelector(`[placeholder="${profile.placeholder}"]`);
        if (candidate) return { element: candidate, healed: true };
    }

    // STRATEGY 6: CSS Path Fallback
    if (profile.path) {
        try {
            candidate = document.querySelector(profile.path);
            if (candidate) return { element: candidate, healed: true };
        } catch(e) {}
    }

    return { element: null, healed: false };
}

// =======================================================
// 3. GLOBAL LISTENERS
// =======================================================

// A. MOUSE TRACKING
document.addEventListener('mouseover', (e) => {
    if (!isTeachMode) return;
    const target = getClickableTarget(e.target);
    if (target && target !== activeElement) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
    }
}, true);

// B. KEYBOARD TRACKING (Tab)
document.addEventListener('focus', (e) => {
    if (!isTeachMode) return;
    const target = getClickableTarget(e.target);
    if (target) {
        if (activeElement) removeHighlight(activeElement);
        activeElement = target;
        addHighlight(activeElement);
        target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}, true);

// =======================================================
// 4. MASTER KEY LISTENER
// =======================================================
window.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    
    if (['CONTROL', 'SHIFT', 'ALT', 'TAB', 'CAPSLOCK'].includes(key)) return;

    // --- TOGGLE TEACH MODE ---
    if (event.altKey && event.shiftKey && key === RESERVED_TOGGLE_KEY) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleTeachMode();
        return;
    }

    // --- MODE 1: TEACH MODE (Assigning) ---
    if (isTeachMode) {
        if (key.match(/^[A-Z0-9]$/)) {
            // CRITICAL for ChatGPT: Stop the site from seeing this key press
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            if (activeElement) {
                saveShortcut(activeElement, key);
            } else {
                showNotification("⚠️ Hover over an element first!", "orange");
            }
        }
    } 
    // --- MODE 2: NORMAL MODE (Executing) ---
    else {
        if (event.altKey || (event.ctrlKey && event.shiftKey)) { 
            // Prevent ChatGPT from capturing the shortcut
            // event.preventDefault(); // Optional: Uncomment if ChatGPT blocks execution
            loadAndRunShortcut(key);
        }
    }
}, true); // Use Capture Phase (true) to intercept before ChatGPT does

// =======================================================
// 5. TEACH MODE UI LOGIC
// =======================================================
function toggleTeachMode() {
    isTeachMode = !isTeachMode;

    if (isTeachMode) {
        showNotification("🔵 Teach Mode: ON (Press A-Z to assign)", "blue");
        document.body.style.cursor = "crosshair";
    } else {
        showNotification("⚪ Teach Mode: OFF", "grey");
        document.body.style.cursor = "default";
        if (activeElement) removeHighlight(activeElement);
        activeElement = null;
    }
}

function addHighlight(el) {
    if (el.dataset.originalOutline === undefined) {
        el.dataset.originalOutline = el.style.outline || "";
    }
    el.style.outline = "4px solid #2196F3"; // Blue
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

// *** UPDATED SELECTOR LOGIC FOR CHATGPT ***
function getClickableTarget(el) {
    if (!el) return null;
    
    // 1. Check if the element itself is a text input (ChatGPT Input)
    if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') {
        return el;
    }

    // 2. Climb up to find the clickable parent
    return el.closest(`
        button, 
        a, 
        input, 
        select, 
        textarea, 
        [role="button"], 
        [tabindex]:not([tabindex="-1"]), 
        [class*="btn"], 
        [class*="button"],
        [data-testid],
        [contenteditable="true"]
    `);
}

// =======================================================
// 6. SAVING LOGIC
// =======================================================
function saveShortcut(element, key) {
    if (!chrome?.storage?.local) return;
    const currentHost = window.location.hostname;
    const robustProfile = generateRobustProfile(element);
    
    // Display Name
    const displayName = robustProfile.text || robustProfile.aria || robustProfile.placeholder || "Element";

    chrome.storage.local.get(null, (items) => {
        // Overwrite check
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
            key: key
        };

        const storageKey = `shortcut_${uniqueId}`;
        chrome.storage.local.set({ [storageKey]: data }, () => {
            if (chrome.runtime.lastError) return;
            playSound();
            element.style.outline = "4px solid #00E676"; // Green
            showNotification(`✅ Shortcut 'Alt+${key}' saved!`, "green");

            setTimeout(() => {
                if (isTeachMode && activeElement === element) {
                     element.style.outline = "4px solid #2196F3"; 
                } else {
                    removeHighlight(element);
                }
            }, 1000);
        });
    });
}

// =======================================================
// 7. EXECUTION LOGIC
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
            let result = { element: null, healed: false };

            if (match.profile) {
                result = findElementWithHealing(match.profile);
            } 
            
            if (result.element) {
                executeShortcut(result.element);
                if (result.healed) {
                    // Update profile automatically
                    match.profile = generateRobustProfile(result.element);
                    chrome.storage.local.set({ [`shortcut_${match.id}`]: match });
                    console.log("[WebKeyBind] Healed shortcut.");
                }
            } else {
                showNotification(`❌ Missing: ${match.name}`, "red");
            }
        }
    });
}

function executeShortcut(element) {
    const originalBg = element.style.backgroundColor;
    const originalTransition = element.style.transition;
    
    // Visual Feedback
    element.style.transition = "all 0.1s";
    element.style.backgroundColor = "rgba(124, 77, 255, 0.5)"; 
    element.focus(); // Focus first!
    
    // Special handling for ChatGPT Inputs
    if (element.tagName === 'TEXTAREA' || element.getAttribute('contenteditable') === 'true') {
        // Just focus it, don't click it (clicking might reset cursor)
    } else {
        triggerDeepClick(element);
    }

    setTimeout(() => { 
        element.style.backgroundColor = originalBg; 
        element.style.transition = originalTransition;
    }, 300);
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
// 8. UTILITIES
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