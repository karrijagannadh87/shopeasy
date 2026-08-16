const router = require('express').Router();
const { listProducts, getProduct, featuredProducts, categories } = require('../controllers/productController');

router.get('/', listProducts);
router.get('/featured', featuredProducts);
router.get('/categories', categories);
router.get('/:id', getProduct);

module.exports = router;
