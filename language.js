// Global Translation Dictionary
window.translations = {
    English: {
        settingsTitle: "z.WebKeyBind Settings",
        defaultTitle: "Default Shortcuts",
        savedTitle: "Saved Shortcuts",
        addBtn: "Add Shortcut",
        showAll: "Show all Shortcuts",
        showCurrent: "Show Current Site Only",
        deleteAll: "Delete Shortcuts",
        def_row1: "Open or Close Settings Window",
        def_row2: "Use Keyboard to Focus & Record",
        def_row3: "Use Mouse to Hover & Record",
        def_row4: "Read all Shortcuts",
        p_url: "Website URL",
        p_name: "Action Name",
        p_id: "Element ID / Class",
        p_key: "Key",
        no_shortcuts: "No shortcuts found for",
        delete_confirm: "Delete this shortcut?",
        delete_all_confirm: "Delete all visible shortcuts?"
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

window.currentLang = "English"; 

// Function to update static UI text
window.updateLanguageUI = function(lang) {
    window.currentLang = lang; // Update Global State
    const t = window.translations[lang];
    
    // Header & Titles
    document.getElementById('current-lang').innerText = lang;
    document.querySelector('.logo').innerText = t.settingsTitle;
    const titles = document.querySelectorAll('.section-title');
    titles[0].innerText = t.defaultTitle;
    titles[1].innerText = t.savedTitle;

    // Dropdown Active State
    document.querySelectorAll('.dropdown-item').forEach(item => {
        if(item.getAttribute('data-lang') === lang) {
            item.classList.add('active');
            item.querySelector('.check').style.opacity = '1';
        } else {
            item.classList.remove('active');
            item.querySelector('.check').style.opacity = '0';
        }
    });

    // Buttons
    document.querySelector('.btn-add').innerHTML = `<span class="plus">+</span> ${t.addBtn}`;
    document.querySelector('.btn-delete-all').innerText = t.deleteAll;
    
    // Default Table
    const rows = document.querySelectorAll('.default-table tbody tr');
    if(rows.length >= 4) {
        rows[0].cells[0].innerText = t.def_row1;
        rows[1].cells[0].innerText = t.def_row2;
        rows[2].cells[0].innerText = t.def_row3;
        rows[3].cells[0].innerText = t.def_row4;
    }
};

// Event Listeners for Language Dropdown
document.addEventListener('DOMContentLoaded', () => {
    const langTrigger = document.querySelector('.language-dropdown');
    const langMenu = document.getElementById('lang-menu');
    
    langTrigger.addEventListener('click', (e) => {
        langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
        e.stopPropagation();
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const selectedLang = item.getAttribute('data-lang');
            
            // 1. Save Preference
            chrome.storage.local.set({ 'ui_language': selectedLang });
            
            // 2. Update UI
            window.updateLanguageUI(selectedLang);
            
            // 3. Trigger Main List Reload (Defined in popup.js)
            if (window.loadShortcuts) window.loadShortcuts();

            langMenu.style.display = 'none';
            e.stopPropagation();
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        if(langMenu) langMenu.style.display = 'none';
    });
});