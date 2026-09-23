import { MoodGrid } from './Explore';

export function MoodsPage() {
  return (
    <div className="page">
      <div className="page-title">
        <h1>How are you feeling?</h1>
        <p className="muted" style={{ fontSize: 17 }}>
          Pick a mood and we’ll build a continuous session around it.
        </p>
      </div>
      <MoodGrid />
    </div>
  );
}
