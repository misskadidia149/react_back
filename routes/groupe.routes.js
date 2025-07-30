const express = require('express');
const router = express.Router();
const groupeController = require('../controllers/groupe.controller');
const authMiddleware = require('../middleware//authMiddleware');
const roleMiddleware = require('../middleware//role.middleware');

// Créer un groupe (enseignant seulement)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  groupeController.createGroupe
);

// Gestion des membres
router.post(
  '/:id/membres',
  authMiddleware,
  roleMiddleware(['Enseignant', 'Coordinateur']),
  groupeController.addMembre
);

router.delete(
  '/:id/membres/:membreId',
  authMiddleware,
  roleMiddleware(['Enseignant', 'Coordinateur']),
  groupeController.removeMembre
);

// Changer le coordinateur
router.put(
  '/:id/coordinateur',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  groupeController.changeCoordinateur
);

module.exports = router;