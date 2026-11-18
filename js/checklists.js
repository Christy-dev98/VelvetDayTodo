/* ==========================================================
   VELVET DAY - CHECKLISTS
   Matches #checklistForm, #checklistsGrid, #checklistList.
   ========================================================== */
(function () {
    "use strict";
    const state = { checklists: [], initialized: false };
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const uid = () => window.VelvetUtils?.generateId?.("list") || `list_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast = (message, type = "success") => window.VelvetToast?.show ? VelvetToast.show(message, type) : console.log(message);

    function load() { const value = VelvetStorage.get("checklists", []); state.checklists = Array.isArray(value) ? value : []; state.checklists.forEach(list => { if (!Array.isArray(list.items)) list.items = []; }); return state.checklists; }
    function save() { const ok = VelvetStorage.set("checklists", state.checklists); if (ok) document.dispatchEvent(new CustomEvent("velvet:checklists-updated", { detail: { checklists: [...state.checklists] } })); else toast("Could not save your checklist.", "error"); return ok; }
    function addChecklist(title) { title = String(title ?? "").trim(); if (!title) { toast("Enter a checklist name.", "warning"); return null; } const item = { id: uid(), title, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; state.checklists.unshift(item); if (!save()) { state.checklists.shift(); return null; } render(); toast("Checklist created ♡"); return item; }
    function find(id) { return state.checklists.find(list => String(list.id) === String(id)); }
    function addItem(listId, text) { const list = find(listId); text = String(text ?? "").trim(); if (!list || !text) return false; list.items.push({ id: uid(), text, completed: false, createdAt: new Date().toISOString() }); list.updatedAt = new Date().toISOString(); if (!save()) { list.items.pop(); return false; } render(); return true; }
    function toggleItem(listId, itemId) { const list = find(listId); const item = list?.items.find(entry => String(entry.id) === String(itemId)); if (!item) return false; item.completed = !item.completed; item.completedAt = item.completed ? new Date().toISOString() : null; if (!save()) return false; render(); return true; }
    function deleteChecklist(listId) { const before = state.checklists.length; state.checklists = state.checklists.filter(list => String(list.id) !== String(listId)); if (before === state.checklists.length) return false; if (!save()) { load(); return false; } render(); toast("Checklist deleted.", "info"); return true; }
    function deleteItem(listId, itemId) { const list = find(listId); if (!list) return false; const before = list.items.length; list.items = list.items.filter(item => String(item.id) !== String(itemId)); if (before === list.items.length) return false; if (!save()) { load(); return false; } render(); return true; }
    function render() {
        const grid = $("#checklistsGrid"); const listContainer = $("#checklistList");
        const html = state.checklists.length ? state.checklists.map(list => {
            const done = list.items.filter(item => item.completed).length; const total = list.items.length; const percent = total ? Math.round(done / total * 100) : 0;
            return `<article class="checklist-card" data-checklist-id="${esc(list.id)}">
                <div class="checklist-card-header"><h3 class="checklist-card-title">${esc(list.title)}</h3><button type="button" class="task-action-button delete-action" data-checklist-action="delete" data-checklist-id="${esc(list.id)}" aria-label="Delete checklist">×</button></div>
                <div class="checklist-progress-info"><span class="checklist-count">${done} of ${total} completed</span><span class="checklist-progress-percent">${percent}%</span></div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
                <div class="checklist-items">${list.items.length ? list.items.map(item => `<div class="checklist-item ${item.completed ? "completed" : ""}"><input class="checklist-checkbox" type="checkbox" data-checklist-action="toggle-item" data-checklist-id="${esc(list.id)}" data-item-id="${esc(item.id)}" ${item.completed ? "checked" : ""}><span class="checklist-item-text">${esc(item.text)}</span><button type="button" class="task-action-button delete-action" data-checklist-action="delete-item" data-checklist-id="${esc(list.id)}" data-item-id="${esc(item.id)}" aria-label="Delete item">×</button></div>`).join("") : `<p class="checklist-empty-items">No items yet.</p>`}</div>
                <form class="checklist-add-item-form" data-checklist-id="${esc(list.id)}"><input type="text" name="item" placeholder="Add an item..." aria-label="New checklist item" required><button class="secondary-button" type="submit">Add</button></form>
            </article>`;
        }).join("") : `<div class="empty-state"><span>☷</span><p>Create your first checklist above.</p></div>`;
        if (grid) grid.innerHTML = html;
        if (listContainer) listContainer.innerHTML = "";
    }
    function initialize() {
        if (state.initialized) return; state.initialized = true; load();
        const form = $("#checklistForm"); if (form) form.addEventListener("submit", event => { event.preventDefault(); const input = $("#checklistTitle"); if (addChecklist(input?.value)) form.reset(); });
        document.addEventListener("submit", event => { const form = event.target.closest(".checklist-add-item-form"); if (!form) return; event.preventDefault(); const input = form.querySelector('input[name="item"]'); if (input && addItem(form.dataset.checklistId, input.value)) input.value = ""; });
        document.addEventListener("change", event => { const input = event.target.closest('[data-checklist-action="toggle-item"]'); if (input) toggleItem(input.dataset.checklistId, input.dataset.itemId); });
        document.addEventListener("click", event => { const button = event.target.closest("[data-checklist-action]"); if (!button || button.tagName === "INPUT") return; const action = button.dataset.checklistAction; if (action === "delete") deleteChecklist(button.dataset.checklistId); if (action === "delete-item") deleteItem(button.dataset.checklistId, button.dataset.itemId); });
        document.addEventListener("velvet:data-reloaded", () => { load(); render(); });
        document.addEventListener("velvet:data-updated", () => { load(); render(); });
        render();
    }
    window.VelvetChecklist = { initialize, getChecklists: () => [...state.checklists], getAllChecklists: () => [...state.checklists], addChecklist, addItem, toggleItem, deleteChecklist, deleteItem, render };
})();
