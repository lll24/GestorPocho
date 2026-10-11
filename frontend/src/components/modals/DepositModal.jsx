import React, { useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function DepositModal({ isOpen, onClose }) {
  const { fetchCash, fetchStats, toast } = useApp();
  const [depositForm, setDepositForm] = useState({ amount: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(depositForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warning('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.depositCash({
        amount: amountNum,
        notes: depositForm.notes || 'Aporte de capital / Fondo de caja'
      });
      if (res.ok) {
        toast.success('Aporte de capital registrado exitosamente.');
        setDepositForm({ amount: '', notes: '' });
        onClose();
        fetchCash();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Error al procesar el aporte.');
      }
    } catch (err) {
      console.error('Error depositing cash:', err);
      toast.error('Error de conexión al procesar el aporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="card modal-card" style={{ maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)', padding: '8px', borderRadius: '8px' }}>
              <ArrowUpRight size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Aportar Capital a Caja</h2>
          </div>
          <button className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Ingresa dinero propio a la caja para cubrir compras iniciales de inventario o aumentar la liquidez del negocio.
        </p>

        <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Monto a Ingresar ($ USD) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="0.00"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Concepto o Motivo del Aporte</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="Ej: Fondo inicial de apertura, inyección de capital"
              value={depositForm.notes}
              onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
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
              disabled={isSubmitting || !depositForm.amount || parseFloat(depositForm.amount) <= 0}
            >
              {isSubmitting ? 'Procesando...' : 'Registrar Aporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
