const router = require('express').Router();
const express = require('express');
const { checkout, demoPay, confirm, webhook } = require('../controllers/paymentController');
const { optionalAuth } = require('../middleware/auth');

// Raw body required for Stripe signature verification.
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

router.post('/checkout', optionalAuth, checkout);
router.post('/demo-pay', demoPay);
router.post('/confirm', confirm);

module.exports = router;
