const { supabase, authSupabase } = require('../services/supabase');

/**
 * Resolves the authenticated user from the HTTP-only access token cookie.
 * Returns { id, email, display_name, role, permissions[] } or throws.
 */
async function resolveUser(req) {
  const token = req.cookies?.access_token;
  if (!token) throw Object.assign(new Error('ไม่ได้เข้าสู่ระบบ'), { status: 401 });

  // Verify token with Supabase Auth
  const { data: { user }, error } = await authSupabase.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'), { status: 401 });

  // Fetch profile + role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name, role, active')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) throw Object.assign(new Error('ไม่พบข้อมูลผู้ใช้'), { status: 401 });
  if (!profile.active) throw Object.assign(new Error('บัญชีนี้ถูกระงับ'), { status: 403 });

  // Fetch role permissions
  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role', profile.role);

  // Fetch per-user permission overrides
  const { data: overrides } = await supabase
    .from('user_permission_overrides')
    .select('permission_key, granted')
    .eq('user_id', user.id);

  const permSet = new Set((rolePerms || []).map(r => r.permission_key));
  for (const o of (overrides || [])) {
    if (o.granted) permSet.add(o.permission_key);
    else permSet.delete(o.permission_key);
  }

  return {
    id: user.id,
    email: user.email,
    display_name: profile.display_name,
    role: profile.role,
    permissions: [...permSet],
  };
}

/**
 * Middleware: attaches resolved user to req.user or returns 401/403.
 */
function requireAuth(req, res, next) {
  resolveUser(req)
    .then(user => { req.user = user; next(); })
    .catch(err => res.status(err.status || 401).json({ error: err.message }));
}

/**
 * Middleware factory: requireAuth + specific permission check.
 * owner role bypasses all permission checks.
 */
function requirePermission(permKey) {
  return [
    requireAuth,
    (req, res, next) => {
      if (req.user.role === 'owner') return next();
      if (req.user.permissions.includes(permKey)) return next();
      res.status(403).json({ error: `ไม่มีสิทธิ์: ${permKey}` });
    },
  ];
}

/**
 * Middleware: only owner role allowed.
 */
function requireOwner(req, res, next) {
  if (req.user?.role === 'owner') return next();
  res.status(403).json({ error: 'เฉพาะ Owner เท่านั้น' });
}

/**
 * Auth cookie helpers.
 */
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
};

function setAuthCookies(res, session) {
  res.cookie('access_token', session.access_token, {
    ...COOKIE_OPTS,
    maxAge: (session.expires_in ?? 3600) * 1000,
  });
  res.cookie('refresh_token', session.refresh_token, {
    ...COOKIE_OPTS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...COOKIE_OPTS });
  res.clearCookie('refresh_token', { ...COOKIE_OPTS });
}

module.exports = {
  resolveUser,
  requireAuth,
  requirePermission,
  requireOwner,
  setAuthCookies,
  clearAuthCookies,
};
