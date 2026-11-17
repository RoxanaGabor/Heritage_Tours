const tourDao = require("../dao/tourDao");

async function getToursByCity(req, res) {
  const city = req.params.city.trim();

  if (!city) {
    return res.status(400).json({ error: "City is required" });
  }

  try {
    const tours = await tourDao.getToursByCity(city);
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve tours" });
  }
}

async function getToursByCityAndTheme(req, res) {
  const city = req.params.city.trim();
  const theme = req.params.theme.trim();

  if (!city || !theme) {
    return res.status(400).json({ error: "City and theme are required" });
  }

  try {
    const tours = await tourDao.getToursByCityAndTheme(city, theme);
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve tours" });
  }
}

async function getAvailability(req, res) {
  const tourID = Number(req.params.tourID);

  if (!Number.isInteger(tourID) || tourID <= 0) {
    return res.status(400).json({ error: "Valid tour ID is required" });
  }

  try {
    const availability = await tourDao.getAvailabilityByTourID(tourID);
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve availability" });
  }
}

module.exports = {
  getToursByCity,
  getToursByCityAndTheme,
  getAvailability,
};
