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
  ZoomOut,
  Users,
  Coins,
  Clock,
  ChevronRight,
  CreditCard,
  Tag,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const API_URL = window.location.port === '5173' 
  ? `http://${window.location.hostname}:8000` 
  : `${window.location.protocol}//${window.location.host}`;

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App Config
  const [config, setConfig] = useState({
    name: 'Mi Emprendimiento',
    logo_base64: null,
    color_primary: '#6366f1',
    theme: 'dark',
    dollar_rate: 45.00
  });
  
  // Core Data States
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    kpis: { 
      dollar_rate: 45.00,
      total_receivables: 0,
      total_collected: 0,
      total_revenue: 0, 
      total_investment: 0, 
      total_historical_investment: 0, 
      total_profit: 0, 
      profit_margin: 0 
    },
    chart: []
  });
  const [statsDays, setStatsDays] = useState(30);
  
  // Filtering states
  const [productSearch, setProductSearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventorySubcategoryFilter, setInventorySubcategoryFilter] = useState('all');

  // POS / Nueva Venta Filtering
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posSubcategoryFilter, setPosSubcategoryFilter] = useState('all');
  const [posProductSearch, setPosProductSearch] = useState('');

  // Customer View Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDebtFilter, setCustomerDebtFilter] = useState('all'); // all, debt, clean

  // Lightbox / Capture View
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [loadingCaptureId, setLoadingCaptureId] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  
  useEffect(() => {
    setZoomScale(1);
  }, [selectedCapture]);

  // Cart & POS State
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('divisas');
  const [paymentStatus, setPaymentStatus] = useState('pagado'); // pagado, parcial, fiao
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentCapture, setPaymentCapture] = useState(null);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: null,
    subcategory_id: null,
    category_name: 'Ropa',
    subcategory_name: 'Camisas',
    is_for_sale: true,
    cost_base: '',
    cost_iva: 16,
    cost_shipping: '',
    sale_price: '',
    sale_extra: 0,
    stock: '',
    image_base64: null
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', is_for_sale: true });
  const [newSubcategoryForm, setNewSubcategoryForm] = useState({ category_id: '', name: '' });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);

  // Payment (Abono) Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeSaleForPayment, setActiveSaleForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'divisas',
    payment_reference: '',
    notes: ''
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Config Form State
  const [configForm, setConfigForm] = useState({
    name: '',
    color_primary: '#6366f1',
    theme: 'dark',
    logo_base64: null,
    dollar_rate: 45.00
  });

  // --- API Fetchers ---
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      const data = await res.json();
      const sanitized = {
        ...data,
        dollar_rate: parseFloat(data.dollar_rate) || 45.00
      };
      setConfig(sanitized);
      setConfigForm(sanitized);
      
      document.documentElement.style.setProperty('--brand-primary', data.color_primary || '#6366f1');
      document.documentElement.style.setProperty('--brand-secondary', `${data.color_primary || '#6366f1'}cc`);
      document.documentElement.style.setProperty('--brand-primary-glow', `${data.color_primary || '#6366f1'}22`);
      
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

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customers`);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats?days=${statsDays}`);
      const data = await res.json();
      setStats({
        kpis: {
          dollar_rate: parseFloat(data.kpis?.dollar_rate) || 45.00,
          total_receivables: parseFloat(data.kpis?.total_receivables) || 0,
          total_collected: parseFloat(data.kpis?.total_collected) || 0,
          total_revenue: parseFloat(data.kpis?.total_revenue) || 0,
          total_investment: parseFloat(data.kpis?.total_investment) || 0,
          total_historical_investment: parseFloat(data.kpis?.total_historical_investment) || 0,
          total_profit: parseFloat(data.kpis?.total_profit) || 0,
          profit_margin: parseFloat(data.kpis?.profit_margin) || 0,
        },
        chart: data.chart || []
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCustomerDetail = async (customerId) => {
    setLoadingCustomerDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerDetail(data);
      }
    } catch (err) {
      console.error('Error fetching customer detail:', err);
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchProducts();
    fetchSales();
    fetchCategories();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [statsDays]);

  // Image Helper
  const handleImageChange = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // View Capture On Demand
  const handleViewCapture = async (saleId) => {
    setLoadingCaptureId(saleId);
    try {
      const res = await fetch(`${API_URL}/api/sales/${saleId}/capture`);
      if (!res.ok) throw new Error('No se pudo obtener el comprobante');
      const data = await res.json();
      setSelectedCapture(data.capture);
    } catch (err) {
      console.error('Error al cargar comprobante:', err);
      alert('No se pudo cargar el comprobante de pago.');
    } finally {
      setLoadingCaptureId(null);
    }
  };

  // --- BRAND CONFIGURATION ---
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
      
      document.documentElement.style.setProperty('--brand-primary', data.color_primary);
      document.documentElement.style.setProperty('--brand-secondary', `${data.color_primary}cc`);
      document.documentElement.style.setProperty('--brand-primary-glow', `${data.color_primary}22`);
      
      if (data.theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      
      alert('Configuración guardada con éxito.');
      fetchStats();
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Error al guardar configuración.');
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
      const res = await fetch(`${API_URL}/api/restore`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        alert('¡Base de datos restaurada con éxito! La página se recargará.');
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(`Error al restaurar: ${errData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error restoring database:', err);
      alert('Error de conexión al restaurar.');
    } finally {
      e.target.value = '';
    }
  };

  // --- PRODUCT CRUD HELPERS ---
  const handleCostChange = (field, value) => {
    const updatedForm = { ...productForm, [field]: value };
    const costBase = parseFloat(updatedForm.cost_base) || 0;
    const costIva = parseFloat(updatedForm.cost_iva) || 0;
    const costShipping = parseFloat(updatedForm.cost_shipping) || 0;
    const currentMargin = parseFloat(productForm.sale_price) ? ((parseFloat(productForm.sale_price) / (costBase * (1 + costIva / 100) + costShipping)) - 1) * 100 : 30;
    
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
        subcategory_id: cat.subcategories[0]?.id || null,
        subcategory_name: cat.subcategories[0]?.name || ''
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

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    const defaultCat = categories[0] || { id: null, name: 'Ropa', is_for_sale: true, subcategories: [] };
    setProductForm({
      name: '',
      category_id: defaultCat.id,
      subcategory_id: defaultCat.subcategories[0]?.id || null,
      category_name: defaultCat.name,
      subcategory_name: defaultCat.subcategories[0]?.name || '',
      is_for_sale: defaultCat.is_for_sale,
      cost_base: '',
      cost_iva: 16,
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
    setProductForm({
      name: prod.name,
      category_id: prod.category_id || null,
      subcategory_id: prod.subcategory_id || null,
      category_name: prod.category_name || 'Ropa',
      subcategory_name: prod.subcategory_name || 'Camisas',
      is_for_sale: prod.is_for_sale !== false,
      cost_base: prod.cost_base,
      cost_iva: prod.cost_iva,
      cost_shipping: prod.cost_shipping,
      sale_price: prod.sale_price,
      sale_extra: prod.sale_extra,
      stock: prod.stock,
      image_base64: prod.image_base64
    });
    setShowProductModal(true);
  };

  const saveProduct = async (e) => {
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

    try {
      const url = editingProduct 
        ? `${API_URL}/api/products/${editingProduct.id}` 
        : `${API_URL}/api/products`;
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // --- CATEGORIES MANAGEMENT ---
  const saveNewCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategoryForm)
      });
      if (res.ok) {
        setNewCategoryForm({ name: '', is_for_sale: true });
        fetchCategories();
      }
    } catch (err) {
      console.error('Error saving category:', err);
    }
  };

  const saveNewSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubcategoryForm.name.trim() || !newSubcategoryForm.category_id) return;
    try {
      const res = await fetch(`${API_URL}/api/categories/${newSubcategoryForm.category_id}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcategoryForm.name })
      });
      if (res.ok) {
        setNewSubcategoryForm({ ...newSubcategoryForm, name: '' });
        fetchCategories();
      }
    } catch (err) {
      console.error('Error saving subcategory:', err);
    }
  };

  const deleteCategory = async (catId) => {
    if (!confirm('¿Eliminar esta categoría y sus subcategorías?')) return;
    try {
      const res = await fetch(`${API_URL}/api/categories/${catId}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const deleteSubcategory = async (subId) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return;
    try {
      const res = await fetch(`${API_URL}/api/subcategories/${subId}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error('Error deleting subcategory:', err);
    }
  };

  // --- CUSTOMERS MANAGEMENT ---
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (cust) => {
    setEditingCustomer(cust);
    setCustomerForm({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      notes: cust.notes || ''
    });
    setShowCustomerModal(true);
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    try {
      const url = editingCustomer 
        ? `${API_URL}/api/customers/${editingCustomer.id}` 
        : `${API_URL}/api/customers`;
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });

      if (res.ok) {
        const saved = await res.json();
        setShowCustomerModal(false);
        fetchCustomers();
        if (selectedCustomerDetail && selectedCustomerDetail.customer.id === saved.id) {
          fetchCustomerDetail(saved.id);
        }
      }
    } catch (err) {
      console.error('Error saving customer:', err);
    }
  };

  const deleteCustomer = async (customerId) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/customers/${customerId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedCustomerDetail?.customer.id === customerId) {
          setSelectedCustomerDetail(null);
        }
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  // --- ABONOS / PAYMENTS ---
  const handleOpenPaymentModal = (sale) => {
    setActiveSaleForPayment(sale);
    setPaymentForm({
      amount: sale.amount_pending,
      payment_method: 'divisas',
      payment_reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!activeSaleForPayment) return;
    
    const payAmount = parseFloat(paymentForm.amount);
    if (!payAmount || payAmount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`${API_URL}/api/sales/${activeSaleForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference || null,
          notes: paymentForm.notes || null
        })
      });

      if (res.ok) {
        alert('¡Abono registrado con éxito!');
        setShowPaymentModal(false);
        fetchSales();
        fetchCustomers();
        fetchStats();
        if (selectedCustomerDetail) {
          fetchCustomerDetail(selectedCustomerDetail.customer.id);
        }
      } else {
        const err = await res.json();
        alert(`Error al registrar abono: ${err.detail || 'Error'}`);
      }
    } catch (err) {
      console.error('Error posting payment:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // --- POS CART HELPERS ---
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`Solo quedan ${product.stock} unidades en stock.`);
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
      alert(`Solo quedan ${prod.stock} unidades disponibles.`);
      return;
    }
    setCart(cart.map(item => item.id === productId ? { ...item, quantity: qty } : item));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.sale_price) + parseFloat(item.sale_extra)) * item.quantity, 0);
  const cartTotal = cartSubtotal + (parseFloat(deliveryCost) || 0);

  // Submit Sale
  const submitSale = async () => {
    if (cart.length === 0) {
      alert('Agrega al menos un producto al carrito.');
      return;
    }

    if ((paymentStatus === 'fiao' || paymentStatus === 'parcial') && !selectedCustomerId && !clientName.trim()) {
      alert('Para vender fiado o con abono parcial, debes seleccionar o ingresar el nombre del cliente.');
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
      const res = await fetch(`${API_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      
      if (res.ok) {
        const finishedSale = await res.json();
        alert('Venta procesada con éxito.');
        setCart([]);
        setClientName('');
        setSelectedCustomerId('');
        setPaymentStatus('pagado');
        setInitialPayment('');
        setPaymentReference('');
        setPaymentCapture(null);
        setDeliveryCost(0);
        
        fetchProducts();
        fetchSales();
        fetchCustomers();
        fetchStats();
        
        window.open(`${API_URL}/api/sales/${finishedSale.id}/invoice`, '_blank');
      } else {
        const errData = await res.json();
        alert(`Error al procesar la venta: ${errData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error posting sale:', err);
      alert('Error en la conexión con el servidor.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // --- FILTERS LOGIC ---
  // Inventory Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat = inventoryCategoryFilter === 'all' || p.category_name === inventoryCategoryFilter;
    const matchesSubcat = inventorySubcategoryFilter === 'all' || p.subcategory_name === inventorySubcategoryFilter;
    return matchesSearch && matchesCat && matchesSubcat;
  });

  // POS Filtering (EXCLUDE is_for_sale === false)
  const sellableProducts = products.filter(p => p.is_for_sale !== false);
  const filteredPosProducts = sellableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posProductSearch.toLowerCase());
    const matchesCat = posCategoryFilter === 'all' || p.category_name === posCategoryFilter;
    const matchesSubcat = posSubcategoryFilter === 'all' || p.subcategory_name === posSubcategoryFilter;
    return matchesSearch && matchesCat && matchesSubcat;
  });

  // Customer Filtering
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

  // Safe numerical helpers for rendering without runtime TypeErrors
  const dollarRate = parseFloat(config.dollar_rate) || 45.00;
  const kpiReceivables = parseFloat(stats.kpis?.total_receivables) || 0;
  const kpiRevenue = parseFloat(stats.kpis?.total_revenue) || 0;
  const kpiInvestment = parseFloat(stats.kpis?.total_investment) || 0;
  const kpiProfit = parseFloat(stats.kpis?.total_profit) || 0;
  const kpiMargin = parseFloat(stats.kpis?.profit_margin) || 0;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <span className="brand-name">{config.name}</span>
        <div style={{ width: '40px' }}></div>
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
                  className={`nav-item ${currentView === 'customers' ? 'active' : ''}`}
                  onClick={() => { setCurrentView('customers'); setSidebarOpen(false); }}
                >
                  <Users size={18} />
                  Clientes & Fiao
                  {stats.kpis.total_receivables > 0 && (
                    <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                      Deuda
                    </span>
                  )}
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
              <span>Acceso en Red Local:</span>
            </div>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              http://{window.location.hostname || 'IP_LOCAL'}:8000
            </span>
          </div>
        </aside>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="main-content" style={{ width: '100%' }}>
        
        {/* ======================================================== */}
        {/* 1. VIEW: DASHBOARD (PANEL FINANCIERO) */}
        {/* ======================================================== */}
        {currentView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1>Panel Financiero</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Métricas, tasas e inversión en tiempo real para tu negocio</p>
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

            {/* HIGHLIGHT BANNER: TASA DEL DÓLAR Y DEUDAS EN LA CALLE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              
              {/* Tasa del Dólar Oficial del Sistema */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)', padding: '16px', borderRadius: '14px' }}>
                  <Coins size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Tasa de Cambio Activa</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>EN VIVO</span>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    Bs. {dollarRate.toFixed(2)}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>/ 1.00 USD</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Utilizada automáticamente en facturas y POS
                  </div>
                </div>
              </div>

              {/* Cuentas por Cobrar (Fiao) */}
              <div className="card" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                border: kpiReceivables > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)', 
                background: kpiReceivables > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)' 
              }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', padding: '16px', borderRadius: '14px' }}>
                  <Clock size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Cuentas por Cobrar (Fiao)</span>
                    {kpiReceivables > 0 && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>PENDIENTE</span>}
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-danger)' }}>
                    ${kpiReceivables.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Equivalente a <strong>Bs. {(kpiReceivables * dollarRate).toFixed(2)}</strong> en la calle
                  </div>
                </div>
                {kpiReceivables > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                    onClick={() => {
                      setCustomerDebtFilter('debt');
                      setCurrentView('customers');
                    }}
                  >
                    Ver Deudores
                  </button>
                )}
              </div>

            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Vendido / Facturado</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${kpiRevenue.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Últimos {statsDays} días</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--brand-secondary)', padding: '12px', borderRadius: '12px' }}>
                  <Package size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Inversión Inventario</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${kpiInvestment.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capital activo en stock</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Ganancia Neta</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)' }}>${kpiProfit.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingresos - Inversión</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)', padding: '12px', borderRadius: '12px' }}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px' }}>Margen sobre Costo</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{kpiMargin.toFixed(1)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rentabilidad promedio</div>
                </div>
              </div>
            </div>

            {/* Financial SVG Charts */}
            <div className="card" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '24px' }}>Gráfico de Facturación y Ganancias ({statsDays} Días)</h2>
              {stats.chart && stats.chart.length > 0 ? (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg viewBox="0 0 900 320" style={{ width: '100%', height: '320px', minWidth: '600px' }}>
                    {(() => {
                      const maxVal = Math.max(...stats.chart.map(c => Math.max(c.ingresos, c.ganancias, 10)));
                      const pointsRevenue = stats.chart.map((c, i) => {
                        const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                        const y = 280 - (c.ingresos / maxVal) * 230;
                        return `${x},${y}`;
                      }).join(' ');

                      const pointsProfit = stats.chart.map((c, i) => {
                        const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                        const y = 280 - (c.ganancias / maxVal) * 230;
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <>
                          <line x1="50" y1="280" x2="880" y2="280" stroke="var(--border-color)" strokeWidth="1" />
                          <line x1="50" y1="165" x2="880" y2="165" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                          <line x1="50" y1="50" x2="880" y2="50" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                          
                          <polyline fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsRevenue} />
                          <polyline fill="none" stroke="var(--status-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsProfit} />

                          {stats.chart.map((c, i) => {
                            if (i % Math.ceil(stats.chart.length / 8) === 0 || i === stats.chart.length - 1) {
                              const x = 60 + (i / Math.max(stats.chart.length - 1, 1)) * 800;
                              return (
                                <text key={i} x={x} y="305" fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                                  {c.fecha.slice(5)}
                                </text>
                              );
                            }
                            return null;
                          })}
                          
                          <text x="40" y="55" fill="var(--text-muted)" fontSize="11" textAnchor="end">${maxVal.toFixed(0)}</text>
                          <text x="40" y="295" fill="var(--text-muted)" fontSize="11" textAnchor="end">$0</text>
                        </>
                      );
                    })()}
                  </svg>
                  
                  <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--brand-primary)' }}></span>
                      Ingresos Totales (Facturación)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-success)' }}></span>
                      Ganancia Neta
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  No hay datos registrados en este periodo de tiempo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. VIEW: INVENTORY (PRODUCT LIST / CRUD / CATEGORIES) */}
        {/* ======================================================== */}
        {currentView === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1>Gestión de Inventario</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Control de mercancía a la venta e insumos de gestión operativa</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
                  <Layers size={18} />
                  Gestionar Categorías
                </button>
                <button className="btn btn-primary" onClick={handleOpenAddProduct}>
                  <Plus size={18} />
                  Agregar Producto
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
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

            {/* Subcategory Filter Pills (if a category with subcategories is selected) */}
            {inventoryCategoryFilter !== 'all' && (() => {
              const activeCat = categories.find(c => c.name === inventoryCategoryFilter);
              if (activeCat && activeCat.subcategories.length > 0) {
                return (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}>Subcategoría:</span>
                    <button 
                      className={`badge ${inventorySubcategoryFilter === 'all' ? 'badge-success' : 'badge-warning'}`}
                      style={{ padding: '6px 12px', cursor: 'pointer', border: 'none' }}
                      onClick={() => setInventorySubcategoryFilter('all')}
                    >
                      Todas
                    </button>
                    {activeCat.subcategories.map(sub => (
                      <button 
                        key={sub.id}
                        className={`badge ${inventorySubcategoryFilter === sub.name ? 'badge-success' : 'badge-warning'}`}
                        style={{ padding: '6px 12px', cursor: 'pointer', border: 'none', opacity: inventorySubcategoryFilter === sub.name ? 1 : 0.6 }}
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
            <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar productos por nombre..." 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
              <button className="btn btn-secondary" onClick={fetchProducts} title="Actualizar">
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
                  const isManagement = product.is_for_sale === false;
                  
                  return (
                    <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: isManagement ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
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
                No se encontraron productos con los filtros seleccionados.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. VIEW: NUEVA VENTA (POS / CAJA) */}
        {/* ======================================================== */}
        {currentView === 'sale' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column: Product Picker with Category Filters */}
            <div>
              <h1>Caja / Registrar Venta</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Filtra y selecciona los artículos disponibles para la venta</p>
              
              {/* Category Pills for quick filtering */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
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

              {/* Subcategories (if selected category has any) */}
              {posCategoryFilter !== 'all' && (() => {
                const activeCat = categories.find(c => c.name === posCategoryFilter);
                if (activeCat && activeCat.subcategories.length > 0) {
                  return (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                {filteredPosProducts.map(p => (
                  <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                    {p.image_base64 ? (
                      <img src={p.image_base64} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        Sin Imagen
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>{p.category_name}</div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.9rem', margin: '2px 0' }}>{p.name}</h4>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-secondary)' }}>
                        ${(parseFloat(p.sale_price) + parseFloat(p.sale_extra)).toFixed(2)}
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
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
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
                          ${(parseFloat(item.sale_price) + parseFloat(item.sale_extra)).toFixed(2)} c/u
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Cliente</label>
                  <button 
                    type="button" 
                    onClick={handleOpenAddCustomer}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Nuevo Cliente
                  </button>
                </div>
                
                <select 
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCustomerId(id);
                    if (id) {
                      const cust = customers.find(c => c.id === parseInt(id));
                      if (cust) setClientName(cust.name);
                    }
                  }}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="">Consumidor Final / Manual</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.total_debt > 0 ? `(Debe: $${c.total_debt.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>

                {!selectedCustomerId && (
                  <input 
                    type="text" 
                    placeholder="Nombre del cliente o razón social" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="form-input"
                  />
                )}
              </div>

              {/* Payment Condition (Contado vs Fiao vs Abono Parcial) */}
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

          </div>
        )}

        {/* ======================================================== */}
        {/* 4. VIEW: CUSTOMERS & FIAO (CLIENTES Y DEUDAS) */}
        {/* ======================================================== */}
        {currentView === 'customers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1>Gestión de Clientes & Fiao</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Directorio de clientes, historial de compras y cuentas por cobrar</p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddCustomer}>
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

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: stats.kpis.total_receivables > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)', padding: '12px', borderRadius: '12px' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: '2px', color: 'var(--status-danger)' }}>Deuda Total en la Calle</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-danger)' }}>
                    ${stats.kpis.total_receivables.toFixed(2)}
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
                              onClick={() => fetchCustomerDetail(c.id)}
                            >
                              Ver Historial / Cobrar
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px' }}
                              onClick={() => handleOpenEditCustomer(c)}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px' }}
                              onClick={() => deleteCustomer(c.id)}
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
        )}

        {/* ======================================================== */}
        {/* 5. VIEW: HISTORY (HISTORIAL DE VENTAS) */}
        {/* ======================================================== */}
        {currentView === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1>Historial de Ventas</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Consulta las transacciones realizadas, estados de crédito y comprobantes</p>
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
                  Descargar Reporte ({statsDays} Días)
                </a>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Pago & Estado</th>
                    <th>Artículos</th>
                    <th>Total Facturado</th>
                    <th>Saldo</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length > 0 ? (
                    sales.map(sale => (
                      <tr key={sale.id}>
                        <td style={{ fontWeight: 'bold' }}>#{sale.id}</td>
                        <td>
                          <div>{new Date(sale.date).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{sale.client_name || 'Consumidor Final'}</div>
                          {sale.customer_id && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Cliente Registrado</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
                              {sale.payment_method}
                            </span>
                            {sale.payment_status === 'fiao' && (
                              <span className="badge badge-danger">FIAO</span>
                            )}
                            {sale.payment_status === 'parcial' && (
                              <span className="badge badge-warning">PARCIAL</span>
                            )}
                          </div>
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
                          <div>${(parseFloat(sale.total_revenue) || 0).toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Bs. {((parseFloat(sale.total_revenue) || 0) * (parseFloat(sale.dollar_rate) || dollarRate)).toFixed(2)}
                          </div>
                        </td>
                        <td>
                          {sale.amount_pending > 0 ? (
                            <div>
                              <span className="badge badge-danger">Debe: ${sale.amount_pending.toFixed(2)}</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '4px', width: '100%' }}
                                onClick={() => handleOpenPaymentModal(sale)}
                              >
                                + Abonar
                              </button>
                            </div>
                          ) : (
                            <span className="badge badge-success">Pagado</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <a 
                            href={`${API_URL}/api/sales/${sale.id}/invoice`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                          >
                            <FileText size={16} />
                            Factura
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No hay ventas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. VIEW: CONFIGURATION (MARCA BLANCA / TASA / BACKUP) */}
        {/* ======================================================== */}
        {currentView === 'config' && (
          <div style={{ maxWidth: '650px' }}>
            <h1>Personalización de Marca</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Define el nombre, logo, tasa de cambio y temas de tu negocio</p>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
          </div>
        )}

      </main>
    </div>

      {/* ======================================================== */}
      {/* MODAL: AGREGAR / EDITAR PRODUCTO */}
      {/* ======================================================== */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <form onSubmit={saveProduct} className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              />
            </div>

            {/* Categoría y Subcategoría */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Adicional ($)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={productForm.sale_extra}
                          onChange={(e) => setProductForm({ ...productForm, sale_extra: e.target.value })}
                          className="form-input" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Stock en Inventario</label>
                    <input 
                      type="number" 
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      required 
                      className="form-input" 
                    />
                  </div>
                </>
              );
            })()}

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
                  <img src={productForm.image_base64} alt="Preview" style={{ maxHeight: '80px', borderRadius: '6px' }} />
                  <br />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }} onClick={() => setProductForm({ ...productForm, image_base64: null })}>Quitar</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProductModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: GESTIÓN DE CATEGORÍAS Y SUBCATEGORÍAS */}
      {/* ======================================================== */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} />
                Categorías y Subcategorías
              </h2>
              <button className="mobile-toggle-btn" onClick={() => setShowCategoryModal(false)}>
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
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
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
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
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

            <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setShowCategoryModal(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AGREGAR / EDITAR CLIENTE */}
      {/* ======================================================== */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
          <form onSubmit={saveCustomer} className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCustomerModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FICHA DETALLADA DEL CLIENTE (HISTORIAL DE COMPRAS & FIAO) */}
      {/* ======================================================== */}
      {selectedCustomerDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '6px' }}>Ficha de Cliente</span>
                <h2 style={{ margin: 0 }}>{selectedCustomerDetail.customer.name}</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedCustomerDetail.customer.phone || 'Sin teléfono'} • {selectedCustomerDetail.customer.email || 'Sin correo'}
                </div>
              </div>
              <button className="mobile-toggle-btn" onClick={() => setSelectedCustomerDetail(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <div className="form-label" style={{ fontSize: '0.75rem' }}>Total Comprado</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>${selectedCustomerDetail.metrics.total_spent.toFixed(2)}</div>
              </div>

              <div style={{ 
                background: selectedCustomerDetail.metrics.total_debt > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                padding: '12px', 
                borderRadius: '8px',
                border: selectedCustomerDetail.metrics.total_debt > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
              }}>
                <div className="form-label" style={{ fontSize: '0.75rem', color: selectedCustomerDetail.metrics.total_debt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                  Deuda Pendiente (Fiao)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedCustomerDetail.metrics.total_debt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                  ${(parseFloat(selectedCustomerDetail.metrics.total_debt) || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Bs. {((parseFloat(selectedCustomerDetail.metrics.total_debt) || 0) * dollarRate).toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <div className="form-label" style={{ fontSize: '0.75rem' }}>Total Compras</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedCustomerDetail.metrics.sales_count}</div>
              </div>
            </div>

            {/* Sales & What they bought */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Historial de Compras y Pagos</h3>
              
              {selectedCustomerDetail.sales.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedCustomerDetail.sales.map(s => (
                    <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong>Venta #{s.id}</strong> • <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(s.date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge ${s.payment_status === 'pagado' ? 'badge-success' : s.payment_status === 'fiao' ? 'badge-danger' : 'badge-warning'}`}>
                            {s.payment_status.toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', marginLeft: '6px' }}>
                            ${s.total_revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items bought */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Artículos comprados:</div>
                        {s.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {it.product_name} x {it.quantity}</span>
                            <span style={{ color: 'var(--brand-secondary)' }}>${it.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Payment debt info & Abono Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          Pagado: <strong>${s.amount_paid.toFixed(2)}</strong> | 
                          Pendiente: <strong style={{ color: s.amount_pending > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                            ${s.amount_pending.toFixed(2)}
                          </strong>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {s.amount_pending > 0 && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleOpenPaymentModal(s)}
                            >
                              + Registrar Abono
                            </button>
                          )}
                          <a 
                            href={`${API_URL}/api/sales/${s.id}/invoice`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.8rem', textDecoration: 'none' }}
                          >
                            Factura
                          </a>
                        </div>
                      </div>

                      {/* Payments history */}
                      {s.payments && s.payments.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <div style={{ fontWeight: 600 }}>Abonos registrados:</div>
                          {s.payments.map(p => (
                            <div key={p.id}>
                              • ${p.amount.toFixed(2)} vía {p.payment_method} el {new Date(p.date).toLocaleDateString()} {p.payment_reference ? `(Ref: ${p.payment_reference})` : ''}
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Este cliente aún no registra compras.
                </div>
              )}
            </div>

            <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setSelectedCustomerDetail(null)}>
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR ABONO / PAGO A VENTA */}
      {/* ======================================================== */}
      {showPaymentModal && activeSaleForPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <form onSubmit={submitPayment} className="card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Registrar Abono a Venta #{activeSaleForPayment.id}</h2>
              <button className="mobile-toggle-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo pendiente actual:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-danger)' }}>
                ${(parseFloat(activeSaleForPayment.amount_pending) || 0).toFixed(2)} 
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  (Bs. {((parseFloat(activeSaleForPayment.amount_pending) || 0) * dollarRate).toFixed(2)})
                </span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Monto del Abono ($ USD) *</label>
              <input 
                type="number" 
                step="0.01"
                max={activeSaleForPayment.amount_pending}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required 
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Método de Pago</label>
              <select 
                className="form-select"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <option value="divisas">Divisas (Efectivo)</option>
                <option value="pagomovil">Pago Móvil</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="binance">Binance (USDT)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Referencia Bancaria (Opcional)</label>
              <input 
                type="text" 
                placeholder="N° de confirmación / referencia"
                value={paymentForm.payment_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                className="form-input" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nota o Comentario</label>
              <input 
                type="text" 
                placeholder="Ej. Abono parte 1 en efectivo"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="form-input" 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmittingPayment}>
                {isSubmittingPayment ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LIGHTBOX / ZOOM COMPROBANTE DE PAGO */}
      {/* ======================================================== */}
      {selectedCapture && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Comprobante de Pago</h3>
              
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
