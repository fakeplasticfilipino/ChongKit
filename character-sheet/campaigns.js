// Character Sheet: campaigns. Players and the GM of one campaign see each other's characters:
// someone makes a campaign and shares its code, the others join with it, and each adds the
// characters they choose (one campaign per character). The Characters menu gets a section per
// campaign, made of the same cards; a friend's opens read-only. No roles: anyone can rename, copy
// the code or make a new one; each player adds and removes only their own characters.
// Refreshes every 30 s while the menu or a friend's sheet is on screen (no Realtime): campaigns,
// then the index, then only the characters that changed (Sheet.campaignDiff / campaignMerge). The
// last copy is kept per account (Cloud.campaignCache). Needs an account. ui.js hands over its
// helpers and draws this into the Characters menu.
(function () {
  const S = window.Sheet;
  const EVERY = 30000;
  const EMPTY = () => ({ campaigns: [], chars: {}, own: {} });
  window.SheetCampaigns = function (ui) {
    const { h } = ui;
    const C = window.Cloud;
    const on = () => !!(C && C.signedIn);
    let cache = (on() && C.campaignCache()) || EMPTY();
    let timer = null;
    let busy = false;
    let active = false;
    let open = null; // the campaign whose ⋯ menu is open
    document.addEventListener('pointerdown', (ev) => {
      if (open && !ev.target.closest('.cs-cmore, .cs-cpop')) { open = null; ui.renderMenu(); }
    });
    if (C) C.onChange(() => { cache = (on() && C.campaignCache()) || EMPTY(); });

    const sections = () => (on() ? S.campaignView(cache, ui.chars(), C.userId) : []);
    function campaignOf(id) {
      const cid = on() && cache.own[id];
      return (cid && cache.campaigns.find((x) => x.id === cid)) || null;
    }

    async function refresh() {
      if (!on() || busy) return;
      busy = true;
      try {
        const campaigns = await C.campaigns();
        const index = await C.campaignIndex();
        const d = S.campaignDiff(cache, index, C.userId);
        const want = new Set(d.fetch);
        const fetched = (await C.campaignChars(d.fetch)).filter((r) => want.has(S.campaignKey(r.user_id, r.id)));
        cache = S.campaignMerge(cache, campaigns, index, fetched, C.userId);
        C.setCampaignCache(cache);
        ui.campaignsChanged();
      } catch {
        if (on()) ui.status('Not synced', true);
      } finally {
        busy = false;
      }
    }
    // On while the menu or a friend's sheet shows; a hidden tab skips its turns.
    function setActive(a) {
      active = !!a && on();
      clearInterval(timer);
      timer = active ? setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, EVERY) : null;
      if (active) refresh();
    }
    document.addEventListener('visibilitychange', () => { if (active && document.visibilityState === 'visible') refresh(); });

    // A campaign change: call the database, then refresh at once. Offline it just fails.
    async function run(fn, done) {
      try { await fn(); await refresh(); if (done) ui.notify(done); } catch (e) { alert(e.message); }
    }
    function remove(c) { return run(() => C.setCampaign(c.id, null)); }

    // A one-field dialog (New campaign, Join, Rename).
    function ask(title, label, value, button, submit) {
      const d = ui.dialog();
      const inp = h('input', { class: 'cs-auth-in', value, required: true, maxLength: 60, 'aria-label': label, spellcheck: false });
      d.show(h('h2', {}, title), h('form', { class: 'cs-auth-form', onsubmit: async (ev) => {
        ev.preventDefault();
        if (!inp.reportValidity()) return;
        d.say('…');
        try { await submit(inp.value.trim()); d.done(); await refresh(); } catch (e) { d.say(e.message, true); }
      } }, h('label', {}, h('span', { class: 'label' }, label), inp), h('button', { type: 'submit', class: 'btn primary' }, button)));
      setTimeout(() => inp.focus(), 0);
    }
    function join(text) {
      const code = S.parseCode(text);
      if (!code) throw new Error('No campaign with that code');
      return C.joinCampaign(code);
    }
    // + Add character: your characters; one already in a campaign is greyed with its name.
    function pick(v) {
      const d = ui.dialog();
      const names = new Map(cache.campaigns.map((x) => [x.id, x.name]));
      const mine = Object.values(ui.chars()).filter((c) => !c.owner || c.owner === C.userId)
        .sort((a, b) => (b.updated || 0) - (a.updated || 0));
      const rows = mine.map((c) => {
        const inCamp = cache.own[c.id];
        const first = c.details.find((x) => x.value.trim());
        const sub = inCamp ? `in ${names.get(inCamp) || 'a campaign'}` : first ? `${first.label} ${first.value}`.trim() : '';
        return h('button', { type: 'button', class: 'cs-pick' + (inCamp ? ' off' : ''), disabled: !!inCamp, onclick: async () => {
          d.say('…');
          try { await ui.upload(c); await C.setCampaign(c.id, v.id); d.done(); await refresh(); } catch (e) { d.say(e.message, true); }
        } }, h('span', {}, c.name || 'Unnamed'), h('span', { class: 'cs-pick-sub' }, sub));
      });
      d.show(h('h2', {}, `Add to ${v.name}`),
        h('div', { class: 'cs-picks' }, rows, h('button', { type: 'button', class: 'cs-pick cancel', onclick: d.done }, 'Cancel')));
    }

    function section(v) {
      const actions = [
        ['Copy code', () => { if (navigator.clipboard) navigator.clipboard.writeText(S.formatCode(v.code)).then(() => ui.notify('Code copied'), () => {}); }],
        ['Rename', () => ask('Rename campaign', 'Name', v.name, 'Save', (name) => C.renameCampaign(v.id, name))],
        ['New code', () => run(() => C.newCode(v.id))],
        ['Leave', () => { if (confirm(`Leave ${v.name}?`)) run(() => C.leaveCampaign(v.id), `Left ${v.name}`); }],
      ];
      const more = h('button', { type: 'button', class: 'cs-cmore', 'aria-label': `More for ${v.name}`, 'aria-expanded': String(open === v.id),
        onclick: (ev) => { ev.stopPropagation(); open = open === v.id ? null : v.id; ui.renderMenu(); } }, '⋯');
      const pop = open === v.id ? h('div', { class: 'cs-cpop', role: 'menu' }, actions.map(([label, fn]) => h('button', {
        type: 'button', role: 'menuitem', class: label === 'Leave' ? 'danger' : null,
        onclick: (ev) => { ev.stopPropagation(); open = null; ui.renderMenu(); fn(); },
      }, label))) : null;
      const cards = v.cards.map((k) => (k.mine
        ? ui.card(k.char, { key: k.key, open: () => ui.open(k.char), foot: 'You', who: true, actions: [['Remove from campaign', () => remove(k.char)]] })
        : ui.card(k.char, { key: k.key, open: () => ui.openFriend(k, v), foot: `${k.player} · ${S.edited(k.char.updated)}`, who: true })));
      return [
        h('div', { class: 'cs-msec' }, h('h2', {}, v.name), h('span', { class: 'cs-code' }, S.formatCode(v.code)),
          h('span', { class: 'cs-msub' }, `${v.players} player${v.players === 1 ? '' : 's'}`), h('span', { class: 'cs-smenu' }, more, pop)),
        h('div', { class: 'cs-cards' }, cards, h('button', { type: 'button', class: 'cs-cnew', onclick: () => pick(v) }, '+ Add character')),
      ];
    }
    function render() {
      if (!C) return [];
      if (!on()) return [h('div', { class: 'cs-crow' }, h('button', { type: 'button', class: 'cs-cnew', onclick: () => ui.openAccount() }, 'Sign in to join a campaign'))];
      return [...sections().flatMap(section), h('div', { class: 'cs-crow' },
        h('button', { type: 'button', class: 'cs-cnew', onclick: () => ask('New campaign', 'Name', '', 'Create', (name) => C.createCampaign(name)) }, '+ New campaign'),
        h('button', { type: 'button', class: 'cs-cnew', onclick: () => ask('Join a campaign', 'Code', '', 'Join', join) }, 'Join with code'))];
    }
    return { render, sections, campaignOf, remove, refresh, setActive };
  };
})();
