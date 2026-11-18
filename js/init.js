/* ==========================================================
   VELVET DAY - CENTRAL INITIALIZER
   Initializes the app after the DOM and all scripts are ready.
   ========================================================== */
window.VelvetInitializer = (() => {
    "use strict";
    let initialized = false;
    function callInitialize(name, module) {
        if (!module || typeof module.initialize !== "function") {
            console.warn(`Velvet Day: ${name} is unavailable.`);
            return false;
        }
        try { module.initialize(); return true; }
        catch (error) { console.error(`Velvet Day: Failed to initialize ${name}.`, error); return false; }
    }
    function initialize() {
        if (initialized) return;
        console.log("Starting Velvet Day...");
        // app.js has a DOMContentLoaded initializer registered before this file.
        if (window.VelvetDay && !VelvetDay.state.isInitialized) VelvetDay.initialize();
        callInitialize("Theme", window.VelvetTheme);
        callInitialize("Navigation", window.VelvetNavigation);
        [
            ["Tasks", window.VelvetTasks], ["Brain Dump", window.VelvetBrainDump],
            ["Notes", window.VelvetNotes], ["Checklists", window.VelvetChecklist],
            ["Calendar", window.VelvetCalendar], ["Recurring", window.VelvetRecurring],
            ["Reminders", window.VelvetReminders], ["Progress", window.VelvetProgress],
            ["Settings", window.VelvetSettings]
        ].forEach(([name, module]) => callInitialize(name, module));
        callInitialize("Search", window.VelvetSearch);
        callInitialize("PWA", window.VelvetPWA);
        document.addEventListener("velvet:task-completed", event => {
            const title = event.detail?.title;
            window.VelvetToast?.success(title ? `Completed: ${title}` : "Task completed! ✨");
        });
        window.addEventListener("error", event => console.error("Velvet Day error:", event.message));
        window.addEventListener("unhandledrejection", event => console.error("Velvet Day async error:", event.reason));
        initialized = true;
        console.log("Velvet Day is ready ♡");
        document.dispatchEvent(new CustomEvent("velvet:app-initialized"));
    }
    return { initialize, isInitialized: () => initialized };
})();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => VelvetInitializer.initialize(), { once: true });
else VelvetInitializer.initialize();
