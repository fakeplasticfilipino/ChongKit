// Character Sheet: the Characters menu. A card per character (its name, its filled-in details, the
// first Current / Max pair and the Armor box, when it was last edited and whether it's synced), most
// recently edited first; click a card to open that character. Each card's ⋯ has Copy, Export file,
// Print, Reset character and Delete; + New character starts one. ui.js hands over its helpers and the
// actions, and draws this into #cards.
(function () {
  const S = window.Sheet;
  window.SheetMenu = function (ui) {
    const { h } = ui;
    let open = null; // the id of the card whose ⋯ menu is open
    document.addEventListener('pointerdown', (ev) => {
      if (open && !ev.target.closest('.cs-cmore, .cs-cpop')) { open = null; ui.renderMenu(); }
    });

    const ACTIONS = [['Copy', 'copy'], ['Export file', 'export'], ['Print', 'print'], ['Reset character', 'reset'], ['Delete', 'delete']];
    const stat = (label, value) => h('div', { class: 'cs-cstat' }, h('b', {}, value || '—'), h('span', {}, label));
    function card(c) {
      const name = c.name || 'Unnamed';
      const details = c.details.filter((d) => d.value.trim()).map((d) => `${d.label} ${d.value}`.trim()).join(' · ');
      const pair = c.pairs[0];
      const armor = c.boxes.find((b) => /armor/i.test(b.label));
      const stats = [];
      if (pair) stats.push(stat(pair.label || 'Current', pair.cur || pair.max ? `${pair.cur || '—'}/${pair.max || '—'}` : ''));
      if (armor) stats.push(stat(armor.label, armor.value));
      const more = h('button', { type: 'button', class: 'cs-cmore', 'aria-label': `More for ${name}`, 'aria-expanded': String(open === c.id),
        onclick: (ev) => { ev.stopPropagation(); open = open === c.id ? null : c.id; ui.renderMenu(); } }, '⋯');
      const pop = open === c.id ? h('div', { class: 'cs-cpop', role: 'menu' }, ACTIONS.map(([label, key]) => h('button', {
        type: 'button', role: 'menuitem', class: key === 'delete' ? 'danger' : null,
        onclick: (ev) => { ev.stopPropagation(); open = null; ui.act(key, c); },
      }, label))) : null;
      return h('div', {
        class: 'cs-ccard' + (c.id === ui.current ? ' current' : ''), role: 'button', tabIndex: 0, 'aria-label': `Open ${name}`,
        onclick: () => ui.open(c),
        onkeydown: (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) { ev.preventDefault(); ui.open(c); } },
      },
      h('div', { class: 'cs-cname' }, name),
      details ? h('div', { class: 'cs-cmeta' }, details) : null,
      stats.length ? h('div', { class: 'cs-cstats' }, stats) : null,
      h('div', { class: 'cs-cfoot' }, `${S.edited(c.updated)} · ${ui.synced(c) ? 'Synced' : 'This browser only'}`),
      more, pop);
    }
    function render() {
      const list = Object.values(ui.chars()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
      return [...list.map(card), h('button', { type: 'button', class: 'cs-cnew', onclick: () => ui.act('new') }, '+ New character')];
    }
    return { render };
  };
})();
