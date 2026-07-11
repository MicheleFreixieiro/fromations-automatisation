const nodemailer = require('nodemailer');
const Papa = require('papaparse');

// Transporter Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_PRO,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Récupérer les données de Google Sheets (CSV)
async function getSheetData() {
  try {
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${process.env.SHEETS_ID}/export?format=csv`;
    const response = await fetch(sheetsUrl);
    const csv = await response.text();
    const parsed = Papa.parse(csv, { header: false });
    return parsed.data;
  } catch (error) {
    console.error('Erreur lecture Sheets:', error);
    return [];
  }
}

// Générer fichier .ics
function generateICS(nom, formation, date, creneau, meetLink) {
  const lines = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Formations Michèle//Calendar//FR');
  lines.push('BEGIN:VEVENT');
  
  // Déterminer la date
  let dateObj;
  if (date.includes('Lundi')) {
    dateObj = new Date(2024, 6, 15); // Juillet 15
  } else {
    dateObj = new Date(2024, 6, 17); // Juillet 17
  }
  
  const [startHour] = creneau.split('-')[0].trim().split('h');
  const [endHour] = creneau.split('-')[1].trim().split('h');
  
  const start = new Date(dateObj);
  start.setHours(parseInt(startHour), 0);
  
  const end = new Date(dateObj);
  end.setHours(parseInt(endHour), 0);
  
  lines.push(`DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  lines.push(`DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  lines.push(`SUMMARY:${formation}`);
  lines.push(`DESCRIPTION:${meetLink}`);
  lines.push(`URL:${meetLink}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\n');
}

// Trouver lien Meet
function findMeetLink(data, theme, creneau) {
  for (let row of data) {
    if (row[0] === theme && row[2] === creneau) {
      return row[3];
    }
  }
  return null;
}

// Route principale
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nom, email, creneau, form_id } = req.body;

    if (!nom || !email || !creneau || !form_id) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // Récupérer les données Sheets
    const sheetData = await getSheetData();

    // Déterminer la formation
    let formation, theme, date, stripeLink;
    
    if (form_id === '1') {
      formation = 'Comment créer un système de contenus sans perdre votre identité';
      theme = 'Formation 1';
      date = 'Lundi 15 juillet';
      stripeLink = process.env.STRIPE_LINK_1;
    } else if (form_id === '2') {
      formation = 'Création et optimisation de Instagram';
      theme = 'Formation 2';
      date = 'Mercredi 17 juillet';
      stripeLink = process.env.STRIPE_LINK_2;
    }

    // Trouver le lien Meet
    const meetLink = findMeetLink(sheetData, theme, creneau);

    if (!meetLink) {
      return res.status(400).json({ error: 'Lien Meet non trouvé' });
    }

    // Générer .ics
    const ics = generateICS(nom, formation, date, creneau, meetLink);

    // Envoyer email
    const mailOptions = {
      from: process.env.GMAIL_PRO,
      to: email,
      subject: `Confirmation: ${formation}`,
      html: `
        <h2>Bonjour ${nom}!</h2>
        <p>Merci pour votre inscription à: <strong>${formation}</strong></p>
        
        <h3>📅 Détails:</h3>
        <ul>
          <li><strong>Formation:</strong> ${formation}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Créneau:</strong> ${creneau}</li>
        </ul>

        <h3>💰 Paiement:</h3>
        <p><a href="${stripeLink}" style="background: #A392D0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Payer 97€</a></p>

        <h3>🎥 Lien Meet:</h3>
        <p><a href="${meetLink}">Cliquez ici pour rejoindre</a></p>

        <h3>📱 Ajouter au calendrier:</h3>
        <p>Un fichier .ics est attaché. Ouvrez-le pour ajouter l'atelier à votre calendrier.</p>

        <p>À très bientôt!<br>Michèle Freixieiro</p>
      `,
      attachments: [{
        filename: `Atelier-${formation}.ics`,
        content: ics
      }]
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      success: true, 
      message: 'Email envoyé'
    });

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
