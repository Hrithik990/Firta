const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Email 1: QR was scanned ──────────────────────────────────
async function sendScanNotification({ ownerEmail, ownerName, itemName, tagId, locationName, host }) {
  const itemUrl  = `https://${host}/item/${tagId}`;
  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f3;margin:0;padding:0}
  .wrap{max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:#0d9e82;padding:32px;text-align:center}
  .header h1{color:white;margin:0;font-size:22px}
  .header p{color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px}
  .body{padding:32px}
  .item-badge{background:#e6f7f4;border:1px solid #b2e4db;border-radius:10px;padding:16px 20px;margin:20px 0}
  .item-badge h2{margin:0 0 4px;color:#0d9e82;font-size:18px}
  .item-badge p{margin:0;color:#3d5a54;font-size:13px}
  .info-row{margin:12px 0;font-size:14px;color:#3d5a54}
  .btn{display:inline-block;background:#0d9e82;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:600;font-size:14px;margin-top:20px}
  .footer{background:#f0f4f3;padding:20px 32px;text-align:center;font-size:12px;color:#7a9e97}
</style></head>
<body><div class="wrap">
  <div class="header">
    <h1>👁️ Your QR code was just scanned!</h1>
    <p>Someone found your FIRTA-protected item</p>
  </div>
  <div class="body">
    <p>Hi <strong>${ownerName}</strong>,</p>
    <p>Your FIRTA QR tag was scanned. Someone may have found your item!</p>
    <div class="item-badge">
      <h2>${itemName}</h2>
      <p>Tag ID: ${tagId}</p>
    </div>
    <div class="info-row">📍 <strong>Scan location:</strong> ${locationName || 'Not yet available — finder may share location shortly'}</div>
    <div class="info-row">🕐 <strong>Scanned at:</strong> ${new Date().toLocaleString()}</div>
    <p style="margin-top:20px">If the finder sends you a message, you'll get another email with all the details.</p>
    <a href="${itemUrl}" class="btn">View Item Dashboard →</a>
  </div>
  <div class="footer">FIRTA — Scan. Connect. Return.</div>
</div></body></html>`;

  await transporter.sendMail({
    from:    `"FIRTA" <${process.env.EMAIL_USER}>`,
    to:      ownerEmail,
    subject: `👁️ Your item "${itemName}" QR was scanned!`,
    html,
  });
}

// ── Email 2: Finder sent a message ───────────────────────────
async function sendFoundNotification({ ownerEmail, ownerName, itemName, tagId, finderMessage, finderName, locationName, latitude, longitude, host }) {
  const itemUrl  = `https://${host}/item/${tagId}/messages`;
  const mapsUrl  = latitude && longitude
    ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f4f3;margin:0;padding:0}
  .wrap{max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:#0d9e82;padding:32px;text-align:center}
  .header h1{color:white;margin:0;font-size:22px}
  .header p{color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px}
  .body{padding:32px}
  .item-badge{background:#e6f7f4;border:1px solid #b2e4db;border-radius:10px;padding:16px 20px;margin:20px 0}
  .item-badge h2{margin:0 0 4px;color:#0d9e82;font-size:18px}
  .item-badge p{margin:0;color:#3d5a54;font-size:13px}
  .msg-box{background:#f7faf9;border-left:4px solid #0d9e82;border-radius:0 8px 8px 0;padding:16px;margin:20px 0;font-style:italic;color:#3d5a54;line-height:1.6}
  .info-row{margin:12px 0;font-size:14px;color:#3d5a54}
  .btn{display:inline-block;background:#0d9e82;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:600;font-size:14px;margin:8px 4px}
  .btn-outline{background:white;color:#0d9e82;border:2px solid #0d9e82}
  .footer{background:#f0f4f3;padding:20px 32px;text-align:center;font-size:12px;color:#7a9e97}
</style></head>
<body><div class="wrap">
  <div class="header">
    <h1>🎉 Someone found your item!</h1>
    <p>A finder sent you a message through FIRTA</p>
  </div>
  <div class="body">
    <p>Hi <strong>${ownerName}</strong>,</p>
    <p>Great news — <strong>${finderName || 'Someone'}</strong> found your item and sent you a message.</p>
    <div class="item-badge">
      <h2>${itemName}</h2>
      <p>Tag ID: ${tagId}</p>
    </div>
    <p><strong>Message from finder:</strong></p>
    <div class="msg-box">"${finderMessage}"</div>
    <div class="info-row">📍 <strong>Location:</strong> ${locationName || 'Not shared'}</div>
    <div class="info-row">🕐 <strong>Sent at:</strong> ${new Date().toLocaleString()}</div>
    <br>
    <a href="${itemUrl}" class="btn">View Messages →</a>
    ${mapsUrl ? `<a href="${mapsUrl}" class="btn btn-outline">View on Maps →</a>` : ''}
  </div>
  <div class="footer">FIRTA — Scan. Connect. Return.</div>
</div></body></html>`;

  await transporter.sendMail({
    from:    `"FIRTA" <${process.env.EMAIL_USER}>`,
    to:      ownerEmail,
    subject: `🎉 Your item "${itemName}" was found!`,
    html,
  });
}

module.exports = { sendScanNotification, sendFoundNotification };
