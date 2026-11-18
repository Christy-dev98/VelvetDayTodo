/* ==========================================================
   VELVET DAY - MAIN APPLICATION
   File: js/app.js

   Responsibilities:
   - Keep one synchronized view of application data
   - Read and write through VelvetStorage
   - Prevent stale application state from overwriting newer data
   - Coordinate page visibility and page-change events
   - Apply the saved theme
   - Handle the mobile sidebar and theme button
   - Expose the shared VelvetDay API

   Load order:
   utils.js -> storage.js -> toast.js -> theme.js ->
   navigation.js -> app.js -> feature modules -> init.js
   ========================================================== */

(function () {
    "use strict";

    // ------------------------------------------------------
    // 1. CONFIGURATION
    // ------------------------------------------------------

    const config = {
        appName: "Velvet Day",
        defaultPage: "dashboard",
        defaultTheme: "dark",
        storageKey: "velvet-day:data:v1"
    };

    const pageInformation = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Make today a little more intentional."
        },
        tasks: {
            title: "My Tasks",
            subtitle: "One step at a time."
        },
        calendar: {
            title: "Calendar",
            subtitle: "Make space for what matters."
        },
        notes: {
            title: "My Notes",
            subtitle: "Thoughts worth keeping."
        },
        "brain-dump": {
            title: "Brain Dump",
            subtitle: "Let your thoughts out."
        },
        checklists: {
            title: "My Checklists",
            subtitle: "Little things, all organized."
        },
        recurring: {
            title: "Recurring Tasks",
            subtitle: "Build little habits."
        },
        reminders: {
            title: "Reminders",
            subtitle: "Things you don't want to forget."
        },
        progress: {
            title: "My Progress",
            subtitle: "Look how far you've come."
        },
        settings: {
            title: "Settings",
            subtitle: "Make Velvet Day yours."
        }
    };

    // ------------------------------------------------------
    // 2. APPLICATION STATE
    // ------------------------------------------------------

    const state = {
        data: {},
        currentPage: config.defaultPage,
        previousPage: null,
        isInitialized: false
    };

    // ------------------------------------------------------
    // 3. GENERAL HELPERS
    // ------------------------------------------------------

    function getElement(selector, parent = document) {
        return parent.querySelector(selector);
    }

    function getAllElements(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    function isPlainObject(value) {
        if (value === null || typeof value !== "object") {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    function cloneValue(value) {
        if (value === undefined) {
            return undefined;
        }

        if (value === null || typeof value !== "object") {
            return value;
        }

        try {
            if (typeof structuredClone === "function") {
                return structuredClone(value);
            }

            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            console.warn("Velvet Day: Could not clone a data value.", error);
            return value;
        }
    }

    // Merge objects recursively, but replace arrays instead of merging
    // their indexes. This is important for task/note collections.
    function mergeObjects(base, updates) {
        if (!isPlainObject(updates)) {
            return cloneValue(updates);
        }

        const result = isPlainObject(base) ? { ...base } : {};

        Object.keys(updates).forEach(function (key) {
            const updateValue = updates[key];
            const currentValue = result[key];

            if (isPlainObject(updateValue) && isPlainObject(currentValue)) {
                result[key] = mergeObjects(currentValue, updateValue);
            } else {
                result[key] = cloneValue(updateValue);
            }
        });

        return result;
    }

    function getPathValue(source, path) {
        return path.split(".").reduce(function (value, part) {
            if (
                value === null ||
                value === undefined ||
                !Object.prototype.hasOwnProperty.call(value, part)
            ) {
                return undefined;
            }

            return value[part];
        }, source);
    }

    function isSafePath(path) {
        if (typeof path !== "string" || !path.trim()) {
            return false;
        }

        const parts = path.split(".");
        const forbiddenParts = ["__proto__", "prototype", "constructor"];

        return parts.every(function (part) {
            return part.length > 0 && !forbiddenParts.includes(part);
        });
    }

    // ------------------------------------------------------
    // 4. LOAD AND SYNCHRONIZE APPLICATION DATA
    // ------------------------------------------------------

    function loadAppData() {
        if (!window.VelvetStorage || typeof VelvetStorage.getAll !== "function") {
            console.error("Velvet Day: storage.js is missing or has not loaded.");
            return {};
        }

        try {
            const data = VelvetStorage.getAll();
            return isPlainObject(data) ? data : {};
        } catch (error) {
            console.error("Velvet Day: Failed to load saved data.", error);
            return {};
        }
    }

    function synchronizeState(data) {
        if (isPlainObject(data)) {
            state.data = cloneValue(data);
        } else {
            state.data = loadAppData();
        }

        if (!isPlainObject(state.data.settings)) {
            state.data.settings = { theme: config.defaultTheme };
        }

        return state.data;
    }

    // Any write performed through VelvetStorage raises this event.
    // Keep the application state aligned even when a feature module
    // writes directly through VelvetStorage instead of VelvetDay.set().
    function handleStorageUpdated(event) {
        const detail = event && isPlainObject(event.detail)
            ? event.detail
            : {};

        synchronizeState(detail.data);

        document.dispatchEvent(
            new CustomEvent("velvet:data-updated", {
                detail: {
                    type: detail.type || "save",
                    data: cloneValue(state.data)
                }
            })
        );

        if (detail.type === "import" || detail.type === "clear") {
            document.dispatchEvent(
                new CustomEvent("velvet:data-reloaded", {
                    detail: {
                        type: detail.type,
                        data: cloneValue(state.data)
                    }
                })
            );
        }
    }

    // Synchronize changes made in another browser tab.
    function handleBrowserStorageUpdated(event) {
        if (event.key !== null && event.key !== config.storageKey) {
            return;
        }

        synchronizeState(loadAppData());

        document.dispatchEvent(
            new CustomEvent("velvet:data-reloaded", {
                detail: {
                    type: "external",
                    data: cloneValue(state.data)
                }
            })
        );
    }

    function refreshData(notify = true) {
        synchronizeState(loadAppData());

        if (notify) {
            document.dispatchEvent(
                new CustomEvent("velvet:data-reloaded", {
                    detail: {
                        type: "refresh",
                        data: cloneValue(state.data)
                    }
                })
            );
        }

        return cloneValue(state.data);
    }

    // ------------------------------------------------------
    // 5. SAVE DATA SAFELY
    // ------------------------------------------------------
    // Always merge updates with the latest persisted snapshot.
    // Never merge against only state.data: another module may
    // have saved newer data since state.data was last read.
    // ------------------------------------------------------

    function save(updates) {
        if (!isPlainObject(updates)) {
            console.error("Velvet Day: save() expects an object.");
            return false;
        }

        if (!window.VelvetStorage || typeof VelvetStorage.saveData !== "function") {
            console.error("Velvet Day: Storage is unavailable; changes were not saved.");
            return false;
        }

        try {
            const latestData = loadAppData();
            const updatedData = mergeObjects(latestData, updates);
            const saved = VelvetStorage.saveData(updatedData);

            if (!saved) {
                console.error("Velvet Day: The browser could not persist the changes.");
                return false;
            }

            // storage.js dispatches velvet:storage-updated on window.
            // Synchronize here as a fallback in case that event is unavailable.
            synchronizeState(updatedData);

            return true;
        } catch (error) {
            console.error("Velvet Day: Failed to save application data.", error);
            return false;
        }
    }

    // ------------------------------------------------------
    // 6. READ DATA
    // ------------------------------------------------------

    function get(key, fallback = null) {
        if (typeof key !== "string" || !key.trim()) {
            return fallback;
        }

        // Refresh from storage before reading. This also protects
        // against a module that has written directly to storage.
        synchronizeState(loadAppData());

        const value = getPathValue(state.data, key);
        return value === undefined ? fallback : cloneValue(value);
    }

    function getAll() {
        synchronizeState(loadAppData());
        return cloneValue(state.data);
    }

    // ------------------------------------------------------
    // 7. SET DATA
    // Supports simple and nested keys, for example:
    // set("tasks", tasks)
    // set("settings.theme", "light")
    // ------------------------------------------------------

    function set(key, value) {
        if (!isSafePath(key)) {
            console.error("Velvet Day: Invalid data key supplied to set().");
            return false;
        }

        const updates = {};
        const parts = key.split(".");
        let current = updates;

        for (let index = 0; index < parts.length - 1; index++) {
            current[parts[index]] = {};
            current = current[parts[index]];
        }

        current[parts[parts.length - 1]] = value;
        return save(updates);
    }

    // ------------------------------------------------------
    // 8. REMOVE DATA
    // ------------------------------------------------------

    function remove(key) {
        if (!isSafePath(key)) {
            console.error("Velvet Day: Invalid data key supplied to remove().");
            return false;
        }

        const latestData = loadAppData();
        const parts = key.split(".");
        const finalKey = parts.pop();
        let parent = latestData;

        for (const part of parts) {
            if (!isPlainObject(parent[part])) {
                return false;
            }

            parent = parent[part];
        }

        if (!Object.prototype.hasOwnProperty.call(parent, finalKey)) {
            return false;
        }

        delete parent[finalKey];

        if (!window.VelvetStorage || typeof VelvetStorage.saveData !== "function") {
            return false;
        }

        try {
            const saved = VelvetStorage.saveData(latestData);

            if (saved) {
                synchronizeState(latestData);
            }

            return saved;
        } catch (error) {
            console.error("Velvet Day: Failed to remove saved data.", error);
            return false;
        }
    }

    // ------------------------------------------------------
    // 9. THEME MANAGEMENT
    // ------------------------------------------------------

    function updateThemeButtons(theme) {
        if (
            window.VelvetTheme &&
            typeof VelvetTheme.updateThemeButtons === "function"
        ) {
            VelvetTheme.updateThemeButtons(theme);
            return;
        }

        getAllElements("[data-theme-toggle]").forEach(function (button) {
            const isDark = theme === "dark";
            button.textContent = isDark ? "☀" : "☾";
            button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
            button.setAttribute(
                "aria-label",
                isDark ? "Switch to light mode" : "Switch to dark mode"
            );
        });
    }

    function applyTheme(theme, savePreference = false) {
        const selectedTheme = theme === "light" ? "light" : "dark";

        if (
            window.VelvetTheme &&
            typeof VelvetTheme.applyTheme === "function"
        ) {
            return VelvetTheme.applyTheme(selectedTheme, savePreference);
        }

        document.documentElement.setAttribute("data-theme", selectedTheme);
        updateThemeButtons(selectedTheme);

        if (savePreference) {
            set("settings.theme", selectedTheme);
        }

        return selectedTheme;
    }

    function toggleTheme() {
        if (
            window.VelvetTheme &&
            typeof VelvetTheme.toggleTheme === "function"
        ) {
            return VelvetTheme.toggleTheme();
        }

        const currentTheme =
            document.documentElement.getAttribute("data-theme") || config.defaultTheme;
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        applyTheme(nextTheme, true);
        return nextTheme;
    }

    function initializeTheme() {
        const settings = get("settings", {});
        const savedTheme = settings && settings.theme
            ? settings.theme
            : config.defaultTheme;

        applyTheme(savedTheme, false);
    }

    // ------------------------------------------------------
    // 10. PAGE NAVIGATION API
    // navigation.js owns navigation clicks and browser history.
    // app.js only performs the page display operation and emits
    // velvet:page-changed so navigation.js can stay synchronized.
    // ------------------------------------------------------

    function updatePageTitle(pageName) {
        const pageInfo = pageInformation[pageName] || {
            title: pageName || config.appName,
            subtitle: ""
        };

        const titleElement = getElement("#pageTitle");
        const subtitleElement = getElement("#pageSubtitle");
        const alternateTitle = getElement("[data-page-title]");
        const alternateSubtitle = getElement("[data-page-subtitle]");

        if (titleElement) {
            titleElement.textContent = pageInfo.title;
        }

        if (subtitleElement) {
            subtitleElement.textContent = pageInfo.subtitle;
        }

        if (alternateTitle && alternateTitle !== titleElement) {
            alternateTitle.textContent = pageInfo.title;
        }

        if (alternateSubtitle && alternateSubtitle !== subtitleElement) {
            alternateSubtitle.textContent = pageInfo.subtitle;
        }

        document.title = `${pageInfo.title} | ${config.appName}`;
    }

    function navigate(pageName, options = {}) {
        if (typeof pageName !== "string" || !pageName.trim()) {
            return false;
        }

        const pageSections = getAllElements(".page-section[data-page]");
        const targetPage = pageSections.find(function (section) {
            return section.dataset.page === pageName;
        });

        if (!targetPage) {
            console.warn(`Velvet Day: Page "${pageName}" was not found.`);
            return false;
        }

        const previousPage = state.currentPage;
        const pageChanged = previousPage !== pageName;

        if (pageChanged) {
            state.previousPage = previousPage;
        }

        state.currentPage = pageName;

        pageSections.forEach(function (section) {
            const isActive = section.dataset.page === pageName;
            section.classList.toggle("active", isActive);
            section.hidden = !isActive;
        });

        getAllElements("[data-page-target]").forEach(function (link) {
            const isActive = link.dataset.pageTarget === pageName;
            link.classList.toggle("active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        updatePageTitle(pageName);
        closeMobileSidebar();

        if (pageChanged || options.force) {
            document.dispatchEvent(
                new CustomEvent("velvet:page-changed", {
                    detail: {
                        page: pageName,
                        previousPage: previousPage
                    }
                })
            );
        }

        return true;
    }

    // ------------------------------------------------------
    // 11. MOBILE SIDEBAR
    // ------------------------------------------------------

    function setSidebarState(isOpen) {
        const sidebar = getElement("#sidebar");
        const overlay = getElement("#sidebarOverlay");
        const menuToggle = getElement("#menuToggle");

        if (sidebar) {
            sidebar.classList.toggle("open", isOpen);
        }

        if (overlay) {
            overlay.classList.toggle("active", isOpen);
            overlay.setAttribute("aria-hidden", String(!isOpen));
        }

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation" : "Open navigation"
            );
        }

        document.body.classList.toggle("sidebar-open", isOpen);
    }

    function toggleMobileSidebar() {
        const sidebar = getElement("#sidebar");

        if (!sidebar) {
            return false;
        }

        setSidebarState(!sidebar.classList.contains("open"));
        return true;
    }

    function closeMobileSidebar() {
        setSidebarState(false);
    }

    // ------------------------------------------------------
    // 12. GLOBAL UI EVENTS
    // ------------------------------------------------------

    function handleGlobalClick(event) {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        if (target.closest("#menuToggle")) {
            event.preventDefault();
            toggleMobileSidebar();
            return;
        }

        if (target.closest("#sidebarClose, #sidebarOverlay")) {
            event.preventDefault();
            closeMobileSidebar();
            return;
        }

        if (target.closest("[data-theme-toggle]")) {
            event.preventDefault();
            toggleTheme();
        }
    }

    function handleGlobalKeydown(event) {
        if (event.key === "Escape") {
            closeMobileSidebar();
        }
    }

    function setupEventListeners() {
        document.addEventListener("click", handleGlobalClick);
        document.addEventListener("keydown", handleGlobalKeydown);

        // CustomEvent is emitted by storage.js for writes in this tab.
        window.addEventListener("velvet:storage-updated", handleStorageUpdated);

        // Native StorageEvent is emitted when another tab changes localStorage.
        window.addEventListener("storage", handleBrowserStorageUpdated);
    }

    // ------------------------------------------------------
    // 13. INITIALIZATION
    // ------------------------------------------------------

    function initializeNavigation() {
        const hashPage = window.location.hash.replace(/^#/, "").trim();
        const pageExists = getAllElements(".page-section[data-page]").some(
            function (section) {
                return section.dataset.page === hashPage;
            }
        );

        const initialPage = pageExists ? hashPage : config.defaultPage;
        navigate(initialPage, { force: true });
    }

    function initialize() {
        if (state.isInitialized) {
            return true;
        }

        console.log("💜 Starting Velvet Day...");

        // Read the current persisted snapshot before feature modules load.
        synchronizeState(loadAppData());

        // Register storage and global UI events before feature modules initialize.
        setupEventListeners();

        // Apply the saved theme without writing it back unnecessarily.
        initializeTheme();

        // navigation.js manages clicks/history; this applies the initial page.
        initializeNavigation();

        state.isInitialized = true;

        console.log("✨ Velvet Day application core is ready.");

        document.dispatchEvent(
            new CustomEvent("velvet:app-core-ready", {
                detail: {
                    data: cloneValue(state.data),
                    page: state.currentPage
                }
            })
        );

        return true;
    }

    // ------------------------------------------------------
    // 14. PUBLIC APPLICATION API
    // ------------------------------------------------------

    window.VelvetDay = {
        state: state,
        config: config,

        initialize: initialize,

        // Data access and persistence
        get: get,
        getAll: getAll,
        set: set,
        save: save,
        remove: remove,
        refreshData: refreshData,

        // Navigation
        navigate: navigate,
        updatePageTitle: updatePageTitle,

        // Theme
        applyTheme: applyTheme,
        toggleTheme: toggleTheme,

        // Sidebar
        toggleMobileSidebar: toggleMobileSidebar,
        closeMobileSidebar: closeMobileSidebar
    };

    // ------------------------------------------------------
    // 15. START AFTER THE HTML HAS BEEN PARSED
    // ------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }

})();
