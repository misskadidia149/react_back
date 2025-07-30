const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware//authMiddleware');

// Envoyer un message
router.post(
  '/send',
  authMiddleware,
  messageController.sendMessage
);

// Récupérer les messages avec un utilisateur
router.get(
  '/:receiverId',
  authMiddleware,
  messageController.getMessagesWithUser
);

module.exports = router;