# Code Generation Spec

## Dependency Map
- `src/App.jsx` → imports → `src/components/TranslatorOutput.jsx`
- `src/App.jsx` → imports → `src/lib/emojiTranslate.js`
- `src/components/TranslatorOutput.jsx` → imports → `src/lib/emojiTranslate.js`
- `src/lib/emojiTranslate.js` → loads (via `import`) → `src/data/emojis.json`
- `src/__tests__/emojiTranslate.test.js` → imports → `src/lib/emojiTranslate.js`

## Conversion Order
1. `extension/emojis.json` → `src/data/emojis.json` — copy verbatim; all other modules depend on this data
2. `emoji-translate.js` → `src/lib/emojiTranslate.js` — pure logic, no DOM, no React; depends only on emojis.json
3. `test.js` → `src/__tests__/emojiTranslate.test.js` — port tape assertions to Vitest; depends on emojiTranslate.js
4. `index.html` (inline scripts) → `src/components/TranslatorOutput.jsx` — React component for the interactive output area; depends on emojiTranslate.js
5. `index.html` (layout + styles) → `src/App.jsx` — root React component; depends on TranslatorOutput.jsx and emojiTranslate.js
6. `index.html` (shell) → `index.html` (Vite entry) — minimal HTML shell that mounts `<div id="root">`
7. `package.json` → `package.json` — new manifest with React + Vite deps
8. (new) `vite.config.js` — Vite configuration
9. (new) `vitest.config.js` — Vitest configuration (or inline in vite.config.js)

## API Contracts
This is a fully client-side SPA. There are no HTTP endpoints.

## Data File Quirks

### `extension/emojis.json`
The file is the emojilib v2 data format. It has two structural quirks the coding agent must handle:

1. **Top-level `"keys"` array:** The JSON object contains a `"keys"` property whose value is an array of strings (all emoji names). This is NOT an emoji entry — it is a convenience index. The translation logic must skip it when iterating over emoji entries. Detection: `typeof value !== 'object' || Array.isArray(value)` → skip.

2. **`null` char values:** Several entries (custom GitHub emoji like `"octocat"`, `"shipit"`, `"bowtie"`, `"neckbeard"`, `"metal"`, `"fu"`, `"trollface"`, `"godmode"`, `"goberserk"`, `"finnadie"`, `"feelsgood"`, `"rage1"`–`"rage4"`, `"suspect"`, `"hurtrealbad"`) have `"char": null`. These entries have no renderable Unicode character. The translation logic must guard against null chars: `if (!allEmoji[emoji].char) continue;` (or equivalent).

3. **Duplicate keys:** `"baby"` appears twice in the JSON. JavaScript's JSON.parse will silently keep only the last occurrence. This is pre-existing behaviour — do not attempt to fix it.

- Note: All other entries are uniform objects with `{ keywords: string[], char: string, category: string }`.

## File Specs

---

### `extension/emojis.json` → `migrated/src/data/emojis.json`
- Action: **copy** (verbatim — no code conversion needed)
- Conversion strategy: Copy the file as-is. The migrated `emojiTranslate.js` will `import` it directly.

---

### `emoji-translate.js` → `migrated/src/lib/emojiTranslate.js`
- Module name: `emojiTranslate` (ES module, named exports)
- Classes: none
- Functions / exports:
  - `isMaybeAlreadyAnEmoji(word: string) -> boolean` — returns true if the word contains a Unicode emoji character using the same regex ranges as the original
  - `getAllEmojiForWord(originalWord: string) -> string[] | ''` — returns array of all matching emoji chars for a word, or `''` if none. Handles plurals, singulars, -ing verb forms, hardcoded pronouns, and skips flag emojis for short words.
  - `getEmojiForWord(word: string) -> string | undefined` — returns a single random emoji from `getAllEmojiForWord`
  - `translate(sentence: string, onlyEmoji?: boolean) -> string` — translates a full sentence; if `onlyEmoji` is true, untranslatable words are omitted
  - `translateForDisplay(word: string) -> { type: 'single', text: string } | { type: 'select', options: string[] }` — **React-friendly version**: instead of returning DOM nodes (which is browser-only), returns a plain data object describing what to render. `type: 'single'` means render a `<span>`; `type: 'select'` means render a `<select>` with the given options. This replaces the original `translateForDisplay` which called `document.createElement`.
