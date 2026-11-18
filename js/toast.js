
/* =========================================================
   VELVET DAY - TOAST NOTIFICATION SYSTEM
   ---------------------------------------------------------
   Creates lightweight notifications inside the app.

   Types:
   - success
   - error
   - warning
   - info
   ========================================================= */

window.VelvetToast = (() => {
    "use strict";

    // -----------------------------------------------------
    // Configuration
    // -----------------------------------------------------

    const config = {
        containerId: "toastContainer",
        duration: 3500,
        maxVisible: 5
    };

    // -----------------------------------------------------
    // Create Toast Container
    // -----------------------------------------------------

    function createContainer() {
        let container = document.getElementById(config.containerId);

        if (!container) {
            container = document.createElement("div");
            container.id = config.containerId;
            container.className = "toast-container";
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "false");

            document.body.appendChild(container);
        }

        return container;
    }

    // -----------------------------------------------------
    // Get Icon
    // -----------------------------------------------------

    function getIcon(type) {
        const icons = {
            success: "♡",
            error: "✕",
            warning: "!",
            info: "✦"
        };

        return icons[type] || icons.info;
    }

    // -----------------------------------------------------
    // Show Toast
    // -----------------------------------------------------

    function show(message, type = "info", duration = config.duration) {
        const container = createContainer();

        // Remove older messages when too many are visible.
        while (container.children.length >= config.maxVisible) {
            container.firstElementChild?.remove();
        }

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;
        toast.setAttribute("role", "status");

        toast.innerHTML = `
            <span class="toast-icon">
                ${getIcon(type)}
            </span>

            <span class="toast-message"></span>

            <button
                type="button"
                class="toast-close"
                aria-label="Dismiss notification"
            >
                ×
            </button>
        `;

        // Insert message safely.
        toast.querySelector(".toast-message").textContent = String(message);

        container.appendChild(toast);

        // Trigger entrance animation.
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        // Close button.
        toast.querySelector(".toast-close").addEventListener("click", () => {
            dismiss(toast);
        });

        // Automatically dismiss after duration.
        if (duration > 0) {
            toast._dismissTimer = window.setTimeout(() => {
                dismiss(toast);
            }, duration);
        }

        return toast;
    }

    // -----------------------------------------------------
    // Dismiss Toast
    // -----------------------------------------------------

    function dismiss(toast) {
        if (!toast || toast.dataset.dismissed === "true") {
            return;
        }

        toast.dataset.dismissed = "true";

        if (toast._dismissTimer) {
            clearTimeout(toast._dismissTimer);
        }

        toast.classList.remove("show");
        toast.classList.add("toast-exit");

        // Remove after the CSS animation.
        window.setTimeout(() => {
            toast.remove();
        }, 300);
    }

    // -----------------------------------------------------
    // Convenience Methods
    // -----------------------------------------------------

    function success(message, duration) {
        return show(message, "success", duration);
    }

    function error(message, duration) {
        return show(message, "error", duration);
    }

    function warning(message, duration) {
        return show(message, "warning", duration);
    }

    function info(message, duration) {
        return show(message, "info", duration);
    }

    // -----------------------------------------------------
    // Remove All Toasts
    // -----------------------------------------------------

    function clearAll() {
        const container = document.getElementById(config.containerId);

        if (!container) return;

        Array.from(container.children).forEach(dismiss);
    }

    // -----------------------------------------------------
    // Public API
    // -----------------------------------------------------

    return {
        show,
        success,
        error,
        warning,
        info,
        dismiss,
        clearAll
    };
})();
