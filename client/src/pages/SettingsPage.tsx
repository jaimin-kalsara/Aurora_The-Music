import { LANGUAGE_OPTIONS, useLibrary } from '../store/library';
import { invalidateQueries } from '../hooks/useQuery';
import { capitalize } from '../utils/format';
import { toast } from '../store/toast';
import type { Quality } from '../types';

const QUALITIES: { key: Quality; label: string; hint: string }[] = [
  { key: 'high', label: 'Ultra · 320 kbps', hint: 'Highest fidelity AAC available for every track' },
  { key: 'medium', label: 'High · 160 kbps', hint: 'Balanced quality and data' },
  { key: 'low', label: 'Data saver · 96 kbps', hint: 'Lightest on bandwidth' },
];

export function SettingsPage() {
  const settings = useLibrary((s) => s.settings);
  const update = useLibrary((s) => s.updateSettings);
  const selected = settings.languages.split(',').filter(Boolean);

  const toggleLanguage = (lang: string) => {
    let next = selected.includes(lang) ? selected.filter((l) => l !== lang) : [...selected, lang];
    if (!next.length) next = ['hindi'];
    update({ languages: next.join(',') });
    invalidateQueries();
    toast('Music languages updated');
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1>Settings</h1>
        <p className="muted" style={{ fontSize: 17 }}>Tune playback and what shows up on your home feed.</p>
      </div>

      <div className="settings-card">
        <div className="setting-row">
          <div>
            <div className="label">Streaming quality</div>
            <div className="hint">{QUALITIES.find((q) => q.key === settings.quality)?.hint}</div>
          </div>
          <div className="segmented" role="radiogroup" aria-label="Streaming quality">
            {QUALITIES.map((q) => (
              <button key={q.key} role="radio" aria-checked={settings.quality === q.key} className={settings.quality === q.key ? 'on' : ''} onClick={() => update({ quality: q.key })}>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="label">Autoplay</div>
            <div className="hint">Keep the music going with similar songs when your queue ends.</div>
          </div>
          <button className={`switch ${settings.autoplay ? 'on' : ''}`} role="switch" aria-checked={settings.autoplay} aria-label="Autoplay" onClick={() => update({ autoplay: !settings.autoplay })} />
        </div>

        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div>
            <div className="label">Music languages</div>
            <div className="hint">Shapes trending, charts and new releases on Home and Explore. Search always covers everything.</div>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button key={lang} className={`chip ${selected.includes(lang) ? 'on' : ''}`} aria-pressed={selected.includes(lang)} onClick={() => toggleLanguage(lang)}>
                {capitalize(lang)}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="label">Keyboard shortcuts</div>
            <div className="hint">
              Space play/pause · ←/→ seek 5s · Shift+←/→ previous/next · M mute · ⌘K / Ctrl+K search
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
