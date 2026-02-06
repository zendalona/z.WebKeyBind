document.addEventListener('DOMContentLoaded', () => {
    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "z-webkeybind-popup"});
        }
    });

    window.currentSiteHostname = "";
    let isShowingAll = false;

    // --- 1. INITIALIZATION ---
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

    // --- 2. MAIN LIST LOADER (Global function) ---
    window.loadShortcuts = function() {
        shortcutList.innerHTML = ''; 
        const t = window.translations[window.currentLang] || window.translations['English'];
        showAllBtn.innerHTML = `${isShowingAll ? t.showCurrent : t.showAll} <span class="arrow-circle">${isShowingAll ? '⌃' : '⌄'}</span>`;

        chrome.storage.local.get(null, (items) => {
            const allShortcuts = Object.values(items).filter(item => item.id);
            
            // Filter: Site Separation
            const displayList = isShowingAll 
                ? allShortcuts 
                : allShortcuts.filter(s => window.currentSiteHostname.includes(s.url) || s.url === "<URL>");

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

        row.innerHTML = `
            <span class="index">${index}</span>
            <input type="text" value="${data.url}" class="input-field" data-field="url" placeholder="${t.p_url}" title="${t.p_url}">
            <input type="text" value="${data.name}" class="input-field" data-field="name" placeholder="${t.p_name}">
            <input type="text" value="${data.elementId}" class="input-field" data-field="elementId" placeholder="${t.p_id}">
            <input type="text" value="${data.key}" class="input-field" data-field="key" placeholder="${t.p_key}" style="text-align:center;">
            <button class="btn-remove" title="Delete">×</button>
        `;

        // Auto-Save
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                let value = e.target.value;
                if (field === 'key') {
                    value = value.toUpperCase();
                    e.target.value = value;      
                }
                if (field === 'key' && value.trim() !== "") {
                    chrome.storage.local.get(null, (items) => {
                        const currentHost = window.currentSiteHostname;
                        const allItems = Object.values(items);
                        
                        const duplicate = allItems.find(item => item.id !== data.id &&     
                            item.key === value &&   
                            (item.url === currentHost || data.url === currentHost)
                        );

                        if (duplicate) {
                            const btnName = duplicate.name || duplicate.elementId || "Unknown";
                            let errorTemplate = t.duplicate_error || "The key '{key}' is already saved for this button: {name}";
                            let finalMsg = errorTemplate
                                .replace("{key}", value)
                                .replace("{name}", btnName);
                                
                            alert(finalMsg);
                            e.target.value = ""; 
                            return; 
                        }
                        // No duplicate? Save.
                        saveData(field, value);
                    });
                } else {
                    saveData(field, value);
                }
            });
        });
        function saveData(field, value) {
            data[field] = value;
            if (data.elementId && data.elementId.trim() !== "") {
                chrome.storage.local.set({ [`shortcut_${data.id}`]: data });
            } else {
                chrome.storage.local.remove(`shortcut_${data.id}`);
            }
        }

        // Delete Row
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
    showAllBtn.addEventListener('click', () => {
        isShowingAll = !isShowingAll;
        window.loadShortcuts();
    });
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

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            const host = window.currentSiteHostname || "";
            const msg = isShowingAll
                ? "WARNING: Delete ALL shortcuts for EVERY website?"
                : `Delete shortcuts for ${host}?`;

            if (confirm(msg)) {
                if (isShowingAll) {
                    // Nuclear option: clear everything
                    chrome.storage.local.clear(() => {
                        if (window.loadShortcuts) window.loadShortcuts();
                    });
                } else {
                    chrome.storage.local.get(null, (items) => {
                        const keysToRemove = Object.keys(items).filter(key => {
                            const item = items[key];
                            return key.startsWith('shortcut_') &&
                                (item.url === host || host.includes(item.url));
                        });
                        if (keysToRemove.length > 0) {
                            chrome.storage.local.remove(keysToRemove, () => {
                                if (window.loadShortcuts) window.loadShortcuts();
                            });
                        } else {
                            alert("No shortcuts found for this site to delete.");
                        }
                    });
                }
            }
        });
    }
});