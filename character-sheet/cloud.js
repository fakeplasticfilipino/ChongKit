// Character Sheet: sign-in and syncing through Supabase (browser global `Cloud`).
// Plain fetch calls to Supabase's Auth and REST APIs, no library, so the page stays zero-install.
// Signed out, nothing here runs and the sheet only uses this browser's localStorage.
// Sign-in: Discord (OAuth redirect) or email + password. The session lives in localStorage.
// Data: one row per character in `character_sheets` (user_id, id, data, updated_at); row-level
// security lets each account read and write only its own rows.
(function () {
  const URL_ = 'https://fmkbvoukbrxjbzlexjhu.supabase.co';
  const KEY = 'sb_publishable_p327nFvW--OtzVX2W7saxA_1tEietW5'; // publishable (public) key: safe in the page, RLS guards the data
  const STORE = 'chongkit.auth';
  const SYNCED = 'chongkit.synced'; // ids this browser has seen in the account (see Sheet.mergeChars)

  const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let session = get(STORE); // { access_token, refresh_token, expires_at (s), user }
  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f(session));

  function save(s) {
    session = s;
    put(STORE, s);
    if (!s) put(SYNCED, null);
    emit();
  }
  function fromTokens(t, user) {
    return {
      access_token: t.access_token, refresh_token: t.refresh_token,
      expires_at: t.expires_at ? +t.expires_at : Math.floor(Date.now() / 1000) + (+t.expires_in || 3600),
      user: user || t.user || null,
    };
  }

  async function auth(path, body, token) {
    const res = await fetch(`${URL_}/auth/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || `Sign-in failed (${res.status})`);
    return data;
  }

  // A fresh access token (refreshed a minute before it runs out); null when signed out.
  let refreshing = null;
  async function token() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    if (!refreshing) {
      refreshing = auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
        .then((t) => save(fromTokens(t, t.user || session.user)))
        .catch((e) => { if (/invalid|expired|not found/i.test(e.message)) save(null); throw e; })
        .finally(() => { refreshing = null; });
    }
    await refreshing;
    return session && session.access_token;
  }

  async function rest(method, path, body, prefer) {
    const t = await token();
    if (!t) throw new Error('Signed out');
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      method,
      headers: { apikey: KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Sync failed (${res.status})`);
    return res.status === 204 ? null : res.json().catch(() => null);
  }

  const here = () => location.origin + location.pathname;

  const Cloud = {
    get user() { return session && session.user; },
    get signedIn() { return !!session; },
    name() {
      const u = session && session.user;
      if (!u) return '';
      const m = u.user_metadata || {};
      return m.full_name || m.name || m.custom_claims?.global_name || m.user_name || u.email || 'Account';
    },
    onChange(f) { listeners.add(f); },

    // Discord: off to Discord and back here with the tokens in the URL (handled by finishRedirect).
    discord() {
      location.href = `${URL_}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(here())}`;
    },
    async signIn(email, password) {
      save(fromTokens(await auth('token?grant_type=password', { email, password })));
    },
    // Returns true when signed in right away, false when the email has to be confirmed first.
    async signUp(email, password) {
      const r = await auth(`signup?redirect_to=${encodeURIComponent(here())}`, { email, password });
      if (r.access_token) { save(fromTokens(r)); return true; }
      return false;
    },
    async signOut() {
      const t = session && session.access_token;
      save(null);
      if (t) auth('logout', {}, t).catch(() => {});
    },
    // After Discord or an email confirmation link: read the tokens (or error) from the URL hash.
    async finishRedirect() {
      const h = new URLSearchParams(location.hash.slice(1));
      if (!h.has('access_token') && !h.has('error_description')) return null;
      history.replaceState(null, '', location.pathname + location.search);
      if (h.has('error_description')) throw new Error(h.get('error_description'));
      const t = Object.fromEntries(h);
      const user = await auth('user', null, t.access_token).catch(() => null);
      save(fromTokens(t, user));
      return session;
    },

    synced: () => get(SYNCED) || [],
    setSynced: (ids) => put(SYNCED, [...new Set(ids)]),
    async list() { return (await rest('GET', 'character_sheets?select=id,data')) || []; },
    async push(chars) {
      if (!chars.length) return;
      await rest('POST', 'character_sheets?on_conflict=user_id,id',
        chars.map((c) => ({ id: c.id, data: c, updated_at: new Date().toISOString() })),
        'resolution=merge-duplicates,return=minimal');
    },
    async remove(id) { await rest('DELETE', `character_sheets?id=eq.${encodeURIComponent(id)}`, null, 'return=minimal'); },
  };
  window.Cloud = Cloud;
})();
