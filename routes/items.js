const express   = require('express');
const QRCode    = require('qrcode');
const supabase  = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router    = express.Router();

function generateTagId() {
  const num    = Math.floor(1000 + Math.random() * 9000);
  const letter = 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
  return `FTR-${num}-${letter}`;
}

// ── GET /dashboard ──────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', req.session.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const total       = items.length;
    const active_tags = items.filter(i => i.status === 'active' || i.status === 'found').length;
    const lost_items  = items.filter(i => i.status === 'lost').length;

    res.render('dashboard', {
      user:  { name: req.session.userName, plan: req.session.userPlan },
      items: items || [],
      stats: { total, active_tags, lost_items },
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    req.flashError('Could not load items.');
    res.render('dashboard', {
      user:  { name: req.session.userName, plan: req.session.userPlan },
      items: [],
      stats: { total: 0, active_tags: 0, lost_items: 0 },
    });
  }
});

// ── GET /add-item ───────────────────────────────────────────
router.get('/add-item', requireAuth, (req, res) => {
  res.render('add-item');
});

// ── POST /add-item ──────────────────────────────────────────
router.post('/add-item', requireAuth, async (req, res) => {
  const { itemName, category, description, finderMessage } = req.body;

  if (!itemName || !category) {
    req.flashError('Item name and category are required.');
    return res.redirect('/add-item');
  }

  try {
    // Generate unique tag ID
    let tagId, exists = true;
    while (exists) {
      tagId = generateTagId();
      const { data } = await supabase
        .from('items').select('id').eq('tag_id', tagId).limit(1);
      exists = data && data.length > 0;
    }

    // Generate QR as base64 data URL (works on Vercel — no filesystem needed)
    const qrUrl     = `${req.protocol}://${req.get('host')}/finder/${tagId}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      color: { dark: '#0d9e82', light: '#ffffff' },
      width: 400, margin: 2,
    });

    // Insert item with QR data URL
    const { data: newItems, error: insertErr } = await supabase
      .from('items')
      .insert({
        user_id:        req.session.userId,
        name:           itemName,
        category,
        description:    description   || null,
        finder_message: finderMessage || null,
        tag_id:         tagId,
        qr_image_path:  qrDataUrl,
      })
      .select();

    if (insertErr) throw insertErr;

    req.flashSuccess(`"${itemName}" registered with tag ${tagId}!`);
    res.redirect(`/item/${tagId}`);
  } catch (err) {
    console.error('Add item error:', err.message);
    req.flashError('Could not register item. Please try again.');
    res.redirect('/add-item');
  }
});

// ── GET /item/:tagId ────────────────────────────────────────
router.get('/item/:tagId', requireAuth, async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('tag_id', req.params.tagId)
      .eq('user_id', req.session.userId)
      .limit(1);

    if (error) throw error;
    if (!items || items.length === 0) {
      req.flashError('Item not found.');
      return res.redirect('/dashboard');
    }
    const item = items[0];

    // Scan stats with location
    const { data: scanData } = await supabase
      .from('scans')
      .select('scanned_at, latitude, longitude, location_name')
      .eq('item_id', item.id)
      .order('scanned_at', { ascending: false });

    const latest = scanData && scanData[0] ? scanData[0] : null;
    const scans = {
      total_scans:   scanData ? scanData.length : 0,
      last_scanned:  latest ? latest.scanned_at   : null,
      last_lat:      latest ? latest.latitude      : null,
      last_lng:      latest ? latest.longitude     : null,
      last_location: latest ? latest.location_name : null,
    };

    res.render('item-detail', {
      item, scans,
      user: { name: req.session.userName, plan: req.session.userPlan },
    });
  } catch (err) {
    console.error('Item detail error:', err.message);
    req.flashError('Could not load item.');
    res.redirect('/dashboard');
  }
});

// ── POST /item/:tagId/toggle-lost ───────────────────────────
router.post('/item/:tagId/toggle-lost', requireAuth, async (req, res) => {
  try {
    const { data: items } = await supabase
      .from('items')
      .select('id, lost_mode')
      .eq('tag_id', req.params.tagId)
      .eq('user_id', req.session.userId)
      .limit(1);

    if (!items || items.length === 0)
      return res.json({ ok: false, error: 'Not found' });

    const newLostMode = !items[0].lost_mode;
    const newStatus   = newLostMode ? 'lost' : 'active';

    const { error } = await supabase
      .from('items')
      .update({ lost_mode: newLostMode, status: newStatus })
      .eq('id', items[0].id);

    if (error) throw error;
    res.json({ ok: true, lostMode: newLostMode, status: newStatus });
  } catch (err) {
    console.error('Toggle lost error:', err.message);
    res.json({ ok: false, error: 'Server error' });
  }
});

// ── POST /item/:tagId/delete ────────────────────────────────
router.post('/item/:tagId/delete', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('tag_id', req.params.tagId)
      .eq('user_id', req.session.userId);

    if (error) throw error;
    req.flashSuccess('Item deleted.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Delete error:', err.message);
    req.flashError('Could not delete item.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
