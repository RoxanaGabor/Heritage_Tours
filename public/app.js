const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const themeInput = document.getElementById("themeInput");
const resultsDiv = document.getElementById("results");
const message = document.getElementById("message");
const successBox = document.getElementById("successMessage");
const myBookingsDiv = document.getElementById("myBookings");

const availabilityCache = new Map();
let markers = [];

const map = L.map("map").setView([52.3555, -1.1743], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

setTimeout(() => {
  map.invalidateSize();
}, 500);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function yyMMddToDateInput(value) {
  if (!/^\d{6}$/.test(value)) {
    return "";
  }

  return `20${value.substring(0, 2)}-${value.substring(2, 4)}-${value.substring(4, 6)}`;
}

function dateInputToYYMMDD(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  return `${value.substring(2, 4)}${value.substring(5, 7)}${value.substring(8, 10)}`;
}

function formatTourDate(value) {
  const inputDate = yyMMddToDateInput(value);

  if (!inputDate) {
    return value;
  }

  return new Date(`${inputDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function setStatus(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "status-text error-text" : "status-text";
}

function showSuccess(text) {
  successBox.textContent = text;
  successBox.classList.remove("hidden");
}

function hideSuccess() {
  successBox.textContent = "";
  successBox.classList.add("hidden");
}

function clearMarkers() {
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];
}

async function getAvailability(tourID) {
  if (availabilityCache.has(tourID)) {
    return availabilityCache.get(tourID);
  }

  const response = await fetch(`/api/tours/${tourID}/availability`);
  const availability = await response.json();

  if (!response.ok) {
    throw new Error(availability.error || "Availability could not be loaded");
  }

  availabilityCache.set(tourID, availability);
  return availability;
}

function dateOptionsHtml(tourID, availability) {
  const datalistId = `dates-${tourID}`;
  const options = availability
    .map(
      (item) =>
        `<option value="${yyMMddToDateInput(item.theDate)}">${formatTourDate(item.theDate)}</option>`,
    )
    .join("");

  return `<datalist id="${datalistId}">${options}</datalist>`;
}

function bookingFormHtml(tour, availability, compact = false) {
  if (availability.length === 0) {
    return `<p class="muted">No available dates.</p>`;
  }

  const dates = availability.map((item) => yyMMddToDateInput(item.theDate));
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const maxVisitors = Math.max(
    ...availability.map((item) => Number(item.maxPlaces)),
  );
  const listId = `dates-${tour.id}`;

  return `
    <form class="booking-form${compact ? " popup-booking-form" : ""}" data-tour-id="${tour.id}">
      <label>
        Date
        <input type="date" name="bookingDate" list="${listId}" min="${minDate}" max="${maxDate}" value="${minDate}" required>
      </label>
      <label>
        Visitors
        <input type="number" name="visitors" min="1" max="${maxVisitors}" value="1" required>
      </label>
      ${dateOptionsHtml(tour.id, availability)}
      <button type="submit">Book Tour</button>
    </form>
  `;
}

function showToursOnMap(tours) {
  clearMarkers();

  tours.forEach((tour) => {
    const marker = L.marker([tour.latitude, tour.longitude]).addTo(map);
    const availability = availabilityCache.get(tour.id) || [];

    marker.bindPopup(`
      <strong>${escapeHtml(tour.title)}</strong><br>
      Theme: ${escapeHtml(tour.theme)}<br>
      City: ${escapeHtml(tour.city)}
      ${bookingFormHtml(tour, availability, true)}
    `);

    markers.push(marker);
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

async function refreshLoginStatus() {
  try {
    const response = await fetch("/api/auth/status");
    const status = await response.json();

    if (status.loggedIn) {
      authMessage.textContent = `Logged in as ${status.username}`;
      loginForm.style.display = "none";
      logoutBtn.style.display = "inline-block";
      await loadBookings();
      return;
    }

    authMessage.textContent = "Not logged in.";
    loginForm.style.display = "";
    logoutBtn.style.display = "none";
    myBookingsDiv.innerHTML = "<p>Log in to view your bookings.</p>";
  } catch (error) {
    authMessage.textContent = "Could not check login status.";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      authMessage.textContent = result.error || "Login failed.";
      return;
    }

    authMessage.textContent = `Logged in as ${result.username}`;
    loginForm.reset();
    loginForm.style.display = "none";
    logoutBtn.style.display = "inline-block";
    await loadBookings();
  } catch (error) {
    authMessage.textContent = "Could not connect to login service.";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    authMessage.textContent = "Logged out.";
    loginForm.style.display = "";
    logoutBtn.style.display = "none";
    myBookingsDiv.innerHTML = "<p>Log in to view your bookings.</p>";
  } catch (error) {
    authMessage.textContent = "Could not log out.";
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  const theme = themeInput.value.trim();
  const endpoint = theme
    ? `/api/tours/city/${encodeURIComponent(city)}/theme/${encodeURIComponent(theme)}`
    : `/api/tours/city/${encodeURIComponent(city)}`;

  resultsDiv.innerHTML = "";
  hideSuccess();
  setStatus("Searching...");

  try {
    const response = await fetch(endpoint);
    const tours = await response.json();

    if (!response.ok) {
      setStatus(tours.error || "Something went wrong while searching.", true);
      clearMarkers();
      return;
    }

    if (tours.length === 0) {
      setStatus("No tours found for this search.");
      clearMarkers();
      return;
    }

    await Promise.all(tours.map((tour) => getAvailability(tour.id)));
    setStatus(`${tours.length} tour(s) found.`);
    showToursOnMap(tours);
    renderTourResults(tours);
  } catch (error) {
    setStatus("Could not connect to the server.", true);
  }
});

function renderTourResults(tours) {
  resultsDiv.innerHTML = "";

  tours.forEach((tour) => {
    const availability = availabilityCache.get(tour.id) || [];
    const card = document.createElement("article");
    card.className = "tour-card";

    const title = document.createElement("h3");
    title.textContent = tour.title;

    const city = document.createElement("p");
    city.innerHTML = `<strong>City:</strong> ${escapeHtml(tour.city)}`;

    const theme = document.createElement("p");
    theme.innerHTML = `<strong>Theme:</strong> ${escapeHtml(tour.theme)}`;

    const description = document.createElement("p");
    description.textContent = tour.description;

    const dates = document.createElement("p");
    dates.className = "muted";
    dates.textContent = availability.length
      ? `Available: ${availability.map((item) => `${formatTourDate(item.theDate)} (${item.maxPlaces} places)`).join(", ")}`
      : "No available dates.";

    const formWrapper = document.createElement("div");
    formWrapper.innerHTML = bookingFormHtml(tour, availability);

    card.append(title, city, theme, description, dates, formWrapper);
    resultsDiv.appendChild(card);
  });
}

async function loadBookings() {
  try {
    const response = await fetch("/api/bookings/my-bookings");

    if (response.status === 403) {
      myBookingsDiv.innerHTML = "<p>Log in to view your bookings.</p>";
      return;
    }

    const bookings = await response.json();

    if (!response.ok) {
      myBookingsDiv.innerHTML = `<p>${escapeHtml(bookings.error || "Bookings could not be loaded.")}</p>`;
      return;
    }

    if (bookings.length === 0) {
      myBookingsDiv.innerHTML = "<p>No bookings found.</p>";
      return;
    }

    myBookingsDiv.innerHTML = "";

    bookings.forEach((booking) => {
      const bookingCard = document.createElement("div");
      const detailsId = `booking-details-${booking.id}`;

      bookingCard.className = "tour-card booking-card";
      bookingCard.innerHTML = `
        <div class="booking-summary">
          <div>
            <h3>${escapeHtml(booking.title)}</h3>
            <p>${formatTourDate(booking.theDate)} · ${escapeHtml(booking.visitors)} ticket(s)</p>
          </div>
          <button type="button" class="booking-more-btn" aria-expanded="false" aria-controls="${detailsId}">
            More
          </button>
        </div>
        <div id="${detailsId}" class="booking-details hidden">
          <p><strong>City:</strong> ${escapeHtml(booking.city)}</p>
          <p><strong>Theme:</strong> ${escapeHtml(booking.theme)}</p>
          <p><strong>Booking reference:</strong> ${escapeHtml(booking.id)}</p>
          <p><strong>Date:</strong> ${formatTourDate(booking.theDate)}</p>
          <p><strong>Tickets:</strong> ${escapeHtml(booking.visitors)}</p>
        </div>
      `;

      myBookingsDiv.appendChild(bookingCard);
    });
  } catch (error) {
    myBookingsDiv.innerHTML = "<p>Could not load bookings.</p>";
  }
}

document.addEventListener("submit", async (event) => {
  const form = event.target;

  if (!form.classList.contains("booking-form")) {
    return;
  }

  event.preventDefault();
  await submitBooking(form);
});

myBookingsDiv.addEventListener("click", (event) => {
  const button = event.target.closest(".booking-more-btn");

  if (!button) {
    return;
  }

  const details = document.getElementById(button.getAttribute("aria-controls"));
  const isExpanded = button.getAttribute("aria-expanded") === "true";

  details.classList.toggle("hidden", isExpanded);
  button.setAttribute("aria-expanded", String(!isExpanded));
  button.textContent = isExpanded ? "More" : "Less";
});

async function submitBooking(form) {
  const tourID = Number(form.dataset.tourId);
  const selectedDate = form.elements.bookingDate.value;
  const visitors = Number(form.elements.visitors.value);
  const theDate = dateInputToYYMMDD(selectedDate);
  const availability = availabilityCache.get(tourID) || [];
  const selectedAvailability = availability.find(
    (item) => item.theDate === theDate,
  );

  hideSuccess();

  if (!selectedAvailability) {
    setStatus("Choose one of the available dates for this tour.", true);
    return;
  }

  if (!Number.isInteger(visitors) || visitors <= 0) {
    setStatus("Visitors must be a positive whole number.", true);
    return;
  }

  if (visitors > selectedAvailability.maxPlaces) {
    setStatus(
      `Only ${selectedAvailability.maxPlaces} places are available on that date.`,
      true,
    );
    return;
  }

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourID, theDate, visitors }),
    });

    const result = await response.json();

    if (response.status === 403) {
      setStatus("You must log in before booking a tour.", true);
      return;
    }

    if (!response.ok) {
      setStatus(result.error || "Booking failed.", true);
      return;
    }

    showSuccess("Booking successful.");
    setStatus("");
    availabilityCache.delete(tourID);
    await getAvailability(tourID);
    await loadBookings();
  } catch (error) {
    setStatus("Could not complete booking.", true);
  }
}

refreshLoginStatus();
