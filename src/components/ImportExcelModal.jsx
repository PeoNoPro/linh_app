import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const COLUMN_MAP = {
  name:       ['tên sp', 'tensanpham', 'tên sản phẩm', 'name', 'product', 'hàng hóa', 'hanghoá'],
  sku:        ['mã', 'masp', 'mã sp', 'sku', 'code', 'mã hàng'],
  unit:       ['đơn vị', 'donvi', 'dvt', 'unit', 'đvt'],
  cost_price: ['giá vốn', 'giavon', 'vốn', 'costprice', 'cost', 'giá nhập'],
  sell_price: ['giá bán', 'giaban', 'bán', 'sellprice', 'price', 'giá', 'đơn giá'],
  stock_qty:  ['tồn kho', 'tonkho', 'stock', 'quantity', 'tồn', 'sl tồn', 'số lượng tồn'],
};

function findCol(row, keys) {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.trim().toLowerCase() === k.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return null;
}

export default function ImportExcelModal({ userId, onClose, onSuccess }) {
  const [step, setStep]         = useState('select');
  const [rawData, setRawData]   = useState([]);
  const [headers, setHeaders]   = useState([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult]     = useState(null);
  const [errors, setErrors]     = useState([]);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '', blankrows: false });
    if (json.length === 0) { toast.error('File trống hoặc không có dữ liệu!'); return; }
    setHeaders(json.length > 0 ? Object.keys(json[0]) : []);
    setRawData(json);
    setStep('preview');
  }, []);

  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file);
    } else {
      toast.error('Chỉ hỗ trợ file .xlsx, .xls, .csv');
    }
  };

  const mapAndValidate = () => {
    const valid = [], errorList = [];
    rawData.forEach((row, idx) => {
      const name      = findCol(row, COLUMN_MAP.name);
      const sku       = findCol(row, COLUMN_MAP.sku) || '';
      const unit      = findCol(row, COLUMN_MAP.unit) || 'cái';
      const costRaw   = findCol(row, COLUMN_MAP.cost_price);
      const sellRaw   = findCol(row, COLUMN_MAP.sell_price);
      const stockRaw  = findCol(row, COLUMN_MAP.stock_qty);

      const cost_price  = parseFloat(String(costRaw).replace(/,/g, '')) || 0;
      const sell_price  = parseFloat(String(sellRaw).replace(/,/g, '')) || 0;
      const stock_qty   = parseFloat(String(stockRaw).replace(/,/g, '')) || 0;

      if (!name || !String(name).trim()) {
        errorList.push({ row: idx + 2, reason: 'Thiếu tên sản phẩm' });
        return;
      }
      if (sell_price < 0) {
        errorList.push({ row: idx + 2, reason: 'Giá bán không hợp lệ' });
        return;
      }
      valid.push({ user_id: userId, sku: String(sku).trim(), name: String(name).trim(), unit: String(unit).trim(), cost_price, sell_price, stock_qty });
    });
    return { valid, errorList };
  };

  const doImport = async (mode) => {
    const { valid, errorList } = mapAndValidate();
    if (valid.length === 0 && errorList.length > 0) {
      toast.error('Không có dòng hợp lệ để import!');
      return;
    }
    setStep('importing');
    try {
      const res = await window.electronAPI.importProducts({ userId, products: valid, mode, fileName });
      setErrors(errorList);
      setResult({ success: res.success, total: rawData.length, errorList });
      setStep('done');
      onSuccess?.();
      toast.success(`Import thành công ${res.success} sản phẩm!`);
    } catch (err) {
      toast.error('Lỗi import: ' + err.message);
      setStep('preview');
    }
  };

  const [modeStep, setModeStep] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const handleModeSelect = (mode) => {
    if (mode === 'replace') {
      setPendingMode('replace');
      setModeStep(true);
    } else {
      doImport('append');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-slide-in">
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'select'    && '📥 Import từ Excel'}
            {step === 'preview'   && '👁️ Preview dữ liệu'}
            {step === 'mode'      && '⚙️ Chọn chế độ nhập'}
            {step === 'importing' && '⏳ Đang nhập dữ liệu...'}
            {step === 'done'      && '✅ Hoàn thành'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── STEP 1: Select File ── */}
        {step === 'select' && (
          <div>
            <label
              className={`import-drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} style={{ display:'none' }} />
              <div className="import-drop-icon">📂</div>
              <strong style={{ fontSize: '1rem' }}>Nhấn để chọn file hoặc kéo thả vào đây</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hỗ trợ: .xlsx, .xls, .csv</span>
            </label>

            <div className="hint-box mt-4">
              <strong>📋 Định dạng cột được nhận diện tự động:</strong><br/>
              <span style={{ fontFamily: 'monospace' }}>Tên SP | Mã | Đơn vị | Giá vốn | Giá bán | Tồn kho</span><br/>
              <span style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>Hệ thống tự nhận cả tên cột tiếng Việt lẫn tiếng Anh.</span>
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 'preview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                📄 {fileName}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {rawData.length} dòng dữ liệu
              </span>
            </div>
            <div className="preview-table-wrap" style={{ marginBottom: 16 }}>
              <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 30).map((row, i) => (
                    <tr key={i}>{headers.map(h => <td key={h}>{String(row[h])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawData.length > 30 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>... và {rawData.length - 30} dòng nữa</p>}
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setStep('select')}>← Chọn lại file</button>
              <button className="btn btn-primary" onClick={() => setStep('mode')}>Tiếp tục →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Mode ── */}
        {step === 'mode' && !modeStep && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
              Bạn muốn nhập <strong style={{ color: 'var(--text-primary)' }}>{rawData.length} sản phẩm</strong> này như thế nào?
            </p>
            <div className="mode-cards">
              <button className="mode-card" onClick={() => handleModeSelect('append')}>
                <div className="mode-card-icon">➕</div>
                <h4>Thêm vào danh sách hiện có</h4>
                <p>Giữ nguyên sản phẩm cũ, bổ sung thêm sản phẩm mới từ file</p>
              </button>
              <button className="mode-card mode-card-danger" onClick={() => handleModeSelect('replace')}>
                <div className="mode-card-icon">🔄</div>
                <h4>Thay thế toàn bộ</h4>
                <p>Xóa hết danh sách cũ và nhập lại toàn bộ từ file Excel</p>
              </button>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setStep('preview')}>← Quay lại</button>
            </div>
          </div>
        )}

        {/* ── STEP 3b: Confirm Replace ── */}
        {step === 'mode' && modeStep && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'var(--danger)', marginBottom: 10 }}>Xác nhận thay thế danh sách</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              Thao tác này sẽ <strong style={{ color: 'var(--danger)' }}>XÓA TOÀN BỘ</strong> danh sách sản phẩm hiện tại<br/>
              và thay thế bằng <strong>{rawData.length} sản phẩm</strong> từ file.<br/>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dữ liệu cũ sẽ không thể khôi phục!</span>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setModeStep(false); setPendingMode(null); }}>
                Không, quay lại
              </button>
              <button className="btn btn-danger" onClick={() => doImport('replace')}>
                Có, xóa và thay thế ngay
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Importing ── */}
        {step === 'importing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Đang nhập dữ liệu vào cơ sở dữ liệu...</p>
          </div>
        )}

        {/* ── STEP 5: Done ── */}
        {step === 'done' && result && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
            </div>
            <div className="result-stats">
              <div className="result-stat" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                <div className="result-stat-value" style={{ color: 'var(--success)' }}>{result.success}</div>
                <div className="result-stat-label">✅ Thành công</div>
              </div>
              <div className="result-stat" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                <div className="result-stat-value" style={{ color: 'var(--danger)' }}>{result.errorList.length}</div>
                <div className="result-stat-label">❌ Lỗi / Bỏ qua</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value">{result.total}</div>
                <div className="result-stat-label">📊 Tổng dòng</div>
              </div>
            </div>
            {result.errorList.length > 0 && (
              <details style={{ marginTop: 14, fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--warning)', fontWeight: 600 }}>
                  Xem {result.errorList.length} dòng lỗi
                </summary>
                <ul style={{ listStyle: 'none', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {result.errorList.map((e, i) => (
                    <li key={i} style={{ background: 'var(--danger-bg)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}>
                      Dòng {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 16 }}>
              <button className="btn btn-primary w-full" onClick={onClose}>Đóng</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
