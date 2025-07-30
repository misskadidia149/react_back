const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;

// État de progression prédéfinis
const ETAPES_PROGRESSION = [
  'Soumission du thème',
  'Validation du thème',
  'Rédaction du chapitre 1',
  'Chapitre 1 OK',
  'Rédaction du chapitre 2',
  'Chapitre 2 OK',
  'Rédaction du chapitre 3',
  'Chapitre 3 OK',
  'Version provisoire',
  'Diapo de présentation',
  'Correction après soutenance',
  'Version finale'
];

module.exports = {
  async getProgressionByModule(req, res, next) {
    try {
      const moduleId = req.params.id;

      // Vérifier l'accès au module
      await this.verifyModuleAccess(moduleId, req.user.id);

      // Récupérer les progressions des groupes du module
      const [progressions] = await db.execute(
        `SELECT p.*, g.nom AS groupeNom 
         FROM progression p
         JOIN groupe g ON p.groupeId = g.idGroupe
         WHERE p.moduleId = ?`,
        [moduleId]
      );

      res.status(200).json({
        status: 'success',
        results: progressions.length,
        data: { progressions }
      });
    } catch (err) {
      next(err);
    }
  },

  async getProgressionByGroupe(req, res, next) {
    try {
      const groupeId = req.params.id;

      // Vérifier l'accès au groupe
      await this.verifyGroupeAccess(groupeId, req.user.id);

      // Récupérer la progression du groupe
      const [progressions] = await db.execute(
        'SELECT * FROM progression WHERE groupeId = ?',
        [groupeId]
      );

      res.status(200).json({
        status: 'success',
        data: { 
          progression: progressions[0] || null,
          etapesPossibles: ETAPES_PROGRESSION 
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async createOrUpdateProgression(req, res, next) {
    try {
      const { moduleId, groupeId, etape, commentaire } = req.body;
      const enseignantId = req.user.id;

      // Validation de l'étape
      if (!ETAPES_PROGRESSION.includes(etape)) {
        throw new AppError('Étape de progression non valide', 400);
      }

      // Vérifier que le module appartient à l'enseignant
      const [modules] = await db.execute(
        'SELECT idModule FROM module WHERE idModule = ? AND enseignantId = ?',
        [moduleId, enseignantId]
      );
      
      if (modules.length === 0) {
        throw new AppError('Module non trouvé ou non autorisé', 404);
      }

      // Vérifier que le groupe appartient au module
      const [groupes] = await db.execute(
        'SELECT idGroupe FROM groupe WHERE idGroupe = ? AND moduleId = ?',
        [groupeId, moduleId]
      );
      
      if (groupes.length === 0) {
        throw new AppError('Groupe non trouvé ou non autorisé', 404);
      }

      // Vérifier si une progression existe déjà
      const [existing] = await db.execute(
        'SELECT idProgression FROM progression WHERE moduleId = ? AND groupeId = ?',
        [moduleId, groupeId]
      );

      if (existing.length > 0) {
        // Mise à jour
        await db.execute(
          'UPDATE progression SET etape = ?, commentaire = ?, date = NOW() WHERE idProgression = ?',
          [etape, commentaire, existing[0].idProgression]
        );
      } else {
        // Création
        await db.execute(
          'INSERT INTO progression (moduleId, groupeId, etape, commentaire) VALUES (?, ?, ?, ?)',
          [moduleId, groupeId, etape, commentaire]
        );
      }

      res.status(200).json({
        status: 'success',
        message: 'Progression mise à jour avec succès'
      });
    } catch (err) {
      next(err);
    }
  },

  // Méthode utilitaire pour vérifier l'accès à un module
  async verifyModuleAccess(moduleId, userId) {
    const [access] = await db.execute(
      `SELECT 1 FROM module m
       LEFT JOIN groupe g ON m.idModule = g.moduleId
       LEFT JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
       WHERE m.idModule = ? AND (
         m.enseignantId = ? OR
         gm.utilisateurId = ?
       )`,
      [moduleId, userId, userId]
    );
    
    if (access.length === 0) {
      throw new AppError('Accès non autorisé à ce module', 403);
    }
  },

  // Méthode utilitaire pour vérifier l'accès à un groupe
  async verifyGroupeAccess(groupeId, userId) {
    const [access] = await db.execute(
      `SELECT 1 FROM groupe g
       LEFT JOIN module m ON g.moduleId = m.idModule
       LEFT JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
       WHERE g.idGroupe = ? AND (
         g.coordinateurId = ? OR
         m.enseignantId = ? OR
         gm.utilisateurId = ?
       )`,
      [groupeId, userId, userId, userId]
    );
    
    if (access.length === 0) {
      throw new AppError('Accès non autorisé à ce groupe', 403);
    }
  }
};