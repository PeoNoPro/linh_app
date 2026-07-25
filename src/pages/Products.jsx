import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import ImportExcelModal from '../components/ImportExcelModal';
import toast from 'react-hot-toast';

const UNITS = ['cái', 'chiếc', 'kg', 'g', 'lít', 'ml', 'hộp', 'túi', 'thùng', 'bộ', 'đôi', 'cuộn', 'tờ', 'quyển'];

function ProductForm({ product, categories, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    user_id: userId, sku: '', name: '', unit: 'cái', cost_price: '', sell_price: '',
    stock_qty: '', min_stock_qty: '', category_id: '', description: '',
    ...(product || {})
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên sản phẩm!'); return; }
    try {
      await window.electronAPI.saveProduct({
        ...form,
        cost_price:  parseFloat(form.cost_price)  || 0,
        sell_price:  parseFloat(form.sell_price)   || 0,
        stock_qty:   parseFloat(form.stock_qty)    || 0,
        min_stock_qty: parseFloat(form.min_stock_qty) || 0,
        category_id: form.category_id || null,
      });
      toast.success(product ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
      onSave();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-in">
        <div className="modal-header">
          <h2 className="modal-title">{product ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Tên sản phẩm *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Áo thun nam" />
            </div>
            <div className="form-group">
              <label className="form-label">Mã sản phẩm (SKU)</label>
              <input className="form-control" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="VD: ATN001" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Đơn vị</label>
              <select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Danh mục</label>
              <select className="form-control" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">-- Không có --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Giá vốn (₫)</label>
              <input type="number" className="form-control" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Giá bán (₫)</label>
              <input type="number" className="form-control" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} placeholder="0" min="0" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Tồn kho hiện tại</label>
              <input type="number" className="form-control" value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Cảnh báo tồn thấp</label>
              <input type="number" className="form-control" value={form.min_stock_qty} onChange={e => set('min_stock_qty', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Mô tả ngắn..." />
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

export default function Products() {
  const user = useStore(s => s.currentUser);
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [editing, setEditing]       = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([
      window.electronAPI.getProducts({ userId: user.id, search, categoryId: catFilter || null }),
      window.electronAPI.getCategories(user.id),
    ]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  }, [user.id, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Xoá sản phẩm này?')) return;
    await window.electronAPI.deleteProduct(id);
    toast.success('Đã xoá sản phẩm!');
    load();
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Sản phẩm</h1>
          <div className="page-subtitle">{products.length} sản phẩm trong kho</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            📥 Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Thêm mới
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Tìm tên, mã sản phẩm..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 150 }}>
            <option value="">Tất cả danh mục</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Chưa có sản phẩm</div>
            <div className="empty-desc">Thêm sản phẩm mới hoặc import từ Excel</div>
            <button className="btn btn-primary" onClick={() => setShowImport(true)}>📥 Import Excel</button>
          </div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th className="td-right">Giá vốn</th>
                  <th className="td-right">Giá bán</th>
                  <th className="td-right">Tồn kho</th>
                  <th className="td-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.sku || '—'}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                    </td>
                    <td>
                      {p.category_name
                        ? <span className="tag" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>{p.category_name}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.unit}</td>
                    <td className="td-right" style={{ color: 'var(--text-muted)' }}>{formatCurrency(p.cost_price)}</td>
                    <td className="td-right" style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.sell_price)}</td>
                    <td className="td-right">
                      <span style={{ color: p.stock_qty <= p.min_stock_qty && p.min_stock_qty > 0 ? 'var(--warning)' : 'var(--text-primary)', fontWeight: 600 }}>
                        {p.stock_qty} {p.unit}
                      </span>
                    </td>
                    <td className="td-center">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-icon btn-secondary btn-sm" title="Sửa"
                          onClick={() => { setEditing(p); setShowForm(true); }}>✏️</button>
                        <button className="btn btn-icon btn-danger btn-sm" title="Xoá"
                          onClick={() => handleDelete(p.id)}>🗑️</button>
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
        <ProductForm product={editing} categories={categories} userId={user.id}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)} />
      )}

      {showImport && (
        <ImportExcelModal userId={user.id}
          onClose={() => setShowImport(false)}
          onSuccess={load} />
      )}
    </div>
  );
}
