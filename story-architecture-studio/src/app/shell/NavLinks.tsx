import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/explorer', label: 'Explorer' },
  { to: '/graph', label: 'Graph' },
  { to: '/issues', label: 'Issue Board' },
  { to: '/reader-knowledge', label: 'Reader Knowledge' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/mermaid', label: 'Mermaid' },
  { to: '/validation', label: 'Validation' },
  { to: '/reports', label: 'Reports' },
  { to: '/snapshots', label: 'Snapshots' },
  { to: '/import-export', label: 'Import / Export' },
] as const;

const TREE_ITEMS = [
  { to: '/trees/story', label: 'Story Tree' },
  { to: '/trees/character', label: 'Character Tree' },
  { to: '/trees/reader', label: 'Reader Tree' },
  { to: '/trees/world', label: 'World Tree' },
  { to: '/trees/mythology', label: 'Mythology Tree' },
  { to: '/trees/creature', label: 'Creature Tree' },
  { to: '/trees/adaptation', label: 'Adaptation Tree' },
] as const;

interface NavLinksProps {
  onNavigate?: () => void;
}

export function NavLinks({ onNavigate }: NavLinksProps) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined} onClick={onNavigate}>
          {item.label}
        </NavLink>
      ))}
      <div className="nav-section">Trees</div>
      {TREE_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} onClick={onNavigate}>
          {item.label}
        </NavLink>
      ))}
    </>
  );
}