- Imports required:
  - `import allEmojiData from '../data/emojis.json'` (Vite handles JSON imports natively)
- Conversion strategy:
  - Replace `const emojilib = require('emojilib')` and `const allEmoji = emojilib.lib` with `import allEmojiData from '../data/emojis.json'`. Then define `const allEmoji = allEmojiData` (the JSON IS the lib object).
  - **Critical — handle data quirks:** Before iterating `allEmoji`, skip the `"keys"` entry and any entry where `allEmoji[emoji].char` is null (see Data File Quirks above). Add guards: `if (!allEmoji[emoji] || typeof allEmoji[emoji] !== 'object' || Array.isArray(allEmoji[emoji])) continue;` and `if (!allEmoji[emoji].char) continue;`
  - Replace `module.exports.X = X` with `export { isMaybeAlreadyAnEmoji, getAllEmojiForWord, getEmojiForWord, translateForDisplay, translate }` (ES module named exports).
  - `translateForDisplay` must NOT call `document.createElement`. Instead return a plain JS object: `{ type: 'single', text: firstSymbol + emoji[0] + lastSymbol + ' ' }` or `{ type: 'select', options: emoji.map(e => firstSymbol + e + lastSymbol + ' ') }`. The React component will render these.
  - All other logic (SYMBOLS constant, punctuation stripping, plural/singular/verb forms, hardcoded words, flag filtering) is ported identically.

---

### `index.html` (layout + styles + scripts) → `migrated/src/App.jsx`
- Module name: `App` (default export React component)
- Classes: none
- Functions:
  - `App() -> JSX.Element` — root component; manages `inputText` state (string, default: `"OMG!!! The house is on fire and the cat is eating all the donuts!"`); renders the full page layout
  - `handleCopy() -> void` — copies the current translated output to clipboard using `navigator.clipboard.writeText()` (modern API replacing the original `document.execCommand('copy')` hack); updates button label to "Done!" for 1 second then resets
- Imports required:
  - `import { useState, useRef } from 'react'`
  - `import TranslatorOutput from './components/TranslatorOutput'`
- State:
  - `inputText: string` — controlled textarea value
  - `copyLabel: string` — button label, default `'Copy to clipboard'`
- Conversion strategy:
  - The `<textarea id="input">` becomes a controlled `<textarea value={inputText} onChange={e => setInputText(e.target.value)} />`.
  - The `<div id="output">` becomes `<TranslatorOutput text={inputText} ref={outputRef} />` (pass a ref so `handleCopy` can read the rendered text).
  - All CSS from the `<style>` block in `index.html` is moved to `src/App.css` and imported as `import './App.css'`.
  - The `copy()` function becomes `handleCopy()` using `navigator.clipboard.writeText(getActualOutput())`. `getActualOutput()` reads the current translated text from the `TranslatorOutput` component via a ref or by re-running `translate(inputText)`.
  - The footer HTML is preserved verbatim as JSX.
  - The `#clipboardContents` hidden div hack is removed entirely (replaced by Clipboard API).
  - Google Fonts link goes into `index.html` (the Vite HTML entry).

---

### `index.html` (inline scripts for output rendering) → `migrated/src/components/TranslatorOutput.jsx`
- Module name: `TranslatorOutput` (default export React component)
- Classes: none
- Functions:
  - `TranslatorOutput({ text }: { text: string }) -> JSX.Element` — renders the translated output for the given `text` prop; re-renders automatically when `text` changes (no manual event listener needed)
  - `WordNode({ wordData }: { wordData: ReturnType<translateForDisplay> }) -> JSX.Element` — renders a single word result: either a `<span>` (type `'single'`) or a `<select>` (type `'select'`) with `<option>` children
- Imports required:
  - `import { translateForDisplay } from '../lib/emojiTranslate'`
- Conversion strategy:
  - Replaces the `updateOutput()` imperative DOM manipulation function from `index.html`.
  - Split `text` by `'\n'`, skip empty lines, split each line by `' '`, call `translateForDisplay(word)` for each word, render the returned data object as JSX.
  - For `type: 'select'`, render `<select>` with `<option>` children. Each option's text is the emoji string (with surrounding punctuation). The `<select>` uses `defaultValue` of the first option (no controlled state needed — user picks freely).
  - For `type: 'single'`, render `<span>{text}</span>`.
  - After each line, render `<br />`.
  - Export a `getPlainText(text: string) -> string` helper function (not a component) that reconstructs the plain-text output for clipboard copy. It iterates words, calls `getAllEmojiForWord` (or `getEmojiForWord`), and builds the string — mirrors the original `getActualOutput()` logic. This is used by `App.jsx`'s `handleCopy`.

