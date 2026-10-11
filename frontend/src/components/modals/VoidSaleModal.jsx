import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Package, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function VoidSaleModal({ isOpen, sale, onClose, onSuccess }) {
  const { config, fetchSales, fetchProducts, fetchCash, fetchCustomers, fetchStats, toast } = useApp();
  const [reason, setReason] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sale) return null;

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const amountPaid = parseFloat(sale.amount_paid) || 0;
  const totalRevenue = parseFloat(sale.total_revenue) || 0;
  const items = sale.items || [];
  const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.voidSale(sale.id, {
        reason: reason.trim() || 'Anulación / Devolución de venta',
        restore_stock: restoreStock
      });

      if (res.ok) {
        toast.success(`Venta #${sale.id} anulada con éxito`);
        fetchSales();
        fetchProducts();
        fetchCash();
        fetchCustomers();
        fetchStats();
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al anular la venta');
      }
    } catch (err) {
      console.error('Error voiding sale:', err);
      toast.error('Error de conexión al anular la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="card modal-card" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="var(--status-danger)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--status-danger)' }}>
                Anular Venta #{sale.id}
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Cliente: <strong>{sale.client_name || 'Consumidor Final'}</strong> • Total: <strong>${totalRevenue.toFixed(2)}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Impacto en Caja */}
        {amountPaid > 0 ? (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-danger)', marginBottom: '4px' }}>
              💵 Reintegro / Salida de Caja:
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--status-danger)' }}>
              -${amountPaid.toFixed(2)} USD
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                (Bs. {(amountPaid * dollarRate).toFixed(2)})
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Se registrará un egreso de caja por devolución para cuadrar el balance efectivo.
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ℹ️ Venta a crédito sin abonos previos: No habrá movimientos de dinero en caja y la deuda pendiente quedará cancelada.
            </div>
          </div>
        )}

        {/* Restitución de Stock */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Package size={16} color="var(--brand-primary)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Artículos a reintegrar ({totalUnits} unidades)</span>
          </div>

          <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', marginBottom: '10px' }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>• {it.product_name || `Producto #${it.product_id}`}</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-secondary)' }}>+{it.quantity} unid.</span>
              </div>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <input 
              type="checkbox" 
              checked={restoreStock} 
              onChange={(e) => setRestoreStock(e.target.checked)} 
            />
            <span>Reintegrar unidades al stock disponible</span>
          </label>
        </div>

        {/* Motivo */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Motivo o Justificación de la Anulación *</label>
          <input 
            type="text" 
            placeholder="Ej. Devolución por talla, error de digitación, defecto..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="form-input" 
            required
            autoFocus
          />
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Volver
          </button>
          <button 
            type="submit" 
            className="btn btn-danger" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            disabled={isSubmitting}
          >
            <RotateCcw size={16} />
            {isSubmitting ? 'Anulando...' : 'Confirmar Anulación'}
          </button>
        </div>

      </form>
    </div>
  );
}
