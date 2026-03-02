// Import utilities
import { normalizeUrl } from './utils.js';

// DOM CACHE
const domCache = {
    btnExportSite: null,
    btnExportAll: null,
    btnImport: null,
    menuContainer: null,
    menuBurger: null,
    menuDropdown: null,
    closeMenuBtn: null,
    importModal: null,
    dropZone: null,
    fileInput: null,
    btnCloseImport: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM cache
    domCache.btnExportSite = document.getElementById('btn-export-site');
    domCache.btnExportAll = document.getElementById('btn-export-all');
    domCache.btnImport = document.getElementById('btn-import');
    domCache.menuContainer = document.querySelector('.menu-container');
    domCache.menuBurger = document.querySelector('.menu-burger');
    domCache.menuDropdown = document.querySelector('.import-export-dropdown');
    domCache.closeMenuBtn = document.querySelector('.close-menu');
    domCache.importModal = document.getElementById('import-modal');
    domCache.dropZone = document.getElementById('drop-zone');
    domCache.fileInput = document.getElementById('file-input');
    domCache.btnCloseImport = document.getElementById('btn-close-import');

    function handleFocusTrap(e) {
        if (e.key !== 'Tab') return;
        const focusableElements = domCache.importModal.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    if (domCache.menuBurger && domCache.menuDropdown) {
        domCache.menuBurger.addEventListener('click', (e) => {
            e.stopPropagation();
            const langMenu = document.getElementById('lang-menu');
            const langBtn = document.getElementById('lang-button');
            if (langMenu) langMenu.style.display = 'none';
            if (langBtn) langBtn.setAttribute('aria-expanded', 'false');

            const isVisible = domCache.menuDropdown.style.display === 'block';
            domCache.menuDropdown.style.display = isVisible ? 'none' : 'block';
        });
        if (domCache.menuContainer) {
            domCache.menuContainer.addEventListener('focusout', (event) => {
                if (!domCache.menuContainer.contains(event.relatedTarget)) {
                    domCache.menuDropdown.style.display = 'none';
                }
            });
        }
    }

    if (domCache.closeMenuBtn) {
        domCache.closeMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            domCache.menuDropdown.style.display = 'none';
        });
    }
    document.addEventListener('click', () => {
        if (domCache.menuDropdown) domCache.menuDropdown.style.display = 'none';
    });

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

    if (domCache.btnExportSite) domCache.btnExportSite.addEventListener('click', () => exportShortcuts(false));
    if (domCache.btnExportAll) domCache.btnExportAll.addEventListener('click', () => exportShortcuts(true));

    function openModal() {
        domCache.importModal.style.display = 'flex';
        if (domCache.menuDropdown) domCache.menuDropdown.style.display = 'none';
        document.addEventListener('keydown', handleFocusTrap);
        const silentStart = document.getElementById('silent-start');
        if (silentStart) {
            setTimeout(() => { silentStart.focus(); }, 50);
        }
    }

    function closeModal() {
        if (!domCache.importModal) return;
        domCache.importModal.style.display = 'none';
        document.removeEventListener('keydown', handleFocusTrap);
        if (domCache.btnImport) domCache.btnImport.focus();
    }

    if (domCache.btnImport) domCache.btnImport.addEventListener('click', openModal);
    if (domCache.btnCloseImport) domCache.btnCloseImport.addEventListener('click', closeModal);

    if (domCache.importModal) {
        domCache.importModal.addEventListener('click', (e) => {
            if (e.target === domCache.importModal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && domCache.importModal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    if (domCache.dropZone) {
        domCache.dropZone.addEventListener('click', () => domCache.fileInput.click());
        domCache.dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                domCache.fileInput.click();
            }
        });
        domCache.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            domCache.dropZone.style.backgroundColor = '#f0ebff';
            domCache.dropZone.style.borderColor = '#7c4dff';
        });
        domCache.dropZone.addEventListener('dragleave', () => {
            domCache.dropZone.style.backgroundColor = '#f9f9f9';
            domCache.dropZone.style.borderColor = '#ccc';
        });
        domCache.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            domCache.dropZone.style.backgroundColor = '#f9f9f9';
            if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
        });
    }

    if (domCache.fileInput) {
        domCache.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) processFile(e.target.files[0]);
            domCache.fileInput.value = '';
        });
    }

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