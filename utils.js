// Shared utility functions for WebKeyBind extension

/**
 * Validates if a string is a valid URL
 * @param {string} string - The string to validate
 * @returns {boolean} True if valid URL
 */
export function isValidURL(string) {
    if (!string) return false;
    try {
        new URL(string);
        return true;
    } catch (_) {
        try {
            new URL('https://' + string);
            return true;
        } catch (__) {
            return false;
        }
    }
}

/**
 * Normalizes a URL by removing protocol and www prefix
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL hostname
 */
export function normalizeUrl(url) {
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].toLowerCase();
}

/**
 * Creates an accessible screen reader announcer element
 * @param {string} id - The ID for the announcer element
 * @returns {HTMLElement} The announcer element
 */
export function createAnnouncer(id = 'webkeybind-announcer') {
    const announcer = document.createElement('div');
    announcer.id = id;
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
    return announcer;
}

/**
 * Announces a message to screen readers
 * @param {HTMLElement} announcer - The announcer element
 * @param {string} message - The message to announce
 * @param {string} langCode - ISO language code (e.g., 'en', 'hi')
 */
export function announceToScreenReader(announcer, message, langCode = 'en') {
    if (!announcer) return;
    announcer.setAttribute('lang', langCode);
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 50);
}

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Removes an element by ID if it exists
 * @param {string} id - The element ID to remove
 */
export function removeElementById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

/**
 * Language code mapping
 */
export const LANG_MAP = {
    "English": "en",
    "हिंदी": "hi",
    "मराठी": "mr",
    "മലയാളം": "ml"
};

/**
 * Gets ISO language code from language name
 * @param {string} langName - Language name
 * @returns {string} ISO language code
 */
export function getISOCode(langName) {
    return LANG_MAP[langName] || "en";
}

/**
 * Notification color constants
 */
export const NOTIFICATION_COLORS = {
    default: '#333333',
    blue: '#007BFF',
    purple: '#6f42c1',
    orange: '#FF9800',
    red: '#DC3545',
    green: '#28A745'
};

/**
 * Other constants
 */
export const Z_INDEX_MAX = 2147483647;
export const NOTIFICATION_DURATION = 4000;
export const NOTIFICATION_FADE_DURATION = 300;
export const DEBOUNCE_DELAY = 300;
