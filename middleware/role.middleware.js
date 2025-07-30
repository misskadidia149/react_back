const AppError = require('../utils/helpers').AppError;

module.exports = (roles) => {
  return (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        throw new AppError(
          'Vous n\'avez pas la permission d\'effectuer cette action',
          403
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};