const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { getDB, initializeSchema } = require('./database/db');

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    frame: false,           // Custom titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f1117',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  initializeSchema();
  createWindow();
  startReminderChecker();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ═══════════════════════════════════════════════════════════════
// IPC: Window Controls
// ═══════════════════════════════════════════════════════════════
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ═══════════════════════════════════════════════════════════════
// IPC: File Dialog
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ═══════════════════════════════════════════════════════════════
// IPC: Users
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-users', () => {
  return getDB().prepare('SELECT * FROM users ORDER BY last_login DESC').all();
});

ipcMain.handle('create-user', (_, { username, display_name }) => {
  const db = getDB();
  try {
    const res = db.prepare(
      'INSERT INTO users (username, display_name) VALUES (?, ?)'
    ).run(username, display_name);
    return { id: res.lastInsertRowid, username, display_name };
  } catch (e) {
    throw new Error('Tên đăng nhập đã tồn tại!');
  }
});

ipcMain.handle('update-user-login', (_, userId) => {
  getDB().prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userId);
});

ipcMain.handle('delete-user', (_, userId) => {
  getDB().prepare('DELETE FROM users WHERE id = ?').run(userId);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Categories
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-categories', (_, userId) => {
  return getDB().prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(userId);
});

ipcMain.handle('save-category', (_, { id, user_id, name, color }) => {
  const db = getDB();
  if (id) {
    db.prepare('UPDATE categories SET name=?, color=? WHERE id=?').run(name, color, id);
    return { id };
  }
  const res = db.prepare('INSERT INTO categories (user_id, name, color) VALUES (?,?,?)').run(user_id, name, color);
  return { id: res.lastInsertRowid };
});

