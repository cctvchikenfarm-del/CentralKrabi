import { api } from './client.js'

export const auth = {
  login:         (email, password) => api.post('/auth/login', { email, password }),
  logout:        ()                => api.post('/auth/logout'),
  refresh:       ()                => api.post('/auth/refresh'),
  me:            ()                => api.get('/auth/me'),
  passwordReset: (email)           => api.post('/auth/password-reset', { email }),
}

export const entries = {
  list:         (params) => api.get('/entries', params),
  calendar:     (params) => api.get('/entries/calendar', params),
  day:          (params) => api.get('/entries/day', params),
  monthSummary: (params) => api.get('/entries/month-summary', params),
  yearlyLedger: (params) => api.get('/entries/yearly-ledger', params),
  create:       (body)   => api.post('/entries', body),
  update:       (id, body) => api.put(`/entries/${id}`, body),
  delete:       (id)     => api.delete(`/entries/${id}`),
  batch:        (body)   => api.post('/entries/batch', body),
}

export const dashboard = {
  summary:     (params) => api.get('/dashboard', params),
  dataQuality: (params) => api.get('/data-quality', params),
  categories:  (params) => api.get('/master-categories', params),
}

export const users = {
  list:   ()          => api.get('/users'),
  create: (body)      => api.post('/users', body),
  update: (id, body)  => api.put(`/users/${id}`, body),
  roles:  ()          => api.get('/roles'),
}

export const admin = {
  auditLogs:   (params) => api.get('/admin/audit-logs', params),
  systemCheck: ()       => api.get('/admin/system-check'),
}

export const analytics = {
  chart: (params) => api.get('/analytics/chart', params),
}

export const reports = {
  preview: (params) => api.get('/reports/preview', params),
}

export const imports = {
  dailyHandwrittenParse: (formData) => api.post('/imports/daily-handwritten/parse', formData),
  dailyHandwrittenConfirm: (body)   => api.post('/imports/daily-handwritten/confirm', body),
  recycleVoucherParse:   (formData) => api.post('/imports/recycle-voucher/parse', formData),
  recycleVoucherConfirm: (body)     => api.post('/imports/recycle-voucher/confirm', body),
  batchList:             ()         => api.get('/imports/batches'),
  batchRollback:         (id)       => api.post(`/imports/batches/${id}/rollback`),
}
