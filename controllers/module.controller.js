const db = require('../config/db');
const AppError = require('../utils/helpers').AppError;

module.exports = {
  async createModule(req, res, next) {
    try {
      const { nom, code } = req.body;
      const enseignantId = req.user.id;

      // Vérification de l'unicité du code
      const [existing] = await db.execute(
        'SELECT idModule FROM module WHERE code = ?',
        [code]
      );
      
      if (existing.length > 0) {
        throw new AppError('Ce code de module existe déjà', 400);
      }

      // Création du module
      const [result] = await db.execute(
        'INSERT INTO module (nom, code, enseignantId) VALUES (?, ?, ?)',
        [nom, code, enseignantId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          moduleId: result.insertId
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getModule(req, res, next) {
    try {
      const moduleId = req.params.id;

      // Récupération du module avec l'enseignant
      const [modules] = await db.execute(
        `SELECT m.*, u.nom AS enseignantNom, u.prenom AS enseignantPrenom 
         FROM module m
         JOIN utilisateurs u ON m.enseignantId = u.id
         WHERE m.idModule = ?`,
        [moduleId]
      );

      if (modules.length === 0) {
        throw new AppError('Module non trouvé', 404);
      }

      res.status(200).json({
        status: 'success',
        data: {
          module: modules[0]
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async addStudent(req, res, next) {
    try {
      const moduleId = req.params.id;
      const { email } = req.body;

      // Vérification que le module appartient à l'enseignant
      const [modules] = await db.execute(
        'SELECT idModule FROM module WHERE idModule = ? AND enseignantId = ?',
        [moduleId, req.user.id]
      );
      
      if (modules.length === 0) {
        throw new AppError('Module non trouvé ou non autorisé', 404);
      }

      // Trouver l'étudiant par email
      const [users] = await db.execute(
        'SELECT id FROM utilisateurs WHERE email = ? AND role = "Etudiant"',
        [email]
      );
      
      if (users.length === 0) {
        throw new AppError('Aucun étudiant trouvé avec cet email', 404);
      }

      const etudiantId = users[0].id;

      // Ajouter l'étudiant via la table groupe_membre (solution alternative)
      // On considère qu'il existe un groupe par défaut pour chaque module
      const [groupes] = await db.execute(
        'SELECT idGroupe FROM groupe WHERE moduleId = ? LIMIT 1',
        [moduleId]
      );
      
      if (groupes.length === 0) {
        throw new AppError('Aucun groupe trouvé pour ce module', 404);
      }

      const groupeId = groupes[0].idGroupe;

      // Vérifier si déjà membre
      const [existing] = await db.execute(
        'SELECT * FROM groupe_membre WHERE groupeId = ? AND utilisateurId = ?',
        [groupeId, etudiantId]
      );
      
      if (existing.length > 0) {
        throw new AppError('Cet étudiant est déjà dans le groupe', 400);
      }

      // Ajouter au groupe (équivalent à l'inscription au module)
      await db.execute(
        'INSERT INTO groupe_membre (groupeId, utilisateurId) VALUES (?, ?)',
        [groupeId, etudiantId]
      );

      res.status(200).json({
        status: 'success',
        message: 'Étudiant ajouté avec succès'
      });
    } catch (err) {
      next(err);
    }
  },

  async getModuleTasks(req, res, next) {
    try {
      const moduleId = req.params.id;

      // Vérifier l'accès au module (via les groupes)
      const [access] = await db.execute(
        `SELECT 1 FROM groupe g
         JOIN groupe_membre gm ON g.idGroupe = gm.groupeId
         WHERE g.moduleId = ? AND (g.idGroupe IN (
           SELECT groupeId FROM groupe_membre WHERE utilisateurId = ?
         ) OR ? IN (
           SELECT enseignantId FROM module WHERE idModule = ?
         ))`,
        [moduleId, req.user.id, req.user.id, moduleId]
      );
      
      if (access.length === 0) {
        throw new AppError('Accès non autorisé à ce module', 403);
      }

      // Récupérer les tâches
      const [taches] = await db.execute(
        'SELECT * FROM tache WHERE moduleId = ?',
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
  }
};