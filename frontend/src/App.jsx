import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { api } from './services/api';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Views
import DashboardView from './views/DashboardView';
import InventoryView from './views/InventoryView';
import PosView from './views/PosView';
import CustomersView from './views/CustomersView';
import HistoryView from './views/HistoryView';
import ConfigView from './views/ConfigView';

// Modals
import ProductModal from './components/modals/ProductModal';
import AddStockModal from './components/modals/AddStockModal';
import CategoryModal from './components/modals/CategoryModal';
import CustomerModal from './components/modals/CustomerModal';
import CustomerDetailModal from './components/modals/CustomerDetailModal';
import PaymentModal from './components/modals/PaymentModal';
import WithdrawModal from './components/modals/WithdrawModal';
import DepositModal from './components/modals/DepositModal';
import CaptureLightboxModal from './components/modals/CaptureLightboxModal';

function MainApp() {
  const { config } = useApp();

  // Navigation state
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeSaleForPayment, setActiveSaleForPayment] = useState(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  const [selectedCapture, setSelectedCapture] = useState(null);
  const [customerDebtFilter, setCustomerDebtFilter] = useState('all');

  // Customer Detail fetcher
  const handleViewCustomerDetail = async (customerOrId) => {
    const customerId = typeof customerOrId === 'object' && customerOrId !== null
      ? customerOrId.id
      : customerOrId;

    if (!customerId) return;

    try {
      const detail = await api.getCustomerDetail(customerId);
      if (detail && detail.customer) {
        setSelectedCustomerDetail(detail);
      } else {
        alert('No se pudo cargar la ficha del cliente.');
      }
    } catch (err) {
      console.error('Error fetching customer detail:', err);
      alert('Error de conexión al cargar la ficha del cliente.');
    }
  };

  // Callback when payment succeeds
  const handlePaymentSuccess = async () => {
    if (selectedCustomerDetail?.customer?.id) {
      try {
        const detail = await api.getCustomerDetail(selectedCustomerDetail.customer.id);
        setSelectedCustomerDetail(detail);
      } catch (err) {
        console.error('Error updating customer detail after payment:', err);
      }
    }
  };

  return (
    <div className="app-container">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />

      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      <main className="main-content">
        {currentView === 'dashboard' && (
          <DashboardView 
            onOpenWithdraw={() => setShowWithdrawModal(true)}
            onOpenDeposit={() => setShowDepositModal(true)}
            onNavigateToCustomersWithDebt={() => {
              setCustomerDebtFilter('with_debt');
              setCurrentView('customers');
            }}
          />
        )}

        {currentView === 'inventory' && (
          <InventoryView 
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            onOpenEditProduct={(prod) => {
              setEditingProduct(prod);
              setShowProductModal(true);
            }}
            onOpenAddStock={(prod) => {
              setSelectedStockProduct(prod);
              setShowAddStockModal(true);
            }}
            onOpenCategoryModal={() => setShowCategoryModal(true)}
          />
        )}

        {currentView === 'sale' && (
          <PosView 
            onOpenAddCustomer={() => {
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
          />
        )}

        {currentView === 'customers' && (
          <CustomersView 
            onOpenAddCustomer={() => {
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
            onOpenEditCustomer={(cust) => {
              setEditingCustomer(cust);
              setShowCustomerModal(true);
            }}
            onViewCustomerDetail={handleViewCustomerDetail}
            debtFilter={customerDebtFilter}
          />
        )}

        {currentView === 'history' && (
          <HistoryView 
            onOpenPaymentModal={(sale) => {
              setActiveSaleForPayment(sale);
              setShowPaymentModal(true);
            }}
            onViewCapture={(url) => setSelectedCapture(url)}
          />
        )}

        {currentView === 'config' && (
          <ConfigView />
        )}
      </main>

      {/* Standalone Modals */}
      <ProductModal 
        isOpen={showProductModal}
        editingProduct={editingProduct}
        onClose={() => setShowProductModal(false)}
      />

      <AddStockModal 
        isOpen={showAddStockModal}
        product={selectedStockProduct}
        onClose={() => {
          setShowAddStockModal(false);
          setSelectedStockProduct(null);
        }}
      />

      <CategoryModal 
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />

      <CustomerModal 
        isOpen={showCustomerModal}
        editingCustomer={editingCustomer}
        onClose={() => setShowCustomerModal(false)}
      />

      <CustomerDetailModal 
        customerDetail={selectedCustomerDetail}
        onClose={() => setSelectedCustomerDetail(null)}
        onOpenPayment={(sale) => {
          setActiveSaleForPayment(sale);
          setShowPaymentModal(true);
        }}
      />

      <PaymentModal 
        isOpen={showPaymentModal}
        sale={activeSaleForPayment}
        onClose={() => {
          setShowPaymentModal(false);
          setActiveSaleForPayment(null);
        }}
        onSuccess={handlePaymentSuccess}
      />

      <WithdrawModal 
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
      />

      <DepositModal 
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />

      <CaptureLightboxModal 
        selectedCapture={selectedCapture}
        onClose={() => setSelectedCapture(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
