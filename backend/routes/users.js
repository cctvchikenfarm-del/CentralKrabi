const express = require('express');
const { z } = require('zod');
const { supabase, authSupabase } = require('../services/supabase');
const { requirePermission, requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users
router.get('/users', requirePermission('users.read'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, active, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/users — invite new user
router.post('/users', requirePermission('users.manage'), async (req, res, next) => {
  try {
    const { email, display_name, role = 'viewer' } = req.body;
    if (!email || !display_name) return res.status(400).json({ error: 'ต้องระบุ email และ display_name' });

    const { data: inviteData, error: inviteErr } = await authSupabase.auth.admin.inviteUserByEmail(email, {
      data: { display_name, role },
    });
    if (inviteErr) throw Object.assign(new Error(inviteErr.message), { status: 400 });

    // Create profile row
    await supabase.from('profiles').upsert({
      id: inviteData.user.id,
      display_name,
      role,
      active: true,
    });

    res.status(201).json({ ok: true, id: inviteData.user.id });
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/users/:id', requirePermission('users.manage'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { display_name, role, active } = req.body;

    // Guard: cannot demote/deactivate last owner
    if (role !== 'owner' || active === false) {
      const { count } = await supabase.from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner').eq('active', true).neq('id', id);
      const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single();
      if (target?.role === 'owner' && (count ?? 0) === 0) {
        return res.status(400).json({ error: 'ไม่สามารถเปลี่ยนแปลงได้ — ต้องมี Owner อย่างน้อย 1 คน' });
      }
    }

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;

    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/roles
router.get('/roles', requirePermission('roles.read'), async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('role_permissions').select('role, permission_key').order('role');
    if (error) throw error;
    // Group by role
    const roles = {};
    for (const row of data) {
      if (!roles[row.role]) roles[row.role] = [];
      roles[row.role].push(row.permission_key);
    }
    res.json({ roles });
  } catch (err) { next(err); }
});

module.exports = router;
