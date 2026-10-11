import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Trash2,
  Users,
  X,
  Upload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, API_URL } from '../services/api';
import { handleImageChange } from '../utils/imageCompressor';
import { getImageUrl } from '../utils/imageUrl';

export default function PosView({ onOpenAddCustomer }) {
  const { config, products, categories, customers, fetchProducts, fetchSales, fetchCustomers, fetchStats, fetchCash, toast } = useApp();

  // Filter states
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posSubcategoryFilter, setPosSubcategoryFilter] = useState('all');
  const [posProductSearch, setPosProductSearch] = useState('');

  // Cart & POS checkout state
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [, setPosCustomerSearch] = useState('');
  const [showPosCustomerDropdown, setShowPosCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('divisas');
  const [paymentStatus, setPaymentStatus] = useState('pagado'); // pagado, parcial, fiao
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentCapture, setPaymentCapture] = useState(null);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const dollarRate = parseFloat(config.dollar_rate) || 45.00;

  // POS Filtering (EXCLUDE is_for_sale === false)
  const sellableProducts = products.filter(p => p.is_for_sale !== false);
  const filteredPosProducts = sellableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posProductSearch.toLowerCase());
    const matchesCat = posCategoryFilter === 'all' || p.category_name === posCategoryFilter;
    const matchesSubcat = posSubcategoryFilter === 'all' || p.subcategory_name === posSubcategoryFilter;
    return matchesSearch && matchesCat && matchesSubcat;
  });

  // Cart methods
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.warning(`Solo quedan ${product.stock} unidades en stock.`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId, qty) => {
    const prod = products.find(p => p.id === productId);
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    if (prod && qty > prod.stock) {
      toast.warning(`Solo quedan ${prod.stock} unidades disponibles.`);
      return;
    }
    setCart(cart.map(item => item.id === productId ? { ...item, quantity: qty } : item));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.sale_price) + parseFloat(item.sale_extra || 0)) * item.quantity, 0);
  const cartTotal = cartSubtotal + (parseFloat(deliveryCost) || 0);

  const submitSale = async () => {
    if (cart.length === 0) {
      toast.warning('Agrega al menos un producto al carrito.');
      return;
    }

    if ((paymentStatus === 'fiao' || paymentStatus === 'parcial') && !selectedCustomerId && !clientName.trim()) {
      toast.warning('Para vender fiado o con abono parcial, debes seleccionar o ingresar el nombre del cliente.');
      return;
    }

    setIsSubmittingSale(true);
    const salePayload = {
      items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
      client_name: clientName || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      initial_payment: paymentStatus === 'parcial' ? (parseFloat(initialPayment) || 0) : 0,
      payment_reference: paymentReference || null,
      payment_capture_base64: paymentCapture,
      delivery_cost: parseFloat(deliveryCost) || 0
    };

    try {
      const res = await api.createSale(salePayload);
      if (res.ok) {
        const finishedSale = await res.json();
        toast.success('¡Venta procesada con éxito!');
        setCart([]);
        setClientName('');
        setSelectedCustomerId('');
        setPosCustomerSearch('');
        setShowPosCustomerDropdown(false);
        setPaymentStatus('pagado');
        setInitialPayment('');
        setPaymentReference('');
        setPaymentCapture(null);
        setDeliveryCost(0);
        
        fetchProducts();
        fetchSales();
        fetchCustomers();
        fetchStats();
        fetchCash();
        
        window.open(`${API_URL}/api/sales/${finishedSale.id}/invoice`, '_blank');
      } else {
        const errData = await res.json();
        toast.error(`Error al procesar la venta: ${errData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error posting sale:', err);
      toast.error('Error en la conexión con el servidor.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="pos-layout">
      {/* Left Column: Product Picker with Category Filters */}
      <div>
        <h1>Caja / Registrar Venta</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Filtra y selecciona los artículos disponibles para la venta</p>
        
        {/* Category Pills for quick filtering */}
        <div className="filter-tabs-scroll">
          <button 
            className={`btn ${posCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => {
              setPosCategoryFilter('all');
              setPosSubcategoryFilter('all');
            }}
          >
            Todas
          </button>
          {categories.filter(c => c.is_for_sale).map(cat => (
            <button 
              key={cat.id}
              className={`btn ${posCategoryFilter === cat.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                setPosCategoryFilter(cat.name);
                setPosSubcategoryFilter('all');
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Subcategories */}
        {posCategoryFilter !== 'all' && (() => {
          const activeCat = categories.find(c => c.name === posCategoryFilter);
          if (activeCat && activeCat.subcategories.length > 0) {
            return (
              <div className="filter-tabs-scroll" style={{ marginBottom: '12px' }}>
                <button 
                  className={`badge ${posSubcategoryFilter === 'all' ? 'badge-success' : 'badge-warning'}`}
                  style={{ padding: '4px 10px', cursor: 'pointer', border: 'none' }}
                  onClick={() => setPosSubcategoryFilter('all')}
                >
                  Todas
                </button>
                {activeCat.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    className={`badge ${posSubcategoryFilter === sub.name ? 'badge-success' : 'badge-warning'}`}
                    style={{ padding: '4px 10px', cursor: 'pointer', border: 'none', opacity: posSubcategoryFilter === sub.name ? 1 : 0.6 }}
                    onClick={() => setPosSubcategoryFilter(sub.name)}
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
        <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre..." 
              value={posProductSearch}
              onChange={(e) => setPosProductSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '44px', padding: '10px 10px 10px 44px' }}
            />
          </div>
        </div>

        {/* Sellable Products Grid */}
        <div className="pos-products-grid">
          {filteredPosProducts.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
              {p.image_base64 ? (
                <img src={getImageUrl(p.image_base64)} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <div style={{ width: '100%', height: '100px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  Sin Imagen
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>{p.category_name}</div>
                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0' }}>{p.name}</h4>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-secondary)' }}>
                  ${parseFloat(p.sale_price).toFixed(2)}
                </div>
                <span style={{ fontSize: '0.72rem', color: p.stock === 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                  Stock: {p.stock} u.
                </span>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: 'auto' }}
                disabled={p.stock <= 0}
                onClick={() => addToCart(p)}
              >
                + Agregar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Cart & Checkout Info */}
      <div id="pos-checkout-card" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
          <ShoppingCart size={18} />
          Resumen de Venta
        </h2>

        {/* Cart List */}
        {cart.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)' }}>
                    ${(parseFloat(item.sale_price) + parseFloat(item.sale_extra || 0)).toFixed(2)} c/u
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                    className="form-input" 
                    style={{ width: '50px', padding: '4px', textAlign: 'center', fontSize: '0.85rem' }} 
                  />
                  <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            El carrito está vacío.
          </div>
        )}

        {/* Customer Selector */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Cliente</label>
            <button 
              type="button" 
              onClick={() => {
                onOpenAddCustomer(clientName || '');
                setShowPosCustomerDropdown(false);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              + Nuevo Cliente
            </button>
          </div>

          {selectedCustomerId ? (() => {
            const cust = customers.find(c => c.id === parseInt(selectedCustomerId));
            return (
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--brand-primary)', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                    <Users size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cust ? cust.name : clientName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {cust?.phone ? `📞 ${cust.phone}` : 'Cliente Registrado'}
                    </div>
                    {cust && cust.total_debt > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--status-danger)', fontWeight: 700, marginTop: '2px' }}>
                        ⚠️ Debe: ${cust.total_debt.toFixed(2)} (Bs. {(cust.total_debt * dollarRate).toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '5px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                  onClick={() => {
                    setSelectedCustomerId('');
                    setClientName('');
                    setPosCustomerSearch('');
                  }}
                  title="Cambiar o quitar cliente"
                >
                  <X size={14} /> Cambiar
                </button>
              </div>
            );
          })() : (
            <div style={{ position: 'relative' }}>
              {showPosCustomerDropdown && (
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 180 }} 
                  onClick={() => setShowPosCustomerDropdown(false)} 
                />
              )}

              <div style={{ position: 'relative', zIndex: 190 }}>
                <input 
                  type="text" 
                  placeholder="Buscar cliente registrado o escribir nombre..."
                  value={clientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientName(val);
                    setPosCustomerSearch(val);
                    setShowPosCustomerDropdown(true);
                  }}
                  onFocus={() => setShowPosCustomerDropdown(true)}
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingRight: clientName ? '32px' : '12px' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px', pointerEvents: 'none' }} />
                {clientName && (
                  <button 
                    type="button" 
                    onClick={() => { setClientName(''); setPosCustomerSearch(''); }}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showPosCustomerDropdown && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    marginTop: '4px', 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)', 
                    zIndex: 200, 
                    maxHeight: '260px', 
                    overflowY: 'auto' 
                  }}
                >
                  <div 
                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      setSelectedCustomerId('');
                      if (!clientName.trim()) setClientName('Consumidor Final');
                      setShowPosCustomerDropdown(false);
                    }}
                    className="dropdown-hover"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} color="var(--text-muted)" />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {clientName.trim() ? `Usar como manual: "${clientName}"` : 'Consumidor Final (No registrado)'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Venta sin asociar a cuenta cliente</div>
                      </div>
                    </div>
                    <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Manual</span>
                  </div>

                  {(() => {
                    const query = (clientName || '').toLowerCase().trim();
                    const matched = customers.filter(c => 
                      !query || 
                      c.name.toLowerCase().includes(query) || 
                      (c.phone && c.phone.includes(query)) || 
                      (c.email && c.email.toLowerCase().includes(query))
                    );

                    if (matched.length === 0) {
                      return (
                        <div style={{ padding: '14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            No hay clientes registrados con "{clientName}".
                          </div>
                          {clientName.trim() && (
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ width: '100%', padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={() => {
                                onOpenAddCustomer(clientName);
                                setShowPosCustomerDropdown(false);
                              }}
                            >
                              + Registrar "{clientName}" en la base de datos
                            </button>
                          )}
                        </div>
                      );
                    }

                    return matched.map(c => (
                      <div 
                        key={c.id}
                        style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                        onClick={() => {
                          setSelectedCustomerId(c.id.toString());
                          setClientName(c.name);
                          setPosCustomerSearch('');
                          setShowPosCustomerDropdown(false);
                        }}
                        className="dropdown-hover"
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {c.phone ? `📞 ${c.phone}` : (c.email || 'Cliente registrado')}
                          </div>
                        </div>
                        {c.total_debt > 0 ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                            Debe: ${c.total_debt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                            Al Día
                          </span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Condition */}
        <div>
          <label className="form-label">Condición de Pago</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
            <button 
              type="button"
              className={`btn ${paymentStatus === 'pagado' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 4px', fontSize: '0.75rem' }}
              onClick={() => setPaymentStatus('pagado')}
            >
              Contado
            </button>
            <button 
              type="button"
              className={`btn ${paymentStatus === 'fiao' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '8px 4px', fontSize: '0.75rem' }}
              onClick={() => setPaymentStatus('fiao')}
            >
              Fiao (100%)
            </button>
            <button 
              type="button"
              className={`btn ${paymentStatus === 'parcial' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 4px', fontSize: '0.75rem' }}
              onClick={() => setPaymentStatus('parcial')}
            >
              Abono Parcial
            </button>
          </div>

          {paymentStatus === 'parcial' && (
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Monto a Abonar Hoy ($)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder={`Máximo $${cartTotal.toFixed(2)}`}
                value={initialPayment}
                onChange={(e) => setInitialPayment(e.target.value)}
                className="form-input" 
              />
              {parseFloat(initialPayment) > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--status-danger)', marginTop: '4px' }}>
                  Quedará debiendo: ${Math.max(cartTotal - parseFloat(initialPayment), 0).toFixed(2)}
                </div>
              )}
            </div>
          )}

          {paymentStatus === 'fiao' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--status-danger)' }}>
              • El total de <strong>${cartTotal.toFixed(2)}</strong> quedará registrado como deuda en la cuenta de este cliente.
            </div>
          )}
        </div>

        {/* Payment Method Details */}
        {paymentStatus !== 'fiao' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Método de Pago</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-select"
              >
                <option value="divisas">Divisas (Efectivo)</option>
                <option value="pagomovil">Pago Móvil</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="binance">Binance (USDT)</option>
              </select>
            </div>

            {paymentMethod !== 'divisas' && (
              <input 
                type="text" 
                placeholder="Referencia bancaria o captura" 
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="form-input" 
              />
            )}

            {/* Payment capture */}
            <div>
              <label className="image-upload-box" style={{ padding: '8px', margin: 0 }}>
                <Upload size={14} />
                <span style={{ fontSize: '0.75rem' }}>{paymentCapture ? 'Comprobante Adjuntado' : 'Subir Comprobante'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageChange(e, setPaymentCapture)} 
                  style={{ display: 'none' }} 
                />
              </label>
              {paymentCapture && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--status-success)', marginTop: '4px' }}>
                  <span>Foto adjuntada</span>
                  <button type="button" onClick={() => setPaymentCapture(null)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>Quitar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delivery / Extra Fee */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Delivery / Recargo ($)</label>
          <input 
            type="number" 
            step="0.01"
            value={deliveryCost}
            onChange={(e) => setDeliveryCost(e.target.value)}
            className="form-input" 
            placeholder="0.00"
          />
        </div>

        {/* Total Calculation */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Total Venta:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
            <span>Total a Cobrar:</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--brand-secondary)' }}>${cartTotal.toFixed(2)}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Bs. {(cartTotal * dollarRate).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px' }}
          disabled={cart.length === 0 || isSubmittingSale}
          onClick={submitSale}
        >
          {isSubmittingSale ? 'Procesando...' : 'Completar Venta & Factura'}
        </button>
      </div>

      {/* Floating Mobile Cart Indicator */}
      {cart.length > 0 && (
        <div className="mobile-cart-float-bar">
          <button 
            type="button" 
            onClick={() => {
              const checkoutElem = document.getElementById('pos-checkout-card');
              if (checkoutElem) checkoutElem.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.5)', borderRadius: '12px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <ShoppingCart size={18} />
              {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'artículo' : 'artículos'}
            </span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
              ${cartTotal.toFixed(2)} ➔ Cobrar
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
