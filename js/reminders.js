/* ==========================================================
   VELVET DAY - REMINDERS
   Matches #reminderForm, #reminderList and dashboard preview.
   Browser notifications work while the page is open; the
   browser may suspend timers when the app is closed.
   ========================================================== */
(function () {
    "use strict";
    const state = { items: [], timers: new Map(), initialized: false };
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const uid = () => window.VelvetUtils?.generateId?.("reminder") || `reminder_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast = (message, type = "success", duration) => window.VelvetToast?.show ? VelvetToast.show(message, type, duration) : console.log(message);
    function dateValue(item) { return item.dateTime || item.dueAt || ""; }
    function load() { const value = VelvetStorage.get("reminders", []); state.items = Array.isArray(value) ? value : []; return state.items; }
    function save() { const ok = VelvetStorage.set("reminders", state.items); if (ok) document.dispatchEvent(new CustomEvent("velvet:reminders-updated", { detail: { reminders: [...state.items] } })); else toast("Could not save this reminder.", "error"); return ok; }
    function add(data) {
        const title = String(data?.title ?? "").trim(); const dateTime = String(data?.dateTime ?? "").trim();
        if (!title || !dateTime || Number.isNaN(new Date(dateTime).getTime())) { toast("Enter a reminder title and valid date and time.", "warning"); return null; }
        if (new Date(dateTime).getTime() <= Date.now()) { toast("Please choose a future date and time.", "warning"); return null; }
        const item = { id: uid(), title, dateTime, completed: false, notified: false, createdAt: new Date().toISOString() };
        state.items.unshift(item); if (!save()) { state.items.shift(); return null; }
        schedule(item); render(); toast("Reminder saved ♡"); return item;
    }
    function remove(id) { const item = state.items.find(x => String(x.id) === String(id)); if (!item) return false; clearTimer(id); state.items = state.items.filter(x => String(x.id) !== String(id)); if (!save()) { load(); return false; } render(); toast("Reminder deleted.", "info"); return true; }
    function complete(id) { const item = state.items.find(x => String(x.id) === String(id)); if (!item) return false; item.completed = !item.completed; if (item.completed) clearTimer(id); else schedule(item); if (!save()) return false; render(); return true; }
    function clearTimer(id) { const timer = state.timers.get(String(id)); if (timer) clearTimeout(timer); state.timers.delete(String(id)); }
    function notify(reminderId) {
        const item = state.items.find(entry => String(entry.id) === String(reminderId));
        if (!item || item.completed || item.notified) return;
        if ("Notification" in window && Notification.permission === "granted" && !item.completed) {
            try { new Notification("Velvet Day Reminder", { body: item.title, icon: "./assets/icons/icon-192.png", tag: String(item.id) }); } catch (error) { console.warn("Notification could not be displayed.", error); }
        }
        toast(`Reminder: ${item.title}`, "info", 6000);
        item.notified = true; save(); render();
    }
    function schedule(item) {
        clearTimer(item.id); if (item.completed || item.notified) return;
        const delay = new Date(dateValue(item)).getTime() - Date.now();
        if (!Number.isFinite(delay) || delay <= 0 || delay > 2147480000) return;
        const timer = setTimeout(() => notify(item.id), delay);
        state.timers.set(String(item.id), timer);
    }
    function renderItem(item) {
        const date = new Date(dateValue(item)); const dateText = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
        return `<article class="reminder-card ${item.completed ? "completed" : ""}" data-reminder-id="${esc(item.id)}"><div class="reminder-icon">♡</div><div class="reminder-content"><strong class="task-title">${esc(item.title)}</strong><p>${esc(dateText)}</p><span class="reminder-date">${item.completed ? "Completed" : item.notified ? "Notification shown" : "Upcoming"}</span></div><div class="task-actions"><button type="button" class="task-action-button" data-reminder-action="complete" data-id="${esc(item.id)}" aria-label="Toggle completed">${item.completed ? "↶" : "✓"}</button><button type="button" class="task-action-button delete-action" data-reminder-action="delete" data-id="${esc(item.id)}" aria-label="Delete reminder">×</button></div></article>`;
    }
    function render() {
        const sorted = [...state.items].sort((a, b) => new Date(dateValue(a)) - new Date(dateValue(b)));
        const list = $("#reminderList"); const dashboard = $("#dashboardRemindersList");
        if (list) list.innerHTML = sorted.length ? sorted.map(renderItem).join("") : `<div class="empty-state"><span>♡</span><p>No reminders yet.</p></div>`;
        if (dashboard) { const upcoming = sorted.filter(item => !item.completed).slice(0, 4); dashboard.innerHTML = upcoming.length ? upcoming.map(renderItem).join("") : `<div class="empty-state"><span>♡</span><p>No upcoming reminders.</p></div>`; }
    }
    async function requestPermission() { if (!("Notification" in window) || Notification.permission !== "default") return; try { await Notification.requestPermission(); } catch (error) { console.warn("Notification permission was not granted.", error); } }
    function initialize() {
        if (state.initialized) return; state.initialized = true; load();
        const form = $("#reminderForm"); if (form) form.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(form); await requestPermission(); if (add({ title: data.get("title"), dateTime: data.get("dateTime") })) form.reset(); });
        document.addEventListener("click", event => { const button = event.target.closest("[data-reminder-action]"); if (!button) return; if (button.dataset.reminderAction === "delete") remove(button.dataset.id); if (button.dataset.reminderAction === "complete") complete(button.dataset.id); });
        document.addEventListener("velvet:data-reloaded", () => { load(); render(); state.items.forEach(schedule); });
        document.addEventListener("velvet:data-updated", () => { load(); render(); });
        state.items.forEach(schedule); render();
    }
    window.VelvetReminders = { initialize, getReminders: () => [...state.items], getItems: () => [...state.items], add, remove, complete, render };
})();
