
/* ==========================================================
   VELVET DAY - UTILITY FUNCTIONS
   File: js/utils.js

   This file contains reusable helper functions used throughout
   the Velvet Day application.

   Functions included:
   - Generate unique IDs
   - Date and time formatting
   - Date calculations
   - Today's date
   - Relative date labels
   - HTML escaping
   - Debounce
   - Text helpers
   - Friendly greetings

   This file does not modify the DOM or save data.

   ========================================================== */

(function () {
    "use strict";

    // ----------------------------------------------------------
    // 1. GENERATE UNIQUE ID
    // ----------------------------------------------------------
    // Generates a unique ID for tasks, notes, checklist items,
    // reminders, and other app records.
    //
    // Example:
    // const id = VelvetUtils.generateId();
    // ----------------------------------------------------------

    function generateId(prefix = "item") {
        // Prefer the browser's native UUID generator
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }

        // Fallback for browsers that do not support randomUUID
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).substring(2, 10)
        );
    }

    // ----------------------------------------------------------
    // 2. GET TODAY'S DATE IN ISO FORMAT
    // ----------------------------------------------------------
    // Returns today's date as YYYY-MM-DD.
    //
    // We manually build the string instead of using
    // toISOString() because toISOString() uses UTC and can
    // sometimes return the wrong local calendar date.
    //
    // Example:
    // 2026-11-18
    // ----------------------------------------------------------

    function getTodayISO() {
        const today = new Date();

        return formatDateISO(today);
    }

    // ----------------------------------------------------------
    // 3. FORMAT DATE AS YYYY-MM-DD
    // ----------------------------------------------------------
    // Converts a Date object into a local date string.
    //
    // Example:
    // VelvetUtils.formatDateISO(new Date());
    // ----------------------------------------------------------

    function formatDateISO(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        const year = validDate.getFullYear();
        const month = String(validDate.getMonth() + 1).padStart(2, "0");
        const day = String(validDate.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // ----------------------------------------------------------
    // 4. PARSE DATE SAFELY
    // ----------------------------------------------------------
    // Converts different date formats into a valid Date object.
    //
    // Supports:
    // - Date objects
    // - YYYY-MM-DD strings
    // - Timestamp numbers
    //
    // Returns null if the date is invalid.
    // ----------------------------------------------------------

    function parseDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        let date;

        // If the value is already a Date object
        if (value instanceof Date) {
            date = new Date(value.getTime());
        }

        // If the value is a timestamp
        else if (typeof value === "number") {
            date = new Date(value);
        }

        // If the value is a string
        else if (typeof value === "string") {
            // Handle YYYY-MM-DD without UTC conversion
            const dateOnlyMatch = value.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

            if (dateOnlyMatch) {
                const year = Number(dateOnlyMatch[1]);
                const month = Number(dateOnlyMatch[2]) - 1;
                const day = Number(dateOnlyMatch[3]);

                date = new Date(year, month, day);

                // Validate the date to prevent invalid values
                if (
                    date.getFullYear() !== year ||
                    date.getMonth() !== month ||
                    date.getDate() !== day
                ) {
                    return null;
                }
            } else {
                date = new Date(value);
            }
        }

        else {
            return null;
        }

        // Check if the resulting date is valid
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    // ----------------------------------------------------------
    // 5. FORMAT DATE FOR DISPLAY
    // ----------------------------------------------------------
    // Converts a date into a readable format.
    //
    // Examples:
    // November 18, 2026
    // Wed, Nov 18
    // 18 Nov 2026
    //
    // Options can be passed to customize the output.
    // ----------------------------------------------------------

    function formatDate(date, options = {}) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        const defaultOptions = {
            year: "numeric",
            month: "long",
            day: "numeric"
        };

        return new Intl.DateTimeFormat(
            options.locale || "en-IN",
            {
                ...defaultOptions,
                ...options
            }
        ).format(validDate);
    }

    // ----------------------------------------------------------
    // 6. FORMAT SHORT DATE
    // ----------------------------------------------------------
    // Example:
    // November 18 -> Nov 18
    // ----------------------------------------------------------

    function formatShortDate(date) {
        return formatDate(date, {
            month: "short",
            day: "numeric"
        });
    }

    // ----------------------------------------------------------
    // 7. FORMAT DATE WITH WEEKDAY
    // ----------------------------------------------------------
    // Example:
    // Wednesday, November 18
    // ----------------------------------------------------------

    function formatDateWithWeekday(date) {
        return formatDate(date, {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
    }

    // ----------------------------------------------------------
    // 8. FORMAT TIME
    // ----------------------------------------------------------
    // Converts a time or date into a readable time.
    //
    // Example:
    // 14:30 -> 2:30 PM
    // ----------------------------------------------------------

    function formatTime(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        return new Intl.DateTimeFormat("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }).format(validDate);
    }

    // ----------------------------------------------------------
    // 9. FORMAT DATE AND TIME
    // ----------------------------------------------------------
    // Example:
    // Nov 18, 2026, 2:30 PM
    // ----------------------------------------------------------

    function formatDateTime(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(validDate);
    }

    // ----------------------------------------------------------
    // 10. CHECK IF DATE IS TODAY
    // ----------------------------------------------------------
    // Returns true if the provided date is today.
    // ----------------------------------------------------------

    function isToday(date) {
        return isSameDay(date, new Date());
    }

    // ----------------------------------------------------------
    // 11. CHECK IF TWO DATES ARE THE SAME DAY
    // ----------------------------------------------------------
    // Compares calendar dates without considering the time.
    // ----------------------------------------------------------

    function isSameDay(date1, date2) {
        const firstDate = parseDate(date1);
        const secondDate = parseDate(date2);

        if (!firstDate || !secondDate) {
            return false;
        }

        return (
            firstDate.getFullYear() === secondDate.getFullYear() &&
            firstDate.getMonth() === secondDate.getMonth() &&
            firstDate.getDate() === secondDate.getDate()
        );
    }

    // ----------------------------------------------------------
    // 12. CHECK IF DATE IS IN THE PAST
    // ----------------------------------------------------------
    // Compares the date with today's date.
    //
    // A date earlier than today returns true.
    // Today's date returns false.
    // ----------------------------------------------------------

    function isPastDate(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return false;
        }

        const today = startOfDay(new Date());

        return startOfDay(validDate).getTime() < today.getTime();
    }

    // ----------------------------------------------------------
    // 13. CHECK IF DATE IS IN THE FUTURE
    // ----------------------------------------------------------

    function isFutureDate(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return false;
        }

        const today = startOfDay(new Date());

        return startOfDay(validDate).getTime() > today.getTime();
    }

    // ----------------------------------------------------------
    // 14. START OF DAY
    // ----------------------------------------------------------
    // Removes the time portion from a date.
    //
    // Example:
    // 2026-11-18 15:30
    // becomes
    // 2026-11-18 00:00
    // ----------------------------------------------------------

    function startOfDay(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return null;
        }

        return new Date(
            validDate.getFullYear(),
            validDate.getMonth(),
            validDate.getDate()
        );
    }

    // ----------------------------------------------------------
    // 15. ADD DAYS TO A DATE
    // ----------------------------------------------------------
    // Returns a new Date without modifying the original date.
    //
    // Example:
    // addDays(new Date(), 7);
    // ----------------------------------------------------------

    function addDays(date, numberOfDays) {
        const validDate = parseDate(date);

        if (!validDate || !Number.isFinite(numberOfDays)) {
            return null;
        }

        const result = new Date(validDate);

        result.setDate(result.getDate() + numberOfDays);

        return result;
    }

    // ----------------------------------------------------------
    // 16. ADD MONTHS TO A DATE
    // ----------------------------------------------------------
    // Returns a new date with the specified months added.
    //
    // Example:
    // addMonths(new Date(), 1);
    //
    // Handles month boundaries.
    // ----------------------------------------------------------

    function addMonths(date, numberOfMonths) {
        const validDate = parseDate(date);

        if (!validDate || !Number.isFinite(numberOfMonths)) {
            return null;
        }

        const result = new Date(validDate);

        const originalDay = result.getDate();

        // Move to the first day to avoid month overflow
        result.setDate(1);

        result.setMonth(result.getMonth() + numberOfMonths);

        // Get the last day of the target month
        const lastDayOfMonth = new Date(
            result.getFullYear(),
            result.getMonth() + 1,
            0
        ).getDate();

        // Restore the original day or use the last available day
        result.setDate(Math.min(originalDay, lastDayOfMonth));

        return result;
    }

    // ----------------------------------------------------------
    // 17. CALCULATE DAYS BETWEEN TWO DATES
    // ----------------------------------------------------------
    // Returns the calendar-day difference.
    //
    // Example:
    // daysBetween("2026-11-18", "2026-11-20");
    // Returns: 2
    // ----------------------------------------------------------

    function daysBetween(date1, date2) {
        const firstDate = startOfDay(date1);
        const secondDate = startOfDay(date2);

        if (!firstDate || !secondDate) {
            return null;
        }

        // Convert both dates into UTC calendar-day values.
        // This avoids DST differences affecting the result.
        const firstUTC = Date.UTC(
            firstDate.getFullYear(),
            firstDate.getMonth(),
            firstDate.getDate()
        );

        const secondUTC = Date.UTC(
            secondDate.getFullYear(),
            secondDate.getMonth(),
            secondDate.getDate()
        );

        const millisecondsPerDay = 24 * 60 * 60 * 1000;

        return Math.round(
            (secondUTC - firstUTC) / millisecondsPerDay
        );
    }

    // ----------------------------------------------------------
    // 18. GET RELATIVE DATE LABEL
    // ----------------------------------------------------------
    // Returns friendly labels for dates.
    //
    // Examples:
    // Today
    // Tomorrow
    // Yesterday
    // In 3 days
    // 3 days ago
    // ----------------------------------------------------------

    function getRelativeDateLabel(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        const difference = daysBetween(new Date(), validDate);

        if (difference === 0) {
            return "Today";
        }

        if (difference === 1) {
            return "Tomorrow";
        }

        if (difference === -1) {
            return "Yesterday";
        }

        if (difference > 1 && difference <= 7) {
            return `In ${difference} days`;
        }

        if (difference < -1 && difference >= -7) {
            return `${Math.abs(difference)} days ago`;
        }

        return formatShortDate(validDate);
    }

    // ----------------------------------------------------------
    // 19. ESCAPE HTML
    // ----------------------------------------------------------
    // Converts special characters into safe HTML entities.
    //
    // This should be used when inserting user-entered text
    // into HTML templates.
    //
    // Example:
    // escapeHTML("<script>alert('Hi')</script>");
    // ----------------------------------------------------------

    function escapeHTML(value) {
        const stringValue = String(value ?? "");

        return stringValue.replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return replacements[character];
        });
    }

    // ----------------------------------------------------------
    // 20. TRUNCATE TEXT
    // ----------------------------------------------------------
    // Shortens text when it exceeds a specified length.
    //
    // Example:
    // truncate("This is a long note", 10);
    // ----------------------------------------------------------

    function truncate(text, maxLength = 100) {
        const value = String(text ?? "");

        if (value.length <= maxLength) {
            return value;
        }

        return value.substring(0, maxLength).trimEnd() + "...";
    }

    // ----------------------------------------------------------
    // 21. CAPITALIZE FIRST LETTER
    // ----------------------------------------------------------
    // Example:
    // capitalize("velvet day");
    // Returns: Velvet day
    // ----------------------------------------------------------

    function capitalize(text) {
        const value = String(text ?? "").trim();

        if (!value) {
            return "";
        }

        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // ----------------------------------------------------------
    // 22. DEBOUNCE
    // ----------------------------------------------------------
    // Delays the execution of a function until the user stops
    // triggering it for a specified amount of time.
    //
    // Useful for:
    // - Search
    // - Auto-saving notes
    // - Filtering tasks
    //
    // Example:
    // const search = debounce(function () {
    //     console.log("Search...");
    // }, 300);
    // ----------------------------------------------------------

    function debounce(callback, delay = 300) {
        let timeoutId;

        return function (...args) {
            const context = this;

            clearTimeout(timeoutId);

            timeoutId = setTimeout(function () {
                callback.apply(context, args);
            }, delay);
        };
    }

    // ----------------------------------------------------------
    // 23. THROTTLE
    // ----------------------------------------------------------
    // Limits how often a function can execute.
    //
    // Useful for:
    // - Scroll events
    // - Resize events
    // - Repeated button actions
    // ----------------------------------------------------------

    function throttle(callback, delay = 300) {
        let lastExecution = 0;

        return function (...args) {
            const now = Date.now();

            if (now - lastExecution < delay) {
                return;
            }

            lastExecution = now;

            callback.apply(this, args);
        };
    }

    // ----------------------------------------------------------
    // 24. GET FRIENDLY GREETING
    // ----------------------------------------------------------
    // Returns a greeting based on the current local time.
    //
    // Morning
    // Afternoon
    // Evening
    // ----------------------------------------------------------

    function getGreeting() {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return "Good morning";
        }

        if (hour >= 12 && hour < 17) {
            return "Good afternoon";
        }

        if (hour >= 17 && hour < 21) {
            return "Good evening";
        }

        return "Good night";
    }

    // ----------------------------------------------------------
    // 25. GET DAY NAME
    // ----------------------------------------------------------
    // Returns the weekday name.
    //
    // Example:
    // getDayName(new Date());
    // Returns: Wednesday
    // ----------------------------------------------------------

    function getDayName(date, short = false) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        return new Intl.DateTimeFormat("en-IN", {
            weekday: short ? "short" : "long"
        }).format(validDate);
    }

    // ----------------------------------------------------------
    // 26. GET MONTH NAME
    // ----------------------------------------------------------
    // Returns the month name.
    //
    // Example:
    // getMonthName(new Date());
    // Returns: November
    // ----------------------------------------------------------

    function getMonthName(date, short = false) {
        const validDate = parseDate(date);

        if (!validDate) {
            return "";
        }

        return new Intl.DateTimeFormat("en-IN", {
            month: short ? "short" : "long"
        }).format(validDate);
    }

    // ----------------------------------------------------------
    // 27. GET START OF WEEK
    // ----------------------------------------------------------
    // Returns the first date of the week.
    //
    // Monday is used by default.
    //
    // weekStartsOn:
    // 0 = Sunday
    // 1 = Monday
    // ----------------------------------------------------------

    function getStartOfWeek(date, weekStartsOn = 1) {
        const validDate = startOfDay(date);

        if (!validDate) {
            return null;
        }

        const currentDay = validDate.getDay();

        const difference =
            (currentDay - weekStartsOn + 7) % 7;

        validDate.setDate(validDate.getDate() - difference);

        return validDate;
    }

    // ----------------------------------------------------------
    // 28. GET END OF WEEK
    // ----------------------------------------------------------
    // Returns the final date of the week.
    // ----------------------------------------------------------

    function getEndOfWeek(date, weekStartsOn = 1) {
        const startDate = getStartOfWeek(date, weekStartsOn);

        if (!startDate) {
            return null;
        }

        return addDays(startDate, 6);
    }

    // ----------------------------------------------------------
    // 29. GET START OF MONTH
    // ----------------------------------------------------------

    function getStartOfMonth(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return null;
        }

        return new Date(
            validDate.getFullYear(),
            validDate.getMonth(),
            1
        );
    }

    // ----------------------------------------------------------
    // 30. GET END OF MONTH
    // ----------------------------------------------------------

    function getEndOfMonth(date) {
        const validDate = parseDate(date);

        if (!validDate) {
            return null;
        }

        return new Date(
            validDate.getFullYear(),
            validDate.getMonth() + 1,
            0
        );
    }

    // ----------------------------------------------------------
    // 31. PUBLIC API
    // ----------------------------------------------------------
    // Exposes all utility functions through VelvetUtils.
    //
    // Other JavaScript files can now use:
    // VelvetUtils.generateId()
    // VelvetUtils.getTodayISO()
    // VelvetUtils.formatDate()
    // VelvetUtils.escapeHTML()
    // ----------------------------------------------------------

    window.VelvetUtils = {

        // IDs
        generateId,

        // Date parsing and formatting
        parseDate,
        getTodayISO,
        formatDateISO,
        formatDate,
        formatShortDate,
        formatDateWithWeekday,
        formatTime,
        formatDateTime,

        // Date comparisons
        isToday,
        isSameDay,
        isPastDate,
        isFutureDate,

        // Date calculations
        startOfDay,
        addDays,
        addMonths,
        daysBetween,

        // Relative date helpers
        getRelativeDateLabel,
        getDayName,
        getMonthName,
        getStartOfWeek,
        getEndOfWeek,
        getStartOfMonth,
        getEndOfMonth,

        // Text helpers
        escapeHTML,
        truncate,
        capitalize,

        // Performance helpers
        debounce,
        throttle,

        // UI helpers
        getGreeting
    };

    console.log("✨ Velvet Day utilities initialized.");

})();
