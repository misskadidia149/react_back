const express = require('express');
const router = express.Router();
const correctionController = require('../controllers/correction.controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../config/upload');

// Créer une correction (enseignant seulement)
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  upload.array('fichiers', 3), // Max 3 fichiers
  correctionController.createCorrection
);

// Récupérer les corrections d'une soumission
router.get(
  '/soumission/:id',
  authMiddleware,
  correctionController.getCorrectionBySoumission
);

module.exports = router;