const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyst3tVguSlIySk3tDXf7SHXLrdWtmZirLMBovBozroAL7PW-VwNeUHgB-4ru09ZP8/exec";

const form = document.getElementById("registrationForm");
const payBtn = document.getElementById("payBtn");
const statusMessage = document.getElementById("statusMessage");

const paidCountEl = document.getElementById("paidCount");
const maxPlayersEl = document.getElementById("maxPlayers");
const remainingSpotsEl = document.getElementById("remainingSpots");

async function postToApi(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log("Réponse brute Apps Script :", text);

  let result;
  try {
    result = JSON.parse(text);
  } catch (parseError) {
    throw new Error("Réponse invalide du serveur : " + text);
  }

  if (!result.ok) {
    throw new Error(result.error || "Erreur API.");
  }

  return result;
}

async function loadRegistrationStats() {
  try {
    const result = await postToApi({
      action: "get_registration_stats"
    });

    paidCountEl.textContent = result.total_paid ?? 0;
    maxPlayersEl.textContent = result.max_players ?? 40;
    remainingSpotsEl.textContent = result.remaining_spots ?? 0;
  } catch (error) {
    console.error("Erreur stats inscription :", error);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  payBtn.disabled = true;
  statusMessage.textContent = "Création de votre paiement...";

  const data = {
    action: "create_checkout",
    nomPrenom: document.getElementById("nomPrenom").value.trim(),
    pseudo: document.getElementById("pseudo").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    email: document.getElementById("email").value.trim(),
    console: document.getElementById("console").value
  };

  console.log("Envoi vers Apps Script :", data);

  try {
    const result = await postToApi(data);

    if (result.ok && result.checkoutUrl) {
      statusMessage.textContent = "Redirection vers Stripe...";
      window.location.href = result.checkoutUrl;
      return;
    }

    throw new Error(result.error || "Impossible de créer la session Stripe.");
  } catch (error) {
    console.error("Erreur frontend :", error);
    payBtn.disabled = false;
    statusMessage.textContent = error.message || "Une erreur est survenue.";
    loadRegistrationStats();
  }
});

loadRegistrationStats();
setInterval(loadRegistrationStats, 15000);