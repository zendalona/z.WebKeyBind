// Listener for Key Presses
window.addEventListener('keydown', (event) => {
    // Check if Alt/Option key is pressed
    if (event.altKey) {
        const pressedKey = event.key.toUpperCase();
        console.log("z.WebKeyBind: Alt + " + pressedKey + " pressed.");

        // Fetch all shortcuts from storage
        chrome.storage.local.get(null, (items) => {
            const currentHost = window.location.hostname;
            
            // Find a shortcut that matches the pressed key AND the website
            const match = Object.values(items).find(s => 
                s.key && s.key.toUpperCase() === pressedKey && 
                (currentHost.includes(s.url) || s.url === "<URL>")
            );

            if (match) {
                console.log("z.WebKeyBind: Match found!", match);
                executeShortcut(match);
            } else {
                console.log("z.WebKeyBind: No matching shortcut found for this key/site.");
            }
        });
    }
});

function executeShortcut(shortcut) {
    // Recognition: Try to find by ID first, then by Name
    const element = document.getElementById(shortcut.elementId) || 
                    document.querySelector(`[name="${shortcut.elementId}"]`);

    if (element) {
        console.log("z.WebKeyBind: Element located. Triggering action...");
        
        // Visual Feedback (Action)
        const originalOutline = element.style.outline;
        element.style.outline = "5px solid #7c4dff"; 
        element.focus();
        
        // Feedback for Screen Readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.style.position = 'absolute';
        announcement.style.left = '-9999px';
        announcement.innerText = `Shortcut triggered: ${shortcut.name}`;
        document.body.appendChild(announcement);
        
        // The Trigger: Automatic Click
        element.click(); 

        // Cleanup
        setTimeout(() => {
            element.style.outline = originalOutline;
            announcement.remove();
        }, 1000);
    } else {
        console.error("z.WebKeyBind: Could not find element with ID: " + shortcut.elementId);
        alert("WebKeyBind Error: Could not find element with ID '" + shortcut.elementId + "' on this page.");
    }
}