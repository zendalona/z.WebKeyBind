document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const shortcutList = document.querySelector('.shortcut-list');
    const addBtn = document.querySelector('.btn-add');
    const showAllBtn = document.querySelector('.btn-show-all');
    const deleteAllBtn = document.querySelector('.btn-delete-all');
    const sectionTitles = document.querySelectorAll('.section-title');
    
    // Custom Dropdown Elements
    const langTrigger = document.querySelector('.language-dropdown');
    const langMenu = document.getElementById('lang-menu');
    const currentLangText = document.getElementById('current-lang');
    const langItems = document.querySelectorAll('.dropdown-item');

    // Menu Elements
    const menuBurger = document.querySelector('.menu-burger');
    const menuDropdown = document.querySelector('.import-export-dropdown');
    const closeMenuBtn = document.querySelector('.close-menu');

    // Default Table Elements (for translation)
    const defaultTableRows = document.querySelectorAll('.default-table tbody tr');

    // --- TRANSLATION DICTIONARY ---
    const translations = {
        English: {
            // UI Headings & Buttons
            settingsTitle: "z.WebKeyBind Settings",
            defaultTitle: "Default Shortcuts",
            savedTitle: "Saved Shortcuts",
            addBtn: "Add Shortcut",
            showAll: "Show all Shortcuts",
            showCurrent: "Show Current Site Only",
            deleteAll: "Delete Shortcuts",
            
            // Default Table Rows
            def_row1: "Open or Close Settings Window",
            def_row2: "Use Keyboard to Focus & Record",
            def_row3: "Use Mouse to Hover & Record",
            def_row4: "Read all Shortcuts",

            // Dynamic Inputs (Placeholders)
            p_url: "Website URL",
            p_name: "Action Name",
            p_id: "Element ID / Class",
            p_key: "Key",
            
            // Messages
            no_shortcuts: "No shortcuts found for",
            delete_confirm: "Delete this shortcut?",
            delete_all_confirm: "Are you sure you want to delete all visible shortcuts?"
        },
        हिंदी: {
            settingsTitle: "z.WebKeyBind सेटिंग्स",
            defaultTitle: "डिफ़ॉल्ट शॉर्टकट",
            savedTitle: "सहेजे गए शॉर्टकट",
            addBtn: "शॉर्टकट जोड़ें",
            showAll: "सभी शॉर्टकट देखें",
            showCurrent: "केवल वर्तमान साइट",
            deleteAll: "शॉर्टकट हटाएं",
            
            def_row1: "सेटिंग्स विंडो खोलें या बंद करें",
            def_row2: "रिकॉर्ड करने के लिए कीबोर्ड का उपयोग करें",
            def_row3: "रिकॉर्ड करने के लिए माउस का उपयोग करें",
            def_row4: "सभी शॉर्टकट पढ़ें",

            p_url: "वेबसाइट URL",
            p_name: "क्रिया का नाम",
            p_id: "तत्व ID (Element ID)",
            p_key: "कूंजी",
            
            no_shortcuts: "इसके लिए कोई शॉर्टकट नहीं मिला:",
            delete_confirm: "क्या आप इस शॉर्टकट को हटाना चाहते हैं?",
            delete_all_confirm: "क्या आप सभी दिखाई देने वाले शॉर्टकट हटाना चाहते हैं?"
        },
        मराठी: {
            settingsTitle: "z.WebKeyBind सेटिंग्स",
            defaultTitle: "डीफॉल्ट शॉर्टकट",
            savedTitle: "जतन केलेले शॉर्टकट",
            addBtn: "शॉर्टकट जोडा",
            showAll: "सर्व शॉर्टकट पहा",
            showCurrent: "फक्त वर्तमान साइट",
            deleteAll: "शॉर्टकट हटवा",
            
            def_row1: "सेटिंग्ज विंडो उघडा किंवा बंद करा",
            def_row2: "रेकॉर्ड करण्यासाठी कीबोर्ड वापरा",
            def_row3: "रेकॉर्ड करण्यासाठी माऊस वापरा",
            def_row4: "सर्व शॉर्टकट वाचा",

            p_url: "संकेतस्थळ URL",
            p_name: "क्रियेचे नाव",
            p_id: "एलिमेंट ID",
            p_key: "कळ (Key)",
            
            no_shortcuts: "यासाठी शॉर्टकट सापडले नाहीत:",
            delete_confirm: "हा शॉर्टकट हटवायचा का?",
            delete_all_confirm: "तुम्हाला नक्की सर्व शॉर्टकट हटवायचे आहेत का?"
        },
        മലയാളം: {
            settingsTitle: "z.WebKeyBind ക്രമീകരണങ്ങൾ",
            defaultTitle: "സ്ഥിരസ്ഥിതി കുറുക്കുവഴികൾ",
            savedTitle: "സൂക്ഷിച്ച കുറുക്കുവഴികൾ",
            addBtn: "കുറുക്കുവഴി ചേർക്കുക",
            showAll: "എല്ലാ കുറുക്കുവഴികളും",
            showCurrent: "ഈ സൈറ്റിൽ മാത്രം",
            deleteAll: "കുറുക്കുവഴികൾ നീക്കം ചെയ്യുക",
            
            def_row1: "ക്രമീകരണ ജാലകം തുറക്കുക/അടയ്ക്കുക",
            def_row2: "റെക്കോർഡ് ചെയ്യാൻ കീബോർഡ് ഉപയോഗിക്കുക",
            def_row3: "റെക്കോർഡ് ചെയ്യാൻ മൗസ് ഉപയോഗിക്കുക",
            def_row4: "എല്ലാ കുറുക്കുവഴികളും വായിക്കുക",

            p_url: "വെബ്സൈറ്റ് URL",
            p_name: "പ്രവർത്തനത്തിന്റെ പേര്",
            p_id: "എലമെന്റ് ID",
            p_key: "കീ",
            
            no_shortcuts: "കുറുക്കുവഴികളൊന്നും കണ്ടെത്തിയില്ല:",
            delete_confirm: "ഈ കുറുക്കുവഴി നീക്കം ചെയ്യണോ?",
            delete_all_confirm: "എല്ലാ കുറുക്കുവഴികളും നീക്കം ചെയ്യണോ?"
        }
    };

    // State Variables
    let currentSiteHostname = "";
    let isShowingAll = false;
    let currentLang = "English"; 

    // =======================================================
    // 1. INITIALIZATION
    // =======================================================
    chrome.storage.local.get(['ui_language'], (result) => {
        if (result.ui_language) {
            currentLang = result.ui_language;
        }
        // Apply Language to UI immediately
        updateLanguageUI(currentLang);

        // Get Current Tab URL for Site Separation
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    currentSiteHostname = new URL(tabs[0].url).hostname;
                } catch (e) {
                    currentSiteHostname = "local";
                }
            }
            loadShortcuts();
        });
    });

    // =======================================================
    // 2. UI & DROPDOWN HANDLERS
    // =======================================================
    
    // Toggle Language Menu
    langTrigger.addEventListener('click', (e) => {
        // Toggle visibility via inline style or class
        langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
        e.stopPropagation();
    });

    // Handle Language Selection
    langItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const selectedLang = item.getAttribute('data-lang');
            currentLang = selectedLang;
            
            // Save & Update
            chrome.storage.local.set({ 'ui_language': selectedLang });
            updateLanguageUI(selectedLang);
            loadShortcuts(); // Reload inputs to show new placeholders
            
            // Close Menu
            langMenu.style.display = 'none';
            e.stopPropagation();
        });
    });

    // Burger Menu Logic
    menuBurger.addEventListener('click', (e) => {
        menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
        e.stopPropagation();
    });

    closeMenuBtn.addEventListener('click', () => {
        menuDropdown.style.display = 'none';
    });

    // Close all menus when clicking outside
    document.addEventListener('click', () => {
        langMenu.style.display = 'none';
        menuDropdown.style.display = 'none';
    });

    // =======================================================
    // 3. TRANSLATION LOGIC
    // =======================================================
    function updateLanguageUI(lang) {
        const t = translations[lang];
        
        // Update Header Badge
        currentLangText.innerText = lang;

        // Update Dropdown Active State
        langItems.forEach(item => {
            if(item.getAttribute('data-lang') === lang) {
                item.classList.add('active');
                item.querySelector('.check').style.opacity = '1';
            } else {
                item.classList.remove('active');
                item.querySelector('.check').style.opacity = '0';
            }
        });

        // Update Static Text
        document.querySelector('.logo').innerText = t.settingsTitle;
        sectionTitles[0].innerText = t.defaultTitle; // Default Shortcuts Header
        sectionTitles[1].innerText = t.savedTitle;   // Saved Shortcuts Header
        
        // Update Buttons
        addBtn.innerHTML = `<span class="plus">+</span> ${t.addBtn}`;
        showAllBtn.innerHTML = `${isShowingAll ? t.showCurrent : t.showAll} <span class="arrow-circle">${isShowingAll ? '⌃' : '⌄'}</span>`;
        deleteAllBtn.innerText = t.deleteAll;

        // Update Default Shortcuts Table Rows
        if(defaultTableRows.length >= 4) {
            defaultTableRows[0].cells[0].innerText = t.def_row1;
            defaultTableRows[1].cells[0].innerText = t.def_row2;
            defaultTableRows[2].cells[0].innerText = t.def_row3;
            defaultTableRows[3].cells[0].innerText = t.def_row4;
        }
    }

    // =======================================================
    // 4. SHORTCUT DATA LOGIC
    // =======================================================
    function loadShortcuts() {
        shortcutList.innerHTML = ''; 
        const t = translations[currentLang];

        chrome.storage.local.get(null, (items) => {
            // Filter out internal settings (like ui_language)
            const allShortcuts = Object.values(items).filter(item => item.id);
            
            // Site Separation Logic
            const displayList = isShowingAll 
                ? allShortcuts 
                : allShortcuts.filter(s => currentSiteHostname.includes(s.url) || s.url === "<URL>");

            displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            if (displayList.length === 0) {
                const msg = document.createElement('div');
                msg.style.cssText = "text-align:center; padding:20px; color:#999; font-size:13px; font-style:italic;";
                msg.innerText = `${t.no_shortcuts} ${isShowingAll ? '' : currentSiteHostname}`;
                shortcutList.appendChild(msg);
            } else {
                displayList.forEach((data, index) => createRow(data, index + 1));
            }
        });
    }

    function createRow(data, index) {
        const t = translations[currentLang];
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

        // Auto-Save Listeners
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                data[field] = e.target.value;
                chrome.storage.local.set({ [`shortcut_${data.id}`]: data });
            });
        });

        // Delete Listener
        row.querySelector('.btn-remove').addEventListener('click', () => {
            if (confirm(t.delete_confirm)) {
                chrome.storage.local.remove(`shortcut_${data.id}`, () => {
                    row.remove();
                    // Optional: Re-number rows or reload
                    loadShortcuts(); 
                });
            }
        });

        shortcutList.appendChild(row);
    }

    // =======================================================
    // 5. BUTTON ACTIONS
    // =======================================================
    
    // Show All / Current Site Toggle
    showAllBtn.addEventListener('click', () => {
        isShowingAll = !isShowingAll;
        updateLanguageUI(currentLang); // Update button text
        loadShortcuts(); // Reload list
    });

    // Add New Shortcut
    addBtn.addEventListener('click', () => {
        const uniqueId = Date.now().toString();
        const newShortcut = {
            id: uniqueId,
            url: currentSiteHostname, 
            name: "",
            elementId: "",
            key: ""
        };

        chrome.storage.local.set({ [`shortcut_${uniqueId}`]: newShortcut }, () => {
            loadShortcuts();
        });
    });

    // Delete All Shortcuts (Context Aware)
    deleteAllBtn.addEventListener('click', () => {
        const t = translations[currentLang];
        if(confirm(t.delete_all_confirm)) {
            chrome.storage.local.get(null, (items) => {
                const idsToDelete = [];
                Object.values(items).forEach(s => {
                    // Only delete what is currently visible to the user
                    if (s.id && (isShowingAll || s.url.includes(currentSiteHostname) || s.url === "<URL>")) {
                        idsToDelete.push(`shortcut_${s.id}`);
                    }
                });
                if (idsToDelete.length > 0) {
                    chrome.storage.local.remove(idsToDelete, loadShortcuts);
                }
            });
        }
    });
});