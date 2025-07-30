const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/helpers').AppError;

// Helper pour générer le token JWT
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non défini dans .env');
  }

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
};


// Cache les informations sensibles dans les réponses
const filterUserData = (user) => {
  const { motdepasse, ...userData } = user;
  return userData;
};

module.exports = {
  async register(req, res, next) {
    try {
      const { nom, prenom, email, motdepasse, role } = req.body;

      // Validation du rôle
      const allowedRoles = ['Etudiant', 'Enseignant'];
      if (!allowedRoles.includes(role)) {
        throw new AppError('Rôle invalide', 400);
      }

      // Vérification de l'unicité de l'email
      const [existingUser] = await db.query(
        'SELECT id FROM utilisateurs WHERE email = ?', 
        [email]
      );
      
      if (existingUser.length > 0) {
        throw new AppError('Cet email est déjà utilisé', 400);
      }

      // Hashage du mot de passe
      const hashedPassword = await bcrypt.hash(motdepasse, 12);

      // Création de l'utilisateur
      const [result] = await db.query(
        'INSERT INTO utilisateurs (nom, prenom, email, motdepasse, role) VALUES (?, ?, ?, ?, ?)',
        [nom, prenom, email, hashedPassword, role]
      );

      // Génération du token
      const token = generateToken(result.insertId, role);

      res.status(201).json({
        status: 'success',
        token,
        data: {
          user: filterUserData({ id: result.insertId, nom, prenom, email, role })
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, motdepasse } = req.body;

      // 1. Vérification des champs requis
      if (!email || !motdepasse) {
        throw new AppError('Veuillez fournir un email et un mot de passe', 400);
      }

      // 2. Récupération de l'utilisateur
      const [users] = await db.query(
        'SELECT * FROM utilisateurs WHERE email = ?', 
        [email]
      );
      
      const user = users[0];

      // 3. Vérification des identifiants
      if (!user || !(await bcrypt.compare(motdepasse, user.motdepasse))) {
        throw new AppError('Email ou mot de passe incorrect', 401);
      }

      // 4. Génération du token
      const token = generateToken(user.id, user.role);

      res.status(200).json({
        status: 'success',
        token,
        data: {
          user: filterUserData(user)
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getCurrentUser(req, res, next) {
    try {
      const [users] = await db.query(
        'SELECT id, nom, prenom, email, role FROM utilisateurs WHERE id = ?',
        [req.user.id]
      );
      
      if (users.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: users[0]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllUsers(req, res, next) {
    try {
      const [users] = await db.query(
        'SELECT id, nom, prenom, email, role FROM utilisateurs'
      );

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users }
      });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const [users] = await db.query(
        'SELECT id, nom, prenom, email, role FROM utilisateurs WHERE id = ?',
        [req.params.id]
      );
      
      if (users.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: users[0]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req, res, next) {
    try {
      const { nom, prenom, email } = req.body;
      const userId = req.params.id;

      // Vérification que l'utilisateur existe
      const [users] = await db.query(
        'SELECT id FROM utilisateurs WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      // Mise à jour
      await db.query(
        'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id = ?',
        [nom, prenom, email, userId]
      );

      res.status(200).json({
        status: 'success',
        message: 'Utilisateur mis à jour avec succès'
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      await db.query('DELETE FROM utilisateurs WHERE id = ?', [req.params.id]);
      
      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  },

  async promoteToCoordinateur(req, res, next) {
    try {
      const userId = req.params.id;

      // Vérification que l'utilisateur est un étudiant
      const [users] = await db.query(
        'SELECT id, role FROM utilisateurs WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      if (users[0].role !== 'Etudiant') {
        throw new AppError('Seuls les étudiants peuvent être promus coordinateurs', 400);
      }

      // Promotion au rôle de coordinateur
      await db.query(
        'UPDATE utilisateurs SET role = "Coordinateur" WHERE id = ?',
        [userId]
      );

      res.status(200).json({
        status: 'success',
        message: 'Utilisateur promu coordinateur avec succès'
      });
    } catch (err) {
      next(err);
    }
  }
};