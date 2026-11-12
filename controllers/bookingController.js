const bookingDao = require("../dao/bookingDao");

function parseTourDate(theDate) {
  if (!/^\d{6}$/.test(theDate)) {
    return null;
  }

  const year = 2000 + Number(theDate.substring(0, 2));
  const month = Number(theDate.substring(2, 4)) - 1;
  const day = Number(theDate.substring(4, 6));
  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

async function getMyBookings(req, res) {
  try {
    const bookings = await bookingDao.getBookingsByUsername(req.session.user.username);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve bookings" });
  }
}

async function createBooking(req, res) {
  const tourID = Number(req.body.tourID);
  const theDate = String(req.body.theDate || "").trim();
  const visitors = Number(req.body.visitors);
  const username = req.session.user.username;

  if (!tourID || !theDate || !visitors) {
    return res.status(400).json({ error: "Tour, date and visitors are required" });
  }

  if (!Number.isInteger(tourID) || tourID <= 0) {
    return res.status(400).json({ error: "Valid tour ID is required" });
  }

  if (!Number.isInteger(visitors) || visitors <= 0) {
    return res.status(400).json({ error: "Visitors must be a positive whole number" });
  }

  const bookingDate = parseTourDate(theDate);

  if (!bookingDate) {
    return res.status(400).json({ error: "Date must use YYMMDD format" });
  }

  if (bookingDate < startOfTodayUtc()) {
    return res.status(400).json({ error: "Bookings cannot be made for past dates" });
  }

  try {
    const booking = await bookingDao.createBooking({ tourID, theDate, username, visitors });
    res.status(201).json({ message: "Booking successful", bookingID: booking.bookingID });
  } catch (err) {
    if (err.code === "NO_AVAILABILITY") {
      return res.status(404).json({ error: "No availability found for that tour date" });
    }

    if (err.code === "NOT_ENOUGH_PLACES") {
      return res.status(409).json({ error: "Not enough places available" });
    }

    res.status(500).json({ error: "Booking failed" });
  }
}

module.exports = {
  getMyBookings,
  createBooking
};
