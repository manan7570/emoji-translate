import { useState } from 'react'
import TranslatorOutput from './components/TranslatorOutput'
import { getPlainText } from './components/TranslatorOutput'
import './App.css'

function App() {
  const [inputText, setInputText] = useState(
    'OMG!!! The house is on fire and the cat is eating all the donuts!'
  )
  const [copyLabel, setCopyLabel] = useState('Copy to clipboard')

  function handleCopy() {
    const value = getPlainText(inputText)
    // Update the label synchronously so the UI reflects the change immediately
    // (navigator.clipboard.writeText is async/microtask-queued, so we cannot
    // wait for the .then() callback if we want the label to update right away).
    setCopyLabel('Done!')
    setTimeout(() => {
      setCopyLabel('Copy to clipboard')
    }, 1000)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch((err) => {
        console.error('Clipboard write failed:', err)
      })
    }
  }

  return (
    <div className="container">
      <h1>From 🇬🇧</h1>
      <p className="note">(just start typing!)</p>
      <textarea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
      />
      <br /><br />
      <h1>
        To ✨emoji✨{' '}
        <button onClick={handleCopy} id="copyButton">
          {copyLabel}
        </button>
      </h1>
      <TranslatorOutput text={inputText} />
      <div id="footer">
        <p>
          made with <span className="red">❤︎</span> by{' '}
          <a href="https://twitter.com/notwaldorf">monica</a>.
          {' '}find this on{' '}
          <a href="https://github.com/notwaldorf/emoji-translate">github</a>
        </p>
      </div>
    </div>
  )
}

export default App
