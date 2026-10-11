import React from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  History,
  Settings,
  Smartphone,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getImageUrl } from '../../utils/imageUrl';

export default function Sidebar({ currentView, setCurrentView, sidebarOpen, setSidebarOpen }) {
  const { config, stats } = useApp();

  const handleNav = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const localHostIp = config.local_ip || (window.location.hostname !== 'localhost' ? window.location.hostname : '192.168.X.X');
  const port = window.location.port || '8000';

  return (
    <>
      {/* Sidebar Backdrop Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-section" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {config.logo_base64 ? (
              <img src={getImageUrl(config.logo_base64)} alt="Logo" className="brand-logo" />
            ) : (
              <div className="brand-logo-placeholder">{config.name?.charAt(0)?.toUpperCase() || 'G'}</div>
            )}
            <span className="brand-name">{config.name}</span>
          </div>
          <button className="mobile-toggle-btn close-sidebar" onClick={() => setSidebarOpen(false)} style={{ padding: '4px' }} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('dashboard')}
              >
                <TrendingUp size={18} />
                Panel Financiero
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
                onClick={() => handleNav('inventory')}
              >
                <Package size={18} />
                Inventario
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${currentView === 'sale' ? 'active' : ''}`}
                onClick={() => handleNav('sale')}
              >
                <ShoppingCart size={18} />
                Nueva Venta
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${currentView === 'customers' ? 'active' : ''}`}
                onClick={() => handleNav('customers')}
              >
                <Users size={18} />
                Clientes & Fiao
                {stats.kpis?.total_receivables > 0 && (
                  <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                    Deuda
                  </span>
                )}
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
                onClick={() => handleNav('history')}
              >
                <History size={18} />
                Historial
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${currentView === 'config' ? 'active' : ''}`}
                onClick={() => handleNav('config')}
              >
                <Settings size={18} />
                Personalización
              </button>
            </li>
          </ul>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 10px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', fontWeight: 700 }}>
            <Smartphone size={16} />
            <span>Conectar Celular:</span>
          </div>
          <div style={{ 
            background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid rgba(99, 102, 241, 0.25)', 
            borderRadius: '8px', 
            padding: '6px 8px', 
            fontFamily: 'monospace', 
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
            userSelect: 'all'
          }}>
            http://{localHostIp}:{port}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Abre ese enlace en el navegador de tu celular (mismo Wi-Fi).
          </div>
        </div>
      </aside>
    </>
  );
}
