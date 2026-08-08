// ==UserScript==
// @name         RS3 Wiki Price List Manager
// @namespace    https://prices.runescape.wiki/
// @version      2.5
// @description  Preset & Custom Favourite Lists for the RS3 Price Wiki
// @homepageURL  https://github.com/renormalised/rs3-wiki-price-helper
// @supportURL   https://github.com/renormalised/rs3-wiki-price-helper/issues
// @match        https://prices.runescape.wiki/rs/favourites*
// @run-at       document-end
// ==/UserScript==

(() => {
    "use strict";

    const LISTS_KEY = "wgl-rs-favourite-lists";
    const ACTIVE_KEY = "wgl-rs-active-list";
    const FAV_KEY = "wgl-rs-favs";

    /*
     * Default read-only lists.
     */
    const DEFAULT_LISTS_URL =
        "https://raw.githubusercontent.com/renormalised/rs3-wiki-price-helper/main/preset-lists.json";

    let defaultLists = {};
    let userLists = {};
    let lists = {};
    let activeList = localStorage.getItem(ACTIVE_KEY);

    let itemMapping = [];
    let mappingPromise = null;

    /*
     * -------------------------
     * LIST LOADING
     * -------------------------
     */

    async function loadDefaultLists() {
        try {
            const response =
                await fetch(DEFAULT_LISTS_URL, {
                    cache: "no-store"
                });

            if (!response.ok) {
                throw new Error(
                    `Default list request failed: ${response.status}`
                );
            }

            const data =
                await response.json();

            if (
                !data ||
                typeof data !== "object" ||
                Array.isArray(data)
            ) {
                throw new Error(
                    "Default list JSON must contain an object."
                );
            }

            await loadMapping();

            const mappingByName =
                new Map(
                    itemMapping
                        .filter(
                            item =>
                                item &&
                                item.name &&
                                item.id != null
                        )
                        .map(
                            item => [
                                item.name
                                    .trim()
                                    .toLowerCase(),
                                String(item.id)
                            ]
                        )
                );

            defaultLists = {};

            for (const [listName, itemNames] of Object.entries(data)) {
                if (!Array.isArray(itemNames)) {
                    console.warn(
                        `[RS3 Lists] "${listName}" is not an array.`
                    );

                    continue;
                }

                const resolvedItems = [];

                for (const itemName of itemNames) {
                    if (
                        typeof itemName !== "string" ||
                        !itemName.trim()
                    ) {
                        continue;
                    }

                    const key =
                        itemName.trim().toLowerCase();

                    const id =
                        mappingByName.get(key);

                    if (id == null) {
                        console.warn(
                            `[RS3 Lists] Could not find item "${itemName}" for default list "${listName}".`
                        );

                        continue;
                    }

                    resolvedItems.push(id);
                }

                defaultLists[listName] = [
                    ...new Set(resolvedItems)
                ];
            }

            return true;

        } catch (error) {
            console.error(
                "[RS3 Lists] Could not load default lists:",
                error
            );

            defaultLists = {};

            return false;
        }
    }

    function loadUserLists() {
        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(LISTS_KEY)
                );

            if (
                !saved ||
                typeof saved !== "object" ||
                Array.isArray(saved)
            ) {
                return {};
            }

            /*
             * Older versions stored default lists in the same
             * localStorage object as user lists.
             *
             * Remove anything whose name is now supplied by
             * the JSON defaults.
             */
            const cleaned = {};

            Object.entries(saved).forEach(
                ([name, items]) => {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            defaultLists,
                            name
                        )
                    ) {
                        return;
                    }

                    if (!Array.isArray(items)) {
                        return;
                    }

                    cleaned[name] = [
                        ...new Set(
                            items.map(String)
                        )
                    ];
                }
            );

            return cleaned;

        } catch {
            return {};
        }
    }

    function rebuildLists() {
        lists = {
            ...defaultLists,
            ...userLists
        };
    }

    function saveLists() {
        /*
         * Only user-created lists are saved.
         *
         * Default lists always come from the JSON and are
         * therefore never written to localStorage.
         */
        localStorage.setItem(
            LISTS_KEY,
            JSON.stringify(userLists)
        );
    }

    function isDefaultList(name) {
        return Object.prototype.hasOwnProperty.call(
            defaultLists,
            name
        );
    }

    function getListNames() {
        return [
            ...Object.keys(defaultLists),
            ...Object.keys(userLists)
        ];
    }

    function getItems() {
        return lists[activeList] || [];
    }

    function setItems(items) {
        /*
         * Never allow a default list to be modified.
         */
        if (isDefaultList(activeList)) {
            return;
        }

        userLists[activeList] = [
            ...new Set(items.map(String))
        ];

        rebuildLists();
        saveLists();
    }

    /*
     * -------------------------
     * INITIAL ACTIVE LIST
     * -------------------------
     */

    function ensureActiveList() {
        const names =
            getListNames();

        if (!names.length) {
            activeList = null;

            localStorage.removeItem(
                ACTIVE_KEY
            );

            return;
        }

        if (
            !activeList ||
            !lists[activeList]
        ) {
            activeList = names[0];

            localStorage.setItem(
                ACTIVE_KEY,
                activeList
            );
        }
    }

    /*
     * -------------------------
     * FILTER ROW
     * -------------------------
     */

    function findFilterInput() {
        return [...document.querySelectorAll("input")].find(
            input =>
                /filter by name/i.test(
                    input.placeholder || ""
                )
        );
    }

    function findFilterRow() {
        const input = findFilterInput();

        if (!input) {
            return null;
        }

        let element = input;

        for (
            let i = 0;
            i < 6 && element.parentElement;
            i++
        ) {
            element = element.parentElement;

            const rect =
                element.getBoundingClientRect();

            if (
                rect.width > 500 &&
                rect.height < 120
            ) {
                return element;
            }
        }

        return input.parentElement;
    }

    /*
     * -------------------------
     * STYLES
     * -------------------------
     */

    function injectStyles() {
        if (
            document.getElementById(
                "rs-custom-list-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "rs-custom-list-styles";

        style.textContent = `
            .rs-custom-filter-row {
                display: flex !important;
                align-items: center !important;
                width: 100%;
                min-width: 0;
                gap: 8px;
            }

            #rs-custom-list-controls {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 6px;
                margin-left: auto;
                min-width: 0;
                flex: 1 1 auto;
                overflow-x: auto;
                scrollbar-width: none;
            }

            #rs-custom-list-controls::-webkit-scrollbar {
                display: none;
            }

            .rs-custom-list-button,
            .rs-custom-list-add,
            .rs-custom-list-new,
            .rs-custom-list-import {
                flex: 0 0 auto;
                appearance: none;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 4px;
                background: rgba(255,255,255,.045);
                color: inherit;
                padding: 5px 9px;
                font: inherit;
                font-size: 13px;
                line-height: 1.2;
                white-space: nowrap;
                cursor: pointer;
            }

            .rs-custom-list-button:hover,
            .rs-custom-list-add:hover,
            .rs-custom-list-new:hover,
            .rs-custom-list-import:hover {
                background: rgba(255,255,255,.09);
                border-color: rgba(255,255,255,.28);
            }

            .rs-custom-list-button.active {
                background: rgba(66,140,76,.25);
                border-color: rgba(93,174,103,.65);
                color: #9ce5a5;
                font-weight: 600;
            }

            .rs-custom-list-button.default {
                border-color: rgba(120,150,180,.28);
            }

            .rs-custom-list-button.default.active {
                background: rgba(66,110,150,.25);
                border-color: rgba(110,160,205,.65);
                color: #a9d5f5;
            }

            .rs-custom-list-button.default::after {
                content: " 🔒";
                font-size: 10px;
                opacity: .65;
            }

            .rs-custom-list-new {
                width: 30px;
                padding: 5px 0;
                border-style: dashed;
                color: #aaa;
                font-size: 16px;
            }

            .rs-custom-list-add,
            .rs-custom-list-import {
                border-style: dashed;
                color: #aaa;
            }

            .rs-custom-list-add:disabled {
                opacity: .45;
                cursor: default;
            }

            #rs-popup,
            #rs-context-menu {
                position: fixed;
                z-index: 100000;
                box-sizing: border-box;
                background: #242424;
                color: #eee;
                border: 1px solid #555;
                border-radius: 6px;
                box-shadow: 0 8px 28px rgba(0,0,0,.45);
            }

            #rs-popup {
                width: 370px;
                max-width: calc(100vw - 24px);
                padding: 12px;
            }

            #rs-popup[hidden],
            #rs-context-menu[hidden] {
                display: none;
            }

            .rs-popup-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 9px;
                font-size: 13px;
                font-weight: 600;
            }

            .rs-popup-close {
                border: 0;
                background: transparent;
                color: #999;
                padding: 0 3px;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
            }

            .rs-popup-close:hover {
                color: #fff;
            }

            .rs-popup-label {
                display: block;
                margin: 10px 0 5px;
                color: #aaa;
                font-size: 12px;
            }

            .rs-popup-input {
                width: 100%;
                box-sizing: border-box;
                padding: 8px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #171717;
                color: #fff;
                outline: none;
                font: inherit;
                font-size: 13px;
            }

            .rs-popup-input:focus {
                border-color: #619c69;
            }

            .rs-popup-actions {
                display: flex;
                justify-content: flex-end;
                gap: 7px;
                margin-top: 12px;
            }

            .rs-popup-button {
                border: 1px solid #555;
                border-radius: 4px;
                background: #333;
                color: #ddd;
                padding: 6px 11px;
                cursor: pointer;
                font: inherit;
                font-size: 12px;
            }

            .rs-popup-button:hover {
                background: #444;
                color: #fff;
            }

            .rs-popup-button.primary {
                background: #35623c;
                border-color: #4e8756;
                color: #fff;
            }

            .rs-popup-button.primary:hover {
                background: #407449;
            }

            #rs-add-search {
                width: 100%;
                box-sizing: border-box;
                padding: 8px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #171717;
                color: #fff;
                outline: none;
                font: inherit;
                font-size: 13px;
            }

            #rs-add-search:focus {
                border-color: #619c69;
            }

            #rs-add-results {
                max-height: 330px;
                margin-top: 7px;
                overflow-y: auto;
            }

            .rs-add-status {
                padding: 10px 4px;
                color: #888;
                font-size: 12px;
            }

            .rs-add-result {
                display: flex;
                align-items: center;
                width: 100%;
                gap: 8px;
                padding: 6px;
                border: 0;
                border-radius: 4px;
                background: transparent;
                color: #ddd;
                text-align: left;
                cursor: pointer;
            }

            .rs-add-result:hover:not(:disabled) {
                background: #353535;
                color: #fff;
            }

            .rs-add-result:disabled {
                opacity: .45;
                cursor: default;
            }

            .rs-add-result img {
                width: 28px;
                height: 28px;
                object-fit: contain;
                flex: 0 0 28px;
            }

            .rs-add-name {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .rs-add-action {
                color: #72c17d;
                font-size: 12px;
            }

            .rs-add-result:disabled .rs-add-action {
                color: #777;
            }

            #rs-context-menu {
                width: 170px;
                padding: 4px;
            }

            .rs-context-item {
                display: block;
                width: 100%;
                box-sizing: border-box;
                border: 0;
                border-radius: 4px;
                background: transparent;
                color: #ddd;
                padding: 7px 9px;
                text-align: left;
                font: inherit;
                font-size: 12px;
                cursor: pointer;
            }

            .rs-context-item:hover {
                background: #3a3a3a;
                color: #fff;
            }

            .rs-context-item.danger {
                color: #e98b8b;
            }

            .rs-context-item.danger:hover {
                background: #4a2d2d;
            }

            @media (max-width: 700px) {
                #rs-custom-list-controls {
                    justify-content: flex-start;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /*
     * -------------------------
     * CONTROLS
     * -------------------------
     */

    function createControls() {
        if (
            document.getElementById(
                "rs-custom-list-controls"
            )
        ) {
            return;
        }

        const input =
            findFilterInput();

        const row =
            findFilterRow();

        if (!input || !row) {
            return;
        }

        let shell = row;

        const style =
            getComputedStyle(row);

        if (
            style.display !== "flex" &&
            style.display !== "inline-flex"
        ) {
            shell =
                document.createElement("div");

            shell.className =
                "rs-custom-filter-row";

            row.parentNode.insertBefore(
                shell,
                row
            );

            shell.appendChild(row);

        } else {
            shell.classList.add(
                "rs-custom-filter-row"
            );
        }

        const controls =
            document.createElement("div");

        controls.id =
            "rs-custom-list-controls";

        shell.appendChild(controls);

        renderControls();
    }

    function renderControls() {
        const controls =
            document.getElementById(
                "rs-custom-list-controls"
            );

        if (!controls) {
            return;
        }

        controls.innerHTML = "";

        getListNames().forEach(name => {
            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "rs-custom-list-button";

            if (isDefaultList(name)) {
                button.classList.add(
                    "default"
                );
            }

            button.textContent = name;

            button.title =
                isDefaultList(name)
                    ? `${name} — ${lists[name].length} items — default list (locked)`
                    : `${name} — ${lists[name].length} items`;

            if (name === activeList) {
                button.classList.add("active");
            }

            button.addEventListener(
                "click",
                () => switchList(name)
            );

            /*
             * Default lists are locked, so do not open
             * the rename/delete/export context menu for them.
             */
            if (!isDefaultList(name)) {
                button.addEventListener(
                    "contextmenu",
                    event => {
                        event.preventDefault();

                        openContextMenu(
                            name,
                            button,
                            event
                        );
                    }
                );
            }

            controls.appendChild(button);
        });

        const newButton =
            document.createElement("button");

        newButton.type = "button";

        newButton.className =
            "rs-custom-list-new";

        newButton.textContent = "+";
        newButton.title = "Create new empty list";

        newButton.addEventListener(
            "click",
            () => openCreateList()
        );

        controls.appendChild(newButton);

        const importButton =
            document.createElement("button");

        importButton.type = "button";

        importButton.className =
            "rs-custom-list-import";

        importButton.textContent =
            "Import JSON";

        importButton.title =
            "Import one or more lists from a JSON file";

        importButton.addEventListener(
            "click",
            () => importJsonFile()
        );

        controls.appendChild(importButton);

        const addButton =
            document.createElement("button");

        addButton.type = "button";

        addButton.className =
            "rs-custom-list-add";

        addButton.textContent =
            "+ Add item";

        if (isDefaultList(activeList)) {
            addButton.disabled = true;

            addButton.title =
                "Default lists cannot be edited";
        } else {
            addButton.title =
                `Add an item to ${activeList}`;

            addButton.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    openAddPanel(addButton);
                }
            );
        }

        controls.appendChild(addButton);
    }

    /*
     * -------------------------
     * LIST SWITCHING
     * -------------------------
     */

    async function switchList(name) {
        if (!lists[name]) {
            return;
        }

        activeList = name;

        localStorage.setItem(
            ACTIVE_KEY,
            activeList
        );

        try {
            await syncFavourites();

        } catch (error) {
            console.error(
                "[RS3 Lists] Could not switch list:",
                error
            );
        }

        location.reload();
    }

    function syncFavourites() {
        return new Promise((resolve, reject) => {
            const request =
                indexedDB.open("localforage");

            request.onerror = () =>
                reject(request.error);

            request.onsuccess = event => {
                const db =
                    event.target.result;

                let tx;

                try {
                    tx =
                        db.transaction(
                            "keyvaluepairs",
                            "readwrite"
                        );

                } catch (error) {
                    reject(error);
                    return;
                }

                tx.objectStore(
                    "keyvaluepairs"
                ).put(
                    getItems(),
                    FAV_KEY
                );

                tx.oncomplete =
                    resolve;

                tx.onerror = () =>
                    reject(tx.error);
            };
        });
    }

    /*
     * -------------------------
     * LIST CREATION
     * -------------------------
     */

    function openCreateList() {
        openPopup({
            title: "Create new list",
            label: "List name",
            placeholder: "e.g. Skilling Supplies",
            button: "Create",
            onSubmit: name => {
                createList(name);
            }
        });
    }

    function createList(name) {
        name =
            name.trim();

        if (!name) {
            return;
        }

        if (lists[name]) {
            alert(
                `A list named "${name}" already exists.`
            );

            return;
        }

        userLists[name] = [];

        rebuildLists();
        saveLists();

        activeList = name;

        localStorage.setItem(
            ACTIVE_KEY,
            activeList
        );

        syncFavourites()
            .catch(error => {
                console.error(
                    "[RS3 Lists] Could not save new list:",
                    error
                );
            })
            .finally(() => {
                location.reload();
            });
    }

    /*
     * -------------------------
     * RENAME / DELETE / EXPORT
     * -------------------------
     */

    function openContextMenu(
        listName,
        button,
        event
    ) {
        /*
         * Safety check:
         * default lists can never be edited or exported.
         */
        if (isDefaultList(listName)) {
            return;
        }

        closeContextMenu();

        const menu =
            document.createElement("div");

        menu.id =
            "rs-context-menu";

        const rename =
            document.createElement("button");

        rename.className =
            "rs-context-item";

        rename.textContent =
            "Rename list";

        rename.addEventListener(
            "click",
            () => {
                closeContextMenu();

                openRenameList(
                    listName
                );
            }
        );

        menu.appendChild(rename);

        const exportButton =
            document.createElement("button");

        exportButton.className =
            "rs-context-item";

        exportButton.textContent =
            "Export JSON";

        exportButton.addEventListener(
            "click",
            () => {
                closeContextMenu();

                exportListJson(listName);
            }
        );

        menu.appendChild(exportButton);

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "rs-context-item danger";

        deleteButton.textContent =
            "Delete list";

        deleteButton.addEventListener(
            "click",
            () => {
                closeContextMenu();

                deleteList(listName);
            }
        );

        menu.appendChild(deleteButton);

        document.body.appendChild(menu);

        let left =
            event.clientX;

        let top =
            event.clientY;

        const width = 170;
        const height = 100;

        if (
            left + width >
            window.innerWidth - 8
        ) {
            left =
                window.innerWidth -
                width -
                8;
        }

        if (
            top + height >
            window.innerHeight - 8
        ) {
            top =
                window.innerHeight -
                height -
                8;
        }

        menu.style.left =
            `${Math.max(8, left)}px`;

        menu.style.top =
            `${Math.max(8, top)}px`;

        setTimeout(() => {
            document.addEventListener(
                "click",
                closeContextMenu,
                {
                    once: true
                }
            );
        }, 0);
    }

    function closeContextMenu() {
        const menu =
            document.getElementById(
                "rs-context-menu"
            );

        if (menu) {
            menu.remove();
        }
    }

    function openRenameList(oldName) {
        if (isDefaultList(oldName)) {
            return;
        }

        openPopup({
            title: "Rename list",
            label: "New name",
            placeholder: oldName,
            value: oldName,
            button: "Rename",
            onSubmit: newName => {
                renameList(
                    oldName,
                    newName
                );
            }
        });
    }

    function renameList(
        oldName,
        newName
    ) {
        if (isDefaultList(oldName)) {
            return;
        }

        newName =
            newName.trim();

        if (
            !newName ||
            newName === oldName
        ) {
            return;
        }

        if (lists[newName]) {
            alert(
                `A list named "${newName}" already exists.`
            );

            return;
        }

        userLists[newName] =
            userLists[oldName];

        delete userLists[oldName];

        if (activeList === oldName) {
            activeList =
                newName;

            localStorage.setItem(
                ACTIVE_KEY,
                activeList
            );
        }

        rebuildLists();
        saveLists();

        syncFavourites()
            .catch(error => {
                console.error(
                    "[RS3 Lists] Could not rename list:",
                    error
                );
            })
            .finally(() => {
                location.reload();
            });
    }

    function deleteList(name) {
        /*
         * Default lists can never be deleted.
         */
        if (isDefaultList(name)) {
            return;
        }

        const names =
            getListNames();

        if (names.length <= 1) {
            alert(
                "You must keep at least one list."
            );

            return;
        }

        const confirmed =
            confirm(
                `Delete "${name}"?\n\nThis will remove the list and all of its saved items.`
            );

        if (!confirmed) {
            return;
        }

        delete userLists[name];

        if (activeList === name) {
            const remaining =
                getListNames();

            activeList =
                remaining[0];

            localStorage.setItem(
                ACTIVE_KEY,
                activeList
            );
        }

        rebuildLists();
        saveLists();

        syncFavourites()
            .catch(error => {
                console.error(
                    "[RS3 Lists] Could not delete list:",
                    error
                );
            })
            .finally(() => {
                location.reload();
            });
    }

    /*
     * -------------------------
     * JSON IMPORT / EXPORT
     * -------------------------
     */

    function importJsonFile() {
        const input =
            document.createElement("input");

        input.type = "file";
        input.accept = ".json,application/json";

        input.addEventListener(
            "change",
            async () => {
                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                try {
                    await processImportedJson(file);

                } catch (error) {
                    console.error(
                        "[RS3 Lists] JSON import failed:",
                        error
                    );

                    alert(
                        `Could not import JSON:\n\n${error.message || error}`
                    );
                }
            }
        );

        input.click();
    }

    async function processImportedJson(file) {
        const text =
            await file.text();

        let data;

        try {
            data =
                JSON.parse(text);

        } catch {
            throw new Error(
                "The selected file is not valid JSON."
            );
        }

        /*
         * Supported formats:
         *
         * {
         *   "List One": ["Coal", "Logs"],
         *   "List Two": ["Air rune"]
         * }
         *
         * OR:
         *
         * ["Coal", "Logs", "Air rune"]
         */
        if (Array.isArray(data)) {
            if (!data.length) {
                throw new Error(
                    "The JSON array is empty."
                );
            }

            const validNames =
                data.filter(
                    item =>
                        typeof item === "string" &&
                        item.trim()
                );

            if (!validNames.length) {
                throw new Error(
                    "The JSON array does not contain any item names."
                );
            }

            openPopup({
                title: "Import JSON list",
                label: "List name",
                placeholder: "e.g. My Skilling List",
                button: "Import",
                onSubmit: name => {
                    importLists({
                        [name]: validNames
                    });
                }
            });

            return;
        }

        if (
            !data ||
            typeof data !== "object"
        ) {
            throw new Error(
                "JSON must contain either a list of item names or an object of named lists."
            );
        }

        const rawLists = {};

        for (const [name, items] of Object.entries(data)) {
            if (
                typeof name !== "string" ||
                !name.trim()
            ) {
                continue;
            }

            if (!Array.isArray(items)) {
                console.warn(
                    `[RS3 Lists] Skipping "${name}" because it is not an array.`
                );

                continue;
            }

            const validItems =
                items.filter(
                    item =>
                        typeof item === "string" &&
                        item.trim()
                );

            if (!validItems.length) {
                console.warn(
                    `[RS3 Lists] Skipping "${name}" because it contains no valid item names.`
                );

                continue;
            }

            rawLists[name.trim()] =
                validItems;
        }

        if (!Object.keys(rawLists).length) {
            throw new Error(
                "No valid lists were found in the JSON file."
            );
        }

        await importLists(rawLists);
    }

    async function importLists(rawLists) {
        await loadMapping();

        if (!itemMapping.length) {
            throw new Error(
                "Could not load the RS3 item mapping."
            );
        }

        const mappingByName =
            new Map(
                itemMapping
                    .filter(
                        item =>
                            item &&
                            item.name &&
                            item.id != null
                    )
                    .map(
                        item => [
                            item.name
                                .trim()
                                .toLowerCase(),
                            String(item.id)
                        ]
                    )
            );

        const resolvedLists = {};
        const warnings = [];

        for (const [name, itemNames] of Object.entries(rawLists)) {
            if (isDefaultList(name)) {
                warnings.push(
                    `"${name}" is a default list and cannot be replaced.`
                );

                continue;
            }

            const resolvedItems = [];
            const missingItems = [];

            for (const itemName of itemNames) {
                const key =
                    itemName
                        .trim()
                        .toLowerCase();

                const id =
                    mappingByName.get(key);

                if (id == null) {
                    missingItems.push(
                        itemName
                    );

                    continue;
                }

                resolvedItems.push(id);
            }

            if (missingItems.length) {
                warnings.push(
                    `"${name}": ${missingItems.length} item(s) could not be found.`
                );
            }

            if (resolvedItems.length) {
                resolvedLists[name] = [
                    ...new Set(resolvedItems)
                ];
            } else {
                warnings.push(
                    `"${name}" contains no items that could be resolved.`
                );
            }
        }

        const names =
            Object.keys(resolvedLists);

        if (!names.length) {
            throw new Error(
                "None of the imported lists contained items that could be resolved."
            );
        }

        const collisions =
            names.filter(
                name =>
                    Object.prototype.hasOwnProperty.call(
                        userLists,
                        name
                    )
            );

        if (collisions.length) {
            const message =
                collisions.length === 1
                    ? `A custom list named "${collisions[0]}" already exists.\n\nReplace it with the imported list?`
                    : `These custom lists already exist:\n\n${collisions.join("\n")}\n\nReplace them with the imported lists?`;

            if (!confirm(message)) {
                return;
            }
        }

        for (const name of names) {
            userLists[name] =
                resolvedLists[name];
        }

        rebuildLists();
        saveLists();

        /*
         * If the active list was replaced, keep it active.
         * Otherwise, if there was no active list, select the
         * first imported list.
         */
        if (
            !activeList ||
            !lists[activeList]
        ) {
            activeList =
                names[0];

            localStorage.setItem(
                ACTIVE_KEY,
                activeList
            );
        }

        try {
            await syncFavourites();

        } catch (error) {
            console.error(
                "[RS3 Lists] Could not sync imported list:",
                error
            );
        }

        let message =
            names.length === 1
                ? `Imported "${names[0]}".`
                : `Imported ${names.length} lists.`;

        if (warnings.length) {
            message +=
                `\n\nWarnings:\n${warnings.join("\n")}`;
        }

        alert(message);

        location.reload();
    }

    function exportListJson(name) {
        if (isDefaultList(name)) {
            return;
        }

        const ids =
            lists[name] || [];

        const mappingById =
            new Map(
                itemMapping
                    .filter(
                        item =>
                            item &&
                            item.name &&
                            item.id != null
                    )
                    .map(
                        item => [
                            String(item.id),
                            item.name
                        ]
                    )
            );

        const itemNames = [];

        const missingIds = [];

        for (const id of ids) {
            const itemName =
                mappingById.get(
                    String(id)
                );

            if (itemName) {
                itemNames.push(
                    itemName
                );
            } else {
                missingIds.push(
                    String(id)
                );
            }
        }

        if (missingIds.length) {
            const confirmed =
                confirm(
                    `${missingIds.length} item(s) in this list could not be resolved to names.\n\nExport the items that can be resolved?`
                );

            if (!confirmed) {
                return;
            }
        }

        const data = {
            [name]: itemNames
        };

        const json =
            JSON.stringify(
                data,
                null,
                2
            );

        const blob =
            new Blob(
                [json],
                {
                    type: "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href =
            url;

        link.download =
            `${sanitizeFilename(name)}.json`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    function sanitizeFilename(name) {
        return String(name)
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            || "rs3-list";
    }

    /*
     * -------------------------
     * GENERIC POPUP
     * -------------------------
     */

    function openPopup(options) {
        closePopup();

        const popup =
            document.createElement("div");

        popup.id =
            "rs-popup";

        popup.innerHTML = `
            <div class="rs-popup-header">
                <span>${escapeHtml(options.title)}</span>

                <button
                    type="button"
                    class="rs-popup-close"
                >×</button>
            </div>

            <label class="rs-popup-label">
                ${escapeHtml(options.label)}
            </label>

            <input
                class="rs-popup-input"
                type="text"
                autocomplete="off"
                placeholder="${escapeHtml(
                    options.placeholder || ""
                )}"
            >

            <div class="rs-popup-actions">
                <button
                    type="button"
                    class="rs-popup-button"
                    data-cancel
                >Cancel</button>

                <button
                    type="button"
                    class="rs-popup-button primary"
                    data-submit
                >${escapeHtml(options.button)}</button>
            </div>
        `;

        document.body.appendChild(popup);

        const input =
            popup.querySelector(
                ".rs-popup-input"
            );

        if (options.value) {
            input.value =
                options.value;
        }

        popup.querySelector(
            ".rs-popup-close"
        ).addEventListener(
            "click",
            closePopup
        );

        popup.querySelector(
            "[data-cancel]"
        ).addEventListener(
            "click",
            closePopup
        );

        popup.querySelector(
            "[data-submit]"
        ).addEventListener(
            "click",
            () => {
                const value =
                    input.value.trim();

                if (!value) {
                    input.focus();
                    return;
                }

                closePopup();

                options.onSubmit(value);
            }
        );

        input.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();

                    const value =
                        input.value.trim();

                    if (!value) {
                        return;
                    }

                    closePopup();

                    options.onSubmit(value);
                }

                if (event.key === "Escape") {
                    closePopup();
                }
            }
        );

        const button =
            document.querySelector(
                ".rs-custom-list-new"
            );

        if (button) {
            positionPopup(
                popup,
                button
            );

        } else {
            popup.style.left = "50%";
            popup.style.top = "30%";
            popup.style.transform =
                "translate(-50%, -50%)";
        }

        input.focus();
        input.select();
    }

    function closePopup() {
        const popup =
            document.getElementById(
                "rs-popup"
            );

        if (popup) {
            popup.remove();
        }
    }

    /*
     * -------------------------
     * ITEM LOOKUP
     * -------------------------
     */

    function loadMapping() {
        if (mappingPromise) {
            return mappingPromise;
        }

        mappingPromise =
            fetch(
                "https://prices.runescape.wiki/api/v2/rs/mapping"
            )
                .then(response => {
                    if (!response.ok) {
                        throw new Error(
                            `Mapping request failed: ${response.status}`
                        );
                    }

                    return response.json();
                })
                .then(data => {
                    itemMapping =
                        Array.isArray(data)
                            ? data
                            : [];

                    return itemMapping;
                })
                .catch(error => {
                    console.error(
                        "[RS3 Lists] Item lookup failed:",
                        error
                    );

                    itemMapping = [];
                    mappingPromise = null;

                    return [];
                });

        return mappingPromise;
    }

    function openAddPanel(button) {
        /*
         * Default lists are read-only.
         */
        if (isDefaultList(activeList)) {
            return;
        }

        closePopup();

        const panel =
            document.createElement("div");

        panel.id =
            "rs-popup";

        panel.innerHTML = `
            <div class="rs-popup-header">
                <span>
                    Add to
                    <strong>
                        ${escapeHtml(activeList)}
                    </strong>
                </span>

                <button
                    type="button"
                    class="rs-popup-close"
                >×</button>
            </div>

            <input
                id="rs-add-search"
                type="text"
                autocomplete="off"
                placeholder="Search for an item..."
            >

            <div id="rs-add-results">
                <div class="rs-add-status">
                    Loading item list...
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        positionPopup(
            panel,
            button
        );

        panel.querySelector(
            ".rs-popup-close"
        ).addEventListener(
            "click",
            () => panel.remove()
        );

        const search =
            panel.querySelector(
                "#rs-add-search"
            );

        search.addEventListener(
            "input",
            () => renderSearchResults(
                search.value
            )
        );

        search.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    panel.remove();
                }
            }
        );

        loadMapping()
            .then(mapping => {
                if (!mapping.length) {
                    panel.querySelector(
                        "#rs-add-results"
                    ).innerHTML = `
                        <div class="rs-add-status">
                            Could not load the RS3 item list.
                        </div>
                    `;

                    return;
                }

                panel.querySelector(
                    "#rs-add-results"
                ).innerHTML = `
                    <div class="rs-add-status">
                        Type an item name to search.
                    </div>
                `;

                search.focus();
            });
    }

    function getItemIconUrl(item) {
        const target =
            item.name
                .trim()
                .toLowerCase();

        /*
         * First use an icon already loaded on the page.
         */
        const existingIcons =
            document.querySelectorAll(
                "img.item-icon"
            );

        for (const img of existingIcons) {
            const alt =
                (img.alt || "")
                    .trim()
                    .toLowerCase();

            if (
                alt === target &&
                img.src
            ) {
                return img.src;
            }
        }

        /*
         * The Price API mapping contains the canonical
         * Wiki icon filename. This avoids guessing filenames
         * such as Dinarrow.png when the actual file is
         * Dinarrow_1.png.
         */
        if (
            item.icon &&
            typeof item.icon === "string"
        ) {
            return (
                "https://runescape.wiki/wiki/Special:Redirect/file/" +
                encodeURIComponent(item.icon)
            );
        }

        /*
         * Fallback for older/unexpected mapping entries.
         */
        const filename =
            item.name
                .replaceAll(
                    " ",
                    "_"
                );

        return (
            "https://runescape.wiki/wiki/Special:Redirect/file/" +
            encodeURIComponent(filename + ".png")
        );
    }

    function renderSearchResults(query) {
        const container =
            document.getElementById(
                "rs-add-results"
            );

        if (!container) {
            return;
        }

        const term =
            query
                .trim()
                .toLowerCase();

        if (!term) {
            container.innerHTML = `
                <div class="rs-add-status">
                    Type an item name to search.
                </div>
            `;

            return;
        }

        const existing =
            new Set(getItems());

        const results =
            itemMapping
                .filter(item =>
                    item &&
                    item.name &&
                    item.id != null
                )
                .filter(item =>
                    item.name
                        .toLowerCase()
                        .includes(term)
                )
                .sort((a, b) => {
                    const an =
                        a.name.toLowerCase();

                    const bn =
                        b.name.toLowerCase();

                    const as =
                        an.startsWith(term);

                    const bs =
                        bn.startsWith(term);

                    if (as !== bs) {
                        return as ? -1 : 1;
                    }

                    return an.localeCompare(bn);
                })
                .slice(0, 30);

        if (!results.length) {
            container.innerHTML = `
                <div class="rs-add-status">
                    No matching items.
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        results.forEach(item => {
            const id =
                String(item.id);

            const added =
                existing.has(id);

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "rs-add-result";

            button.disabled =
                added;

            const iconUrl =
                getItemIconUrl(item);

            if (iconUrl) {
                const image =
                    document.createElement("img");

                image.className =
                    "item-icon";

                image.alt =
                    item.name;

                image.src =
                    iconUrl;

                image.loading =
                    "lazy";

                image.onerror = () => {
                    image.remove();
                };

                button.appendChild(
                    image
                );
            }

            const name =
                document.createElement("span");

            name.className =
                "rs-add-name";

            name.textContent =
                item.name;

            const action =
                document.createElement("span");

            action.className =
                "rs-add-action";

            action.textContent =
                added
                    ? "Added"
                    : "Add";

            button.appendChild(name);
            button.appendChild(action);

            if (!added) {
                button.addEventListener(
                    "click",
                    () => addItem(item)
                );
            }

            container.appendChild(
                button
            );
        });
    }

    async function addItem(item) {
        /*
         * Extra safety check.
         */
        if (isDefaultList(activeList)) {
            return;
        }

        const id =
            String(item.id);

        if (
            getItems().includes(id)
        ) {
            return;
        }

        setItems([
            ...getItems(),
            id
        ]);

        try {
            await syncFavourites();

        } catch (error) {
            console.error(
                "[RS3 Lists] Could not save item:",
                error
            );
        }

        location.reload();
    }

    /*
     * -------------------------
     * HELPERS
     * -------------------------
     */

    function positionPopup(
        popup,
        anchor
    ) {
        const rect =
            anchor.getBoundingClientRect();

        const width =
            Math.min(
                popup.offsetWidth || 370,
                window.innerWidth - 24
            );

        let left =
            rect.left;

        if (
            left + width >
            window.innerWidth - 12
        ) {
            left =
                window.innerWidth -
                width -
                12;
        }

        left =
            Math.max(
                12,
                left
            );

        popup.style.left =
            `${left}px`;

        popup.style.top =
            `${rect.bottom + 6}px`;
    }

    function reorderRows() {
        const wanted =
            getItems();

        if (!wanted.length) {
            return;
        }

        const tbody =
            document.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        const rows =
            [
                ...tbody.querySelectorAll("tr")
            ];

        if (!rows.length) {
            return;
        }

        const order =
            new Map(
                wanted.map(
                    (id, index) =>
                        [
                            String(id),
                            index
                        ]
                )
            );

        const getId = row => {
            const link =
                row.querySelector(
                    'a[href^="/rs/item/"]'
                );

            return link?.href.match(
                /\/rs\/item\/(\d+)/
            )?.[1];
        };

        const sorted =
            [...rows].sort(
                (a, b) =>
                    (
                        order.get(
                            getId(a)
                        ) ?? 999999
                    ) -
                    (
                        order.get(
                            getId(b)
                        ) ?? 999999
                    )
            );

        if (
            rows.every(
                (row, index) =>
                    row === sorted[index]
            )
        ) {
            return;
        }

        sorted.forEach(
            row =>
                tbody.appendChild(row)
        );
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }

    /*
     * -------------------------
     * INIT
     * -------------------------
     */

    async function init() {
        injectStyles();

        /*
         * Load the JSON first, then resolve its item names
         * into IDs using the existing Wiki mapping.
         */
        await loadDefaultLists();

        /*
         * Load only user-created lists from localStorage.
         * Old 2.3/2.4 default lists are automatically discarded
         * here because their names now belong to the JSON.
         */
        userLists =
            loadUserLists();

        rebuildLists();

        ensureActiveList();

        if (!activeList) {
            console.error(
                "[RS3 Lists] No lists are available."
            );

            return;
        }

        /*
         * Save the cleaned user-list storage so old
         * default lists are removed permanently.
         */
        saveLists();

        createControls();

        loadMapping();

        const observer =
            new MutationObserver(() => {
                createControls();
                reorderRows();
            });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        setTimeout(
            reorderRows,
            100
        );

        setTimeout(
            reorderRows,
            500
        );

        setTimeout(
            reorderRows,
            1200
        );
    }

    init();

})();