const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process (React)
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // File
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Users
  getUsers:         () => ipcRenderer.invoke('get-users'),
  createUser:       (data) => ipcRenderer.invoke('create-user', data),
  updateUserLogin:  (id)   => ipcRenderer.invoke('update-user-login', id),
  deleteUser:       (id)   => ipcRenderer.invoke('delete-user', id),

  // Categories
  getCategories:  (uid)  => ipcRenderer.invoke('get-categories', uid),
  saveCategory:   (data) => ipcRenderer.invoke('save-category', data),
  deleteCategory: (id)   => ipcRenderer.invoke('delete-category', id),

  // Products
  getProducts:    (params) => ipcRenderer.invoke('get-products', params),
  saveProduct:    (data)   => ipcRenderer.invoke('save-product', data),
  deleteProduct:  (id)     => ipcRenderer.invoke('delete-product', id),
  importProducts: (data)   => ipcRenderer.invoke('import-products', data),

  // Customers
  getCustomers:   (params) => ipcRenderer.invoke('get-customers', params),
  saveCustomer:   (data)   => ipcRenderer.invoke('save-customer', data),
  deleteCustomer: (id)     => ipcRenderer.invoke('delete-customer', id),

  // Orders
  saveOrder:      (data)   => ipcRenderer.invoke('save-order', data),
  getOrders:      (params) => ipcRenderer.invoke('get-orders', params),
  getOrderDetail: (id)     => ipcRenderer.invoke('get-order-detail', id),
  cancelOrder:    (data)   => ipcRenderer.invoke('cancel-order', data),

  // Transactions
  getTransactions:  (params) => ipcRenderer.invoke('get-transactions', params),
  saveTransaction:  (data)   => ipcRenderer.invoke('save-transaction', data),
  deleteTransaction:(id)     => ipcRenderer.invoke('delete-transaction', id),

  // Dashboard & Reports
  getDashboard: (params) => ipcRenderer.invoke('get-dashboard', params),
  getReport:    (params) => ipcRenderer.invoke('get-report', params),

  // Reminders
  getReminders:     (uid)  => ipcRenderer.invoke('get-reminders', uid),
  saveReminder:     (data) => ipcRenderer.invoke('save-reminder', data),
  completeReminder: (id)   => ipcRenderer.invoke('complete-reminder', id),
  deleteReminder:   (id)   => ipcRenderer.invoke('delete-reminder', id),

  // Events from main
  onReminderTriggered: (cb) => ipcRenderer.on('reminder-triggered', (_, data) => cb(data)),
});
