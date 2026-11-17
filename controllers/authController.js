const userDao = require("../dao/userDao");
const bcrypt = require("bcrypt");

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  userDao.findUserByUsername(username, async (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    let passwordMatches = user.password === password;

    try {
      if (user.password.startsWith("$2")) {
        passwordMatches = await bcrypt.compare(password, user.password);
      }
    } catch (compareErr) {
      return res.status(500).json({ error: "Password check failed" });
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.user = {
      username: user.username,
      isAdmin: user.isAdmin,
    };

    res.json({
      message: "Login successful",
      username: user.username,
      isAdmin: user.isAdmin,
    });
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
}

function status(req, res) {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    username: req.session.user.username,
    isAdmin: req.session.user.isAdmin,
  });
}

module.exports = {
  login,
  logout,
  status,
};
