
const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

document.querySelectorAll(".doctor-button").forEach((button) => {
  button.addEventListener("click", () => {
    const doctor = button.dataset.doctor;

    alert(
      `You selected ${doctor}.\n\nAppointment booking will be implemented in the next step.`
    );
  });
});
