# Test Spec

## Test Strategy
This is a client-side React SPA (no HTTP server). Tests are split into:
1. **Unit tests** for the pure `emojiTranslate.js` logic module (ported directly from `test.js`)
2. **Component smoke tests** for the React components using Vitest + jsdom + React Testing Library

Test runner: **Vitest** (configured in `vite.config.js` with `environment: 'jsdom'`)

---

## Unit Tests

### `migrated/src/__tests__/emojiTranslate.test.js`

#### Function: `isMaybeAlreadyAnEmoji`
- Input: `'batman'` → Expected: `false` — batman is not an emoji
- Input: `'🐳'` → Expected: `true` — whale is an emoji
- Input: `'🤞🏿'` → Expected: `true` — skin-tone modifier emoji is an emoji
- Input: `'👩🏽‍🏫'` → Expected: `true` — ZWJ sequence emoji is an emoji
- Edge case: empty string `''` → Expected: `false`

#### Function: `getAllEmojiForWord`
- Input: `'👀'` → Expected: `result[0] === '👀'` — emoji passthrough
- Input: `'cat'` → Expected: `result.length > 2` — many cat emojis exist
- Input: `'cat'` → Expected: `result.indexOf('🐱') !== -1` — 🐱 is in cat results
- Input: `'cat'` → Expected: `result.indexOf('🙀') !== -1` — 🙀 is in cat results
- Input: `'cat'` → Expected: `result.indexOf('👻') === -1` — ghost is NOT in cat results
- Edge case: `'a'` → Expected: `''` (stopword, returns empty string)
- Edge case: `'it'` → Expected: `''` (stopword)
- Edge case: `'is'` → Expected: `''` (stopword)

#### Function: `getEmojiForWord`
- Input: `'👀'` → Expected: `'👀'` — emoji passthrough
- Input: `'cat'` → Expected: `typeof result === 'string'` — returns a string
- Input: `'cat'` → Expected: `getAllEmojiForWord('cat').indexOf(result) !== -1` — result is in the known list
- Edge case: word with no translation (e.g. `'zzzzz'`) → Expected: `undefined` or `''`

#### Function: `translate`
- Input: `"the house is on fire and the cat is eating the cake"`, `onlyEmoji=false` → Expected: result is not empty string
- Input: `"the house is on fire and the cat is eating the cake"`, `onlyEmoji=true` → Expected: result is not empty string
- Input: same sentence both ways → Expected: `withWords !== withoutWords`
- Input: `'YES! victory!'`, `onlyEmoji=false` → Expected: `result.match(/!/g).length === 2` — exclamation marks preserved
- Input: `'YES! victory!'`, `onlyEmoji=true` → Expected: `result.match(/!/g) === null` — exclamation marks stripped in emoji-only mode
- Edge case: empty string `''` → Expected: `''`

#### Function: `translate` — flags test
- Input: `'im'` → Expected: `translate('im').trim() === 'im'` — short word not converted to flag
- Input: `'in'` → Expected: `translate('in').trim() === 'in'` — short word not converted to flag
- Input: `'yes'` → Expected: `getAllEmojiForWord('yes').indexOf('🇾🇪') === -1` — YES should not produce Yemen flag

#### Function: `translate` — hardcoded words
- Input: `'i am'` → Expected: `translate('i am').trim() !== 'i am'` — 'i' is translated
- Input: `'she he is'` → Expected: `translate('she he is').trim() !== 'she he is'`
- Input: `'we they are'` → Expected: `translate('we they are').trim() !== 'we they are'`
- Input: `'thanks'` → Expected: `translate('thanks').trim() === '🙌'`

#### Function: `translate` — -ing verbs
- Input: `'saving'` → Expected: `translate('saving').trim() !== 'saving'`
- Input: `'running'` → Expected: `translate('running').trim() !== 'running'`
- Input: `'eating'` → Expected: `translate('eating').trim() !== 'eating'`

#### Function: `translate` — misc
- Input: `'hi'` → Expected: `translate('hi').trim() !== 'hi'`
- Input: `'welcome back, emoji robot! ready to take over the world?'`, `onlyEmoji=true` → Expected: result is not empty string

---

## Component Smoke Tests

### `migrated/src/__tests__/App.test.jsx`

#### Component: `App`
- Render test: `render(<App />)` should not throw; the page title `'From 🇬🇧'` heading should be present in the document
- Default input: the textarea should contain the default text `"OMG!!! The house is on fire and the cat is eating all the donuts!"`
- Output renders: after render, the output area should contain at least one `<span>` or `<select>` element (i.e. translation ran)
- Copy button: a button with text `'Copy to clipboard'` should be present

#### Component: `TranslatorOutput`
- Input: `text="the cat is on fire"` → renders without throwing; output contains at least one element
- Input: `text=""` → renders without throwing; output is empty or contains only whitespace
- Input: `text="thanks"` → output contains `'🙌'` somewhere in the rendered text

---

## Integration / Smoke Tests (browser)
Since this is a static SPA, integration testing is done via component tests above.
No HTTP routes to test.

---

## Known Inputs for Testing
The following real sample inputs are hardcoded in the original source and can be used as known-good assertions:

| Input | Expected behaviour |
|---|---|
| `"the cat is on fire"` | Translates to non-empty emoji string (used in original `console.log`) |
| `"OMG!!! The house is on fire and the cat is eating all the donuts!"` | Default textarea value; must produce output |
| `"the house is on fire and the cat is eating the cake"` | Used in `test.js` translate tests |
| `"thanks"` | Must translate to exactly `'🙌'` |
| `"im"` | Must remain `'im'` (not a flag) |
| `"in"` | Must remain `'in'` (not a flag) |
| `"YES! victory!"` | Must preserve 2 exclamation marks in with-words mode |
| `"welcome back, emoji robot! ready to take over the world?"` | Must produce non-empty emoji-only output |
