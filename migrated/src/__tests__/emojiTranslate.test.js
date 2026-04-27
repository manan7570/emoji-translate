import { describe, it, expect } from 'vitest'
import * as translate from '../lib/emojiTranslate'

describe('isMaybeAlreadyAnEmoji', () => {
  it('batman is not an emoji', () => {
    expect(translate.isMaybeAlreadyAnEmoji('batman')).toBe(false)
  })

  it('🐳 is an emoji', () => {
    expect(translate.isMaybeAlreadyAnEmoji('🐳')).toBe(true)
  })

  it('🤞🏿 is an emoji', () => {
    expect(translate.isMaybeAlreadyAnEmoji('🤞🏿')).toBe(true)
  })

  it('👩🏽‍🏫 is an emoji', () => {
    expect(translate.isMaybeAlreadyAnEmoji('👩🏽‍🏫')).toBe(true)
  })
})

describe('getAllEmojiForWord', () => {
  it('👀 is translated to 👀', () => {
    expect(translate.getAllEmojiForWord('👀')[0]).toBe('👀')
  })

  it('cat is translated to many things', () => {
    const allCats = translate.getAllEmojiForWord('cat')
    expect(allCats.length > 2).toBe(true)
  })

  it('cat is translated to 🐱', () => {
    const allCats = translate.getAllEmojiForWord('cat')
    expect(allCats.indexOf('🐱') !== -1).toBe(true)
  })

  it('cat is translated to 🙀', () => {
    const allCats = translate.getAllEmojiForWord('cat')
    expect(allCats.indexOf('🙀') !== -1).toBe(true)
  })

  it('cat is not translated to 👻', () => {
    const allCats = translate.getAllEmojiForWord('cat')
    expect(allCats.indexOf('👻') === -1).toBe(true)
  })
})

describe('getEmojiForWord', () => {
  it('👀 is translated to 👀', () => {
    expect(translate.getEmojiForWord('👀')).toBe('👀')
  })

  it('cat is translated to a string', () => {
    const translatedCat = translate.getEmojiForWord('cat')
    expect(typeof translatedCat === 'string').toBe(true)
  })

  it('cat is translated to something in the list', () => {
    const allCats = translate.getAllEmojiForWord('cat')
    const translatedCat = translate.getEmojiForWord('cat')
    expect(allCats.indexOf(translatedCat) !== -1).toBe(true)
  })
})

describe('translate', () => {
  it('sentence can be translated to something with words', () => {
    const sentence = 'the house is on fire and the cat is eating the cake'
    const translatedWithWords = translate.translate(sentence)
    expect(translatedWithWords !== '').toBe(true)
  })

  it('sentence can be translated to something without words', () => {
    const sentence = 'the house is on fire and the cat is eating the cake'
    const translatedWithoutWords = translate.translate(sentence, true)
    expect(translatedWithoutWords !== '').toBe(true)
  })

  it('those two things are different', () => {
    const sentence = 'the house is on fire and the cat is eating the cake'
    const translatedWithWords = translate.translate(sentence)
    const translatedWithoutWords = translate.translate(sentence, true)
    expect(translatedWithWords !== translatedWithoutWords).toBe(true)
  })
})

describe('punctuation', () => {
  it('exclamation marks are preserved when translating with words', () => {
    expect(translate.translate('YES! victory!').match(/!/g).length).toBe(2)
  })

  it('exclamation marks are omitted when translating emoji-only', () => {
    expect(translate.translate('YES! victory!', true).match(/!/g)).toBe(null)
  })
})

describe('flags', () => {
  it('im should not be translated to a flag', () => {
    expect(translate.translate('im').trim()).toBe('im')
  })

  it('in should not be translated to a flag', () => {
    expect(translate.translate('in').trim()).toBe('in')
  })

  it('YES should not have a flag emoji 🇾🇪', () => {
    expect(translate.getAllEmojiForWord('yes').indexOf('🇾🇪')).toBe(-1)
  })
})

describe('hard coded words', () => {
  it('i am is translated', () => {
    expect(translate.translate('i am').trim()).not.toBe('i am')
  })

  it('she he is is translated', () => {
    expect(translate.translate('she he is').trim()).not.toBe('she he is')
  })

  it('we they are is translated', () => {
    expect(translate.translate('we they are').trim()).not.toBe('we they are')
  })

  it('thanks is translated to 🙌', () => {
    expect(translate.translate('thanks').trim()).toBe('🙌')
  })
})

describe('ing verbs', () => {
  it('saving is translated', () => {
    expect(translate.translate('saving').trim()).not.toBe('saving')
  })

  it('running is translated', () => {
    expect(translate.translate('running').trim()).not.toBe('running')
  })

  it('eating is translated', () => {
    expect(translate.translate('eating').trim()).not.toBe('eating')
  })
})

describe('omg what is real', () => {
  it('hi is translated', () => {
    expect(translate.translate('hi').trim()).not.toBe('hi')
  })

  it('a complex sentence is translated to something non-empty in emoji-only mode', () => {
    expect(translate.translate('welcome back, emoji robot! ready to take over the world?', true)).not.toBe('')
  })
})
