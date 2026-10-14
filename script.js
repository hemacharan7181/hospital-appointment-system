
const API_BASE_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") ? "http://localhost:3000" : "https://REPLACE-WITH-RENDER-URL.onrender.com";

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

const aiChatToggle = $("#aiChatToggle");
const aiChatPanel = $("#aiChatPanel");
const aiChatClose = $("#aiChatClose");
const aiChatMessages = $("#aiChatMessages");
const aiChatForm = $("#aiChatForm");
const aiChatInput = $("#aiChatInput");
const aiChatSend = aiChatForm.querySelector("button[type='submit']");
const aiChatHistory = [];

function addAiChatBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `ai-chat-bubble ai-chat-${role === "user" ? "user" : "bot"}`;
  bubble.textContent = text;
  bubble.dataset.role = role;
  aiChatMessages.appendChild(bubble);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  return bubble;
}

function getOfflineAssistantReply(question) {
  const normalizedQuestion = question.toLowerCase();
  const hasAny = (...terms) =>
    terms.some((term) => normalizedQuestion.includes(term));

  if (/^(hi|hello|hey|helo|good morning|good afternoon|good evening)[!. ]*$/.test(normalizedQuestion)) {
    return "Hello! I can help you choose the right MediCare department and doctor. Tell me what symptoms or health concern you have; I cannot diagnose or prescribe.";
  }

  if (hasAny("emergency", "can't breathe", "cannot breathe", "chest pain", "unconscious", "severe bleeding", "stroke", "seizure", "overdose", "suicid", "kill myself")) {
    return "What you described may need urgent medical attention. Contact local emergency services now or go to the nearest emergency department; this assistant cannot diagnose or treat emergencies.";
  }

  if (hasAny("cardio", "heart", "blood pressure", "palpitation", "irregular heartbeat")) {
    return "Heart, chest or blood-pressure concerns are best started with Cardiology and Dr. Priya Sharma. I cannot diagnose or prescribe, but you can click Book Appointment to see the available time slots.";
  }

  if (hasAny("skin", "hair", "rash", "ringworm", "scabies", "scabie", "fungal", "itch", "acne", "eczema", "psoriasis", "boil")) {
    if (normalizedQuestion.includes("scab") && !normalizedQuestion.includes("scabies")) {
      return "A scab is a crust that can form while a wound heals; it is different from scabies. If the area is painful, spreading, infected-looking or not healing, consult Dermatology with Dr. Rahul Patel. I cannot diagnose or prescribe.";
    }
    if (normalizedQuestion.includes("scabies") || normalizedQuestion.includes("scabie")) {
      return "Scabies is a contagious skin condition commonly associated with intense itching and a rash, but this assistant cannot confirm a diagnosis. Consult Dermatology with Dr. Rahul Patel and avoid close skin contact until you receive professional advice.";
    }
    return "Your concern sounds related to the skin, hair or nails, so Dermatology with Dr. Rahul Patel is the best starting point. I cannot diagnose or prescribe; click Book Appointment to see the available time slots.";
  }

  if (hasAny("fever", "cold", "flu", "cough", "breathless", "stomach", "vomit", "diarr", "constipation", "nausea", "headache", "migraine", "sore throat", "back pain", "joint pain", "body pain", "fatigue", "dizzy", "diabetes", "thyroid", "urine", "urinary", "period", "menstrual", "pregnan", "general physician")) {
    return "For this general or ongoing health concern, General Physician Dr. Arjun Mehta is the best first consultation. I cannot diagnose or prescribe; describe the symptoms to the doctor and click Book Appointment to see available time slots.";
  }

  if (hasAny("eye", "vision", "ear", "hearing", "tooth", "teeth", "dental", "anxiety", "depress", "sleep")) {
    return "MediCare does not list a separate specialist for that concern, so start with General Physician Dr. Arjun Mehta. They can assess you and guide you to further care; I cannot diagnose or prescribe.";
  }

  if (hasAny("what should i do", "help me", "symptom", "problem", "pain", "hurt", "swollen", "swelling")) {
    return "Tell me where the problem is, how long it has been present, and whether it is getting worse. I cannot diagnose or prescribe, but General Physician Dr. Arjun Mehta is the best first consultation for symptoms not clearly linked to Cardiology or Dermatology.";
  }

  if (hasAny("who should", "which doctor", "whom should", "consult")) {
    return "Please describe your main symptom or concern so I can guide you to the closest MediCare department. I cannot diagnose or prescribe.";
  }

  if (hasAny("book", "appointment", "doctor")) {
    return "You can book with Dr. Arjun Mehta, Dr. Priya Sharma or Dr. Rahul Patel. Tell me your main concern if you want help choosing a department, then click Book Appointment to see available time slots.";
  }

  return "I can help you choose among General Physician, Cardiology and Dermatology. What symptom or health concern are you experiencing? I will not diagnose or prescribe.";
}

aiChatToggle.addEventListener("click", () => {
  aiChatPanel.hidden = false;
  aiChatInput.focus();
});

aiChatClose.addEventListener("click", () => {
  aiChatPanel.hidden = true;
});

aiChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const chatMessage = aiChatInput.value.trim();
  if (!chatMessage || aiChatSend.disabled) return;

  aiChatInput.value = "";
  addAiChatBubble(chatMessage, "user");
  const history = aiChatHistory.slice(-6);
  aiChatHistory.push({ role: "user", text: chatMessage });
  const thinkingBubble = addAiChatBubble("Thinking...", "bot");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  aiChatSend.disabled = true;
  aiChatInput.disabled = true;

  try {
    if (API_BASE_URL.includes("REPLACE-WITH-RENDER-URL")) {
      throw new Error("No remote AI service configured.");
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: chatMessage,
        history
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "The assistant could not respond.");
    }

    const reply = typeof data.reply === "string" && data.reply.trim()
      ? data.reply.trim()
      : "The assistant is busy, please try again in a moment.";
    thinkingBubble.textContent = reply;
    aiChatHistory.push({ role: "assistant", text: reply });
  } catch {
    const normalizedChatMessage = chatMessage.toLowerCase();
    const followUpQuestion =
      normalizedChatMessage.includes("which doctor") ||
      normalizedChatMessage.includes("whom") ||
      normalizedChatMessage.includes("who should") ||
      normalizedChatMessage.includes("consult");
    const previousUserMessage = aiChatHistory
      .filter((item) => item.role === "user")
      .slice(-2, -1)
      .map((item) => item.text)
      .join(" ");
    const offlineReply = getOfflineAssistantReply(
      followUpQuestion ? `${previousUserMessage} ${chatMessage}` : chatMessage
    );
    thinkingBubble.textContent = offlineReply;
    aiChatHistory.push({ role: "assistant", text: offlineReply });
  } finally {
    clearTimeout(timeoutId);
    aiChatSend.disabled = false;
    aiChatInput.disabled = false;
    aiChatInput.focus();
  }
});

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
