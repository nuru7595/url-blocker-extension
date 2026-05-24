let blockedDomains = [];
let unblockPaths = [];
let enabled = true;

function normalize(val) {
  return val.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase().trim();
}

function save() {
  chrome.storage.sync.set({ blockedDomains, unblockPaths, enabled });
}

function renderList(listId, emptyId, items, dotClass) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.querySelectorAll(".url-item").forEach(el => el.remove());

  if (items.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    items.forEach((url, i) => {
      const item = document.createElement("div");
      item.className = "url-item";
      item.innerHTML = `
        <div class="url-dot ${dotClass}"></div>
        <span class="url-text" title="${url}">${url}</span>
        <button class="del-btn" data-list="${listId}" data-i="${i}" title="Remove">×</button>
      `;
      list.appendChild(item);
    });
  }
}

function renderStatus() {
  const bar = document.getElementById("status-bar");
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  const label = document.getElementById("toggle-label");

  if (enabled) {
    bar.className = "status-bar status-on";
    dot.className = "status-dot sdot-on";
    text.textContent = `Blocking ${blockedDomains.length} domain(s) · ${unblockPaths.length} page(s) allowed`;
    label.textContent = "On";
  } else {
    bar.className = "status-bar status-off";
    dot.className = "status-dot sdot-off";
    text.textContent = "Paused — all URLs accessible";
    label.textContent = "Off";
  }
}

function render() {
  renderList("domain-list", "domain-empty", blockedDomains, "dot-red");
  renderList("path-list", "path-empty", unblockPaths, "dot-green");
  renderStatus();
}

document.getElementById("domain-add-btn").addEventListener("click", () => {
  const input = document.getElementById("domain-input");
  const val = normalize(input.value);
  if (!val) return;
  // For domain, strip any path
  const domainOnly = val.split("/")[0];
  if (!blockedDomains.includes(domainOnly)) {
    blockedDomains.push(domainOnly);
    save(); render();
  }
  input.value = "";
});

document.getElementById("path-add-btn").addEventListener("click", () => {
  const input = document.getElementById("path-input");
  const val = normalize(input.value);
  if (!val) return;
  if (!unblockPaths.includes(val)) {
    unblockPaths.push(val);
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

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  const list = btn.dataset.list;
  if (list === "domain-list") blockedDomains.splice(i, 1);
  else unblockPaths.splice(i, 1);
  save(); render();
});

document.getElementById("enabled-toggle").addEventListener("change", (e) => {
  enabled = e.target.checked;
  save(); render();
});

chrome.storage.sync.get({ blockedDomains: [], unblockPaths: [], enabled: true }, (data) => {
  blockedDomains = data.blockedDomains;
  unblockPaths = data.unblockPaths;
  enabled = data.enabled;
  document.getElementById("enabled-toggle").checked = enabled;
  render();
});
