// =======================================================
// VALIDATION & HELPER UTILITIES
// =======================================================

// 1. Strict URL Validator
function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// 2. Hostname Normalizer
function normalizeUrl(url) {
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].toLowerCase();
}

// =======================================================
// INITIALIZATION & MAIN LOGIC
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- UI REFERENCES ---
    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all');

    // Import/Export UI
    const btnExportSite = document.getElementById('btn-export-site');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnImport = document.getElementById('btn-import');
    const importModal = document.getElementById('import-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnCloseImport = document.getElementById('btn-close-import');
    const menuBurger = document.querySelector('.menu-burger');
    const menuDropdown = document.querySelector('.import-export-dropdown');
    const closeMenuBtn = document.querySelector('.close-menu');

    // --- CONNECTION ---
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.connect(tabs[0].id, { name: "z-webkeybind-popup" });
        }
    });

    window.currentSiteHostname = "";
    let isShowingAll = false;

    // --- 1. LOAD LANGUAGE & HOSTNAME ---
    chrome.storage.local.get(['ui_language'], (result) => {
        if (result.ui_language && window.updateLanguageUI) {
            window.updateLanguageUI(result.ui_language);
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    window.currentSiteHostname = new URL(tabs[0].url).hostname;
                } catch (e) {
                    window.currentSiteHostname = "local";
                }
            }
            loadShortcuts();
        });
    });

    // --- 2. MAIN LIST LOADER ---
    window.loadShortcuts = function () {
        shortcutList.innerHTML = '';
        const t = window.translations[window.currentLang] || window.translations['English'];

        if (showAllBtn) {
            showAllBtn.innerHTML = `${isShowingAll ? t.showCurrent : t.showAll} <span class="arrow-circle">${isShowingAll ? '⌃' : '⌄'}</span>`;
        }

        chrome.storage.local.get(null, (items) => {
            const allShortcuts = Object.values(items).filter(item => item.id);

            const currentNorm = normalizeUrl(window.currentSiteHostname);

            const displayList = isShowingAll
                ? allShortcuts
                : allShortcuts.filter(s => {
                    const shortcutNorm = normalizeUrl(s.url);
                    return shortcutNorm.includes(currentNorm) || currentNorm.includes(shortcutNorm) || s.url === "<URL>";
                });

            displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            if (displayList.length === 0) {
                const msg = document.createElement('div');
                msg.style.cssText = "text-align:center; padding:20px; color:#999; font-size:13px; font-style:italic;";
                msg.innerText = `${t.no_shortcuts} ${isShowingAll ? '' : window.currentSiteHostname}`;
                shortcutList.appendChild(msg);
            } else {
                displayList.forEach((data, index) => createRow(data, index + 1));
            }
        });
    };

    // --- 3. CREATE ROW ---
    function createRow(data, index) {
        const t = window.translations[window.currentLang] || window.translations['English'];
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.setAttribute('data-id', data.id);

        const currentNorm = normalizeUrl(window.currentSiteHostname);
        const shortcutNorm = normalizeUrl(data.url);
        const isCurrentContext = shortcutNorm.includes(currentNorm) || currentNorm.includes(shortcutNorm) || data.url === "<URL>";

        if (isCurrentContext) {
            row.style.backgroundColor = "#e8f0fe";
            row.style.borderLeft = "4px solid #1a73e8";
            row.title = "Active on this website";
        }

        row.innerHTML = `
            <span class="index">${index}</span>
            <input type="text" value="${data.url}" class="input-field url-input" data-field="url" placeholder="${t.p_url}" title="${t.p_url}">
            <input type="text" value="${data.name}" class="input-field" data-field="name" placeholder="${t.p_name}">
            <input type="text" value="${data.elementId}" class="input-field" data-field="elementId" placeholder="${t.p_id}">
            <input type="text" value="${data.key}" class="input-field key-input" data-field="key" placeholder="${t.p_key}" style="text-align:center;">
            <button class="btn-remove" title="Delete">×</button>
        `;

        row.querySelectorAll('input').forEach(input => {
            // Highlight empty fields initially
            if (input.value.trim() === "") input.classList.add('input-error');

            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                let value = e.target.value;

                if (value.trim() === "") e.target.classList.add('input-error');
                else e.target.classList.remove('input-error');

                // URL Logic (Protocol Fix)
                if (field === 'url') {
                    if (!value.startsWith('http') && !value.startsWith('//')) {
                        if (value.includes('.') && value.length > 3) {
                            const testValue = "https://" + value;
                            if (isValidURL(testValue)) {
                                value = testValue;
                                if (e.target.selectionStart === e.target.value.length) {
                                    e.target.value = value;
                                }
                            }
                        }
                    }
                    if (!isValidURL(value)) {
                        e.target.classList.add('input-error');
                        return; // Invalid URL -> Stop
                    }
                }

                if (field === 'key') {
                    value = value.toUpperCase();
                    e.target.value = value;
                }

                // Check Duplicates only if Key is being edited
                if (field === 'key' && value.trim() !== "") {
                    chrome.storage.local.get(null, (items) => {
                        const currentHost = data.url || window.currentSiteHostname;
                        const allItems = Object.values(items);

                        const duplicate = allItems.find(item => item.id !== data.id &&
                            item.key === value &&
                            (normalizeUrl(item.url) === normalizeUrl(currentHost))
                        );

                        if (duplicate) {
                            const btnName = duplicate.name || duplicate.elementId || "Unknown";
                            let errorTemplate = t.duplicate_error || "The key '{key}' is already saved for: {name}";
                            alert(errorTemplate.replace("{key}", value).replace("{name}", btnName));
                            e.target.classList.add('input-error');
                            e.target.value = "";
                            return;
                        }
                        // Update local data object, then validate all
                        data[field] = value;
                        validateAndSave(data);
                    });
                } else {
                    // Update local data object, then validate all
                    data[field] = value;
                    validateAndSave(data);
                }
            });
        });

        // --- NEW: STRICT 4-FIELD VALIDATION ---
        function validateAndSave(entry) {
            const hasUrl = entry.url && entry.url.trim() !== "" && isValidURL(entry.url);
            const hasName = entry.name && entry.name.trim() !== "";
            const hasId = entry.elementId && entry.elementId.trim() !== "";
            const hasKey = entry.key && entry.key.trim() !== "";

            if (hasUrl && hasName && hasId && hasKey) {
                // All 4 valid -> Save
                chrome.storage.local.set({ [`shortcut_${entry.id}`]: entry });
            } else {
                // Incomplete -> Remove from storage (Cleanup)
                chrome.storage.local.remove(`shortcut_${entry.id}`);
            }
        }

        row.querySelector('.btn-remove').addEventListener('click', () => {
            if (confirm(t.delete_confirm)) {
                chrome.storage.local.remove(`shortcut_${data.id}`, () => {
                    row.remove();
                    window.loadShortcuts();
                });
            }
        });

        shortcutList.appendChild(row);
    }

    // --- 4. BUTTON ACTIONS ---
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            isShowingAll = !isShowingAll;
            window.loadShortcuts();
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const uniqueId = Date.now().toString();
            const newShortcut = {
                id: uniqueId,
                url: window.currentSiteHostname,
                name: "",
                elementId: "",
                key: ""
            };
            const nextIndex = document.querySelectorAll('.shortcut-row').length + 1;
            createRow(newShortcut, nextIndex);
            shortcutList.scrollTop = shortcutList.scrollHeight;
        });
    }

    // This removes the extra tabindex from the container divs so you don't have to press Tab twice.
    const containers = document.querySelectorAll('.language-dropdown, .menu-container');
    containers.forEach(el => el.removeAttribute('tabindex'));

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            const t = window.translations[window.currentLang] || window.translations['English'];
            const host = window.currentSiteHostname || "";

            if (confirm(t.delete_all_confirm)) {
                if (isShowingAll) {
                    chrome.storage.local.clear(() => window.loadShortcuts());
                } else {
                    chrome.storage.local.get(null, (items) => {
                        const keysToRemove = Object.keys(items).filter(key => {
                            const item = items[key];
                            return key.startsWith('shortcut_') &&
                                (normalizeUrl(item.url) === normalizeUrl(host));
                        });
                        if (keysToRemove.length > 0) {
                            chrome.storage.local.remove(keysToRemove, () => window.loadShortcuts());
                        } else {
                            alert(t.no_shortcuts + " " + host);
                        }
                    });
                }
            }
        });
    }
});