import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function CategoryModal({ isOpen, onClose }) {
  const { categories, fetchCategories, toast } = useApp();
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', is_for_sale: true });
  const [newSubcategoryForm, setNewSubcategoryForm] = useState({ category_id: '', name: '' });
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  if (!isOpen) return null;

  const saveNewCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) return;

    setIsSubmittingCat(true);
    try {
      const res = await api.createCategory(newCategoryForm);
      if (res.ok) {
        toast.success('Categoría creada con éxito');
        setNewCategoryForm({ name: '', is_for_sale: true });
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al crear la categoría.');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Error de conexión al crear categoría.');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const saveNewSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubcategoryForm.name.trim() || !newSubcategoryForm.category_id) return;

    setIsSubmittingSub(true);
    try {
      const res = await api.createSubcategory(newSubcategoryForm.category_id, { name: newSubcategoryForm.name });
      if (res.ok) {
        toast.success('Subcategoría creada con éxito');
        setNewSubcategoryForm({ ...newSubcategoryForm, name: '' });
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al crear la subcategoría.');
      }
    } catch (err) {
      console.error('Error saving subcategory:', err);
      toast.error('Error de conexión al crear subcategoría.');
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const deleteCategory = async (catId) => {
    if (!confirm('¿Eliminar esta categoría y sus subcategorías?')) return;
    try {
      const res = await api.deleteCategory(catId);
      if (res.ok) {
        toast.success('Categoría eliminada');
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al eliminar categoría');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Error de conexión al eliminar categoría');
    }
  };

  const deleteSubcategory = async (subId) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return;
    try {
      const res = await api.deleteSubcategory(subId);
      if (res.ok) {
        toast.success('Subcategoría eliminada');
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Error al eliminar subcategoría');
      }
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      toast.error('Error de conexión al eliminar subcategoría');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="card modal-card" style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} />
            Categorías y Subcategorías
          </h2>
          <button className="mobile-toggle-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Crear Nueva Categoría */}
        <form onSubmit={saveNewCategory} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-label">Crear Nueva Categoría Base</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Ej. Ropa, Calzado, Joyería..." 
              value={newCategoryForm.name} 
              onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
              className="form-input" 
              style={{ flex: 1, minWidth: '180px' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={newCategoryForm.is_for_sale} 
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, is_for_sale: e.target.checked })}
              />
              <span>Es para vender en POS</span>
            </label>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem' }} disabled={isSubmittingCat}>
              + Crear Categoría
            </button>
          </div>
        </form>

        {/* Agregar Subcategoría a Categoría Existente */}
        <form onSubmit={saveNewSubcategory} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-label">Añadir Subcategoría</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select 
              className="form-select"
              value={newSubcategoryForm.category_id}
              onChange={(e) => setNewSubcategoryForm({ ...newSubcategoryForm, category_id: e.target.value })}
              style={{ width: '200px' }}
              required
            >
              <option value="">Elegir Categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input 
              type="text" 
              placeholder="Ej. Camisas, Pantalones, Gorras..." 
              value={newSubcategoryForm.name} 
              onChange={(e) => setNewSubcategoryForm({ ...newSubcategoryForm, name: e.target.value })}
              className="form-input" 
              style={{ flex: 1, minWidth: '160px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem' }} disabled={isSubmittingSub}>
              + Añadir Subcategoría
            </button>
          </div>
        </form>

        {/* Listado de Categorías y Subcategorías */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-label">Categorías y Subcategorías Actuales</div>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{cat.name}</span>
                  {cat.is_for_sale ? (
                    <span className="badge badge-success">A la Venta</span>
                  ) : (
                    <span className="badge badge-warning">Gestión / Insumos</span>
                  )}
                </div>
                <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => deleteCategory(cat.id)}>
                  Eliminar Categoría
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subcategorías:</span>
                {cat.subcategories.length > 0 ? (
                  cat.subcategories.map(sub => (
                    <span key={sub.id} className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                      {sub.name}
                      <button 
                        type="button" 
                        onClick={() => deleteSubcategory(sub.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin subcategorías</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
