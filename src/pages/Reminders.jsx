import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { formatDate, today } from '../utils/helpers';
import toast from 'react-hot-toast';

const TYPE_ICONS = { payment: '💳', delivery: '🚚', general: '📝' };
const TYPE_LABELS = { payment: 'Thanh toán', delivery: 'Giao hàng', general: 'Ghi chú' };

function ReminderForm({ reminder, customers, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: userId, customer_id: '', title: '', description: '',
    reminder_type: 'general', due_datetime: new Date().toISOString().slice(0, 16),
    ...(reminder ? { ...reminder, due_datetime: (reminder.due_datetime || '').slice(0, 16) } : {})
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())    { toast.error('Vui lòng nhập tiêu đề!'); return; }
    if (!form.due_datetime)    { toast.error('Vui lòng chọn thời gian!'); return; }
    try {
      await window.electronAPI.saveReminder({ ...form, customer_id: form.customer_id || null });
      toast.success(reminder ? 'Cập nhật thành công!' : 'Đã tạo nhắc nhở!');
      onSave();
    } catch (err) { toast.error('Lỗi: ' + err.message); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-in">
        <div className="modal-header">
          <h2 className="modal-title">{reminder ? '✏️ Sửa nhắc nhở' : '⏰ Thêm nhắc nhở'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tiêu đề *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Nhắc thu tiền anh Nam" />
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Loại nhắc nhở</label>
              <select className="form-control" value={form.reminder_type} onChange={e => set('reminder_type', e.target.value)}>
                <option value="general">📝 Ghi chú</option>
                <option value="payment">💳 Thanh toán</option>
                <option value="delivery">🚚 Giao hàng</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Thời gian nhắc *</label>
              <input type="datetime-local" className="form-control" value={form.due_datetime} onChange={e => set('due_datetime', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Liên quan đến khách hàng</label>
            <select className="form-control" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
              <option value="">-- Không liên quan --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ghi chú thêm</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Chi tiết về công việc cần nhớ..." />
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

export default function Reminders() {
  const user = useStore(s => s.currentUser);
  const setReminderCount = useStore(s => s.setReminderCount);
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing]     = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [filter, setFilter]       = useState('active');
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      window.electronAPI.getReminders(user.id),
      window.electronAPI.getCustomers({ userId: user.id, search: '' }),
    ]);
    setReminders(r);
    setCustomers(c);
    const activeCount = r.filter(x => !x.is_completed).length;
    setReminderCount(activeCount);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function handleComplete(id) {
    await window.electronAPI.completeReminder(id);
    toast.success('Đã đánh dấu hoàn thành!');
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Xoá nhắc nhở này?')) return;
    await window.electronAPI.deleteReminder(id);
    toast.success('Đã xoá nhắc nhở!');
    load();
  }

  const now = new Date();

  function getReminderStatus(r) {
    if (r.is_completed) return 'completed';
    const due = new Date(r.due_datetime);
    if (due < now) return 'overdue';
    const diff = (due - now) / (1000 * 60 * 60);
    if (diff < 24) return 'due-soon';
    return 'active';
  }

  const filtered = reminders.filter(r => {
    const s = getReminderStatus(r);
    if (filter === 'active')    return !r.is_completed;
    if (filter === 'completed') return r.is_completed;
    if (filter === 'overdue')   return s === 'overdue';
    return true;
  });

  const overdueCount = reminders.filter(r => getReminderStatus(r) === 'overdue').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⏰ Lịch & Nhắc nhở</h1>
          <div className="page-subtitle">
            {reminders.filter(r => !r.is_completed).length} việc chờ xử lý
            {overdueCount > 0 && <strong style={{ color: 'var(--danger)', marginLeft: 8 }}>⚠️ {overdueCount} quá hạn!</strong>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Thêm nhắc nhở</button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          {[['all','Tất cả'],['active','Chờ xử lý'],['overdue','Quá hạn'],['completed','Đã xong']].map(([val, label]) => (
            <button key={val}
              className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(val)}
              style={{ position: 'relative' }}>
              {label}
              {val === 'overdue' && overdueCount > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: 'white', fontSize: '0.6rem', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⏰</div>
          <div className="empty-title">Không có nhắc nhở nào</div>
          <div className="empty-desc">Tạo nhắc nhở để theo dõi công việc</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Tạo nhắc nhở</button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const status = getReminderStatus(r);
            const due = new Date(r.due_datetime);
            return (
              <div key={r.id} className={`reminder-item ${status}`}>
                <div className="reminder-dot" style={{
                  background: status === 'overdue' ? 'var(--danger)' : status === 'due-soon' ? 'var(--warning)' : status === 'completed' ? 'var(--success)' : 'var(--brand)'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span>{TYPE_ICONS[r.reminder_type]}</span>
                    <strong style={{ fontSize: '0.9rem', textDecoration: r.is_completed ? 'line-through' : 'none' }}>{r.title}</strong>
                    <span className="badge" style={{ background: status === 'overdue' ? 'var(--danger-bg)' : status === 'due-soon' ? 'var(--warning-bg)' : 'var(--bg-elevated)', color: status === 'overdue' ? 'var(--danger)' : status === 'due-soon' ? 'var(--warning)' : 'var(--text-muted)', fontSize: '0.65rem' }}>
                      {status === 'overdue' ? '🔴 Quá hạn' : status === 'due-soon' ? '🟡 Sắp đến' : status === 'completed' ? '✅ Xong' : '🟢 Sắp tới'}
                    </span>
                  </div>
                  {r.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{r.description}</p>}
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>⏱ {formatDate(r.due_datetime, true)}</span>
                    {r.customer_name && <span>👤 {r.customer_name}</span>}
                    <span>{TYPE_LABELS[r.reminder_type]}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {!r.is_completed && (
                    <button className="btn btn-icon btn-success btn-sm" title="Đánh dấu hoàn thành" onClick={() => handleComplete(r.id)}>✓</button>
                  )}
                  <button className="btn btn-icon btn-secondary btn-sm" title="Sửa" onClick={() => { setEditing(r); setShowForm(true); }}>✏️</button>
                  <button className="btn btn-icon btn-danger btn-sm" title="Xoá" onClick={() => handleDelete(r.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ReminderForm reminder={editing} customers={customers} userId={user.id}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
