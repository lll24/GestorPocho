import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_URL } from '../../services/api';

export default function CustomerDetailModal({ customerDetail, onClose, onOpenPayment, onOpenVoidModal }) {
  const { config } = useApp();

  if (!customerDetail || !customerDetail.customer || !customerDetail.metrics) return null;

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const { customer, metrics, sales } = customerDetail;

  return (
    <div className="modal-backdrop">
      <div className="card modal-card" style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
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
            <div className="form-label" style={{ fontSize: '0.75rem' }}>Total Compras Activas</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{metrics.sales_count}</div>
          </div>
        </div>

        {/* Sales & What they bought */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Historial de Compras y Pagos</h3>
          
          {sales && sales.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sales.map(s => {
                const isAnulada = s.payment_status === 'anulado';

                return (
                  <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', opacity: isAnulada ? 0.75 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong>Venta #{s.id}</strong> • <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`badge ${isAnulada ? 'badge-danger' : s.payment_status === 'pagado' ? 'badge-success' : s.payment_status === 'fiao' ? 'badge-danger' : 'badge-warning'}`}>
                          {s.payment_status.toUpperCase()}
                        </span>
                        <span style={{ 
                          fontWeight: 800, 
                          fontSize: '1.05rem', 
                          marginLeft: '6px',
                          textDecoration: isAnulada ? 'line-through' : 'none',
                          color: isAnulada ? 'var(--text-muted)' : 'inherit'
                        }}>
                          ${s.total_revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {isAnulada && s.cancel_reason && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600 }}>
                        ⚠️ Venta Anulada: {s.cancel_reason}
                      </div>
                    )}

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
                        Pendiente: <strong style={{ color: (!isAnulada && s.amount_pending > 0) ? 'var(--status-danger)' : 'var(--status-success)' }}>
                          ${isAnulada ? '0.00' : s.amount_pending.toFixed(2)}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!isAnulada && s.amount_pending > 0 && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => onOpenPayment({ ...s, originalSale: s })}
                          >
                            + Registrar Abono
                          </button>
                        )}
                        {!isAnulada && onOpenVoidModal && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--status-danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            onClick={() => onOpenVoidModal(s)}
                            title="Anular venta y reponer inventario"
                          >
                            Anular
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
                );
              })}
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
