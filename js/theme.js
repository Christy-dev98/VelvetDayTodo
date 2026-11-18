/* ==========================================================
   VELVET DAY - THEME MANAGER
   Shared theme API for app.js and settings.js.
   ========================================================== */
(function () {
    "use strict";
    const themes = {
        dark: {
            background: "#17151d", backgroundSecondary: "#211b28", backgroundTertiary: "#2b2433",
            sidebar: "#1c1722", card: "#241d2b", cardHover: "#2d2435", border: "#393141",
            text: "#f3edf5", textSecondary: "#c3b7ca", textMuted: "#91879c",
            primary: "#b99bd6", primaryHover: "#cdb3dd", primarySoft: "#49364f", accent: "#d6b6df",
            success: "#a9c9b3", warning: "#d6b68d", danger: "#d990a1", input: "#302735", shadow: "rgba(0,0,0,.25)"
        },
        light: {
            background: "#f7f3f7", backgroundSecondary: "#f0e9f1", backgroundTertiary: "#e8dfe9",
            sidebar: "#efe6f0", card: "#ffffff", cardHover: "#f8f3f9", border: "#e4d8e7",
            text: "#493b4d", textSecondary: "#7f7084", textMuted: "#a092a5",
            primary: "#9275a5", primaryHover: "#7f6294", primarySoft: "#e8ddee", accent: "#b79ac8",
            success: "#779a72", warning: "#c39a5e", danger: "#c47f91", input: "#f6f0f7", shadow: "rgba(90,65,95,.08)"
        }
    };
    let currentTheme = "dark";
    function updateButtons() {
        document.querySelectorAll("[data-theme-toggle]").forEach(button => {
            const dark = currentTheme === "dark";
            button.textContent = dark ? "☀" : "☾";
            button.title = dark ? "Switch to light mode" : "Switch to dark mode";
            button.setAttribute("aria-label", button.title);
            button.dataset.currentTheme = currentTheme;
        });
    }
    function applyTheme(name, savePreference = true) {
        currentTheme = themes[name] ? name : "dark";
        const c = themes[currentTheme]; const root = document.documentElement;
        root.dataset.theme = currentTheme;
        root.classList.remove("theme-dark", "theme-light"); root.classList.add(`theme-${currentTheme}`);
        const map = {
            "--bg-primary": c.background, "--bg-secondary": c.backgroundSecondary, "--bg-tertiary": c.backgroundTertiary,
            "--sidebar-bg": c.sidebar, "--card-bg": c.card, "--card-hover": c.cardHover, "--border-color": c.border,
            "--text-primary": c.text, "--text-secondary": c.textSecondary, "--text-muted": c.textMuted,
            "--primary-color": c.primary, "--primary-hover": c.primaryHover, "--primary-soft": c.primarySoft,
            "--accent-color": c.accent, "--accent-purple": c.primary, "--accent-purple-light": c.accent,
            "--success": c.success, "--warning": c.warning, "--danger": c.danger,
            "--input-bg": c.input, "--shadow-color": c.shadow
        };
        Object.entries(map).forEach(([key, value]) => root.style.setProperty(key, value));
        updateButtons();
        if (savePreference && window.VelvetStorage) {
            const settings = VelvetStorage.get("settings", {});
            VelvetStorage.set("settings", { ...settings, theme: currentTheme });
        }
        document.dispatchEvent(new CustomEvent("velvet:theme-changed", { detail: { theme: currentTheme } }));
        return currentTheme;
    }
    function toggleTheme() { return applyTheme(currentTheme === "dark" ? "light" : "dark", true); }
    function initialize() {
        const settings = window.VelvetStorage?.get("settings", {}) || {};
        applyTheme(settings.theme === "light" ? "light" : "dark", false);
    }
    window.VelvetTheme = { themes, initialize, applyTheme, toggleTheme, getCurrentTheme: () => currentTheme, getThemeDetails: name => themes[name] || themes.dark, updateThemeButtons: updateButtons };
})();
