const express = require('express');
const router = express.Router();
const tacheController = require('../controllers/tache.controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/role.middleware');
const { upload, handleUploadErrors } = require('../config/upload');

// 📌 Créer une tâche (enseignant uniquement)
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  upload.single('fichierJoint'),
  handleUploadErrors,
  tacheController.createTache
);

// 📌 Obtenir une tâche par ID (authentifié)
router.get(
  '/:id',
  authMiddleware,
  tacheController.getTache
);

// 📌 Modifier une tâche (enseignant uniquement)
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  upload.single('fichierJoint'),
  handleUploadErrors,
  tacheController.updateTache
);

// 📌 Supprimer une tâche (enseignant uniquement)
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  tacheController.deleteTache
);

// 📌 Lister les tâches d’un module (étudiant ou enseignant)
router.get(
  '/module/:id',
  authMiddleware,
  tacheController.getTachesByModule
);

module.exports = router;