ipcMain.handle('delete-category', (_, id) => {
  getDB().prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Products
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-products', (_, { userId, search = '', categoryId = null }) => {
  const db = getDB();
  let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.user_id = ?';
  const params = [userId];
  if (search) { sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (categoryId) { sql += ' AND p.category_id = ?'; params.push(categoryId); }
  sql += ' AND p.is_active = 1 ORDER BY p.name';
  return db.prepare(sql).all(...params);
});

ipcMain.handle('save-product', (_, product) => {
  const db = getDB();
  if (product.id) {
    db.prepare(`UPDATE products SET sku=@sku, name=@name, unit=@unit, cost_price=@cost_price,
      sell_price=@sell_price, stock_qty=@stock_qty, category_id=@category_id, description=@description,
      updated_at=datetime('now') WHERE id=@id`).run(product);
    return { id: product.id };
  }
  const res = db.prepare(`INSERT INTO products (user_id,sku,name,unit,cost_price,sell_price,stock_qty,category_id,description)
    VALUES (@user_id,@sku,@name,@unit,@cost_price,@sell_price,@stock_qty,@category_id,@description)`).run(product);
  return { id: res.lastInsertRowid };
});

ipcMain.handle('delete-product', (_, id) => {
  getDB().prepare('UPDATE products SET is_active=0 WHERE id=?').run(id);
  return { success: true };
});

ipcMain.handle('import-products', (_, { userId, products, mode, fileName }) => {
  const db = getDB();
  const fn = db.transaction(() => {
    if (mode === 'replace') db.prepare('DELETE FROM products WHERE user_id=?').run(userId);
    const ins = db.prepare(`INSERT OR IGNORE INTO products (user_id,sku,name,unit,cost_price,sell_price,stock_qty)
      VALUES (@user_id,@sku,@name,@unit,@cost_price,@sell_price,@stock_qty)`);
    let success = 0;
    for (const p of products) { try { ins.run(p); success++; } catch(e){} }
    db.prepare(`INSERT INTO import_sessions (user_id,file_name,import_type,mode,total_rows,success_rows)
      VALUES (?,?,'products',?,?,?)`).run(userId, fileName, mode, products.length, success);
    return success;
  });
  const success = fn();
  return { success };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Customers
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-customers', (_, { userId, search = '' }) => {
  const db = getDB();
  let sql = 'SELECT * FROM customers WHERE user_id = ?';
  const params = [userId];
  if (search) { sql += ' AND (name LIKE ? OR phone LIKE ? OR code LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  sql += ' ORDER BY name';
  return db.prepare(sql).all(...params);
});

ipcMain.handle('save-customer', (_, customer) => {
  const db = getDB();
  if (customer.id) {
    db.prepare('UPDATE customers SET code=@code,name=@name,phone=@phone,address=@address,email=@email,notes=@notes WHERE id=@id').run(customer);
    return { id: customer.id };
  }
  const res = db.prepare('INSERT INTO customers (user_id,code,name,phone,address,email,notes) VALUES (@user_id,@code,@name,@phone,@address,@email,@notes)').run(customer);
  return { id: res.lastInsertRowid };
});

ipcMain.handle('delete-customer', (_, id) => {
  getDB().prepare('DELETE FROM customers WHERE id=?').run(id);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Orders
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('save-order', (_, { order, items, userId }) => {
  const db = getDB();
  const fn = db.transaction(() => {
    const oRes = db.prepare(`INSERT INTO orders
      (user_id,customer_id,order_code,subtotal,discount_amount,total_amount,paid_amount,change_amount,debt_amount,payment_method,status,notes)
      VALUES (@user_id,@customer_id,@order_code,@subtotal,@discount_amount,@total_amount,@paid_amount,@change_amount,@debt_amount,@payment_method,@status,@notes)
    `).run({ ...order, user_id: userId });
    const orderId = oRes.lastInsertRowid;
    const insItem = db.prepare(`INSERT INTO order_items (order_id,product_id,product_name,unit,quantity,unit_price,cost_price,total_price)
      VALUES (@order_id,@product_id,@product_name,@unit,@quantity,@unit_price,@cost_price,@total_price)`);
    for (const item of items) {
      insItem.run({ ...item, order_id: orderId });
      if (item.product_id) db.prepare('UPDATE products SET stock_qty=stock_qty-? WHERE id=?').run(item.quantity, item.product_id);
    }
    db.prepare(`INSERT INTO transactions (user_id,order_id,type,category,amount,description)
      VALUES (?,?,'income','sale',?,?)`).run(userId, orderId, order.paid_amount, `Đơn hàng ${order.order_code}`);
    if (order.customer_id && order.debt_amount > 0) {
      db.prepare('UPDATE customers SET debt_amount=debt_amount+? WHERE id=?').run(order.debt_amount, order.customer_id);
    }
    return orderId;
  });
  return { orderId: fn() };
});

ipcMain.handle('get-orders', (_, { userId, dateFrom, dateTo, search = '' }) => {
  const db = getDB();
  let sql = `SELECT o.*, c.name as customer_name FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.user_id = ?`;
  const params = [userId];
  if (dateFrom) { sql += ' AND date(o.order_date) >= ?'; params.push(dateFrom); }
  if (dateTo)   { sql += ' AND date(o.order_date) <= ?'; params.push(dateTo); }
  if (search)   { sql += ' AND (o.order_code LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
  sql += ' ORDER BY o.order_date DESC LIMIT 200';
  return db.prepare(sql).all(...params);
});

ipcMain.handle('get-order-detail', (_, orderId) => {
  const db = getDB();
  const order = db.prepare('SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?').get(orderId);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);
  return { order, items };
});

ipcMain.handle('cancel-order', (_, { orderId, userId }) => {
  const db = getDB();
  const fn = db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    if (!order || order.status === 'cancelled') return;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);
    for (const item of items) {
      if (item.product_id) db.prepare('UPDATE products SET stock_qty=stock_qty+? WHERE id=?').run(item.quantity, item.product_id);
    }
    db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(orderId);
    if (order.customer_id && order.debt_amount > 0) {
      db.prepare('UPDATE customers SET debt_amount=MAX(0, debt_amount-?) WHERE id=?').run(order.debt_amount, order.customer_id);
    }
  });
  fn();
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Transactions (Thu Chi)
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-transactions', (_, { userId, dateFrom, dateTo, type }) => {
  const db = getDB();
  let sql = 'SELECT * FROM transactions WHERE user_id=?';
  const params = [userId];
  if (dateFrom) { sql += ' AND date(transaction_date) >= ?'; params.push(dateFrom); }
  if (dateTo)   { sql += ' AND date(transaction_date) <= ?'; params.push(dateTo); }
  if (type)     { sql += ' AND type=?'; params.push(type); }
  sql += ' ORDER BY transaction_date DESC LIMIT 500';
  return db.prepare(sql).all(...params);
});

ipcMain.handle('save-transaction', (_, tx) => {
  const db = getDB();
  if (tx.id) {
    db.prepare('UPDATE transactions SET type=@type,category=@category,amount=@amount,description=@description,payment_method=@payment_method,transaction_date=@transaction_date WHERE id=@id').run(tx);
    return { id: tx.id };
  }
  const res = db.prepare(`INSERT INTO transactions (user_id,type,category,amount,description,payment_method,transaction_date)
    VALUES (@user_id,@type,@category,@amount,@description,@payment_method,@transaction_date)`).run(tx);
  return { id: res.lastInsertRowid };
});

ipcMain.handle('delete-transaction', (_, id) => {
  getDB().prepare('DELETE FROM transactions WHERE id=?').run(id);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Dashboard / Reports
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-dashboard', (_, { userId, date }) => {
  const db = getDB();
  const today = date || new Date().toISOString().split('T')[0];

  const todayOrders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue,
    COALESCE(SUM(paid_amount),0) as collected FROM orders
    WHERE user_id=? AND date(order_date)=? AND status='completed'`).get(userId, today);

  const todayIncome = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions
    WHERE user_id=? AND type='income' AND date(transaction_date)=?`).get(userId, today);

  const todayExpense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions
    WHERE user_id=? AND type='expense' AND date(transaction_date)=?`).get(userId, today);

  const totalDebt = db.prepare(`SELECT COALESCE(SUM(debt_amount),0) as total FROM customers WHERE user_id=?`).get(userId);

  const lowStock = db.prepare(`SELECT * FROM products WHERE user_id=? AND stock_qty <= min_stock_qty AND is_active=1 AND min_stock_qty > 0 LIMIT 5`).all(userId);

  // Doanh thu 7 ngày gần nhất
  const last7Days = db.prepare(`
    SELECT date(order_date) as day, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(paid_amount),0) as collected
    FROM orders WHERE user_id=? AND status='completed'
    AND date(order_date) >= date(?,'−6 days')
    GROUP BY day ORDER BY day`).all(userId, today);

  const topProducts = db.prepare(`
    SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue
    FROM order_items oi JOIN orders o ON oi.order_id=o.id
    WHERE o.user_id=? AND date(o.order_date)=date('now','-30 days','start of day') AND o.status='completed'
    GROUP BY oi.product_name ORDER BY qty DESC LIMIT 5`).all(userId);

  return { todayOrders, todayIncome, todayExpense, totalDebt, lowStock, last7Days, topProducts };
});

ipcMain.handle('get-report', (_, { userId, dateFrom, dateTo }) => {
  const db = getDB();
  const revenue = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders
    WHERE user_id=? AND status='completed' AND date(order_date) BETWEEN ? AND ?`).get(userId, dateFrom, dateTo);
  const collected = db.prepare(`SELECT COALESCE(SUM(paid_amount),0) as total FROM orders
    WHERE user_id=? AND status='completed' AND date(order_date) BETWEEN ? AND ?`).get(userId, dateFrom, dateTo);
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions
    WHERE user_id=? AND type='expense' AND date(transaction_date) BETWEEN ? AND ?`).get(userId, dateFrom, dateTo);
  const cost = db.prepare(`SELECT COALESCE(SUM(oi.cost_price * oi.quantity),0) as total
    FROM order_items oi JOIN orders o ON oi.order_id=o.id
    WHERE o.user_id=? AND o.status='completed' AND date(o.order_date) BETWEEN ? AND ?`).get(userId, dateFrom, dateTo);
  const daily = db.prepare(`SELECT date(order_date) as day, SUM(total_amount) as revenue, SUM(paid_amount) as collected
    FROM orders WHERE user_id=? AND status='completed' AND date(order_date) BETWEEN ? AND ?
    GROUP BY day ORDER BY day`).all(userId, dateFrom, dateTo);
  return { revenue: revenue.total, collected: collected.total, expense: expense.total, cost: cost.total, daily };
});

// ═══════════════════════════════════════════════════════════════
// IPC: Reminders
// ═══════════════════════════════════════════════════════════════
ipcMain.handle('get-reminders', (_, userId) => {
  return getDB().prepare('SELECT r.*, c.name as customer_name FROM reminders r LEFT JOIN customers c ON r.customer_id=c.id WHERE r.user_id=? ORDER BY due_datetime').all(userId);
});

ipcMain.handle('save-reminder', (_, reminder) => {
  const db = getDB();
  if (reminder.id) {
    db.prepare('UPDATE reminders SET title=@title,description=@description,reminder_type=@reminder_type,due_datetime=@due_datetime,customer_id=@customer_id WHERE id=@id').run(reminder);
    return { id: reminder.id };
  }
  const res = db.prepare(`INSERT INTO reminders (user_id,customer_id,title,description,reminder_type,due_datetime)
    VALUES (@user_id,@customer_id,@title,@description,@reminder_type,@due_datetime)`).run(reminder);
  return { id: res.lastInsertRowid };
});

ipcMain.handle('complete-reminder', (_, id) => {
  getDB().prepare('UPDATE reminders SET is_completed=1 WHERE id=?').run(id);
  return { success: true };
});

ipcMain.handle('delete-reminder', (_, id) => {
  getDB().prepare('DELETE FROM reminders WHERE id=?').run(id);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// Reminder Checker (mỗi phút check nhắc nhở)
// ═══════════════════════════════════════════════════════════════
function startReminderChecker() {
  setInterval(() => {
    try {
      const db = getDB();
      const now = new Date().toISOString().slice(0, 16); // yyyy-mm-ddThh:mm
      const due = db.prepare(`SELECT * FROM reminders WHERE is_completed=0 AND is_notified=0 AND due_datetime <= ?`).all(now);
      for (const r of due) {
        if (Notification.isSupported()) {
          new Notification({ title: `⏰ ${r.title}`, body: r.description || 'Đến giờ nhắc nhở!' }).show();
        }
        db.prepare('UPDATE reminders SET is_notified=1 WHERE id=?').run(r.id);
        mainWindow?.webContents.send('reminder-triggered', r);
      }
    } catch(e) {}
  }, 60_000);
}
