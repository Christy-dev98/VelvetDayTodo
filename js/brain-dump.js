/* ==========================================================
   VELVET DAY - BRAIN DUMP
   Matches #brainDumpForm, #brainDumpPageForm and both lists.
   ========================================================== */
(function () {
    "use strict";
    const state = { entries: [], initialized: false };
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const uid = () => window.VelvetUtils?.generateId?.("thought") || `thought_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast = (message, type = "success") => window.VelvetToast?.show ? VelvetToast.show(message, type) : console.log(message);

    function load() { const value = VelvetStorage.get("brainDump", []); state.entries = Array.isArray(value) ? value : []; return state.entries; }
    function save() {
        const ok = VelvetStorage.set("brainDump", state.entries);
        if (ok) document.dispatchEvent(new CustomEvent("velvet:brain-dump-updated", { detail: { entries: [...state.entries] } }));
        else toast("Could not save this thought.", "error");
        return ok;
    }
    function addEntry(content) {
        const text = String(content ?? "").trim();
        if (!text) { toast("Write something before saving.", "warning"); return null; }
        const entry = { id: uid(), content: text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.entries.unshift(entry);
        if (!save()) { state.entries.shift(); return null; }
        render(); toast("Thought saved ♡"); return entry;
    }
    function deleteEntry(id) {
        const before = state.entries.length;
        state.entries = state.entries.filter(entry => String(entry.id) !== String(id));
        if (before === state.entries.length) return false;
        if (!save()) { load(); return false; }
        render(); toast("Thought deleted.", "info"); return true;
    }
    function renderInto(container) {
        if (!container) return;
        container.innerHTML = state.entries.length ? state.entries.map(entry => `
            <article class="brain-dump-card" data-entry-id="${esc(entry.id)}">
                <div class="brain-dump-card-header"><span class="brain-dump-date">${esc(window.VelvetUtils?.formatDateTime?.(entry.createdAt) || new Date(entry.createdAt).toLocaleString())}</span>
                <button type="button" class="task-action-button delete-action" data-brain-action="delete" data-entry-id="${esc(entry.id)}" aria-label="Delete thought">×</button></div>
                <div class="brain-dump-card-content">${esc(entry.content)}</div>
                <div class="brain-dump-card-actions"><button type="button" class="text-button" data-brain-action="task" data-entry-id="${esc(entry.id)}">Turn into task</button></div>
            </article>`).join("") : `<div class="empty-state"><span>☁</span><p>No thoughts saved yet. Start writing.</p></div>`;
    }
    function render() { renderInto($("#brainDumpList")); renderInto($("#brainDumpPageList")); }
    function bindForm(selector, inputSelector) {
        const form = $(selector); if (!form) return;
        form.addEventListener("submit", event => {
            event.preventDefault();
            const input = $(inputSelector);
            if (!input) return;
            if (addEntry(input.value)) { input.value = ""; }
        });
    }
    function handleActions(event) {
        const button = event.target.closest("[data-brain-action]"); if (!button) return;
        const entry = state.entries.find(item => String(item.id) === String(button.dataset.entryId));
        if (!entry) return;
        if (button.dataset.brainAction === "delete") deleteEntry(entry.id);
        if (button.dataset.brainAction === "task") {
            document.dispatchEvent(new CustomEvent("velvet:brain-dump-convert-task", { detail: { content: entry.content } }));
            toast("Added to your tasks.");
        }
    }
    function initialize() {
        if (state.initialized) return; state.initialized = true;
        load(); bindForm("#brainDumpForm", "#brainDumpInput"); bindForm("#brainDumpPageForm", "#brainDumpPageInput");
        document.addEventListener("click", handleActions);
        document.addEventListener("velvet:data-reloaded", () => { load(); render(); });
        document.addEventListener("velvet:data-updated", () => { load(); render(); });
        render();
    }
    window.VelvetBrainDump = { initialize, getEntries: () => [...state.entries], getItems: () => [...state.entries], addEntry, deleteEntry, render };
})();
