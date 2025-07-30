const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const utilisateurRoutes = require('./routes/utilisateur.routes');
app.use('/api/utilisateurs', utilisateurRoutes);

const moduleRoutes = require('./routes/module.routes');
app.use('/api/modules', moduleRoutes);

const groupeRoutes = require('./routes/groupe.routes');
app.use('/api/groupes', groupeRoutes);

const tacheRoutes = require('./routes/tache.routes');
app.use('/api/taches', tacheRoutes);

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));