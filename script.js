const dbName = "artRecordDB";
let db;
let editId = null; // ← 編集中のIDを保持

// --- IndexedDB 初期化 ---
const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(dbName, 1);
  req.onupgradeneeded = e => e.target.result.createObjectStore("images");
  req.onsuccess = e => { db = e.target.result; resolve(db); };
  req.onerror = reject;
});

const saveImage = async (id, file) => {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const s = 400 / Math.max(bmp.width, bmp.height);
  c.width = bmp.width * s;
  c.height = bmp.height * s;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const data = c.toDataURL("image/jpeg", 0.8);
  const tx = db.transaction("images", "readwrite");
  tx.objectStore("images").put(data, id);
  return new Promise(r => tx.oncomplete = r);
};

const getImage = id => new Promise(r => {
  const tx = db.transaction("images");
  const req = tx.objectStore("images").get(id);
  req.onsuccess = () => r(req.result);
  req.onerror = () => r(null);
});

const deleteImage = id => new Promise(r => {
  const tx = db.transaction("images", "readwrite");
  tx.objectStore("images").delete(id);
  tx.oncomplete = r;
});

// --- ローカルデータ管理 ---
let data = JSON.parse(localStorage.getItem("artTools") || "[]");
const saveData = () => localStorage.setItem("artTools", JSON.stringify(data));

// --- UI更新 ---
const listEl = document.getElementById("list");

const render = async (filter = "") => {
  listEl.innerHTML = "";
  const shownIds = new Set();
  const keyword = filter.trim().toLowerCase();

  for (const item of data) {
    if (shownIds.has(item.id)) continue;

    const text = [item.name, item.note, ...(item.tags || [])].join(" ").toLowerCase();
    if (keyword && !text.includes(keyword)) continue;

    shownIds.add(item.id);
    const div = document.createElement("div");
    div.className = "item";

    const img = item.imageId ? await getImage(item.imageId) : null;
    div.innerHTML = `
      ${img ? `<img src="${img}" class="thumb">` : ""}
      <h3>${item.name}</h3>
      <p>カテゴリ：${item.category || "未設定"}</p>
      <div>${item.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join("")}</div>
      <p>${item.note || ""}</p>
      <div style="margin-top:auto;display:flex;gap:0.5em;">
        <button class="small" onclick="editItem('${item.id}')">編集</button>
        <button class="small" onclick="removeItem('${item.id}')">削除</button>
        <button class="small" onclick="downloadItem('${item.id}')">個別保存</button>
      </div>
    `;
    listEl.appendChild(div);
  }

  // タグクリックで検索
  document.querySelectorAll(".tag").forEach(tag =>
    tag.onclick = () => {
      document.getElementById("search").value = tag.dataset.tag;
      render(tag.dataset.tag);
    }
  );
};

// --- 編集機能 ---
window.editItem = async function(id) {
  const item = data.find(x => x.id === id);
  if (!item) return;

  editId = id; // 編集モードON

  // フォームに値を反映
  document.getElementById("name").value = item.name;
  document.getElementById("category").value = item.category;
  document.getElementById("tags").value = item.tags.join(", ");
  document.getElementById("note").value = item.note;

  const addBtn = document.getElementById("add");
  addBtn.textContent = "更新";
  if (item.imageId) {
  const imgData = await getImage(item.imageId);
  if (imgData) {
    previewEl.src = imgData;
    previewEl.style.display = "block";
  }
} else {
  resetPreview();
}

  addBtn.style.background = "#f59e0b"; // オレンジ色で「編集中」強調
};

// --- 更新処理 ---
async function updateItem() {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("画材名を入力してください");

  const item = data.find(x => x.id === editId);
  if (!item) return;

  item.name = name;
  item.category = document.getElementById("category").value;
  item.tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean);
  item.note = document.getElementById("note").value;

  const file = document.getElementById("image").files[0];
  if (file) {
    if (item.imageId) await deleteImage(item.imageId);
    item.imageId = crypto.randomUUID();
    await saveImage(item.imageId, file);
  }

  saveData();
  editId = null;
  render();
  resetForm();
}

// --- 新規追加 ---
async function addItem() {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("画材名を入力してください");

  const item = {
    id: crypto.randomUUID(),
    name,
    category: document.getElementById("category").value,
    tags: document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean),
    note: document.getElementById("note").value,
    imageId: null
  };

  const file = document.getElementById("image").files[0];
  if (file) {
    item.imageId = crypto.randomUUID();
    await saveImage(item.imageId, file);
  }

  data.push(item);
  saveData();
  render();
  resetForm();
}

// --- 入力フォームをリセット ---
function resetForm() {
  document.querySelectorAll("#formSection input, #formSection textarea").forEach(el => el.value = "");
  document.getElementById("add").textContent = "追加";
  document.getElementById("add").style.background = "var(--accent)";
  document.getElementById("category").value = "";
  resetPreview();

}

// --- 削除 ---
window.removeItem = async function(id) {
  const i = data.findIndex(x => x.id === id);
  if (i >= 0) {
    if (data[i].imageId) await deleteImage(data[i].imageId);
    data.splice(i, 1);
    saveData();
    render();
  }
};

// --- 個別保存 ---
window.downloadItem = async function(id) {
  const item = data.find(x => x.id === id);
  const json = { ...item };
  json.image = item.imageId ? await getImage(item.imageId) : null;
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${item.name}.json`;
  a.click();
};

// --- 全削除 ---
async function clearAll() {
  if (!confirm("すべて削除しますか？")) return;
  for (const i of data) if (i.imageId) await deleteImage(i.imageId);
  data = [];
  saveData();
  render();
}

// --- 検索 ---
document.getElementById("search").oninput = e => render(e.target.value);

// --- エクスポート ---
async function exportData() {
  const all = [];
  for (const i of data) all.push({ ...i, image: i.imageId ? await getImage(i.imageId) : null });
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "art-record-export.json";
  a.click();
}

// --- インポート ---
async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const arr = JSON.parse(await file.text());
  for (const item of arr) {
    if (item.image) {
      item.imageId = crypto.randomUUID();
      await new Promise(r => {
        const tx = db.transaction("images","readwrite");
        tx.objectStore("images").put(item.image,item.imageId);
        tx.oncomplete = r;
      });
      delete item.image;
    }
    data.push(item);
  }
  saveData();
  render();
  alert("インポート完了！");
}
// --- 画像プレビュー表示 ---
const imageInput = document.getElementById("image");
const previewEl = document.getElementById("preview");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      previewEl.src = e.target.result;
      previewEl.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    previewEl.style.display = "none";
  }
});

// --- プレビューをリセット ---
function resetPreview() {
  previewEl.src = "";
  previewEl.style.display = "none";
}
// --- 起動処理 ---
openDB().then(() => {
  render();
  const addBtn = document.getElementById("add");
  addBtn.onclick = () => editId ? updateItem() : addItem();
  document.getElementById("clear").onclick = clearAll;
  document.getElementById("export").onclick = exportData;
  document.getElementById("import").onclick = () =>
    document.getElementById("importFile").click();
  document.getElementById("importFile").onchange = importData;
});
