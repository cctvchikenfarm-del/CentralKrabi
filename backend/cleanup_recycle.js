require('dotenv').config();
const { supabase } = require('./services/supabase');

async function cleanup() {
  const codesToDelete = [
    'rc_paper',
    'rc_plastic',
    'rc_metal',
    'rc_glass',
    'rc_tin_can_1',
    'rc_tin_can_2',
    'rc_plastic_mixed_1',
    'rc_plastic_mixed_2'
  ];

  const { error } = await supabase
    .from('master_categories')
    .delete()
    .eq('module', 'recycle')
    .in('code', codesToDelete);

  if (error) {
    console.error('Error deleting extra categories:', error.message);
  } else {
    console.log('Successfully deleted extra recycle categories!');
  }

  const { data } = await supabase
    .from('master_categories')
    .select('code, name_th, unit')
    .eq('module', 'recycle')
    .order('sort_order', { ascending: true });

  console.log('Current active recycle categories:', data);
  process.exit(0);
}

cleanup();
