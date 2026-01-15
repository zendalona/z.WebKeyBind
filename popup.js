document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.querySelector('.btn-add');
    const shortcutList = document.querySelector('.shortcut-list');

    // 1. Load existing shortcuts from permanent memory on startup
    chrome.storage.local.get(null, (items) => {
        // Sort keys to maintain order if necessary
        Object.values(items).forEach((data, index) => {
            if (data.id) { // Ensure it's a shortcut object
                addNewRowToUI(data, index + 1);
            }
        });
    });

    // 2. Handle "Add Shortcut" button click
    addBtn.addEventListener('click', () => {
        const newId = Date.now().toString(); // Unique ID for memorization
        const newData = {
            id: newId,
            url: "<URL>",
            name: "",
            elementId: "",
            key: ""
        };

        // Save to storage immediately (Memorization)
        chrome.storage.local.set({ [`shortcut_${newId}`]: newData }, () => {
            const nextIndex = shortcutList.children.length + 1;
            addNewRowToUI(newData, nextIndex);
        });
    });

    // 3. Function to create and append the editable row
    function addNewRowToUI(data, index) {
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.setAttribute('data-id', data.id);

        row.innerHTML = `
            <span class="index">${index}</span>
            <input type="text" value="${data.url}" class="input-field" data-field="url">
            <input type="text" placeholder="Name" value="${data.name}" class="input-field" data-field="name">
            <input type="text" placeholder="Element ID" value="${data.elementId}" class="input-field" data-field="elementId">
            <input type="text" placeholder="Option/Alt+" value="${data.key}" class="input-field" data-field="key">
            <button class="btn-remove">×</button>
        `;

        // Add "Auto-Save" logic: when user stops typing, update storage
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                const value = e.target.value;
                
                chrome.storage.local.get(`shortcut_${data.id}`, (res) => {
                    const entry = res[`shortcut_${data.id}`];
                    entry[field] = value;
                    chrome.storage.local.set({ [`shortcut_${data.id}`]: entry });
                });
            });
        });

        // Add "Remove" logic
        row.querySelector('.btn-remove').addEventListener('click', () => {
            chrome.storage.local.remove(`shortcut_${data.id}`, () => {
                row.remove();
                updateRowNumbers(); // Renumber rows after deletion
            });
        });

        shortcutList.appendChild(row);
    }

    // Helper to keep the 1, 2, 3 sequence correct
    function updateRowNumbers() {
        const rows = document.querySelectorAll('.shortcut-row');
        rows.forEach((row, i) => {
            row.querySelector('.index').innerText = i + 1;
        });
    }

     document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function () {
                // 1. Get the language name from the clicked item
                const selectedLang = this.getAttribute('data-lang');

                // 2. Update the main button text
                document.getElementById('current-lang').innerText = selectedLang;

                // 3. Remove 'active' class from all items
                document.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));

                // 4. Add 'active' class to the clicked item
                this.classList.add('active');

                // Optional: Close dropdown by removing focus (useful for mobile)
                document.activeElement.blur();
            });
        });

        // Close Import/Export menu logic
        document.querySelector('.close-menu').addEventListener('click', () => {
            document.activeElement.blur();
        });
});