import React, { useState } from 'react';
import { ArrowDownRight, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function WithdrawModal({ isOpen, onClose }) {
  const { config, cashBalance, fetchCash, fetchStats } = useApp();
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentCash = parseFloat(cashBalance.balance) || 0;
  const dollarRate = parseFloat(config.dollar_rate) || 45.00;

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (amountNum > currentCash) {
      alert(`No puedes retirar más de lo que hay en caja ($${currentCash.toFixed(2)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.withdrawCash({
        amount: amountNum,
        notes: withdrawForm.notes || 'Retiro de fondos por el dueño'
      });
      if (res.ok) {
        setWithdrawForm({ amount: '', notes: '' });
        onClose();
        fetchCash();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.detail || 'Error al procesar el retiro.');
      }
    } catch (err) {
      console.error('Error withdrawing cash:', err);
      alert('Error de conexión al procesar el retiro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const val = parseFloat(withdrawForm.amount) || 0;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)', padding: '8px', borderRadius: '8px' }}>
              <ArrowDownRight size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Retirar Fondos de Caja</h2>
          </div>
          <button className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Saldo Disponible */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo Disponible en Caja:</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: currentCash > 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
            ${currentCash.toFixed(2)}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>
              (Bs. {(currentCash * dollarRate).toFixed(2)})
            </span>
          </div>
        </div>

        <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Monto a Retirar ($ USD) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              max={Math.max(currentCash, 0)}
              className="form-input"
              placeholder="0.00"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
              required
              autoFocus
            />
          </div>

          {val > currentCash && currentCash > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="var(--status-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--status-danger)' }}>
                <strong>Fondos insuficientes:</strong> El monto a retirar supera los ${currentCash.toFixed(2)} disponibles en caja. No se permite dejar la caja en saldo negativo.
              </div>
            </div>
          )}

          {val > (currentCash * 0.5) && val <= currentCash && currentCash > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="var(--status-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--status-warning)' }}>
                <strong>⚠️ Alerta de Liquidez ({Math.round((val / currentCash) * 100)}% de la caja):</strong> Recuerda que los fondos del negocio tienen que mantenerse para reponer inventario y cubrir gastos operativos.
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Concepto o Motivo del Retiro</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Ej: Ganancia personal, gastos operativos, etc."
              value={withdrawForm.notes}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px' }}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '10px' }}
              disabled={isSubmitting || !withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0 || parseFloat(withdrawForm.amount) > currentCash || currentCash <= 0}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
