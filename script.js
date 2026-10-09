
const $ = (selector) => document.querySelector(selector);

const modal = $("#bookingModal");
const form = $("#bookingForm");
const doctorSelect = $("#doctorSelect");
const dateInput = $("#appointmentDate");
const message = $("#bookingMessage");
const appointmentList = $("#appointmentList");

const STORAGE_KEY = "medicare_demo_appointments";

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


function openBooking(doctor = "") {
  form.reset();
  message.textContent = "";
  doctorSelect.value = doctor;

  const now = new Date();
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // HTML date inputs require YYYY-MM-DD.
  dateInput.min = `${year}-${month}-${day}`;
  dateInput.value = "";

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
    // The navigation link still scrolls to the doctor section.
  });
});

$("#closeBooking").addEventListener("click", closeBooking);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeBooking();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeBooking();
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
    details.textContent =
      `${appointment.date} at ${appointment.time}`;

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
  const time = $("#appointmentTime").value;

  if (!name || !phone || !doctor || !date || !time) {
    message.textContent = "Please complete all fields.";
    return;
  }

  // Compare date strings in YYYY-MM-DD format.
  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  if (date < localToday) {
    message.textContent = "Please select today or a future date.";
    return;
  }

  const appointments = getAppointments();

  const alreadyBooked = appointments.some((item) =>
    item.doctor === doctor &&
    item.date === date &&
    item.time === time
  );

  if (alreadyBooked) {
    message.textContent =
      "That doctor already has a demo booking for this slot. Choose another time.";
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
