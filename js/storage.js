/* =========================================================
   VELVET DAY - STORAGE
   Handles local storage, data management, backups and imports.
   ========================================================= */

window.VelvetStorage = (() => {
    "use strict";

    // -----------------------------------------------------
    // Configuration
    // -----------------------------------------------------

    const STORAGE_KEY = "velvet-day:data:v1";
    const RECOVERY_KEY = "velvet-day:data:recovery";
    const BACKUP_FORMAT = "velvet-day-backup";
    const BACKUP_VERSION = 1;

    const DEFAULT_DATA = {
        version: 1,

        tasks: [],
        notes: [],
        checklists: [],
        brainDump: [],
        recurring: [],
        reminders: [],

        settings: {
            theme: "dark",
            remindersEnabled: true,
            reminderTime: "09:00",
            reminderAdvanceMinutes: 0,
            weekStartsOn: "monday",
            showCompletedTasks: true,
            compactMode: false
        },

        metadata: {
            createdAt: null,
            updatedAt: null
        }
    };

    // In-memory fallback for environments where localStorage
    // is unavailable.
    let memoryFallback = null;

    // Tracks whether existing saved data was corrupted.
    let corruptedDataDetected = false;

    // -----------------------------------------------------
    // Utility functions
    // -----------------------------------------------------

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getTimestamp() {
        return new Date().toISOString();
    }

    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    function isObject(value) {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }

    function isStorageAvailable() {
        try {
            const testKey = "__velvet_day_storage_test__";

            window.localStorage.setItem(testKey, "test");
            window.localStorage.removeItem(testKey);

            return true;
        } catch (error) {
            return false;
        }
    }

    function getLocalStorage() {
        try {
            return window.localStorage;
        } catch (error) {
            return null;
        }
    }

    function safeParse(value) {
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error("Velvet Day: Unable to parse saved data.", error);
            return null;
        }
    }

    // -----------------------------------------------------
    // Default data
    // -----------------------------------------------------

    function createDefaultData() {
        const defaults = deepClone(DEFAULT_DATA);
        const timestamp = getTimestamp();

        defaults.metadata.createdAt = timestamp;
        defaults.metadata.updatedAt = timestamp;

        return defaults;
    }

    // -----------------------------------------------------
    // Recovery backup
    // -----------------------------------------------------

    function preserveCorruptedData(rawData) {
        if (typeof rawData !== "string" || rawData.length === 0) {
            return false;
        }

        const storage = getLocalStorage();

        if (!storage) {
            return false;
        }

        try {
            const existingRecovery = safeParse(
                storage.getItem(RECOVERY_KEY)
            );

            // Do not replace an existing recovery backup.
            // The first corrupted version is preserved.
            if (existingRecovery && existingRecovery.rawData) {
                return true;
            }

            const recoveryBackup = {
                format: "velvet-day-recovery",
                savedAt: getTimestamp(),
                reason: "The original Velvet Day data could not be parsed.",
                rawData: rawData
            };

            storage.setItem(
                RECOVERY_KEY,
                JSON.stringify(recoveryBackup)
            );

            console.warn(
                "Velvet Day: Corrupted data was preserved in a recovery backup."
            );

            return true;
        } catch (error) {
            console.error(
                "Velvet Day: Could not preserve corrupted data.",
                error
            );

            return false;
        }
    }

    function getRecoveryBackup() {
        const storage = getLocalStorage();

        if (!storage) {
            return null;
        }

        try {
            const rawBackup = storage.getItem(RECOVERY_KEY);

            if (!rawBackup) {
                return null;
            }

            return safeParse(rawBackup);
        } catch (error) {
            console.error(
                "Velvet Day: Could not read recovery backup.",
                error
            );

            return null;
        }
    }

    function clearRecoveryBackup() {
        const storage = getLocalStorage();

        if (!storage) {
            return false;
        }

        try {
            storage.removeItem(RECOVERY_KEY);
            return true;
        } catch (error) {
            console.error(
                "Velvet Day: Could not remove recovery backup.",
                error
            );

            return false;
        }
    }

    // -----------------------------------------------------
    // Data normalization
    // -----------------------------------------------------

    function normalizeData(data) {
        const defaults = createDefaultData();

        if (!isObject(data)) {
            return defaults;
        }

        const normalized = {
            ...defaults,
            ...data
        };

        const collectionNames = [
            "tasks",
            "notes",
            "checklists",
            "brainDump",
            "recurring",
            "reminders"
        ];

        collectionNames.forEach((collectionName) => {
            if (!Array.isArray(normalized[collectionName])) {
                normalized[collectionName] = [];
            }
        });

        normalized.settings = {
            ...defaults.settings,
            ...(isObject(data.settings) ? data.settings : {})
        };

        normalized.metadata = {
            ...defaults.metadata,
            ...(isObject(data.metadata) ? data.metadata : {})
        };

        normalized.version = 1;

        if (!normalized.metadata.createdAt) {
            normalized.metadata.createdAt = getTimestamp();
        }

        normalized.metadata.updatedAt = getTimestamp();

        return normalized;
    }

    // -----------------------------------------------------
    // Read saved data
    // -----------------------------------------------------

    function getRawData() {
        const storage = getLocalStorage();

        if (!storage) {
            if (!memoryFallback) {
                memoryFallback = createDefaultData();
            }

            return deepClone(memoryFallback);
        }

        let rawData;

        try {
            rawData = storage.getItem(STORAGE_KEY);
        } catch (error) {
            console.error(
                "Velvet Day: Unable to read local storage.",
                error
            );

            if (!memoryFallback) {
                memoryFallback = createDefaultData();
            }

            return deepClone(memoryFallback);
        }

        // First-time application usage.
        if (rawData === null) {
            const defaultData = createDefaultData();

            memoryFallback = defaultData;

            try {
                storage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(defaultData)
                );
            } catch (error) {
                console.error(
                    "Velvet Day: Could not initialize local storage.",
                    error
                );
            }

            return deepClone(defaultData);
        }

        const parsedData = safeParse(rawData);

        // Preserve corrupted data before returning defaults.
        if (!isObject(parsedData)) {
            corruptedDataDetected = true;
            preserveCorruptedData(rawData);

            if (!memoryFallback) {
                memoryFallback = createDefaultData();
            }

            return deepClone(memoryFallback);
        }

        const normalizedData = normalizeData(parsedData);

        memoryFallback = normalizedData;

        return deepClone(normalizedData);
    }

    // -----------------------------------------------------
    // Save data
    // -----------------------------------------------------

    function saveData(data) {
        if (!isObject(data)) {
            console.error(
                "Velvet Day: Invalid data supplied to saveData()."
            );

            return false;
        }

        const normalizedData = normalizeData(data);

        // If corrupted data was detected, make sure it is
        // preserved before replacing the main storage entry.
        if (corruptedDataDetected) {
            const storage = getLocalStorage();

            if (storage) {
                try {
                    const existingData = storage.getItem(STORAGE_KEY);

                    if (existingData) {
                        preserveCorruptedData(existingData);
                    }
                } catch (error) {
                    console.error(
                        "Velvet Day: Could not verify recovery backup.",
                        error
                    );

                    return false;
                }
            }
        }

        const serializedData = JSON.stringify(normalizedData);

        const storage = getLocalStorage();

        // Keep the latest data in memory even if persistent
        // storage is unavailable.
        memoryFallback = normalizedData;

        if (!storage) {
            console.warn(
                "Velvet Day: Changes are only stored in memory because local storage is unavailable."
            );

            return false;
        }

        try {
            storage.setItem(STORAGE_KEY, serializedData);

            corruptedDataDetected = false;

            dispatchStorageEvent({
                type: "save",
                data: deepClone(normalizedData)
            });

            return true;
        } catch (error) {
            console.error(
                "Velvet Day: Unable to save data.",
                error
            );

            return false;
        }
    }

    // -----------------------------------------------------
    // Get complete data
    // -----------------------------------------------------

    function getAll() {
        return getRawData();
    }

    // -----------------------------------------------------
    // Get a value
    // Supports nested keys, for example:
    // get("settings.theme")
    // -----------------------------------------------------

    function get(key, fallback = null) {
        if (!key || typeof key !== "string") {
            return fallback;
        }

        const data = getRawData();

        const keys = key.split(".");
        let value = data;

        for (const part of keys) {
            if (
                value === null ||
                value === undefined ||
                !Object.prototype.hasOwnProperty.call(value, part)
            ) {
                return fallback;
            }

            value = value[part];
        }

        return value === undefined ? fallback : value;
    }

    // -----------------------------------------------------
    // Set a value
    // Supports nested keys, for example:
    // set("settings.theme", "light")
    // -----------------------------------------------------

    function set(key, value) {
        if (!key || typeof key !== "string") {
            console.error("Velvet Day: Invalid storage key.");
            return false;
        }

        const data = getRawData();
        const keys = key.split(".");
        let current = data;

        for (let index = 0; index < keys.length - 1; index++) {
            const part = keys[index];

            if (!isObject(current[part])) {
                current[part] = {};
            }

            current = current[part];
        }

        current[keys[keys.length - 1]] = value;

        return saveData(data);
    }

    // -----------------------------------------------------
    // Remove a value
    // -----------------------------------------------------

    function remove(key) {
        if (!key || typeof key !== "string") {
            return false;
        }

        const data = getRawData();
        const keys = key.split(".");
        let current = data;

        for (let index = 0; index < keys.length - 1; index++) {
            const part = keys[index];

            if (!isObject(current[part])) {
                return false;
            }

            current = current[part];
        }

        const finalKey = keys[keys.length - 1];

        if (!Object.prototype.hasOwnProperty.call(current, finalKey)) {
            return false;
        }

        delete current[finalKey];

        return saveData(data);
    }

    // -----------------------------------------------------
    // Clear application data
    // Does not remove unrelated localStorage entries.
    // -----------------------------------------------------

    function clear() {
        const storage = getLocalStorage();

        if (!storage) {
            memoryFallback = createDefaultData();
            return false;
        }

        try {
            storage.removeItem(STORAGE_KEY);

            memoryFallback = createDefaultData();
            corruptedDataDetected = false;

            // Keep the recovery backup intact.
            saveData(memoryFallback);

            dispatchStorageEvent({
                type: "clear",
                data: getAll()
            });

            return true;
        } catch (error) {
            console.error(
                "Velvet Day: Unable to clear application data.",
                error
            );

            return false;
        }
    }

    // -----------------------------------------------------
    // Export data
    // Downloads a JSON backup.
    // -----------------------------------------------------

    function exportData() {
        const data = getAll();

        const backup = {
            format: BACKUP_FORMAT,
            backupVersion: BACKUP_VERSION,
            exportedAt: getTimestamp(),
            data: data
        };

        const json = JSON.stringify(backup, null, 2);

        const blob = new Blob(
            [json],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = `velvet-day-backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        return json;
    }

    // -----------------------------------------------------
    // Validate imported backup
    // -----------------------------------------------------

    function validateImportData(importedData) {
        if (!isObject(importedData)) {
            throw new Error("Invalid backup file.");
        }

        let data = importedData;

        // Support the current backup envelope.
        if (importedData.format === BACKUP_FORMAT) {
            if (!isObject(importedData.data)) {
                throw new Error("Backup data is missing or invalid.");
            }

            data = importedData.data;
        }

        // Also support importing a plain Velvet Day data object.
        const requiredCollections = [
            "tasks",
            "notes",
            "checklists",
            "brainDump"
        ];

        for (const collectionName of requiredCollections) {
            if (!Array.isArray(data[collectionName])) {
                throw new Error(
                    `Invalid backup: ${collectionName} must be an array.`
                );
            }
        }

        const optionalCollections = [
            "recurring",
            "reminders"
        ];

        for (const collectionName of optionalCollections) {
            if (
                data[collectionName] !== undefined &&
                !Array.isArray(data[collectionName])
            ) {
                throw new Error(
                    `Invalid backup: ${collectionName} must be an array.`
                );
            }
        }

        return normalizeData(data);
    }

    // -----------------------------------------------------
    // Import backup
    // Accepts a File object or JSON string.
    // -----------------------------------------------------

    async function importData(file) {
        try {
            if (!file) {
                throw new Error("No backup file selected.");
            }

            let content;

            if (typeof file === "string") {
                content = file;
            } else if (typeof file.text === "function") {
                content = await file.text();
            } else {
                throw new Error("Unsupported backup file.");
            }

            const parsedData = safeParse(content);

            if (!parsedData) {
                throw new Error("The backup file contains invalid JSON.");
            }

            const validatedData = validateImportData(parsedData);

            const wasSaved = saveData(validatedData);

            if (!wasSaved) {
                throw new Error(
                    "The backup could not be saved to local storage."
                );
            }

            dispatchStorageEvent({
                type: "import",
                data: deepClone(validatedData)
            });

            return {
                success: true,
                message: "Backup imported successfully.",
                data: deepClone(validatedData)
            };
        } catch (error) {
            console.error(
                "Velvet Day: Import failed.",
                error
            );

            return {
                success: false,
                message: error.message || "Unable to import backup."
            };
        }
    }

    // -----------------------------------------------------
    // Storage change event
    // -----------------------------------------------------

    function dispatchStorageEvent(detail = {}) {
        const event = new CustomEvent("velvet:storage-updated", {
            detail
        });

        window.dispatchEvent(event);
    }

    // -----------------------------------------------------
    // Collection helpers
    // -----------------------------------------------------

    function getCollection(collectionName) {
        const collection = get(collectionName, []);

        return Array.isArray(collection) ? collection : [];
    }

    function setCollection(collectionName, items) {
        if (!Array.isArray(items)) {
            console.error(
                `Velvet Day: ${collectionName} must be an array.`
            );

            return false;
        }

        return set(collectionName, items);
    }

    function addToCollection(collectionName, item) {
        if (!isObject(item)) {
            console.error("Velvet Day: Invalid collection item.");
            return false;
        }

        const collection = getCollection(collectionName);

        const newItem = {
            ...item,
            id: item.id || generateId()
        };

        if (!newItem.createdAt) {
            newItem.createdAt = getTimestamp();
        }

        newItem.updatedAt = getTimestamp();

        collection.push(newItem);

        const wasSaved = setCollection(collectionName, collection);

        return wasSaved ? newItem : false;
    }

    function updateInCollection(collectionName, itemId, updates) {
        if (!itemId) {
            return false;
        }

        const collection = getCollection(collectionName);

        const itemIndex = collection.findIndex(
            (item) => String(item.id) === String(itemId)
        );

        if (itemIndex === -1) {
            return false;
        }

        const existingItem = collection[itemIndex];

        let updatedItem;

        if (typeof updates === "function") {
            updatedItem = updates(deepClone(existingItem));
        } else if (isObject(updates)) {
            updatedItem = {
                ...existingItem,
                ...updates
            };
        } else {
            return false;
        }

        if (!isObject(updatedItem)) {
            return false;
        }

        collection[itemIndex] = {
            ...updatedItem,
            id: existingItem.id,
            updatedAt: getTimestamp()
        };

        const wasSaved = setCollection(collectionName, collection);

        return wasSaved ? collection[itemIndex] : false;
    }

    function deleteFromCollection(collectionName, itemId) {
        if (!itemId) {
            return false;
        }

        const collection = getCollection(collectionName);

        const updatedCollection = collection.filter(
            (item) => String(item.id) !== String(itemId)
        );

        if (updatedCollection.length === collection.length) {
            return false;
        }

        return setCollection(collectionName, updatedCollection);
    }

    // -----------------------------------------------------
    // Storage information
    // -----------------------------------------------------

    function getStorageInfo() {
        const storage = getLocalStorage();

        let usedBytes = 0;

        if (storage) {
            try {
                const savedData = storage.getItem(STORAGE_KEY);

                if (savedData) {
                    usedBytes = new Blob([savedData]).size;
                }
            } catch (error) {
                console.error(
                    "Velvet Day: Could not calculate storage usage.",
                    error
                );
            }
        }

        return {
            available: isStorageAvailable(),
            usedBytes,
            usedKB: Number((usedBytes / 1024).toFixed(2)),
            hasRecoveryBackup: Boolean(getRecoveryBackup())
        };
    }

    // -----------------------------------------------------
    // Public API
    // -----------------------------------------------------

    return {
        // General storage
        isStorageAvailable,
        getAll,
        get,
        set,
        remove,
        saveData,
        clear,

        // Backup and restore
        exportData,
        importData,

        // Recovery
        getRecoveryBackup,
        clearRecoveryBackup,

        // Collection operations
        getCollection,
        setCollection,
        addToCollection,
        updateInCollection,
        deleteFromCollection,

        // Storage information
        getStorageInfo,

        // Events
        dispatchStorageEvent
    };
})();
