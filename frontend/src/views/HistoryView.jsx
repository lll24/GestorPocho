import React, { useState, useEffect } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, API_URL } from '../services/api';

export default function HistoryView({ onOpenPaymentModal, onOpenVoidModal, onViewCapture }) {
  const { config, sales, cashMovements, statsDays, toast } = useApp();

  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'sales', 'inventory', 'cash', 'abonos'
  const [historySearch, setHistorySearch] = useState('');
  const [loadingCaptureId, setLoadingCaptureId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;

  useEffect(() => {
    setCurrentPage(1);
  }, [historyFilter, historySearch]);

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
        toast.error('No se pudo cargar la imagen del comprobante.');
      }
    } catch (err) {
      console.error('Error fetching capture:', err);
      toast.error('Error de conexión al cargar la captura.');
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
      cancelReason: s.cancel_reason,
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
             m.type === 'abono_fiao' ? 'Abono a Fiao' :
             m.type === 'devolucion_venta' ? 'Devolución de Venta' : 'Movimiento de Caja',
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
  const countCash = timeline.filter(t => ['retiro_dueno', 'ingreso_capital', 'devolucion_venta'].includes(t.eventType)).length;
  const countAbonos = timeline.filter(t => t.eventType === 'abono_fiao').length;

  // Filter by category
  const filteredTimeline = timeline.filter(item => {
    if (historyFilter === 'sales' && item.eventType !== 'venta') return false;
    if (historyFilter === 'inventory' && item.eventType !== 'compra_inventario') return false;
    if (historyFilter === 'cash' && !['retiro_dueno', 'ingreso_capital', 'devolucion_venta'].includes(item.eventType)) return false;
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

  // Pagination calculation
  const totalItems = filteredTimeline.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedItems = filteredTimeline.slice(startIndex, endIndex);

  return (
    <div>
      <div className="view-header">
        <div className="view-header-title">
          <h1>Historial</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Auditoría cronológica de ventas, compras de inventario, abonos y retiros/aportes</p>
        </div>
        <div className="view-header-actions">
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
      <div className="search-toolbar">
        <div className="filter-tabs-scroll">
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

        <div className="search-input-wrapper" style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
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
            {paginatedItems.length > 0 ? (
              paginatedItems.map(item => {
                const isVenta = item.eventType === 'venta';
                const isCompra = item.eventType === 'compra_inventario';
                const isRetiro = item.eventType === 'retiro_dueno';
                const isAporte = item.eventType === 'ingreso_capital';
                const isAbono = item.eventType === 'abono_fiao';
                const isDevolucion = item.eventType === 'devolucion_venta';
                const isAnulada = isVenta && item.paymentStatus === 'anulado';

                return (
                  <tr key={item.id} style={{ opacity: isAnulada ? 0.75 : 1 }}>
                    {/* 1. Tipo & Ref */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isVenta && isAnulada && (
                          <span className="badge badge-danger" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            VENTA #{item.rawId} (ANULADA)
                          </span>
                        )}
                        {isVenta && !isAnulada && (
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
                        {isDevolucion && (
                          <span className="badge badge-danger" style={{ fontWeight: 800, padding: '4px 8px', fontSize: '0.78rem' }}>
                            DEVOLUCIÓN
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
                          {isAnulada && item.cancelReason && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--status-danger)', marginTop: '4px', fontWeight: 600 }}>
                              ⚠️ Motivo: {item.cancelReason}
                            </div>
                          )}
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
                            {item.paymentStatus === 'anulado' && <span className="badge badge-danger" style={{ background: '#7f1d1d', color: '#fca5a5' }}>ANULADA</span>}
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
                      {isDevolucion && <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>SALIDA CAJA (DEVOLUCIÓN)</span>}
                    </td>

                    {/* 5. Monto ($ / Bs.) */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 800, 
                        fontSize: '0.95rem', 
                        color: (isCompra || isRetiro || isDevolucion) ? 'var(--status-danger)' : (isAnulada ? 'var(--text-muted)' : 'var(--status-success)'),
                        textDecoration: isAnulada ? 'line-through' : 'none'
                      }}>
                        {(isCompra || isRetiro || isDevolucion) ? '-' : '+'}${item.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Bs. {(item.amount * item.dollarRate).toFixed(2)}
                      </div>
                      {isVenta && !isAnulada && item.amountPending > 0 && (
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
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <a 
                            href={`${API_URL}/api/sales/${item.rawId}/invoice`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <FileText size={14} /> Factura
                          </a>
                          {!isAnulada && (
                            <>
                              {item.amountPending > 0 && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                  onClick={() => onOpenPaymentModal(item.originalSale)}
                                >
                                  + Abonar
                                </button>
                              )}
                              {onOpenVoidModal && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--status-danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                  onClick={() => onOpenVoidModal(item.originalSale)}
                                  title="Anular venta y reincorporar stock"
                                >
                                  Anular
                                </button>
                              )}
                            </>
                          )}
                          {isAnulada && (
                            <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                              Anulada
                            </span>
                          )}
                        </div>
                      )}
                      {(isAbono || isDevolucion) && item.referenceId && (
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
                      {!isVenta && !isAbono && !isDevolucion && (
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

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '12px 18px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Mostrando <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> de <strong>{totalItems}</strong> movimientos
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Filas por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-select"
                style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto', background: 'rgba(0,0,0,0.3)' }}
              >
                {[10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={16} /> Anterior
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px', color: 'var(--brand-primary)' }}>
                {activePage} / {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
