const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;
const fs = require('fs');

module.exports = {
  async createCorrection(req, res, next) {
    try {
      const { soumissionId, commentaires, note } = req.body;
      const enseignantId = req.user.id;

      // Vérifier que la soumission existe 
      const [soumissions] = await db.execute(
        `SELECT s.*, t.moduleId 
         FROM soumission s
         JOIN tache t ON s.tacheId = t.idTache
         WHERE s.idSoumission = ?`,
        [soumissionId]
      );
      
      if (soumissions.length === 0) {
        throw new AppError('Soumission non trouvée', 404);
      }

      // Vérifier que l'enseignant a accès au module
      const [modules] = await db.execute(
        'SELECT 1 FROM module WHERE idModule = ? AND enseignantId = ?',
        [soumissions[0].moduleId, enseignantId]
      );
      
      if (modules.length === 0) {
        throw new AppError('Vous n\'êtes pas autorisé à corriger cette soumission', 403);
      }

      // Gérer les fichiers uploadés
      const fichiers = req.files.map(file => ({
        nom: file.originalname,
        chemin: file.path,
        type: file.mimetype,
        taille: file.size
      }));

      // Créer la correction
      const [result] = await db.execute(
        'INSERT INTO correction (soumissionId, commentaires, fichiersJoint, note, correcteurId) VALUES (?, ?, ?, ?, ?)',
        [soumissionId, commentaires, JSON.stringify(fichiers), note, enseignantId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          correctionId: result.insertId
        }
      });
    } catch (err) {
      // Nettoyer les fichiers uploadés en cas d'erreur
      if (req.files) {
        req.files.forEach(file => {
          fs.unlink(file.path, () => {});
        });
      }
      next(err);
    }
  },

  async getCorrectionBySoumission(req, res, next) {
    try {
      const soumissionId = req.params.id;

      // Vérifier l'accès à la soumission
      await this.verifySoumissionAccess(soumissionId, req.user.id);

      // Récupérer la correction
      const [corrections] = await db.execute(
        `SELECT c.*, 
         u.nom AS correcteurNom, 
         u.prenom AS correcteurPrenom
         FROM correction c
         JOIN utilisateurs u ON c.correcteurId = u.id
         WHERE c.soumissionId = ?`,
        [soumissionId]
      );

      if (corrections.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: { correction: null }
        });
      }

      // Convertir les fichiers JSON en objets
      const correction = {
        ...corrections[0],
        fichiersJoint: JSON.parse(corrections[0].fichiersJoint)
      };

      res.status(200).json({
        status: 'success',
        data: { correction }
      });
    } catch (err) {
      next(err);
    }
  },

  // Méthode utilitaire pour vérifier l'accès à une soumission
  async verifySoumissionAccess(soumissionId, userId) {
    const [access] = await db.execute(
      `SELECT 1 FROM soumission s
       JOIN tache t ON s.tacheId = t.idTache
       JOIN module m ON t.moduleId = m.idModule
       JOIN groupe g ON s.groupeId = g.idGroupe
       LEFT JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
       WHERE s.idSoumission = ? AND (
         m.enseignantId = ? OR
         s.coordinateurId = ? OR
         gm.utilisateurId = ?
       )`,
      [soumissionId, userId, userId, userId]
    );
    
    if (access.length === 0) {
      throw new AppError('Accès non autorisé à cette soumission', 403);
    }
  }
};