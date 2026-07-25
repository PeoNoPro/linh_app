import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import LoginScreen from './pages/LoginScreen';
import Dashboard   from './pages/Dashboard';
import POS         from './pages/POS';
import Products    from './pages/Products';
import Orders      from './pages/Orders';
import Customers   from './pages/Customers';
import Finance     from './pages/Finance';
import Reminders   from './pages/Reminders';
import Reports     from './pages/Reports';

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Tổng quan',    section: 'Chính' },
  { id: 'pos',       icon: '🛒', label: 'Bán hàng',     section: 'Chính' },
  { id: 'orders',    icon: '📋', label: 'Đơn hàng',     section: 'Chính' },
  { id: 'products',  icon: '📦', label: 'Sản phẩm',     section: 'Danh mục' },
  { id: 'customers', icon: '👥', label: 'Khách hàng',   section: 'Danh mục' },
  { id: 'finance',   icon: '💳', label: 'Thu - Chi',    section: 'Tài chính' },
  { id: 'reports',   icon: '📈', label: 'Báo cáo',      section: 'Tài chính' },
  { id: 'reminders', icon: '⏰', label: 'Lịch nhắc',    section: 'Công cụ' },
];

function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <span>🛍️</span>
        LinhApp
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.electronAPI?.minimize()} title="Thu nhỏ">─</button>
        <button className="titlebar-btn" onClick={() => window.electronAPI?.maximize()} title="Phóng to">□</button>
        <button className="titlebar-btn close" onClick={() => window.electronAPI?.close()} title="Đóng">✕</button>
      </div>
    </div>
  );
}

function Sidebar({ activePage, onNavigate, user, onLogout, reminderCount }) {
  const sections = [...new Set(NAV.map(n => n.section))];

  return (
    <div className="sidebar">
      <div className="sidebar-user" onClick={onLogout} title="Nhấn để đổi tài khoản">
        <div className="user-avatar">{user?.display_name?.[0]?.toUpperCase() || '?'}</div>
        <div className="user-info">
          <div className="user-name">{user?.display_name}</div>
          <div className="user-role">@{user?.username} · Nhấn để đổi</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {NAV.filter(n => n.section === section).map(item => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.id === 'reminders' && reminderCount > 0 && (
                  <span className="nav-badge">{reminderCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          🔒 Offline · Dữ liệu lưu cục bộ
        </div>
      </div>
    </div>
  );
}

function PageRenderer({ page }) {
  switch (page) {
    case 'dashboard': return <Dashboard />;
    case 'pos':       return <POS />;
    case 'products':  return <Products />;
    case 'orders':    return <Orders />;
    case 'customers': return <Customers />;
    case 'finance':   return <Finance />;
    case 'reports':   return <Reports />;
    case 'reminders': return <Reminders />;
    default:          return <Dashboard />;
  }
}

export default function App() {
  const currentUser    = useStore(s => s.currentUser);
  const activePage     = useStore(s => s.activePage);
  const reminderCount  = useStore(s => s.reminderCount);
  const setActivePage  = useStore(s => s.setActivePage);
  const logout         = useStore(s => s.logout);

  // Listen for reminder notifications from main process
  useEffect(() => {
    if (window.electronAPI?.onReminderTriggered) {
      window.electronAPI.onReminderTriggered((reminder) => {
        // react-hot-toast notification
        import('react-hot-toast').then(({ default: toast }) => {
          toast(`⏰ ${reminder.title}`, { duration: 6000, icon: '🔔' });
        });
      });
    }
  }, []);

  if (!currentUser) return (
    <>
      <Titlebar />
      <LoginScreen />
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1a1d27', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', fontSize: '0.875rem' }
      }} />
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Titlebar />
      <div className="app-shell" style={{ flex: 1, overflow: 'hidden' }}>
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          user={currentUser}
          onLogout={logout}
          reminderCount={reminderCount}
        />
        <div className="main-content">
          <div className="page-content">
            <PageRenderer page={activePage} />
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1a1d27', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', fontSize: '0.875rem' }
      }} />
    </div>
  );
}