---

### `index.html` → `migrated/index.html`
- Action: **convert** (minimal Vite HTML shell)
- Conversion strategy:
  - Keep `<title>emoji-translate</title>`, charset meta, viewport meta, mobile-web-app metas, favicon link, and Google Fonts `<link>`.
  - Add `<div id="root"></div>` as the React mount point.
  - Add `<script type="module" src="/src/main.jsx"></script>` (Vite entry).
  - Remove all inline `<style>`, inline `<script>` blocks, and the old `<script src="public/bundle.js">` tag.

---

### (new file) `migrated/src/main.jsx`
- Module name: entry point
- Conversion strategy:
  - Standard Vite + React entry: `import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App'; ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);`

---

### (new file) `migrated/src/App.css`
- Action: **convert**
- Conversion strategy:
  - Extract the entire `<style>` block from the original `index.html` verbatim. Convert `body` selector styles to apply to the root `div.app-container` or keep as `body` — either is fine. Keep all selectors identical.

---

### `test.js` → `migrated/src/__tests__/emojiTranslate.test.js`
- Module name: test suite (Vitest)
- Conversion strategy:
  - Replace `const test = require('tape')` with Vitest imports: `import { describe, it, expect } from 'vitest'`
  - Replace `const translate = require(...)` with `import * as translate from '../lib/emojiTranslate'`
  - Map tape assertions to Vitest:
    - `t.equal(a, b, msg)` → `expect(a).toBe(b)` (wrap in `it(msg, ...)`)
    - `t.notEqual(a, b, msg)` → `expect(a).not.toBe(b)`
    - `t.equal(expr, true, msg)` → `expect(expr).toBe(true)` or `expect(expr).toBeTruthy()`
    - `t.end()` → remove (not needed in Vitest)
  - Each `test('name', fn)` block becomes `describe('name', () => { it(...) ... })` or a flat `it('name', ...)`.
  - All 8 test groups are ported: `isMaybeAlreadyAnEmoji`, `getAllEmojiForWord`, `getEmojiForWord`, `translate`, `punctuation`, `flags`, `hard coded words`, `ing verbs`, `omg what is real`.
  - **Note on `translateForDisplay`:** The original test.js does NOT test `translateForDisplay` directly (it tested DOM nodes). No test for `translateForDisplay` needs to be ported. The React component tests cover it indirectly.

---

### `package.json` → `migrated/package.json`
- Action: **convert** (new manifest — empty sourcePath)
- Conversion strategy:
  ```json
  {
    "name": "emoji-translate",
    "version": "1.0.8",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "test": "vitest run"
    },
    "dependencies": {
      "react": "^18.3.1",
      "react-dom": "^18.3.1"
    },
    "devDependencies": {
      "@vitejs/plugin-react": "^4.3.1",
      "vite": "^5.4.0",
      "vitest": "^2.1.0",
      "@vitest/ui": "^2.1.0",
      "jsdom": "^25.0.0",
      "@testing-library/react": "^16.0.0",
      "@testing-library/jest-dom": "^6.5.0"
    }
  }
  ```

---

### (new file) `migrated/vite.config.js`
- Action: **convert** (new file — empty sourcePath)
- Conversion strategy:
  ```js
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
    },
  })
  ```
  (Vitest config is inlined here so only one config file is needed.)

---

### `webpack.config.js` → (dropped)
- Action: **drop** — Webpack is replaced by Vite. No equivalent file needed.

### `extension/background.js` → (dropped)
- Action: **drop** — Browser extension background script is not part of the React SPA migration.

### `extension/manifest.json` → (dropped)
- Action: **drop** — Browser extension manifest is not part of the React SPA migration.

### `public/index.js` → (dropped)
- Action: **drop** — This was the Webpack entry point that imported `EmojiTranslate` for the browser bundle. Replaced by `src/main.jsx`.

### `README.md` → `migrated/README.md`
- Action: **copy**
