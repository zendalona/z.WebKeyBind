// =======================================================
// VALIDATION & HELPER UTILITIES
// =======================================================
function isValidURL(string) {
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

function normalizeUrl(url) {
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].toLowerCase();
}

// =======================================================
// INITIALIZATION & MAIN LOGIC
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    window.currentLang = "English";

    const popupAnnouncer = document.createElement('div');
    popupAnnouncer.setAttribute('aria-live', 'assertive');
    popupAnnouncer.setAttribute('aria-atomic', 'true');
    popupAnnouncer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
    document.body.appendChild(popupAnnouncer);

    function showAccessibleAlert(msg, type = "error") {
        popupAnnouncer.textContent = '';
        setTimeout(() => { popupAnnouncer.textContent = msg; }, 50);

        const existing = document.getElementById('webkeybind-popup-alert');
        if (existing) existing.remove();

        const alertDiv = document.createElement('div');
        alertDiv.id = 'webkeybind-popup-alert';
        alertDiv.setAttribute('aria-hidden', 'true'); 
        alertDiv.innerText = msg;

        let bgColor = "#007BFF"; 
        if (type === "error") bgColor = "#DC3545";
        if (type === "success") bgColor = "#28A745";

        alertDiv.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background-color: ${bgColor}; color: white; padding: 12px 20px;
            border-radius: 8px; font-family: sans-serif; font-size: 14px; font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 2147483647;
            text-align: center; max-width: 90%; word-wrap: break-word;
            animation: popup-fadein 0.3s ease-out;
        `;
        document.body.appendChild(alertDiv);

        if (!document.getElementById('popup-alert-styles')) {
            const style = document.createElement('style');
            style.id = 'popup-alert-styles';
            style.innerHTML = `@keyframes popup-fadein { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }`;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            if (document.body.contains(alertDiv)) {
                alertDiv.style.opacity = "0";
                alertDiv.style.transition = "opacity 0.3s";
                setTimeout(() => { if (document.body.contains(alertDiv)) alertDiv.remove(); }, 300);
            }
        }, 3000);
    }

    function showAccessibleConfirm(msg, onConfirmCallback) {
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
        
        popupAnnouncer.textContent = '';
        setTimeout(() => { popupAnnouncer.textContent = msg + " Press Tab to select options."; }, 50);

        const existing = document.getElementById('wkb-confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'wkb-confirm-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 2147483647;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(2px);
        `;

        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.style.cssText = `
            background: white; padding: 24px; border-radius: 8px; width: 300px; max-width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center; font-family: sans-serif;
            animation: popup-fadein 0.2s ease-out;
        `;

        const text = document.createElement('p');
        text.innerText = msg;
        text.style.cssText = "margin: 0 0 20px 0; color: #333; font-size: 15px; line-height: 1.5; font-weight: 500;";
        
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; justify-content: center; gap: 12px;";

        const btnCancel = document.createElement('button');
        btnCancel.innerText = t.cancel || "Cancel";
        btnCancel.style.cssText = "padding: 8px 16px; border: 1px solid #ccc; background: #f8f9fa; border-radius: 4px; cursor: pointer; color: #333; font-weight: bold; flex: 1;";
        
        const btnYes = document.createElement('button');
        btnYes.innerText = t.yes_delete || "Yes, Delete";
        btnYes.style.cssText = "padding: 8px 16px; border: none; background: #DC3545; color: white; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;";

        btnCancel.onclick = () => overlay.remove();
        btnYes.onclick = () => { overlay.remove(); onConfirmCallback(); };

        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnYes);
        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) { 
                    if (document.activeElement === btnCancel) {
                        e.preventDefault();
                        btnYes.focus();
                    }
                } else { 
                    if (document.activeElement === btnYes) {
                        e.preventDefault();
                        btnCancel.focus();
                    }
                }
            } else if (e.key === 'Escape') { 
                e.preventDefault();
                overlay.remove(); 
            }
        });
        btnCancel.focus();
    }

    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all') || document.getElementById('btn-delete-all');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.connect(tabs[0].id, { name: "z-webkeybind-popup" });
    });

    window.currentSiteHostname = "";
    let isShowingAll = false;

    chrome.storage.local.get(['ui_language'], (result) => {
        if (result.ui_language) window.currentLang = result.ui_language;
        if (result.ui_language && window.updateLanguageUI) window.updateLanguageUI(result.ui_language);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try { window.currentSiteHostname = new URL(tabs[0].url).hostname; } 
                catch (e) { window.currentSiteHostname = "local"; }
            }
            loadShortcuts();
        });
    });

    window.loadShortcuts = function () {
        shortcutList.innerHTML = '';
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};

        if (showAllBtn) {
            showAllBtn.innerHTML = `${isShowingAll ? (t.showCurrent || "Show Current") : (t.showAll || "Show All")} <span class="arrow-circle">${isShowingAll ? '⌃' : '⌄'}</span>`;
        }

        chrome.storage.local.get(null, (items) => {
            const allShortcuts = Object.values(items).filter(item => item.id);
            const currentNorm = normalizeUrl(window.currentSiteHostname);
            const displayList = isShowingAll ? allShortcuts : allShortcuts.filter(s => {
                const shortcutNorm = normalizeUrl(s.url);
                return shortcutNorm.includes(currentNorm) || currentNorm.includes(shortcutNorm) || s.url === "<URL>";
            });

            displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            if (displayList.length === 0) {
                const msg = document.createElement('div');
                msg.style.cssText = "text-align:center; padding:20px; color:#999; font-size:13px; font-style:italic;";
                msg.innerText = `${t.no_shortcuts || "No shortcuts"} ${isShowingAll ? '' : window.currentSiteHostname}`;
                shortcutList.appendChild(msg);
            } else {
                displayList.forEach((data, index) => createRow(data, index + 1));
            }
        });
    };

    function createRow(data, index) {
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.setAttribute('data-id', data.id);

        const currentNorm = normalizeUrl(window.currentSiteHostname);
        const shortcutNorm = normalizeUrl(data.url);
        if (shortcutNorm.includes(currentNorm) || currentNorm.includes(shortcutNorm) || data.url === "<URL>") {
            row.style.backgroundColor = "#e8f0fe";
            row.style.borderLeft = "4px solid #1a73e8";
            row.title = "Active on this website";
        }

        row.innerHTML = `
            <span class="index">${index}</span>
            <input type="text" value="${data.url}" class="input-field url-input" readonly title="Site: ${data.url}" 
                style="background-color: #f1f3f4; color: #5f6368; cursor: default; border: 1px solid transparent; font-weight: 600;">
            <input type="text" value="${data.name}" class="input-field" data-field="name" placeholder="${t.p_name || 'Name'}">
            <input type="text" value="${data.elementId}" class="input-field" data-field="elementId" placeholder="${t.p_id || 'ID/Class'}">
            <input type="text" value="${data.key}" class="input-field key-input" data-field="key" placeholder="${t.p_key || 'Key'}" style="text-align:center;">
            <button class="btn-remove" title="Delete">×</button>
        `;

        row.querySelectorAll('input').forEach(input => {
            if (input.value.trim() === "" && !input.readOnly) input.classList.add('input-error');

            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                let value = e.target.value;

                if (value.trim() === "") e.target.classList.add('input-error');
                else e.target.classList.remove('input-error');

                if (field === 'key') {
                    value = value.toUpperCase();
                    e.target.value = value;
                }

                if (field === 'key' && value.trim() !== "") {
                    chrome.storage.local.get(null, (items) => {
                        const currentHost = data.url || window.currentSiteHostname;
                        const duplicate = Object.values(items).find(item => item.id !== data.id && item.key === value && (normalizeUrl(item.url) === normalizeUrl(currentHost)));
                        if (duplicate) {
                            const btnName = duplicate.name || duplicate.elementId || "Unknown";
                            const errTemp = t.duplicate_error || "The key '{key}' is already saved for: {name}";
                            showAccessibleAlert(errTemp.replace("{key}", value).replace("{name}", btnName), "error");
                            e.target.classList.add('input-error');
                            e.target.value = "";
                            return;
                        }
                        data[field] = value;
                        validateAndSave(data);
                    });
                } else if (field !== 'elementId') { 
                    data[field] = value;
                    validateAndSave(data);
                }
            });
        });

        const idInput = row.querySelector('input[data-field="elementId"]');
        if (idInput) {
            idInput.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                if (val === "") {
                    data.elementId = "";
                    validateAndSave(data);
                    return;
                }
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs[0] || !tabs[0].id) {
                        showAccessibleAlert("Could not connect to the webpage.", "error");
                        return;
                    }
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (selector) => {
                            try { if (document.querySelector(selector)) return true; } catch(e) {}
                            if (document.getElementById(selector)) return true;
                            try { if (document.querySelector(`[aria-label="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch(e) {}
                            try { if (document.querySelector(`[data-testid="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch(e) {}
                            return false; 
                        },
                        args: [val]
                    }, (results) => {
                        if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                            showAccessibleAlert(t.invalid_id || `The Button ID / Selector "${val}" was not found on this webpage.`, "error");
                            e.target.value = "";
                            e.target.classList.add('input-error');
                            data.elementId = "";
                            chrome.storage.local.remove(`shortcut_${data.id}`);
                        } else {
                            e.target.classList.remove('input-error');
                            data.elementId = val;
                            validateAndSave(data); 
                        }
                    });
                });
            });
        }

        function validateAndSave(entry) {
            if (entry.url && isValidURL(entry.url) && entry.name && entry.name.trim() !== "" && entry.elementId && entry.elementId.trim() !== "" && entry.key && entry.key.trim() !== "") {
                chrome.storage.local.set({ [`shortcut_${entry.id}`]: entry });
            } else {
                chrome.storage.local.remove(`shortcut_${entry.id}`);
            }
        }

        row.querySelector('.btn-remove').addEventListener('click', () => {
            showAccessibleConfirm(t.delete_confirm || "Delete this shortcut?", () => {
                chrome.storage.local.remove(`shortcut_${data.id}`, () => {
                    row.remove();
                    window.loadShortcuts();
                    showAccessibleAlert(t.deleted_success || "Shortcut deleted successfully.", "success");
                });
            });
        });

        shortcutList.appendChild(row);
    }

    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            isShowingAll = !isShowingAll;
            window.loadShortcuts();
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const newShortcut = { id: Date.now().toString(), url: window.currentSiteHostname || "example.com", name: "", elementId: "", key: "" };
            createRow(newShortcut, document.querySelectorAll('.shortcut-row').length + 1);
            shortcutList.scrollTop = shortcutList.scrollHeight;
        });
    }

    document.querySelectorAll('.language-dropdown, .menu-container').forEach(el => el.removeAttribute('tabindex'));

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
            const host = window.currentSiteHostname || "";
            showAccessibleConfirm(t.delete_all_confirm || "Delete these shortcuts?", () => {
                chrome.storage.local.get(null, (items) => {
                    const keysToRemove = isShowingAll ? Object.keys(items).filter(key => key.startsWith('shortcut_')) : Object.keys(items).filter(key => key.startsWith('shortcut_') && (normalizeUrl(items[key].url) === normalizeUrl(host)));
                    if (keysToRemove.length > 0) {
                        chrome.storage.local.remove(keysToRemove, () => {
                            window.loadShortcuts();
                            showAccessibleAlert(isShowingAll ? (t.deleted_all_success || "All shortcuts deleted successfully.") : (t.deleted_site_success || `Shortcuts for ${host} deleted.`), "success");
                        });
                    } else {
                        showAccessibleAlert((t.no_shortcuts || "No shortcuts") + " " + host, "info");
                    }
                });
            });
        });
    }
});