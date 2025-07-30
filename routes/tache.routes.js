const express = require('express');
const router = express.Router();
const tacheController = require('../controllers/tache.controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../config/upload');

// Créer une tâche (enseignant seulement)
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  upload.single('fichierJoint'),
  tacheController.createTache
);

// Gestion individuelle des tâches
router.get(
  '/:id',
  authMiddleware,
  tacheController.getTache
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  upload.single('fichierJoint'),
  tacheController.updateTache
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  tacheController.deleteTache
);

// Lister les tâches d'un module
router.get(
  '/module/:id',
  authMiddleware,
  tacheController.getTachesByModule
);

module.exports = router;