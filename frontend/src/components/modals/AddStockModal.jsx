import React, { useState, useEffect } from 'react';
import { PlusCircle, Package, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';

export default function AddStockModal({ isOpen, product, onClose }) {
  const { config, fetchProducts, fetchCash, fetchStats, toast } = useApp();
  const [addStockForm, setAddStockForm] = useState({
    new_total_stock: '',
    unit_cost: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      const baseCost = parseFloat(product.cost_base) || 0;
      const iva = parseFloat(product.cost_iva) || 0;
      const shipping = parseFloat(product.cost_shipping) || 0;
      const unitCost = baseCost * (1 + iva / 100) + shipping;
      setAddStockForm({
        new_total_stock: product.stock,
        unit_cost: Number(unitCost.toFixed(2)),
        notes: ''
      });
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newTotal = parseInt(addStockForm.new_total_stock);
    if (isNaN(newTotal) || newTotal < 0) {
      toast.warning('El stock total no puede ser un número negativo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const unitCostParsed = parseFloat(String(addStockForm.unit_cost).replace(',', '.')) || 0;
      const res = await api.addProductStock(product.id, {
        new_total_stock: newTotal,
        unit_cost: unitCostParsed,
        notes: addStockForm.notes ? addStockForm.notes.trim() : null
      });

      if (res.ok) {
        toast.success('Stock actualizado correctamente');
        onClose();
        fetchProducts();
        fetchCash();
        fetchStats();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || 'Error al actualizar el stock');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      toast.error('Error de conexión al actualizar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStock = product.stock || 0;
  const newTotal = parseInt(addStockForm.new_total_stock) || 0;
  const diff = newTotal - currentStock;
  const unitC = parseFloat(String(addStockForm.unit_cost).replace(',', '.')) || 0;
  const totalAmount = Math.abs(diff) * unitC;

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="card modal-card" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <PlusCircle size={22} color="var(--brand-primary)" />
              Gestionar Stock
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Indica el total físico de unidades que tienes actualmente
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary" 
            style={{ padding: '6px' }}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Brief */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          {product.image_base64 ? (
            <img src={getImageUrl(product.image_base64)} alt={product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="var(--text-muted)" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.78rem' }}>
              <span className="badge badge-secondary">{product.category_name || 'Ropa'}</span>
              <span className="badge badge-warning" style={{ fontWeight: 800 }}>Stock actual: {product.stock} unid.</span>
            </div>
          </div>
        </div>

        {/* Nuevo Stock Total Input con botones rápidos */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Nuevo Stock Total en Tienda</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setAddStockForm(prev => ({ ...prev, new_total_stock: Math.max(0, (parseInt(prev.new_total_stock) || 0) - 1) }))}
              >
                -1
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setAddStockForm(prev => ({ ...prev, new_total_stock: (parseInt(prev.new_total_stock) || 0) + 1 }))}
              >
                +1
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setAddStockForm(prev => ({ ...prev, new_total_stock: (parseInt(prev.new_total_stock) || 0) + 5 }))}
              >
                +5
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setAddStockForm(prev => ({ ...prev, new_total_stock: (parseInt(prev.new_total_stock) || 0) + 10 }))}
              >
                +10
              </button>
            </div>
          </div>
          <input 
            type="number" 
            min="0" 
            step="1"
            value={addStockForm.new_total_stock}
            onChange={(e) => setAddStockForm({ ...addStockForm, new_total_stock: e.target.value })}
            required
            className="form-input" 
            style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', height: '48px' }}
            autoFocus
          />
        </div>

        {/* Costo Unitario */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Costo Unitario de Referencia ($)</label>
          <input 
            type="number" 
            step="0.01"
            min="0"
            value={addStockForm.unit_cost}
            onChange={(e) => setAddStockForm({ ...addStockForm, unit_cost: e.target.value })}
            required
            className="form-input" 
            style={{ fontSize: '1rem', fontWeight: 600 }}
          />
        </div>

        {/* Diferencia & Impacto en Caja */}
        {diff > 0 ? (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--status-danger)' }}>
                🟢 Entrada: +{diff} unidades nuevas
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--status-danger)' }}>
                -${totalAmount.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Salida de Caja (Tasa {dollarRate.toFixed(2)}):</span>
              <span>Bs. {(totalAmount * dollarRate).toFixed(2)}</span>
            </div>
          </div>
        ) : diff < 0 ? (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--status-warning)' }}>
                🟡 Reducción: -{Math.abs(diff)} unidades (Corrección)
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--status-warning)' }}>
                +${totalAmount.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Ajuste en Caja (Tasa {dollarRate.toFixed(2)}):</span>
              <span>Bs. {(totalAmount * dollarRate).toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            ⚪ El stock se mantendrá igual en <strong>{currentStock} unidades</strong> (sin movimientos en caja).
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nota o Referencia (Opcional)</label>
          <input 
            type="text" 
            value={addStockForm.notes}
            onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
            placeholder="Ej. Factura #402 / Pedido de la tarde"
            className="form-input" 
          />
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          ℹ️ <strong>Consolidación del día:</strong> Los ajustes y entradas de stock realizados el mismo día se consolidan automáticamente en una sola fila en el Historial para evitar registros duplicados.
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : `Confirmar Stock (${addStockForm.new_total_stock || 0} unid.)`}
          </button>
        </div>
      </form>
    </div>
  );
}
