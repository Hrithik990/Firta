const express  = require('express');
const supabase = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router   = express.Router();

// ── GET /item/:tagId/messages ───────────────────────────────
router.get('/item/:tagId/messages', requireAuth, async (req, res) => {
  try {
    // Verify item belongs to user
    const { data: items } = await supabase
      .from('items')
      .select('id, name, tag_id')
      .eq('tag_id', req.params.tagId)
      .eq('user_id', req.session.userId)
      .limit(1);

    if (!items || items.length === 0) {
      req.flashError( 'Item not found.');
      return res.redirect('/dashboard');
    }
    const item = items[0];

    // Get all messages with location
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('item_id', item.id)
      .order('sent_at', { ascending: false });

    // Mark all as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('item_id', item.id)
      .eq('is_read', false);

    res.render('messages', {
      item,
      messages: messages || [],
      user: { name: req.session.userName, plan: req.session.userPlan },
    });
  } catch (err) {
    console.error('Messages error:', err.message);
    req.flashError( 'Could not load messages.');
    res.redirect('/dashboard');
  }
});

// ── GET /api/unread-count ───────────────────────────────────
// Returns unread message count for nav badge
router.get('/api/unread-count', requireAuth, async (req, res) => {
  try {
    const { data: items } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', req.session.userId);

    if (!items || items.length === 0) return res.json({ count: 0 });

    const itemIds = items.map(i => i.id);
    const { data: msgs } = await supabase
      .from('messages')
      .select('id')
      .in('item_id', itemIds)
      .eq('is_read', false);

    res.json({ count: msgs ? msgs.length : 0 });
  } catch (err) {
    res.json({ count: 0 });
  }
});

module.exports = router;
