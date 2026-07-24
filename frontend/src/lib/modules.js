/**
 * Frontend module definitions — single source of truth matching backend
 */

export const MODULE_ORDER = [
  'rdf', 'dog_food', 'pig_feed', 'wet_waste',
  'black_bag', 'consumable', 'tissue', 'recycle',
]

export const MODULE_LABELS = {
  rdf:        'ขยะ RDF',
  dog_food:   'อาหารสุนัข',
  pig_feed:   'อาหารหมู',
  wet_waste:  'ขยะเปียก',
  black_bag:  'ถุงดำ/ถุงขยะ',
  consumable: 'ของใช้สิ้นเปลือง',
  tissue:     'กระดาษทิชชู่',
  recycle:    'รีไซเคิล',
}

export function canonicalUnit(moduleCode, categoryCode = null) {
  switch (moduleCode) {
    case 'rdf':
    case 'dog_food':
    case 'wet_waste':
    case 'recycle':
      return 'กก.'
    case 'pig_feed':
      return 'กก./วัน'
    case 'black_bag':
      return 'ใบ'
    case 'consumable':
      return 'แกลลอน'
    case 'tissue':
      if (categoryCode === 'tissue_roll') return 'ม้วน'
      return 'แพ็ค'
    default:
      return 'กก.'
  }
}
