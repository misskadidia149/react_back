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

const soumissionRoutes = require('./routes/soumission.routes');
app.use('/api/soumissions', soumissionRoutes);

const progressionRoutes = require('./routes/progression.routes');
app.use('/api/progression', progressionRoutes);

const correctionRoutes = require('./routes/correction.routes');
app.use('/api/corrections', correctionRoutes);

const messageRoutes = require('./routes/message.routes');
app.use('/api/messages', messageRoutes);

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));