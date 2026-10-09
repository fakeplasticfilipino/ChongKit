// Character Sheet: the Characters menu. "Your characters": a card per character (its name, its
// filled-in details, the first Current / Max pair and the Armor box, when it was last edited and
// whether it's synced; a tag when it's in a campaign), most recently edited first; click a card to
// open that character. Each card's ⋯ has Copy, Export file, Print, Reset character, Remove from
// campaign (when it's in one) and Delete; + New character starts one. Then the campaigns
// (campaigns.js), which reuse `card`. ui.js hands over its helpers and the actions, and draws this
// into #cards.
(function () {
  const S = window.Sheet;
  window.SheetMenu = function (ui) {
    const { h } = ui;
    let open = null; // the key of the card whose ⋯ menu is open
    document.addEventListener('pointerdown', (ev) => {
      if (open && !ev.target.closest('.cs-cmore, .cs-cpop')) { open = null; ui.renderMenu(); }
    });

    const ACTIONS = [['Copy', 'copy'], ['Export file', 'export'], ['Print', 'print'], ['Reset character', 'reset'], ['Delete', 'delete']];
    const stat = (label, value) => h('div', { class: 'cs-cstat' }, h('b', {}, value || '—'), h('span', {}, label));
    // A card. opts: key (default c.id), open (click), foot (text), who (bold foot), tag (campaign
    // name), current, actions ([label, run, danger]; none = no ⋯).
    function card(c, opts = {}) {
      const key = opts.key || c.id;
      const name = c.name || 'Unnamed';
      const details = c.details.filter((d) => d.value.trim()).map((d) => `${d.label} ${d.value}`.trim()).join(' · ');
      const pair = c.pairs[0];
      const armor = c.boxes.find((b) => /armor/i.test(b.label));
      const stats = [];
      if (pair) stats.push(stat(pair.label || 'Current', pair.cur || pair.max ? `${pair.cur || '—'}/${pair.max || '—'}` : ''));
      if (armor) stats.push(stat(armor.label, armor.value));
      const actions = opts.actions || [];
      const more = actions.length ? h('button', { type: 'button', class: 'cs-cmore', 'aria-label': `More for ${name}`, 'aria-expanded': String(open === key),
        onclick: (ev) => { ev.stopPropagation(); open = open === key ? null : key; ui.renderMenu(); } }, '⋯') : null;
      const pop = more && open === key ? h('div', { class: 'cs-cpop', role: 'menu' }, actions.map(([label, run, danger]) => h('button', {
        type: 'button', role: 'menuitem', class: danger ? 'danger' : null,
        onclick: (ev) => { ev.stopPropagation(); open = null; ui.renderMenu(); run(); },
      }, label))) : null;
      return h('div', {
        class: 'cs-ccard' + (opts.current ? ' current' : ''), role: 'button', tabIndex: 0, 'aria-label': `Open ${name}`,
        onclick: opts.open,
        onkeydown: (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) { ev.preventDefault(); opts.open(); } },
      },
      h('div', { class: 'cs-cname' }, name),
      details ? h('div', { class: 'cs-cmeta' }, details) : null,
      stats.length ? h('div', { class: 'cs-cstats' }, stats) : null,
      h('div', { class: 'cs-cfoot' + (opts.who ? ' who' : '') }, opts.foot || '', opts.tag ? h('span', { class: 'cs-ctag' }, opts.tag) : null),
      more, pop);
    }
    function ownCard(c) {
      const camp = ui.campaignOf(c.id);
      const actions = ACTIONS.map(([label, k]) => [label, () => ui.act(k, c), k === 'delete']);
      if (camp) actions.splice(actions.length - 1, 0, ['Remove from campaign', () => ui.act('uncampaign', c)]);
      return card(c, {
        current: c.id === ui.current, open: () => ui.open(c), actions, tag: camp && camp.name,
        foot: `${S.edited(c.updated)} · ${ui.synced(c) ? 'Synced' : 'This browser only'}`,
      });
    }
    function render() {
      const list = Object.values(ui.chars()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
      return [
        h('div', { class: 'cs-msec' }, h('h2', {}, 'Your characters')),
        h('div', { class: 'cs-cards' }, list.map(ownCard), h('button', { type: 'button', class: 'cs-cnew', onclick: () => ui.act('new') }, '+ New character')),
        ...ui.campaignSections(),
      ];
    }
    return { render, card };
  };
})();
