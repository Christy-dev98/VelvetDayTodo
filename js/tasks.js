/* ==========================================================
   VELVET DAY - TASKS
   Matches the current index.html task forms and containers.
   ========================================================== */
(function () {
    "use strict";

    const state = { tasks: [], filter: "all", initialized: false };
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const id = () => window.VelvetUtils?.generateId?.("task") || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const todayISO = () => window.VelvetUtils?.getTodayISO?.() || new Date().toLocaleDateString("en-CA");

    function notify(message, type = "success") {
        if (window.VelvetToast?.show) VelvetToast.show(message, type);
        else console.log(`[${type}] ${message}`);
    }

    function load() {
        const items = window.VelvetStorage?.get("tasks", []);
        state.tasks = Array.isArray(items) ? items : [];
        return state.tasks;
    }

    function save() {
        if (!window.VelvetStorage?.set("tasks", state.tasks)) {
            notify("Your tasks could not be saved in this browser.", "error");
            return false;
        }
        document.dispatchEvent(new CustomEvent("velvet:tasks-updated", { detail: { tasks: state.tasks } }));
        document.dispatchEvent(new CustomEvent("velvet:progress-updated"));
        return true;
    }

    function addTask(data) {
        const title = String(data?.title ?? "").trim();
        if (!title) {
            notify("Please enter a task name.", "warning");
            return null;
        }
        const task = {
            id: id(), title,
            description: String(data.description ?? "").trim(),
            category: String(data.category ?? "personal"),
            priority: ["low", "medium", "high"].includes(data.priority) ? data.priority : "medium",
            dueDate: String(data.dueDate ?? ""),
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        state.tasks.unshift(task);
        if (!save()) { state.tasks.shift(); return null; }
        render();
        notify("Task added successfully ♡");
        return task;
    }

    function updateTask(taskId, updates) {
        const index = state.tasks.findIndex(task => String(task.id) === String(taskId));
        if (index < 0) return false;
        state.tasks[index] = { ...state.tasks[index], ...updates, id: state.tasks[index].id, updatedAt: new Date().toISOString() };
        if (!save()) return false;
        render();
        return true;
    }

    function toggleTask(taskId) {
        const task = state.tasks.find(item => String(item.id) === String(taskId));
        if (!task) return false;
        const completed = !task.completed;
        const updated = updateTask(taskId, { completed, completedAt: completed ? new Date().toISOString() : null });
        if (updated && completed) {
            document.dispatchEvent(new CustomEvent("velvet:task-completed", { detail: { title: task.title, task } }));
        }
        return updated;
    }

    function deleteTask(taskId) {
        const previous = state.tasks.length;
        state.tasks = state.tasks.filter(task => String(task.id) !== String(taskId));
        if (state.tasks.length === previous) return false;
        if (!save()) { load(); return false; }
        render();
        notify("Task deleted.", "info");
        return true;
    }

    function getVisibleTasks() {
        let items = [...state.tasks];
        if (state.filter === "pending") items = items.filter(task => !task.completed);
        if (state.filter === "completed") items = items.filter(task => task.completed);
        items.sort((a, b) => {
            const aDate = a.dueDate || "9999-12-31";
            const bDate = b.dueDate || "9999-12-31";
            return aDate.localeCompare(bDate) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        return items;
    }

    function renderTask(task) {
        const due = task.dueDate ? `<span class="task-due-date">${escapeHTML(task.dueDate)}</span>` : "";
        return `
            <article class="task-item ${task.completed ? "completed" : ""}" data-task-id="${escapeHTML(task.id)}">
                <button type="button" class="task-checkbox ${task.completed ? "checked" : ""}" data-task-action="toggle" data-task-id="${escapeHTML(task.id)}" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}" aria-pressed="${Boolean(task.completed)}">${task.completed ? "✓" : ""}</button>
                <div class="task-main-content">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    ${task.description ? `<div class="task-description">${escapeHTML(task.description)}</div>` : ""}
                    <div class="task-meta">
                        <span class="priority-badge priority-${escapeHTML(task.priority || "medium")}">${escapeHTML(task.priority || "medium")}</span>
                        ${task.category ? `<span class="task-tag">${escapeHTML(task.category)}</span>` : ""}
                        ${due}
                    </div>
                </div>
                <div class="task-actions">
                    <button type="button" class="task-action-button delete-action" data-task-action="delete" data-task-id="${escapeHTML(task.id)}" aria-label="Delete task">×</button>
                </div>
            </article>`;
    }

    function render() {
        const all = [...state.tasks];
        const today = todayISO();
        const todayTasks = all.filter(task => !task.dueDate || task.dueDate === today);
        const visible = getVisibleTasks();
        const dashboardList = $("#taskList");
        const pageList = $("#taskListPage");
        if (dashboardList) dashboardList.innerHTML = todayTasks.length ? todayTasks.map(renderTask).join("") : "";
        if (pageList) pageList.innerHTML = visible.length ? visible.map(renderTask).join("") : `<div class="empty-state"><span>♡</span><p>No tasks here yet.</p></div>`;
        const empty = $("#dashboardTasksEmpty");
        if (empty) empty.hidden = todayTasks.length > 0;
        updateStatistics();
    }

    function updateStatistics() {
        const today = todayISO();
        const todayTasks = state.tasks.filter(task => !task.dueDate || task.dueDate === today);
        const completed = todayTasks.filter(task => task.completed).length;
        const pending = todayTasks.length - completed;
        const percent = todayTasks.length ? Math.round(completed / todayTasks.length * 100) : 0;
        const setText = (selector, value) => { const element = $(selector); if (element) element.textContent = String(value); };
        setText("#totalTasksCount", todayTasks.length);
        setText("#completedTasksCount", completed);
        setText("#pendingTasksCount", pending);
        setText("#productivityPercentage", `${percent}%`);
        setText("#progressTotalTasks", state.tasks.length);
        setText("#progressCompletedTasks", state.tasks.filter(task => task.completed).length);
        setText("#progressPendingTasks", state.tasks.filter(task => !task.completed).length);
        setText("#progressCompletionRate", `${state.tasks.length ? Math.round(state.tasks.filter(task => task.completed).length / state.tasks.length * 100) : 0}%`);
    }

    function handleTaskForm(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        addTask({
            title: data.get("task"),
            priority: data.get("priority"),
            dueDate: data.get("dueDate"),
            category: data.get("category")
        });
        form.reset();
        const priority = $("#taskPriority");
        if (priority) priority.value = "medium";
    }

    function handleActions(event) {
        const button = event.target.closest("[data-task-action]");
        if (!button) return;
        const taskId = button.dataset.taskId;
        if (button.dataset.taskAction === "toggle") toggleTask(taskId);
        if (button.dataset.taskAction === "delete") deleteTask(taskId);
    }

    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        load();
        ["#taskForm", "#fullTaskForm"].forEach(selector => {
            const form = $(selector);
            if (form) form.addEventListener("submit", handleTaskForm);
        });
        const filter = $("#taskFilter");
        if (filter) filter.addEventListener("change", () => { state.filter = filter.value; render(); });
        document.addEventListener("click", handleActions);
        document.addEventListener("velvet:data-reloaded", () => { load(); render(); });
        document.addEventListener("velvet:data-updated", () => { load(); render(); });
        document.addEventListener("velvet:brain-dump-convert-task", event => addTask({ title: event.detail?.content || "" }));
        render();
    }

    window.VelvetTasks = {
        initialize, loadTasks: load, getTasks: () => [...state.tasks], getAllTasks: () => [...state.tasks],
        addTask, updateTask, toggleTask, deleteTask, render, updateTaskStatistics: updateStatistics
    };
})();
