import { NavLink, useLocation } from 'react-router-dom';
import { Compass, Heart, Home, Library, Note, Search, Settings, Sparkle } from './Icons';
import { useLibrary } from '../store/library';

const nav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/moods', label: 'Moods', icon: Sparkle },
  { to: '/library', label: 'Library', icon: Library },
];

export function Sidebar() {
  const likedCount = useLibrary((s) => s.likedOrder.length);
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Note size={18} />
        </span>
        Aurora
      </div>
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <div className="nav-label">Your music</div>
      <NavLink to="/library?tab=liked" className={({ isActive }) => `nav-item ${isActive && location.search.includes('liked') ? 'active' : ''}`}>
        <Heart size={20} />
        Liked Songs
        {likedCount > 0 && <span className="nav-count">{likedCount}</span>}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        Settings
      </NavLink>
      <div className="sidebar-footer">
        Powered by YouTube Music.
        <br />
        Opus 160 kbps · synced lyrics.
      </div>
    </aside>
  );
}

/** Mobile bottom navigation (glass). */
export function TabBar() {
  const tabs = [nav[0], nav[1], { to: '/search', label: 'Search', icon: Search }, nav[2], nav[3]];
  return (
    <nav className="tabbar glass" aria-label="Primary">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
