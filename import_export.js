document.addEventListener('DOMContentLoaded', () => {
    const btnExportSite = document.getElementById('btn-export-site');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnImport = document.getElementById('btn-import');
    
    const menuBurger = document.querySelector('.menu-burger');
    const menuDropdown = document.querySelector('.import-export-dropdown');
    const closeMenuBtn = document.querySelector('.close-menu');

    const importModal = document.getElementById('import-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnCloseImport = document.getElementById('btn-close-import');

    function announceToScreenReader(message, color = "default") {
        let announcer = document.getElementById('popup-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = "popup-announcer";
            announcer.setAttribute('aria-live', 'assertive');
            announcer.style.cssText = 'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;';
            document.body.appendChild(announcer);
        }

        const langMap = { "English": "en", "हिंदी": "hi", "मराठी": "mr", "മലയാളം": "ml" };
        const currentCode = langMap[window.currentLang] || "en";
        announcer.setAttribute('lang', currentCode);

        announcer.textContent = "";
        setTimeout(() => { announcer.textContent = message; }, 50);
        const existingBanner = document.getElementById('popup-notification');
        if(existingBanner) existingBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'popup-notification';
        banner.innerText = message;
        banner.style.cssText = `
            position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
            background-color: ${color === 'red' ? '#DC3545' : '#28A745'};
            color: white; padding: 8px 12px; border-radius: 4px; font-size: 13px;
            z-index: 9999; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 3000);
    }

    // --- 1. FOCUS TRAP LOGIC ---
    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        const focusableElements = importModal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0]; 
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) { 
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        }
        else { 
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    // --- 2. HELPER: Close Modal & Return Focus ---
    function closeModal() {
        if (!importModal) return;
        importModal.style.display = 'none';
        importModal.removeEventListener('keydown', trapFocus);
        if (btnImport) btnImport.focus(); 
    }

    // --- 3. MENU TOGGLES ---
    if (menuBurger) {
        menuBurger.addEventListener('click', (e) => {
            menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
            e.stopPropagation();
        });
    }
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => menuDropdown.style.display = 'none');
    document.addEventListener('click', () => { if(menuDropdown) menuDropdown.style.display = 'none'; });

    // --- 4. EXPORT LOGIC ---
    function exportShortcuts(exportAll) {
        const hostname = window.currentSiteHostname || ""; 
        
        chrome.storage.local.get(null, (items) => {
            let allItems = Object.values(items).filter(item => item.id);
            let data = exportAll ? allItems : allItems.filter(item => item.url === hostname);

            if (data.length === 0) {
                const t = window.translations[window.currentLang];
                announceToScreenReader(t.no_shortcuts + " " + (exportAll ? "ALL" : hostname), "red");
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = exportAll ? `shortcuts_ALL_${timestamp}.json` : `shortcuts_${hostname}_${timestamp}.json`;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            
            const link = document.createElement('a');
            link.href = dataStr;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        });
    }

    if (btnExportSite) btnExportSite.addEventListener('click', () => exportShortcuts(false));
    if (btnExportAll) btnExportAll.addEventListener('click', () => exportShortcuts(true));

    // --- 5. IMPORT LOGIC (Open Modal) ---
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            importModal.style.display = 'flex';
            if (menuDropdown) menuDropdown.style.display = 'none';
            importModal.addEventListener('keydown', trapFocus);
            const silentStart = document.getElementById('silent-start');
            if (silentStart) {
                setTimeout(() => {
                    silentStart.focus();
                }, 50);
            }
        });
    }
    
    if (btnCloseImport) btnCloseImport.addEventListener('click', closeModal);
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && importModal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- 6. DRAG & DROP HANDLING ---
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '#f0ebff';
            dropZone.style.borderColor = '#7c4dff';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.backgroundColor = '#f9f9f9';
            dropZone.style.borderColor = '#ccc';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '#f9f9f9';
            if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) processFile(e.target.files[0]);
            fileInput.value = ''; 
        });
    }

    // --- 7. FILE PROCESSOR ---
    function processFile(file) {
        const t = window.translations[window.currentLang];
        
        if (!file.name.endsWith('.json')) {
            announceToScreenReader(t.importTypeErr, "red");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error();
                
                const promises = data.map(item => {
                    if (item.id && item.key) {
                        return new Promise(resolve => {
                            chrome.storage.local.set({ [`shortcut_${item.id}`]: item }, resolve);
                        });
                    }
                });
                Promise.all(promises).then(() => {
                    const successMsg = t.importSuccess.replace("{count}", data.length);
                    announceToScreenReader(successMsg, "green");
                    
                    closeModal(); // Close & Return Focus
                    
                    if (window.loadShortcuts) window.loadShortcuts();
                });
            } 
            catch (err) {
                announceToScreenReader(t.importInvalid, "red");
            }
        };
        reader.readAsText(file);
    }
});