const retry = document.getElementById("retry");
const message = document.getElementById("connection-message");
const updateConnection = () => {
  if (navigator.onLine) {
    message.textContent = "Připojení je dostupné. Klepni na tlačítko a vrať se do Pivníku.";
    retry.textContent = "Vrátit se do Pivníku";
  }
};
retry.addEventListener("click", () => {
  if (navigator.onLine) {
    if (window.location.pathname === "/offline.html") window.location.replace("/");
    else window.location.reload();
  }
  else message.textContent = "Internet zatím není dostupný. Zkontroluj Wi-Fi nebo mobilní data.";
});
window.addEventListener("online", updateConnection);
updateConnection();
