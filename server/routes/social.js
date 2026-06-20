const router = require('express').Router();
const db = require('../db');

const auth = (req, res, next) =>
  req.session.userId ? next() : res.status(401).json({ error: 'Not authenticated' });

// Follow
router.post('/:id/follow', auth, (req, res) => {
  if (Number(req.params.id) === req.session.userId)
    return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)')
      .run(req.session.userId, req.params.id);
    res.json({ following: true });
  } catch {
    res.status(409).json({ error: 'Already following' });
  }
});

// Unfollow
router.delete('/:id/follow', auth, (req, res) => {
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
    .run(req.session.userId, req.params.id);
  res.json({ following: false });
});

// Followers list
router.get('/:id/followers', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar FROM follows f
    JOIN users u ON u.id = f.follower_id WHERE f.following_id = ?
  `).all(req.params.id);
  res.json(rows);
});

// Following list
router.get('/:id/following', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar FROM follows f
    JOIN users u ON u.id = f.following_id WHERE f.follower_id = ?
  `).all(req.params.id);
  res.json(rows);
});

// Who to follow (users not yet followed, excluding self)
router.get('/suggestions', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers
    FROM users u
    WHERE u.id != ?
      AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY followers DESC LIMIT 10
  `).all(req.session.userId, req.session.userId);
  res.json(rows);
});

module.exports = router;
