import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function LoginScreen() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', display_name: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const setCurrentUser = useStore(s => s.setCurrentUser);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const list = await window.electronAPI.getUsers();
    setUsers(list);
    if (list.length === 0) setShowCreate(true);
  }

  async function handleLogin(user) {
    await window.electronAPI.updateUserLogin(user.id);
    setCurrentUser(user);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr('');
    if (!form.display_name.trim()) { setErr('Vui lòng nhập tên hiển thị!'); return; }
    if (!form.username.trim())     { setErr('Vui lòng nhập tên đăng nhập!'); return; }
    setLoading(true);
    try {
      const user = await window.electronAPI.createUser(form);
      await window.electronAPI.updateUserLogin(user.id);
      setCurrentUser(user);
    } catch (e) {
      setErr(e.message || 'Lỗi tạo tài khoản!');
    }
    setLoading(false);
  }

  async function handleDeleteUser(e, id) {
    e.stopPropagation();
    if (!confirm('Xóa tài khoản này? Toàn bộ dữ liệu sẽ bị xóa!')) return;
    await window.electronAPI.deleteUser(id);
    loadUsers();
  }

  return (
    <div className="login-screen">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🛍️</div>
          <h1 style={{ fontSize: '1.4rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LinhApp
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Quản lý bán hàng & thu chi offline</p>
        </div>

        {!showCreate ? (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600 }}>
              Chọn tài khoản để đăng nhập:
            </p>
            <div className="user-list">
              {users.map(u => (
                <button key={u.id} className="user-list-item" onClick={() => handleLogin(u)}>
                  <div className="user-avatar">{u.display_name?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>
                  <button
                    style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={(e) => handleDeleteUser(e, u.id)}
                    title="Xóa tài khoản"
                  >🗑️</button>
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary w-full mt-4"
              onClick={() => setShowCreate(true)}
              style={{ marginTop: 16 }}
            >+ Tạo tài khoản mới</button>
          </>
        ) : (
          <form onSubmit={handleCreate}>
            <h3 style={{ marginBottom: 20 }}>✨ Tạo tài khoản mới</h3>
            {err && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 14 }}>
                {err}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tên hiển thị *</label>
              <input className="form-control" placeholder="VD: Nguyễn Văn A" value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập *</label>
              <input className="form-control" placeholder="VD: nguyenvana" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {users.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreate(false); setErr(''); }}>
                  Quay lại
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? '⏳ Đang tạo...' : '🚀 Bắt đầu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
