// app.js — Leonida Ledger: checklist, filters, spoiler setting, roadmap,
// missables and the per-trophy guide pane. Loads app/data/trophies.json
// with fetch (a file under app/, so the app stays fully offline).
(function () {
  'use strict';

  var DATA_URL = 'data/trophies.json';
  var KIND_LABELS = {
    story: 'Story',
    missable: 'Missable',
    collectibles: 'Collectibles',
    activities: 'Activities',
    crime: 'Crime & robbery',
    completion: '100% completion',
    misc: 'Other',
    platinum: 'Platinum'
  };

  var trophies = [];
  var earned = {};
  var settings = { spoilersHidden: true, selected: null };
  var view = 'checklist';

  var els = {};
  ['searchBox', 'gradeFilter', 'kindFilter', 'statusFilter', 'spoilerToggle',
   'exportBtn', 'importBtn', 'importFile', 'trophyList', 'listMeta', 'toolbar',
   'earnedCount', 'progressFill', 'progressSub', 'detailPane',
   'missableList'].forEach(function (id) { els[id] = document.getElementById(id); });

  function gradeRank(grade) {
    return { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 }[grade] || 4;
  }

  function sortedTrophies() {
    return trophies.slice().sort(function (a, b) {
      var g = gradeRank(a.grade) - gradeRank(b.grade);
      if (g !== 0) return g;
      return a.name.localeCompare(b.name);
    });
  }

  function isStory(t) { return t.kind === 'story'; }
  function isSpoiled(t) {
    return settings.spoilersHidden && isStory(t) && !earned[t.name];
  }

  function visibleTrophies() {
    var q = els.searchBox.value.trim().toLowerCase();
    var grade = els.gradeFilter.value;
    var kind = els.kindFilter.value;
    var status = els.statusFilter.value;
    return sortedTrophies().filter(function (t) {
      if (grade !== 'all' && t.grade !== grade) return false;
      if (kind === 'missable') { if (!t.missable) return false; }
      else if (kind !== 'all' && t.kind !== kind) return false;
      if (status === 'earned' && !earned[t.name]) return false;
      if (status === 'unearned' && earned[t.name]) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function renderProgress() {
    var count = trophies.filter(function (t) { return earned[t.name]; }).length;
    var total = trophies.length;
    els.earnedCount.textContent = String(count);
    els.progressFill.style.width = total ? (100 * count / total).toFixed(1) + '%' : '0%';
    var left = total - count;
    els.progressSub.textContent = count >= total
      ? 'Platinum earned — congratulations, Leonida Legend!'
      : 'Platinum: ' + left + ' of ' + total + ' to go';
  }

  function renderList() {
    var list = visibleTrophies();
    els.trophyList.innerHTML = '';
    var shown = list.length;
    els.listMeta.textContent = shown + ' of ' + trophies.length + ' trophies shown' +
      (settings.spoilersHidden ? ' · story spoilers hidden until earned' : ' · story spoilers shown');
    if (!shown) {
      var empty = el('li', 'empty-note', 'No trophies match these filters. Clear the search or widen a filter.');
      els.trophyList.appendChild(empty);
      return;
    }
    list.forEach(function (t) {
      var item = el('li', 'trophy' + (earned[t.name] ? ' earned' : '') +
        (settings.selected === t.name ? ' selected' : ''));
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!earned[t.name];
      box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
      box.addEventListener('click', function (ev) {
        ev.stopPropagation();
        setEarned(t.name, box.checked);
      });
      item.appendChild(box);

      var body = el('div');
      if (isSpoiled(t)) {
        body.appendChild(el('div', 'trophy-name', 'Hidden story trophy'));
        body.appendChild(el('div', 'trophy-desc spoiled',
          'A story trophy — its name and description stay hidden until you earn it. Turn off “Hide story spoilers” to reveal it early.'));
      } else {
        body.appendChild(el('div', 'trophy-name', t.name));
        body.appendChild(el('div', 'trophy-desc', t.description));
      }
      var tags = el('div', 'trophy-tags');
      tags.appendChild(el('span', 'tag grade-' + t.grade, t.grade));
      tags.appendChild(el('span', 'tag kind', KIND_LABELS[t.kind] || t.kind));
      if (t.hidden) tags.appendChild(el('span', 'tag hidden-t', 'Hidden on PSN'));
      if (t.missable) tags.appendChild(el('span', 'tag missable', 'Missable'));
      if (t.chapter) tags.appendChild(el('span', 'tag', 'Chapter ' + t.chapter));
      body.appendChild(tags);
      if (t.target && !isSpoiled(t)) {
        var target = el('div', 'trophy-target');
        target.innerHTML = '';
        target.appendChild(el('b', null, 'PSN target: '));
        target.appendChild(document.createTextNode('0/' + t.target.count + ' ' + t.target.unit));
        body.appendChild(target);
      }
      item.appendChild(body);

      var side = el('div');
      side.appendChild(el('span', 'tag', earned[t.name] ? 'Earned ✓' : 'Not earned'));
      item.appendChild(side);

      item.addEventListener('click', function () { selectTrophy(t.name); });
      els.trophyList.appendChild(item);
    });
  }

  function renderDetail() {
    var pane = els.detailPane;
    pane.innerHTML = '';
    var name = settings.selected;
    var t = trophies.find(function (x) { return x.name === name; });
    if (!t) {
      pane.appendChild(el('p', 'detail-empty',
        'Select a trophy to see its guide, sources and progress target.'));
      return;
    }
    if (isSpoiled(t)) {
      pane.appendChild(el('h2', null, 'Hidden story trophy'));
      pane.appendChild(el('p', 'detail-desc',
        'This story trophy is hidden while the spoiler setting is on. Earn it in the game — or turn off “Hide story spoilers” — to reveal its name, description and guide.'));
      var reveal = el('button', 'btn ghost', 'Reveal it anyway');
      reveal.addEventListener('click', function () {
        settings.spoilersHidden = false;
        els.spoilerToggle.checked = false;
        persistSettings();
        renderAll();
      });
      var actions = el('div', 'detail-actions');
      actions.appendChild(reveal);
      pane.appendChild(actions);
      return;
    }
    pane.appendChild(el('h2', null, t.name));
    var grades = el('div', 'detail-grade');
    grades.appendChild(el('span', 'tag grade-' + t.grade, t.grade));
    grades.appendChild(el('span', 'tag kind', KIND_LABELS[t.kind] || t.kind));
    if (t.hidden) grades.appendChild(el('span', 'tag hidden-t', 'Hidden on PSN'));
    if (t.missable) grades.appendChild(el('span', 'tag missable', 'Missable'));
    if (t.chapter) grades.appendChild(el('span', 'tag', 'Chapter ' + t.chapter));
    pane.appendChild(grades);
    pane.appendChild(el('p', 'detail-desc', '“' + t.description + '”'));
    if (t.target) {
      pane.appendChild(el('p', null, 'PSN tracks this one: 0/' + t.target.count + ' ' + t.target.unit + '.'));
    }
    if (t.missable) {
      pane.appendChild(el('div', 'missable-banner',
        'Potentially missable — read the warning in the guide before you play past Chapter 1.'));
    }
    if (/UNCONFIRMED/.test(t.guide)) {
      pane.appendChild(el('div', 'unconfirmed-banner',
        'Not yet confirmed: no guide had pinned down this trophy when this list was written (18 Nov 2026). The guide below says what is known and does not guess.'));
    }
    pane.appendChild(el('h3', null, 'How to earn it'));
    pane.appendChild(el('p', 'detail-guide', t.guide));
    pane.appendChild(el('h3', null, 'Sources'));
    var src = el('ul', 'detail-sources');
    t.sources.forEach(function (s) { src.appendChild(el('li', null, s)); });
    pane.appendChild(src);
    var acts = el('div', 'detail-actions');
    var toggle = el('button', 'btn', earned[t.name] ? 'Mark as not earned' : 'Mark as earned');
    toggle.addEventListener('click', function () { setEarned(t.name, !earned[t.name]); });
    acts.appendChild(toggle);
    pane.appendChild(acts);
  }

  function renderRoadmap() {
    document.querySelectorAll('.stage-trophies').forEach(function (node) {
      var stage = node.getAttribute('data-stage');
      var names;
      if (stage === 'story') {
        names = trophies.filter(function (t) { return t.kind === 'story'; });
        node.innerHTML = '<b>' + names.length + ' story trophies:</b> ' +
          names.map(function (t) { return t.name; }).join(' · ');
      } else if (stage === 'completion') {
        names = trophies.filter(function (t) {
          return t.kind === 'completion' || t.kind === 'collectibles' ||
            (t.kind === 'activities' && t.target);
        });
        node.innerHTML = '<b>' + names.length + ' trophies in this stage:</b> ' +
          names.map(function (t) { return t.name; }).join(' · ');
      } else {
        names = trophies.filter(function (t) {
          return (t.kind === 'activities' && !t.target) || t.kind === 'crime' || t.kind === 'misc';
        });
        node.innerHTML = '<b>' + names.length + ' trophies to finish here:</b> ' +
          names.map(function (t) { return t.name; }).join(' · ');
      }
    });
  }

  function renderMissables() {
    var box = els.missableList;
    box.innerHTML = '';
    trophies.filter(function (t) { return t.missable; }).forEach(function (t) {
      var card = el('div', 'missable-card');
      card.appendChild(el('h3', null, t.name + ' — ' + t.grade));
      card.appendChild(el('p', 'detail-desc', '“' + t.description + '”'));
      card.appendChild(el('p', null, t.guide));
      var toggle = el('button', 'btn', earned[t.name] ? 'Earned ✓ — mark as not earned' : 'Mark as earned');
      toggle.addEventListener('click', function () { setEarned(t.name, !earned[t.name]); });
      card.appendChild(toggle);
      box.appendChild(card);
    });
  }

  function setView(next) {
    view = next;
    document.querySelectorAll('.tab').forEach(function (tab) {
      var active = tab.getAttribute('data-view') === next;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    var showList = next === 'checklist';
    els.toolbar.style.display = showList ? '' : 'none';
    els.trophyList.style.display = showList ? '' : 'none';
    els.listMeta.style.display = showList ? '' : 'none';
    ['roadmap', 'missables', 'about'].forEach(function (v) {
      document.getElementById('view-' + v).hidden = next !== v;
    });
    if (next === 'missables') renderMissables();
  }

  function setEarned(name, value) {
    if (value) earned[name] = true; else delete earned[name];
    window.LeonidaStore.saveProgress(earned);
    renderAll();
  }

  function selectTrophy(name) {
    settings.selected = name;
    persistSettings();
    renderList();
    renderDetail();
  }

  function persistSettings() {
    window.LeonidaStore.saveSettings(settings);
  }

  function renderAll() {
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    if (view === 'missables') renderMissables();
  }

  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { setView(tab.getAttribute('data-view')); });
    });
    ['searchBox', 'gradeFilter', 'kindFilter', 'statusFilter'].forEach(function (id) {
      els[id].addEventListener('input', renderList);
      els[id].addEventListener('change', renderList);
    });
    els.spoilerToggle.addEventListener('change', function () {
      settings.spoilersHidden = els.spoilerToggle.checked;
      persistSettings();
      renderAll();
    });
    els.exportBtn.addEventListener('click', function () {
      window.LeonidaStore.exportFile(earned);
    });
    els.importBtn.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function () {
      var file = els.importFile.files && els.importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = window.LeonidaStore.parseImport(String(reader.result));
          var known = {};
          trophies.forEach(function (t) { known[t.name] = true; });
          var fresh = {};
          Object.keys(parsed.earned).forEach(function (name) {
            if (known[name]) fresh[name] = true;
          });
          earned = fresh;
          window.LeonidaStore.saveProgress(earned);
          renderAll();
          window.alert('Imported ' + Object.keys(fresh).length + ' earned trophies.');
        } catch (err) {
          window.alert('Import failed: ' + err.message);
        }
        els.importFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  function boot() {
    earned = window.LeonidaStore.loadProgress();
    settings = window.LeonidaStore.loadSettings();
    els.spoilerToggle.checked = settings.spoilersHidden;
    bindEvents();
    fetch(DATA_URL).then(function (res) {
      if (!res.ok) throw new Error('Could not load ' + DATA_URL);
      return res.json();
    }).then(function (data) {
      trophies = (data && data.trophies) || data || [];
      renderAll();
    }).catch(function (err) {
      els.trophyList.innerHTML = '';
      els.listMeta.textContent = 'Could not load the trophy list: ' + err.message;
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
