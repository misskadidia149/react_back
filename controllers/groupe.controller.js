const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;

module.exports = {
  async createGroupe(req, res, next) {
    try {
      const { nom, moduleId } = req.body;
      const enseignantId = req.user.id;

      // Vérifier que le module appartient à l'enseignant
      const [modules] = await db.execute(
        'SELECT idModule FROM module WHERE idModule = ? AND enseignantId = ?',
        [moduleId, enseignantId]
      );
      
      if (modules.length === 0) {
        throw new AppError('Module non trouvé ou non autorisé', 404);
      }

      // Générer un ID de groupe (ex: "grp-123")
      const idGroupe = `grp-${Date.now()}`;

      // Créer le groupe (sans coordinateur initial)
      await db.execute(
        'INSERT INTO groupe (idGroupe, nom, moduleId) VALUES (?, ?, ?)',
        [idGroupe, nom, moduleId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          groupeId: idGroupe
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async addMembre(req, res, next) {
    try {
      const groupeId = req.params.id;
      const { etudiantId } = req.body;

      // Vérifier les permissions
      await module.exports.verifyGroupePermissions(groupeId, req.user);

      // Vérifier que l'utilisateur est un étudiant
      const [etudiants] = await db.execute(
        'SELECT id FROM utilisateurs WHERE id = ? AND role = "Etudiant"',
        [etudiantId]
      );
      
      if (etudiants.length === 0) {
        throw new AppError('L\'utilisateur spécifié n\'est pas un étudiant', 400);
      }

      // Vérifier s'il est déjà membre
      const [existing] = await db.execute(
        'SELECT * FROM groupe_membre WHERE groupeId = ? AND utilisateurId = ?',
        [groupeId, etudiantId]
      );
      
      if (existing.length > 0) {
        throw new AppError('Cet étudiant est déjà membre du groupe', 400);
      }

      // Ajouter le membre
      await db.execute(
        'INSERT INTO groupe_membre (groupeId, utilisateurId) VALUES (?, ?)',
        [groupeId, etudiantId]
      );

      res.status(200).json({
        status: 'success',
        message: 'Membre ajouté avec succès'
      });
    } catch (err) {
      next(err);
    }
  },

  async removeMembre(req, res, next) {
    try {
      const { id: groupeId, membreId } = req.params;

      // Vérifier les permissions
      await this.verifyGroupePermissions(groupeId, req.user);

      // Vérifier si c'est le coordinateur
      const [groupes] = await db.execute(
        'SELECT coordinateurId FROM groupe WHERE idGroupe = ?',
        [groupeId]
      );
      
      if (groupes[0].coordinateurId == membreId) {
        throw new AppError('Impossible de retirer le coordinateur du groupe', 400);
      }

      // Retirer le membre
      await db.execute(
        'DELETE FROM groupe_membre WHERE groupeId = ? AND utilisateurId = ?',
        [groupeId, membreId]
      );

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  },

  async changeCoordinateur(req, res, next) {
    try {
      const groupeId = req.params.id;
      const { nouveauCoordinateurId } = req.body;

      // Vérifier que le demandeur est enseignant du module
      const [groupes] = await db.execute(
        `SELECT g.moduleId, m.enseignantId 
         FROM groupe g
         JOIN module m ON g.moduleId = m.idModule
         WHERE g.idGroupe = ?`,
        [groupeId]
      );
      
      if (groupes.length === 0 || groupes[0].enseignantId !== req.user.id) {
        throw new AppError('Non autorisé', 403);
      }

      // Vérifier que le nouveau coordinateur est membre du groupe
      const [membres] = await db.execute(
        'SELECT * FROM groupe_membre WHERE groupeId = ? AND utilisateurId = ?',
        [groupeId, nouveauCoordinateurId]
      );
      
      if (membres.length === 0) {
        throw new AppError('Le nouveau coordinateur doit être membre du groupe', 400);
      }

      // Mettre à jour le coordinateur
      await db.execute(
        'UPDATE groupe SET coordinateurId = ? WHERE idGroupe = ?',
        [nouveauCoordinateurId, groupeId]
      );

      // Mettre à jour le rôle si nécessaire
      await db.execute(
        'UPDATE utilisateurs SET role = "Coordinateur" WHERE id = ?',
        [nouveauCoordinateurId]
      );

      res.status(200).json({
        status: 'success',
        message: 'Coordinateur mis à jour avec succès'
      });
    } catch (err) {
      next(err);
    }
  },

  // Méthode utilitaire pour vérifier les permissions
  async verifyGroupePermissions(groupeId, user) {
    // Enseignants ont tous les droits
    if (user.role === 'Enseignant') {
      const [groupes] = await db.execute(
        `SELECT 1 FROM groupe g
         JOIN module m ON g.moduleId = m.idModule
         WHERE g.idGroupe = ? AND m.enseignantId = ?`,
        [groupeId, user.id]
      );
      
      if (groupes.length > 0) return;
    }

    // Coordinateurs ont des droits limités
    if (user.role === 'Coordinateur') {
      const [groupes] = await db.execute(
        'SELECT 1 FROM groupe WHERE idGroupe = ? AND coordinateurId = ?',
        [groupeId, user.id]
      );
      
      if (groupes.length > 0) return;
    }

    throw new AppError('Non autorisé', 403);
  }
};