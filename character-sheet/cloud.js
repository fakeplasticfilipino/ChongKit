// Character Sheet: sign-in and syncing through Supabase (browser global `Cloud`).
// Plain fetch calls to Supabase's Auth and REST APIs, no library, so the page stays zero-install.
// Signed out, nothing here runs and the sheet only uses this browser's localStorage.
// Sign-in: Discord or email + password, using the PKCE flow (only a one-time code ever appears in
// the address bar; it's swapped for the session here). The session lives in localStorage.
// Data: one row per character in `character_sheets` (user_id, id, data, updated_at, campaign_id);
// row-level security lets each account write only its own rows, and read its own plus those in
// campaigns it's a member of (so `list` asks for its own rows only). Campaign changes go through
// database functions (rpc/*). The database also refuses characters over 256 KB, more than 50 per
// account, and older versions over newer ones.
(function () {
  const URL_ = 'https://fmkbvoukbrxjbzlexjhu.supabase.co';
  const KEY = 'sb_publishable_p327nFvW--OtzVX2W7saxA_1tEietW5'; // publishable (public) key: RLS guards the data
  const STORE = 'chongkit.auth';
  const PKCE = 'chongkit.pkce'; // { verifier, kind: 'oauth' | 'signup' | 'recovery' } while a sign-in is under way

  const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let session = get(STORE); // { access_token, refresh_token, expires_at (s), user }
  const listeners = new Set();
  const emit = (why) => listeners.forEach((f) => f(session, why));

  function save(s, why) {
    session = s;
    put(STORE, s);
    emit(why);
  }
  function fromTokens(t, user) {
    return {
      access_token: t.access_token, refresh_token: t.refresh_token,
      expires_at: t.expires_at ? +t.expires_at : Math.floor(Date.now() / 1000) + (+t.expires_in || 3600),
      user: user || t.user || null,
    };
  }
  // Sync records are kept per account, so one account's characters never mix into another's.
  const userKey = (name) => (session && session.user ? `chongkit.${name}.${session.user.id}` : null);

  async function auth(path, body, token, method) {
    const res = await fetch(`${URL_}/auth/v1/${path}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(data.msg || data.error_description || data.message || `Sign-in failed (${res.status})`);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  // PKCE: a random verifier stays in this browser; only its SHA-256 goes to Supabase.
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function challenge(kind) {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    put(PKCE, { verifier, kind });
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return { code_challenge: b64url(hash), code_challenge_method: 's256' };
  }

  // A fresh access token (refreshed a minute before it runs out); null when signed out.
  let refreshing = null;
  async function token() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    if (!refreshing) {
      refreshing = auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
        .then((t) => save(fromTokens(t, t.user || session.user)))
        .catch((e) => {
          // Refused by Supabase (revoked, expired, account deleted): the session is over; sign out and say so.
          // A network error keeps the session, to try again later.
          if (e.status === 400 || e.status === 401 || e.status === 403) save(null, 'expired');
          throw e;
        })
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
    if (res.status === 401) { save(null, 'expired'); throw new Error('Signed out'); }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `Sync failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  }

  const here = () => location.origin + location.pathname;

  const Cloud = {
    get user() { return session && session.user; },
    get userId() { return session && session.user ? session.user.id : null; },
    get signedIn() { return !!session; },
    name() {
      const u = session && session.user;
      if (!u) return '';
      const m = u.user_metadata || {};
      return m.full_name || m.name || (m.custom_claims && m.custom_claims.global_name) || m.user_name || u.email || 'Account';
    },
    onChange(f) { listeners.add(f); },

    async discord() {
      const c = await challenge('oauth');
      location.href = `${URL_}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(here())}`
        + `&code_challenge=${c.code_challenge}&code_challenge_method=${c.code_challenge_method}`;
    },
    async signIn(email, password) {
      save(fromTokens(await auth('token?grant_type=password', { email, password })));
    },
    // Returns true when signed in right away, false when the email has to be confirmed first.
    async signUp(email, password) {
      const c = await challenge('signup');
      const r = await auth(`signup?redirect_to=${encodeURIComponent(here())}`, { email, password, ...c });
      if (r.access_token) { put(PKCE, null); save(fromTokens(r)); return true; }
      return false;
    },
    // Emails a link back here; finishRedirect then reports 'recovery' so the page asks for a new password.
    async resetPassword(email) {
      const c = await challenge('recovery');
      await auth(`recover?redirect_to=${encodeURIComponent(here())}`, { email, ...c });
    },
    async setPassword(password) {
      const t = await token();
      if (!t) throw new Error('Signed out');
      const user = await auth('user', { password }, t, 'PUT');
      save({ ...session, user: user || session.user });
    },
    async signOut() {
      const t = session && session.access_token;
      save(null);
      if (t) auth('logout', {}, t).catch(() => {});
    },
    async deleteAccount() {
      await rest('POST', 'rpc/delete_my_account', {});
      put(userKey('synced'), null);
      put(userKey('deletes'), null);
      put(userKey('campaigns'), null);
      save(null);
    },
    // Back from Discord, an email link or a reset link. Returns null (nothing to do), 'signin', or
    // 'recovery' (ask for a new password). Reads ?code= (PKCE) and, for old links, #access_token=.
    async finishRedirect() {
      const q = new URLSearchParams(location.search);
      const h = new URLSearchParams(location.hash.slice(1));
      const err = q.get('error_description') || h.get('error_description');
      const code = q.get('code');
      if (!err && !code && !h.has('access_token')) return null;
      q.delete('code'); q.delete('error'); q.delete('error_code'); q.delete('error_description');
      history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : ''));
      if (err) throw new Error(err);
      if (code) {
        const p = get(PKCE);
        put(PKCE, null);
        if (!p) throw new Error('This link was opened in a different browser. Open it where you started, or just sign in.');
        save(fromTokens(await auth('token?grant_type=pkce', { auth_code: code, code_verifier: p.verifier })));
        return p.kind === 'recovery' ? 'recovery' : 'signin';
      }
      const t = Object.fromEntries(h);
      const user = await auth('user', null, t.access_token).catch(() => null);
      save(fromTokens(t, user));
      return t.type === 'recovery' ? 'recovery' : 'signin';
    },

    // Ids this browser has seen in the account (see Sheet.mergeChars), per account.
    synced: () => get(userKey('synced')) || [],
    setSynced: (ids) => { const k = userKey('synced'); if (k) put(k, [...new Set(ids)]); },
    // Your own characters only: campaign members can read each other's rows too.
    async list() { return (await rest('GET', window.Sheet.ownRowsPath(Cloud.userId))) || []; },
    async push(chars) {
      if (!chars.length) return;
      await rest('POST', 'character_sheets?on_conflict=user_id,id',
        chars.map((c) => ({ id: c.id, data: c, updated_at: new Date().toISOString() })),
        'resolution=merge-duplicates,return=minimal');
    },
    // Deletes are queued until the account confirms them, so one made offline isn't undone later.
    async remove(id) {
      const k = userKey('deletes');
      if (k) put(k, [...new Set([...(get(k) || []), id])]);
      await Cloud.flushDeletes();
    },
    pendingDeletes: () => get(userKey('deletes')) || [],
    async flushDeletes() {
      const k = userKey('deletes');
      const ids = (k && get(k)) || [];
      for (const id of ids) {
        await rest('DELETE', `character_sheets?id=eq.${encodeURIComponent(id)}`, null, 'return=minimal');
        put(k, (get(k) || []).filter((x) => x !== id));
        Cloud.setSynced(Cloud.synced().filter((x) => x !== id));
      }
    },

    // --- Campaigns (campaigns.js; the diff and merge are Sheet.campaignDiff / campaignMerge) ---
    async campaigns() { return (await rest('GET', 'campaigns?select=id,name,code,campaign_members(user_id,name)')) || []; },
    async campaignIndex() { return (await rest('GET', window.Sheet.CAMPAIGN_INDEX_PATH)) || []; },
    async campaignChars(keys) { return keys.length ? (await rest('GET', window.Sheet.campaignCharsPath(keys))) || [] : []; },
    createCampaign: (name) => rest('POST', 'rpc/create_campaign', { p_name: name, p_member: Cloud.name() }),
    joinCampaign: (code) => rest('POST', 'rpc/join_campaign', { p_code: code, p_member: Cloud.name() }),
    leaveCampaign: (id) => rest('POST', 'rpc/leave_campaign', { p_campaign: id }),
    renameCampaign: (id, name) => rest('POST', 'rpc/rename_campaign', { p_campaign: id, p_name: name }),
    newCode: (id) => rest('POST', 'rpc/new_campaign_code', { p_campaign: id }),
    // null takes the character out of its campaign. It must be in the account first.
    setCampaign: (charId, campaignId) => rest('POST', 'rpc/set_character_campaign', { p_character: charId, p_campaign: campaignId }),
    // The last refresh, per account, so the cards still show offline.
    campaignCache: () => get(userKey('campaigns')),
    setCampaignCache: (c) => { const k = userKey('campaigns'); if (k) put(k, c); },
  };
  window.Cloud = Cloud;
})();
