const api = (typeof browser !== "undefined") ? browser : chrome;

api.commands.onCommand.addListener((command) => {
    if (command !== "_execute_action") {
        sendMessageToActiveTab(command);
    }
});

function sendMessageToActiveTab(actionName) {
    api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;
        api.tabs.sendMessage(tabs[0].id, { action: actionName })
            .catch(() => console.log("WebKeyBind: Content script not ready."));
    });
}