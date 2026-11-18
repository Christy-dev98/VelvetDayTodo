/* ==========================================================
   VELVET DAY - GLOBAL SEARCH
   Searches current saved data and opens the relevant section.
   ========================================================== */
window.VelvetSearch = (() => {
    "use strict";
    let initialized = false;
    let currentQuery = "";
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    function collections() {
        const get = key => { const value = VelvetStorage.get(key, []); return Array.isArray(value) ? value : []; };
        return [
            ...get("tasks").map(x => ({ ...x, type: "task", page: "tasks", title: x.title || "Task", description: x.description || x.category || "" })),
            ...get("notes").map(x => ({ ...x, type: "note", page: "notes", title: x.title || "Note", description: x.content || "" })),
            ...get("checklists").map(x => ({ ...x, type: "checklist", page: "checklists", title: x.title || "Checklist", description: `${(x.items || []).length} items` })),
            ...get("brainDump").map(x => ({ ...x, type: "thought", page: "brain-dump", title: x.content || "Thought", description: x.content || "" })),
            ...get("recurring").map(x => ({ ...x, type: "routine", page: "recurring", title: x.title || "Routine", description: x.frequency || "" })),
            ...get("reminders").map(x => ({ ...x, type: "reminder", page: "reminders", title: x.title || "Reminder", description: x.dateTime || "" }))
        ];
    }
    function search(query) {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return [];
        return collections().filter(item => `${item.title} ${item.description} ${item.content || ""}`.toLowerCase().includes(q)).slice(0, 30);
    }
    function renderResults(results) {
        const container = $("#searchResults"); if (!container) return;
        if (!currentQuery) { container.innerHTML = `<p class="search-placeholder">Start typing to search your space.</p>`; return; }
        if (!results.length) { container.innerHTML = `<p class="search-empty-state">No results found for “${esc(currentQuery)}”.</p>`; return; }
        container.innerHTML = results.map(item => `<button type="button" class="search-result-item" data-search-page="${esc(item.page)}"><span class="search-result-icon">${item.type === "task" ? "✓" : item.type === "note" ? "▤" : item.type === "checklist" ? "☷" : item.type === "thought" ? "☁" : item.type === "routine" ? "↻" : "♡"}</span><span class="search-result-content"><span class="search-result-title">${esc(item.title)}</span><span class="search-result-description">${esc(item.description).slice(0, 130)}</span></span><span class="search-result-type">${esc(item.type)}</span></button>`).join("");
    }
    function handleInput(event) { currentQuery = event.target.value.trim(); renderResults(search(currentQuery)); }
    function openSearch() { const overlay = $("#searchOverlay"); const input = $("#globalSearch"); if (!overlay) return; overlay.classList.remove("hidden"); overlay.classList.add("open"); if (input) { input.value = currentQuery; input.focus(); renderResults(search(currentQuery)); } }
    function closeSearch() { const overlay = $("#searchOverlay"); if (overlay) { overlay.classList.add("hidden"); overlay.classList.remove("open"); } }
    function initialize() {
        if (initialized) return; initialized = true;
        $("#searchTrigger")?.addEventListener("click", openSearch);
        $("#closeSearch")?.addEventListener("click", closeSearch);
        $("#globalSearch")?.addEventListener("input", handleInput);
        $("#searchOverlay")?.addEventListener("click", event => { if (event.target.id === "searchOverlay") closeSearch(); });
        $("#searchResults")?.addEventListener("click", event => { const button = event.target.closest("[data-search-page]"); if (!button) return; const page = button.dataset.searchPage; if (window.VelvetNavigation?.navigate) VelvetNavigation.navigate(page); else window.VelvetDay?.navigate(page); closeSearch(); });
        document.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); } if (event.key === "Escape") closeSearch(); });
        document.addEventListener("velvet:data-updated", () => { if (currentQuery) renderResults(search(currentQuery)); });
    }
    return { initialize, search, getAllSearchableItems: collections, openSearch, closeSearch, getCurrentQuery: () => currentQuery };
})();
