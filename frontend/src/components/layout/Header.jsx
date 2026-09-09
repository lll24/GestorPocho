import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header({ onOpenSidebar }) {
  const { config } = useApp();

  return (
    <div className="mobile-header">
      <button className="mobile-toggle-btn" onClick={onOpenSidebar} aria-label="Abrir menú">
        <Menu size={24} />
      </button>
      <span className="brand-name">{config.name}</span>
      <div style={{ width: '40px' }}></div>
    </div>
  );
}
