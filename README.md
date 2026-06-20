# Apexcify Technologies — Social Media App

A full-stack social media web application built by **Apexcify Technologies** using **Vanilla JavaScript**, **Node.js**, **Express**, and **SQLite**. It provides all the core features of a modern social platform — accounts, posts, likes, comments, follows, and a personalized feed — without any frontend framework.

---

## About the Project

This project is a lightweight, self-contained social media platform. The entire frontend is written in plain HTML, CSS, and JavaScript with no React, Vue, or Angular. The backend is a Node.js/Express REST API that stores data in a local SQLite database using Node's built-in `node:sqlite` module (available in Node v22+), which means **no external database driver is needed**.

The app is designed to be easy to run locally — just install dependencies and start the server. Everything from authentication to the animated canvas background is handled in-house.

---

## Features

### Authentication
- Register a new account with username, email, and password
- Passwords are securely hashed using **bcryptjs** (10 salt rounds)
- Login creates a server-side session stored via **express-session**
- Sessions persist for 7 days; logout destroys the session immediately

### Posts
- Create text posts (with optional image URL)
- View a **personalized feed** showing your own posts and posts from users you follow, ordered newest first (up to 50 posts)
- View all posts by any specific user on their profile page
- Delete your own posts (other users cannot delete them)

### Likes
- Toggle like/unlike on any post with a single click
- Like counts are formatted (e.g. `1.2K`) and animate on click
- A particle burst effect fires when you like a post
- Like state is persisted in `localStorage` so the UI stays consistent across page reloads

### Comments
- Add comments to any post (requires login)
- Comments are displayed in chronological order with username and avatar
- Delete your own comments

### Follow System
- Follow or unfollow any other user
- Cannot follow yourself (server-enforced)
- View a user's **followers** and **following** lists
- "Who to follow" suggestions — shows users you don't follow yet, ranked by follower count

### User Profiles
- View any user's profile showing: avatar, bio, follower count, following count, and post count
- Update your own bio and avatar URL
- Bookmarks saved in `localStorage` for quick access

### UI / UX
- Fully responsive single-page interface
- Animated canvas background (`bg-canvas.js`) rendered on a `<canvas>` element
- Toast notifications for actions (like, comment, follow, error, etc.)
- "Time ago" timestamps (e.g. *just now*, *5 min ago*, *2 hr ago*)
- All HTML is escaped before rendering to prevent XSS

---

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | HTML, CSS, Vanilla JavaScript                       |
| Backend  | Node.js, Express 4                                  |
| Database | SQLite via Node built-in `node:sqlite` (Node v22+)  |
| Auth     | `express-session`, `bcryptjs`                       |

---

## Database Schema

The database is created automatically at `server/social.db` on first run.

| Table      | Description                                      |
|------------|--------------------------------------------------|
| `users`    | Stores account info: username, email, password hash, avatar, bio |
| `posts`    | Stores posts with content, optional image, and user reference |
| `likes`    | Join table linking users and posts they liked    |
| `comments` | Stores comments linked to a post and a user      |
| `follows`  | Join table linking follower and following user IDs |

All tables use `ON DELETE CASCADE` so deleting a user or post automatically removes all related likes, comments, and follows.

---

## Getting Started

### Prerequisites

- **Node.js v22 or higher** — required for the built-in `node:sqlite` module

Check your version:
```bash
node -v
```

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd Apexcify_Technologies_SocialMedia

# Install dependencies
npm install
```

### Run the App

```bash
npm start
```

Open your browser at **http://localhost:3000**

The database file `server/social.db` is created automatically on first run.

---

## Project Structure

```
├── index.html          # Main frontend page (single-page app)
├── styles.css          # All styling
├── app.js              # Frontend logic (likes, comments, feed, profiles)
├── bg-canvas.js        # Animated canvas background
├── package.json
└── server/
    ├── index.js        # Express app setup, session config, route mounting
    ├── db.js           # SQLite setup, schema creation (WAL mode, foreign keys)
    └── routes/
        ├── auth.js     # Register, login, logout, get/update profile
        ├── posts.js    # Create, delete, feed, user posts, toggle like
        ├── comments.js # Add, get, delete comments
        └── social.js   # Follow, unfollow, followers, following, suggestions
```

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint          | Auth Required | Description             |
|--------|-------------------|---------------|-------------------------|
| POST   | `/register`       | No            | Create a new account    |
| POST   | `/login`          | No            | Login with email + password |
| POST   | `/logout`         | No            | Destroy session         |
| GET    | `/profile/:id`    | No            | Get any user's profile  |
| PUT    | `/profile`        | Yes           | Update bio or avatar    |

### Posts — `/api/posts`

| Method | Endpoint       | Auth Required | Description                     |
|--------|----------------|---------------|---------------------------------|
| POST   | `/`            | Yes           | Create a new post               |
| GET    | `/feed`        | Yes           | Get personalized feed (50 max)  |
| GET    | `/user/:id`    | No            | Get all posts by a user         |
| DELETE | `/:id`         | Yes           | Delete your own post            |
| POST   | `/:id/like`    | Yes           | Toggle like on a post           |

### Comments — `/api/comments`

| Method | Endpoint    | Auth Required | Description               |
|--------|-------------|---------------|---------------------------|
| POST   | `/:postId`  | Yes           | Add a comment to a post   |
| GET    | `/:postId`  | No            | Get all comments on a post|
| DELETE | `/:id`      | Yes           | Delete your own comment   |

### Social — `/api/social`

| Method | Endpoint          | Auth Required | Description                        |
|--------|-------------------|---------------|------------------------------------|
| POST   | `/:id/follow`     | Yes           | Follow a user                      |
| DELETE | `/:id/follow`     | Yes           | Unfollow a user                    |
| GET    | `/:id/followers`  | No            | List a user's followers            |
| GET    | `/:id/following`  | No            | List who a user follows            |
| GET    | `/suggestions`    | Yes           | Get "who to follow" suggestions    |

---

## Notes

- Sessions are stored **in memory**. Restarting the server logs out all users.
- The SQLite database runs in **WAL (Write-Ahead Logging)** mode for better performance.
- Foreign key constraints are enabled (`PRAGMA foreign_keys=ON`).
- No file upload support — images are stored as URLs in text fields.
- The `PORT` environment variable is respected; defaults to `3000`.
