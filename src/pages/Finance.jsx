import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import toast from 'react-hot-toast';

const TX_CATEGORIES = {
  income:  ['sale','service','other_income'],
  expense: ['purchase','salary','rent','utility','transport','other_expense'],
};
const CAT_LABELS = {
  sale: 'Bán hàng', service: 'Dịch vụ', other_income: 'Thu khác',
  purchase: 'Nhập hàng', salary: 'Lương', rent: 'Thuê mặt bằng',
  utility: 'Điện / Nước', transport: 'Vận chuyển', other_expense: 'Chi khác',
};

function TxForm({ tx, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: userId, type: 'expense', category: 'other_expense', amount: '',
    description: '', payment_method: 'cash', transaction_date: today(),
    ...(tx || {})
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Vui lòng nhập số tiền hợp lệ!'); return; }
    try {
      await window.electronAPI.saveTransaction({ ...form, amount: parseFloat(form.amount) });
      toast.success(tx ? 'Cập nhật thành công!' : `Đã ghi nhận ${form.type === 'income' ? 'khoản thu' : 'khoản chi'}!`);
      onSave();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-in">
        <div className="modal-header">
          <h2 className="modal-title">{tx ? '✏️ Sửa giao dịch' : '➕ Ghi nhận thu/chi'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Type tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['income','expense'].map(t => (
              <button key={t} type="button"
                className={`btn ${form.type === t ? (t === 'income' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { set('type', t); set('category', t === 'income' ? 'other_income' : 'other_expense'); }}>
                {t === 'income' ? '💰 Khoản Thu' : '💸 Khoản Chi'}
              </button>
            ))}
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Số tiền (₫) *</label>
              <input type="number" className="form-control" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Ngày</label>
              <input type="date" className="form-control" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Danh mục</label>
              <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                {TX_CATEGORIES[form.type].map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phương thức</label>
              <select className="form-control" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value="cash">💵 Tiền mặt</option>
                <option value="transfer">🏦 Chuyển khoản</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Mô tả giao dịch..." />
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

export default function Finance() {
  const user = useStore(s => s.currentUser);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter]     = useState('');
  const [dateFrom, setDateFrom]         = useState(today());
  const [dateTo, setDateTo]             = useState(today());
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await window.electronAPI.getTransactions({ userId: user.id, dateFrom, dateTo, type: typeFilter || undefined });
    setTransactions(data);
    setLoading(false);
  }, [user.id, dateFrom, dateTo, typeFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Xoá giao dịch này?')) return;
    await window.electronAPI.deleteTransaction(id);
    toast.success('Đã xoá giao dịch!');
    load();
  }

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">💳 Thu - Chi</h1>
          <div className="page-subtitle">
            Thu: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</strong> |
            Chi: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(totalExpense)}</strong> |
            Còn lại: <strong style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(balance)}</strong>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Ghi nhận
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {['', 'income', 'expense'].map(t => (
            <button key={t}
              className={`btn btn-sm ${typeFilter === t
                ? t === 'income' ? 'btn-success' : t === 'expense' ? 'btn-danger' : 'btn-primary'
                : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t)}>
              {t === '' ? 'Tất cả' : t === 'income' ? '💰 Thu' : '💸 Chi'}
            </button>
          ))}
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
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <div className="empty-title">Chưa có giao dịch</div>
            <div className="empty-desc">Ghi nhận các khoản thu chi phát sinh</div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Ghi nhận ngay</button>
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại</th>
                  <th>Danh mục</th>
                  <th>Mô tả</th>
                  <th>Phương thức</th>
                  <th className="td-right">Số tiền</th>
                  <th className="td-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(t.transaction_date)}</td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                        {t.type === 'income' ? '💰 Thu' : '💸 Chi'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{CAT_LABELS[t.category] || t.category}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.description || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {t.payment_method === 'cash' ? '💵 Tiền mặt' : '🏦 CK'}
                    </td>
                    <td className="td-right" style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                    </td>
                    <td className="td-center">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {!t.order_id && <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setEditing(t); setShowForm(true); }}>✏️</button>}
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(t.id)}>🗑️</button>
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
        <TxForm tx={editing} userId={user.id}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
