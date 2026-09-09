import React, { useState } from 'react';
import {
  Users,
  Plus,
  Clock,
  CheckCircle2,
  Search,
  Edit3,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function CustomersView({
  onOpenAddCustomer,
  onOpenEditCustomer,
  onViewCustomerDetail,
  debtFilter = 'all'
}) {
  const { config, customers, stats, fetchCustomers } = useApp();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDebtFilter, setCustomerDebtFilter] = useState(debtFilter);

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const kpiReceivables = parseFloat(stats.kpis?.total_receivables) || 0;

  const deleteCustomer = async (customerId) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      const res = await api.deleteCustomer(customerId);
      if (res.ok) {
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.phone && c.phone.includes(customerSearch));
    if (customerDebtFilter === 'debt') {
      return matchesSearch && c.total_debt > 0;
    }
    if (customerDebtFilter === 'clean') {
      return matchesSearch && c.total_debt <= 0;
    }
    return matchesSearch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Gestión de Clientes & Fiao</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Directorio de clientes, historial de compras y cuentas por cobrar</p>
        </div>
        <button className="btn btn-primary" onClick={onOpenAddCustomer}>
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Quick Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px' }}>Total Clientes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{customers.length}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: stats.kpis?.total_receivables > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '12px', borderRadius: '12px' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-danger)' }}>Deuda Total en la Calle</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-danger)' }}>
              ${kpiReceivables.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Bs. {(kpiReceivables * dollarRate).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: '2px' }}>Clientes con Deuda</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {customers.filter(c => c.total_debt > 0).length} de {customers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar cliente por nombre o teléfono..." 
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '44px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${customerDebtFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setCustomerDebtFilter('all')}
          >
            Todos ({customers.length})
          </button>
          <button 
            className={`btn ${customerDebtFilter === 'debt' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setCustomerDebtFilter('debt')}
          >
            Con Deuda ({customers.filter(c => c.total_debt > 0).length})
          </button>
          <button 
            className={`btn ${customerDebtFilter === 'clean' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setCustomerDebtFilter('clean')}
          >
            Al Día ({customers.filter(c => c.total_debt <= 0).length})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Compras</th>
              <th>Total Comprado</th>
              <th>Saldo Deudor (Fiao)</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
                    {c.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.notes}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{c.phone || 'Sin teléfono'}</div>
                    {c.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>}
                  </td>
                  <td>
                    <span className="badge badge-success">{c.sales_count} ventas</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ${c.total_spent.toFixed(2)}
                  </td>
                  <td>
                    {c.total_debt > 0 ? (
                      <div>
                        <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>
                          Debe: ${(parseFloat(c.total_debt) || 0).toFixed(2)}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Bs. {((parseFloat(c.total_debt) || 0) * dollarRate).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="badge badge-success">Al Día</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => onViewCustomerDetail(c)}
                      >
                        Ver Historial / Cobrar
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px' }}
                        onClick={() => onOpenEditCustomer(c)}
                        aria-label="Editar cliente"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px' }}
                        onClick={() => deleteCustomer(c.id)}
                        aria-label="Eliminar cliente"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No se encontraron clientes con el filtro actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
