const express = require('express');
const router = express.Router();
const soumissionController = require('../controllers/soumission.controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../config/upload');

// Soumettre un travail (coordinateur seulement)
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['Coordinateur']),
  upload.array('fichiers', 5), // Max 5 fichiers
  soumissionController.createSoumission
);

// Récupérer les soumissions par tâche
router.get(
  '/tache/:id',
  authMiddleware,
  soumissionController.getSoumissionsByTache
);

// Récupérer les soumissions par groupe
router.get(
  '/groupe/:id',
  authMiddleware,
  soumissionController.getSoumissionsByGroupe
);

module.exports = router;