/**
 * Account Routes
 *
 * Routes for account management, usage tracking, and tier upgrades.
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getUsage, upgradeToPremium, downgradeToFree } = require('../controllers/payment.controller');

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/account/usage - Get current usage and limits
router.get('/usage', getUsage);

// POST /api/v1/account/upgrade - Upgrade to premium (mock payment)
router.post('/upgrade', upgradeToPremium);

// POST /api/v1/account/downgrade - Downgrade to free (for testing)
router.post('/downgrade', downgradeToFree);

module.exports = router;
