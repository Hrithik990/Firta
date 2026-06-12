function requireAuth(req, res, next) {
  const userId = req.session && req.session.userId;
  if (userId) return next();
  res.redirect('/login');
}

function guestOnly(req, res, next) {
  const userId = req.session && req.session.userId;
  // Only redirect if we're SURE user is logged in
  if (userId) return res.redirect('/dashboard');
  next();
}

module.exports = { requireAuth, guestOnly };
