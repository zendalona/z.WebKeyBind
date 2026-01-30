if (typeof browser !== "undefined") {
    chrome = browser;
}
chrome.commands.onCommand.addListener((command) => {
    if (command !== "_execute_action") {
        sendMessageToActiveTab(command);
    }
});

function sendMessageToActiveTab(actionName) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: actionName })
            .catch(() => console.log("WebKeyBind: Content script not ready."));
    });
}