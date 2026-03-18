form.addEventListener("submit", async (e) => {
  e.preventDefault();

  statusMessage.textContent = "Redirection vers le paiement...";

  // Enregistrement simple (optionnel)
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "save_only",
      nomPrenom: document.getElementById("nomPrenom").value,
      pseudo: document.getElementById("pseudo").value,
      telephone: document.getElementById("telephone").value,
      email: document.getElementById("email").value,
      console: document.getElementById("console").value
    })
  });

  // Redirection Stripe
  window.location.href = "https://buy.stripe.com/bJe7sNgIk00lca92se4Ja00";
});