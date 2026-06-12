const express  = require('express');
const supabase = require('../config/db');
const { sendScanNotification, sendFoundNotification } = require('../utils/email');
const router   = express.Router();

// ── GET /finder/:tagId ──────────────────────────────────────
router.get('/finder/:tagId', async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*, users(id, full_name, email, phone)')
      .eq('tag_id', req.params.tagId)
      .limit(1);

    if (error) throw error;
    if (!items || items.length === 0) return res.render('finder-not-found');

    const item  = items[0];
    const owner = item.users;

    // Only expose owner contact info if lost_mode is ON
    const ownerContact = item.lost_mode ? {
      name:  owner.full_name,
      phone: owner.phone || null,
    } : null;

    // Log the scan
    const { data: scanData } = await supabase
      .from('scans')
      .insert({
        item_id:    item.id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent') || '',
      })
      .select();

    const scanId = scanData ? scanData[0].id : null;

    // Send scan notification email to owner (non-blocking)
    if (owner && owner.email && process.env.EMAIL_USER) {
      sendScanNotification({
        ownerEmail:   owner.email,
        ownerName:    owner.full_name,
        itemName:     item.name,
        tagId:        item.tag_id,
        locationName: null,
        host:         req.get('host'),
      }).catch(err => console.error('Scan email error:', err.message));
    }

    res.render('finder', { item, tagId: req.params.tagId, scanId, ownerContact });
  } catch (err) {
    console.error('Finder error:', err.message);
    res.render('finder-not-found');
  }
});

// ── POST /finder/:tagId/scan-location ──────────────────────
router.post('/finder/:tagId/scan-location', async (req, res) => {
  const { scanId, latitude, longitude, locationName } = req.body;
  try {
    if (scanId) {
      await supabase
        .from('scans')
        .update({ latitude, longitude, location_name: locationName })
        .eq('id', scanId);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Scan location error:', err.message);
    res.json({ ok: false });
  }
});

// ── POST /finder/:tagId/message ─────────────────────────────
router.post('/finder/:tagId/message', async (req, res) => {
  const { message, finderName, latitude, longitude, locationName } = req.body;
  try {
    const { data: items } = await supabase
      .from('items')
      .select('*, users(id, full_name, email, phone)')
      .eq('tag_id', req.params.tagId)
      .limit(1);

    if (!items || items.length === 0)
      return res.json({ ok: false, error: 'Item not found' });

    const item  = items[0];
    const owner = item.users;

    const { error: msgErr } = await supabase
      .from('messages')
      .insert({
        item_id:       item.id,
        sender_type:   'finder',
        content:       message,
        finder_name:   finderName   || 'Anonymous',
        latitude:      latitude     || null,
        longitude:     longitude    || null,
        location_name: locationName || null,
      });

    if (msgErr) throw msgErr;

    if (owner && owner.email && process.env.EMAIL_USER) {
      sendFoundNotification({
        ownerEmail:    owner.email,
        ownerName:     owner.full_name,
        itemName:      item.name,
        tagId:         item.tag_id,
        finderMessage: message,
        finderName:    finderName   || 'Anonymous',
        locationName:  locationName || null,
        latitude:      latitude     || null,
        longitude:     longitude    || null,
        host:          req.get('host'),
      }).catch(err => console.error('Found email error:', err.message));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Message error:', err.message);
    res.json({ ok: false, error: 'Could not send message' });
  }
});

module.exports = router;
