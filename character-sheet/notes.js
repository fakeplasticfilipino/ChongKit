// Character Sheet: the notes. Tabs (the same tab strip as before) of note boxes; a note is free
// text whose first line is its name, and it folds to that one line (Sheet.noteTitle). Notes drag
// within their box or into another box of the tab. ui.js hands over its helpers and draws this.
(function () {
  const S = window.Sheet;
  window.SheetNotes = function (ui) {
    const { h, icon, change, commit } = ui;
    let focusNote = null; // a new note's id: its text box gets the cursor after the redraw
    let dragging = null; // the note being dragged: { box, id }

    function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
    const redraw = () => { commit(); ui.render(); };

    // Drop on a note to go before it, on a box's empty space to go at its end.
    function moveTo(tab, toBox, at) {
      const from = dragging;
      dragging = null;
      if (from) change(null, () => { tab.boxes = S.moveNote(tab.boxes, from.box, from.id, toBox, at); });
    }
    function dropTarget(node, onDrop) {
      node.addEventListener('dragover', (ev) => { if (dragging) { ev.preventDefault(); ev.stopPropagation(); node.classList.add('drop'); } });
      node.addEventListener('dragleave', () => node.classList.remove('drop'));
      node.addEventListener('drop', (ev) => { if (!dragging) return; ev.preventDefault(); ev.stopPropagation(); node.classList.remove('drop'); onDrop(); });
    }

    function note(n, i, box, tab) {
      const title = S.noteTitle(n.text);
      const toggle = () => { n.folded = !n.folded; redraw(); };
      let body;
      if (ui.printing) body = h('div', { class: 'cs-nprint' }, n.text);
      else if (n.folded) body = h('button', { type: 'button', class: 'cs-nline', onclick: toggle }, title);
      else {
        body = h('textarea', { class: 'cs-ntext', value: n.text, rows: 1, 'aria-label': title, spellcheck: true,
          oninput: (ev) => { n.text = ev.target.value; commit(); grow(ev.target); } });
        setTimeout(() => grow(body), 0);
      }
      const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
      const node = h('div', { class: 'cs-note' + (n.folded && !ui.printing ? ' folded' : ''), 'data-note': n.id },
        grip,
        h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(!n.folded), 'aria-label': n.folded ? 'Unfold' : 'Fold', onclick: toggle },
          icon('chevron', 'cs-ic sm')),
        body,
        h('button', { type: 'button', class: 'cs-ndel', title: 'Delete', 'aria-label': `Delete ${title}`,
          onclick: () => change(`Deleted ${title}`, () => { box.notes = box.notes.filter((x) => x.id !== n.id); }) }, icon('close', 'cs-ic xs')));
      grip.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('text/plain', 'note');
        ev.dataTransfer.effectAllowed = 'move';
        dragging = { box: box.id, id: n.id };
        node.classList.add('dragging');
      });
      grip.addEventListener('dragend', () => { node.classList.remove('dragging'); dragging = null; });
      dropTarget(node, () => moveTo(tab, box.id, i));
      return node;
    }

    function noteBox(box, tab) {
      const anyOpen = box.notes.some((n) => !n.folded);
      const head = h('div', { class: 'cs-nhead' },
        h('button', { type: 'button', class: 'cs-nfold', 'aria-expanded': String(anyOpen), 'aria-label': anyOpen ? 'Fold all' : 'Unfold all',
          onclick: () => { box.notes.forEach((n) => { n.folded = anyOpen; }); redraw(); } }, icon('chevron', 'cs-ic sm')),
        h('input', { class: 'cs-ntitle', value: box.title, 'aria-label': 'Box title', spellcheck: false,
          oninput: (ev) => { box.title = ev.target.value; commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } }),
        h('button', { type: 'button', class: 'cs-ndel', title: 'Remove box', 'aria-label': `Remove ${box.title || 'box'}`,
          onclick: () => change(`Removed ${box.title || 'box'}`, () => { tab.boxes = tab.boxes.filter((b) => b.id !== box.id); }) },
        icon('close', 'cs-ic xs')));
      const add = h('button', { type: 'button', class: 'cs-nadd', onclick: () => {
        const n = S.newNote();
        focusNote = n.id;
        change(null, () => { box.notes.push(n); });
      } }, '+ Note');
      const node = h('div', { class: 'cs-nbox' }, head, h('div', { class: 'cs-nlist' }, box.notes.map((n, i) => note(n, i, box, tab)), add));
      dropTarget(node, () => moveTo(tab, box.id, null));
      return node;
    }

    function render() {
      const count = (t) => t.boxes.reduce((sum, b) => sum + b.notes.length, 0);
      const { cur, strip } = ui.tabStrip('tabs', 'tab', () => S.newTab(''), count, 'New tab');
      const boxes = cur ? h('div', { class: 'cs-nboxes', role: 'tabpanel' },
        cur.boxes.map((b) => noteBox(b, cur)),
        h('button', { type: 'button', class: 'cs-nadd cs-addbox', onclick: () => change(null, () => { cur.boxes.push(S.newNoteBox()); }) }, '+ Box')) : null;
      if (focusNote) {
        const id = focusNote;
        focusNote = null;
        setTimeout(() => { const t = document.querySelector(`[data-note="${id}"] textarea`); if (t) t.focus(); }, 0);
      }
      return h('section', { class: 'cs-notes' }, strip, boxes);
    }
    return { render };
  };
})();
