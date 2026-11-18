/* ==========================================================
   VELVET DAY - PROGRESS
   Updates dashboard and progress page from saved tasks.
   ========================================================== */
(function () {
    "use strict";
    let initialized = false;
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    function tasks() { const value = VelvetStorage.get("tasks", []); return Array.isArray(value) ? value : []; }
    function render() {
        const all = tasks(); const completed = all.filter(task => task.completed).length; const pending = all.length - completed; const rate = all.length ? Math.round(completed / all.length * 100) : 0;
        const set = (selector, value) => { const element = $(selector); if (element) element.textContent = String(value); };
        set("#progressTotalTasks", all.length); set("#progressCompletedTasks", completed); set("#progressPendingTasks", pending); set("#progressCompletionRate", `${rate}%`);
        const dashboardRate = all.length ? Math.round(completed / all.length * 100) : 0;
        const circle = $("#dashboardProgressCircle"); if (circle) circle.style.setProperty("--progress-value", `${dashboardRate}%`);
        set("#dashboardProgressPercentage", `${dashboardRate}%`);
        set("#dashboardProgressMessage", rate === 100 && all.length ? "Everything is done. Amazing work!" : rate > 0 ? "You're making lovely progress." : "Start with one small task today.");
        const overview = $("#progressOverview");
        if (overview) overview.innerHTML = `<div class="progress-summary-card"><div class="progress-circle" style="--progress-value:${rate}%"><div class="progress-circle-inner"><strong>${rate}%</strong><small>completed</small></div></div><p class="progress-message">${completed} of ${all.length} tasks completed</p></div>`;
        const details = $("#progressDetails");
        if (details) {
            const categories = [...new Set(all.map(task => task.category || "Personal"))];
            details.innerHTML = categories.length ? categories.map(category => { const items = all.filter(task => (task.category || "Personal") === category); const done = items.filter(task => task.completed).length; const percent = Math.round(done / items.length * 100); return `<div class="weekly-progress-card"><div class="progress-card-heading"><strong>${esc(category)}</strong><span>${done}/${items.length}</span></div><div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div></div>`; }).join("") : `<div class="empty-state"><span>✧</span><p>Your progress will appear here as you complete tasks.</p></div>`;
        }
    }
    function initialize() { if (initialized) return; initialized = true; ["velvet:tasks-updated", "velvet:progress-updated", "velvet:data-reloaded", "velvet:data-updated"].forEach(name => document.addEventListener(name, render)); render(); }
    window.VelvetProgress = { initialize, render, getStats() { const all = tasks(); const completed = all.filter(task => task.completed).length; return { total: all.length, completed, pending: all.length - completed, percentage: all.length ? Math.round(completed / all.length * 100) : 0 }; } };
})();
