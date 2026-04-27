/**
 * Smoke tests for the App and TranslatorOutput React components.
 *
 * Runner:  Vitest (jsdom environment, globals: true — see vite.config.js)
 * Library: @testing-library/react + @testing-library/jest-dom
 *
 * Mocking strategy
 * ─────────────────
 * vi.mock() is hoisted by Vitest ABOVE all import statements. Any const/let
 * declared at module scope is NOT hoisted, so referencing them inside a mock
 * factory causes a TDZ ReferenceError. All mock data is therefore defined
 * INLINE inside each factory function — no top-level variables are referenced.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mock emojiTranslate so tests are deterministic and fast (no JSON traversal).
// All data is inlined inside the factory to avoid Vitest hoisting / TDZ issues.
// ---------------------------------------------------------------------------
vi.mock('../lib/emojiTranslate', () => {
  return {
    isMaybeAlreadyAnEmoji: (word) => /\p{Emoji}/u.test(word),

    getAllEmojiForWord: (word) => {
      const w = word.trim().toLowerCase()
      const map = {
        cat: ['🐱', '🙀', '😸'],
        fire: ['🔥'],
        house: ['🏠'],
        donuts: ['🍩'],
        eating: ['🍽️'],
      }
      return map[w] || ''
    },

    getEmojiForWord: (word) => {
      const w = word.trim().toLowerCase()
      const map = {
        cat: '🐱',
        fire: '🔥',
        house: '🏠',
        donuts: '🍩',
        eating: '🍽️',
      }
      return map[w] || undefined
    },

    // Returns a plain data object — no DOM.
    translateForDisplay: (word) => {
      // Strip leading/trailing punctuation the same way the real impl does.
      const SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~'
      let firstSymbol = ''
      let lastSymbol = ''
      let w = word
      while (w.length && SYMBOLS.includes(w[0])) {
        firstSymbol += w[0]
        w = w.slice(1)
      }
      while (w.length && SYMBOLS.includes(w[w.length - 1])) {
        lastSymbol += w[w.length - 1]
        w = w.slice(0, w.length - 1)
      }

      const multi = {
        cat: ['🐱', '🙀', '😸'],
      }
      const single = {
        fire: '🔥',
        house: '🏠',
        donuts: '🍩',
        eating: '🍽️',
      }
      const wl = w.toLowerCase()

      if (multi[wl]) {
        return {
          type: 'select',
          options: multi[wl].map((e) => firstSymbol + e + lastSymbol + ' '),
        }
      }
      if (single[wl]) {
        return { type: 'single', text: firstSymbol + single[wl] + lastSymbol + ' ' }
      }
      return { type: 'single', text: firstSymbol + w + lastSymbol + ' ' }
    },

    translate: (sentence, onlyEmoji) => {
      if (!sentence) return ''
      // Minimal stub: replace known words, keep unknown words (unless onlyEmoji).
      const map = { cat: '🐱', fire: '🔥', house: '🏠', donuts: '🍩', eating: '🍽️' }
      return sentence
        .split(' ')
        .map((word) => {
          const key = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
          const emoji = map[key]
          if (emoji) return emoji + ' '
          return onlyEmoji ? '' : word + ' '
        })
        .join('')
        .trim()
    },

    getPlainText: (text) => {
      if (!text) return ''
      const map = { cat: '🐱', fire: '🔥', house: '🏠', donuts: '🍩', eating: '🍽️' }
      return text
        .split(' ')
        .map((word) => {
          const key = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
          return map[key] ? map[key] + ' ' : word + ' '
        })
        .join('')
        .trim()
    },
  }
})

// ---------------------------------------------------------------------------
// Lazy-import components AFTER mocks are registered.
// ---------------------------------------------------------------------------
import App from '../App'
import TranslatorOutput from '../components/TranslatorOutput'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEFAULT_TEXT =
  "OMG!!! The house is on fire and the cat is eating all the donuts!"

// ---------------------------------------------------------------------------
// App — smoke tests
// ---------------------------------------------------------------------------
describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('renders the page heading', () => {
    render(<App />)
    // The heading "From 🇬🇧" or similar should be visible.
    expect(screen.getByText(/from/i)).toBeInTheDocument()
  })

  it('renders a textarea with the default input text', () => {
    render(<App />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue(DEFAULT_TEXT)
  })

  it('renders the "Copy to clipboard" button', () => {
    render(<App />)
    const btn = screen.getByRole('button', { name: /copy to clipboard/i })
    expect(btn).toBeInTheDocument()
  })

  it('renders the footer with author credit', () => {
    render(<App />)
    // Footer should contain a link to the GitHub repo or "monica".
    expect(screen.getByText(/monica/i)).toBeInTheDocument()
  })

  it('renders the output area (TranslatorOutput is mounted)', () => {
    render(<App />)
    // The output div / translated content region should exist.
    // We look for at least one span or select rendered by TranslatorOutput.
    const { container } = render(<App />)
    // The output area contains translated tokens derived from the default text.
    // With our mock, "house", "fire", "cat", "eating", "donuts" → emoji spans.
    expect(container.querySelector('span, select')).toBeTruthy()
  })

  it('updates the textarea value when the user types', () => {
    render(<App />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'hello cat' } })
    expect(textarea).toHaveValue('hello cat')
  })

  it('re-renders translated output when textarea changes', () => {
    const { container } = render(<App />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'cat' } })
    // "cat" maps to a <select> with three emoji options in our mock.
    const select = container.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('copy button changes label to "Done!" after click', async () => {
    // Use fake timers so the setTimeout in handleCopy does not fire
    // asynchronously during the test and cause "not wrapped in act" warnings.
    vi.useFakeTimers()

    // Mock clipboard API
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })

    render(<App />)
    const btn = screen.getByRole('button', { name: /copy to clipboard/i })

    // Wrap the click in act so React flushes the synchronous setCopyLabel('Done!')
    // state update before we assert. The fake timers prevent the 1-second
    // setTimeout from firing unexpectedly while act() drains the queue.
    await act(async () => {
      fireEvent.click(btn)
    })

    // Label should now read "Done!" immediately after the click.
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()

    // Advance timers and clean up so other tests are not affected.
    await act(async () => {
      vi.runAllTimers()
    })

    vi.useRealTimers()
  })
})

// ---------------------------------------------------------------------------
// TranslatorOutput — unit tests
// ---------------------------------------------------------------------------
describe('TranslatorOutput', () => {
  it('renders without crashing for an empty string', () => {
    const { container } = render(<TranslatorOutput text="" />)
    expect(container).toBeTruthy()
  })

  it('renders a <span> for an untranslatable word', () => {
    // "hello" is not in our mock map → returns { type: 'single', text: 'hello ' }
    const { container } = render(<TranslatorOutput text="hello" />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
    expect(container.textContent).toContain('hello')
  })

  it('renders a <span> for a word with a single emoji translation', () => {
    // "fire" maps to { type: 'single', text: '🔥 ' }
    const { container } = render(<TranslatorOutput text="fire" />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
    expect(container.textContent).toContain('🔥')
  })

  it('renders a <select> for a word with multiple emoji translations', () => {
    // "cat" maps to { type: 'select', options: ['🐱 ', '🙀 ', '😸 '] }
    const { container } = render(<TranslatorOutput text="cat" />)
    const select = container.querySelector('select')
    expect(select).toBeTruthy()
    const options = select.querySelectorAll('option')
    expect(options.length).toBe(3)
    expect(options[0].textContent).toContain('🐱')
    expect(options[1].textContent).toContain('🙀')
    expect(options[2].textContent).toContain('😸')
  })

  it('renders a <br /> after each non-empty line', () => {
    const { container } = render(<TranslatorOutput text={'hello\nworld'} />)
    const brs = container.querySelectorAll('br')
    // Two non-empty lines → two <br /> elements.
    expect(brs.length).toBe(2)
  })

  it('skips empty lines and does not emit a <br /> for them', () => {
    // Two non-empty lines separated by an empty line.
    const { container } = render(<TranslatorOutput text={'hello\n\nworld'} />)
    const brs = container.querySelectorAll('br')
    // Only two non-empty lines produce <br /> elements.
    expect(brs.length).toBe(2)
  })

  it('renders multiple words on a single line', () => {
    // "cat fire" → one select + one span (from mock).
    const { container } = render(<TranslatorOutput text="cat fire" />)
    const select = container.querySelector('select')
    const span = container.querySelector('span')
    expect(select).toBeTruthy()
    expect(span).toBeTruthy()
  })

  it('renders punctuation adjacent to a translated word', () => {
    // "fire!" → the mock strips "!" as lastSymbol, finds "fire" → 🔥, then re-appends "!".
    const { container } = render(<TranslatorOutput text="fire!" />)
    expect(container.textContent).toContain('🔥')
    expect(container.textContent).toContain('!')
  })

  it('re-renders when the text prop changes', () => {
    const { container, rerender } = render(<TranslatorOutput text="hello" />)
    expect(container.textContent).toContain('hello')
    rerender(<TranslatorOutput text="fire" />)
    expect(container.textContent).toContain('🔥')
    expect(container.textContent).not.toContain('hello')
  })

  it('renders the full default sentence without throwing', () => {
    expect(() => {
      render(<TranslatorOutput text={DEFAULT_TEXT} />)
    }).not.toThrow()
  })
})
