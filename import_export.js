document.addEventListener('DOMContentLoaded', () => {
    // --- UI REFERENCES ---
    const btnExportSite = document.getElementById('btn-export-site');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnImport = document.getElementById('btn-import');
    
    // Menu Elements
    const menuContainer = document.querySelector('.menu-container'); 
    const menuBurger = document.querySelector('.menu-burger');
    const menuDropdown = document.querySelector('.import-export-dropdown');
    const closeMenuBtn = document.querySelector('.close-menu');

    // Modal Elements
    const importModal = document.getElementById('import-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnCloseImport = document.getElementById('btn-close-import');

    // --- 1. FOCUS TRAP LOGIC (New Feature) ---
    function handleFocusTrap(e) {
        if (e.key !== 'Tab') return;

        // Find all focusable elements inside the modal
        const focusableElements = importModal.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab (Backward)
        if (e.shiftKey) { 
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus(); // Loop to bottom
            }
        } 
        // Tab (Forward)
        else { 
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus(); // Loop to top
            }
        }
    }

    // --- 2. MENU TOGGLE ---
    if (menuBurger && menuDropdown) {
        menuBurger.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close Language Menu (Mutual Exclusion)
            const langMenu = document.getElementById('lang-menu');
            const langBtn = document.getElementById('lang-button');
            if(langMenu) langMenu.style.display = 'none';
            if(langBtn) langBtn.setAttribute('aria-expanded', 'false');

            const isVisible = menuDropdown.style.display === 'block';
            menuDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Auto-close on Tab Out
        if (menuContainer) {
            menuContainer.addEventListener('focusout', (event) => {
                if (!menuContainer.contains(event.relatedTarget)) {
                    menuDropdown.style.display = 'none';
                }
            });
        }
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.style.display = 'none';
        });
    }
    
    document.addEventListener('click', () => { 
        if(menuDropdown) menuDropdown.style.display = 'none'; 
    });

    // --- 3. EXPORT LOGIC ---
    function exportShortcuts(exportAll) {
        const hostname = window.currentSiteHostname || ""; 
        chrome.storage.local.get(null, (items) => {
            let allItems = Object.values(items).filter(item => item.id);
            let data = exportAll ? allItems : allItems.filter(item => item.url === hostname);

            if (data.length === 0) {
                const t = window.translations[window.currentLang] || window.translations['English'];
                alert(t.no_shortcuts + " " + (exportAll ? "ALL" : hostname));
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

    // --- 4. IMPORT LOGIC (Updated with Trap) ---
    function openModal() {
        importModal.style.display = 'flex';
        if (menuDropdown) menuDropdown.style.display = 'none';
        
        // Activate Focus Trap
        document.addEventListener('keydown', handleFocusTrap);
        
        // Initial Focus
        const silentStart = document.getElementById('silent-start');
        if (silentStart) {
            setTimeout(() => { silentStart.focus(); }, 50);
        }
    }

    function closeModal() {
        if (!importModal) return;
        importModal.style.display = 'none';
        
        // Deactivate Focus Trap
        document.removeEventListener('keydown', handleFocusTrap);
        
        // Return Focus to Trigger
        if (btnImport) btnImport.focus(); 
    }

    if (btnImport) btnImport.addEventListener('click', openModal);
    if (btnCloseImport) btnCloseImport.addEventListener('click', closeModal);
    
    if (importModal) {
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) closeModal();
        });
        // Special handler for Escape (distinct from the Trap)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && importModal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    // --- 5. DRAG & DROP HANDLING ---
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

    // --- 6. FILE PROCESSOR ---
    function processFile(file) {
        const t = window.translations[window.currentLang] || window.translations['English'];
        if (!file.name.endsWith('.json')) {
            alert(t.importTypeErr);
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
                    alert(t.importSuccess.replace("{count}", data.length));
                    closeModal();
                    if (window.loadShortcuts) window.loadShortcuts();
                });
            } catch (err) {
                alert(t.importInvalid);
            }
        };
        reader.readAsText(file);
    }
});