
const $ = (selector) => document.querySelector(selector);

const modal = $("#bookingModal");
const form = $("#bookingForm");
const doctorSelect = $("#doctorSelect");
const dateInput = $("#appointmentDate");
const timeSelect = $("#appointmentTime");
const message = $("#bookingMessage");
const appointmentList = $("#appointmentList");

const STORAGE_KEY = "medicare_demo_appointments";

// Preserve the time slots defined in index.html.
const originalTimeOptions = Array.from(timeSelect.options).map((option) => ({
  value: option.value,
  text: option.textContent,
  disabled: option.disabled
}));

function getAppointments() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAppointments(appointments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Refresh available slots for the selected doctor and date.
function refreshAvailableSlots() {
  const doctor = doctorSelect.value;
  const date = dateInput.value;
  const previousTime = timeSelect.value;

  timeSelect.replaceChildren();

  const placeholder = originalTimeOptions.find(
    (option) => option.value === ""
  );

  if (placeholder) {
    timeSelect.add(new Option(placeholder.text, ""));
  } else {
    timeSelect.add(new Option("Select a time", ""));
  }

  // Until a doctor and date are selected, show the normal slot list.
  if (!doctor || !date) {
    originalTimeOptions
      .filter((option) => option.value !== "")
      .forEach((option) => {
        const newOption = new Option(option.text, option.value);
        newOption.disabled = option.disabled;
        timeSelect.add(newOption);
      });

    return;
  }

  const bookedTimes = new Set(
    getAppointments()
      .filter(
        (appointment) =>
          appointment.doctor === doctor &&
          appointment.date === date
      )
      .map((appointment) => appointment.time)
  );

  const availableOptions = originalTimeOptions.filter(
    (option) =>
      option.value !== "" &&
      !bookedTimes.has(option.value) &&
      !option.disabled
  );

  availableOptions.forEach((option) => {
    timeSelect.add(new Option(option.text, option.value));
  });

  if (availableOptions.length === 0) {
    timeSelect.add(
      new Option("No slots available — choose another date", "")
    );
    message.textContent = "No time slots remain for this doctor on this date.";
    return;
  }

  // Keep the previous selection only if it remains available.
  if (availableOptions.some((option) => option.value === previousTime)) {
    timeSelect.value = previousTime;
  }
}

function openBooking(doctor = "") {
  form.reset();
  message.textContent = "";
  doctorSelect.value = doctor;

  dateInput.min = getLocalDate();
  dateInput.value = "";

  refreshAvailableSlots();

  modal.hidden = false;
  $("#patientName").focus();
}

function closeBooking() {
  modal.hidden = true;
}

document.querySelectorAll(".doctor-button").forEach((button) => {
  button.addEventListener("click", () => {
    openBooking(button.dataset.doctor);
  });
});

document.querySelectorAll('a[href="#doctors"]').forEach((link) => {
  link.addEventListener("click", () => {
    // Keep the normal navigation behavior.
  });
});

$("#closeBooking").addEventListener("click", closeBooking);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeBooking();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeBooking();
});

// Update slots whenever the doctor or appointment date changes.
doctorSelect.addEventListener("change", refreshAvailableSlots);
dateInput.addEventListener("change", () => {
  message.textContent = "";
  refreshAvailableSlots();
});

function renderAppointments() {
  const appointments = getAppointments();
  appointmentList.replaceChildren();

  if (appointments.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No appointments booked yet.";
    appointmentList.appendChild(empty);
    return;
  }

  appointments.forEach((appointment) => {
    const card = document.createElement("article");
    card.className = "appointment-item";

    const title = document.createElement("h3");
    title.textContent = appointment.doctor;

    const details = document.createElement("p");
    details.textContent = `${appointment.date} at ${appointment.time}`;

    const status = document.createElement("p");
    status.textContent = `Patient: ${appointment.name}`;

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel-appointment";
    cancel.textContent = "Cancel Appointment";

    cancel.addEventListener("click", () => {
      const updated = getAppointments().filter(
        (item) => item.id !== appointment.id
      );

      saveAppointments(updated);
      renderAppointments();
      refreshAvailableSlots();
    });

    card.append(title, details, status, cancel);
    appointmentList.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const name = $("#patientName").value.trim();
  const phone = $("#patientPhone").value.trim();
  const doctor = doctorSelect.value;
  const date = dateInput.value;
  const time = timeSelect.value;

  if (!name || !phone || !doctor || !date || !time) {
    message.textContent = "Please complete all fields.";
    return;
  }

  if (date < getLocalDate()) {
    message.textContent = "Please select today or a future date.";
    return;
  }

  const appointments = getAppointments();

  // Check again during submission to prevent duplicate demo bookings.
  const alreadyBooked = appointments.some(
    (item) =>
      item.doctor === doctor &&
      item.date === date &&
      item.time === time
  );

  if (alreadyBooked) {
    message.textContent =
      "That time slot was just booked. Please choose another time.";
    refreshAvailableSlots();
    return;
  }

  const appointment = {
    id: crypto.randomUUID(),
    name,
    phone,
    doctor,
    date,
    time
  };

  appointments.push(appointment);
  saveAppointments(appointments);

  renderAppointments();

  form.reset();
  message.textContent = "Appointment booked successfully!";
  closeBooking();

  $("#myAppointments").scrollIntoView({ behavior: "smooth" });
});

$("#year").textContent = new Date().getFullYear();

renderAppointments();
