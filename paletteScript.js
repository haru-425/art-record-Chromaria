let palettes = [];

fetch('palettes.json')
  .then(res => res.json())
  .then(data => {
    palettes = data;
    renderPalettes(palettes);
  });

function renderPalettes(data) {
  const container = document.getElementById('palette-container');
  container.innerHTML = '';
  data.forEach(palette => {
    const card = document.createElement('div');
    card.className = 'palette-card';
    card.innerHTML = `
      <h2>${palette.name} <span class="author">by ${palette.author}</span></h2>
      <p class="description">${palette.description}</p>
      <div class="colors">
        ${palette.colors.map(c => `<div class="color-box" style="background:${c}" data-hex="${c}" onclick="copyColor('${c}')"></div>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById('search').addEventListener('input', e => {
  const keyword = e.target.value.toLowerCase();
  const filtered = palettes.filter(p =>
    p.name.toLowerCase().includes(keyword) ||
    p.author.toLowerCase().includes(keyword) ||
    p.description.toLowerCase().includes(keyword) ||
    p.colors.some(c => c.toLowerCase().includes(keyword))
  );
  renderPalettes(filtered);
});

function copyColor(hex) {
  navigator.clipboard.writeText(hex).then(() => {
    alert(`カラーコード ${hex} をコピーしました`);
  });
}