const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/module.controller');
const authMiddleware = require('../middleware//authMiddleware');
const roleMiddleware = require('../middleware//role.middleware');

// Routes pour les modules
router.post('/upload', 
  authMiddleware, 
  roleMiddleware(['Enseignant']), 
  moduleController.createModule
);

router.get('/:id', 
  authMiddleware, 
  moduleController.getModule
);

router.post('/:id/etudiants',
  authMiddleware,
  roleMiddleware(['Enseignant']),
  moduleController.addStudent
);

router.get('/:id/taches',
  authMiddleware,
  moduleController.getModuleTasks
);

module.exports = router;