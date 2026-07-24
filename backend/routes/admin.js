const express = require('express');
const { supabase } = require('../services/supabase');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/audit-logs
router.get('/admin/audit-logs', requirePermission('audit.read'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/admin/system-check
router.get('/admin/system-check', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const checks = {};

    // Check critical tables exist
    const tables = ['profiles', 'data_entries', 'master_categories', 'master_modules', 'audit_logs', 'import_batches'];
    for (const tbl of tables) {
      const { error } = await supabase.from(tbl).select('id', { head: true, count: 'exact' });
      checks[tbl] = error ? { ok: false, error: error.message } : { ok: true };
    }

    // Check env vars
    checks.env = {
      SUPABASE_URL:              !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY:         !!process.env.SUPABASE_ANON_KEY,
    };

    const allOk = Object.values(checks).every(c => c === true || c?.ok !== false);
    res.json({ ok: allOk, checks, version: '4.0.0' });
  } catch (err) { next(err); }
});

module.exports = router;
