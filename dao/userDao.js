const db = require("./db");

function findUserByUsername(username, callback) {
  const query = "SELECT * FROM users WHERE username = ?";

  db.get(query, [username], (err, user) => {
    callback(err, user);
  });
}

module.exports = {
  findUserByUsername,
};