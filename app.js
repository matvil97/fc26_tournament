const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyst3tVguSlIySk3tDXf7SHXLrdWtmZirLMBovBozroAL7PW-VwNeUHgB-4ru09ZP8/exec";

const form = document.getElementById("registrationForm");
const payBtn = document.getElementById("payBtn");
const statusMessage = document.getElementById("statusMessage");

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

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    console.log("Réponse brute Apps Script :", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Réponse invalide du serveur : " + text);
    }

    if (result.ok && result.checkoutUrl) {
      statusMessage.textContent = "Redirection vers Stripe...";
      window.location.href = result.checkoutUrl;
      return;
    }

    throw new Error(result.error || "Impossible de créer la session Stripe.");
  } catch (error) {
    console.error(error);
    payBtn.disabled = false;
    statusMessage.textContent = error.message || "Une erreur est survenue.";
  }
});