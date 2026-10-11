export const API_URL = window.location.port === '5173' 
  ? `http://${window.location.hostname}:8000` 
  : `${window.location.protocol}//${window.location.host}`;

export const api = {
  // Config
  getConfig: () => fetch(`${API_URL}/api/config`).then(r => r.json()),
  updateConfig: (data) => fetch(`${API_URL}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Products
  getProducts: () => fetch(`${API_URL}/api/products`).then(r => r.json()),
  createProduct: (data) => fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateProduct: (id, data) => fetch(`${API_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteProduct: (id) => fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' }),
  addProductStock: (id, data) => fetch(`${API_URL}/api/products/${id}/add-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Categories
  getCategories: () => fetch(`${API_URL}/api/categories`).then(r => r.json()),
  createCategory: (data) => fetch(`${API_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  createSubcategory: (categoryId, data) => fetch(`${API_URL}/api/categories/${categoryId}/subcategories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteCategory: (id) => fetch(`${API_URL}/api/categories/${id}`, { method: 'DELETE' }),
  deleteSubcategory: (id) => fetch(`${API_URL}/api/subcategories/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => fetch(`${API_URL}/api/customers`).then(r => r.json()),
  getCustomerDetail: (id) => fetch(`${API_URL}/api/customers/${id}`).then(r => r.json()),
  createCustomer: (data) => fetch(`${API_URL}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateCustomer: (id, data) => fetch(`${API_URL}/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteCustomer: (id) => fetch(`${API_URL}/api/customers/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (limit = null, offset = 0) => {
    const params = new URLSearchParams();
    if (limit !== null) params.append('limit', limit);
    if (offset > 0) params.append('offset', offset);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${API_URL}/api/sales${qs}`).then(r => r.json());
  },
  getSaleCapture: (saleId) => fetch(`${API_URL}/api/sales/${saleId}/capture`).then(r => r.json()),
  createSale: (data) => fetch(`${API_URL}/api/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  addSalePayment: (saleId, data) => fetch(`${API_URL}/api/sales/${saleId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  voidSale: (saleId, data = {}) => fetch(`${API_URL}/api/sales/${saleId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Stats
  getStats: (days = 30) => fetch(`${API_URL}/api/stats?days=${days}`).then(r => r.json()),

  // Cash
  getCashBalance: () => fetch(`${API_URL}/api/cash/balance`).then(r => r.json()),
  getCashMovements: (limit = null, offset = 0) => {
    const params = new URLSearchParams();
    if (limit !== null) params.append('limit', limit);
    if (offset > 0) params.append('offset', offset);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${API_URL}/api/cash/movements${qs}`).then(r => r.json());
  },
  withdrawCash: (data) => fetch(`${API_URL}/api/cash/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  depositCash: (data) => fetch(`${API_URL}/api/cash/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),

  // Maintenance & Backup
  restoreDatabase: (formData) => fetch(`${API_URL}/api/restore`, {
    method: 'POST',
    body: formData
  }),
  resetStockAndHistory: () => fetch(`${API_URL}/api/maintenance/reset-stock-and-history`, {
    method: 'POST'
  })
};
