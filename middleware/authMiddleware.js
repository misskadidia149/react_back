// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// const auth = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Token manquant" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // id + role
//     next();
//   } catch (err) {
//     return res.status(403).json({ message: "Token invalide" });
//   }
// };

// module.exports = auth;
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/helpers').AppError;

module.exports = async (req, res, next) => {
  try {
    // 1. Récupération du token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError(
        'Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.',
        401
      );
    }

    // 2. Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Vérification que l'utilisateur existe toujours
    const [users] = await db.query(
      'SELECT id FROM utilisateurs WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      throw new AppError(
        'L\'utilisateur associé à ce token n\'existe plus.',
        401
      );
    }

    // 4. Ajout des informations utilisateur à la requête
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    next(err);
  }
};