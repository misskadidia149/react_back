const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/helpers').AppError;

// Configuration des types MIME autorisés avec leurs extensions
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

// Dossier de destination des uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads/taches');

// Créer le dossier uploads de manière sécurisée
const createUploadDir = () => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { 
        recursive: true,
        mode: 0o755 // Permissions sécurisées
      });
    }
  } catch (err) {
    console.error('Erreur lors de la création du dossier upload:', err);
    throw new AppError('Erreur de configuration du serveur', 500);
  }
};

createUploadDir();

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    try {
      const ext = ALLOWED_FILE_TYPES[file.mimetype] || path.extname(file.originalname);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `tache-${uniqueSuffix}${ext}`;
      
      // Validation supplémentaire du nom de fichier
      if (!/^[a-z0-9-_.]+$/i.test(filename)) {
        return cb(new AppError('Nom de fichier non valide', 400));
      }
      
      cb(null, filename);
    } catch (err) {
      cb(err);
    }
  }
});

// Filtrage des fichiers
const fileFilter = (req, file, cb) => {
  try {
    // Vérification du type MIME
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
      return cb(new AppError(
        `Type de fichier non supporté. Types autorisés: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`,
        400
      ));
    }

    // Vérification de l'extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!Object.values(ALLOWED_FILE_TYPES).includes(ext)) {
      return cb(new AppError('Extension de fichier non autorisée', 400));
    }

    cb(null, true);
  } catch (err) {
    cb(err);
  }
};

// Configuration finale de Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 5 // Nombre max de fichiers
  },
  preservePath: true // Sécurité: ne pas utiliser les chemins complets
});

// Middleware de gestion des erreurs
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('La taille du fichier dépasse la limite autorisée (15MB)', 413));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Trop de fichiers uploadés (maximum 5)', 413));
    }
    return next(new AppError('Erreur lors de l\'upload du fichier', 400));
  }
  next(err);
};

module.exports = {
  upload,
  handleUploadErrors
};