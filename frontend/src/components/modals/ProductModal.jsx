import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { handleImageChange } from '../../utils/imageCompressor';
import { getImageUrl } from '../../utils/imageUrl';

export default function ProductModal({ isOpen, editingProduct, onClose }) {
  const { categories, fetchProducts, fetchStats, fetchCash, toast } = useApp();

  const [productForm, setProductForm] = useState({
    name: '',
    category_id: null,
    subcategory_id: null,
    category_name: 'Ropa',
    subcategory_name: 'Camisas',
    is_for_sale: true,
    cost_base: '',
    cost_iva: 0,
    cost_shipping: '',
    sale_price: '',
    sale_extra: 0,
    stock: 0,
    image_base64: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatInputNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return Number(num.toFixed(2)).toString();
  };

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        name: editingProduct.name,
        category_id: editingProduct.category_id || null,
        subcategory_id: editingProduct.subcategory_id || null,
        category_name: editingProduct.category_name || 'Ropa',
        subcategory_name: editingProduct.subcategory_name || 'Camisas',
        is_for_sale: editingProduct.is_for_sale !== false,
        cost_base: formatInputNumber(editingProduct.cost_base),
        cost_iva: formatInputNumber(editingProduct.cost_iva),
        cost_shipping: formatInputNumber(editingProduct.cost_shipping),
        sale_price: formatInputNumber(editingProduct.sale_price),
        sale_extra: formatInputNumber(editingProduct.sale_extra),
        stock: editingProduct.stock || 0,
        image_base64: editingProduct.image_base64
      });
    } else {
      const defaultCat = categories[0] || { id: null, name: 'Ropa', is_for_sale: true, subcategories: [] };
      setProductForm({
        name: '',
        category_id: defaultCat.id,
        subcategory_id: defaultCat.subcategories?.[0]?.id || null,
        category_name: defaultCat.name,
        subcategory_name: defaultCat.subcategories?.[0]?.name || '',
        is_for_sale: defaultCat.is_for_sale,
        cost_base: '',
        cost_iva: 0,
        cost_shipping: '',
        sale_price: '',
        sale_extra: 0,
        stock: 0,
        image_base64: null
      });
    }
  }, [editingProduct, isOpen, categories]);

  if (!isOpen) return null;

  const handleCostChange = (field, value) => {
    const updatedForm = { ...productForm, [field]: value };
    const costBase = parseFloat(updatedForm.cost_base) || 0;
    const costIva = parseFloat(updatedForm.cost_iva) || 0;
    const costShipping = parseFloat(updatedForm.cost_shipping) || 0;
    const currentMargin = parseFloat(productForm.sale_price) 
      ? ((parseFloat(productForm.sale_price) / (costBase * (1 + costIva / 100) + costShipping)) - 1) * 100 
      : 30;
    
    const totalCost = costBase * (1 + costIva / 100) + costShipping;
    const safeMargin = Math.max(currentMargin, 0);
    const suggestedPrice = totalCost * (1 + safeMargin / 100);
    
    setProductForm({
      ...updatedForm,
      sale_price: suggestedPrice.toFixed(2)
    });
  };

  const handleMarginPercentChange = (percent) => {
    const costBase = parseFloat(productForm.cost_base) || 0;
    const costIva = parseFloat(productForm.cost_iva) || 0;
    const costShipping = parseFloat(productForm.cost_shipping) || 0;
    
    const totalCost = costBase * (1 + costIva / 100) + costShipping;
    const newPrice = totalCost * (1 + (parseFloat(percent) || 0) / 100);
    
    setProductForm({
      ...productForm,
      sale_price: newPrice.toFixed(2)
    });
  };

  const handleCategorySelect = (categoryId) => {
    const cat = categories.find(c => c.id === parseInt(categoryId));
    if (cat) {
      setProductForm({
        ...productForm,
        category_id: cat.id,
        category_name: cat.name,
        is_for_sale: cat.is_for_sale,
        subcategory_id: cat.subcategories?.[0]?.id || null,
        subcategory_name: cat.subcategories?.[0]?.name || ''
      });
    }
  };

  const handleSubcategorySelect = (subcategoryId) => {
    const cat = categories.find(c => c.id === productForm.category_id);
    const sub = cat?.subcategories.find(s => s.id === parseInt(subcategoryId));
    if (sub) {
      setProductForm({
        ...productForm,
        subcategory_id: sub.id,
        subcategory_name: sub.name
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: productForm.name,
      category_id: productForm.category_id,
      subcategory_id: productForm.subcategory_id,
      category_name: productForm.category_name,
      subcategory_name: productForm.subcategory_name,
      is_for_sale: productForm.is_for_sale,
      cost_base: parseFloat(productForm.cost_base) || 0,
      cost_iva: parseFloat(productForm.cost_iva) || 0,
      cost_shipping: parseFloat(productForm.cost_shipping) || 0,
      sale_price: parseFloat(productForm.sale_price) || 0,
      sale_extra: parseFloat(productForm.sale_extra) || 0,
      stock: parseInt(productForm.stock) || 0,
      image_base64: productForm.image_base64
    };

    setIsSubmitting(true);
    try {
      const res = editingProduct
        ? await api.updateProduct(editingProduct.id, payload)
        : await api.createProduct(payload);

      if (res.ok) {
        toast.success(editingProduct ? 'Producto actualizado con éxito.' : 'Producto creado con éxito.');
        onClose();
        fetchProducts();
        fetchStats();
        fetchCash();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || 'Error al guardar el producto.');
      }
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Error de conexión al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const costBaseNum = parseFloat(productForm.cost_base) || 0;
  const costIvaNum = parseFloat(productForm.cost_iva) || 0;
  const costShippingNum = parseFloat(productForm.cost_shipping) || 0;
  const salePriceNum = parseFloat(productForm.sale_price) || 0;

  const modalTotalCost = costBaseNum * (1 + costIvaNum / 100) + costShippingNum;
  const modalProfitPercent = modalTotalCost > 0 ? ((salePriceNum / modalTotalCost) - 1) * 100 : 30;

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="card modal-card" style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2>{editingProduct ? 'Editar Producto' : 'Agregar Producto al Inventario'}</h2>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nombre del Producto / Insumo</label>
          <input 
            type="text" 
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required 
            placeholder="Ej. Camisa Oversize Negra / Bolsas Plásticas 100u"
            className="form-input" 
            autoFocus
          />
        </div>

        {/* Categoría y Subcategoría */}
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoría</label>
            <select 
              className="form-select"
              value={productForm.category_id || ''}
              onChange={(e) => handleCategorySelect(e.target.value)}
              required
            >
              <option value="">Selecciona Categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {!c.is_for_sale ? '(Insumo / Gestión)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Subcategoría</label>
            <select 
              className="form-select"
              value={productForm.subcategory_id || ''}
              onChange={(e) => handleSubcategorySelect(e.target.value)}
            >
              <option value="">Sin subcategoría</option>
              {categories.find(c => c.id === productForm.category_id)?.subcategories.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner si es artículo de Gestión */}
        {productForm.is_for_sale === false && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--status-warning)' }}>
            ℹ️ <strong>Artículo de Gestión:</strong> Es un insumo interno (bolsas, marketing, oficina). No aparecerá a la venta en el POS pero sumará al costo e inversión global del negocio.
          </div>
        )}

        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Costo Base ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={productForm.cost_base}
              onChange={(e) => handleCostChange('cost_base', e.target.value)}
              required 
              className="form-input" 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">IVA (%)</label>
            <input 
              type="number" 
              step="0.1"
              value={productForm.cost_iva}
              onChange={(e) => handleCostChange('cost_iva', e.target.value)}
              placeholder="16"
              className="form-input" 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Flete / Envío ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={productForm.cost_shipping}
              onChange={(e) => handleCostChange('cost_shipping', e.target.value)}
              className="form-input" 
            />
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Costo Unitario Real:</span>
          <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>${modalTotalCost.toFixed(2)}</span>
        </div>

        {productForm.is_for_sale !== false && (
          <div className="form-grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Margen Ganancia (%)</label>
              <input 
                type="number" 
                step="1"
                value={Math.round(modalProfitPercent)}
                onChange={(e) => handleMarginPercentChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="form-input" 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Precio Venta ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={productForm.sale_price}
                onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                required 
                className="form-input" 
              />
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Stock en Inventario</label>
          <input 
            type="number" 
            min="0" 
            value={productForm.stock}
            onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
            required
            className="form-input" 
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            💡 Puedes ajustar el total de stock aquí o con el botón <strong>"+ Stock"</strong> en la tarjeta.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Imagen del Producto (Opcional)</label>
          <label className="image-upload-box" style={{ padding: '12px' }}>
            <Upload size={20} />
            <span style={{ fontSize: '0.85rem' }}>Subir foto del producto</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageChange(e, (b64) => setProductForm({ ...productForm, image_base64: b64 }))} 
              style={{ display: 'none' }} 
            />
          </label>
          {productForm.image_base64 && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <img src={getImageUrl(productForm.image_base64)} alt="Preview" style={{ maxHeight: '80px', borderRadius: '6px' }} />
              <br />
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }} onClick={() => setProductForm({ ...productForm, image_base64: null })}>Quitar</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
