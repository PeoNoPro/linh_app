import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, today } from '../utils/helpers';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function StatCard({ icon, label, value, sub, gradient, iconBg }) {
  return (
    <div className="stat-card" style={{ '--gradient': gradient }}>
      <div className="stat-icon" style={{ background: iconBg || 'var(--brand-light)' }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const user = useStore(s => s.currentUser);
  const [data, setData] = useState(null);
  const [dateFilter, setDateFilter] = useState(today());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [dateFilter]);

  async function loadData() {
    setLoading(true);
    const res = await window.electronAPI.getDashboard({ userId: user.id, date: dateFilter });
    setData(res);
    setLoading(false);
  }

  const chartData = useMemo(() => {
    if (!data?.last7Days) return [];
    return data.last7Days.map(d => ({
      day: d.day?.slice(5),  // MM-DD
      revenue: d.revenue,
      collected: d.collected,
    }));
  }, [data]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</span>
    </div>
  );

  const { todayOrders, todayIncome, todayExpense, totalDebt, lowStock, topProducts } = data;
  const profit = todayIncome.total - todayExpense.total;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Tổng quan</h1>
          <div className="page-subtitle">Xin chào, <strong>{user.display_name}</strong>!</div>
        </div>
        <input
          type="date"
          className="form-control"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ width: 'auto' }}
        />
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <StatCard icon="🛍️" label="Đơn hàng hôm nay" value={todayOrders.count}
          sub={`${todayOrders.count} đơn`}
          gradient="linear-gradient(90deg, #6366f1, #8b5cf6)" iconBg="rgba(99,102,241,0.15)" />
        <StatCard icon="💰" label="Doanh thu hôm nay" value={formatCurrency(todayOrders.revenue)}
          gradient="linear-gradient(90deg, #10b981, #059669)" iconBg="rgba(16,185,129,0.15)" />
        <StatCard icon="✅" label="Đã thu" value={formatCurrency(todayOrders.collected)}
          gradient="linear-gradient(90deg, #3b82f6, #6366f1)" iconBg="rgba(59,130,246,0.15)" />
        <StatCard icon="📉" label="Chi phí hôm nay" value={formatCurrency(todayExpense.total)}
          gradient="linear-gradient(90deg, #ef4444, #dc2626)" iconBg="rgba(239,68,68,0.15)" />
        <StatCard icon="💎" label="Lợi nhuận" value={formatCurrency(profit)}
          sub={profit >= 0 ? '↑ Có lãi' : '↓ Lỗ'}
          gradient="linear-gradient(90deg, #f59e0b, #d97706)" iconBg="rgba(245,158,11,0.15)" />
        <StatCard icon="⚠️" label="Tổng công nợ" value={formatCurrency(totalDebt.total)}
          gradient="linear-gradient(90deg, #f59e0b, #ef4444)" iconBg="rgba(245,158,11,0.15)" />
      </div>

      {/* ── Charts ── */}
      <div className="charts-grid" style={{ marginBottom: 20 }}>
        <div className="chart-card">
          <div className="chart-title">📈 Doanh thu 7 ngày gần nhất</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: '0.8rem' }} labelStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" name="Doanh thu" />
                <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fill="none" name="Đã thu" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">📊</div>
              <div className="empty-desc">Chưa có dữ liệu</div>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">🏆 Top sản phẩm bán chạy</div>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, background: COLORS[i], borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, color: 'white' }}>{i+1}</span>
                  <span style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>x{p.qty}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-desc">Chưa có dữ liệu 30 ngày</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Low Stock Alert ── */}
      {lowStock.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span>⚠️</span>
            <strong style={{ color: 'var(--warning)' }}>Cảnh báo tồn kho thấp ({lowStock.length} sản phẩm)</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {lowStock.map(p => (
              <div key={p.id} style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: '0.8rem' }}>
                <strong>{p.name}</strong> – còn <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{p.stock_qty} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
