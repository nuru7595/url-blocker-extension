const params = new URLSearchParams(location.search);
const url = params.get("url") || "";

document.getElementById("blocked-url").textContent = url;

let blockedHostname = "";
let displayName = "";

try {
  blockedHostname = new URL(url).hostname.replace(/^www\./, "");
  const siteName = blockedHostname.split(".")[0];
  displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
  document.getElementById("site-name").textContent = displayName + " এ";
} catch {
  document.getElementById("site-name").textContent = "এখানে";
}

function normalizeUrl(p) {
  return p.replace(/^https?:\/\/(www\.)?/, "").toLowerCase();
}

function buildLink(p) {
  const norm = normalizeUrl(p);
  const href = "https://" + norm;
  const parts = norm.split("/");
  const section = parts.slice(1).join("/") || parts[0];
  const label = section
    ? section.charAt(0).toUpperCase() + section.slice(1).replace(/\//g, " › ")
    : norm;

  const a = document.createElement("a");
  a.href = href;
  a.className = "allowed-link";
  a.target = "_self";
  a.innerHTML = `<span class="link-icon">→</span><span class="link-label">${label}</span><span class="link-url">${norm}</span>`;
  return a;
}

function renderAllowedLinks(paths) {
  const linksDiv = document.createElement("div");
  linksDiv.className = "allowed-links";

  const sectionNames = paths.map((p) => {
    const parts = normalizeUrl(p).split("/");
    const section = parts.slice(1).join("/");
    return section
      ? section.charAt(0).toUpperCase() + section.slice(1)
      : displayName;
  });

  const lastName = sectionNames.pop();
  const headingText =
    sectionNames.length > 0
      ? `আপনি শুধু ${displayName} এর ${sectionNames.join(", ")} আর ${lastName} দেখতে পারবেন, অন্য কিছু না 🥱`
      : `আপনি শুধু ${displayName} এর ${lastName} দেখতে পারবেন, অন্য কিছু না`;

  const heading = document.createElement("div");
  heading.className = "allowed-heading";
  heading.textContent = headingText;
  linksDiv.appendChild(heading);

  paths.forEach((p) => linksDiv.appendChild(buildLink(p)));

  document.querySelector(".buttons").before(linksDiv);
}

chrome.storage.sync.get({ unblockPaths: [] }, (data) => {
  const relatedPaths = data.unblockPaths
    .filter((p) => (typeof p === "string" ? true : p.enabled))
    .map((p) => (typeof p === "string" ? p : p.url))
    .filter((p) => {
      const norm = normalizeUrl(p);
      return norm === blockedHostname || norm.startsWith(blockedHostname + "/");
    });

  if (relatedPaths.length > 0) renderAllowedLinks(relatedPaths);
});

document
  .getElementById("close-tab")
  .addEventListener("click", () =>
    chrome.runtime.sendMessage({ action: "closeTab" }),
  );
document
  .getElementById("new-tab")
  .addEventListener("click", () =>
    chrome.runtime.sendMessage({ action: "newTab" }),
  );
