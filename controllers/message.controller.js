const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;

module.exports = {
  async sendMessage(req, res, next) {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.user.id;

      // Validation basique
      if (!receiverId || !content) {
        throw new AppError('Destinataire et contenu sont requis', 400);
      }

      // Vérifier que le destinataire existe
      const [users] = await db.execute(
        'SELECT id FROM utilisateurs WHERE id = ?',
        [receiverId]
      );
      
      if (users.length === 0) {
        throw new AppError('Destinataire non trouvé', 404);
      }

      // Empêcher l'envoi à soi-même
      if (receiverId == senderId) {
        throw new AppError('Vous ne pouvez pas vous envoyer un message à vous-même', 400);
      }

      // Enregistrer le message
      const [result] = await db.execute(
        'INSERT INTO message (contenu, senderId, receiverId) VALUES (?, ?, ?)',
        [content, senderId, receiverId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          messageId: result.insertId
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getMessagesWithUser(req, res, next) {
    try {
      const receiverId = req.params.receiverId;
      const currentUserId = req.user.id;

      // Vérifier que la conversation est autorisée
      if (receiverId == currentUserId) {
        throw new AppError('Vous ne pouvez pas récupérer vos propres messages', 400);
      }

      // Récupérer les messages dans les deux sens
      const [messages] = await db.execute(
        `SELECT m.*, 
         u1.nom as senderNom, u1.prenom as senderPrenom,
         u2.nom as receiverNom, u2.prenom as receiverPrenom
         FROM message m
         JOIN utilisateurs u1 ON m.senderId = u1.id
         JOIN utilisateurs u2 ON m.receiverId = u2.id
         WHERE (m.senderId = ? AND m.receiverId = ?)
         OR (m.senderId = ? AND m.receiverId = ?)
         ORDER BY m.dateEnvoi ASC`,
        [currentUserId, receiverId, receiverId, currentUserId]
      );

      res.status(200).json({
        status: 'success',
        results: messages.length,
        data: { messages }
      });
    } catch (err) {
      next(err);
    }
  }
};