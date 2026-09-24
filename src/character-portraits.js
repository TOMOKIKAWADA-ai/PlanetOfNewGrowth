export const CHARACTER_EXPRESSIONS = Object.freeze([
  'normal',
  'smile',
  'angry',
  'sad',
  'surprise'
]);

export const CHARACTER_PORTRAITS = Object.freeze({
  tsukimi: Object.freeze({
    normal: new URL('../assets/ui/characters/faces/tsukimi/normal.png', import.meta.url).href,
    smile: new URL('../assets/ui/characters/faces/tsukimi/smile.png', import.meta.url).href,
    angry: new URL('../assets/ui/characters/faces/tsukimi/angry.png', import.meta.url).href,
    sad: new URL('../assets/ui/characters/faces/tsukimi/sad.png', import.meta.url).href,
    surprise: new URL('../assets/ui/characters/faces/tsukimi/surprise.png', import.meta.url).href
  }),
  akame: Object.freeze({
    normal: new URL('../assets/ui/characters/faces/akame/normal.png', import.meta.url).href,
    smile: new URL('../assets/ui/characters/faces/akame/smile.png', import.meta.url).href,
    angry: new URL('../assets/ui/characters/faces/akame/angry.png', import.meta.url).href,
    sad: new URL('../assets/ui/characters/faces/akame/sad.png', import.meta.url).href,
    surprise: new URL('../assets/ui/characters/faces/akame/surprise.png', import.meta.url).href
  }),
  kiichigo: Object.freeze({
    normal: new URL('../assets/ui/characters/faces/kiichigo/normal.png', import.meta.url).href,
    smile: new URL('../assets/ui/characters/faces/kiichigo/smile.png', import.meta.url).href,
    angry: new URL('../assets/ui/characters/faces/kiichigo/angry.png', import.meta.url).href,
    sad: new URL('../assets/ui/characters/faces/kiichigo/sad.png', import.meta.url).href,
    surprise: new URL('../assets/ui/characters/faces/kiichigo/surprise.png', import.meta.url).href
  })
});

export function getCharacterPortrait(characterId, expression = 'normal') {
  const portraits = CHARACTER_PORTRAITS[characterId] ?? CHARACTER_PORTRAITS.tsukimi;
  return portraits[expression] ?? portraits.normal;
}
