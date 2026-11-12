const db = require("./db");

function getBookingsByUsername(username) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        bookings.id,
        tours.title,
        tours.city,
        tours.theme,
        bookings.theDate,
        bookings.visitors
      FROM bookings
      JOIN tours ON bookings.tourID = tours.id
      WHERE bookings.username = ?
      ORDER BY bookings.theDate ASC
    `;

    db.all(sql, [username], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function createBooking({ tourID, theDate, username, visitors }) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN IMMEDIATE TRANSACTION");

      db.get(
        "SELECT maxPlaces FROM availability WHERE tourID = ? AND theDate = ?",
        [tourID, theDate],
        (availabilityErr, availability) => {
          if (availabilityErr) {
            return rollback(reject, availabilityErr);
          }

          if (!availability) {
            return rollbackWithCode(reject, "NO_AVAILABILITY");
          }

          if (availability.maxPlaces < visitors) {
            return rollbackWithCode(reject, "NOT_ENOUGH_PLACES");
          }

          db.run(
            "INSERT INTO bookings (tourID, theDate, username, visitors) VALUES (?, ?, ?, ?)",
            [tourID, theDate, username, visitors],
            function insertCallback(insertErr) {
              if (insertErr) {
                return rollback(reject, insertErr);
              }

              db.run(
                "UPDATE availability SET maxPlaces = maxPlaces - ? WHERE tourID = ? AND theDate = ?",
                [visitors, tourID, theDate],
                (updateErr) => {
                  if (updateErr) {
                    return rollback(reject, updateErr);
                  }

                  db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                      return rollback(reject, commitErr);
                    }

                    resolve({ bookingID: this.lastID });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
}

function rollback(reject, err) {
  db.run("ROLLBACK", () => reject(err));
}

function rollbackWithCode(reject, code) {
  const err = new Error(code);
  err.code = code;
  rollback(reject, err);
}

module.exports = {
  getBookingsByUsername,
  createBooking
};
