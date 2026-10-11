import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './ToastContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { showToast, toast } = useToast();
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

  // Cash & Balance
  const [cashBalance, setCashBalance] = useState({
    balance: 0,
    total_in: 0,
    total_out: 0,
    can_withdraw: false
  });
  const [cashMovements, setCashMovements] = useState([]);

  const applyTheme = (cfg) => {
    if (!cfg) return;
    const color = cfg.color_primary || '#6366f1';
    document.documentElement.style.setProperty('--brand-primary', color);
    document.documentElement.style.setProperty('--brand-secondary', `${color}cc`);
    document.documentElement.style.setProperty('--brand-primary-glow', `${color}22`);

    if (cfg.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  // Fetch functions
  const fetchConfig = async () => {
    try {
      const data = await api.getConfig();
      const sanitized = {
        ...data,
        dollar_rate: parseFloat(data.dollar_rate) || 45.00
      };
      setConfig(sanitized);
      applyTheme(sanitized);
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSales = async () => {
    try {
      const data = await api.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchStats = async (days = statsDays) => {
    try {
      const data = await api.getStats(days);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCash = async () => {
    try {
      const [dataBal, dataMov] = await Promise.all([
        api.getCashBalance(),
        api.getCashMovements()
      ]);
      setCashBalance({
        balance: parseFloat(dataBal.balance) || 0,
        total_in: parseFloat(dataBal.total_in) || 0,
        total_out: parseFloat(dataBal.total_out) || 0,
        can_withdraw: Boolean(dataBal.can_withdraw)
      });
      setCashMovements(dataMov);
    } catch (err) {
      console.error('Error fetching cash data:', err);
    }
  };

  const refreshAll = () => {
    fetchConfig();
    fetchProducts();
    fetchSales();
    fetchCategories();
    fetchCustomers();
    fetchStats();
    fetchCash();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    fetchStats(statsDays);
  }, [statsDays]);

  const value = {
    config,
    setConfig,
    products,
    setProducts,
    sales,
    setSales,
    categories,
    setCategories,
    customers,
    setCustomers,
    stats,
    setStats,
    statsDays,
    setStatsDays,
    cashBalance,
    setCashBalance,
    cashMovements,
    setCashMovements,
    fetchConfig,
    fetchProducts,
    fetchSales,
    fetchCategories,
    fetchCustomers,
    fetchStats,
    fetchCash,
    fetchCashData: fetchCash,
    applyTheme,
    refreshAll,
    showToast,
    toast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
