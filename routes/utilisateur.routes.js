// const express = require('express');
// const router = express.Router();
// const utilisateurController = require('../controllers/utilisateur.controller');

// router.post('/register', utilisateurController.register);

// module.exports = router;
const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateur.controller');
const authMiddleware = require('../middleware//authMiddleware');
const roleMiddleware = require('../middleware//role.middleware');

// Routes publiques
router.post('/register', utilisateurController.register);
router.post('/login', utilisateurController.login);

// Routes protégées par authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs connectés
router.get('/me', utilisateurController.getCurrentUser);

// Routes restreintes par rôle
router.get('/', roleMiddleware(['Enseignant', 'Coordinateur']), utilisateurController.getAllUsers);
router.get('/:id', roleMiddleware(['Enseignant', 'Coordinateur']), utilisateurController.getUserById);
router.put('/:id', roleMiddleware(['Enseignant', 'Coordinateur']), utilisateurController.updateUser);
router.delete('/:id', roleMiddleware(['Enseignant']), utilisateurController.deleteUser);

// Gestion spécifique des coordinateurs
router.post('/:id/promote-coordinateur', 
  roleMiddleware(['Enseignant']), 
  utilisateurController.promoteToCoordinateur
);

module.exports = router;