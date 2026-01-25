document.addEventListener('DOMContentLoaded', () => {
    const btnExportSite = document.getElementById('btn-export-site');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnImport = document.getElementById('btn-import');
    const menuBurger = document.querySelector('.menu-burger');
    const menuDropdown = document.querySelector('.import-export-dropdown');
    const closeMenuBtn = document.querySelector('.close-menu');
    
    // Modal Elements
    const importModal = document.getElementById('import-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnCloseImport = document.getElementById('btn-close-import');

    // --- 1. MENU TOGGLES ---
    menuBurger.addEventListener('click', (e) => {
        menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
        e.stopPropagation();
    });
    closeMenuBtn.addEventListener('click', () => menuDropdown.style.display = 'none');
    document.addEventListener('click', () => menuDropdown.style.display = 'none');

    // --- 2. EXPORT LOGIC ---
    function exportShortcuts(exportAll) {
        // Access global hostname from popup.js
        const hostname = window.currentSiteHostname || ""; 
        
        chrome.storage.local.get(null, (items) => {
            let allItems = Object.values(items).filter(item => item.id);
            let data = exportAll ? allItems : allItems.filter(item => item.url === hostname);

            if (data.length === 0) {
                alert("No shortcuts found to export.");
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

    // --- 3. IMPORT LOGIC (Modal & Drag-Drop) ---
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            importModal.style.display = 'flex';
            menuDropdown.style.display = 'none';
        });
    }
    if (btnCloseImport) btnCloseImport.addEventListener('click', () => importModal.style.display = 'none');

    // Drag & Drop Handling
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        
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
            fileInput.value = ''; // Reset
        });
    }

    function processFile(file) {
        if (!file.name.endsWith('.json')) {
            alert("Please use a .json file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error();
                
                data.forEach(item => {
                    if (item.id && item.key) chrome.storage.local.set({ [`shortcut_${item.id}`]: item });
                });
                
                alert(`Imported ${data.length} shortcuts!`);
                importModal.style.display = 'none';
                
                // Refresh the list in popup.js
                if (window.loadShortcuts) window.loadShortcuts();
            } catch (err) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    }


    // 1. OPEN MODAL
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            importModal.style.display = 'flex'; // Shows the overlay
            
            // Hide the hamburger menu if it's open
            if(menuDropdown) menuDropdown.style.display = 'none';
        });
    }

    // 2. CLOSE MODAL (Cancel Button)
    if (btnCloseImport) {
        btnCloseImport.addEventListener('click', () => {
            importModal.style.display = 'none';
        });
    }

    // 3. CLOSE MODAL (Clicking Outside)
    importModal.addEventListener('click', (e) => {
        // Only close if clicking the dark background, not the white box
        if (e.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    // ... (Keep your existing drag & drop logic here) ...
});