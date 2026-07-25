import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import toast from 'react-hot-toast';

function CustomerForm({ customer, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: userId, code: '', name: '', phone: '', address: '', email: '', notes: '',
    ...(customer || {})
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng!'); return; }
    try {
      await window.electronAPI.saveCustomer(form);
      toast.success(customer ? 'Cập nhật thành công!' : 'Thêm khách hàng thành công!');
      onSave();
    } catch (err) { toast.error('Lỗi: ' + err.message); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-in">
        <div className="modal-header">
          <h2 className="modal-title">{customer ? '✏️ Sửa khách hàng' : '👤 Thêm khách hàng'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Tên khách hàng *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div className="form-group">
              <label className="form-label">Mã khách hàng</label>
              <input className="form-control" value={form.code} onChange={e => set('code', e.target.value)} placeholder="KH001" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0901234567" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Địa chỉ</label>
            <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, đường, quận..." />
          </div>
          <div className="form-group">
            <label className="form-label">Ghi chú</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Thông tin bổ sung..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Huỷ</button>
            <button type="submit" className="btn btn-primary">💾 Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const user = useStore(s => s.currentUser);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState('');
  const [editing, setEditing]     = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await window.electronAPI.getCustomers({ userId: user.id, search });
    setCustomers(data);
    setLoading(false);
  }, [user.id, search]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Xoá khách hàng này?')) return;
    await window.electronAPI.deleteCustomer(id);
    toast.success('Đã xoá khách hàng!');
    load();
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Khách hàng</h1>
          <div className="page-subtitle">{customers.length} khách hàng | Tổng nợ: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(customers.reduce((s, c) => s + c.debt_amount, 0))}</strong></div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Thêm mới</button>
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Tìm tên, SĐT, mã khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">Chưa có khách hàng</div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Thêm khách hàng</button>
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã KH</th>
                  <th>Tên khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Địa chỉ</th>
                  <th className="td-right">Công nợ</th>
                  <th>Ghi chú</th>
                  <th className="td-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td><span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.code || '—'}</span></td>
                    <td><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.email}</div></td>
                    <td>{c.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                    <td className="td-right">
                      {c.debt_amount > 0
                        ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(c.debt_amount)}</span>
                        : <span style={{ color: 'var(--success)' }}>✓ Không nợ</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{c.notes || '—'}</td>
                    <td className="td-center">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setEditing(c); setShowForm(true); }}>✏️</button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm customer={editing} userId={user.id}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
