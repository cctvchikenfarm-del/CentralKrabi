const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { buildChartData } = require('../services/chart');

const router = express.Router();

// GET /api/analytics/chart
router.get('/analytics/chart', requirePermission('charts.read'), async (req, res, next) => {
  try {
    const { module = 'rdf', metric = 'weight_kg', period_month, year } = req.query;

    const data = await buildChartData({
      module,
      metric,
      period_month,
      year,
    });

    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
