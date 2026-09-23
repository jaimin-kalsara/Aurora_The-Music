# Aurora Music - Full Overhaul Plan

## Phase 1: Recommendation Engine (Core Intelligence)

### 1.1 Personalized "For You" Recommendations
- [ ] Add user listening history tracking (localStorage + server-side session)
- [ ] Implement collaborative filtering using implicit feedback (plays, skips, likes, completion rate)
- [ ] Content-based filtering using audio features (genre, mood, language, artist similarity)
- [ ] Hybrid recommendation combining both approaches
- [ ] "Discover Weekly" style personalized playlist generation
- [ ] "Daily Mix" style mood/genre-based personalized mixes

### 1.2 Smarter Mood/Autoplay/Radio
- [ ] Improve mood song selection with diversity scoring
- [ ] Add artist/genre balancing in mood queues
- [ ] Implement proper radio stations with seed tracking
- [ ] Add "Radio based on this song/artist/playlist" with better algorithms
- [ ] Context-aware recommendations (time of day, recent activity)

### 1.3 Recommendation API Endpoints
- [ ] `GET /api/recommendations/for-you` - Personalized home feed
- [ ] `GET /api/recommendations/discover-weekly` - Weekly discovery playlist
- [ ] `GET /api/recommendations/daily-mix/:genre` - Daily genre mixes
- [ ] `GET /api/radio/smart/:seedId` - Improved smart radio
- [ ] `POST /api/feedback` - Track play/skip/like for learning

---

## Phase 2: Search Engine Improvements

### 2.1 Search Quality
- [ ] Add fuzzy matching with Levenshtein distance for typo tolerance
- [ ] Implement search result ranking (popularity, recency, personal relevance)
- [ ] Add synonym/alias handling (e.g., "Arijit" -> "Arijit Singh")
- [ ] Multi-language query normalization

### 2.2 Search Features
- [ ] Search suggestions with categories (songs, artists, albums, playlists, lyrics)
- [ ] Recent searches integrated into autocomplete
- [ ] Search filters (language, genre, year, duration)
- [ ] "Search within" playlist/album/artist
- [ ] Voice search support (Web Speech API)

### 2.3 Search API Enhancements
- [ ] `GET /api/search/enhanced` - Ranked, personalized results
- [ ] `GET /api/search/suggest/v2` - Rich suggestions with recent searches
- [ ] `GET /api/search/filters` - Available filter options

---

## Phase 3: Audio Quality & Playback Excellence

### 3.1 Audio Engine Enhancements
- [ ] Crossfade between tracks (configurable 0-12s)
- [ ] Gapless playback for albums
- [ ] Better prefetching (prefetch next 2-3 tracks)
- [ ] Adaptive bitrate streaming (auto-switch on network issues)
- [ ] Audio visualization (waveform, frequency bars) in Now Playing

### 3.2 Playback Features
- [ ] Sleep timer (15/30/60/90/120 min, end of track/queue)
- [ ] Playback speed control (0.5x - 2x)
- [ ] Equalizer presets (Bass, Treble, Vocal, Flat, Custom)
- [ ] Volume normalization (ReplayGain-style)
- [ ] Queue management: save/load queues, queue history

### 3.3 Quality Indicators
- [ ] Real-time bitrate display
- [ ] Network quality indicator
- [ ] "Ultra" badge for 320kbps tracks

---

## Phase 4: UI/UX Polish & Mobile Excellence

### 4.1 Visual Polish
- [ ] Refine animations (reduce jank, improve 60fps)
- [ ] Better loading states (progressive skeleton loading)
- [ ] Improved empty states with actionable CTAs
- [ ] Dark/light theme support (system preference + manual toggle)
- [ ] High contrast mode for accessibility

### 4.2 Mobile Experience
- [ ] Swipe gestures (swipe to queue, swipe to like, pull to refresh)
- [ ] Bottom sheet modals instead of full-screen on mobile
- [ ] PWA support (installable, offline caching, background sync)
- [ ] Native share sheet integration
- [ ] Haptic feedback for key actions

### 4.3 Accessibility
- [ ] Full keyboard navigation
- [ ] Screen reader support (ARIA labels, live regions)
- [ ] Focus management in modals
- [ ] Reduced motion preference respected
- [ ] Color contrast compliance (WCAG AA)

### 4.4 New UI Components
- [ ] Mini-player persistent on mobile
- [ ] Collapsible sidebar with drag handle
- [ ] Context menus (right-click / long-press)
- [ ] Toast notifications with actions (undo, dismiss)
- [ ] Command palette (⌘K) for power users

---

## Phase 5: Testing & Quality Assurance

### 5.1 Unit Tests (Expand existing)
- [ ] Normalization functions (✓ existing)
- [ ] Player store logic (shuffle, repeat, queue operations)
- [ ] Library store (liked, recent, settings persistence)
- [ ] API utilities (caching, error handling)
- [ ] Format utilities

### 5.2 Integration Tests
- [ ] Server API endpoints (home, search, moods, entities)
- [ ] Stream URL decryption and quality selection
- [ ] Cache invalidation and TTL behavior

### 5.3 End-to-End Tests (Playwright)
- [ ] **Critical Path 1**: Home → Search → Play song → Queue management → Now Playing
- [ ] **Critical Path 2**: Mood selection → Shuffle play → Autoplay continuation
- [ ] **Critical Path 3**: Library → Liked songs → Play → Offline persistence
- [ ] **Critical Path 4**: Settings → Quality change → Immediate playback switch
- [ ] **Critical Path 5**: Artist/Album/Playlist pages → Play → Navigation
- [ ] **Mobile**: Touch gestures, PWA install, offline mode
- [ ] **Accessibility**: Keyboard navigation, screen reader flow

### 5.4 Performance Testing
- [ ] Lighthouse CI for Core Web Vitals
- [ ] Bundle size monitoring
- [ ] API response time benchmarks
- [ ] Memory leak detection (long playback sessions)

---

## Phase 6: Infrastructure & DevOps

### 6.1 Server Improvements
- [ ] Rate limiting per IP
- [ ] Request/response logging with correlation IDs
- [ ] Health check endpoint with dependency checks
- [ ] Graceful shutdown handling
- [ ] Redis cache layer (replace in-memory for multi-instance)

### 6.2 Client Build
- [ ] Code splitting by route
- [ ] Service worker for offline caching
- [ ] Bundle analysis and optimization
- [ ] Source maps in production for error tracking

### 6.3 Monitoring
- [ ] Error boundary with Sentry-style reporting
- [ ] Performance marks for key user interactions
- [ ] API latency tracking

---

## Implementation Order

1. **Week 1**: Recommendation Engine core + API endpoints
2. **Week 2**: Search improvements + UI integration
3. **Week 3**: Audio engine enhancements + playback features
4. **Week 4**: UI/UX polish + Mobile + PWA + Accessibility
5. **Week 5**: Testing suite (unit + integration + E2E)
6. **Week 6**: Infrastructure + Performance + Documentation

---

## Success Metrics

- [ ] Search latency < 300ms (p95)
- [ ] Time to first byte (audio) < 500ms
- [ ] Recommendation click-through rate > 15%
- [ ] Autoplay session length > 5 tracks average
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Zero critical/severe bugs in E2E test suite
- [ ] PWA installable with offline support