import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, API_URL } from '../services/api';

export default function HistoryView({ onOpenPaymentModal, onViewCapture }) {
  const { config, sales, cashMovements, statsDays } = useApp();

  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'sales', 'inventory', 'cash', 'abonos'
  const [historySearch, setHistorySearch] = useState('');
  const [loadingCaptureId, setLoadingCaptureId] = useState(null);

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;

  const handleFetchCapture = async (saleId, existingCapture) => {
    if (existingCapture) {
      onViewCapture(existingCapture);
      return;
    }
    setLoadingCaptureId(saleId);
    try {
      const res = await api.getSaleCapture(saleId);
      if (res.capture) {
        onViewCapture(res.capture);
      } else {
        alert('No se pudo cargar la imagen del comprobante.');
      }
    } catch (err) {
      console.error('Error fetching capture:', err);
      alert('Error de conexión al cargar la captura.');
    } finally {
      setLoadingCaptureId(null);
    }
  };

  // Build unified timeline
  const timeline = [];

  // 1. Sales
  sales.forEach(s => {
    timeline.push({
      id: `sale-${s.id}`,
      rawId: s.id,
      eventType: 'venta',
      date: new Date(s.date),
      title: `Venta #${s.id}`,
      client: s.client_name || 'Consumidor Final',
      isRegisteredCustomer: Boolean(s.customer_id),
      items: s.items || [],
      deliveryCost: parseFloat(s.delivery_cost) || 0,
      amount: parseFloat(s.total_revenue) || 0,
      amountPending: parseFloat(s.amount_pending) || 0,
      paymentMethod: s.payment_method,
      paymentStatus: s.payment_status,
      paymentReference: s.payment_reference,
      hasCapture: Boolean(s.has_capture || s.payment_capture_base64),
      captureBase64: s.payment_capture_base64,
      dollarRate: parseFloat(s.dollar_rate) || dollarRate,
      originalSale: s
    });
  });

  // 2. Cash movements (except ingreso_venta which is represented by sales)
  cashMovements.forEach(m => {
    if (m.type === 'ingreso_venta') return;
    timeline.push({
      id: `cash-${m.id}`,
      rawId: m.id,
      eventType: m.type,
      date: new Date(m.date),
      title: m.type === 'compra_inventario' ? 'Entrada de Stock' :
             m.type === 'retiro_dueno' ? 'Retiro del Dueño' :
             m.type === 'ingreso_capital' ? 'Aporte de Capital' :
             m.type === 'abono_fiao' ? 'Abono a Fiao' : 'Movimiento de Caja',
      description: m.description,
      notes: m.notes,
      amount: parseFloat(m.amount) || 0,
      direction: m.direction,
      referenceId: m.reference_id,
      quantity: m.quantity,
      unitCost: m.unit_cost,
      dollarRate: dollarRate
    });
  });

  // Sort chronologically descending
  timeline.sort((a, b) => b.date - a.date);

  // Counts for filter pills
  const countSales = timeline.filter(t => t.eventType === 'venta').length;
  const countInv = timeline.filter(t => t.eventType === 'compra_inventario').length;
  const countCash = timeline.filter(t => ['retiro_dueno', 'ingreso_capital'].includes(t.eventType)).length;
  const countAbonos = timeline.filter(t => t.eventType === 'abono_fiao').length;

  // Filter by category
  const filteredTimeline = timeline.filter(item => {
    if (historyFilter === 'sales' && item.eventType !== 'venta') return false;
    if (historyFilter === 'inventory' && item.eventType !== 'compra_inventario') return false;
    if (historyFilter === 'cash' && !['retiro_dueno', 'ingreso_capital'].includes(item.eventType)) return false;
    if (historyFilter === 'abonos' && item.eventType !== 'abono_fiao') return false;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const clientMatch = item.client && item.client.toLowerCase().includes(q);
      const descMatch = item.description && item.description.toLowerCase().includes(q);
      const titleMatch = item.title && item.title.toLowerCase().includes(q);
      const itemsMatch = item.items && item.items.some(it => it.product_name && it.product_name.toLowerCase().includes(q));
      if (!clientMatch && !descMatch && !titleMatch && !itemsMatch) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Historial</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Auditoría cronológica de ventas, compras de inventario, abonos y retiros/aportes</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => window.open(`${API_URL}/api/sales/report?days=${statsDays}`, '_blank')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileText size={18} />
            Descargar Reporte ({statsDays} Días)
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${historyFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setHistoryFilter('all')}
          >
            Todos ({timeline.length})
          </button>
          <button 
            className={`btn ${historyFilter === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setHistoryFilter('sales')}
          >
            Ventas ({countSales})
          </button>
          <button 
            className={`btn ${historyFilter === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setHistoryFilter('inventory')}
          >
            Entradas de Stock ({countInv})
          </button>
          <button 
            className={`btn ${historyFilter === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setHistoryFilter('cash')}
          >
            Retiros & Aportes ({countCash})
          </button>
          <button 
            className={`btn ${historyFilter === 'abonos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setHistoryFilter('abonos')}
          >
            Abonos ({countAbonos})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <input 
            type="text" 
            placeholder="Buscar en el historial..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
        </div>
      </div>

      {/* Unified Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Tipo & Referencia</th>
              <th>Fecha</th>
              <th>Detalle / Concepto</th>
              <th>Método / Estado</th>
              <th style={{ textAlign: 'right' }}>Monto ($ / Bs.)</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimeline.length > 0 ? (
              filteredTimeline.map(item => {
                const isVenta = item.eventType === 'venta';
                const isCompra = item.eventType === 'compra_inventario';
                const isRetiro = item.eventType === 'retiro_dueno';
                const isAporte = item.eventType === 'ingreso_capital';
                const isAbono = item.eventType === 'abono_fiao';

                return (
                  <tr key={item.id}>
                    {/* 1. Tipo & Ref */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isVenta && (
                          <span className="badge badge-success" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            VENTA #{item.rawId}
                          </span>
                        )}
                        {isCompra && (
                          <span className="badge badge-danger" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            ENTRADA STOCK
                          </span>
                        )}
                        {isRetiro && (
                          <span className="badge badge-warning" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            RETIRO DUEÑO
                          </span>
                        )}
                        {isAporte && (
                          <span className="badge badge-success" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            APORTE CAPITAL
                          </span>
                        )}
                        {isAbono && (
                          <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--brand-secondary)', fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            ABONO FIAO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Fecha */}
                    <td>
                      <div>{item.date.toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* 3. Detalle / Concepto */}
                    <td>
                      {isVenta && (
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.client}</div>
                          {item.isRegisteredCustomer && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Cliente Registrado</span>
                          )}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {item.items.map((it, idx) => (
                              <span key={idx}>• {it.product_name} x{it.quantity} </span>
                            ))}
                            {item.deliveryCost > 0 && <span style={{ color: 'var(--brand-secondary)' }}>• +Delivery</span>}
                          </div>
                        </div>
                      )}
                      {!isVenta && (
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.description}</div>
                          {isCompra && item.quantity && item.unitCost && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--brand-secondary)', marginTop: '2px' }}>
                              {item.quantity} unidades × ${item.unitCost.toFixed(2)} c/u
                            </div>
                          )}
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Nota: {item.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Método / Estado */}
                    <td>
                      {isVenta && (
                        <div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                              {item.paymentMethod}
                            </span>
                            {item.paymentStatus === 'fiao' && <span className="badge badge-danger">FIAO</span>}
                            {item.paymentStatus === 'parcial' && <span className="badge badge-warning">PARCIAL</span>}
                            {item.paymentStatus === 'pagado' && <span className="badge badge-success">PAGADO</span>}
                          </div>
                          {item.paymentReference && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Ref: {item.paymentReference}
                            </div>
                          )}
                          {item.hasCapture && (
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '3px 8px', fontSize: '0.7rem', marginTop: '4px' }} 
                              onClick={() => handleFetchCapture(item.rawId, item.captureBase64)}
                              disabled={loadingCaptureId === item.rawId}
                            >
                              {loadingCaptureId === item.rawId ? 'Cargando...' : 'Ver Capture'}
                            </button>
                          )}
                        </div>
                      )}
                      {isCompra && <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>SALIDA CAJA</span>}
                      {isRetiro && <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>RETIRO DUEÑO</span>}
                      {isAporte && <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>INGRESO CAJA</span>}
                      {isAbono && <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>INGRESO CAJA</span>}
                    </td>

                    {/* 5. Monto ($ / Bs.) */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: (isCompra || isRetiro) ? 'var(--status-danger)' : 'var(--status-success)' }}>
                        {(isCompra || isRetiro) ? '-' : '+'}${item.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Bs. {(item.amount * item.dollarRate).toFixed(2)}
                      </div>
                      {isVenta && item.amountPending > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                            Debe: ${item.amountPending.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 6. Acciones */}
                    <td style={{ textAlign: 'right' }}>
                      {isVenta && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <a 
                            href={`${API_URL}/api/sales/${item.rawId}/invoice`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <FileText size={14} /> Factura
                          </a>
                          {item.amountPending > 0 && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              onClick={() => onOpenPaymentModal(item.originalSale)}
                            >
                              + Abonar
                            </button>
                          )}
                        </div>
                      )}
                      {isAbono && item.referenceId && (
                        <a 
                          href={`${API_URL}/api/sales/${item.referenceId}/invoice`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          <FileText size={14} /> Factura
                        </a>
                      )}
                      {!isVenta && !isAbono && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No se encontraron transacciones en el historial.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
