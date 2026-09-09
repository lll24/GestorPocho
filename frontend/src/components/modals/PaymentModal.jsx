import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function PaymentModal({ isOpen, sale, onClose, onSuccess }) {
  const { config, fetchSales, fetchCustomers, fetchStats, fetchCash } = useApp();
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'divisas',
    payment_reference: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sale) return null;

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const pendingAmount = parseFloat(sale.amount_pending) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmount = parseFloat(paymentForm.amount);
    if (!payAmount || payAmount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.addSalePayment(sale.id, {
        amount: payAmount,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference || null,
        notes: paymentForm.notes || null
      });

      if (res.ok) {
        alert('¡Abono registrado con éxito!');
        setPaymentForm({
          amount: '',
          payment_method: 'divisas',
          payment_reference: '',
          notes: ''
        });
        onClose();
        fetchSales();
        fetchCustomers();
        fetchStats();
        fetchCash();
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        alert(`Error al registrar abono: ${err.detail || 'Error'}`);
      }
    } catch (err) {
      console.error('Error posting payment:', err);
      alert('Error de conexión al registrar abono.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Registrar Abono a Venta #{sale.id}</h2>
          <button className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo pendiente actual:</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-danger)' }}>
            ${pendingAmount.toFixed(2)} 
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>
              (Bs. {(pendingAmount * dollarRate).toFixed(2)})
            </span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Monto del Abono ($ USD) *</label>
          <input 
            type="number" 
            step="0.01"
            max={pendingAmount}
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            required 
            className="form-input" 
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Método de Pago</label>
          <select 
            className="form-select"
            value={paymentForm.payment_method}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
          >
            <option value="divisas">Divisas (Efectivo)</option>
            <option value="pagomovil">Pago Móvil</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="binance">Binance (USDT)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Referencia Bancaria (Opcional)</label>
          <input 
            type="text" 
            placeholder="N° de confirmación / referencia"
            value={paymentForm.payment_reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
            className="form-input" 
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nota o Comentario</label>
          <input 
            type="text" 
            placeholder="Ej. Abono parte 1 en efectivo"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            className="form-input" 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Confirmar Abono'}
          </button>
        </div>
      </form>
    </div>
  );
}
