const router = require('express').Router();
const { chat, recommendations, smartSearch, analytics } = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');

router.post('/chat', optionalAuth, chat);
router.get('/recommendations', optionalAuth, recommendations);
router.get('/search', optionalAuth, smartSearch);
router.get('/analytics', analytics);

module.exports = router;
