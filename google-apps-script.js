// COPIER CE CODE DANS GOOGLE APPS SCRIPT
// https://script.google.com

// Configuration
const VERCEL_WEBHOOK_URL = "https://YOUR_VERCEL_URL.vercel.app/api/webhook";
const FORM_ID_1 = "1m0TiojWDQj2E20Uhr22LF8-w4REvsIUubZPnxVzh18E"; // Form 1 ID
const FORM_ID_2 = "1V7JxBNM-y1rapH2hWzRnMHQApvRuKe6av5gcjdTZgMw"; // Form 2 ID
const SHEET_ID_1 = "Lookup_Formations"; // Nom de la feuille

// Fonction déclenchée quand une réponse est ajoutée au Form
function onFormSubmit(e) {
  try {
    const response = e.response;
    const formId = response.getFormId();
    
    // Récupérer les réponses
    const itemResponses = response.getItemResponses();
    
    let nom, email, creneau, form_type;
    
    for (let i = 0; i < itemResponses.length; i++) {
      const itemResponse = itemResponses[i];
      const title = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      if (title.includes("nom")) {
        nom = answer;
      }
      if (title.includes("email")) {
        email = answer;
      }
      if (title.includes("créneau")) {
        creneau = answer;
      }
    }

    // Déterminer le formulaire
    if (formId === FORM_ID_1) {
      form_type = "1";
    } else if (formId === FORM_ID_2) {
      form_type = "2";
    }

    // Préparer les données
    const payload = {
      nom: nom,
      email: email,
      creneau: creneau,
      form_id: form_type,
      timestamp: new Date().toISOString()
    };

    // Envoyer vers Vercel
    sendWebhook(payload);

  } catch (error) {
    Logger.log("Erreur: " + error);
  }
}

// Fonction pour envoyer le webhook
function sendWebhook(data) {
  try {
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(VERCEL_WEBHOOK_URL, options);
    Logger.log("Webhook sent. Response: " + response.getContentText());

  } catch (error) {
    Logger.log("Erreur webhook: " + error);
  }
}

// Fonction pour tester (optionnel)
function testWebhook() {
  const testData = {
    nom: "Test User",
    email: "test@example.com",
    creneau: "Lundi 15 juillet - 10h à 12h",
    form_id: "1",
    timestamp: new Date().toISOString()
  };
  
  sendWebhook(testData);
  Logger.log("Test webhook envoyé!");
}
