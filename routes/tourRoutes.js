const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");

router.get("/city/:city/theme/:theme", tourController.getToursByCityAndTheme);
router.get("/city/:city", tourController.getToursByCity);
router.get("/:tourID/availability", tourController.getAvailability);

module.exports = router;
