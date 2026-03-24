// ps-crm-backend/src/routes/chatbotRoutes.js
const express = require('express');
const router  = express.Router();
const { chat, resetChat } = require('../controllers/chatbotController');

router.post('/message', chat);
router.post('/reset',   resetChat);

module.exports = router;