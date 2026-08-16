const router = require('express').Router();
const { createOrder, listMyOrders, getOrder } = require('../controllers/orderController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, createOrder);      // guests can check out too
router.get('/', requireAuth, listMyOrders);
router.get('/:orderNumber', optionalAuth, getOrder);

module.exports = router;
