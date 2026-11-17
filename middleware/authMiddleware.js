function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(403).json({ error: "You must be logged in to book" });
  }

  next();
}

module.exports = {
  requireLogin,
};
