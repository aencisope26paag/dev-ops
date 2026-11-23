const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestions');
const content = document.getElementById('content');

let allChamps = [];

// Tipos de estadísticas que tienen icono real en la carpeta /icons/
const VALID_ICONS = new Set(['ad', 'ap', 'armor', 'mr', 'hp', 'heal', 'shield', 'mana', 'lethality', 'as', 'onhit']);

function normalizeText(str) {
  return str.toLowerCase().replace(/['.\-\s]/g, '');
}

function formatNumberList(values, suffix = '') {
  if (!values || values.length === 0) return '';
  const rounded = values.map(v => {
    const num = parseFloat(v);
    if (isNaN(num)) return v;
    return Math.round(num * 10) / 10;
  });

  const unique = [...new Set(rounded)];
  if (unique.length === 1) return `${unique[0]}${suffix}`;

  if (rounded.length >= 10) {
    return `${rounded[0]} - ${rounded[rounded.length - 1]}${suffix} <span style="color:#a09b8c; font-weight:normal; font-size:0.82rem;">(niv. 1-18)</span>`;
  }

  return `${rounded.join(' / ')}${suffix}`;
}

async function init() {
  try {
    const cRes = await fetch('/api/list');
    if (!cRes.ok) throw new Error('Error al obtener la lista');
    const cData = await cRes.json();

    allChamps = Object.values(cData.data).sort((a, b) => a.name.localeCompare(b.name));
    
    searchInput.disabled = false;
    searchInput.placeholder = `Buscar campeón (ej. Aatrox, Soraka, Ezreal, Tahm Kench)...`;
    
    loadChampion(allChamps.find(c => c.id === 'Aatrox') || allChamps[0]);
  } catch (e) {
    content.innerHTML = `<p style="color:#e74c3c;">Error cargando la lista: ${e.message}</p>`;
  }
}

searchInput.addEventListener('input', () => {
  const query = normalizeText(searchInput.value);
  suggestionsBox.innerHTML = '';

  if (!query) {
    suggestionsBox.style.display = 'none';
    return;
  }

  const matches = allChamps.filter(c => normalizeText(c.name).includes(query));
  if (matches.length === 0) {
    suggestionsBox.style.display = 'none';
    return;
  }

  matches.forEach(champ => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `<img src="${champ.icon}" alt=""><span>${champ.name}</span>`;
    div.onclick = () => selectChampion(champ);
    suggestionsBox.appendChild(div);
  });

  suggestionsBox.style.display = 'block';
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = normalizeText(searchInput.value);
    const firstMatch = allChamps.find(c => normalizeText(c.name).includes(query));
    if (firstMatch) selectChampion(firstMatch);
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) suggestionsBox.style.display = 'none';
});

function selectChampion(champ) {
  searchInput.value = '';
  suggestionsBox.style.display = 'none';
  loadChampion(champ);
}

async function loadChampion(champObj) {
  content.innerHTML = '<p style="color:#a09b8c;">Cargando datos de habilidades...</p>';
  try {
    const res = await fetch(`/api/${champObj.id}_${champObj.numId}`);
    if (!res.ok) throw new Error('No se pudo descargar el campeón');
    const champ = await res.json();
    render(champ, champObj.icon);
  } catch (e) {
    content.innerHTML = `<p style="color:#e74c3c;">Error: ${e.message}</p>`;
  }
}

function getStatType(text) {
  const u = text.toLowerCase();
  if (u.includes('ap') || u.includes('magic damage')) return 'ap';
  if (u.includes('ad') || u.includes('physical damage')) return 'ad';
  if (u.includes('heal')) return 'heal';
  if (u.includes('shield')) return 'shield';
  if (u.includes('mana')) return 'mana';
  if (u.includes('on-hit')) return 'onhit';
  if (u.includes('health') || u.includes('hp')) return 'hp';
  if (u.includes('armor')) return 'armor';
  if (u.includes('magic resistance') || u.includes('mr')) return 'mr';
  if (u.includes('lethality') || u.includes('penetration')) return 'lethality';
  if (u.includes('attack speed') || u.includes('movement speed')) return 'as';
  return 'base';
}

