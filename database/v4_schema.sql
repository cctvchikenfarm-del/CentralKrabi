-- ═══════════════════════════════════════════════════════════════════════════
-- CKAP v4 — Consolidated Database Schema
-- Run this ONCE on a fresh Supabase project (dev environment)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Roles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  key         TEXT PRIMARY KEY,
  label_th    TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0
);

INSERT INTO roles (key, label_th, description, sort_order) VALUES
  ('owner',  'Owner',   'ผู้ดูแลระบบสูงสุด — ข้ามการตรวจสอบสิทธิ์ทุกอย่าง', 0),
  ('admin',  'Admin',   'ผู้ดูแลระบบ — จัดการผู้ใช้และการตั้งค่า',             1),
  ('editor', 'Editor',  'บรรณาธิการ — บันทึกและแก้ไขข้อมูล',                   2),
  ('viewer', 'Viewer',  'ผู้ชม — ดูข้อมูลเท่านั้น',                             3)
ON CONFLICT DO NOTHING;

-- ── 2. Permissions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  key         TEXT PRIMARY KEY,
  group_name  TEXT NOT NULL,
  label_th    TEXT NOT NULL
);

INSERT INTO permissions (key, group_name, label_th) VALUES
  -- Dashboard
  ('dashboard.read',    'dashboard', 'ดูแดชบอร์ด'),
  -- Entries
  ('entries.read',      'entries',   'ดูข้อมูล'),
  ('entries.create',    'entries',   'บันทึกข้อมูล'),
  ('entries.edit',      'entries',   'แก้ไขข้อมูล'),
  ('entries.delete',    'entries',   'ลบข้อมูล'),
  ('entries.import',    'entries',   'นำเข้าข้อมูล (Excel/Batch)'),
  -- Charts & Reports
  ('charts.read',       'reports',   'ดูกราฟ'),
  ('reports.preview',   'reports',   'ดูตัวอย่างรายงาน'),
  ('reports.export',    'reports',   'ส่งออก PowerPoint'),
  -- Users & Roles
  ('users.read',        'admin',     'ดูรายชื่อผู้ใช้'),
  ('users.manage',      'admin',     'จัดการผู้ใช้'),
  ('roles.read',        'admin',     'ดู roles'),
  ('roles.manage',      'admin',     'จัดการ roles'),
  -- Settings
  ('settings.manage',   'admin',     'ตั้งค่าระบบ'),
  -- Audit
  ('audit.read',        'admin',     'ดู audit logs')
ON CONFLICT DO NOTHING;

-- ── 3. Role Permissions (default matrix) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role           TEXT NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

-- owner: all (handled by bypass in middleware, no rows needed)
-- admin
INSERT INTO role_permissions (role, permission_key) SELECT 'admin', key FROM permissions
ON CONFLICT DO NOTHING;

-- editor
INSERT INTO role_permissions (role, permission_key) VALUES
  ('editor', 'dashboard.read'),
  ('editor', 'entries.read'),
  ('editor', 'entries.create'),
  ('editor', 'entries.edit'),
  ('editor', 'entries.import'),
  ('editor', 'charts.read'),
  ('editor', 'reports.preview')
ON CONFLICT DO NOTHING;

-- viewer
INSERT INTO role_permissions (role, permission_key) VALUES
  ('viewer', 'dashboard.read'),
  ('viewer', 'entries.read'),
  ('viewer', 'charts.read'),
  ('viewer', 'reports.preview')
ON CONFLICT DO NOTHING;

-- ── 4. Profiles ───────────────────────────────────────────────────────────
-- Mirrors Supabase Auth users; created via trigger or API
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'viewer' REFERENCES roles(key),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. User Permission Overrides ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  granted        BOOLEAN NOT NULL,  -- true = grant, false = deny
  UNIQUE(user_id, permission_key)
);

