import allEmojiData from '../data/emojis.json';

const SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~';
const allEmoji = allEmojiData;

/**
 * Returns true for something that's already an emoji like 🤖.
 * @param {string} word The word to be tested
 * @returns {boolean}
 */
function isMaybeAlreadyAnEmoji(word) {
  const ranges = [
    '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
    '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
    '\ud83d[\ude80-\udeff]', // U+1F680 to U+1F6FF
  ];
  return word.match(ranges.join('|')) !== null;
}

/**
 * Returns the list of all emoji translations of an English word.
 * @param {string} originalWord The word to be translated
 * @returns {string[] | ''} The list of emoji translations or '' if none exist.
 */
function getAllEmojiForWord(originalWord) {
  let word = originalWord.trim().toLowerCase();

  if (!word || word === '' || word === 'a' || word === 'it' || word === 'is')
    return '';

  // Maybe this is a plural word but the word is the singular?
  // Don't do it for two letter words since "as" would become "a" etc.
  let maybeSingular = '';
  if (word.length > 2 && word[word.length - 1] === 's') {
    maybeSingular = word.slice(0, word.length - 1);
  }

  // Maybe this is a singular word but the word is the plural?
  // Don't do this for single letter since that will pluralize crazy things.
  const maybePlural = (word.length === 1) ? '' : word + 's';

  let maybeVerbedSimple = '';
  let maybeVerbedVowel = '';
  let maybeVerbedDoubled = '';

  if (word.indexOf('ing') !== -1) {
    const verb = word.substr(0, word.length - 3);
    // eating -> eat
    maybeVerbedSimple = verb;
    // dancing -> dance
    maybeVerbedVowel = verb + 'e';
    // running -> run
    maybeVerbedDoubled = verb.substr(0, verb.length - 1);
  }

  // Go through all the things and find the first one that matches.
  const useful = [];

  // If this is already an emoji, don't try to translate it.
  if (isMaybeAlreadyAnEmoji(word)) {
    useful.push(word);
    return useful;
  }

  // Hardcoded word mappings for words that don't appear in emoji keywords
  if (word === 'i' || word === 'you') {
    useful.push('😀');
    useful.push('😊');
  } else if (word === 'she') {
    useful.push('💁');
  } else if (word === 'he') {
    useful.push('💁‍♂️');
  } else if (word === 'we' || word === 'they') {
    useful.push('👩‍👩‍👦‍👦');
  } else if (word === 'am' || word === 'is' || word === 'are') {
    useful.push('👉');
  } else if (word === 'thanks') {
    useful.push('🙌');
  } else if (word === 'hi' || word === 'hello') {
    useful.push('👋');
  }

  for (const emoji in allEmoji) {
    // Guard: skip the top-level "keys" array and any non-object entry
    if (
      !allEmoji[emoji] ||
      typeof allEmoji[emoji] !== 'object' ||
      Array.isArray(allEmoji[emoji])
    ) {
      continue;
    }
    // Guard: skip entries with a null char (e.g. GitHub custom emoji like "octocat")
    if (!allEmoji[emoji].char) {
      continue;
    }

    const words = allEmoji[emoji].keywords;
    // TODO: omg refactor this one day, please. Why is this even. Why.
    if (
      word === allEmoji[emoji].char ||
      emoji === word ||
      emoji === word + '_face' ||
      emoji === maybeSingular ||
      emoji === maybePlural ||
      emoji === maybeVerbedSimple ||
      emoji === maybeVerbedVowel ||
      emoji === maybeVerbedDoubled ||
      (words && words.indexOf(word) >= 0) ||
      (words && words.indexOf(maybeSingular) >= 0) ||
      (words && words.indexOf(maybePlural) >= 0) ||
      (words && words.indexOf(maybeVerbedSimple) >= 0) ||
      (words && words.indexOf(maybeVerbedVowel) >= 0) ||
      (words && words.indexOf(maybeVerbedDoubled) >= 0)
    ) {
      // If it's a two or three letter word that got translated to a flag, it's
      // 99% of the time incorrect, so stop doing that.
      if (!(word.length <= 3 && allEmoji[emoji].category === 'flags')) {
        useful.push(allEmoji[emoji].char);
      }
    }
  }

  // Fallback verb-form resolution for common English verbs whose base form
  // appears as an emoji key name but not in keywords (e.g. "eat" -> "fork_and_knife").
  // This handles cases where eating -> eat -> fork_and_knife via key name match,
  // but the key name doesn't literally equal the verb. We supplement with a
  // dedicated keyword search on the verb stems using a broader scan.
  if (useful.length === 0 && (maybeVerbedSimple || maybeVerbedVowel || maybeVerbedDoubled)) {
    const verbForms = [maybeVerbedSimple, maybeVerbedVowel, maybeVerbedDoubled].filter(Boolean);
    for (const emoji in allEmoji) {
      if (
        !allEmoji[emoji] ||
        typeof allEmoji[emoji] !== 'object' ||
        Array.isArray(allEmoji[emoji])
      ) {
        continue;
      }
      if (!allEmoji[emoji].char) {
        continue;
      }
      const emojiWords = allEmoji[emoji].keywords || [];
      const emojiName = emoji;
      for (const vf of verbForms) {
        if (!vf) continue;
        // Check if the emoji name contains the verb form as a full word segment
        // (e.g. "fork_and_knife" doesn't contain "eat", but "egg" doesn't either)
        // This is a broader: does any keyword START with or EQUAL the verb form?
        if (
          emojiName === vf ||
          emojiWords.indexOf(vf) >= 0 ||
          emojiName.startsWith(vf + '_') ||
          emojiName.startsWith(vf)
        ) {
          if (!(word.length <= 3 && allEmoji[emoji].category === 'flags')) {
            if (useful.indexOf(allEmoji[emoji].char) === -1) {
              useful.push(allEmoji[emoji].char);
            }
          }
          break;
        }
      }
    }
  }

  return (useful.length === 0) ? '' : useful;
}

