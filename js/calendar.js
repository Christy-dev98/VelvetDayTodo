/* ==========================================================
   VELVET DAY - CALENDAR
   Displays task due dates and reminders using current HTML.
   ========================================================== */
(function () {
    "use strict";
    const state = { month: new Date().getMonth(), year: new Date().getFullYear(), selectedDate: localISO(new Date()), initialized: false };
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    function localISO(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
    function read(key) { const value = VelvetStorage.get(key, []); return Array.isArray(value) ? value : []; }
    function getDayItems(date) {
        const tasks = read("tasks").filter(task => task.dueDate === date).map(task => ({ id: task.id, title: task.title, type: "Task", completed: task.completed }));
        const reminders = read("reminders").filter(reminder => String(reminder.dateTime || reminder.dueAt || "").slice(0, 10) === date).map(item => ({ id: item.id, title: item.title, type: "Reminder", completed: item.completed }));
        return [...tasks, ...reminders];
    }
    function render() {
        const title = $("#calendarTitle"); const grid = $("#calendarGrid");
        if (!grid) return;
        const monthDate = new Date(state.year, state.month, 1);
        if (title) title.textContent = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        const firstDay = monthDate.getDay(); const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
        const previousDays = new Date(state.year, state.month, 0).getDate();
        const today = localISO(new Date());
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let html = weekDays.map(day => `<div class="calendar-day-name">${day}</div>`).join("");
        for (let i = 0; i < 42; i++) {
            let day, date, other = false;
            if (i < firstDay) { day = previousDays - firstDay + i + 1; date = localISO(new Date(state.year, state.month - 1, day)); other = true; }
            else if (i >= firstDay + daysInMonth) { day = i - firstDay - daysInMonth + 1; date = localISO(new Date(state.year, state.month + 1, day)); other = true; }
            else { day = i - firstDay + 1; date = localISO(new Date(state.year, state.month, day)); }
            const items = getDayItems(date);
            html += `<button type="button" class="calendar-day ${other ? "other-month" : ""} ${date === today ? "today" : ""} ${date === state.selectedDate ? "selected" : ""} ${items.length ? "has-tasks" : ""}" data-calendar-date="${date}" aria-label="${date}, ${items.length} items">${day}${items.length ? `<span class="calendar-task-dot"></span>` : ""}</button>`;
        }
        grid.innerHTML = html;
        renderSelectedDay();
    }
    function renderSelectedDay() {
        const label = $("#selectedCalendarDate"); const events = $("#calendarEvents");
        const selected = new Date(`${state.selectedDate}T12:00:00`);
        if (label) label.textContent = selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        const items = getDayItems(state.selectedDate);
        if (events) events.innerHTML = items.length ? items.map(item => `<div class="calendar-task-item"><span class="calendar-task-title">${esc(item.title)}</span><span class="calendar-task-meta">${esc(item.type)}${item.completed ? " · Completed" : ""}</span></div>`).join("") : `<div class="empty-state"><span>♡</span><p>No tasks or reminders on this day.</p></div>`;
    }
    function changeMonth(offset) { const d = new Date(state.year, state.month + offset, 1); state.month = d.getMonth(); state.year = d.getFullYear(); render(); }
    function initialize() {
        if (state.initialized) return; state.initialized = true;
        $("#prevMonth")?.addEventListener("click", () => changeMonth(-1));
        $("#nextMonth")?.addEventListener("click", () => changeMonth(1));
        $("#calendarGrid")?.addEventListener("click", event => { const day = event.target.closest("[data-calendar-date]"); if (!day) return; state.selectedDate = day.dataset.calendarDate; const selected = new Date(`${state.selectedDate}T12:00:00`); state.month = selected.getMonth(); state.year = selected.getFullYear(); render(); });
        ["velvet:tasks-updated", "velvet:reminders-updated", "velvet:data-reloaded"].forEach(name => document.addEventListener(name, render));
        document.addEventListener("velvet:data-updated", render);
        render();
    }
    window.VelvetCalendar = { initialize, render, getSelectedDate: () => state.selectedDate, goToDate(date) { const d = new Date(`${date}T12:00:00`); if (!Number.isNaN(d.getTime())) { state.month = d.getMonth(); state.year = d.getFullYear(); state.selectedDate = localISO(d); render(); } } };
})();
