import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function CustomerModal({ isOpen, editingCustomer, onClose, onSaved }) {
  const { fetchCustomers, toast } = useApp();
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCustomer) {
      setCustomerForm({
        name: editingCustomer.name || '',
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        address: editingCustomer.address || '',
        notes: editingCustomer.notes || ''
      });
    } else {
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
    }
  }, [editingCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = editingCustomer
        ? await api.updateCustomer(editingCustomer.id, customerForm)
        : await api.createCustomer(customerForm);

      if (res.ok) {
        const savedCustomer = await res.json().catch(() => null);
        toast.success(editingCustomer ? 'Cliente actualizado con éxito' : 'Cliente registrado con éxito');
        fetchCustomers();
        if (onSaved) onSaved(savedCustomer);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al guardar los datos del cliente.');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      toast.error('Error de conexión al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="card modal-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2>{editingCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nombre Completo *</label>
          <input 
            type="text" 
            value={customerForm.name}
            onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
            required 
            placeholder="Ej. Carlos Rodríguez"
            className="form-input" 
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Teléfono / WhatsApp</label>
          <input 
            type="text" 
            value={customerForm.phone}
            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
            placeholder="Ej. +58 412 1234567"
            className="form-input" 
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Correo Electrónico</label>
          <input 
            type="email" 
            value={customerForm.email}
            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
            placeholder="carlos@email.com"
            className="form-input" 
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Dirección o Ubicación</label>
          <input 
            type="text" 
            value={customerForm.address}
            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
            placeholder="Ej. Urbanización El Paraíso, Caracas"
            className="form-input" 
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Notas Adicionales</label>
          <textarea 
            rows="2"
            value={customerForm.notes}
            onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
            placeholder="Cliente de confianza, compra ropa deportiva, etc."
            className="form-textarea" 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