/**
 * Returns a random emoji translation of an English word.
 * @param {string} word The word to be translated.
 * @returns {string | undefined} A random emoji translation or undefined if none exists.
 */
function getEmojiForWord(word) {
  const translations = getAllEmojiForWord(word);
  return translations[Math.floor(Math.random() * translations.length)];
}

/**
 * Returns a plain data object describing how to render a word translation.
 * Instead of returning DOM nodes, returns one of:
 *   { type: 'single', text: string }  — render as a <span>
 *   { type: 'select', options: string[] } — render as a <select> with <option> children
 *
 * @param {string} word The word to be translated
 * @returns {{ type: 'single', text: string } | { type: 'select', options: string[] }}
 */
function translateForDisplay(word) {
  // Punctuation blows. Get all the punctuation at the start and end of the word.
  let firstSymbol = '';
  let lastSymbol = '';

  while (word.length > 0 && SYMBOLS.indexOf(word[0]) !== -1) {
    firstSymbol += word[0];
    word = word.slice(1, word.length);
  }
  while (word.length > 0 && SYMBOLS.indexOf(word[word.length - 1]) !== -1) {
    lastSymbol += word[word.length - 1];
    word = word.slice(0, word.length - 1);
  }

  // Look up translations; fall back to the original word if none found.
  let emoji = getAllEmojiForWord(word);
  if (emoji === '') {
    emoji = [word];
  }

  if (emoji.length === 1) {
    return {
      type: 'single',
      text: firstSymbol + emoji[0] + lastSymbol + ' ',
    };
  } else {
    return {
      type: 'select',
      options: emoji.map((e) => firstSymbol + e + lastSymbol + ' '),
    };
  }
}

/**
 * Translates an entire sentence to emoji. If multiple translations exist
 * for a particular word, a random emoji is picked.
 * @param {string} sentence The sentence to be translated
 * @param {boolean} [onlyEmoji] True if the translation should omit all untranslatable words
 * @returns {string} An emoji translation!
 */
function translate(sentence, onlyEmoji) {
  let translation = '';
  const words = sentence.split(' ');
  for (let i = 0; i < words.length; i++) {
    // Punctuation blows. Get all the punctuation at the start and end of the word.
    let firstSymbol = '';
    let lastSymbol = '';
    let word = words[i];

    while (word.length > 0 && SYMBOLS.indexOf(word[0]) !== -1) {
      firstSymbol += word[0];
      word = word.slice(1, word.length);
    }
    while (word.length > 0 && SYMBOLS.indexOf(word[word.length - 1]) !== -1) {
      lastSymbol += word[word.length - 1];
      word = word.slice(0, word.length - 1);
    }

    if (onlyEmoji) {
      firstSymbol = '';
      lastSymbol = '';
    }

    const translated = getEmojiForWord(word);
    if (translated) {
      translation += firstSymbol + translated + lastSymbol + ' ';
    } else if (!onlyEmoji) {
      translation += firstSymbol + word + lastSymbol + ' ';
    }
  }
  return translation;
}

export {
  isMaybeAlreadyAnEmoji,
  getAllEmojiForWord,
  getEmojiForWord,
  translateForDisplay,
  translate,
};
