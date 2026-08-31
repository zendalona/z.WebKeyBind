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

    // --- 1. ACCESSIBILITY FOR STATIC TEXT ---
    const staticTextElements = document.querySelectorAll('.logo, .section-title, .how-to-use-box, .how-to-use-box strong, .how-to-use-list li, .selector-info-box, .selector-info-box p, .selector-example');
    staticTextElements.forEach(el => el.setAttribute('tabindex', '0'));

    // --- 2. FIX: MAKE DEFAULT SHORTCUT TABLE READABLE (NO "ROW" ANNOUNCEMENT) ---
    const defaultRows = document.querySelectorAll('.default-table tbody tr');
    defaultRows.forEach((row) => {
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'listitem'); // Forces SR to treat it as a list item, not a table row!

        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const action = cells[0].textContent.trim();
            const keys = cells[1].textContent.trim();
            row.setAttribute('aria-label', `Default Shortcut: ${action}. Key combination: ${keys}`);
        }
    });

    // --- 3. ACCESSIBILITY ENGINE (DUAL-TOGGLE FIX FOR INSTANT READ) ---
    const srAnnouncer1 = document.createElement('div');
    const srAnnouncer2 = document.createElement('div');
    const commonStyles = 'position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;';

    srAnnouncer1.id = "wkb-popup-announcer-1";
    srAnnouncer1.setAttribute('aria-live', 'assertive');
    srAnnouncer1.setAttribute('aria-atomic', 'true');
    srAnnouncer1.style.cssText = commonStyles;

    srAnnouncer2.id = "wkb-popup-announcer-2";
    srAnnouncer2.setAttribute('aria-live', 'assertive');
    srAnnouncer2.setAttribute('aria-atomic', 'true');
    srAnnouncer2.style.cssText = commonStyles;

    document.body.appendChild(srAnnouncer1);
    document.body.appendChild(srAnnouncer2);

    let announcerToggle = true;

    function announceToScreenReader(message) {
        if (announcerToggle) {
            srAnnouncer2.textContent = ''; 
            srAnnouncer1.textContent = message; 
        } else {
            srAnnouncer1.textContent = ''; 
            srAnnouncer2.textContent = message; 
        }
        announcerToggle = !announcerToggle;
    }

    // === INSTANT ANNOUNCEMENT - NO TIMEOUT DELAY ===
    announceToScreenReader("Settings window is opened");

    function showAccessibleAlert(msg, type = "error") {
        announceToScreenReader(msg);

        const existing = document.getElementById('webkeybind-popup-alert');
        if (existing) existing.remove();

        const alertDiv = document.createElement('div');
        alertDiv.id = 'webkeybind-popup-alert';
        alertDiv.setAttribute('aria-hidden', 'true');
        alertDiv.textContent = msg; 

        let bgColor = "#007BFF";
        if (type === "error") bgColor = "#DC3545";
        if (type === "success") bgColor = "#28A745";
        if (type === "info") bgColor = "#17a2b8"; 

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
            style.textContent = `
                @keyframes popup-fadein { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes modal-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `;
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
    window.showAccessibleAlert = showAccessibleAlert; 

    function showAccessibleConfirm(msg, onConfirmCallback, onCancelCallback = null, customYesTxt = null, customNoTxt = null) {
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
        announceToScreenReader(msg + " Press Tab to select options.");

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
            animation: modal-fadein 0.2s ease-out;
        `;

        const text = document.createElement('p');
        text.textContent = msg; 
        text.style.cssText = "margin: 0 0 20px 0; color: #333; font-size: 15px; line-height: 1.5; font-weight: 500; word-break: break-word;";

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; justify-content: center; gap: 12px;";

        const btnCancel = document.createElement('button');
        btnCancel.textContent = customNoTxt || t.cancel || "Cancel"; 
        btnCancel.style.cssText = "padding: 8px 16px; border: 1px solid #ccc; background: #f8f9fa; border-radius: 4px; cursor: pointer; color: #333; font-weight: bold; flex: 1;";

        const btnYes = document.createElement('button');
        btnYes.textContent = customYesTxt || t.yes_delete || "Yes, Delete"; 
        btnYes.style.cssText = "padding: 8px 16px; border: none; background: #DC3545; color: white; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;";
        
        if (customYesTxt === "Replace") btnYes.style.background = "#FF9800"; 

        btnCancel.onclick = () => { overlay.remove(); showAccessibleAlert("Action cancelled.", "info"); if(onCancelCallback) onCancelCallback(); };
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
                    if (document.activeElement === btnCancel) { e.preventDefault(); btnYes.focus(); }
                } else {
                    if (document.activeElement === btnYes) { e.preventDefault(); btnCancel.focus(); }
                }
            } else if (e.key === 'Escape') {
                e.preventDefault(); 
                overlay.remove();
                showAccessibleAlert("Action cancelled.", "info");
                if(onCancelCallback) onCancelCallback();
            }
        });
        btnCancel.focus();
    }
    window.showAccessibleConfirm = showAccessibleConfirm; 

    // --- 4. ADD SHORTCUT MODAL ---
    function showAddShortcutModal() {
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
        
        const existing = document.getElementById('wkb-add-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'wkb-add-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 2147483647;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(3px);
        `;

        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'add-modal-title');
        modal.style.cssText = `
            background: white; padding: 24px; border-radius: 8px; width: 340px; max-width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: sans-serif;
            animation: modal-fadein 0.2s ease-out; display: flex; flex-direction: column; gap: 12px;
        `;

        const title = document.createElement('h3');
        title.id = 'add-modal-title';
        title.textContent = t.addBtn || "Add Shortcut Manually"; 
        title.setAttribute('tabindex', '0'); 
        title.style.cssText = "margin: 0 0 10px 0; color: #333; font-size: 18px; text-align: center;";

        function createInput(placeholder, val, isReadonly, labelTxt, uniqueSuffix) {
            const wrapper = document.createElement('div');
            wrapper.style.display = "flex"; wrapper.style.flexDirection = "column"; wrapper.style.gap = "4px";
            
            const inputId = `wkb-input-${uniqueSuffix}`;

            const lbl = document.createElement('label');
            lbl.textContent = labelTxt; 
            lbl.setAttribute('for', inputId); 
            lbl.style.cssText = "font-size: 12px; color: #555; font-weight: bold;";
            
            const inp = document.createElement('input');
            inp.id = inputId;
            inp.type = "text"; 
            inp.value = val; 
            inp.placeholder = placeholder; 
            inp.readOnly = isReadonly;
            inp.setAttribute('aria-label', labelTxt);
            
            if (!isReadonly) {
                inp.setAttribute('aria-required', 'true');
            }

            inp.style.cssText = `
                width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;
                font-size: 14px; box-sizing: border-box; outline: none; transition: border 0.2s;
                ${isReadonly ? 'background-color: #f1f3f4; color: #5f6368;' : ''}
            `;
            inp.addEventListener('focus', () => { if(!isReadonly) inp.style.borderColor = "#007BFF"; });
            inp.addEventListener('blur', () => { if(!isReadonly) inp.style.borderColor = "#ccc"; });
            
            wrapper.appendChild(lbl);
            wrapper.appendChild(inp);
            return { wrapper, input: inp };
        }

        const urlField = createInput(t.p_url || "URL", window.currentSiteHostname || "", true, "Site URL", "url");
        const nameField = createInput(t.p_name || "Name", "", false, "Action Name", "name");
        const idField = createInput(t.p_id || "ID/Class", "", false, "Element ID or Class", "elementId");
        const keyField = createInput(t.p_key || "Key", "", false, "Trigger Key (e.g. K)", "key");
        
        keyField.input.maxLength = 1;
        keyField.input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            e.target.removeAttribute('aria-invalid');
        });
        nameField.input.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
        idField.input.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; justify-content: space-between; gap: 10px; margin-top: 10px;";

        const btnCancel = document.createElement('button');
        btnCancel.textContent = t.cancelBtn || "Cancel"; 
        btnCancel.style.cssText = "padding: 10px; border: 1px solid #ccc; background: #f8f9fa; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold; color: #333;";

        const btnSave = document.createElement('button');
        btnSave.textContent = "Save Shortcut"; 
        btnSave.style.cssText = "padding: 10px; border: none; background: #007BFF; color: white; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold;";

        const closeModal = (isCancel = false) => { 
            overlay.remove(); 
            const addBtn = document.querySelector('.btn-add');
            if(addBtn) addBtn.focus(); 
            if(isCancel) showAccessibleAlert("Add shortcut cancelled.", "info");
        };
        btnCancel.onclick = () => closeModal(true);

        const enableSaveButton = () => {
            btnSave.disabled = false;
            btnSave.style.opacity = '1';
            btnSave.style.cursor = 'pointer';
        };

        btnSave.onclick = () => {
            btnSave.disabled = true;
            btnSave.style.opacity = '0.5';
            btnSave.style.cursor = 'not-allowed';

            const n = nameField.input.value.trim();
            const i = idField.input.value.trim();
            const k = keyField.input.value.trim();

            if (!n || !i || !k) {
                showAccessibleAlert("All fields are required.", "error");
                if(!n) { nameField.input.style.borderColor = "#DC3545"; nameField.input.setAttribute('aria-invalid', 'true'); }
                if(!i) { idField.input.style.borderColor = "#DC3545"; idField.input.setAttribute('aria-invalid', 'true'); }
                if(!k) { keyField.input.style.borderColor = "#DC3545"; keyField.input.setAttribute('aria-invalid', 'true'); }
                enableSaveButton();
                return;
            }

            chrome.storage.local.get(null, (items) => {
                const currentHost = window.currentSiteHostname;
                const duplicate = Object.values(items).find(item => item.key === k && (normalizeUrl(item.url) === normalizeUrl(currentHost)));
                if (duplicate) {
                    const btnName = duplicate.name || duplicate.elementId || "Unknown";
                    const errTemp = t.duplicate_error || "Key '{key}' is already saved for: {name}";
                    showAccessibleAlert(errTemp.replace("{key}", k).replace("{name}", btnName), "error");
                    keyField.input.style.borderColor = "#DC3545";
                    keyField.input.setAttribute('aria-invalid', 'true');
                    enableSaveButton();
                    return;
                }

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs[0] || !tabs[0].id) {
                        saveData(n, i, k); 
                        return;
                    }
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (selector) => {
                            try { if (document.querySelector(selector)) return true; } catch(e){}
                            if (document.getElementById(selector)) return true;
                            try { if (document.querySelector(`[aria-label="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch(e){}
                            try { if (document.querySelector(`[data-testid="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch(e){}
                            return false;
                        },
                        args: [i]
                    }, (results) => {
                        if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                            showAccessibleAlert(t.invalid_id || `Element "${i}" not found on page.`, "error");
                            idField.input.style.borderColor = "#DC3545";
                            idField.input.setAttribute('aria-invalid', 'true');
                            enableSaveButton();
                        } else {
                            saveData(n, i, k);
                        }
                    });
                });
            });
        };

        function saveData(name, elementId, key) {
            const uniqueId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
            const data = { id: uniqueId, url: window.currentSiteHostname, name: name, elementId: elementId, key: key, profile: { path: elementId } };
            chrome.storage.local.set({ [`shortcut_${uniqueId}`]: data }, () => {
                closeModal();
                window.loadShortcuts();
                showAccessibleAlert("Shortcut saved successfully.", "success");
            });
        }

        btnContainer.append(btnCancel, btnSave);
        modal.append(title, urlField.wrapper, nameField.wrapper, idField.wrapper, keyField.wrapper, btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const focusables = [title, urlField.input, nameField.input, idField.input, keyField.input, btnCancel, btnSave];
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault(); closeModal(true);
            } else if (e.key === 'Enter' && document.activeElement !== btnCancel && document.activeElement !== btnSave) {
                e.preventDefault(); btnSave.click();
            }
        });

        announceToScreenReader("Add Shortcut dialog opened. Enter Name, ID, and Key. Press Escape to cancel.");
        nameField.input.focus();
    }

    // --- 5. UI REFERENCES & CORE LOGIC ---
    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all') || document.getElementById('btn-delete-all');

    if (addBtn) {
        addBtn.setAttribute('tabindex', '0');
        addBtn.setAttribute('role', 'button');
        addBtn.setAttribute('aria-label', 'Add a new shortcut manually');
        const handleAdd = (e) => {
            e?.preventDefault();
            showAddShortcutModal();
        };
        addBtn.addEventListener('click', handleAdd);
        addBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') handleAdd(e);
        });
    }

    if (showAllBtn) {
        showAllBtn.setAttribute('tabindex', '0');
        showAllBtn.setAttribute('role', 'button');
        const handleShowAll = (e) => {
            e?.preventDefault();
            isShowingAll = !isShowingAll;
            window.loadShortcuts();
            showAccessibleAlert(isShowingAll ? "Showing all shortcuts" : "Showing current site shortcuts", "info");
        };
        showAllBtn.addEventListener('click', handleShowAll);
        showAllBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') handleShowAll(e);
        });
    }

    if (shortcutList && shortcutList.parentNode) {
        if (!document.getElementById('wkb-creation-tip')) {
            const helpText = document.createElement('div');
            helpText.id = 'wkb-creation-tip';
            helpText.setAttribute('aria-live', 'polite');
            helpText.setAttribute('tabindex', '0'); 
            helpText.style.cssText = "font-size: 12.5px; color: #444; text-align: center; margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #ddd; font-weight: 500;";
            helpText.textContent = "💡 Tip: Press Alt+Shift+C to enable/disable Creation Mode. Press Escape to cancel.";
            shortcutList.parentNode.insertBefore(helpText, shortcutList);
        }
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            let shouldReload = false;
            for (let key in changes) {
                if (key.startsWith('shortcut_')) shouldReload = true;
            }
            if (shouldReload && window.loadShortcuts) {
                window.loadShortcuts();
            }
        }
    });

    if (deleteAllBtn && !document.getElementById('btn-save-all')) {
        const btnWrapper = document.createElement('div');
        btnWrapper.style.cssText = "display: flex; gap: 10px; align-items: center;";
        
        const saveAllBtn = document.createElement('button');
        saveAllBtn.id = 'btn-save-all';
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};
        saveAllBtn.textContent = t.saveChanges || "Save Changes"; 
        saveAllBtn.style.cssText = "padding: 8px 16px; border: none; background-color: #28a745; color: white; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: sans-serif; font-size: 13px;";
        
        deleteAllBtn.parentNode.insertBefore(btnWrapper, deleteAllBtn);
        btnWrapper.appendChild(saveAllBtn);
        btnWrapper.appendChild(deleteAllBtn);
        deleteAllBtn.style.margin = "0"; 

        saveAllBtn.addEventListener('click', () => {
            const rows = document.querySelectorAll('.shortcut-row');
            let hasError = false;

            rows.forEach(row => {
                const nameInp = row.querySelector('input[data-field="name"]');
                const idInp = row.querySelector('input[data-field="elementId"]');
                const keyInp = row.querySelector('input[data-field="key"]');

                if (!nameInp.value.trim()) { hasError = true; nameInp.classList.add('input-error'); nameInp.setAttribute('aria-invalid', 'true'); }
                if (!idInp.value.trim()) { hasError = true; idInp.classList.add('input-error'); idInp.setAttribute('aria-invalid', 'true'); }
                if (!keyInp.value.trim()) { hasError = true; keyInp.classList.add('input-error'); keyInp.setAttribute('aria-invalid', 'true'); }
            });

            if (hasError) {
                if (window.showAccessibleAlert) window.showAccessibleAlert("Please fill out all highlighted fields before saving.", "error");
                return;
            }

            chrome.storage.local.get(null, (items) => {
                let updates = {};
                let duplicateFound = false;

                rows.forEach(row => {
                    const id = row.getAttribute('data-id');
                    const url = row.querySelector('.url-input').value;
                    const name = row.querySelector('input[data-field="name"]').value.trim();
                    const elementId = row.querySelector('input[data-field="elementId"]').value.trim();
                    const key = row.querySelector('input[data-field="key"]').value.trim();
                    const currentHost = normalizeUrl(url);

                    const duplicate = Object.values(items).find(ex => ex.id !== id && ex.key === key && (normalizeUrl(ex.url) === currentHost));
                    
                    if (duplicate) {
                        duplicateFound = true;
                        const keyInp = row.querySelector('input[data-field="key"]');
                        keyInp.classList.add('input-error');
                        keyInp.setAttribute('aria-invalid', 'true');
                        if (window.showAccessibleAlert) window.showAccessibleAlert(`Key '${key}' is already used by '${duplicate.name || duplicate.elementId}'.`, "error");
                    } else {
                        let existingData = items[`shortcut_${id}`] || { id, url, profile: { path: elementId } };
                        existingData.name = name;
                        existingData.elementId = elementId;
                        existingData.key = key;
                        updates[`shortcut_${id}`] = existingData;
                    }
                });

                if (duplicateFound) return; 

                chrome.storage.local.set(updates, () => {
                    if (window.showAccessibleAlert) window.showAccessibleAlert("All changes saved successfully!", "success");
                });
            });
        });
    }


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
        const t = window.translations?.[window.currentLang] || window.translations?.['English'] || {};

        if (showAllBtn) {
            showAllBtn.replaceChildren(); 
            const btnText = document.createTextNode((isShowingAll ? (t.showCurrent || "Show Current") : (t.showAll || "Show All")) + " ");
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'arrow-circle';
            arrowSpan.textContent = isShowingAll ? '⌃' : '⌄';
            showAllBtn.appendChild(btnText);
            showAllBtn.appendChild(arrowSpan);
        }

        chrome.storage.local.get(null, (items) => {
            if (shortcutList) shortcutList.replaceChildren();

            const allShortcuts = Object.values(items).filter(item => item.id);
            const currentNorm = normalizeUrl(window.currentSiteHostname);
            const displayList = isShowingAll ? allShortcuts : allShortcuts.filter(s => {
                const shortcutNorm = normalizeUrl(s.url);
                return shortcutNorm.includes(currentNorm) || currentNorm.includes(shortcutNorm) || s.url === "<URL>";
            });

            displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            if (displayList.length === 0) {
                if (shortcutList) {
                    const msg = document.createElement('div');
                    msg.style.cssText = "text-align:center; padding:20px; color:#999; font-size:13px; font-style:italic;";
                    msg.textContent = `${t.no_shortcuts || "No shortcuts"} ${isShowingAll ? '' : window.currentSiteHostname}`;
                    msg.setAttribute('tabindex', '0'); 
                    shortcutList.appendChild(msg);
                }
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

        const indexSpan = document.createElement('span');
        indexSpan.className = 'index';
        indexSpan.textContent = index;
        indexSpan.setAttribute('tabindex', '0'); 
        indexSpan.setAttribute('role', 'listitem');
        indexSpan.setAttribute('aria-label', `Shortcut ${index}`);

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = data.url;
        urlInput.className = 'input-field url-input';
        urlInput.readOnly = true;
        urlInput.title = `Site: ${data.url}`;
        urlInput.setAttribute('aria-label', `Site URL: ${data.url}`);
        urlInput.style.cssText = "background-color: #f1f3f4; color: #5f6368; cursor: default; border: 1px solid transparent; font-weight: 600;";

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = data.name;
        nameInput.className = 'input-field';
        nameInput.setAttribute('data-field', 'name');
        nameInput.setAttribute('aria-label', 'Action Name');
        nameInput.placeholder = t.p_name || 'Name';

        const idInput = document.createElement('input');
        idInput.type = 'text';
        idInput.value = data.elementId;
        idInput.className = 'input-field';
        idInput.setAttribute('data-field', 'elementId');
        idInput.setAttribute('aria-label', 'Element ID or Class');
        idInput.placeholder = t.p_id || 'ID/Class';

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = data.key;
        keyInput.className = 'input-field key-input';
        keyInput.setAttribute('data-field', 'key');
        keyInput.setAttribute('aria-label', 'Trigger Key');
        keyInput.placeholder = t.p_key || 'Key';
        keyInput.style.cssText = "text-align:center;";
        keyInput.maxLength = 1;

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove';
        btnRemove.title = 'Delete';
        btnRemove.textContent = '×';
        btnRemove.setAttribute('aria-label', `Delete shortcut for ${data.name || 'action'}`);

        row.append(indexSpan, urlInput, nameInput, idInput, keyInput, btnRemove);

        row.querySelectorAll('input').forEach(input => {
            if (input.value.trim() === "" && !input.readOnly) {
                input.classList.add('input-error');
                input.setAttribute('aria-invalid', 'true');
            }

            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field || e.target.getAttribute('data-field');
                let value = e.target.value;

                if (field === 'key') {
                    value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    e.target.value = value;
                }

                if (value.trim() === "") {
                    e.target.classList.add('input-error');
                    e.target.setAttribute('aria-invalid', 'true');
                    if (field === 'key') showAccessibleAlert("Key field cleared.", "info");
                } else {
                    e.target.classList.remove('input-error');
                    e.target.removeAttribute('aria-invalid');
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
                            e.target.setAttribute('aria-invalid', 'true');
                            e.target.value = "";
                        }
                    });
                }
            });
        });

        const idInputEl = row.querySelector('input[data-field="elementId"]');
        if (idInputEl) {
            idInputEl.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                if (val === "") {
                    e.target.classList.add('input-error');
                    e.target.setAttribute('aria-invalid', 'true');
                    return;
                }
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs[0] || !tabs[0].id) {
                        return;
                    }
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (selector) => {
                            try { if (document.querySelector(selector)) return true; } catch (e) { }
                            if (document.getElementById(selector)) return true;
                            try { if (document.querySelector(`[aria-label="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch (e) { }
                            try { if (document.querySelector(`[data-testid="${selector.replace(/"/g, '\\"')}"]`)) return true; } catch (e) { }
                            return false;
                        },
                        args: [val]
                    }, (results) => {
                        if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                            showAccessibleAlert(t.invalid_id || `The Button ID / Selector "${val}" was not found on this webpage.`, "error");
                            e.target.classList.add('input-error');
                            e.target.setAttribute('aria-invalid', 'true');
                        } else {
                            e.target.classList.remove('input-error');
                            e.target.removeAttribute('aria-invalid');
                        }
                    });
                });
            });
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

        if (shortcutList) shortcutList.appendChild(row);
    }

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

    document.querySelectorAll('.language-dropdown, .menu-container').forEach(el => el.removeAttribute('tabindex'));

    // === GLOBAL TAB LOOP ===
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const addModal = document.getElementById('wkb-add-modal');
            const confirmModal = document.getElementById('wkb-confirm-modal');
            const importModalElement = document.getElementById('import-modal');
            
            if (addModal || confirmModal || (importModalElement && window.getComputedStyle(importModalElement).display !== 'none')) {
                return; 
            }

            const focusables = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]'))
                .filter(el => {
                    const style = window.getComputedStyle(el);
                    return !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0 && style.visibility !== 'hidden' && style.display !== 'none';
                });

            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

});