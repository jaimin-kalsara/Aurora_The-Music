import { NavLink, useLocation } from 'react-router-dom';
import { Compass, Heart, Home, Library, Note, Settings, Sparkle } from './Icons';
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
        {likedCount > 0 && <span className="dim" style={{ marginLeft: 'auto', fontSize: 12 }}>{likedCount}</span>}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        Settings
      </NavLink>
      <div className="sidebar-footer">
        Lossless-grade 320 kbps streaming.
        <br />
        Built for listening.
      </div>
    </aside>
  );
}

export function TabBar() {
  return (
    <nav className="tabbar">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
