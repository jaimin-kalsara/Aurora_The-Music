// Mood catalogue. Each mood maps to a YouTube Music "Moods & genres" category (matched by name at
// runtime) plus search queries so every mood always resolves to a playable queue.
// Gradients are monochrome to match the black & white theme.
export const MOODS = [
  { key: 'happy', title: 'Happy', tagline: 'Bright, feel-good tracks to lift the day', emoji: '☀️', categories: ['Feel good'], queries: ['feel good hits', 'happy songs'], gradient: ['#f4f4f6', '#9a9aa2'] },
  { key: 'romantic', title: 'Romantic', tagline: 'Love songs for slow evenings', emoji: '💗', categories: ['Romance'], queries: ['romantic songs', 'love songs'], gradient: ['#d9d9df', '#4a4a52'] },
  { key: 'sad', title: 'Sad', tagline: 'For the heavy days, when you need to feel it', emoji: '🌧️', categories: ['Sad'], queries: ['sad songs', 'heartbreak songs'], gradient: ['#5a5a63', '#141418'] },
  { key: 'chill', title: 'Chill', tagline: 'Laid-back grooves to unwind', emoji: '🌙', categories: ['Chill'], queries: ['chill songs', 'lofi chill'], gradient: ['#b9b9c2', '#3a3a42'] },
  { key: 'energetic', title: 'Energetic', tagline: 'High-tempo fuel for your workout', emoji: '⚡', categories: ['Energize', 'Workout'], queries: ['workout songs', 'gym motivation'], gradient: ['#ffffff', '#6e6e78'] },
  { key: 'party', title: 'Party', tagline: 'Dance floor anthems, all night', emoji: '🎉', categories: ['Party'], queries: ['party songs', 'dance hits'], gradient: ['#e2e2e8', '#2a2a30'] },
  { key: 'focus', title: 'Focus', tagline: 'Instrumentals and calm beats for deep work', emoji: '🎯', categories: ['Focus'], queries: ['focus music', 'study lofi'], gradient: ['#8b8b94', '#1e1e24'] },
  { key: 'sleep', title: 'Sleep', tagline: 'Soft, slow sounds to drift off to', emoji: '😴', categories: ['Sleep'], queries: ['sleep music', 'calm piano'], gradient: ['#3d3d46', '#0a0a0d'] },
  { key: 'travel', title: 'Travel', tagline: 'Windows down, road ahead', emoji: '🚗', categories: ['Commute'], queries: ['road trip songs', 'travel songs'], gradient: ['#cfcfd6', '#5c5c66'] },
  { key: 'retro', title: 'Retro', tagline: 'Golden classics that never age', emoji: '📻', categories: ['Decades'], queries: ['retro hits', 'old is gold'], gradient: ['#a8a8b0', '#2c2c33'] },
  { key: 'devotional', title: 'Devotional', tagline: 'Peaceful bhajans and spiritual songs', emoji: '🪔', categories: ['Devotional'], queries: ['bhajan', 'devotional songs'], gradient: ['#efefF3', '#7a7a84'] },
  { key: 'motivation', title: 'Motivation', tagline: 'Anthems that push you forward', emoji: '🔥', categories: ['Workout', 'Energize'], queries: ['motivational songs', 'inspiring songs'], gradient: ['#c4c4cc', '#1a1a1f'] },
];

export function findMood(key) {
  return MOODS.find((m) => m.key === String(key).toLowerCase()) || null;
}

/** Map the user's language setting to YouTube Music genre categories. */
export const LANGUAGE_CATEGORIES = {
  hindi: 'Hindi',
  english: 'Pop',
  punjabi: 'Punjabi',
  tamil: 'Tamil',
  telugu: 'Telugu',
  marathi: 'Marathi',
  gujarati: 'Gujarati',
  bengali: 'Bengali',
  kannada: 'Kannada',
  bhojpuri: 'Bhojpuri',
  malayalam: 'Malayalam',
  urdu: 'Ghazal/sufi',
  haryanvi: 'Haryanvi',
  rajasthani: 'Folk & acoustic',
  odia: 'Indian pop',
  assamese: 'Indian indie',
};
