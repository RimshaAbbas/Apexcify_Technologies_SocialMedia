const router = require('express').Router();
const db = require('../db');

const auth = (req, res, next) =>
  req.session.userId ? next() : res.status(401).json({ error: 'Not authenticated' });

// Create post
router.post('/', auth, (req, res) => {
  const { content, image } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const result = db.prepare('INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)')
    .run(req.session.userId, content, image ?? null);
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// Feed: own posts + followed users' posts
router.get('/feed', auth, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? OR p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = ?
    )
    ORDER BY p.created_at DESC LIMIT 50
  `).all(req.session.userId, req.session.userId, req.session.userId);
  res.json(posts);
});

// Get posts by user
router.get('/user/:id', (req, res) => {
  const uid = req.session.userId ?? 0;
  const posts = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? ORDER BY p.created_at DESC
  `).all(uid, req.params.id);
  res.json(posts);
});

// Delete post
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(403).json({ error: 'Not allowed' });
  res.json({ message: 'Deleted' });
});

// Toggle like
router.post('/:id/like', auth, (req, res) => {
  const exists = db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (exists) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?')
      .run(req.params.id, req.session.userId);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)')
      .run(req.params.id, req.session.userId);
    res.json({ liked: true });
  }
});

module.exports = router;
