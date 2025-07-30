const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { rateLimiter } = require('../middleware//rateLimiter');
const AppError = require('../utils/appError');

// Temps d'expiration des tokens
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_COOKIE_EXPIRES = process.env.JWT_COOKIE_EXPIRES || 24 * 60 * 60 * 1000; // 24h en ms

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Vérification des données d'entrée
    if (!email || !password) {
      return next(new AppError('Veuillez fournir un email et un mot de passe', 400));
    }

    // 2) Recherche de l'utilisateur
    const [rows] = await db.query(
      'SELECT id_utilisateur, nom, email, mot_de_passe, role FROM utilisateurs WHERE email = ?', 
      [email]
    );

    if (rows.length === 0) {
      return next(new AppError('Email ou mot de passe incorrect', 401));
    }

    const user = rows[0];

    // 3) Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);
    if (!isPasswordValid) {
      return next(new AppError('Email ou mot de passe incorrect', 401));
    }

    // 4) Génération du token JWT
    const token = jwt.sign(
      { id: user.id_utilisateur, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 5) Configuration du cookie sécurisé
    const cookieOptions = {
      expires: new Date(Date.now() + JWT_COOKIE_EXPIRES),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    };

    // 6) Envoi de la réponse
    res.cookie('jwt', token, cookieOptions);

    // Retirer le mot de passe de la réponse
    user.mot_de_passe = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });

  } catch (err) {
    next(err);
  }
};

// Déconnexion
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// Vérification du token (middleware)
exports.protect = async (req, res, next) => {
  try {
    // 1) Récupération du token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder.', 401));
    }

    // 2) Vérification du token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // 3) Vérification que l'utilisateur existe toujours
    const [rows] = await db.promise().query(
      'SELECT id_utilisateur, nom, email, role FROM utilisateurs WHERE id_utilisateur = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return next(new AppError('L\'utilisateur associé à ce token n\'existe plus.', 401));
    }

    // 4) Ajout des infos utilisateur à la requête
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

// Restriction par rôle
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Vous n\'avez pas la permission d\'effectuer cette action', 403));
    }
    next();
  };
};