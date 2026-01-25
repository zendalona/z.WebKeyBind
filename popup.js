document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all');

    // --- GLOBAL STATE (Attached to window so other files can see it) ---
    window.currentSiteHostname = "";
    let isShowingAll = false;

    // --- 1. INITIALIZATION ---
    chrome.storage.local.get(['ui_language'], (result) => {
        // Set Language using the function from language.js
        if (result.ui_language && window.updateLanguageUI) {
            window.updateLanguageUI(result.ui_language);
        }

        // Get Current URL
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    window.currentSiteHostname = new URL(tabs[0].url).hostname;
                } catch (e) {
                    window.currentSiteHostname = "local";
                }
            }
            loadShortcuts(); // Initial Load
        });
    });

    // --- 2. MAIN LIST LOADER (Global function) ---
    window.loadShortcuts = function() {
        shortcutList.innerHTML = ''; 
        const t = window.translations[window.currentLang] || window.translations['English'];
        
        // Update "Show All" Button Text
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
                data[field] = e.target.value;
                chrome.storage.local.set({ [`shortcut_${data.id}`]: data });
            });
        });

        // Delete Row
        row.querySelector('.btn-remove').addEventListener('click', () => {
            if (confirm(t.delete_confirm)) {
                chrome.storage.local.remove(`shortcut_${data.id}`, () => {
                    row.remove();
                    window.loadShortcuts(); // Refresh index numbers
                });
            }
        });

        shortcutList.appendChild(row);
    }

    // --- 4. BUTTON ACTIONS ---
    
    // Toggle Show All / Current Site
    showAllBtn.addEventListener('click', () => {
        isShowingAll = !isShowingAll;
        window.loadShortcuts();
    });

    // Add New Shortcut
    addBtn.addEventListener('click', () => {
        const uniqueId = Date.now().toString();
        const newShortcut = {
            id: uniqueId,
            url: window.currentSiteHostname, 
            name: "",
            elementId: "",
            key: ""
        };
        chrome.storage.local.set({ [`shortcut_${uniqueId}`]: newShortcut }, () => {
            window.loadShortcuts();
        });
    });

    // Delete All Visible
    deleteAllBtn.addEventListener('click', () => {
        const t = window.translations[window.currentLang];
        if(confirm(t.delete_all_confirm)) {
            chrome.storage.local.get(null, (items) => {
                const idsToDelete = [];
                Object.values(items).forEach(s => {
                    if (s.id && (isShowingAll || s.url.includes(window.currentSiteHostname) || s.url === "<URL>")) {
                        idsToDelete.push(`shortcut_${s.id}`);
                    }
                });
                if (idsToDelete.length > 0) {
                    chrome.storage.local.remove(idsToDelete, window.loadShortcuts);
                }
            });
        }
    });
});