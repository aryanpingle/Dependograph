export function setupSettingsPanel() {
    document
        .querySelector(".settings_header")
        ?.addEventListener("click", toggleSettings);
}

function toggleSettings() {
    document
        .querySelector(".settings_panel")
        .classList.toggle("settings_panel--expanded");
}
