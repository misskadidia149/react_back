const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;
const fs = require('fs');

module.exports = {
  async createTache(req, res, next) {
    try {
      const { titre, description, deadline, moduleId, groupeId } = req.body;
      const enseignantId = req.user.id; // L'ID de l'enseignant connecté

      // Vérifier que le module appartient à l'enseignant
      const [modules] = await db.execute(
        'SELECT idModule FROM module WHERE idModule = ? AND enseignantId = ?',
        [moduleId, enseignantId]
      );
      
      if (modules.length === 0) {
        throw new AppError('Module non trouvé ou non autorisé', 404);
      }

      // Vérifier que le groupe existe et appartient au module
      if (groupeId) {
        const [groupes] = await db.execute(
          'SELECT idGroupe FROM groupe WHERE idGroupe = ? AND moduleId = ?',
          [groupeId, moduleId]
        );
        
        if (groupes.length === 0) {
          throw new AppError('Groupe non trouvé ou non autorisé', 404);
        }
      }

      // Gérer le fichier joint
      const fichierJoint = req.file ? req.file.path : null;

      // Créer la tâche (sans createurId)
      const [result] = await db.execute(
        'INSERT INTO tache (titre, description, deadline, fichierJoint, moduleId, groupeId) VALUES (?, ?, ?, ?, ?, ?)',
        [titre, description, deadline, fichierJoint, moduleId, groupeId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          tacheId: result.insertId
        }
      });
    } catch (err) {
      // Supprimer le fichier uploadé en cas d'erreur
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(err);
    }
  },

  async getTache(req, res, next) {
    try {
      const tacheId = req.params.id;

      // Récupérer la tâche avec les infos du module (sans createur)
      const [taches] = await db.execute(
        `SELECT t.*, m.nom AS moduleNom
         FROM tache t
         JOIN module m ON t.moduleId = m.idModule
         WHERE t.idTache = ?`,
        [tacheId]
      );

      if (taches.length === 0) {
        throw new AppError('Tâche non trouvée', 404);
      }

      // Vérifier les permissions
      await module.exports.verifyTacheAccess(tacheId, req.user.id);

      res.status(200).json({
        status: 'success',
        data: {
          tache: taches[0]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateTache(req, res, next) {
    try {
      const tacheId = req.params.id;
      const { titre, description, deadline, moduleId, groupeId } = req.body;
      const enseignantId = req.user.id;

      // Vérifier que la tâche existe et que le module appartient à l'enseignant
      const [taches] = await db.execute(
        `SELECT t.* FROM tache t
         JOIN module m ON t.moduleId = m.idModule
         WHERE t.idTache = ? AND m.enseignantId = ?`,
        [tacheId, enseignantId]
      );
      
      if (taches.length === 0) {
        throw new AppError('Tâche non trouvée ou non autorisée', 404);
      }

      const ancienFichier = taches[0].fichierJoint;
      const nouveauFichier = req.file ? req.file.path : ancienFichier;

      // Mettre à jour la tâche
      await db.execute(
        `UPDATE tache 
         SET titre = ?, description = ?, deadline = ?, fichierJoint = ?, moduleId = ?, groupeId = ?
         WHERE idTache = ?`,
        [titre, description, deadline, nouveauFichier, moduleId, groupeId, tacheId]
      );

      // Supprimer l'ancien fichier si remplacé
      if (req.file && ancienFichier) {
        fs.unlink(ancienFichier, () => {});
      }

      res.status(200).json({
        status: 'success',
        message: 'Tâche mise à jour avec succès'
      });
    } catch (err) {
      // Supprimer le nouveau fichier en cas d'erreur
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(err);
    }
  },

  async deleteTache(req, res, next) {
    try {
      const tacheId = req.params.id;
      const enseignantId = req.user.id;

      // Vérifier que la tâche existe et que le module appartient à l'enseignant
      const [taches] = await db.execute(
        `SELECT t.fichierJoint FROM tache t
         JOIN module m ON t.moduleId = m.idModule
         WHERE t.idTache = ? AND m.enseignantId = ?`,
        [tacheId, enseignantId]
      );
      
      if (taches.length === 0) {
        throw new AppError('Tâche non trouvée ou non autorisée', 404);
      }

      // Supprimer la tâche
      await db.execute(
        'DELETE FROM tache WHERE idTache = ?',
        [tacheId]
      );

      // Supprimer le fichier associé
      if (taches[0].fichierJoint) {
        fs.unlink(taches[0].fichierJoint, () => {});
      }

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  },

  async getTachesByModule(req, res, next) {
    try {
      const moduleId = req.params.id;

      // Vérifier l'accès au module
// ...existing code...
await module.exports.verifyModuleAccess(moduleId, req.user.id);
// ...existing code...      // Récupérer les tâches
      const [taches] = await db.execute(
        `SELECT t.*, g.nom AS groupeNom 
         FROM tache t
         LEFT JOIN groupe g ON t.groupeId = g.idGroupe
         WHERE t.moduleId = ?`,
        [moduleId]
      );

      res.status(200).json({
        status: 'success',
        results: taches.length,
        data: { taches }
      });
    } catch (err) {
      next(err);
    }
  },

  // Méthode utilitaire pour vérifier l'accès à une tâche
  async verifyTacheAccess(tacheId, userId) {
    const [access] = await db.execute(
      `SELECT 1 FROM tache t
       JOIN module m ON t.moduleId = m.idModule
       LEFT JOIN groupe g ON t.groupeId = g.idGroupe
       LEFT JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
       WHERE t.idTache = ? AND (
         m.enseignantId = ? OR
         gm.utilisateurId = ?
       )`,
      [tacheId, userId, userId]
    );
    
    if (access.length === 0) {
      throw new AppError('Accès non autorisé à cette tâche', 403);
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
  }
};