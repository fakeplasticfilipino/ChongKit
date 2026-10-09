// Character Sheet: the notes. Each tab (the same tab strip as before) has four note boxes: three lists
// of notes and one free box of plain text (typed in at any time). A note is
// a name and a description.
// Playing: click a note's name to open or close its description; the chevron on a box opens or
// closes all its notes. Customize: type names, descriptions and box titles, + Note, × deletes a
// note, drag a note's grip to move it (within its box or into another), drag a box's grip onto
// another box to swap them. ui.js hands over its helpers and draws this.
(function () {
  const S = window.Sheet;
  window.SheetNotes = function (ui) {
    const { h, icon, change, commit } = ui;
    let focusNote = null; // a new note's id: its name field gets the cursor after the redraw
    let dragging = null; // the note being dragged: { box, id }
    let draggingBox = null; // the index of the box being dragged

    function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
    const redraw = () => { commit(); ui.render(); };
    const grip = (label) => h('span', { class: 'cs-grip', title: label, draggable: 'true' }, icon('grip', 'cs-ic sm'));
    function startDrag(handle, node, set) {
      handle.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('application/x-chongkit', 'note');
        ev.dataTransfer.effectAllowed = 'move';
        set();
        node.classList.add('dragging');
      });
      handle.addEventListener('dragend', () => { node.classList.remove('dragging'); dragging = null; draggingBox = null; });
    }
    // Drop on a note to go before it, on a box's empty space to go at its end; a box onto a box swaps them.
    function dropTarget(node, accepts, onDrop) {
      node.addEventListener('dragover', (ev) => { if (accepts()) { ev.preventDefault(); ev.stopPropagation(); node.classList.add('drop'); } });
      node.addEventListener('dragleave', () => node.classList.remove('drop'));
      node.addEventListener('drop', (ev) => { if (!accepts()) return; ev.preventDefault(); ev.stopPropagation(); node.classList.remove('drop'); onDrop(); });
    }
    function moveNote(tab, toBox, at) {
      const from = dragging;
      dragging = null;
      if (from) change(null, () => { tab.boxes = S.moveNote(tab.boxes, from.box, from.id, toBox, at); });
    }
    function swapWith(tab, j) {
      const i = draggingBox;
      draggingBox = null;
      if (i != null && i !== j) change(null, () => { tab.boxes = S.swapBoxes(tab.boxes, i, j); });
    }

    function note(n, i, box, tab) {
      const name = n.name || 'Untitled';
      const open = ui.printing || !n.folded;
      const toggle = () => { n.folded = !n.folded; redraw(); };
      const chevron = h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(open), 'aria-label': open ? 'Close' : 'Open', onclick: toggle },
        icon('chevron', 'cs-ic sm'));
      if (!ui.editing) {
        return h('div', { class: 'cs-note' + (open ? ' open' : ''), 'data-note': n.id },
          h('button', { type: 'button', class: 'cs-nname', 'aria-expanded': String(open), onclick: toggle }, icon('chevron', 'cs-ic sm cs-chev'), h('span', {}, name)),
          open ? h('div', { class: 'cs-ndesc' }, n.text) : null);
      }
      const handle = grip('Drag to move');
      const head = h('div', { class: 'cs-nrow' }, handle, chevron,
        h('input', { class: 'cs-nname-in', value: n.name, 'aria-label': 'Name', spellcheck: false,
          oninput: (ev) => { n.name = ev.target.value; commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } }),
        h('button', { type: 'button', class: 'cs-ndel', title: 'Delete', 'aria-label': `Delete ${name}`,
          onclick: () => change(`Deleted ${name}`, () => { box.notes = box.notes.filter((x) => x.id !== n.id); }) }, icon('close', 'cs-ic xs')));
      let desc = null;
      if (open) {
        desc = h('textarea', { class: 'cs-ndesc-in', value: n.text, rows: 2, 'aria-label': `${name} description`, spellcheck: true,
          oninput: (ev) => { n.text = ev.target.value; commit(); grow(ev.target); } });
        setTimeout(() => grow(desc), 0);
      }
      const node = h('div', { class: 'cs-note edit' + (open ? ' open' : ''), 'data-note': n.id }, head, desc);
      startDrag(handle, node, () => { dragging = { box: box.id, id: n.id }; });
      dropTarget(node, () => !!dragging, () => moveNote(tab, box.id, i));
      return node;
    }

    // The free box: plain text, typed straight in at any time (playing or in Customize).
    function freeBox(box, j, tab) {
      const handle = ui.editing ? grip('Drag onto another box to swap') : null;
      const title = ui.editing
        ? h('input', { class: 'cs-ntitle', value: box.title, 'aria-label': 'Box title', spellcheck: false,
          oninput: (ev) => { box.title = ev.target.value; commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } })
        : h('span', { class: 'cs-ntitle' }, box.title);
      const body = ui.printing ? h('div', { class: 'cs-ndesc cs-freetext' }, box.text)
        : h('textarea', { class: 'cs-free', value: box.text, 'aria-label': box.title || 'Notes', spellcheck: true,
          oninput: (ev) => { box.text = ev.target.value; commit(); } });
      const node = h('div', { class: 'cs-nbox free' }, h('div', { class: 'cs-nhead' }, handle, title), body);
      if (handle) {
        startDrag(handle, node, () => { draggingBox = j; });
        dropTarget(node, () => draggingBox != null, () => swapWith(tab, j));
      }
      return node;
    }

    function noteBox(box, j, tab) {
      if (box.free) return freeBox(box, j, tab);
      const anyOpen = box.notes.some((n) => !n.folded);
      const fold = h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(anyOpen), 'aria-label': anyOpen ? 'Close all' : 'Open all',
        onclick: () => { box.notes.forEach((n) => { n.folded = anyOpen; }); redraw(); } }, icon('chevron', 'cs-ic sm'));
      const handle = ui.editing ? grip('Drag onto another box to swap') : null;
      const title = ui.editing
        ? h('input', { class: 'cs-ntitle', value: box.title, 'aria-label': 'Box title', spellcheck: false,
          oninput: (ev) => { box.title = ev.target.value; commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } })
        : h('span', { class: 'cs-ntitle' }, box.title);
      const add = ui.editing ? h('button', { type: 'button', class: 'cs-nadd', onclick: () => {
        const n = S.newNote();
        focusNote = n.id;
        change(null, () => { box.notes.push(n); });
      } }, '+ Note') : null;
      const node = h('div', { class: 'cs-nbox' },
        h('div', { class: 'cs-nhead' }, handle, fold, title),
        h('div', { class: 'cs-nlist' }, box.notes.map((n, i) => note(n, i, box, tab)), add));
      if (handle) {
        startDrag(handle, node, () => { draggingBox = j; });
        dropTarget(node, () => !!dragging || draggingBox != null, () => (dragging ? moveNote(tab, box.id, null) : swapWith(tab, j)));
      }
      return node;
    }

    function render() {
      const count = (t) => t.boxes.reduce((sum, b) => sum + b.notes.length, 0);
      const { cur, strip } = ui.tabStrip('tabs', 'tab', () => S.newTab(''), count, 'New tab');
      const boxes = cur ? h('div', { class: 'cs-nboxes', role: 'tabpanel' }, cur.boxes.map((b, j) => noteBox(b, j, cur))) : null;
      if (focusNote) {
        const id = focusNote;
        focusNote = null;
        setTimeout(() => { const t = document.querySelector(`[data-note="${id}"] .cs-nname-in`); if (t) t.focus(); }, 0);
      }
      return h('section', { class: 'cs-notes' + (ui.editing ? ' editing' : '') }, strip, boxes);
    }
    return { render };
  };
})();
