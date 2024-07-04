export function setupPanels() {
    document.querySelectorAll(".panel_header").forEach((element) => {
        element.addEventListener("click", togglePanel);
    });
}

function togglePanel(event: Event) {
    const button = event.currentTarget as HTMLElement;
    const panel = button.closest(".panel");
    panel
        .querySelector(".panel_content")
        .classList.toggle("panel_content--shown");
}
