let blockedDomains = [];
let unblockPaths = [];
let enabled = true;
let mode = "selective";

function normalize(val) {
  return val.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase().trim();
}

function migrateItem(item) {
  return typeof item === "string" ? { url: item, enabled: true } : item;
}

function save() {
  chrome.storage.sync.set({ blockedDomains, unblockPaths, enabled, mode });
}

function buildItem(item, i, listId, type) {
  const isOn = item.enabled;
  const div = document.createElement("div");
  div.className = "url-item" + (isOn ? "" : " url-item-disabled");
  div.innerHTML = `
    <div class="url-dot dot-${type === "domain" ? "red" : "green"}" style="opacity:${isOn ? 1 : 0.3}"></div>
    <span class="url-text" title="${item.url}" style="opacity:${isOn ? 1 : 0.4}">${item.url}</span>
    <label class="item-toggle" title="${isOn ? "Disable" : "Enable"}">
      <input type="checkbox" class="item-toggle-cb" data-list="${listId}" data-i="${i}" ${isOn ? "checked" : ""} />
      <span class="item-slider item-slider-${type === "domain" ? "red" : "green"}"></span>
    </label>
    <button class="del-btn" data-list="${listId}" data-i="${i}" title="Remove">×</button>
  `;
  return div;
}

function renderList(listId, emptyId, items, type) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.querySelectorAll(".url-item").forEach(el => el.remove());
  if (items.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    items.forEach((item, i) => list.appendChild(buildItem(item, i, listId, type)));
  }
}

function renderMode() {
  const isLockdown = mode === "lockdown";
  document.body.classList.toggle("lockdown", isLockdown);
  document.getElementById("mode-selective").className = "mode-btn" + (isLockdown ? "" : " active-selective");
  document.getElementById("mode-lockdown").className = "mode-btn" + (isLockdown ? " active-lockdown" : "");
  document.getElementById("lockdown-banner").classList.toggle("show", isLockdown);
  document.getElementById("header-subtitle").textContent = isLockdown
    ? "Lockdown — only allowed pages reachable"
    : "Block domains, allow specific pages";
  document.getElementById("path-desc").textContent = isLockdown
    ? "Only these pages are accessible — everything else is blocked"
    : "These specific pages stay accessible";
  document.getElementById("arrow-hint").style.display = isLockdown ? "none" : "flex";
}

function renderStatus() {
  const bar = document.getElementById("status-bar");
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const label = document.getElementById("toggle-label");

  if (!enabled) {
    bar.className = "status-bar status-off";
    dot.className = "status-dot sdot-off";
    text.textContent = "Paused — all URLs accessible";
    label.textContent = "Off";
    return;
  }

  if (mode === "lockdown") {
    bar.className = "status-bar status-lock";
    dot.className = "status-dot sdot-lock";
    text.textContent = `Lockdown · ${unblockPaths.filter(p => p.enabled).length} page(s) allowed`;
    label.textContent = "On";
  } else {
    bar.className = "status-bar status-on";
    dot.className = "status-dot sdot-on";
    text.textContent = `Blocking ${blockedDomains.filter(d => d.enabled).length} domain(s) · ${unblockPaths.filter(p => p.enabled).length} page(s) allowed`;
    label.textContent = "On";
  }
}

function render() {
  renderList("domain-list", "domain-empty", blockedDomains, "domain");
  renderList("path-list", "path-empty", unblockPaths, "path");
  renderMode();
  renderStatus();
}

function addItem(inputId, list, transform) {
  const input = document.getElementById(inputId);
  const val = normalize(input.value);
  if (!val) return;
  const url = transform ? transform(val) : val;
  if (!list.some(d => d.url === url)) {
    list.push({ url, enabled: true });
    save();
    render();
  }
  input.value = "";
}

document.getElementById("mode-selective").addEventListener("click", () => { mode = "selective"; save(); render(); });
document.getElementById("mode-lockdown").addEventListener("click", () => { mode = "lockdown"; save(); render(); });

document.getElementById("domain-add-btn").addEventListener("click", () =>
  addItem("domain-input", blockedDomains, val => val.split("/")[0])
);
document.getElementById("path-add-btn").addEventListener("click", () =>
  addItem("path-input", unblockPaths, null)
);

document.getElementById("domain-input").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("domain-add-btn").click(); });
document.getElementById("path-input").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("path-add-btn").click(); });

document.getElementById("enabled-toggle").addEventListener("change", e => { enabled = e.target.checked; save(); render(); });

document.addEventListener("click", e => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  (btn.dataset.list === "domain-list" ? blockedDomains : unblockPaths).splice(i, 1);
  save();
  render();
});

document.addEventListener("change", e => {
  const cb = e.target.closest(".item-toggle-cb");
  if (!cb) return;
  const i = parseInt(cb.dataset.i);
  (cb.dataset.list === "domain-list" ? blockedDomains : unblockPaths)[i].enabled = cb.checked;
  save();
  render();
});

chrome.storage.sync.get({ blockedDomains: [], unblockPaths: [], enabled: true, mode: "selective" }, data => {
  blockedDomains = data.blockedDomains.map(migrateItem);
  unblockPaths = data.unblockPaths.map(migrateItem);
  enabled = data.enabled;
  mode = data.mode || "selective";
  document.getElementById("enabled-toggle").checked = enabled;
  render();
});
