const router = require('express').Router();
const { getCart, addToCart, updateCartItem, removeCartItem, mergeCart } = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', getCart);
router.post('/', addToCart);
router.post('/merge', mergeCart);
router.patch('/:productId', updateCartItem);
router.delete('/:productId', removeCartItem);

module.exports = router;
