const express = require('express');
const router = express.Router();
const progressionController = require('../controllers/progression.controller');
const authMiddleware = require('../middleware//authMiddleware');
const roleMiddleware = require('../middleware//role.middleware');

// Récupérer la progression d'un module
router.get(
  '/module/:id',
  authMiddleware,
  progressionController.getProgressionByModule
);

// Récupérer la progression d'un groupe
router.get(
  '/groupe/:id',
  authMiddleware,
  progressionController.getProgressionByGroupe
);

// Créer ou mettre à jour une progression (enseignant seulement)
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  progressionController.createOrUpdateProgression
);

router.put(
  '/',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  progressionController.createOrUpdateProgression
);

module.exports = router;