import { translateForDisplay, getAllEmojiForWord, getEmojiForWord } from '../lib/emojiTranslate';

const SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~';

/**
 * Renders a single translated word as either a <span> (single result)
 * or a <select> (multiple emoji options).
 *
 * @param {{ wordData: { type: 'single', text: string } | { type: 'select', options: string[] } }} props
 */
function WordNode({ wordData }) {
  if (wordData.type === 'select') {
    return (
      <select defaultValue={wordData.options[0]}>
        {wordData.options.map((option, idx) => (
          <option key={idx} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // type === 'single'
  return <span>{wordData.text}</span>;
}

/**
 * Renders the full translated output for the given text prop.
 * Re-renders automatically whenever `text` changes.
 *
 * @param {{ text: string }} props
 */
function TranslatorOutput({ text }) {
  const allLines = text.split('\n');

  const rendered = [];

  allLines.forEach((line, lineIdx) => {
    if (line === '') return;

    const words = line.split(' ');
    words.forEach((word, wordIdx) => {
      const wordData = translateForDisplay(word);
      rendered.push(
        <WordNode key={`${lineIdx}-${wordIdx}`} wordData={wordData} />
      );
    });

    rendered.push(<br key={`br-${lineIdx}`} />);
  });

  return <div id="output">{rendered}</div>;
}

/**
 * Reconstructs the plain-text translated output for clipboard copy.
 * Mirrors the original getActualOutput() logic from index.html, but
 * operates on the text string directly (no DOM traversal needed).
 *
 * For each word, strips leading/trailing punctuation symbols, looks up
 * the first emoji translation (or falls back to the original word), and
 * reassembles the string with the surrounding punctuation preserved.
 *
 * @param {string} text  The raw input text (same value passed to TranslatorOutput)
 * @returns {string}     The translated plain-text string suitable for the clipboard
 */
export function getPlainText(text) {
  let result = '';

  const allLines = text.split('\n');

  allLines.forEach((line, lineIdx) => {
    if (line === '') return;

    const words = line.split(' ');

    words.forEach((rawWord) => {
      let word = rawWord;
      let firstSymbol = '';
      let lastSymbol = '';

      // Strip leading punctuation
      while (word.length > 0 && SYMBOLS.indexOf(word[0]) !== -1) {
        firstSymbol += word[0];
        word = word.slice(1);
      }

      // Strip trailing punctuation
      while (word.length > 0 && SYMBOLS.indexOf(word[word.length - 1]) !== -1) {
        lastSymbol = word[word.length - 1] + lastSymbol;
        word = word.slice(0, word.length - 1);
      }

      // Get the best single emoji (random pick, same as translate())
      const translated = getEmojiForWord(word);

      if (translated) {
        result += firstSymbol + translated + lastSymbol + ' ';
      } else {
        // No translation — keep the original word with its punctuation
        result += firstSymbol + word + lastSymbol + ' ';
      }
    });

    // Add a newline after each line (except we use \n to match textarea input)
    if (lineIdx < allLines.length - 1) {
      result += '\n';
    }
  });

  return result.trimEnd();
}

export default TranslatorOutput;
