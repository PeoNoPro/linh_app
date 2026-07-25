import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import toast from 'react-hot-toast';

function OrderDetailModal({ orderId, onClose }) {
  const [detail, setDetail] = useState(null);
  const user = useStore(s => s.currentUser);

  useEffect(() => {
    window.electronAPI.getOrderDetail(orderId).then(setDetail);
  }, [orderId]);

  async function handleCancel() {
    if (!confirm('Huỷ đơn hàng này? Tồn kho sẽ được hoàn lại.')) return;
    await window.electronAPI.cancelOrder({ orderId, userId: user.id });
    toast.success('Đã huỷ đơn hàng!');
    onClose(true);
  }

  if (!detail) return (
    <div className="modal-overlay"><div className="modal"><div className="empty-state"><div className="spinner" /></div></div></div>
  );
  const { order, items } = detail;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="modal modal-lg animate-slide-in">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">📋 Đơn hàng {order.order_code}</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(order.order_date, true)}</div>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}>✕</button>
        </div>

        {order.customer_name && (
          <div style={{ background: 'var(--brand-light)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 16, fontSize: '0.85rem' }}>
            👤 Khách hàng: <strong>{order.customer_name}</strong>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Sản phẩm</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>SL</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Đơn giá</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={{ padding: '8px 0', fontSize: '0.875rem' }}>{item.product_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.unit})</span></td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.875rem' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '0.875rem' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Tạm tính</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}><span>Chiết khấu</span><span>−{formatCurrency(order.discount_amount)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
            <span>TỔNG CỘNG</span>
            <span style={{ color: 'var(--brand)' }}>{formatCurrency(order.total_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Đã thanh toán</span><span style={{ color: 'var(--success)' }}>{formatCurrency(order.paid_amount)}</span></div>
          {order.change_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Tiền thừa</span><span>{formatCurrency(order.change_amount)}</span></div>}
          {order.debt_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}><span>Còn nợ</span><span>{formatCurrency(order.debt_amount)}</span></div>}
        </div>

        {order.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📝 {order.notes}</div>}

        <div className="modal-footer">
          {order.status === 'completed' && (
            <button className="btn btn-danger" onClick={handleCancel}>Huỷ đơn hàng</button>
          )}
          <button className="btn btn-secondary" onClick={() => onClose(false)}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const user = useStore(s => s.currentUser);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo]     = useState(today());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await window.electronAPI.getOrders({ userId: user.id, dateFrom, dateTo, search });
    setOrders(data);
    setLoading(false);
  }, [user.id, dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue  = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);
  const totalCollected = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.paid_amount, 0);

  const statusBadge = (s) => {
    if (s === 'completed') return <span className="badge badge-success">✓ Hoàn thành</span>;
    if (s === 'cancelled') return <span className="badge badge-danger">✕ Đã huỷ</span>;
    return <span className="badge badge-default">{s}</span>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Lịch sử đơn hàng</h1>
          <div className="page-subtitle">{orders.length} đơn – Doanh thu: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</strong> | Đã thu: <strong style={{ color: 'var(--brand)' }}>{formatCurrency(totalCollected)}</strong></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Tìm mã đơn, khách hàng..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(today()); setDateTo(today()); }}>Hôm nay</button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            const d = new Date(); d.setDate(1);
            setDateFrom(d.toISOString().split('T')[0]);
            setDateTo(today());
          }}>Tháng này</button>
        </div>
      </div>

      <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">Không có đơn hàng</div>
            <div className="empty-desc">Trong khoảng thời gian được chọn</div>
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  <th>Khách hàng</th>
                  <th className="td-right">Tổng tiền</th>
                  <th className="td-right">Đã thu</th>
                  <th className="td-right">Còn nợ</th>
                  <th>TT Thanh toán</th>
                  <th>Trạng thái</th>
                  <th className="td-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--brand)' }}>{o.order_code}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(o.order_date, true)}</td>
                    <td>{o.customer_name || <span style={{ color: 'var(--text-muted)' }}>Khách lẻ</span>}</td>
                    <td className="td-right" style={{ fontWeight: 700 }}>{formatCurrency(o.total_amount)}</td>
                    <td className="td-right" style={{ color: 'var(--success)' }}>{formatCurrency(o.paid_amount)}</td>
                    <td className="td-right" style={{ color: o.debt_amount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {o.debt_amount > 0 ? formatCurrency(o.debt_amount) : '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {o.payment_method === 'cash' ? '💵 Tiền mặt' : o.payment_method === 'transfer' ? '🏦 CK' : '🔄 Kết hợp'}
                    </td>
                    <td>{statusBadge(o.status)}</td>
                    <td className="td-center">
                      <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setSelected(o.id)}>👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <OrderDetailModal orderId={selected} onClose={(reload) => { setSelected(null); if (reload) load(); }} />
      )}
    </div>
  );
}
