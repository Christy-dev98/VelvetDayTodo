/* ==========================================================
   VELVET DAY - NOTES
   Matches #noteForm and #notesGrid in index.html.
   ========================================================== */
(function () {
    "use strict";
    const state = { notes: [], initialized: false };
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const uid = () => window.VelvetUtils?.generateId?.("note") || `note_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast = (message, type = "success") => window.VelvetToast?.show ? VelvetToast.show(message, type) : console.log(message);
    const colors = ["note-purple", "note-pink", "note-blue", "note-brown", "note-neutral"];

    function load() { const value = VelvetStorage.get("notes", []); state.notes = Array.isArray(value) ? value : []; return state.notes; }
    function save() { const ok = VelvetStorage.set("notes", state.notes); if (ok) document.dispatchEvent(new CustomEvent("velvet:notes-updated", { detail: { notes: [...state.notes] } })); else toast("Could not save this note.", "error"); return ok; }
    function addNote(data) {
        const title = String(data?.title ?? "").trim(); const content = String(data?.content ?? "").trim();
        if (!title || !content) { toast("Please enter both a title and note.", "warning"); return null; }
        const note = { id: uid(), title, content, color: colors[state.notes.length % colors.length], pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.notes.unshift(note); if (!save()) { state.notes.shift(); return null; }
        render(); toast("Note saved ♡"); return note;
    }
    function updateNote(id, updates) { const i = state.notes.findIndex(n => String(n.id) === String(id)); if (i < 0) return false; state.notes[i] = { ...state.notes[i], ...updates, updatedAt: new Date().toISOString() }; if (!save()) return false; render(); return true; }
    function deleteNote(id) { const before = state.notes.length; state.notes = state.notes.filter(n => String(n.id) !== String(id)); if (before === state.notes.length) return false; if (!save()) { load(); return false; } render(); toast("Note deleted.", "info"); return true; }
    function render() {
        const container = $("#notesGrid"); if (!container) return;
        const notes = [...state.notes].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        container.innerHTML = notes.length ? notes.map(note => `
            <article class="note-card ${esc(note.color || "note-neutral")}" data-note-id="${esc(note.id)}">
                <div class="note-card-header"><h3 class="note-card-title">${esc(note.title)}</h3><div class="note-card-header-actions">
                    <button type="button" class="task-action-button" data-note-action="pin" data-note-id="${esc(note.id)}" aria-label="${note.pinned ? "Unpin" : "Pin"} note">${note.pinned ? "★" : "☆"}</button>
                    <button type="button" class="task-action-button delete-action" data-note-action="delete" data-note-id="${esc(note.id)}" aria-label="Delete note">×</button>
                </div></div>
                <div class="note-card-content">${esc(note.content)}</div>
                <div class="note-card-footer"><span class="note-date">${esc(window.VelvetUtils?.formatDate?.(note.updatedAt || note.createdAt) || "")}</span></div>
            </article>`).join("") : `<div class="empty-state"><span>✧</span><p>No notes yet. Create your first note above.</p></div>`;
    }
    function initialize() {
        if (state.initialized) return; state.initialized = true; load();
        const form = $("#noteForm"); if (form) form.addEventListener("submit", event => { event.preventDefault(); const data = new FormData(form); const note = addNote({ title: data.get("title"), content: data.get("content") }); if (note) form.reset(); });
        document.addEventListener("click", event => { const button = event.target.closest("[data-note-action]"); if (!button) return; const id = button.dataset.noteId; if (button.dataset.noteAction === "delete") deleteNote(id); if (button.dataset.noteAction === "pin") { const note = state.notes.find(n => String(n.id) === String(id)); if (note) updateNote(id, { pinned: !note.pinned }); } });
        document.addEventListener("velvet:data-reloaded", () => { load(); render(); });
        document.addEventListener("velvet:data-updated", () => { load(); render(); });
        render();
    }
    window.VelvetNotes = { initialize, getNotes: () => [...state.notes], getAllNotes: () => [...state.notes], addNote, updateNote, deleteNote, render };
})();
