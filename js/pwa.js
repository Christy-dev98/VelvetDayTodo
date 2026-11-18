/* ==========================================================
   VELVET DAY - PWA MANAGER
   Service worker and install prompt support.
   ========================================================== */
window.VelvetPWA = (() => {
    "use strict";
    let deferredInstallPrompt = null;
    let initialized = false;
    const $ = selector => document.querySelector(selector);
    const config = { serviceWorkerPath: "./service-worker.js", installButtonSelector: "[data-install-app]", statusSelector: "[data-pwa-status]" };
    function isInstalled() { return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true; }
    function updateStatus(message) { const element = $(config.statusSelector); if (element) element.textContent = message; }
    function updateInstallButton() { document.querySelectorAll(config.installButtonSelector).forEach(button => { button.hidden = isInstalled(); button.disabled = !isInstalled() && !deferredInstallPrompt; button.title = deferredInstallPrompt ? "Install Velvet Day" : "Install prompt is not available in this browser yet"; }); }
    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) { updateStatus("Offline installation is not supported by this browser."); return null; }
        if (!window.isSecureContext && location.hostname !== "localhost") { updateStatus("Install requires HTTPS or localhost."); return null; }
        try { const registration = await navigator.serviceWorker.register(config.serviceWorkerPath, { scope: "./" }); updateStatus("Offline support is enabled."); return registration; }
        catch (error) { console.error("Velvet Day: Service worker registration failed.", error); updateStatus("Offline support could not be enabled."); return null; }
    }
    async function installApp() {
        if (!deferredInstallPrompt) { updateStatus("Use your browser menu and choose Install app or Add to Home Screen."); return false; }
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null; updateInstallButton();
        if (choice.outcome === "accepted") window.VelvetToast?.success("Velvet Day installation started!");
        return choice.outcome === "accepted";
    }
    function initialize() {
        if (initialized) return; initialized = true;
        window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt = event; updateInstallButton(); updateStatus("Velvet Day is ready to install."); });
        window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; updateInstallButton(); updateStatus("Velvet Day is installed."); window.VelvetToast?.success("Velvet Day installed successfully!"); });
        document.addEventListener("click", event => { const button = event.target.closest(config.installButtonSelector); if (button) { event.preventDefault(); installApp(); } });
        registerServiceWorker(); updateInstallButton();
        if (isInstalled()) updateStatus("Velvet Day is installed.");
    }
    return { initialize, installApp, registerServiceWorker, isInstalled, updateInstallButton };
})();
