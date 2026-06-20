const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hash);
    req.session.userId = Number(result.lastInsertRowid);
    res.status(201).json({ id: req.session.userId, username, email });
  } catch {
    res.status(409).json({ error: 'Username or email already taken' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  const { password: _, ...safe } = user;
  res.json(safe);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

router.get('/profile/:id', (req, res) => {
  const user = db.prepare(
    `SELECT id, username, email, avatar, bio, created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count
     FROM users u WHERE u.id = ?`
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/profile', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { bio, avatar } = req.body;
  db.prepare('UPDATE users SET bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?')
    .run(bio ?? null, avatar ?? null, req.session.userId);
  res.json({ message: 'Profile updated' });
});

module.exports = router;
