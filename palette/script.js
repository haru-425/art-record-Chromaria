let sitePalettes = [];
let userPalettes = [];

// ローカルストレージから自作パレットを復元
const saved = localStorage.getItem('userPalettes');
if (saved) {
  try {
    userPalettes = JSON.parse(saved);
  } catch (e) {
    console.warn('保存されたパレットの読み込みに失敗しました');
  }
}

// 既存パレットを読み込み
fetch('palettes.json')
  .then(res => res.json())
  .then(data => {
    sitePalettes = data;
    renderAllPalettes();
  });

// 全体描画
function renderAllPalettes(keyword = '') {
  renderPalettes(sitePalettes, 'site-palettes', keyword, false);
  renderPalettes(userPalettes, 'user-palettes', keyword, true);
}

// パレット描画（共通）
function renderPalettes(data, containerId, keyword = '', isUser = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const sorted = [...data]
    .filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.author.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.colors.some(c => c.toLowerCase().includes(keyword))
    )
    .sort((a, b) => (b.favorite === true) - (a.favorite === true));

  sorted.forEach((palette, index) => {
    const card = document.createElement('div');
    card.className = 'palette-card';
    card.innerHTML = `
      <h2>${palette.name} <span class="author">by ${palette.author}</span></h2>
      <p class="description">${palette.description}</p>
      <div class="colors">
        ${palette.colors.map(c => `<div class="color-box" style="background:${c}" data-hex="${c}" onclick="copyColor('${c}')"></div>`).join('')}
      </div>
      ${isUser ? `
        <button onclick="exportSinglePalette(${index})">JSON保存</button>
        <button onclick="deleteUserPalette(${index})" style="background:#888;margin-left:0.5rem;">削除</button>
        <button onclick="toggleFavorite(${index})" style="background:${palette.favorite ? '#FFD700' : '#ccc'};margin-left:0.5rem;">
          ${palette.favorite ? '★ お気に入り' : '☆ お気に入り'}
        </button>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

// 検索イベント
document.getElementById('search').addEventListener('input', e => {
  const keyword = e.target.value.toLowerCase();
  renderAllPalettes(keyword);
});

// カラーコードコピー
function copyColor(hex) {
  navigator.clipboard.writeText(hex).then(() => {
    alert(`カラーコード ${hex} をコピーしました`);
  });
}

// JSON保存（自作パレット）
function exportSinglePalette(index) {
  const palette = userPalettes[index];
  const json = JSON.stringify(palette, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${palette.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 削除（自作パレット）
function deleteUserPalette(index) {
  if (confirm('このパレットを削除しますか？')) {
    userPalettes.splice(index, 1);
    localStorage.setItem('userPalettes', JSON.stringify(userPalettes));
    renderAllPalettes();
  }
}

// お気に入りトグル
function toggleFavorite(index) {
  userPalettes[index].favorite = !userPalettes[index].favorite;
  localStorage.setItem('userPalettes', JSON.stringify(userPalettes));
  renderAllPalettes();
}

// パレット作成フォーム送信
document.getElementById('create-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const author = document.getElementById('new-author').value.trim();
  const description = document.getElementById('new-description').value.trim();

  const colorInputs = ['color1', 'color2', 'color3', 'color4', 'color5'];
  const colors = colorInputs
    .map(id => document.getElementById(id).value.trim())
    .filter(c => /^#([0-9A-Fa-f]{3}){1,2}$/.test(c));

  if (!name || !author || !description || colors.length === 0) {
    alert('すべての項目を正しく入力してください（色は1色以上）');
    return;
  }

  const newPalette = { name, author, description, colors, favorite: false };
  userPalettes.push(newPalette);
  localStorage.setItem('userPalettes', JSON.stringify(userPalettes));
  renderAllPalettes();
  e.target.reset();

  // 入力欄とピッカーを初期化
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`picker${i}`).value = '#000000';
    document.getElementById(`color${i}`).value = '#000000';
  }
});

// ピッカーとテキスト入力の同期
for (let i = 1; i <= 5; i++) {
  const picker = document.getElementById(`picker${i}`);
  const input = document.getElementById(`color${i}`);

  picker.addEventListener('input', () => {
    input.value = picker.value;
  });

  input.addEventListener('input', () => {
    if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(input.value)) {
      picker.value = input.value;
    }
  });
}