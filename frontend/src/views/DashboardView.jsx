import React from 'react';
import {
  Coins,
  Wallet,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  CreditCard,
  FileText,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_URL } from '../services/api';

export default function DashboardView({ onOpenWithdraw, onOpenDeposit, onNavigateToCustomersWithDebt }) {
  const { config, stats, statsDays, setStatsDays, cashBalance } = useApp();

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const kpiReceivables = parseFloat(stats.kpis?.total_receivables) || 0;
  const kpiCollected = parseFloat(stats.kpis?.total_collected) || 0;
  const kpiRevenue = parseFloat(stats.kpis?.total_revenue) || 0;
  const kpiInvestment = parseFloat(stats.kpis?.total_investment) || 0;
  const kpiProfit = parseFloat(stats.kpis?.total_profit) || 0;
  const kpiMargin = parseFloat(stats.kpis?.profit_margin) || 0;
  const currentCash = parseFloat(cashBalance.balance) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Panel Financiero</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Métricas, tasas e inversión en tiempo real para tu negocio</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {[7, 30, 90].map(days => (
              <button 
                key={days} 
                onClick={() => setStatsDays(days)}
                style={{
                  border: 'none',
                  background: statsDays === days ? 'var(--brand-primary)' : 'transparent',
                  color: statsDays === days ? 'white' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {days} Días
              </button>
            ))}
          </div>

          <button 
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => window.open(`${API_URL}/api/sales/report?days=${statsDays}`, '_blank')}
            title="Descargar reporte completo en PDF con ventas y movimientos de caja"
          >
            <FileText size={16} />
            Descargar Reporte ({statsDays} Días)
          </button>
        </div>
      </div>

      {/* HIGHLIGHT BANNER: TASA DEL DÓLAR, SALDO EN CAJA Y DEUDAS EN LA CALLE */}
      <div className="dashboard-banner-grid">
        
        {/* Tasa del Dólar Oficial del Sistema */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)', padding: '16px', borderRadius: '14px' }}>
            <Coins size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Tasa de Cambio Activa</span>
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>EN VIVO</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Bs. {dollarRate.toFixed(2)}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>/ 1.00 USD</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Utilizada automáticamente en facturas y POS
            </div>
          </div>
        </div>

        {/* Saldo Actual en Caja (Efectivo Real) */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          border: currentCash < 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', 
          background: currentCash < 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: currentCash < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
              color: currentCash < 0 ? 'var(--status-danger)' : 'var(--status-success)', 
              padding: '16px', 
              borderRadius: '14px' 
            }}>
              <Wallet size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-label" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: currentCash < 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>Saldo Real en Caja</span>
                {currentCash < 0 ? (
                  <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>INVERSIÓN POR RECUPERAR</span>
                ) : (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>FONDOS DISPONIBLES</span>
                )}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: currentCash < 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                ${currentCash.toFixed(2)}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>USD</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Equivalente a <strong>Bs. {(currentCash * dollarRate).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              onClick={onOpenWithdraw}
              title={currentCash <= 0 ? "No puedes retirar con saldo negativo o cero" : "Retirar fondos"}
            >
              <ArrowDownRight size={14} /> Retirar Fondos
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              onClick={onOpenDeposit}
              title="Aportar capital a caja"
            >
              <ArrowUpRight size={14} /> + Aportar Capital
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              onClick={() => window.open(`${API_URL}/api/sales/report?days=${statsDays}`, '_blank')}
              title="Descargar reporte de movimientos y flujo de caja en PDF"
            >
              <FileText size={14} /> Reporte PDF
            </button>
          </div>
        </div>

        {/* Cuentas por Cobrar (Fiao) */}
        <div className="card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          border: kpiReceivables > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)', 
          background: kpiReceivables > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)' 
        }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', padding: '16px', borderRadius: '14px' }}>
            <Clock size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Cuentas por Cobrar (Fiao)</span>
              {kpiReceivables > 0 && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>PENDIENTE</span>}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-danger)' }}>
              ${kpiReceivables.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Equivalente a <strong>Bs. {(kpiReceivables * dollarRate).toFixed(2)}</strong> en la calle
            </div>
          </div>
          {kpiReceivables > 0 && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
              onClick={onNavigateToCustomersWithDebt}
            >
              Ver Deudores
            </button>
          )}
        </div>

      </div>

      {/* KPI Cards Grid (4 tarjetas principales) */}
      <div className="kpi-cards-grid">

        {/* Total Facturado (Vendido) */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px' }}>Total Facturado</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${kpiRevenue.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ${kpiCollected.toFixed(2)} cobrado + ${kpiReceivables.toFixed(2)} fiao
            </div>
          </div>
        </div>

        {/* Inversión Inventario */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--brand-secondary)', padding: '12px', borderRadius: '12px' }}>
            <Package size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-label" style={{ marginBottom: '2px' }}>Inversión Inventario</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${kpiInvestment.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capital activo en stock</div>
          </div>
        </div>

        {/* Ganancia Neta */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px' }}>Ganancia Neta</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)' }}>${kpiProfit.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingresos - Inversión</div>
          </div>
        </div>

        {/* Margen sobre Costo */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px' }}>Margen sobre Costo</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{kpiMargin.toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rentabilidad promedio</div>
          </div>
        </div>
      </div>

      {/* Financial SVG Charts */}
      <div className="card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>Gráfico de Facturación, Ganancias y Caja ({statsDays} Días)</h2>
          <button 
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.open(`${API_URL}/api/sales/report?days=${statsDays}`, '_blank')}
          >
            <FileText size={15} /> Descargar Reporte PDF
          </button>
        </div>

        {stats.chart && stats.chart.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox="0 0 900 320" style={{ width: '100%', height: '320px', minWidth: '600px' }}>
              {(() => {
                const maxVal = Math.max(10, ...stats.chart.map(c => Math.max(c.facturado || 0, c.ganancias || 0, c.caja || 0)));
                const minVal = Math.min(0, ...stats.chart.map(c => Math.min(c.caja || 0, 0)));
                const range = (maxVal - minVal) || 1;
                const getY = (v) => 280 - ((v - minVal) / range) * 220;

                const pointsRevenue = stats.chart.map((c, i) => {
                  const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                  const y = getY(c.facturado || 0);
                  return `${x},${y}`;
                }).join(' ');

                const pointsProfit = stats.chart.map((c, i) => {
                  const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                  const y = getY(c.ganancias || 0);
                  return `${x},${y}`;
                }).join(' ');

                const pointsCash = stats.chart.map((c, i) => {
                  const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                  const y = getY(c.caja !== undefined ? c.caja : 0);
                  return `${x},${y}`;
                }).join(' ');

                const zeroY = getY(0);

                return (
                  <>
                    <line x1="50" y1={zeroY} x2="880" y2={zeroY} stroke="var(--border-color)" strokeWidth="1.5" />
                    <line x1="50" y1={getY(maxVal)} x2="880" y2={getY(maxVal)} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                    {minVal < 0 && (
                      <line x1="50" y1={getY(minVal)} x2="880" y2={getY(minVal)} stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" strokeDasharray="4" />
                    )}
                    
                    {/* 1. Línea Total Facturado (Morado) */}
                    <polyline fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsRevenue} />
                    
                    {/* 2. Línea Ganancias (Verde) */}
                    <polyline fill="none" stroke="var(--status-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsProfit} />

                    {/* 3. Línea Saldo Real en Caja (Amarillo/Ámbar) */}
                    <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" points={pointsCash} />

                    {stats.chart.map((c, i) => {
                      if (i % Math.ceil(stats.chart.length / 8) === 0 || i === stats.chart.length - 1) {
                        const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                        return (
                          <text key={i} x={x} y="305" fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                            {c.fecha.slice(5)}
                          </text>
                        );
                      }
                      return null;
                    })}
                    
                    <text x="40" y={getY(maxVal) + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">${maxVal.toFixed(0)}</text>
                    <text x="40" y={zeroY + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">$0</text>
                    {minVal < 0 && (
                      <text x="40" y={getY(minVal) + 4} fill="var(--status-danger)" fontSize="11" textAnchor="end">${minVal.toFixed(0)}</text>
                    )}
                  </>
                );
              })()}
            </svg>
            
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--brand-primary)' }}></span>
                Total Facturado (${kpiRevenue.toFixed(2)})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-success)' }}></span>
                Ganancias (${kpiProfit.toFixed(2)})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></span>
                Saldo Real en Caja (${currentCash.toFixed(2)})
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
            No hay datos registrados en este periodo de tiempo.
          </div>
        )}
      </div>
    </div>
  );
}
