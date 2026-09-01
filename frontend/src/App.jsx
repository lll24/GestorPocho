import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  History, 
  Settings, 
  DollarSign, 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  Edit3, 
  Search, 
  Smartphone, 
  Check, 
  RefreshCw, 
  AlertCircle,
  Menu,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Dynamically determine the backend URL based on how the app is being accessed
const API_URL = window.location.port === '5173' 
  ? `http://${window.location.hostname}:8000` 
  : `${window.location.protocol}//${window.location.host}`;

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App Config / Marca Blanca State
  const [config, setConfig] = useState({
    name: 'Mi Emprendimiento',
    logo_base64: null,
    color_primary: '#6366f1',
    theme: 'dark',
    dollar_rate: 45.00
  });
  
  // Data States
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({
    kpis: { total_revenue: 0, total_investment: 0, total_historical_investment: 0, total_profit: 0, profit_margin: 0 },
    chart: []
  });
  const [statsDays, setStatsDays] = useState(30);
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedCapture, setSelectedCapture] = useState(null); // Ver comprobante de pago
  const [loadingCaptureId, setLoadingCaptureId] = useState(null); // ID de la venta cuyo comprobante se está cargando
  const [zoomScale, setZoomScale] = useState(1); // Control de zoom
  
  // Reiniciar zoom al abrir/cerrar comprobante
  useEffect(() => {
    setZoomScale(1);
  }, [selectedCapture]);

  // Descargar captura de pago bajo demanda solo al hacer clic
  const handleViewCapture = async (saleId) => {
    setLoadingCaptureId(saleId);
    try {
      const res = await fetch(`${API_URL}/api/sales/${saleId}/capture`);
      if (!res.ok) {
        throw new Error('No se pudo obtener el comprobante');
      }
      const data = await res.json();
      setSelectedCapture(data.capture);
    } catch (err) {
      console.error('Error al cargar comprobante:', err);
      alert('No se pudo cargar el comprobante de pago.');
    } finally {
      setLoadingCaptureId(null);
    }
  };
  
  // Cart State (for Nueva Venta)
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('divisas');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentCapture, setPaymentCapture] = useState(null);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Modals & Forms (for Product CRUD)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    cost_base: '',
    cost_iva: 16, // Predeterminado a 16%
    cost_shipping: '',
    sale_price: '',
    sale_extra: 0,
    stock: '',
    image_base64: null
  });

  // Config Form State
  const [configForm, setConfigForm] = useState({
    name: '',
    color_primary: '#6366f1',
    theme: 'dark',
    logo_base64: null,
    dollar_rate: 45.00
  });

  // Fetch initial configuration & apply brand styling
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      const data = await res.json();
      setConfig(data);
      setConfigForm(data);
      
      // Inject CSS Variables dynamically
      document.documentElement.style.setProperty('--brand-primary', data.color_primary);
      // Secondary is automatically calculated as primary with transparency
      document.documentElement.style.setProperty('--brand-secondary', `${data.color_primary}cc`);
      document.documentElement.style.setProperty('--brand-primary-glow', `${data.color_primary}22`);
      
      // Toggle light/dark body class
      if (data.theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sales`);
      const data = await res.json();
      setSales(data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats?days=${statsDays}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchProducts();
    fetchSales();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [statsDays]);

  // Utility to handle Base64 Image Conversions
  const handleImageChange = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- BRAND CONFIGURATION API CALL ---
  const saveConfig = async (e) => {
    e.preventDefault();
    const sanitizedConfig = {
      ...configForm,
      dollar_rate: parseFloat(configForm.dollar_rate) || 45.00
    };
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedConfig)
      });
      const data = await res.json();
      setConfig(data);
      
      // Inject CSS Variables dynamically
      document.documentElement.style.setProperty('--brand-primary', data.color_primary);
      document.documentElement.style.setProperty('--brand-secondary', `${data.color_primary}cc`);
      document.documentElement.style.setProperty('--brand-primary-glow', `${data.color_primary}22`);
      
      // Toggle light/dark body class
      if (data.theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      
      alert('Configuración de marca guardada con éxito.');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Error al guardar configuración.');
    }
  };

  const handleRestoreDatabase = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('¿Estás seguro de que deseas restaurar esta base de datos? Esto reemplazará TODOS tus datos actuales (inventario, ventas, etc.) y no se puede deshacer.')) {
      e.target.value = '';
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_URL}/api/restore`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        alert('¡Base de datos restaurada con éxito! La página se recargará para cargar los nuevos datos.');
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(`Error al restaurar: ${errData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error restoring database:', err);
      alert('Error de conexión al restaurar la base de datos.');
    } finally {
      e.target.value = '';
    }
  };

  // --- PRODUCT COST & MARGIN HELPERS ---
  const handleCostChange = (field, value) => {
    const updatedForm = { ...productForm, [field]: value };
    
    const costBaseBefore = parseFloat(productForm.cost_base) || 0;
    const costIvaBefore = parseFloat(productForm.cost_iva) || 0;
    const costShippingBefore = parseFloat(productForm.cost_shipping) || 0;
    const salePriceBefore = parseFloat(productForm.sale_price) || 0;
    
    const totalCostBefore = costBaseBefore * (1 + costIvaBefore / 100) + costShippingBefore;
    const currentMargin = totalCostBefore > 0 ? ((salePriceBefore / totalCostBefore) - 1) * 100 : 30;
    
    const costBaseNew = parseFloat(updatedForm.cost_base) || 0;
    const costIvaNew = parseFloat(updatedForm.cost_iva) || 0;
    const costShippingNew = parseFloat(updatedForm.cost_shipping) || 0;
    
    const newTotalCost = costBaseNew * (1 + costIvaNew / 100) + costShippingNew;
    const newSalePrice = newTotalCost * (1 + (isNaN(currentMargin) ? 30 : currentMargin) / 100);
    
    let salePriceVal = '';
    if (newTotalCost > 0 && !isNaN(newSalePrice) && isFinite(newSalePrice)) {
      salePriceVal = parseFloat(newSalePrice.toFixed(2));
    }
    
    setProductForm({
      ...updatedForm,
      sale_price: salePriceVal
    });
  };

  const handleMarginPercentChange = (percentVal) => {
    const percent = parseFloat(percentVal) || 0;
    const costBase = parseFloat(productForm.cost_base) || 0;
    const costIva = parseFloat(productForm.cost_iva) || 0;
    const costShipping = parseFloat(productForm.cost_shipping) || 0;
    
    const total = costBase * (1 + costIva / 100) + costShipping;
    const newSalePrice = total * (1 + percent / 100);
    
    let salePriceVal = '';
    if (total > 0 && !isNaN(newSalePrice) && isFinite(newSalePrice)) {
      salePriceVal = parseFloat(newSalePrice.toFixed(2));
    }
    
    setProductForm({
      ...productForm,
      sale_price: salePriceVal
    });
  };

  // --- PRODUCT CRUD HANDLERS ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      cost_base: '',
      cost_iva: 16, // Predeterminado a 16% por defecto
      cost_shipping: '',
      sale_price: '',
      sale_extra: 0,
      stock: '',
      image_base64: null
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm(prod);
    setShowProductModal(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const endpoint = editingProduct 
        ? `${API_URL}/api/products/${editingProduct.id}` 
        : `${API_URL}/api/products`;
      
      // Clean and sanitize string fields back to numeric formats for API validation
      const sanitizedPayload = {
        ...productForm,
        cost_base: parseFloat(productForm.cost_base) || 0,
        cost_iva: parseFloat(productForm.cost_iva) || 0,
        cost_shipping: parseFloat(productForm.cost_shipping) || 0,
        sale_price: parseFloat(productForm.sale_price) || 0,
        sale_extra: parseFloat(productForm.sale_extra) || 0,
        stock: parseInt(productForm.stock) || 0
      };
        
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload)
      });
      
      if (res.ok) {
        setShowProductModal(false);
        fetchProducts();
        fetchStats();
      } else {
        alert('Error al guardar el producto.');
      }
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchProducts();
          fetchStats();
        }
      } catch (err) {
        console.error('Error deleting product:', err);
      }
    }
  };

  // --- CART / SALE HANDLERS ---
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('No puedes vender más del stock disponible.');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock < 1) {
        alert('Producto sin stock disponible.');
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQty = (id, newQty) => {
    const product = products.find(p => p.id === id);
    if (newQty > product.stock) {
      alert(`Solo hay ${product.stock} unidades en stock.`);
      return;
    }
    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const submitSale = async () => {
    if (cart.length === 0) {
      alert('Agrega al menos un producto al carrito.');
      return;
    }
    
    setIsSubmittingSale(true);
    const salePayload = {
      items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      payment_capture_base64: paymentCapture,
      client_name: clientName || null,
      delivery_cost: parseFloat(deliveryCost) || 0
    };

    try {
      const res = await fetch(`${API_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      
      if (res.ok) {
        const finishedSale = await res.json();
        alert('Venta procesada con éxito.');
        // Clear Cart & inputs
        setCart([]);
        setClientName('');
        setPaymentReference('');
        setPaymentCapture(null);
        setDeliveryCost(0);
        
        // Refresh local data
        fetchProducts();
        fetchSales();
        fetchStats();
        
        // Auto trigger Invoice PDF Download
        window.open(`${API_URL}/api/sales/${finishedSale.id}/invoice`, '_blank');
      } else {
        const errorData = await res.json();
        alert(`Error al registrar venta: ${errorData.detail}`);
      }
    } catch (err) {
      console.error('Error posting sale:', err);
      alert('Error en la conexión con el servidor.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Get total for the cart
  const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.sale_price) + parseFloat(item.sale_extra)) * item.quantity, 0);
  const cartTotal = cartSubtotal + (parseFloat(deliveryCost) || 0);

  // Filtered products list
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="brand-name">{config.name}</span>
        <div style={{ width: '40px' }}></div> {/* Spacer to balance centering */}
      </div>

      {/* Sidebar Backdrop Overlay */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>}

      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDEBAR NAVIGATION */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="brand-section" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {config.logo_base64 ? (
                <img src={config.logo_base64} alt="Logo" className="brand-logo" />
              ) : (
                <div className="brand-logo-placeholder">{config.name.charAt(0).toUpperCase()}</div>
              )}
              <span className="brand-name">{config.name}</span>
            </div>
            {/* Mobile close button inside sidebar */}
            <button className="mobile-toggle-btn close-sidebar" onClick={() => setSidebarOpen(false)} style={{ padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
          
          <nav style={{ flex: 1 }}>
            <ul className="nav-links">
              <li>
                <button 
                  className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
                >
                  <TrendingUp size={18} />
                  Panel Financiero
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${currentView === 'inventory' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('inventory'); setSidebarOpen(false); }}
                >
                  <Package size={18} />
                  Inventario
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${currentView === 'sale' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('sale'); setSidebarOpen(false); }}
                >
                  <ShoppingCart size={18} />
                  Nueva Venta
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('history'); setSidebarOpen(false); }}
                >
                  <History size={18} />
                  Historial de Ventas
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${currentView === 'config' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('config'); setSidebarOpen(false); }}
                >
                  <Settings size={18} />
                  Personalización
                </button>
              </li>
            </ul>
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={14} />
              <span>Compartir en Red Local:</span>
            </div>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              http://{window.location.hostname || 'IP_LOCAL'}:8000
            </span>
          </div>
        </aside>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="main-content" style={{ width: '100%' }}>
        
        {/* 1. VIEW: DASHBOARD (PANEL FINANCIERO) */}
        {currentView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1>Panel Financiero</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Métricas e inversión en tiempo real para tu negocio</p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {[7, 30, 90].map(days => (
                  <button 
                    key={days} 
                    onClick={() => setStatsDays(days)}
                    style={{
                      border: 'none',
                      background: statsDays === days ? 'var(--brand-primary)' : 'transparent',
                      color: statsDays === days ? 'white' : 'var(--text-secondary)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    {days} Días
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Vendido / Ingresos</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>${stats.kpis.total_revenue.toFixed(2)}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--brand-secondary)', padding: '12px', borderRadius: '12px' }}>
                  <Package size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Inversión Inventario</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>${stats.kpis.total_investment.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monto activo en stock</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
                  <History size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Inversión Histórica</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>${(stats.kpis.total_historical_investment || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total invertido (todo)</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Ganancia Neta</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>${stats.kpis.total_profit.toFixed(2)}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)', padding: '12px', borderRadius: '12px' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Margen sobre Costo</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.kpis.profit_margin.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Financial SVG Charts */}
            <div className="card" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '24px' }}>Gráfico de Intervalos de Tiempo</h2>
              {stats.chart.length > 0 ? (
                <div style={{ width: '100%' }}>
                  {/* Premium Custom SVG Area Chart */}
                  <svg viewBox="0 0 1000 350" style={{ width: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorGanancias" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--status-success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--status-success)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    <line x1="50" y1="50" x2="950" y2="50" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="130" x2="950" y2="130" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="210" x2="950" y2="210" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="290" x2="950" y2="290" stroke="rgba(255,255,255,0.05)" />
                    
                    {/* X & Y Axis */}
                    <line x1="50" y1="290" x2="950" y2="290" stroke="var(--border-color)" strokeWidth="1" />
                    
                    {/* Render area charts and lines dynamically */}
                    {(() => {
                      const maxVal = Math.max(...stats.chart.map(d => Math.max(d.ingresos, d.ganancias)), 100);
                      const pointsCount = stats.chart.length;
                      
                      const getX = (index) => 50 + (index * (900 / (pointsCount - 1 || 1)));
                      const getY = (val) => 290 - ((val / maxVal) * 220); // Max height of 220
                      
                      // Build path strings
                      let revenuePath = `M ${getX(0)} ${getY(stats.chart[0].ingresos)}`;
                      let revenueArea = `M ${getX(0)} 290 L ${getX(0)} ${getY(stats.chart[0].ingresos)}`;
                      
                      let profitPath = `M ${getX(0)} ${getY(stats.chart[0].ganancias)}`;
                      let profitArea = `M ${getX(0)} 290 L ${getX(0)} ${getY(stats.chart[0].ganancias)}`;
                      
                      stats.chart.forEach((d, i) => {
                        if(i === 0) return;
                        revenuePath += ` L ${getX(i)} ${getY(d.ingresos)}`;
                        revenueArea += ` L ${getX(i)} ${getY(d.ingresos)}`;
                        
                        profitPath += ` L ${getX(i)} ${getY(d.ganancias)}`;
                        profitArea += ` L ${getX(i)} ${getY(d.ganancias)}`;
                      });
                      
                      revenueArea += ` L ${getX(pointsCount - 1)} 290 Z`;
                      profitArea += ` L ${getX(pointsCount - 1)} 290 Z`;
                      
                      return (
                        <>
                          {/* Areas */}
                          <path d={revenueArea} fill="url(#colorIngresos)" />
                          <path d={profitArea} fill="url(#colorGanancias)" />
                          
                          {/* Lines */}
                          <path d={revenuePath} fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" />
                          <path d={profitPath} fill="none" stroke="var(--status-success)" strokeWidth="3" strokeLinecap="round" />
                          
                          {/* Labels */}
                          {stats.chart.map((d, i) => {
                            // Only print some labels to avoid overcrowding
                            const showLabel = pointsCount <= 10 || i % Math.ceil(pointsCount / 7) === 0 || i === pointsCount - 1;
                            if (!showLabel) return null;
                            
                            const dateObj = new Date(d.fecha + 'T00:00:00');
                            const dateLabel = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
                            
                            return (
                              <g key={i}>
                                <circle cx={getX(i)} cy={getY(d.ingresos)} r="4" fill="var(--brand-primary)" />
                                <circle cx={getX(i)} cy={getY(d.ganancias)} r="4" fill="var(--status-success)" />
                                <text x={getX(i)} y="315" fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
                                  {dateLabel}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Y-Axis scale label */}
                          <text x="40" y="55" fill="var(--text-muted)" fontSize="11" textAnchor="end">${maxVal.toFixed(0)}</text>
                          <text x="40" y="295" fill="var(--text-muted)" fontSize="11" textAnchor="end">$0</text>
                        </>
                      );
                    })()}
                  </svg>
                  
                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--brand-primary)' }}></span>
                      Ingresos Totales (Venta + Adicionales)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-success)' }}></span>
                      Ganancia Neta (Ingresos - Inversión)
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  No hay datos suficientes para graficar en este periodo de tiempo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. VIEW: INVENTORY (PRODUCT LIST / CRUD) */}
        {currentView === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1>Gestión de Inventario</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Agrega, edita y gestiona las existencias físicas de tu negocio</p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddProduct}>
                <Plus size={18} />
                Agregar Producto
              </button>
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
              <button className="btn btn-secondary" onClick={fetchProducts}>
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Inventory Grid */}
            {filteredProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {filteredProducts.map(product => {
                  const costBase = parseFloat(product.cost_base) || 0;
                  const costIva = parseFloat(product.cost_iva) || 0;
                  const costShipping = parseFloat(product.cost_shipping) || 0;
                  const salePriceRaw = parseFloat(product.sale_price) || 0;
                  const saleExtraRaw = parseFloat(product.sale_extra) || 0;

                  const unitCost = costBase * (1 + costIva / 100) + costShipping;
                  const salePrice = salePriceRaw + saleExtraRaw;
                  const profitMargin = salePrice - unitCost;
                  
                  return (
                    <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {product.image_base64 ? (
                        <img 
                          src={product.image_base64} 
                          alt={product.name} 
                          style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', marginBottom: '16px' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '180px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                          Sin Foto de Producto
                        </div>
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{product.name}</h3>
                          {product.stock <= 0 ? (
                            <span className="badge badge-danger">Agotado</span>
                          ) : product.stock <= 3 ? (
                            <span className="badge badge-warning">Bajo Stock: {product.stock}</span>
                          ) : (
                            <span className="badge badge-success">Stock: {product.stock}</span>
                          )}
                        </div>
                        
                        {/* Cost & Sale Details Table */}
                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Costo Total (Inversión):</span>
                            <span style={{ fontWeight: 600 }}>${unitCost.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Precio Venta (Establecido):</span>
                            <span style={{ fontWeight: 600, color: 'var(--brand-secondary)' }}>${salePrice.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ganancia por Unidad:</span>
                            <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>+${profitMargin.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '8px' }} onClick={() => handleOpenEditProduct(product)}>
                          <Edit3 size={16} />
                          Editar
                        </button>
                        <button className="btn btn-danger" style={{ padding: '8px 12px' }} onClick={() => deleteProduct(product.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                No se encontraron productos en el inventario. Agrega uno arriba.
              </div>
            )}
          </div>
        )}

        {/* 3. VIEW: NUEVA VENTA (CARRITO / CAJA) */}
        {currentView === 'sale' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'start' }}>
            
            {/* Left Column: Product Picker */}
            <div>
              <h1>Caja / Registrar Venta</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Selecciona los productos y define el método de pago del cliente</p>
              
              <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por nombre..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              {/* Product list */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                    {p.image_base64 ? (
                      <img src={p.image_base64} alt={p.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '110px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        Sin Imagen
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-secondary)', margin: '4px 0' }}>
                        ${(parseFloat(p.sale_price) + parseFloat(p.sale_extra)).toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: p.stock === 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                        Disponible: {p.stock} unid.
                      </span>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p)}
                    >
                      Añadir a la Venta
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Cart Panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '40px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
                <ShoppingCart size={20} />
                Artículos Venta
              </h2>

              {/* Cart List */}
              {cart.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--brand-secondary)' }}>
                          ${(parseFloat(item.sale_price) + parseFloat(item.sale_extra)).toFixed(2)} c/u
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                          className="form-input" 
                          style={{ width: '60px', padding: '6px', textAlign: 'center' }} 
                        />
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => removeFromCart(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                  El carrito está vacío.
                </div>
              )}

              {/* Client & Billing Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cliente (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Nombre del cliente" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="form-input" 
                  />
                </div>

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
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Referencia / Teléfono</label>
                    <input 
                      type="text" 
                      placeholder="N° de referencia o cuenta" 
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="form-input" 
                    />
                  </div>
                )}

                {/* Upload proof of payment Capture */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Capture de Pago</label>
                  <label className="image-upload-box" style={{ padding: '12px', margin: 0 }}>
                    <Upload size={16} />
                    <span style={{ fontSize: '0.8rem' }}>{paymentCapture ? 'Capture Seleccionado' : 'Subir Comprobante'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageChange(e, setPaymentCapture)} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  {paymentCapture && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--status-success)' }}>
                      <span>Imagen cargada correctamente</span>
                      <button type="button" onClick={() => setPaymentCapture(null)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>Borrar</button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Delivery / Extra ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Summary Calculations */}
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal Productos:</span>
                  <span>${cartSubtotal.toFixed(2)} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Bs. {(cartSubtotal * config.dollar_rate).toFixed(2)})</span></span>
                </div>
                {parseFloat(deliveryCost) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>Costo Delivery:</span>
                    <span>+${parseFloat(deliveryCost).toFixed(2)} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Bs. {(parseFloat(deliveryCost) * config.dollar_rate).toFixed(2)})</span></span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                  <span>Total Cobrar:</span>
                  <span style={{ color: 'var(--brand-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span>${cartTotal.toFixed(2)}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Bs. {(cartTotal * config.dollar_rate).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px' }}
                disabled={cart.length === 0 || isSubmittingSale}
                onClick={submitSale}
              >
                {isSubmittingSale ? 'Procesando Venta...' : 'Registrar Venta y Generar Factura'}
              </button>
            </div>

          </div>
        )}

        {/* 4. VIEW: HISTORY (HISTORIAL DE VENTAS) */}
        {currentView === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1>Historial de Ventas</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Consulta las transacciones realizadas y descarga comprobantes</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a 
                  href={`${API_URL}/api/sales/report?days=${statsDays}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <FileText size={18} />
                  Exportar Reporte ({statsDays} días)
                </a>
                <button className="btn btn-secondary" onClick={fetchSales}>
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* Sales Table Container */}
            {sales.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Metodo de Pago</th>
                      <th>Detalles Items</th>
                      <th>Cobrado</th>
                      <th>Ganancia</th>
                      <th>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td style={{ fontWeight: 'bold' }}>#{sale.id}</td>
                        <td>{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{sale.client_name || 'Consumidor Final'}</td>
                        <td>
                          <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>{sale.payment_method}</span>
                          {sale.payment_reference && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Ref: {sale.payment_reference}</div>
                          )}
                          {(sale.has_capture || sale.payment_capture_base64) && (
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '6px', width: '100%', display: 'block', textAlign: 'center' }} 
                              onClick={() => {
                                if (sale.payment_capture_base64) {
                                  setSelectedCapture(sale.payment_capture_base64);
                                } else {
                                  handleViewCapture(sale.id);
                                }
                              }}
                              disabled={loadingCaptureId === sale.id}
                            >
                              {loadingCaptureId === sale.id ? 'Cargando...' : 'Ver Capture'}
                            </button>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {sale.items.map((item, idx) => (
                              <div key={idx}>• {item.product_name} x {item.quantity}</div>
                            ))}
                            {parseFloat(sale.delivery_cost) > 0 && <div style={{ color: 'var(--brand-secondary)' }}>• +Delivery</div>}
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          <div>${parseFloat(sale.total_revenue).toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Bs. {(parseFloat(sale.total_revenue) * parseFloat(sale.dollar_rate || 45.00)).toFixed(2)}
                            <br/>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Tasa: {parseFloat(sale.dollar_rate || 45.00).toFixed(2)})</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>
                          <div>+${parseFloat(sale.total_profit).toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--status-success)', marginTop: '4px', opacity: 0.85 }}>
                            +Bs. {(parseFloat(sale.total_profit) * parseFloat(sale.dollar_rate || 45.00)).toFixed(2)}
                          </div>
                        </td>
                        <td>
                          <a 
                            href={`${API_URL}/api/sales/${sale.id}/invoice`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            <FileText size={16} style={{ marginRight: '4px' }} />
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                No se han registrado ventas aún.
              </div>
            )}
          </div>
        )}

        {/* 5. VIEW: CONFIGURATION / SETTINGS (PERSONALIZACION MARCA BLANCA) */}
        {currentView === 'config' && (
          <div style={{ maxWidth: '600px' }}>
            <h1>Configuración de Marca Blanca</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Personaliza el nombre, colores y logo del negocio en la aplicación y facturas</p>

            <form onSubmit={saveConfig} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Nombre del Emprendimiento</label>
                <input 
                  type="text" 
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  required 
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Color de Marca (Hex)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="color" 
                      value={configForm.color_primary}
                      onChange={(e) => setConfigForm({ ...configForm, color_primary: e.target.value })}
                      style={{ width: '42px', height: '42px', border: 'none', padding: 0, borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} 
                    />
                    <input 
                      type="text" 
                      value={configForm.color_primary}
                      onChange={(e) => setConfigForm({ ...configForm, color_primary: e.target.value })}
                      className="form-input" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tema Visual</label>
                  <select 
                    value={configForm.theme} 
                    onChange={(e) => setConfigForm({ ...configForm, theme: e.target.value })}
                    className="form-select"
                  >
                    <option value="dark">Tema Oscuro 🌙</option>
                    <option value="light">Tema Claro ☀️</option>
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
                    onChange={(e) => handleImageChange(e, (b64) => setConfigForm({ ...configForm, logo_base64: b64 }))} 
                    style={{ display: 'none' }} 
                  />
                </label>
                {configForm.logo_base64 && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <img 
                      src={configForm.logo_base64} 
                      alt="Preview Logo" 
                      style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                    />
                    <br />
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '8px' }} onClick={() => setConfigForm({ ...configForm, logo_base64: null })}>Eliminar Logo</button>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', padding: '14px' }}>
                <Check size={18} />
                Guardar Cambios de Identidad
              </button>
            </form>

            {/* Database backup section */}
            <div className="card" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Base de Datos y Respaldo</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
                  Descarga una copia de seguridad completa de tu base de datos en formato SQLite o restaura un archivo previamente descargado.
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
          </div>
        )}

      </main>
    </div>

      {/* --- ADD/EDIT PRODUCT DIALOG / MODAL --- */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <form onSubmit={saveProduct} className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2>{editingProduct ? 'Editar Producto' : 'Agregar Producto al Inventario'}</h2>

            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input 
                type="text" 
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required 
                placeholder="Ej. Reloj Casio Vintage"
                className="form-input" 
              />
            </div>

            {(() => {
              const costBaseNum = parseFloat(productForm.cost_base) || 0;
              const costIvaNum = parseFloat(productForm.cost_iva) || 0;
              const costShippingNum = parseFloat(productForm.cost_shipping) || 0;
              const salePriceNum = parseFloat(productForm.sale_price) || 0;

              const modalTotalCost = costBaseNum * (1 + costIvaNum / 100) + costShippingNum;
              const modalProfitPercent = modalTotalCost > 0 ? ((salePriceNum / modalTotalCost) - 1) * 100 : 30;
              
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
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
                    <div className="form-group">
                      <label className="form-label">IVA (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={productForm.cost_iva}
                        onChange={(e) => handleCostChange('cost_iva', e.target.value)}
                        placeholder="Ej. 16"
                        className="form-input" 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gasto Envío ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={productForm.cost_shipping}
                        onChange={(e) => handleCostChange('cost_shipping', e.target.value)}
                        className="form-input" 
                      />
                    </div>
                  </div>

                  {/* Computed cost display banner */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Costo Total Calculado:</span>
                    <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>${modalTotalCost.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Ganancia (%)</label>
                      <input 
                        type="number" 
                        step="1"
                        value={Math.round(modalProfitPercent)}
                        onChange={(e) => handleMarginPercentChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        className="form-input" 
                      />
                    </div>
                    <div className="form-group">
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
                    <div className="form-group">
                      <label className="form-label">Stock Inicial / Actual</label>
                      <input 
                        type="number" 
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        required 
                        className="form-input" 
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="form-group">
              <label className="form-label">Foto del Producto</label>
              <label className="image-upload-box">
                <Upload size={20} />
                <span>Subir foto de producto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageChange(e, (b64) => setProductForm({ ...productForm, image_base64: b64 }))} 
                  style={{ display: 'none' }} 
                />
              </label>
              {productForm.image_base64 && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <img 
                    src={productForm.image_base64} 
                    alt="Preview Product" 
                    className="upload-preview"
                  />
                  <br />
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '8px' }} onClick={() => setProductForm({ ...productForm, image_base64: null })}>Eliminar Foto</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Producto</button>
            </div>
          </form>
        </div>
      )}

      {/* --- PAYMENT PROOF LIGHTBOX / MODAL --- */}
      {selectedCapture && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Comprobante de Pago</h3>
              
              {/* Zoom Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                  title="Alejar"
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '45px', textAlign: 'center' }}>
                  {Math.round(zoomScale * 100)}%
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                  title="Acercar"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setZoomScale(1)}
                >
                  100%
                </button>
              </div>
            </div>

            {/* Scrollable Viewport */}
            <div style={{ 
              width: '100%', 
              height: '55vh', 
              overflow: 'auto', 
              background: 'rgba(0,0,0,0.4)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              position: 'relative'
            }}>
              <div style={{ 
                transform: `scale(${zoomScale})`, 
                transition: 'transform 0.15s ease-out', 
                transformOrigin: 'center center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={selectedCapture} 
                  alt="Comprobante de Pago" 
                  style={{ maxWidth: '90%', maxHeight: '50vh', borderRadius: '4px', display: 'block', objectFit: 'contain' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px' }} onClick={() => setSelectedCapture(null)}>
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
