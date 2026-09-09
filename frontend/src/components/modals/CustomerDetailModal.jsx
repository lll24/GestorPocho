import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_URL } from '../../services/api';

export default function CustomerDetailModal({ customerDetail, onClose, onOpenPayment }) {
  const { config } = useApp();

  if (!customerDetail || !customerDetail.customer || !customerDetail.metrics) return null;

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const { customer, metrics, sales } = customerDetail;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="badge badge-success" style={{ marginBottom: '6px' }}>Ficha de Cliente</span>
            <h2 style={{ margin: 0 }}>{customer.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {customer.phone || 'Sin teléfono'} • {customer.email || 'Sin correo'}
            </div>
          </div>
          <button className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div className="form-label" style={{ fontSize: '0.75rem' }}>Total Comprado</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>${metrics.total_spent.toFixed(2)}</div>
          </div>

          <div style={{ 
            background: metrics.total_debt > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
            padding: '12px', 
            borderRadius: '8px',
            border: metrics.total_debt > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
          }}>
            <div className="form-label" style={{ fontSize: '0.75rem', color: metrics.total_debt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
              Deuda Pendiente (Fiao)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: metrics.total_debt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
              ${(parseFloat(metrics.total_debt) || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Bs. {((parseFloat(metrics.total_debt) || 0) * dollarRate).toFixed(2)}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div className="form-label" style={{ fontSize: '0.75rem' }}>Total Compras</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{metrics.sales_count}</div>
          </div>
        </div>

        {/* Sales & What they bought */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Historial de Compras y Pagos</h3>
          
          {sales && sales.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sales.map(s => (
                <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong>Venta #{s.id}</strong> • <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`badge ${s.payment_status === 'pagado' ? 'badge-success' : s.payment_status === 'fiao' ? 'badge-danger' : 'badge-warning'}`}>
                        {s.payment_status.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', marginLeft: '6px' }}>
                        ${s.total_revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items bought */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Artículos comprados:</div>
                    {s.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>• {it.product_name} x {it.quantity}</span>
                        <span style={{ color: 'var(--brand-secondary)' }}>${it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment debt info & Abono Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      Pagado: <strong>${s.amount_paid.toFixed(2)}</strong> | 
                      Pendiente: <strong style={{ color: s.amount_pending > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                        ${s.amount_pending.toFixed(2)}
                      </strong>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {s.amount_pending > 0 && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => onOpenPayment({ ...s, originalSale: s })}
                        >
                          + Registrar Abono
                        </button>
                      )}
                      <a 
                        href={`${API_URL}/api/sales/${s.id}/invoice`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem', textDecoration: 'none' }}
                      >
                        Factura
                      </a>
                    </div>
                  </div>

                  {/* Payments history */}
                  {s.payments && s.payments.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontWeight: 600 }}>Abonos registrados:</div>
                      {s.payments.map(p => (
                        <div key={p.id}>
                          • ${p.amount.toFixed(2)} vía {p.payment_method} el {new Date(p.date).toLocaleDateString()} {p.payment_reference ? `(Ref: ${p.payment_reference})` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Este cliente aún no registra compras.
            </div>
          )}
        </div>

        <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={onClose}>
          Cerrar Ficha
        </button>
      </div>
    </div>
  );
}
