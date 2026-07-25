import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, today } from '../utils/helpers';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

function getMonthRange() {
  const d = new Date();
  d.setDate(1);
  return { from: d.toISOString().split('T')[0], to: today() };
}

export default function Reports() {
  const user = useStore(s => s.currentUser);
  const [dateFrom, setDateFrom] = useState(getMonthRange().from);
  const [dateTo, setDateTo]     = useState(getMonthRange().to);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);

  async function load() {
    setLoading(true);
    const res = await window.electronAPI.getReport({ userId: user.id, dateFrom, dateTo });
    setData(res);
    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const profit = data ? data.revenue - data.cost - data.expense : 0;
  const margin = data && data.revenue > 0 ? ((profit / data.revenue) * 100).toFixed(1) : 0;

  const chartData = data?.daily?.map(d => ({
    day: d.day?.slice(5),
    'Doanh thu': d.revenue,
    'Đã thu':    d.collected,
  })) || [];

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Báo cáo doanh thu</h1>
          <div className="page-subtitle">Thống kê theo khoảng thời gian</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => { const r = getMonthRange(); setDateFrom(r.from); setDateTo(r.to); }}>Tháng này</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : !data ? null : (
        <>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { icon: '💰', label: 'Tổng doanh thu', value: formatCurrency(data.revenue), gradient: 'linear-gradient(90deg,#10b981,#059669)', iconBg: 'rgba(16,185,129,0.15)' },
              { icon: '✅', label: 'Đã thu được',    value: formatCurrency(data.collected), gradient: 'linear-gradient(90deg,#3b82f6,#6366f1)', iconBg: 'rgba(59,130,246,0.15)' },
              { icon: '📦', label: 'Giá vốn hàng',   value: formatCurrency(data.cost),     gradient: 'linear-gradient(90deg,#f59e0b,#d97706)', iconBg: 'rgba(245,158,11,0.15)' },
              { icon: '💸', label: 'Chi phí khác',   value: formatCurrency(data.expense),  gradient: 'linear-gradient(90deg,#ef4444,#dc2626)', iconBg: 'rgba(239,68,68,0.15)' },
              { icon: '💎', label: 'Lợi nhuận',      value: formatCurrency(profit),        sub: `Biên lợi nhuận: ${margin}%`, gradient: 'linear-gradient(90deg,#8b5cf6,#6366f1)', iconBg: 'rgba(139,92,246,0.15)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ '--gradient': s.gradient }}>
                <div className="stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.25rem' }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: '0.72rem', color: profit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div className="chart-title">📈 Doanh thu theo ngày</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={v => formatCurrency(v)}
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: '0.8rem' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend />
                  <Bar dataKey="Doanh thu" fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="Đã thu"    fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 60 }}>
                <div className="empty-icon">📊</div>
                <div className="empty-desc">Chưa có đơn hàng trong khoảng thời gian này</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
