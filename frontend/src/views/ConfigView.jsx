import React, { useState, useEffect } from 'react';
import { Upload, Check, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, API_URL } from '../services/api';
import { compressImageFile } from '../utils/imageCompressor';
import { getImageUrl } from '../utils/imageUrl';

export default function ConfigView() {
  const { 
    config, 
    fetchConfig, 
    fetchProducts, 
    fetchSales, 
    fetchCashData, 
    fetchStats, 
    applyTheme,
    toast 
  } = useApp();

  const [configForm, setConfigForm] = useState({
    name: '',
    color_primary: '#6366f1',
    theme: 'dark',
    logo_base64: null,
    dollar_rate: 45.00
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setConfigForm({
        name: config.name || '',
        color_primary: config.color_primary || '#6366f1',
        theme: config.theme || 'dark',
        logo_base64: config.logo_base64 || null,
        dollar_rate: parseFloat(config.dollar_rate) || 45.00
      });
    }
  }, [config]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await compressImageFile(file);
      setConfigForm(prev => ({ ...prev, logo_base64: b64 }));
    } catch (err) {
      console.error('Error compressing logo:', err);
      toast.error('No se pudo procesar la imagen seleccionada.');
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const sanitizedConfig = {
      ...configForm,
      dollar_rate: parseFloat(configForm.dollar_rate) || 45.00
    };

    try {
      const res = await api.updateConfig(sanitizedConfig);
      if (res.ok) {
        const data = await res.json();
        applyTheme(data);
        await fetchConfig();
        toast.success('Configuración guardada con éxito.');
        fetchStats();
      } else {
        toast.error('Error al guardar configuración.');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Error de conexión al guardar configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDatabase = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('¿Estás seguro de que deseas restaurar esta base de datos? Esto reemplazará TODOS tus datos actuales.')) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.restoreDatabase(formData);
      if (res.ok) {
        toast.success('¡Base de datos restaurada con éxito! Recargando...');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const errData = await res.json();
        toast.error(`Error al restaurar: ${errData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error restoring database:', err);
      toast.error('Error de conexión al restaurar.');
    } finally {
      e.target.value = '';
    }
  };

  const handleResetStockAndHistory = async () => {
    const confirmation = prompt('⚠️ ATENCIÓN: Esta acción vaciará todo el historial de movimientos de caja y ventas, y pondrá el stock de TODOS tus productos en 0 para arrancar limpio con el nuevo sistema diario.\n\nTus productos, categorías, fotos, costos y precios se mantendrán intactos.\n\nPara confirmar, escribe REINICIAR (en mayúsculas):');
    if (confirmation !== 'REINICIAR') {
      if (confirmation !== null) toast.warning('Operación cancelada. El texto no coincidió.');
      return;
    }

    try {
      const res = await api.resetStockAndHistory();
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Historial reiniciado y stock establecido en 0 con éxito.');
        fetchProducts();
        fetchSales();
        fetchCashData();
        fetchStats();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Error: ${errData.detail || 'No se pudo reiniciar el historial'}`);
      }
    } catch (err) {
      console.error('Error resetting stock and history:', err);
      toast.error('Error de conexión al intentar reiniciar.');
    }
  };

  return (
    <div style={{ maxWidth: '650px', width: '100%' }}>
      <div className="view-header">
        <div>
          <h1 style={{ margin: 0 }}>Personalización de Marca</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Define el nombre, logo, tasa de cambio y temas de tu negocio
          </p>
        </div>
      </div>

      <form onSubmit={saveConfig} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label">Nombre del Negocio</label>
          <input 
            type="text" 
            value={configForm.name} 
            onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })} 
            className="form-input" 
            required 
          />
        </div>

        <div className="config-grid-3">
          <div className="form-group">
            <label className="form-label">Color de Marca</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="color" 
                value={configForm.color_primary} 
                onChange={(e) => setConfigForm({ ...configForm, color_primary: e.target.value })} 
                style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} 
              />
              <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{configForm.color_primary}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tema Visual</label>
            <select 
              value={configForm.theme} 
              onChange={(e) => setConfigForm({ ...configForm, theme: e.target.value })} 
              className="form-select"
            >
              <option value="dark">Modo Oscuro</option>
              <option value="light">Modo Claro</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tasa Dólar (Bs. / $)</label>
            <input 
              type="number" 
              step="0.01"
              value={configForm.dollar_rate}
              onChange={(e) => setConfigForm({ ...configForm, dollar_rate: e.target.value })}
              className="form-input" 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Logo del Negocio</label>
          <label className="image-upload-box">
            <Upload size={24} />
            <span style={{ fontSize: '0.9rem' }}>Haz clic para seleccionar o subir logo</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: 'none' }} 
            />
          </label>
          {configForm.logo_base64 && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <img 
                src={getImageUrl(configForm.logo_base64)} 
                alt="Preview Logo" 
                style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
              />
              <br />
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '8px' }} 
                onClick={() => setConfigForm({ ...configForm, logo_base64: null })}
              >
                Eliminar Logo
              </button>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="btn btn-primary" 
          style={{ marginTop: '10px', padding: '14px' }}
        >
          <Check size={18} />
          {isSaving ? 'Guardando...' : 'Guardar Cambios de Identidad'}
        </button>
      </form>

      {/* Database backup section */}
      <div className="card" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Base de Datos y Respaldo</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
            Descarga una copia completa de tu base de datos en formato SQLite o restaura una copia anterior.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href={`${API_URL}/api/backup`} 
            download="gestor_pocho_backup.db"
            className="btn btn-secondary" 
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', textDecoration: 'none' }}
          >
            <RefreshCw size={16} />
            Descargar Respaldo (.db)
          </a>

          <div>
            <input 
              type="file" 
              accept=".db" 
              onChange={handleRestoreDatabase}
              style={{ display: 'none' }} 
              id="db-restore-file"
            />
            <label 
              htmlFor="db-restore-file" 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 18px', cursor: 'pointer' }}
            >
              <Upload size={16} />
              Restaurar Respaldo (.db)
            </label>
          </div>
        </div>
      </div>

      {/* Maintenance: Reset Stock & History */}
      <div className="card" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.03)' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Zona de Mantenimiento: Reiniciar Historial y Stock
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0, lineHeight: 1.4 }}>
            Vacía todo el historial de movimientos de caja y ventas pasadas, y coloca el stock de todos tus productos en <strong>0 unidades</strong> para comenzar limpio con el nuevo sistema de entradas diarias. Tu catálogo (nombres, fotos, costos, precios, clientes y categorías) se mantendrá <strong>100% intacto</strong>.
          </p>
        </div>
        
        <div>
          <button 
            type="button"
            onClick={handleResetStockAndHistory}
            className="btn btn-secondary"
            style={{ 
              color: 'var(--status-danger)', 
              borderColor: 'rgba(239, 68, 68, 0.45)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            <Trash2 size={16} />
            Reiniciar Historial y poner Stock en 0
          </button>
        </div>
      </div>
    </div>
  );
}
