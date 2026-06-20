const router = require('express').Router();
const db = require('../db');

const auth = (req, res, next) =>
  req.session.userId ? next() : res.status(401).json({ error: 'Not authenticated' });

// Post a comment
router.post('/:postId', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.postId, req.session.userId, content);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// Get comments for a post
router.get('/:postId', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.postId);
  res.json(comments);
});

// Delete a comment
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(403).json({ error: 'Not allowed' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
