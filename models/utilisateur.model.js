const db = require('../config/db');

const Utilisateur = {
  create: (user, callback) => {
    const sql = 'INSERT INTO utilisateurs (nom, prenom, email, motdepasse, role) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [user.nom, user.prenom, user.email, user.motdepasse, user.role], callback);
  },

  getByEmail: (email, callback) => {
    db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], callback);
  }
};

module.exports = Utilisateur;
