const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;
const fs = require('fs');

module.exports = {
  async createSoumission(req, res, next) {
    try {
      const { tacheId, commentaires } = req.body;
      const coordinateurId = req.user.id;

      // Vérifier que la tâche existe
      const [taches] = await db.execute(
        'SELECT idTache, groupeId FROM tache WHERE idTache = ?',
        [tacheId]
      );
      
      if (taches.length === 0) {
        throw new AppError('Tâche non trouvée', 404);
      }

      const groupeId = taches[0].groupeId;

      // Vérifier que l'utilisateur est coordinateur du groupe
      const [groupes] = await db.execute(
        'SELECT idGroupe FROM groupe WHERE idGroupe = ? AND coordinateurId = ?',
        [groupeId, coordinateurId]
      );
      
      if (groupes.length === 0) {
        throw new AppError('Vous n\'êtes pas coordinateur de ce groupe', 403);
      }

      // Gérer les fichiers uploadés
      const fichiers = req.files.map(file => ({
        nom: file.originalname,
        chemin: file.path,
        type: file.mimetype,
        taille: file.size
      }));

      // Créer la soumission
      const [result] = await db.execute(
        'INSERT INTO soumission (tacheId, groupeId, fichiers, commentaires, coordinateurId) VALUES (?, ?, ?, ?, ?)',
        [tacheId, groupeId, JSON.stringify(fichiers), commentaires, coordinateurId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          soumissionId: result.insertId
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

  async getSoumissionsByTache(req, res, next) {
    try {
      const tacheId = req.params.id;

      // Vérifier l'accès à la tâche
 await module.exports.verifyTacheAccess(tacheId, req.user.id);
      // Récupérer les soumissions
      const [soumissions] = await db.execute(
        `SELECT s.*, 
         u.nom AS coordinateurNom, 
         u.prenom AS coordinateurPrenom
         FROM soumission s
         JOIN utilisateurs u ON s.coordinateurId = u.id
         WHERE s.tacheId = ?`,
        [tacheId]
      );

      // Convertir les fichiers JSON en objets
      const result = soumissions.map(s => ({
        ...s,
        fichiers: JSON.parse(s.fichiers)
      }));

      res.status(200).json({
        status: 'success',
        results: result.length,
        data: { soumissions: result }
      });
    } catch (err) {
      next(err);
    }
  },

  async getSoumissionsByGroupe(req, res, next) {
    try {
      const groupeId = req.params.id;

      // Vérifier l'accès au groupe
   await module.exports.verifyGroupeAccess(groupeId, req.user.id);

      // Récupérer les soumissions
      const [soumissions] = await db.execute(
        `SELECT s.*, t.titre AS tacheTitre,
         u.nom AS coordinateurNom, 
         u.prenom AS coordinateurPrenom
         FROM soumission s
         JOIN tache t ON s.tacheId = t.idTache
         JOIN utilisateurs u ON s.coordinateurId = u.id
         WHERE s.groupeId = ?`,
        [groupeId]
      );

      // Convertir les fichiers JSON en objets
      const result = soumissions.map(s => ({
        ...s,
        fichiers: JSON.parse(s.fichiers)
      }));

      res.status(200).json({
        status: 'success',
        results: result.length,
        data: { soumissions: result }
      });
    } catch (err) {
      next(err);
    }
  },

  // Méthode utilitaire pour vérifier l'accès à une tâche
  async verifyTacheAccess(tacheId, userId) {
    const [access] = await db.execute(
      `SELECT 1 FROM tache t
       LEFT JOIN module m ON t.moduleId = m.idModule
       LEFT JOIN groupe g ON t.groupeId = g.idGroupe
       LEFT JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
       WHERE t.idTache = ? AND (
         t.createurId = ? OR
         m.enseignantId = ? OR
         gm.utilisateurId = ?
       )`,
      [tacheId, userId, userId, userId]
    );
    
    if (access.length === 0) {
      throw new AppError('Accès non autorisé à cette tâche', 403);
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
