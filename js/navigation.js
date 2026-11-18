/* ==========================================================
   VELVET DAY - NAVIGATION MANAGER
   File: js/navigation.js

   Responsibilities:
   - Navigate between the pages defined in index.html
   - Keep navigation links and page sections in sync
   - Update the page title and subtitle
   - Support browser Back and Forward buttons
   - Support keyboard shortcuts
   - Close the mobile sidebar after navigation

   HTML conventions used by this project:
   - Navigation links: [data-page-target="tasks"]
   - Page sections:   .page-section[data-page="tasks"]
   - Page title:      #pageTitle
   - Page subtitle:   #pageSubtitle

   This module delegates page visibility changes to
   VelvetDay.navigate() when app.js is available.
   ========================================================== */

(function () {
    "use strict";

    // ------------------------------------------------------
    // 1. PAGE CONFIGURATION
    // These keys must match data-page and data-page-target
    // values in index.html exactly.
    // ------------------------------------------------------

    const config = {
        defaultPage: "dashboard",

        pages: {
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
        }
    };

    // ------------------------------------------------------
    // 2. NAVIGATION STATE
    // ------------------------------------------------------

    const state = {
        currentPage: config.defaultPage,
        previousPage: null,
        history: [],
        isInitialized: false
    };

    // Prevent the app's page-changed event from being treated
    // as a second navigation while this module is navigating.
    let navigationInProgress = false;

    // ------------------------------------------------------
    // 3. PAGE HELPERS
    // ------------------------------------------------------

    function getPageInfo(pageName) {
        return config.pages[pageName] || {
            title: pageName || config.pages[config.defaultPage].title,
            subtitle: ""
        };
    }

    function pageExists(pageName) {
        if (!pageName || !Object.prototype.hasOwnProperty.call(config.pages, pageName)) {
            return false;
        }

        // Confirm that the page actually exists in the current HTML.
        return Array.from(
            document.querySelectorAll(".page-section[data-page]")
        ).some(function (section) {
            return section.dataset.page === pageName;
        });
    }

    // ------------------------------------------------------
    // 4. PAGE HEADING
    // The current index.html uses #pageTitle and #pageSubtitle.
    // ------------------------------------------------------

    function updatePageHeading(pageName) {
        const pageInfo = getPageInfo(pageName);
        const titleElement = document.getElementById("pageTitle");
        const subtitleElement = document.getElementById("pageSubtitle");

        if (titleElement) {
            titleElement.textContent = pageInfo.title;
        }

        if (subtitleElement) {
            subtitleElement.textContent = pageInfo.subtitle;
        }

        // Also support optional data-attribute headings.
        const alternateTitle = document.querySelector("[data-page-title]");
        const alternateSubtitle = document.querySelector("[data-page-subtitle]");

        if (alternateTitle && alternateTitle !== titleElement) {
            alternateTitle.textContent = pageInfo.title;
        }

        if (alternateSubtitle && alternateSubtitle !== subtitleElement) {
            alternateSubtitle.textContent = pageInfo.subtitle;
        }

        document.title = `${pageInfo.title} | Velvet Day`;
    }

    // ------------------------------------------------------
    // 5. ACTIVE NAVIGATION LINK
    // Only navigation links use data-page-target.
    // Page sections use data-page and are NOT click targets.
    // ------------------------------------------------------

    function updateActiveNavigation(pageName) {
        document.querySelectorAll("[data-page-target]").forEach(function (item) {
            const isActive = item.dataset.pageTarget === pageName;

            item.classList.toggle("active", isActive);

            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });
    }

    // ------------------------------------------------------
    // 6. FALLBACK PAGE DISPLAY
    // Used only if app.js is unavailable.
    // ------------------------------------------------------

    function showPageContent(pageName) {
        document.querySelectorAll(".page-section[data-page]").forEach(function (section) {
            const isActive = section.dataset.page === pageName;

            section.classList.toggle("active", isActive);
            section.hidden = !isActive;
        });
    }

    // ------------------------------------------------------
    // 7. MOBILE SIDEBAR
    // app.js owns the menu button and overlay click handlers.
    // This method simply asks app.js to close the sidebar.
    // ------------------------------------------------------

    function closeMobileSidebar() {
        if (
            window.VelvetDay &&
            typeof window.VelvetDay.closeMobileSidebar === "function"
        ) {
            window.VelvetDay.closeMobileSidebar();
            return;
        }

        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (overlay) {
            overlay.classList.remove("active");
        }

        document.body.classList.remove("sidebar-open");
    }

    // ------------------------------------------------------
    // 8. BROWSER HISTORY
    // ------------------------------------------------------

    function updateBrowserHistory(pageName, replace) {
        const method = replace ? "replaceState" : "pushState";

        try {
            window.history[method](
                { page: pageName },
                "",
                `#${pageName}`
            );
        } catch (error) {
            console.warn("Velvet Day: Could not update browser history.", error);
        }
    }

    // ------------------------------------------------------
    // 9. NAVIGATE
    // ------------------------------------------------------

    function navigate(pageName, options = {}) {
        if (!pageExists(pageName)) {
            console.warn(`Velvet Day: Page "${pageName}" does not exist.`);
            return false;
        }

        const previousPage = state.currentPage;

        if (previousPage === pageName && !options.force) {
            closeMobileSidebar();
            return true;
        }

        if (!options.fromHistory && previousPage && previousPage !== pageName) {
            state.history.push(previousPage);
        }

        state.previousPage = previousPage === pageName ? state.previousPage : previousPage;
        state.currentPage = pageName;

        let navigationSucceeded = true;

        // app.js handles page visibility, nav active states,
        // the page-changed event and the basic page title.
        if (
            window.VelvetDay &&
            typeof window.VelvetDay.navigate === "function"
        ) {
            navigationInProgress = true;

            try {
                navigationSucceeded = window.VelvetDay.navigate(pageName) !== false;
            } catch (error) {
                navigationSucceeded = false;
                console.error("Velvet Day: Navigation failed.", error);
            } finally {
                navigationInProgress = false;
            }
        } else {
            showPageContent(pageName);
        }

        if (!navigationSucceeded) {
            state.currentPage = previousPage;
            return false;
        }

        // Keep this module's UI labels and active links correct.
        updateActiveNavigation(pageName);
        updatePageHeading(pageName);
        closeMobileSidebar();

        if (options.updateBrowserHistory !== false) {
            updateBrowserHistory(
                pageName,
                Boolean(options.replaceHistory)
            );
        }

        document.dispatchEvent(
            new CustomEvent("velvet:navigation", {
                detail: {
                    page: pageName,
                    previousPage: previousPage
                }
            })
        );

        return true;
    }

    // ------------------------------------------------------
    // 10. GO BACK USING MODULE HISTORY
    // ------------------------------------------------------

    function goBack() {
        if (state.history.length === 0) {
            return navigate(config.defaultPage, { force: true });
        }

        const previousPage = state.history.pop();

        return navigate(previousPage, {
            fromHistory: true,
            updateBrowserHistory: true,
            replaceHistory: true,
            force: true
        });
    }

    // ------------------------------------------------------
    // 11. NAVIGATION LINK CLICK
    // IMPORTANT: Do not use [data-page] here. Those attributes
    // belong to the large page sections, so matching them would
    // intercept clicks on forms and other content inside a page.
    // ------------------------------------------------------

    function handleNavigationClick(event) {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const navigationLink = target.closest("[data-page-target]");

        if (!navigationLink) {
            return;
        }

        const pageName = navigationLink.dataset.pageTarget;

        if (!pageName) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        navigate(pageName);
    }

    // ------------------------------------------------------
    // 12. BROWSER BACK / FORWARD
    // ------------------------------------------------------

    function handleBrowserHistory(event) {
        const hashPage = window.location.hash.replace(/^#/, "").trim();
        const statePage = event.state && event.state.page;
        const pageName = pageExists(statePage) ? statePage : hashPage;
        const destination = pageExists(pageName)
            ? pageName
            : config.defaultPage;

        navigate(destination, {
            fromHistory: true,
            updateBrowserHistory: false,
            force: true
        });
    }

    // ------------------------------------------------------
    // 13. KEYBOARD SHORTCUTS
    // Alt + 1: Dashboard
    // Alt + 2: Tasks
    // Alt + 3: Brain Dump
    // Alt + 4: Notes
    // Alt + 5: Calendar
    // Alt + 6: Checklists
    // Alt + 7: Recurring Tasks
    // Alt + 8: Reminders
    // Alt + 9: Progress
    // Escape:  Close mobile sidebar
    // ------------------------------------------------------

    function handleKeyboardShortcuts(event) {
        if (event.key === "Escape") {
            closeMobileSidebar();
            return;
        }

        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "SELECT" ||
            activeElement.isContentEditable
        );

        if (isTyping || !event.altKey || event.ctrlKey || event.shiftKey) {
            return;
        }

        const shortcuts = {
            "1": "dashboard",
            "2": "tasks",
            "3": "brain-dump",
            "4": "notes",
            "5": "calendar",
            "6": "checklists",
            "7": "recurring",
            "8": "reminders",
            "9": "progress"
        };

        const pageName = shortcuts[event.key];

        if (pageName) {
            event.preventDefault();
            navigate(pageName);
        }
    }

    // ------------------------------------------------------
    // 14. EXTERNAL NAVIGATION EVENT
    // ------------------------------------------------------

    function handleExternalNavigation(event) {
        const pageName = event.detail && event.detail.page;

        if (pageName) {
            navigate(pageName);
        }
    }

    // ------------------------------------------------------
    // 15. KEEP STATE IN SYNC WHEN ANOTHER MODULE NAVIGATES
    // For example, search.js calls VelvetDay.navigate().
    // ------------------------------------------------------

    function handleAppPageChanged(event) {
        if (navigationInProgress) {
            return;
        }

        const pageName = event.detail && event.detail.page;

        if (!pageExists(pageName)) {
            return;
        }

        if (state.currentPage !== pageName) {
            state.previousPage = state.currentPage;
            state.currentPage = pageName;
        }

        updateActiveNavigation(pageName);
        updatePageHeading(pageName);
        closeMobileSidebar();

        // Direct calls to VelvetDay.navigate() should still update
        // the shareable page URL without adding another history entry.
        if (window.location.hash !== `#${pageName}`) {
            updateBrowserHistory(pageName, true);
        }
    }

    // ------------------------------------------------------
    // 16. INITIALIZE NAVIGATION
    // ------------------------------------------------------

    function initialize() {
        if (state.isInitialized) {
            return;
        }

        const requestedPage = window.location.hash
            .replace(/^#/, "")
            .trim();

        const initialPage = pageExists(requestedPage)
            ? requestedPage
            : config.defaultPage;

        // Capture phase lets navigation links be handled before
        // app.js's older delegated click handler. stopImmediatePropagation
        // prevents the same click from being processed twice.
        document.addEventListener(
            "click",
            handleNavigationClick,
            true
        );

        window.addEventListener("popstate", handleBrowserHistory);
        document.addEventListener("keydown", handleKeyboardShortcuts);
        document.addEventListener("velvet:go-to-page", handleExternalNavigation);
        document.addEventListener("velvet:page-changed", handleAppPageChanged);

        state.currentPage = config.defaultPage;

        navigate(initialPage, {
            force: true,
            updateBrowserHistory: false
        });

        // Set a valid initial URL for the selected page.
        if (window.location.hash !== `#${initialPage}`) {
            updateBrowserHistory(initialPage, true);
        }

        state.isInitialized = true;
        console.log("Velvet Day navigation initialized.");
    }

    // ------------------------------------------------------
    // 17. PUBLIC API
    // ------------------------------------------------------

    window.VelvetNavigation = {
        config: config,
        state: state,
        initialize: initialize,
        navigate: navigate,
        goBack: goBack,
        getCurrentPage: function () {
            return state.currentPage;
        },
        getPreviousPage: function () {
            return state.previousPage;
        },
        getPageInfo: getPageInfo,
        pageExists: pageExists
    };

    // ------------------------------------------------------
    // 18. START WHEN THE DOM IS READY
    // ------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }

})();
