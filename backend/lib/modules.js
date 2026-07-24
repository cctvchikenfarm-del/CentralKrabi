/**
 * modules.js — Single source of truth for module definitions.
 *
 * RULE: All module metadata must come from master_modules table in DB.
 * This file provides the canonical static fallback used for seeding
 * and for validation before DB is available.
 *
 * Do NOT hard-code MODULE_ORDER or module configs in routes or frontend.
 */

/**
 * Canonical module codes in display order.
 * Source of truth: master_modules table. This list is used for seeding only.
 */
const MODULE_ORDER = [
  'rdf',
  'dog_food',
  'pig_feed',
  'wet_waste',   // calculated: dog_food.weight_kg + pig_feed.weight_kg
  'black_bag',
  'consumable',
  'tissue',
  'recycle',
];

/**
 * Thai labels — must match AGENTS.md rule:
 * consumable → 'ของใช้สิ้นเปลือง' (NOT 'น้ำยาต่างๆ')
 */
const MODULE_LABELS = {
  rdf:        'ขยะ RDF',
  dog_food:   'อาหารสุนัข',
  pig_feed:   'อาหารหมู',
  wet_waste:  'ขยะเปียก',
  black_bag:  'ถุงดำ/ถุงขยะ',
  consumable: 'ของใช้สิ้นเปลือง',
  tissue:     'กระดาษทิชชู่',
  recycle:    'รีไซเคิล',
};

/**
 * Input modes.
 */
const MODULE_INPUT_MODES = {
  rdf:        'daily',
  dog_food:   'daily',
  pig_feed:   'daily_average',
  wet_waste:  'calculated',
  black_bag:  'monthly',
  consumable: 'monthly',
  tissue:     'daily_grid',
  recycle:    'transaction',
};

/**
 * Canonical operational unit displayed in UI and reports.
 */
function canonicalUnit(moduleCode, categoryCode = null) {
  switch (moduleCode) {
    case 'rdf':
    case 'dog_food':
    case 'wet_waste':
    case 'recycle':
      return 'กก.';
    case 'pig_feed':
      return 'กก./วัน';
    case 'black_bag':
      return 'ใบ';
    case 'consumable':
      return 'แกลลอน';
    case 'tissue':
      if (categoryCode === 'tissue_roll') return 'ม้วน';
      return 'แพ็ค';
    default:
      return 'กก.';
  }
}

/**
 * wet_waste formula: sum of dog_food + pig_feed weight_kg.
 * Returns the module codes to fetch when wet_waste is requested.
 */
const WET_WASTE_SOURCE_MODULES = ['dog_food', 'pig_feed'];

/**
 * Load active modules from the database.
 * Returns array sorted by MODULE_ORDER.
 */
async function loadModulesFromDB(supabase) {
  const { data, error } = await supabase
    .from('master_modules')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load modules: ${error.message}`);

  // Ensure consistent label per AGENTS.md rule
  return data.map(m => ({
    ...m,
    label: MODULE_LABELS[m.code] ?? m.label,
  }));
}

module.exports = {
  MODULE_ORDER,
  MODULE_LABELS,
  MODULE_INPUT_MODES,
  WET_WASTE_SOURCE_MODULES,
  canonicalUnit,
  loadModulesFromDB,
};
