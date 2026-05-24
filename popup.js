// Each item: { url: string, enabled: boolean }
let blockedDomains = [];
let unblockPaths = [];
let enabled = true;

function normalize(val) {
  return val.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase().trim();
}

function save() {
  chrome.storage.sync.set({ blockedDomains, unblockPaths, enabled });
}

// Migrate legacy string arrays to object arrays
function migrateItem(item) {
  if (typeof item === "string") return { url: item, enabled: true };
  return item;
}

function renderList(listId, emptyId, items, dotClass, type) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.querySelectorAll(".url-item").forEach(el => el.remove());

  if (items.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    items.forEach((item, i) => {
      const isOn = item.enabled;
      const div = document.createElement("div");
      div.className = "url-item" + (isOn ? "" : " url-item-disabled");
      div.innerHTML = `
        <div class="url-dot ${dotClass}" style="opacity:${isOn ? 1 : 0.3}"></div>
        <span class="url-text" title="${item.url}" style="opacity:${isOn ? 1 : 0.4}">${item.url}</span>
        <label class="item-toggle" title="${isOn ? "Disable" : "Enable"}">
          <input type="checkbox" class="item-toggle-cb" data-list="${listId}" data-i="${i}" ${isOn ? "checked" : ""} />
          <span class="item-slider ${type === 'domain' ? 'item-slider-red' : 'item-slider-green'}"></span>
        </label>
        <button class="del-btn" data-list="${listId}" data-i="${i}" title="Remove">×</button>
      `;
      list.appendChild(div);
    });
  }
}

function renderStatus() {
  const bar = document.getElementById("status-bar");
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const label = document.getElementById("toggle-label");

  const activeBlocked = blockedDomains.filter(d => d.enabled).length;
  const activePaths = unblockPaths.filter(p => p.enabled).length;

  if (enabled) {
    bar.className = "status-bar status-on";
    dot.className = "status-dot sdot-on";
    text.textContent = `Blocking ${activeBlocked} domain(s) · ${activePaths} page(s) allowed`;
    label.textContent = "On";
  } else {
    bar.className = "status-bar status-off";
    dot.className = "status-dot sdot-off";
    text.textContent = "Paused — all URLs accessible";
    label.textContent = "Off";
  }
}

function render() {
  renderList("domain-list", "domain-empty", blockedDomains, "dot-red", "domain");
  renderList("path-list", "path-empty", unblockPaths, "dot-green", "path");
  renderStatus();
}

document.getElementById("domain-add-btn").addEventListener("click", () => {
  const input = document.getElementById("domain-input");
  const val = normalize(input.value);
  if (!val) return;
  const domainOnly = val.split("/")[0];
  if (!blockedDomains.some(d => d.url === domainOnly)) {
    blockedDomains.push({ url: domainOnly, enabled: true });
    save(); render();
  }
  input.value = "";
});

document.getElementById("path-add-btn").addEventListener("click", () => {
  const input = document.getElementById("path-input");
  const val = normalize(input.value);
  if (!val) return;
  if (!unblockPaths.some(p => p.url === val)) {
    unblockPaths.push({ url: val, enabled: true });
    save(); render();
  }
  input.value = "";
});

document.getElementById("domain-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("domain-add-btn").click();
});
document.getElementById("path-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("path-add-btn").click();
});

// Handle delete buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  const list = btn.dataset.list;
  if (list === "domain-list") blockedDomains.splice(i, 1);
  else unblockPaths.splice(i, 1);
  save(); render();
});

// Handle per-item toggle checkboxes
document.addEventListener("change", (e) => {
  const cb = e.target.closest(".item-toggle-cb");
  if (!cb) return;
  const i = parseInt(cb.dataset.i);
  const list = cb.dataset.list;
  if (list === "domain-list") blockedDomains[i].enabled = cb.checked;
  else unblockPaths[i].enabled = cb.checked;
  save(); render();
});

document.getElementById("enabled-toggle").addEventListener("change", (e) => {
  enabled = e.target.checked;
  save(); render();
});

chrome.storage.sync.get({ blockedDomains: [], unblockPaths: [], enabled: true }, (data) => {
  blockedDomains = data.blockedDomains.map(migrateItem);
  unblockPaths = data.unblockPaths.map(migrateItem);
  enabled = data.enabled;
  document.getElementById("enabled-toggle").checked = enabled;
  render();
});
