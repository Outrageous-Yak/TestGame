import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/library', label: 'Library' },
  { to: '/mixer', label: 'Mixer' },
  { to: '/cues', label: 'Cue Board' },
  { to: '/export', label: 'Export' },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          onClick={onNavigate}
        >
          {link.label}
        </NavLink>
      ))}
    </>
  );
}
