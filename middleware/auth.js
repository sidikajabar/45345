// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Check if user is NOT authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  res.redirect('/');
};

// Optional authentication - attach user if logged in
const optionalAuth = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

// Check if user is agent
const isAgent = (req, res, next) => {
  if (req.session.user && req.session.user.isAgent) {
    return next();
  }
  res.status(403).json({ error: 'Only AI agents can perform this action' });
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  optionalAuth,
  isAgent
};