-- ── 6. Master Modules ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_modules (
  code             TEXT PRIMARY KEY,
  label_th         TEXT NOT NULL,
  input_mode       TEXT NOT NULL CHECK (input_mode IN ('daily','monthly','daily_average','transaction','hybrid','calculated')),
  primary_metric   TEXT NOT NULL DEFAULT 'weight_kg',
  aggregation      TEXT NOT NULL DEFAULT 'sum',
  better_direction TEXT NOT NULL DEFAULT 'lower' CHECK (better_direction IN ('lower','higher','neutral')),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO master_modules (code, label_th, input_mode, primary_metric, better_direction, sort_order) VALUES
  ('rdf',        'ขยะ RDF',             'daily',        'weight_kg', 'lower',   0),
  ('dog_food',   'อาหารสุนัข',           'daily',        'weight_kg', 'neutral', 1),
  ('pig_feed',   'อาหารหมู',             'daily_average','weight_kg', 'neutral', 2),
  ('wet_waste',  'เศษอาหาร',             'calculated',   'weight_kg', 'lower',   3),
  ('black_bag',  'ถุงดำ',                'monthly',      'weight_kg', 'lower',   4),
  ('consumable', 'น้ำยาทำความสะอาด',     'monthly',      'quantity',  'neutral', 5),
  ('tissue',     'ทิชชู่',               'hybrid',       'quantity',  'neutral', 6),
  ('recycle',    'รีไซเคิล',             'transaction',  'amount',    'higher',  7)
ON CONFLICT DO NOTHING;

-- ── 7. Master Categories ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module     TEXT NOT NULL REFERENCES master_modules(code),
  code       TEXT NOT NULL,
  name_th    TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'kg',
  color      TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(module, code)
);

-- Sample categories matching exact 8-point system specification
INSERT INTO master_categories (module, code, name_th, unit, color, sort_order) VALUES
  ('rdf',                     'rdf_general',             'ขยะ RDF',             'กก.',    '#3b82f6', 0),
  ('dog_food',                'df_general',              'อาหารสุนัข',           'กก.',    '#f59e0b', 0),
  ('pig_feed',                'pf_general',              'อาหารหมู',            'กก./วัน','#8b5cf6', 0),
  ('black_bag',               'black_bag_large',         'ถุงใหญ่ 30×40 สีดำ',  'ใบ',     '#1f2937', 0),
  ('black_bag',               'black_bag_medium',        'ถุงกลาง 28×36 สีชา',  'ใบ',     '#92400e', 1),
  ('black_bag',               'black_bag_small',         'ถุงเล็ก 18×20 สีดำ',  'ใบ',     '#374151', 2),
  ('consumable',              'consumable_foam_soap',    'สบู่โฟม',             'แกลลอน', '#0ea5e9', 0),
  ('consumable',              'consumable_seat_cleaner', 'น้ำยาเช็ดฝาโถ',       'แกลลอน', '#06b6d4', 1),
  ('tissue',                  'tissue_roll',             'กระดาษทิชชู่ ม้วน',    'ม้วน',   '#10b981', 0),
  ('tissue',                  'tissue_hand',             'กระดาษทิชชู่ เช็ดมือ',  'แพ็ค',   '#059669', 1),
  ('tissue',                  'tissue_popup',            'กระดาษทิชชู่ ป๊อปอัพ',  'แพ็ค',   '#047857', 2),
  ('recycle',                 'rc_brown_paper',          'กระดาษน้ำตาล',           'กก.',    '#b45309', 0),
  ('recycle',                 'rc_jap_jua',              'กระดาษจับจั้ว',          'กก.',    '#d97706', 1),
  ('recycle',                 'rc_tin_can',              'สังกะสีกระป๋อง',         'กก.',    '#64748b', 2),
  ('recycle',                 'rc_tin_can_2nd',          'สังกะสีกระป๋อง อีกราคา',  'กก.',    '#475569', 3),
  ('recycle',                 'rc_pet',                  'PET',                    'กก.',    '#0284c7', 4),
  ('recycle',                 'rc_plastic_mixed',        'พลาสติกรวม',             'กก.',    '#16a34a', 5),
  ('recycle',                 'rc_plastic_mixed_2nd',    'พลาสติกรวม อีกราคา',     'กก.',    '#15803d', 6),
  ('recycle',                 'rc_alu_coke',             'อลู-โค๊ก',               'กก.',    '#eab308', 7),
  ('recycle',                 'rc_glass_mixed',          'แก้ว-รวมสี',             'กก.',    '#2563eb', 8)
