// Mood catalogue. Channel-backed moods map to editorial JioSaavn channels; the rest are
// assembled from playlist + song searches so every mood always resolves to a playable queue.
export const MOODS = [
  { key: 'happy', title: 'Happy', tagline: 'Bright, feel-good tracks to lift the day', emoji: '☀️', channelId: '76', queries: ['happy songs', 'feel good hits'], gradient: ['#f7b733', '#fc4a1a'] },
  { key: 'romantic', title: 'Romantic', tagline: 'Love songs for slow evenings', emoji: '💗', channelId: '27', queries: ['romantic songs', 'love songs'], gradient: ['#ff6b9d', '#c44569'] },
  { key: 'sad', title: 'Sad', tagline: 'For the heavy days, when you need to feel it', emoji: '🌧️', channelId: null, queries: ['sad songs', 'heartbreak', 'sad hindi songs'], gradient: ['#4b6cb7', '#182848'] },
  { key: 'chill', title: 'Chill', tagline: 'Laid-back grooves to unwind', emoji: '🌙', channelId: '16', queries: ['chill', 'lofi chill'], gradient: ['#43cea2', '#185a9d'] },
  { key: 'energetic', title: 'Energetic', tagline: 'High-tempo fuel for your workout', emoji: '⚡', channelId: '29', queries: ['workout', 'gym motivation'], gradient: ['#f953c6', '#b91d73'] },
  { key: 'party', title: 'Party', tagline: 'Dance floor anthems, all night', emoji: '🎉', channelId: '17', queries: ['party songs', 'dance hits'], gradient: ['#7f00ff', '#e100ff'] },
  { key: 'focus', title: 'Focus', tagline: 'Instrumentals and calm beats for deep work', emoji: '🎯', channelId: null, queries: ['focus', 'study music', 'instrumental lofi'], gradient: ['#0f2027', '#2c5364'] },
  { key: 'sleep', title: 'Sleep', tagline: 'Soft, slow sounds to drift off to', emoji: '😴', channelId: null, queries: ['sleep', 'soothing', 'calm piano'], gradient: ['#141e30', '#243b55'] },
  { key: 'travel', title: 'Travel', tagline: 'Windows down, road ahead', emoji: '🚗', channelId: '123', queries: ['road trip', 'travel songs'], gradient: ['#11998e', '#38ef7d'] },
  { key: 'retro', title: 'Retro', tagline: 'Golden classics that never age', emoji: '📻', channelId: '28', queries: ['retro hits', 'old is gold'], gradient: ['#c471ed', '#f64f59'] },
  { key: 'devotional', title: 'Devotional', tagline: 'Peaceful bhajans and spiritual songs', emoji: '🪔', channelId: '30', queries: ['bhajan', 'devotional'], gradient: ['#f2994a', '#f2c94c'] },
  { key: 'motivation', title: 'Motivation', tagline: 'Anthems that push you forward', emoji: '🔥', channelId: null, queries: ['motivational songs', 'inspiring songs'], gradient: ['#ff512f', '#dd2476'] },
];

export function findMood(key) {
  return MOODS.find((m) => m.key === String(key).toLowerCase()) || null;
}
