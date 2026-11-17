const db = require("./db");

function getToursByCity(city) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM tours WHERE LOWER(city) = LOWER(?)";

    db.all(sql, [city], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getToursByCityAndTheme(city, theme) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT *
      FROM tours
      WHERE LOWER(city) = LOWER(?)
      AND LOWER(theme) = LOWER(?)
    `;

    db.all(sql, [city, theme], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAvailabilityByTourID(tourID) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT theDate, maxPlaces
      FROM availability
      WHERE tourID = ?
      AND maxPlaces > 0
      ORDER BY theDate ASC
    `;

    db.all(sql, [tourID], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  getToursByCity,
  getToursByCityAndTheme,
  getAvailabilityByTourID,
};
