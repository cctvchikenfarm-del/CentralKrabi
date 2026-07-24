const express = require('express');
const multer = require('multer');
const { requirePermission } = require('../middleware/auth');
const { supabase } = require('../services/supabase');
const { parseDailyHandwrittenSheet, parseRecycleVoucher } = require('../services/document-parser');
const { currentPeriodMonth } = require('../lib/periods');

const router = express.Router();

// Multer memory storage (max 12MB)
const upload = multer({
  limits: { fileSize: 12 * 1024 * 1024 },
});

/**
 * 1. Parse Daily Handwritten Sheet Image
 * POST /api/imports/daily-handwritten/parse
 */
router.post('/imports/daily-handwritten/parse', requirePermission('entries.import'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์รูปภาพกระดาษจดรายวัน' });
    }

    const period_month = req.body.period_month || currentPeriodMonth();
    const result = await parseDailyHandwrittenSheet({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      period_month,
    });

    res.json(result);
  } catch (err) { next(err); }
});

/**
 * 2. Confirm Daily Handwritten Sheet Import
 * POST /api/imports/daily-handwritten/confirm
 */
router.post('/imports/daily-handwritten/confirm', requirePermission('entries.import'), async (req, res, next) => {
  try {
    const { period_month, file_hash, filename, items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'ไม่มีรายการข้อมูลสำหรับบันทึก' });
    }

    // Create import batch
    const { data: batch, error: batchErr } = await supabase
      .from('import_batches')
      .insert([{
        source_type: 'daily_handwritten',
        file_hash,
        original_filename: filename,
        status: 'committing',
        row_count_preview: items.length,
        period_month,
        committed_by: req.user.id,
      }])
      .select()
      .single();

    if (batchErr) throw batchErr;

    // Prepare rows for data_entries
    const entriesToInsert = items.map(item => ({
      module: item.module,
      category_code: item.category_code,
      entry_date: item.entry_date,
      period_month: `${period_month.slice(0, 7)}-01`,
      weight_kg: item.metric === 'weight_kg' ? item.value : null,
      quantity: item.metric === 'quantity' ? item.value : null,
      notes: `${item.material_name} (นำเข้าจากใบบันทึกรายวัน)`,
      import_batch_id: batch.id,
      created_by: req.user.id,
      metadata: { source_system: 'daily_handwritten', metric: item.metric },
    }));

    const { error: insertErr } = await supabase
      .from('data_entries')
      .insert(entriesToInsert);

    if (insertErr) {
      await supabase.from('import_batches').update({ status: 'failed', error_message: insertErr.message }).eq('id', batch.id);
      throw insertErr;
    }

    // Update batch to committed
    await supabase.from('import_batches').update({
      status: 'committed',
      row_count_committed: entriesToInsert.length,
      committed_at: new Date().toISOString(),
    }).eq('id', batch.id);

    res.json({
      success: true,
      batch_id: batch.id,
      imported_count: entriesToInsert.length,
      message: `บันทึกข้อมูลใบบันทึกรายวันสำเร็จ ${entriesToInsert.length} รายการ`,
    });
  } catch (err) { next(err); }
});

/**
 * 3. Parse Recycle Voucher (PDF or Image)
 * POST /api/imports/recycle-voucher/parse
 */
router.post('/imports/recycle-voucher/parse', requirePermission('entries.import'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพใบสำคัญจ่าย' });
    }

    const period_month = req.body.period_month || currentPeriodMonth();
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');

    const result = await parseRecycleVoucher({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      period_month,
      isPdf,
    });

    res.json(result);
  } catch (err) { next(err); }
});

/**
 * 4. Confirm Recycle Voucher Import
 * POST /api/imports/recycle-voucher/confirm
 */
router.post('/imports/recycle-voucher/confirm', requirePermission('entries.import'), async (req, res, next) => {
  try {
    const { period_month, file_hash, filename, voucher_number, gross_total, items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'ไม่มีรายการข้อมูลสำหรับบันทึก' });
    }

    // Create import batch with permanent gross_total audit metadata
    const { data: batch, error: batchErr } = await supabase
      .from('import_batches')
      .insert([{
        source_type: 'recycle_voucher',
        file_hash,
        original_filename: filename,
        status: 'committing',
        row_count_preview: items.length,
        period_month,
        committed_by: req.user.id,
        metadata: {
          voucher_number,
          gross_total,
          item_count: items.length,
        },
      }])
      .select()
      .single();

    if (batchErr) throw batchErr;

    // Prepare rows for data_entries (dated 1st of period_month)
    const entry_date = `${period_month.slice(0, 7)}-01`;
    const entriesToInsert = items.map(item => ({
      module: 'recycle',
      category_code: item.category_code,
      entry_date,
      period_month: entry_date,
      weight_kg: item.weight_kg,
      unit_price: item.unit_price,
      amount: item.amount,
      notes: `${item.material_name} (ใบสำคัญจ่าย ${voucher_number || ''})`,
      import_batch_id: batch.id,
      created_by: req.user.id,
      metadata: {
        source_system: 'recycle_voucher',
        voucher_number,
        line_index: item.line_index,
      },
    }));

    const { error: insertErr } = await supabase
      .from('data_entries')
      .insert(entriesToInsert);

    if (insertErr) {
      await supabase.from('import_batches').update({ status: 'failed', error_message: insertErr.message }).eq('id', batch.id);
      throw insertErr;
    }

    // Update batch status to committed
    await supabase.from('import_batches').update({
      status: 'committed',
      row_count_committed: entriesToInsert.length,
      committed_at: new Date().toISOString(),
    }).eq('id', batch.id);

    res.json({
      success: true,
      batch_id: batch.id,
      imported_count: entriesToInsert.length,
      message: `บันทึกข้อมูลใบสำคัญจ่ายสำเร็จ ${entriesToInsert.length} รายการ (ยอดสุทธิ ฿${Number(gross_total || 0).toLocaleString('th-TH')})`,
    });
  } catch (err) { next(err); }
});

/**
 * 5. Get Import Batches History
 * GET /api/imports/batches
 */
router.get('/imports/batches', requirePermission('entries.import'), async (req, res, next) => {
  try {
    const { data: batches, error } = await supabase
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ batches: batches || [] });
  } catch (err) { next(err); }
});

/**
 * 6. Rollback Batch Import
 * POST /api/imports/batches/:id/rollback
 */
router.post('/imports/batches/:id/rollback', requirePermission('entries.import'), async (req, res, next) => {
  try {
    const batchId = req.params.id;

    // Delete created entries associated with this batch
    const { error: delErr } = await supabase
      .from('data_entries')
      .delete()
      .eq('import_batch_id', batchId);

    if (delErr) throw delErr;

    // Mark batch status as rolled_back
    const { error: updateErr } = await supabase
      .from('import_batches')
      .update({
        status: 'rolled_back',
        rolled_back_by: req.user.id,
        rolled_back_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    if (updateErr) throw updateErr;

    res.json({ success: true, message: 'ยกเลิกและย้อนกลับชุดข้อมูลนำเข้าสำเร็จ' });
  } catch (err) { next(err); }
});

module.exports = router;
