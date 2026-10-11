import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Tag,
  Search,
  RefreshCw,
  PlusCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { getImageUrl } from '../utils/imageUrl';

export default function InventoryView({
  onOpenAddProduct,
  onOpenEditProduct,
  onOpenAddStock,
  onOpenCategoryModal
}) {
  const { products, categories, fetchProducts, fetchStats, fetchCash } = useApp();

  const [productSearch, setProductSearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventorySubcategoryFilter, setInventorySubcategoryFilter] = useState('all');

  const deleteProduct = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const res = await api.deleteProduct(id);
      if (res.ok) {
        fetchProducts();
        fetchStats();
        fetchCash();
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat = inventoryCategoryFilter === 'all' || p.category_name === inventoryCategoryFilter;
    const matchesSubcat = inventorySubcategoryFilter === 'all' || p.subcategory_name === inventorySubcategoryFilter;
    return matchesSearch && matchesCat && matchesSubcat;
  });

  return (
    <div>
      <div className="view-header">
        <div className="view-header-title">
          <h1>Gestión de Inventario</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control de mercancía a la venta e insumos de gestión operativa</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-secondary" onClick={onOpenCategoryModal}>
            <Layers size={18} />
            Categorías
          </button>
          <button className="btn btn-primary" onClick={onOpenAddProduct}>
            <Plus size={18} />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="filter-tabs-scroll">
        <button 
          className={`btn ${inventoryCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          onClick={() => {
            setInventoryCategoryFilter('all');
            setInventorySubcategoryFilter('all');
          }}
        >
          Todas las Categorías
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            className={`btn ${inventoryCategoryFilter === cat.name ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              setInventoryCategoryFilter(cat.name);
              setInventorySubcategoryFilter('all');
            }}
          >
            <Tag size={14} />
            {cat.name}
            {!cat.is_for_sale && (
              <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>Insumo</span>
            )}
          </button>
        ))}
      </div>

      {/* Subcategory Filter Pills */}
      {inventoryCategoryFilter !== 'all' && (() => {
        const activeCat = categories.find(c => c.name === inventoryCategoryFilter);
        if (activeCat && activeCat.subcategories.length > 0) {
          return (
            <div className="filter-tabs-scroll" style={{ alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px', whiteSpace: 'nowrap' }}>Subcategoría:</span>
              <button 
                className={`badge ${inventorySubcategoryFilter === 'all' ? 'badge-success' : 'badge-warning'}`}
                style={{ padding: '6px 12px', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
                onClick={() => setInventorySubcategoryFilter('all')}
              >
                Todas
              </button>
              {activeCat.subcategories.map(sub => (
                <button 
                  key={sub.id}
                  className={`badge ${inventorySubcategoryFilter === sub.name ? 'badge-success' : 'badge-warning'}`}
                  style={{ padding: '6px 12px', cursor: 'pointer', border: 'none', opacity: inventorySubcategoryFilter === sub.name ? 1 : 0.6, whiteSpace: 'nowrap' }}
                  onClick={() => setInventorySubcategoryFilter(sub.name)}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          );
        }
        return null;
      })()}

      {/* Search Bar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar productos por nombre..." 
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '44px' }}
          />
        </div>
        <button className="btn btn-secondary" onClick={fetchProducts} title="Actualizar" style={{ padding: '10px 14px' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Inventory Grid */}
      {filteredProducts.length > 0 ? (
        <div className="inventory-grid">
          {filteredProducts.map(product => {
            const costBase = parseFloat(product.cost_base) || 0;
            const costIva = parseFloat(product.cost_iva) || 0;
            const costShipping = parseFloat(product.cost_shipping) || 0;
            const salePriceRaw = parseFloat(product.sale_price) || 0;
            const saleExtraRaw = parseFloat(product.sale_extra) || 0;

            const unitCost = costBase * (1 + costIva / 100) + costShipping;
            const salePrice = salePriceRaw + saleExtraRaw;
            const profitMargin = salePrice - unitCost;
            const isManagement = product.is_for_sale === false;
            
            return (
              <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: isManagement ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
                {product.image_base64 ? (
                  <img 
                    src={getImageUrl(product.image_base64)} 
                    alt={product.name} 
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', marginBottom: '16px' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '180px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                    Sin Foto de Producto
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      {product.category_name || 'Ropa'}
                    </span>
                    {product.subcategory_name && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        {product.subcategory_name}
                      </span>
                    )}
                    {isManagement && (
                      <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                        Insumo Operativo
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{product.name}</h3>
                    {product.stock <= 0 ? (
                      <span className="badge badge-danger">Agotado</span>
                    ) : product.stock <= 3 ? (
                      <span className="badge badge-warning">Stock: {product.stock}</span>
                    ) : (
                      <span className="badge badge-success">Stock: {product.stock}</span>
                    )}
                  </div>
                  
                  {/* Cost & Sale Details Table */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Costo Inversión:</span>
                      <span style={{ fontWeight: 600 }}>${unitCost.toFixed(2)}</span>
                    </div>
                    
                    {!isManagement ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Precio de Venta:</span>
                          <span style={{ fontWeight: 600, color: 'var(--brand-secondary)' }}>${salePrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ganancia estimada:</span>
                          <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>+${profitMargin.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-color)', color: 'var(--status-warning)', fontSize: '0.78rem' }}>
                        • Gasto/Insumo interno (No se vende a clientes)
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1.2, padding: '7px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} 
                    onClick={() => onOpenAddStock(product)}
                  >
                    <PlusCircle size={15} />
                    + Stock
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} 
                    onClick={() => onOpenEditProduct(product)}
                  >
                    <Edit3 size={15} />
                    Editar
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => deleteProduct(product.id)}
                    title="Eliminar producto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          No se encontraron productos con los filtros seleccionados.
        </div>
      )}
    </div>
  );
}
