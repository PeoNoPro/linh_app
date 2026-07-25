import React, { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../store/useStore';
import { calcOrder, formatCurrency, genOrderCode } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function POS() {
  const user = useStore(s => s.currentUser);
  const [products, setProducts]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [search, setSearch]         = useState('');
  const [cart, setCart]             = useState([]);
  const [customer, setCustomer]     = useState(null);
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [payMethod, setPayMethod]   = useState('cash');
  const [notes, setNotes]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [catFilter, setCatFilter]   = useState('');
  const [categories, setCategories] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const searchRef = useRef();

  useEffect(() => { loadProducts(); loadCategories(); loadCustomers(); }, []);

  async function loadProducts() {
    const prods = await window.electronAPI.getProducts({ userId: user.id, search: '', categoryId: null });
    setProducts(prods);
  }

  async function loadCategories() {
    const cats = await window.electronAPI.getCategories(user.id);
    setCategories(cats);
  }

  async function loadCustomers() {
    const c = await window.electronAPI.getCustomers({ userId: user.id, search: '' });
    setCustomers(c);
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    const matchCat = !catFilter || String(p.category_id) === String(catFilter);
    return matchSearch && matchCat;
  });

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch)
  );

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
          : i
        );
      }
      return [...prev, {
        product_id:   product.id,
        product_name: product.name,
        unit:         product.unit,
        unit_price:   product.sell_price,
        cost_price:   product.cost_price,
        quantity:     1,
        total_price:  product.sell_price,
      }];
    });
  }

  function updateQty(idx, val) {
    const q = parseFloat(val) || 0;
    if (q <= 0) { removeItem(idx); return; }
    setCart(prev => prev.map((item, i) =>
      i === idx ? { ...item, quantity: q, total_price: q * item.unit_price } : item
    ));
  }

  function updatePrice(idx, val) {
    const p = parseFloat(val) || 0;
    setCart(prev => prev.map((item, i) =>
      i === idx ? { ...item, unit_price: p, total_price: item.quantity * p } : item
    ));
  }

  function removeItem(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  function clearCart() {
    setCart([]); setCustomer(null); setDiscountValue(''); setPaidAmount(''); setNotes('');
    setCustomerSearch('');
  }

  const calc = calcOrder({
    items: cart,
    discountType,
    discountValue: parseFloat(discountValue) || 0,
    paidAmount: parseFloat(paidAmount) || 0,
  });

  async function handleConfirm() {
    if (cart.length === 0) { toast.error('Giỏ hàng đang trống!'); return; }
    setLoading(true);
    try {
      await window.electronAPI.saveOrder({
        userId: user.id,
        order: {
          customer_id:     customer?.id || null,
          order_code:      genOrderCode(),
          subtotal:        calc.subtotal,
          discount_amount: calc.discountAmount,
          total_amount:    calc.totalAmount,
          paid_amount:     calc.paid,
          change_amount:   calc.changeAmount,
          debt_amount:     calc.debtAmount,
          payment_method:  payMethod,
          status:          'completed',
          notes,
        },
        items: cart,
      });
      toast.success('✅ Đơn hàng đã lưu thành công!');
      clearCart();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="pos-layout" style={{ height: '100%', overflow: 'hidden' }}>
      {/* ── LEFT: Product Picker ── */}
      <div className="pos-products" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" style={{ width: '100%' }} placeholder="Tìm sản phẩm..."
              value={search} onChange={e => setSearch(e.target.value)} ref={searchRef} />
          </div>
          <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
            <option value="">Tất cả</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-icon">📦</div>
            <div className="empty-title">Không tìm thấy sản phẩm</div>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                <div className="product-card-name">{p.name}</div>
                <div className="product-card-price">{formatCurrency(p.sell_price)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="product-card-unit">/{p.unit}</span>
                  <span className="product-card-stock" style={{ color: p.stock_qty <= 5 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    Còn: {p.stock_qty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Cart ── */}
      <div className="pos-cart">
        <div className="cart-header">
          <span>🛒 Giỏ hàng ({cart.length})</span>
          {cart.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clearCart}>Xoá tất cả</button>
          )}
        </div>

        {/* Customer selector */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Khách hàng</div>
          <input
            className="form-control" style={{ fontSize: '0.8rem' }}
            placeholder={customer ? customer.name : '🔍 Tìm khách hàng...'}
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
            onFocus={() => setShowCustomerDrop(true)}
            onBlur={() => setTimeout(() => setShowCustomerDrop(false), 200)}
          />
          {customer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)' }}>✓ {customer.name}</span>
              {customer.phone && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{customer.phone}</span>}
              <button style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => { setCustomer(null); setCustomerSearch(''); }}>✕</button>
            </div>
          )}
          {showCustomerDrop && filteredCustomers.length > 0 && (
            <div style={{ position: 'absolute', left: 12, right: 12, top: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
              {filteredCustomers.slice(0, 10).map(c => (
                <div key={c.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem' }}
                  onMouseDown={() => { setCustomer(c); setCustomerSearch(''); setShowCustomerDrop(false); }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{c.phone}</span>
                  {c.debt_amount > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6, fontSize: '0.7rem' }}>Nợ: {formatCurrency(c.debt_amount)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-icon">🛒</div>
              <div className="empty-desc">Chọn sản phẩm để thêm vào giỏ</div>
            </div>
          ) : cart.map((item, idx) => (
            <div key={idx} className="cart-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cart-item-name">{item.product_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <input
                    type="number"
                    style={{ width: 72, padding: '3px 6px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none' }}
                    value={item.unit_price}
                    onChange={e => updatePrice(idx, e.target.value)}
                    title="Giá bán"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₫/{item.unit}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQty(idx, item.quantity - 1)}>−</button>
                  <input className="qty-input" type="number" value={item.quantity}
                    onChange={e => updateQty(idx, e.target.value)} min="0" />
                  <button className="qty-btn" onClick={() => updateQty(idx, item.quantity + 1)}>+</button>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(item.total_price)}</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, fontSize: '1rem' }}
                onClick={() => removeItem(idx)}>✕</button>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="cart-summary">
          {/* Discount */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>Chiết khấu:</span>
            <select className="form-control" style={{ flex: '0 0 80px', fontSize: '0.78rem', padding: '4px 6px' }}
              value={discountType} onChange={e => setDiscountType(e.target.value)}>
              <option value="amount">₫</option>
              <option value="percent">%</option>
            </select>
            <input type="number" className="form-control" style={{ flex: 1, fontSize: '0.82rem', padding: '4px 8px' }}
              placeholder="0" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
          </div>

          <div className="summary-row">
            <span>Tạm tính</span>
            <span>{formatCurrency(calc.subtotal)}</span>
          </div>
          {calc.discountAmount > 0 && (
            <div className="summary-row" style={{ color: 'var(--warning)' }}>
              <span>Chiết khấu</span>
              <span>−{formatCurrency(calc.discountAmount)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>TỔNG CỘNG</span>
            <span>{formatCurrency(calc.totalAmount)}</span>
          </div>

          {/* Payment */}
          <div style={{ display: 'flex', gap: 6, margin: '10px 0 4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>Tiền khách:</span>
            <input type="number" className="form-control" style={{ flex: 1, fontSize: '0.82rem', padding: '4px 8px' }}
              placeholder={formatCurrency(calc.totalAmount)} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
            <button className="btn btn-sm btn-secondary" style={{ flexShrink: 0, fontSize: '0.72rem' }}
              onClick={() => setPaidAmount(String(calc.totalAmount))}>Đủ</button>
          </div>

          {paidAmount && (
            <>
              {calc.changeAmount > 0 && (
                <div className="summary-row change">
                  <span>💵 Tiền thừa trả lại</span>
                  <span>{formatCurrency(calc.changeAmount)}</span>
                </div>
              )}
              {calc.debtAmount > 0 && (
                <div className="summary-row debt">
                  <span>⚠️ Còn thiếu (ghi nợ)</span>
                  <span>{formatCurrency(calc.debtAmount)}</span>
                </div>
              )}
            </>
          )}

          {/* Payment method */}
          <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
            {['cash','transfer','both'].map(m => (
              <button key={m}
                className={`btn btn-sm ${payMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.72rem' }}
                onClick={() => setPayMethod(m)}>
                {m === 'cash' ? '💵 Tiền mặt' : m === 'transfer' ? '🏦 Chuyển khoản' : '🔄 Kết hợp'}
              </button>
            ))}
          </div>

          <textarea className="form-control" style={{ fontSize: '0.78rem', padding: '6px 8px', marginBottom: 10, resize: 'none' }}
            rows={2} placeholder="Ghi chú đơn hàng..." value={notes} onChange={e => setNotes(e.target.value)} />

          <button className="btn btn-primary btn-lg w-full" onClick={handleConfirm} disabled={loading || cart.length === 0}>
            {loading ? '⏳ Đang lưu...' : '✅ Xác nhận & Lưu đơn'}
          </button>
        </div>
      </div>
    </div>
  );
}
