const nodemailer = require('nodemailer');
const Papa = require('papaparse');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAILPRO,
    pass: process.env.GMAILPASSWORD
  }
});

async function getSheetData() {
  try {
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${process.env.SHEETSID}/export?format=csv`;
    const response = await fetch(sheetsUrl);
    const csv = await response.text();
    const parsed = Papa.parse(csv, { header: false });
    return parsed.data;
  } catch (error) {
    console.error('Erreur Sheets:', error);
    return [];
  }
}

function generateICS(nom, formation, date, creneau, meetLink) {
  const lines = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Formations//Calendar//FR');
  lines.push('BEGIN:VEVENT');
  lines.push(`SUMMARY:${formation}`);
  lines.push(`DESCRIPTION:${meetLink}`);
  lines.push(`URL:${meetLink}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\n');
}

function findMeetLink(data, theme, creneau) {
  for (let row of data) {
    if (row[0] === theme && row[2] === creneau) {
      return row[3];
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nom, email, creneau, form_id } = req.body;

    if (!nom || !email || !creneau || !form_id) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    const sheetData = await getSheetData();

    let formation, theme, date, stripeLink;
    
    if (form_id === '1') {
      formation = 'Comment créer un système de contenus sans perdre votre identité';
      theme = 'Formation 1';
      date = 'Lundi 15 juillet';
      stripeLink = process.env.STRIPELINK1;
    } else if (form_id === '2') {
      formation = 'Création et optimisation de Instagram';
      theme = 'Formation 2';
      date = 'Mercredi 17 juillet';
      stripeLink = process.env.STRIPELINK2;
    }

    const meetLink = findMeetLink(sheetData, theme, creneau);

    if (!meetLink) {
      return res.status(400).json({ error: 'Lien Meet non trouvé' });
    }

    const ics = generateICS(nom, formation, date, creneau, meetLink);

    const mailOptions = {
      from: process.env.GMAILPRO,
      to: email,
      subject: `Confirmation: ${formation}`,
      html: `
        <h2>Bonjour ${nom}!</h2>
        <p>Merci pour votre inscription à: <strong>${formation}</strong></p>
        <h3>📅 Détails:</h3>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Créneau:</strong> ${creneau}</li>
        </ul>
        <h3>💰 Paiement:</h3>
        <p><a href="${stripeLink}" style="background: #A392D0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Payer 97€</a></p>
        <h3>🎥 Lien Meet:</h3>
        <p><a href="${meetLink}">Cliquez ici pour rejoindre</a></p>
        <p>À très bientôt!<br>Michèle Freixieiro</p>
      `,
      attachments: [{
        filename: `Atelier-${formation}.ics`,
        content: ics
      }]
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Email envoyé' });

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
