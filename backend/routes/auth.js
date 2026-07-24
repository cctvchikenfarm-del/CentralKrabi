const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { authSupabase, supabase, supabaseUrl, supabaseAnonKey } = require('../services/supabase');
const { requireAuth, setAuthCookies, clearAuthCookies } = require('../middleware/auth');

const router = express.Router();

// Rate limiter: max 8 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที' },
  standardHeaders: true,
  legacyHeaders: false,
});

const LoginSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;
    const { data, error } = await authSupabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        return res.status(403).json({ error: 'อีเมลนี้ยังไม่ได้ยืนยัน กรุณายืนยันอีเมลหรือติดต่อ Owner' });
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      }
      return res.status(401).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(401).json({ error: 'ไม่สามารถสร้าง session ได้' });
    }

    // Verify profile exists and is active
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, display_name, role, active')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' });
    }
    if (!profile.active) {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อ Owner' });
    }

    setAuthCookies(res, data.session);

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        display_name: profile.display_name,
        role: profile.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.access_token;
  if (token) {
    await authSupabase.auth.signOut(); // best-effort
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'ไม่พบ refresh token' });
    }

    const { data, error } = await authSupabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }

    setAuthCookies(res, data.session);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/password-reset
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3 });
router.post('/password-reset', resetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'กรุณาระบุอีเมล' });

    await authSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password`,
    });

    // Always return ok to prevent email enumeration
    res.json({ ok: true, message: 'หากอีเมลนี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่าน' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/config — returns public Supabase config for frontend client
router.get('/config', (_req, res) => {
  res.json({
    supabaseUrl,
    supabaseAnonKey,
  });
});

// GET /api/me — current session info
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { id, email, display_name, role, permissions } = req.user;

    // Fetch role permissions metadata
    const { data: rolePermsData } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('role', role);

    res.json({
      id,
      email,
      display_name,
      role,
      permissions,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