ON CONFLICT (module, code) DO UPDATE SET name_th = EXCLUDED.name_th, unit = EXCLUDED.unit;

-- ── 8. Import Batches ─────────────────────────────────────────────────────
-- NOTE: This table was missing from the original schema — defined explicitly here
CREATE TABLE IF NOT EXISTS import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     TEXT NOT NULL,  -- 'daily_handwritten' | 'recycle_voucher' | 'monthly_image_import' | 'hygiene_enterprise' | 'tissue_excel' | 'multi_sheet_excel'
  file_hash       TEXT,           -- SHA-256 of uploaded file (dedup guard)
  original_filename TEXT,
  status          TEXT NOT NULL DEFAULT 'committing'
                  CHECK (status IN ('committing','committed','failed','rolled_back')),
  row_count_preview INTEGER,
  row_count_committed INTEGER,
  period_month    TEXT,           -- YYYY-MM-01
  committed_by    UUID REFERENCES profiles(id),
  rolled_back_by  UUID REFERENCES profiles(id),
  committed_at    TIMESTAMPTZ,
  rolled_back_at  TIMESTAMPTZ,
  error_message   TEXT,
  metadata        JSONB,          -- Stores gross_total, audit status, voucher_ref
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. Data Entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module          TEXT NOT NULL REFERENCES master_modules(code),
  category_code   TEXT NOT NULL,
  entry_date      DATE NOT NULL,
  period_month    DATE NOT NULL,  -- ALWAYS first day of month (YYYY-MM-01)
  weight_kg       NUMERIC(12,3) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  quantity        NUMERIC(12,3) CHECK (quantity IS NULL OR quantity >= 0),
  unit_price      NUMERIC(12,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  amount          NUMERIC(12,2) CHECK (amount IS NULL OR amount >= 0),
  notes           TEXT CHECK (char_length(notes) <= 500),
  metadata        JSONB,
  import_batch_id UUID REFERENCES import_batches(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Critical: entry_date must be in same month as period_month
  CONSTRAINT entry_in_period CHECK (
    date_trunc('month', entry_date) = period_month
  )
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_data_entries_period_month ON data_entries(period_month);
CREATE INDEX IF NOT EXISTS idx_data_entries_module       ON data_entries(module);
CREATE INDEX IF NOT EXISTS idx_data_entries_entry_date   ON data_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_data_entries_batch        ON data_entries(import_batch_id);

-- ── 10. Audit Logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES profiles(id),
  action     TEXT NOT NULL,         -- 'create' | 'update' | 'delete' | 'login' | 'logout'
  table_name TEXT,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id   ON audit_logs(actor_id);

-- ── 11. Report Tables ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month  DATE NOT NULL,
  modules       TEXT[],
  status        TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  error_message TEXT,
  generated_by  UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 12. RLS Policies ─────────────────────────────────────────────────────
-- Backend uses service_role key — RLS is disabled for service role.
-- Enable RLS on tables as a safety net (service role bypasses anyway).
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_entries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Deny all direct access from anon/authenticated roles
-- Backend always uses service_role which bypasses RLS
CREATE POLICY "deny_direct_access" ON profiles             FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON data_entries         FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON master_categories    FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON master_modules       FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON import_batches       FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON audit_logs           FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON role_permissions     FOR ALL USING (false);
CREATE POLICY "deny_direct_access" ON user_permission_overrides FOR ALL USING (false);

-- ── Done ──────────────────────────────────────────────────────────────────
-- To bootstrap the first owner:
-- 1. Create user via Supabase Auth dashboard
-- 2. INSERT INTO profiles (id, display_name, role) VALUES ('<auth-user-id>', 'Admin', 'owner');
