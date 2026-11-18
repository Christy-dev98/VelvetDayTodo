/* ==========================================================
   VELVET DAY - SETTINGS
   Matches the settings controls in index.html.
   ========================================================== */
(function () {
    "use strict";
    let initialized = false;
    const $ = selector => document.querySelector(selector);
    const toast = (message, type = "success") => window.VelvetToast?.show ? VelvetToast.show(message, type) : console.log(message);
    function getSettings() { const value = VelvetStorage.get("settings", {}); return value && typeof value === "object" ? value : {}; }
    function saveSettings() {
        const old = getSettings();
        const settings = {
            ...old,
            theme: $("#themeSelect")?.value || old.theme || "dark",
            compactMode: Boolean($("#compactMode")?.checked),
            remindersEnabled: Boolean($("#remindersEnabled")?.checked),
            reminderTime: $("#reminderTime")?.value || "09:00",
            weekStartsOn: $("#weekStartsOn")?.value || "monday"
        };
        if (!VelvetStorage.set("settings", settings)) { toast("Settings could not be saved.", "error"); return false; }
        if (window.VelvetTheme) VelvetTheme.applyTheme(settings.theme, false);
        document.body.classList.toggle("compact-mode", settings.compactMode);
        document.dispatchEvent(new CustomEvent("velvet:settings-updated", { detail: { settings } }));
        toast("Settings saved ♡");
        updateStorageInfo();
        return true;
    }
    function loadSettings() {
        const settings = getSettings();
        if ($("#themeSelect")) $("#themeSelect").value = settings.theme || "dark";
        if ($("#compactMode")) $("#compactMode").checked = Boolean(settings.compactMode);
        if ($("#remindersEnabled")) $("#remindersEnabled").checked = settings.remindersEnabled !== false;
        if ($("#reminderTime")) $("#reminderTime").value = settings.reminderTime || "09:00";
        if ($("#weekStartsOn")) $("#weekStartsOn").value = settings.weekStartsOn || "monday";
        document.body.classList.toggle("compact-mode", Boolean(settings.compactMode));
    }
    function updateStorageInfo() {
        const element = $("#storageInfo"); if (!element) return;
        const info = VelvetStorage.getStorageInfo?.();
        element.textContent = info ? `Browser storage: ${info.usedKB} KB used${info.hasRecoveryBackup ? " · Recovery backup available" : ""}. Your data stays in this browser unless you export it.` : "Your data stays in this browser unless you export it.";
    }
    function exportBackup() {
        if (typeof VelvetStorage.exportData !== "function") { toast("Backup export is unavailable.", "error"); return; }
        VelvetStorage.exportData(); toast("Backup exported.");
    }
    async function importBackup(file) {
        if (!file) return;
        const result = await VelvetStorage.importData(file);
        if (result.success) { loadSettings(); document.dispatchEvent(new CustomEvent("velvet:data-reloaded", { detail: { type: "import" } })); toast(result.message); }
        else toast(result.message || "Import failed.", "error");
    }
    function initialize() {
        if (initialized) return; initialized = true; loadSettings(); updateStorageInfo();
        $("#saveSettings")?.addEventListener("click", saveSettings);
        $("#themeSelect")?.addEventListener("change", event => { if (window.VelvetTheme) VelvetTheme.applyTheme(event.target.value, false); });
        $("#exportData")?.addEventListener("click", exportBackup);
        $("#importData")?.addEventListener("change", async event => { await importBackup(event.target.files?.[0]); event.target.value = ""; });
        document.addEventListener("velvet:data-updated", updateStorageInfo);
    }
    window.VelvetSettings = { initialize, loadSettings, saveSettings, updateStorageInfo, exportBackup, importBackup };
})();
