import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header({ onOpenSidebar }) {
  const { config } = useApp();
  const rate = parseFloat(config.dollar_rate) || 45.00;

  return (
    <header className="mobile-header">
      <button className="mobile-toggle-btn" onClick={onOpenSidebar} aria-label="Abrir menú">
        <Menu size={24} />
      </button>
      <span className="brand-name" style={{ fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
        {config.name}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-success)', whiteSpace: 'nowrap' }}>
        Bs. {rate.toFixed(2)}
      </div>
    </header>
  );
}
