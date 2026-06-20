/**
 * app.js — ApexCity interactions + full localStorage persistence
 */
(function () {
  'use strict';

  // ── Storage helpers ────────────────────────────────────────
  const LS = {
    get: key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  };

  const KEYS = {
    posts:     'ac-posts',
    likes:     'ac-likes',
    comments:  'ac-comments',
    follows:   'ac-follows',
    bookmarks: 'ac-bookmarks', // { [postId]: { html, author, text, timestamp } }
    profile:   'apexcity-settings',
  };

  // ── Toast ──────────────────────────────────────────────────
  const toastEl = document.getElementById('toast-container');
  function toast(msg, type = 'teal') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = msg;
    toastEl.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  function parseLikeCount(str) {
    if (String(str).includes('K')) return Math.round(parseFloat(str) * 1000);
    return parseInt(str, 10) || 0;
  }
  function formatLikeCount(n) {
    return n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'K' : String(n);
  }
  function escapeHTML(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60)  return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + ' min ago';
    if (sec < 86400) return Math.floor(sec / 3600) + ' hr ago';
    return Math.floor(sec / 86400) + ' d ago';
  }

  // ── Like ───────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;
    const liked   = btn.dataset.liked === 'true';
    const counter = btn.querySelector('.like-count');
    const n       = parseLikeCount(counter.textContent);
    const newN    = liked ? n - 1 : n + 1;
    btn.dataset.liked = String(!liked);
    btn.setAttribute('aria-pressed', String(!liked));
    counter.textContent = formatLikeCount(newN);
    applyLikeStyle(btn, !liked);
    btn.classList.remove('popping');
    void btn.offsetWidth;
    btn.classList.add('popping');
    btn.addEventListener('animationend', () => btn.classList.remove('popping'), { once: true });
    if (!liked) spawnBurst(e.clientX, e.clientY);

    // Persist: find nearest post-card
    const card = btn.closest('.post-card');
    if (card) {
      const id = card.dataset.postId;
      const likes = LS.get(KEYS.likes) || {};
      likes[id] = { count: newN, liked: !liked };
      LS.set(KEYS.likes, likes);
    }
  });

  function applyLikeStyle(btn, liked) {
    const icon = btn.querySelector('.like-icon');
    if (!icon) return;
    if (liked) {
      icon.style.fill   = 'var(--accent-pink)';
      icon.style.stroke = 'var(--accent-pink)';
    } else {
      icon.style.fill   = 'none';
      icon.style.stroke = 'currentColor';
    }
  }

  function spawnBurst(x, y) {
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:6px;height:6px;border-radius:50%;background:var(--accent-pink);pointer-events:none;z-index:999;transform:translate(-50%,-50%)`;
      document.body.appendChild(dot);
      const a = (i / 8) * Math.PI * 2;
      const d = 28 + Math.random() * 20;
      requestAnimationFrame(() => {
        dot.style.transition = 'transform 0.5s ease-out,opacity 0.5s ease-out';
        dot.style.transform  = `translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px))`;
        dot.style.opacity    = '0';
      });
      setTimeout(() => dot.remove(), 520);
    }
  }

  // ── Follow ─────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-follow');
    if (!btn) return;
    const following = btn.dataset.following === 'true';
    btn.dataset.following = String(!following);
    btn.setAttribute('aria-pressed', String(!following));
    const name = btn.closest('.follow-item')
      ?.querySelector('.follow-item__name')?.childNodes[0]?.textContent?.trim() ?? 'user';
    const handle = btn.closest('.follow-item')
      ?.querySelector('.follow-item__handle')?.textContent?.trim() ?? name;
    if (!following) {
      btn.textContent = 'Following';
      toast(`Now following ${name}`, 'gold');
    } else {
      btn.textContent = 'Follow';
      toast(`Unfollowed ${name}`, 'teal');
    }
    // Persist
    const follows = LS.get(KEYS.follows) || {};
    follows[handle] = !following;
    LS.set(KEYS.follows, follows);
  });

  // ── Bookmark ───────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.bookmark-btn');
    if (!btn) return;
    const card       = btn.closest('.post-card');
    if (!card) return;
    const postId     = card.dataset.postId;
    const bookmarked = btn.dataset.bookmarked === 'true';
    const bookmarks  = LS.get(KEYS.bookmarks) || {};

    if (!bookmarked) {
      // Save snapshot: author, text, mediaHTML
      const author    = card.querySelector('.post-author__name')?.childNodes[0]?.textContent?.trim() || '';
      const handle    = card.querySelector('.post-author__meta')?.textContent?.trim() || '';
      const text      = card.querySelector('.post-card__text')?.textContent?.trim() || '';
      const mediaHTML = card.querySelector('.post-card__body')?.innerHTML || '';
      bookmarks[postId] = { postId, author, handle, text, mediaHTML };
      btn.textContent     = '🔖';
      btn.style.color     = 'var(--accent-pink)';
      btn.dataset.bookmarked = 'true';
      btn.setAttribute('aria-pressed', 'true');
      toast('Bookmarked! 🔖', 'pink');
    } else {
      delete bookmarks[postId];
      btn.textContent     = '🔖';
      btn.style.color     = '';
      btn.dataset.bookmarked = 'false';
      btn.setAttribute('aria-pressed', 'false');
      toast('Bookmark removed', 'teal');
    }
    LS.set(KEYS.bookmarks, bookmarks);
    renderBookmarksPage();
  });

  function renderBookmarksPage() {
    const bookmarks = LS.get(KEYS.bookmarks) || {};
    const list      = document.getElementById('bookmarks-list');
    const empty     = document.getElementById('bookmarks-empty');
    if (!list) return;
    // Remove previously rendered bookmark cards (keep the empty state div)
    list.querySelectorAll('.post-card').forEach(el => el.remove());
    const entries = Object.values(bookmarks);
    empty.hidden  = entries.length > 0;
    entries.forEach(b => {
      const art = document.createElement('article');
      art.className = 'card post-card';
      art.innerHTML = `
        <header class="post-card__header">
          <div class="post-author">
            <img class="avatar avatar--md" src="https://i.pravatar.cc/150?img=1" alt="${escapeHTML(b.author)}" />
            <div>
              <span class="post-author__name">${escapeHTML(b.author)}</span>
              <span class="post-author__meta">${escapeHTML(b.handle)}</span>
            </div>
          </div>
        </header>
        <div class="post-card__body">${b.mediaHTML}</div>
        <div style="padding:8px 0;font-size:12px;color:var(--accent-pink)">🔖 Bookmarked</div>
      `;
      list.appendChild(art);
    });
  }

  // ── Comment toggle ─────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('.comment-toggle-btn');
    if (!btn) return;
    const sec      = document.getElementById(btn.getAttribute('aria-controls'));
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    if (sec) sec.hidden = expanded;
  });

  // ── Media upload (convert to base64 for persistence) ───────
  const filePhoto    = document.getElementById('file-photo');
  const fileVideo    = document.getElementById('file-video');
  const mediaPreview = document.getElementById('media-preview');
  let pendingMedia   = []; // { type, dataUrl }

  document.getElementById('btn-photo')?.addEventListener('click', () => filePhoto.click());
  document.getElementById('btn-video')?.addEventListener('click', () => fileVideo.click());

  function fileToDataUrl(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  async function addMediaFile(file, type) {
    const dataUrl = await fileToDataUrl(file);
    pendingMedia.push({ type, url: dataUrl });
    renderMediaPreview();
    postBtn.disabled = false;
  }

  function renderMediaPreview() {
    mediaPreview.hidden = pendingMedia.length === 0;
    mediaPreview.innerHTML = '';
    pendingMedia.forEach((m, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'media-preview__item';
      const el = document.createElement(m.type === 'video' ? 'video' : 'img');
      el.src = m.url;
      if (m.type === 'video') { el.controls = true; el.muted = true; }
      const rm = document.createElement('button');
      rm.className = 'media-preview__remove';
      rm.innerHTML = '✕';
      rm.setAttribute('aria-label', 'Remove');
      rm.addEventListener('click', () => {
        pendingMedia.splice(i, 1);
        renderMediaPreview();
        if (pendingMedia.length === 0 && !postInput.value.trim()) postBtn.disabled = true;
      });
      wrap.append(el, rm);
      mediaPreview.appendChild(wrap);
    });
  }

  filePhoto?.addEventListener('change', () => {
    [...filePhoto.files].forEach(f => addMediaFile(f, 'image'));
    filePhoto.value = '';
  });
  fileVideo?.addEventListener('change', () => {
    [...fileVideo.files].forEach(f => addMediaFile(f, 'video'));
    fileVideo.value = '';
  });

  // ── Profile dropdown ───────────────────────────────────────
  const avatarBtn = document.getElementById('avatar-btn');
  const dropdown  = document.getElementById('profile-dropdown');

  avatarBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    avatarBtn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', e => {
    if (dropdown?.classList.contains('open') && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      avatarBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  dropdown?.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      dropdown.classList.remove('open');
      navigateTo(link.dataset.nav);
    });
  });

  document.getElementById('btn-logout')?.addEventListener('click', e => {
    e.preventDefault();
    dropdown.classList.remove('open');
    toast('Logged out. Assalamu Alaikum! 👋', 'pink');
  });

  // ── Sidebar navigation ─────────────────────────────────────
  const sectionMap = {
    home: 'home-feed', explore: 'explore-page',
    notifications: 'notifications-page', messages: 'messages-page',
    bookmarks: 'bookmarks-page', community: 'community-page', settings: 'settings-page',
  };

  function navigateTo(id) {
    document.querySelectorAll('.sidebar-nav__item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(`.sidebar-nav__item[href="#${id}"]`);
    if (activeItem) activeItem.classList.add('active');
    Object.values(sectionMap).forEach(secId => {
      const el = document.getElementById(secId);
      if (el) el.classList.remove('active');
    });
    const el = document.getElementById(sectionMap[id]);
    if (el) el.classList.add('active');
    if (window.setBgSection) window.setBgSection(id);
  }

  document.querySelectorAll('.sidebar-nav__item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const id = this.getAttribute('href')?.replace('#', '');
      if (id) navigateTo(id);
    });
  });

  // ── Search bar ─────────────────────────────────────────────
  document.getElementById('search-bar')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) toast(`Searching: "${q}"`, 'teal');
    }
  });

  // ── Post composer ──────────────────────────────────────────
  const postInput   = document.getElementById('post-input');
  const postBtn     = document.getElementById('post-btn');
  const charCounter = document.getElementById('char-counter');
  const MAX = 280;

  if (postInput) {
    postInput.addEventListener('input', () => {
      postInput.style.height = 'auto';
      postInput.style.height = postInput.scrollHeight + 'px';
      const len = postInput.value.length;
      charCounter.textContent = `${len} / ${MAX}`;
      charCounter.className   = 'char-counter' + (len > MAX ? ' over' : len > MAX * 0.8 ? ' warn' : '');
      postBtn.disabled = (len === 0 && pendingMedia.length === 0) || len > MAX;
    });

    postBtn.addEventListener('click', () => {
      const text = postInput.value.trim();
      if (!text && pendingMedia.length === 0) return;

      // Save post data
      const savedPosts = LS.get(KEYS.posts) || [];
      const profile    = LS.get(KEYS.profile) || {};
      const postData   = {
        id:        Date.now(),
        createdAt: Date.now(),
        text,
        media:     pendingMedia.slice(),
        author:    profile.name   || 'Ahmad',
        handle:    profile.handle || '@AhmadDev',
        likes:     0,
        liked:     false,
        comments:  [],
      };
      savedPosts.unshift(postData);
      LS.set(KEYS.posts, savedPosts);

      const el = buildPostElement(postData);
      document.querySelector('.compose-card').insertAdjacentElement('afterend', el);

      // Reset
      postInput.value         = '';
      postInput.style.height  = '';
      charCounter.textContent = '0 / 280';
      charCounter.className   = 'char-counter';
      postBtn.disabled        = true;
      pendingMedia             = [];
      renderMediaPreview();

      toast('Post published! 🎉', 'teal');
      el.style.opacity   = '0';
      el.style.transform = 'translateY(-12px)';
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.4s ease,transform 0.4s ease';
        el.style.opacity    = '1';
        el.style.transform  = '';
      });
    });
  }

  // ── Build post DOM element ─────────────────────────────────
  function buildPostElement(data) {
    const el = document.createElement('article');
    el.className = 'card post-card';
    el.dataset.postId = String(data.id);

    const mediaHTML = (data.media || []).map(m =>
      m.type === 'video'
        ? `<div class="post-card__image-wrap"><video src="${m.url}" controls muted style="width:100%;border-radius:8px"></video></div>`
        : `<div class="post-card__image-wrap"><img src="${m.url}" alt="Uploaded media" class="post-card__image" loading="lazy" /></div>`
    ).join('');

    const commentsHTML = (data.comments || []).map(c => `
      <div class="comment">
        <img class="avatar avatar--sm" src="https://i.pravatar.cc/150?img=1" alt="${escapeHTML(c.author)}" />
        <div class="comment__bubble">
          <span class="comment__author">${escapeHTML(c.author)}</span>
          <p>${escapeHTML(c.text)}</p>
        </div>
      </div>`).join('');

    el.innerHTML = `
      <header class="post-card__header">
        <a class="post-author" href="#">
          <img class="avatar avatar--md" src="https://i.pravatar.cc/150?img=1" alt="${escapeHTML(data.author)}" />
          <div>
            <span class="post-author__name">${escapeHTML(data.author)}</span>
            <span class="post-author__meta">${escapeHTML(data.handle)} · <time class="post-time" data-created-at="${data.createdAt || data.id}">${timeAgo(data.createdAt || data.id)}</time></span>
          </div>
        </a>
        <button class="btn-icon" aria-label="More options">···</button>
      </header>
      <div class="post-card__body">
        ${data.text ? `<p class="post-card__text">${escapeHTML(data.text)}</p>` : ''}
        ${mediaHTML}
      </div>
      <footer class="post-card__footer">
        <div class="post-stats"><span>❤️ ${formatLikeCount(data.likes||0)}</span><span>💬 ${(data.comments||[]).length}</span><span>🔁 0</span></div>
        <div class="post-actions" role="group">
          <button class="post-action like-btn" data-liked="${data.liked}" aria-pressed="${data.liked}" aria-label="Like">
            <svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="like-count">${formatLikeCount(data.likes||0)}</span>
          </button>
          <button class="post-action comment-toggle-btn" aria-expanded="false" aria-controls="c${data.id}" aria-label="Comments">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>${(data.comments||[]).length}</span>
          </button>
          <button class="post-action" aria-label="Repost">
            <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <span>0</span>
          </button>
          <button class="post-action" aria-label="Share">📤 Share</button>
          <button class="post-action bookmark-btn" data-bookmarked="false" aria-pressed="false" aria-label="Bookmark" style="margin-left:auto">🔖</button>
        </div>
        <div class="comments-section" id="c${data.id}" hidden>
          ${commentsHTML}
          <div class="comment comment--compose">
            <img class="avatar avatar--sm" src="https://i.pravatar.cc/150?img=1" alt="Ahmad" />
            <div class="comment-input-wrap">
              <input class="comment-input" type="text" placeholder="Write a comment..." maxlength="200" aria-label="Write a comment" />
              <button class="btn-send" aria-label="Send"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
            </div>
          </div>
        </div>
      </footer>
    `;

    // Apply like style if already liked
    if (data.liked) {
      const icon = el.querySelector('.like-icon');
      if (icon) { icon.style.fill = 'var(--accent-pink)'; icon.style.stroke = 'var(--accent-pink)'; }
    }

    return el;
  }

  // ── Comment submit ─────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('.comment-input')) submitComment(e.target);
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-send');
    if (!btn) return;
    const inp = btn.closest('.comment-input-wrap')?.querySelector('.comment-input');
    if (inp) submitComment(inp);
  });

  function submitComment(inp) {
    const text = inp.value.trim();
    if (!text) return;
    const profile  = LS.get(KEYS.profile) || {};
    const author   = profile.name || 'Ahmad';
    const section  = inp.closest('.comments-section');
    const compose  = inp.closest('.comment--compose');
    const card     = inp.closest('.post-card');

    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
      <img class="avatar avatar--sm" src="https://i.pravatar.cc/150?img=1" alt="${escapeHTML(author)}" />
      <div class="comment__bubble">
        <span class="comment__author">${escapeHTML(author)}</span>
        <p>${escapeHTML(text)}</p>
        <div class="comment__actions">
          <button class="like-btn post-action" data-liked="false" aria-pressed="false">
            <svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="like-count">0</span>
          </button>
          <button class="post-action">Reply</button>
        </div>
      </div>
    `;
    section.insertBefore(div, compose);
    inp.value = '';

    const countSpan = section.closest('.post-card')?.querySelector('.comment-toggle-btn span');
    if (countSpan) countSpan.textContent = formatLikeCount(parseLikeCount(countSpan.textContent) + 1);

    // Persist comment on user-created posts
    if (card) {
      const postId = card.dataset.postId;
      const savedPosts = LS.get(KEYS.posts) || [];
      const post = savedPosts.find(p => String(p.id) === postId);
      if (post) {
        post.comments = post.comments || [];
        post.comments.push({ author, text });
        LS.set(KEYS.posts, savedPosts);
      }
    }
  }

  // ── Restore static post like/follow states on load ─────────
  function restoreStaticStates() {
    const likes   = LS.get(KEYS.likes)   || {};
    const follows = LS.get(KEYS.follows) || {};

    // Restore likes on static (HTML-defined) posts
    document.querySelectorAll('.post-card[data-post-id]').forEach(card => {
      const id   = card.dataset.postId;
      const data = likes[id];
      if (!data) return;
      const btn     = card.querySelector('.like-btn');
      const counter = card.querySelector('.like-count');
      if (btn && counter) {
        btn.dataset.liked = String(data.liked);
        btn.setAttribute('aria-pressed', String(data.liked));
        counter.textContent = formatLikeCount(data.count);
        applyLikeStyle(btn, data.liked);
      }
    });

    // Restore follow states
    document.querySelectorAll('.btn-follow').forEach(btn => {
      const handle = btn.closest('.follow-item')
        ?.querySelector('.follow-item__handle')?.textContent?.trim();
      if (handle && follows[handle]) {
        btn.dataset.following = 'true';
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = 'Following';
      }
    });

    // Restore bookmark button states
    const bookmarks = LS.get(KEYS.bookmarks) || {};
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      const id = btn.closest('.post-card')?.dataset.postId;
      if (id && bookmarks[id]) {
        btn.dataset.bookmarked = 'true';
        btn.setAttribute('aria-pressed', 'true');
        btn.style.color = 'var(--accent-pink)';
      }
    });
  }

  // ── Restore user-created posts ─────────────────────────────
  function restorePosts() {
    const savedPosts = LS.get(KEYS.posts) || [];
    if (savedPosts.length === 0) return;
    const anchor = document.querySelector('.compose-card');
    if (!anchor) return;
    savedPosts.forEach(data => {
      const el = buildPostElement(data);
      anchor.insertAdjacentElement('afterend', el);
    });
  }

  // ── Settings persistence ───────────────────────────────────
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(KEYS.profile)) || {}; } catch { return {}; }
  }
  function saveSettings(patch) {
    localStorage.setItem(KEYS.profile, JSON.stringify({ ...loadSettings(), ...patch }));
  }

  function reflectProfile(s) {
    const fields = [
      ['sidebar-name',    s.name],
      ['sidebar-handle',  s.handle],
      ['dropdown-name',   s.name],
      ['dropdown-handle', s.handle],
    ];
    fields.forEach(([id, val]) => {
      if (val) { const el = document.getElementById(id); if (el) el.textContent = val; }
    });
  }

  function applyStoredSettings() {
    const s = loadSettings();
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    const chk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    if (s.name)   set('settings-name',   s.name);
    if (s.handle) set('settings-handle', s.handle);
    if (s.email)  set('settings-email',  s.email);
    if (s.bio)    set('settings-bio',    s.bio);
    chk('toggle-compact',        s.compact);
    chk('toggle-notif-likes',    s.notifLikes    !== false);
    chk('toggle-notif-comments', s.notifComments !== false);
    chk('toggle-notif-follows',  s.notifFollows  !== false);
    chk('toggle-notif-messages', s.notifMessages);
    chk('toggle-private',        s.private);
    chk('toggle-online',         s.online !== false);
    chk('toggle-msg-requests',   s.msgRequests !== false);
    if (s.theme) {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
    }
    reflectProfile(s);
  }

  // Save account button
  document.addEventListener('click', e => {
    if (!e.target.matches('#settings-save-account')) return;
    const get = id => document.getElementById(id)?.value.trim() || '';
    const patch = { name: get('settings-name'), handle: get('settings-handle'), email: get('settings-email'), bio: get('settings-bio') };
    saveSettings(patch);
    reflectProfile(patch);
    toast('Settings saved! ✅', 'pink');
  });

  // Toggle switches
  ['toggle-compact','toggle-notif-likes','toggle-notif-comments','toggle-notif-follows',
   'toggle-notif-messages','toggle-private','toggle-online','toggle-msg-requests'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = id.replace('toggle-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    el.addEventListener('change', () => saveSettings({ [key]: el.checked }));
  });

  // Theme buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveSettings({ theme: btn.dataset.theme });
    toast(`Theme: ${btn.textContent.trim()}`, 'pink');
  });

  // ── Dark mode toggle ───────────────────────────────────────
  const darkmodeBtn = document.querySelector('.btn-darkmode');
  if (darkmodeBtn) {
    const isLight = () => document.body.classList.contains('light-mode');
    const updateBtn = () => { darkmodeBtn.textContent = isLight() ? '☀️ Light Mode' : '🌙 Dark Mode'; };
    if (localStorage.getItem('lightMode') === '1') { document.body.classList.add('light-mode'); updateBtn(); }
    darkmodeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      localStorage.setItem('lightMode', isLight() ? '1' : '0');
      updateBtn();
    });
  }

  // ── Refresh timestamps every 60 s ─────────────────────────
  setInterval(() => {
    document.querySelectorAll('.post-time[data-created-at]').forEach(el => {
      el.textContent = timeAgo(+el.dataset.createdAt);
    });
  }, 60000);

  // ── Init on load ───────────────────────────────────────────
  applyStoredSettings();
  restorePosts();
  restoreStaticStates();
  renderBookmarksPage();

  setTimeout(() => toast('Assalamu Alaikum, Ahmad! 👋', 'gold'), 800);
})();