function formatChip(text, type) {
  const iconHtml = VALID_ICONS.has(type)
    ? `<img src="/icons/${type}.png" class="stat-icon" alt="" onerror="this.style.display='none'">`
    : '';
  return `<span class="stat-chip ${type}">${iconHtml}${text}</span>`;
}

function highlightDescription(text) {
  if (!text) return '';

  text = text.replace(/(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)*%\s*(?:of\s+(?:his|her|their|the\s+target's)\s+)?(?:bonus\s+|total\s+|maximum\s+|missing\s+)?)(AP|AD|health|mana|armor|magic resistance|lethality|attack speed)/gi, (match, prefix, stat) => {
    const type = getStatType(stat);
    return formatChip(match, type);
  });

  text = text.replace(/\b(bonus\s+)?magic damage\b/gi, (m) => `<strong class="ap">${m}</strong>`);
  text = text.replace(/\b(bonus\s+)?physical damage\b/gi, (m) => `<strong class="ad">${m}</strong>`);
  text = text.replace(/\btrue damage\b/gi, (m) => `<strong class="true">${m}</strong>`);
  text = text.replace(/\bon-hit\b/gi, (m) => formatChip(m, 'onhit'));
  text = text.replace(/\b(heal|heals|healing|health restore)\b/gi, (m) => formatChip(m, 'heal'));
  text = text.replace(/\b(shield|shields|shielding)\b/gi, (m) => formatChip(m, 'shield'));
  text = text.replace(/\b(mana|mana restore)\b/gi, (m) => formatChip(m, 'mana'));
  text = text.replace(/(?<!<[^>]*)\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+%?)(?![^<]*>)/g, (m) => `<strong class="base">${m}</strong>`);

  return text;
}

function render(champ, reliableIcon) {
  let html = `
    <div class="champ-header">
      <img src="${reliableIcon}" alt="${champ.name}">
      <div>
        <h2>${champ.name}</h2>
        <span>${champ.title}</span>
      </div>
    </div>
  `;

  ['P', 'Q', 'W', 'E', 'R'].forEach(key => {
    const list = champ.abilities[key];
    if (!list) return;

    list.forEach(spell => {
      const cdText = spell.cooldown ? formatNumberList(spell.cooldown.modifiers[0].values, 's') : 'Pasiva';
      const costText = spell.cost ? formatNumberList(spell.cost.modifiers[0].values) : '';

      let formulas = [];
      let descriptions = [];

      spell.effects.forEach(eff => {
        if (eff.description) {
          descriptions.push(`<p class="desc">${highlightDescription(eff.description)}</p>`);
        }
        eff.leveling.forEach(lvl => {
          const parts = lvl.modifiers.map((m, idx) => {
            const unit = m.units[0] || '';
            const formattedVals = formatNumberList(m.values, unit);
            const type = getStatType(unit || lvl.attribute);
            const chip = formatChip(formattedVals, type);
            return idx === 0 ? chip : `(+ ${chip})`;
          }).join(' ');

          formulas.push(`
            <div class="formula-line">
              <span class="formula-label">${lvl.attribute}:</span> ${parts}
            </div>
          `);
        });
      });

      const formulasBlock = formulas.length > 0
        ? `<div class="shift-formulas">${formulas.join('')}</div>`
        : '';

      html += `
        <div class="tooltip-card">
          <div class="tooltip-top">
            <div class="spell-id-group">
              <div class="spell-icon-wrap">
                <img src="${spell.icon}" alt="" onerror="this.style.display='none'">
                <span class="key-badge">${key}</span>
              </div>
              <div>
                <span class="spell-name">${spell.name}</span>
                <div class="spell-meta">
                  <span>Enfriamiento: <strong>${cdText}</strong></span>
                  ${costText ? `<span>Coste: <strong>${costText}</strong></span>` : ''}
                </div>
              </div>
            </div>
          </div>
          ${formulasBlock}
          ${descriptions.join('')}
        </div>
      `;
    });
  });

  content.innerHTML = html;
}

init();