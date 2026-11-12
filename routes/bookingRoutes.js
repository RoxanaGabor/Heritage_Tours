const express = require("express");
const router = express.Router();
const { requireLogin } = require("../middleware/authMiddleware");
const bookingController = require("../controllers/bookingController");

router.get("/my-bookings", requireLogin, bookingController.getMyBookings);
router.post("/", requireLogin, bookingController.createBooking);

module.exports = router;
