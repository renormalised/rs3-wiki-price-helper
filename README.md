# RS3 Wiki Price List Switcher

A Tampermonkey userscript for the [RuneScape 3 Wiki Price Database](https://prices.runescape.wiki/rs/favourites) that adds support for multiple custom favourite-item lists.

Lists appear directly beside the **Filter by name** bar, allowing you to quickly switch between different groups of items.

## Features

- Create and manage multiple favourite lists
- Import lists from JSON files
- Export/share lists using a simple JSON format
- Switch between lists directly from the favourites page
- Search the RS3 item database when adding individual items
- Automatically resolve item names to RuneScape item IDs
- Automatically reorder the favourites table to match the selected list
- Rename custom lists
- Delete custom lists
- Persistent lists using browser `localStorage`
- Persistent favourite items using the site's existing IndexedDB storage
- Load repository-hosted default lists from JSON
- Default lists are locked and cannot be edited or deleted
- User-imported lists remain editable
- Existing user lists are preserved when default lists are updated

---

## Requirements

You need:

- A browser that supports userscripts
- [Tampermonkey](https://www.tampermonkey.net/) or a compatible userscript manager
- Access to the [RS3 Wiki Price Database](https://prices.runescape.wiki/rs/favourites)

---

## Installation

### 1. Install Tampermonkey

Install Tampermonkey for your browser:

https://www.tampermonkey.net/

### 2. Install the userscript

Create a new Tampermonkey script and paste in:

`RS3 Wiki Price List Switcher.user.js`

Save the script.

### 3. Open the favourites page

Go to:

https://prices.runescape.wiki/rs/favourites

The custom list controls will appear beside the **Filter by name** bar.

---

# Lists

The script supports two types of lists:

1. **Default lists**
2. **User lists**

## Default Lists

Default lists are loaded from the repository's configured JSON file.

The userscript contains a setting similar to:

```javascript
const DEFAULT_LISTS_URL =
    "https://raw.githubusercontent.com/renormalised/rs3-wiki-price-helper/main/preset-lists.json";
```

This allows the default lists to be maintained separately from the userscript.

Default lists are:

- Read-only
- Locked
- Not editable by users
- Not deletable
- Updated automatically when the JSON source changes

Default lists are displayed with a lock icon.

---

# Creating Your Own Lists

There are two ways to create a user list.

## Option 1 — Create an Empty List

Click the `+` button beside the list buttons.

Enter a list name and create the list.

You can then add items individually using:

`+ Add item`

## Option 2 — Import a JSON List

You can create an entire list from a JSON file instead of adding every item manually.

This is useful for:

- Sharing lists with other users
- Backing up lists
- Creating lists outside the game
- Maintaining large item lists
- Importing predefined item collections

Use the JSON import option and select your `.json` file.

The script will read the item names and resolve them against the RS3 item mapping.

Imported lists become normal user lists and can be edited afterward.

---

# JSON Format

A JSON list file uses an object containing list names and arrays of item names.

For example:

```json
{
    "Mining Supplies": [
        "Coal",
        "Iron ore",
        "Mithril ore",
        "Adamantite ore"
    ]
}
```

Multiple lists can be included in the same file:

```json
{
    "Mining Supplies": [
        "Coal",
        "Iron ore",
        "Mithril ore",
        "Adamantite ore"
    ],
    "Bossing Supplies": [
        "Prayer potion(4)",
        "Super restore(4)",
        "Saradomin brew(4)",
        "Super combat potion(4)"
    ],
    "Runes": [
        "Nature rune",
        "Law rune",
        "Death rune",
        "Blood rune"
    ]
}
```

Each property becomes a separate list.

The order of the items in the JSON determines their order in the favourites list.

---

# Sharing Lists

Because lists use a simple JSON format, you can easily share them with other users.

For example, a file such as:

`my-bossing-lists.json`

can contain:

```json
{
    "Nex Supplies": [
        "Super restore(4)",
        "Saradomin brew(4)",
        "Super combat potion(4)",
        "Rune pouch"
    ]
}
```

Another user can import that JSON file and immediately have the same list.

This also makes GitHub a convenient place to maintain and distribute community-made lists.

---

# Default List JSON

The repository's `preset-lists.json` uses the same basic format.

Example:

```json
{
    "Skilling Supplies": [
        "Feather",
        "Raw lobster",
        "Coal",
        "Nature rune"
    ],
    "Bossing Supplies": [
        "Prayer potion(4)",
        "Super restore(4)",
        "Saradomin brew(4)",
        "Super combat potion(4)"
    ]
}
```

The difference is that lists loaded from `preset-lists.json` are treated as **default/locked lists**, while lists imported by the user are treated as **editable user lists**.

---

# Item Names

The script uses the RS3 Wiki Price Database item mapping to convert item names into item IDs.

Item names should match the names returned by the mapping.

If an item cannot be resolved, the script skips it and reports a warning in the browser console.

For example:

```text
[RS3 Lists] Could not find item "Example item" for default list "My List".
```

This means the name in the JSON file does not match an item in the current RS3 mapping.

---

# Adding Individual Items

User lists can still be edited manually.

Select a user-created list and click:

`+ Add item`

Search for an item by name.

The script searches the RS3 item mapping and displays matching results.

Click an item to add it to the current list.

The page will reload and the item will be synchronized with the favourites system.

Default lists have the **+ Add item** button disabled because they are read-only.

---

# Switching Lists

Click a list button to make it active.

When switching lists, the script:

1. Saves the selected list as the active list.
2. Synchronizes its item IDs with the site's favourite-item storage.
3. Reloads the page.
4. Reorders the favourites table to match the selected list.

The active list is remembered between browser sessions.

---

# Item Ordering

The order of items in a list controls the order of the corresponding rows on the favourites page.

For example:

```json
{
    "Mining": [
        "Coal",
        "Iron ore",
        "Mithril ore",
        "Adamantite ore"
    ]
}
```

will place the items in that order.

Items not contained in the selected list are placed after the listed items.

---

# Renaming Lists

User-created lists can be renamed.

Right-click a user list and select:

`Rename list`

Enter the new name and confirm.

Default lists cannot be renamed.

---

# Deleting Lists

Right-click a user-created list and select:

`Delete list`

You will be asked to confirm before the list is removed.

Default lists cannot be deleted.

The script also requires at least one list to remain.

---

# Importing Large Lists

JSON import is particularly useful for large lists.

Instead of manually searching for hundreds of items, you can prepare a JSON file containing the item names and import it as a complete list.

The script resolves the names against the current RS3 item mapping.

Duplicate item IDs are automatically removed.

---

# Storage

The script uses browser storage rather than an external account or database.

## Local Storage

User-created lists and the active list are stored in `localStorage`.

The main keys are:

`wgl-rs-favourite-lists`

`wgl-rs-active-list`

Imported lists are stored locally in the same way as lists created manually.

Clearing the site's browser storage can remove these lists.

## IndexedDB

The script synchronizes the active list with the existing favourite storage used by the Price Database site.

The relevant key is:

`wgl-rs-favs`

---

# Default List Updates

Default lists are loaded from the configured JSON source whenever the script starts.

This means the repository can update:

`preset-lists.json`

without requiring users to reinstall the userscript.

User-created and user-imported lists are kept separate from the default lists.

If an older version of the script had stored a list that is now supplied as a default list, the script removes the old local copy so that the default version remains locked.

---

# API Usage

The script uses the RS3 Wiki Price Database mapping endpoint:

`https://prices.runescape.wiki/api/v2/rs/mapping`

The mapping provides item names and IDs used to:

- Resolve JSON item names
- Search for items
- Add items to user lists

The script also retrieves the configured default-list JSON using `fetch()`.

---

# Permissions

The script uses standard browser APIs and does not require privileged Tampermonkey APIs such as:

- `GM_xmlhttpRequest`
- `GM_setValue`
- `GM_getValue`

It uses APIs including:

- `fetch`
- `localStorage`
- `IndexedDB`
- DOM APIs
- `MutationObserver`

---

# Troubleshooting

## The list buttons do not appear

Make sure you are on:

https://prices.runescape.wiki/rs/favourites

Check that the userscript is enabled in Tampermonkey.

Try refreshing the page after enabling the script.

## Default lists are missing

Check that the configured `DEFAULT_LISTS_URL` is reachable.

The browser console may show:

`[RS3 Lists] Could not load default lists:`

## An item from a JSON file is missing

Open the browser developer console and look for item lookup warnings.

If an item cannot be resolved, check that its name exactly matches the name used by the RS3 Wiki item mapping.

## Imported JSON does not work

Make sure the file contains valid JSON.

A basic valid file looks like:

```json
{
    "My List": [
        "Coal",
        "Iron ore",
        "Mithril ore"
    ]
}
```

The file must contain an object of list names and item-name arrays.

## Items are not appearing in the expected order

The order in the JSON array determines the order of the list.

For example:

```json
{
    "Example": [
        "Item A",
        "Item B",
        "Item C"
    ]
}
```

will put Item A before Item B, and Item B before Item C.

Try refreshing the page if the table has not updated yet.

## My imported list disappeared

User lists are stored in the browser's local storage.

Clearing site data or browser storage for the Price Database site can remove them.

Lists are also specific to the browser/profile in which they were created.

Keep the original JSON file as a backup if the list is important.

---

# Repository Structure

A simple repository layout is:

```text
rs3-wiki-price-helper/
│
├── RS3 Wiki Price List Switcher.user.js
├── preset-lists.json
└── README.md
```

---

# Contributing

Bug reports, suggestions, and improvements are welcome.

When reporting an issue, please include:

- Browser
- Userscript manager
- Script version
- Relevant console errors
- Steps to reproduce the problem

Please do not include personal browser information or unrelated account data.

---

# License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

You are free to use, modify, and redistribute this software, provided that redistribution complies with the terms of the GPL-3.0 license.

See the [LICENSE](LICENSE) file for the complete license text.

---

# Disclaimer

This project is an independent userscript and is not affiliated with, endorsed by, or officially associated with Jagex or the RuneScape Wiki.

Use it at your own discretion.
