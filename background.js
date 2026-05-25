const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

function normalize(str) {
  return str.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase().trim();
}

function migrateItem(item) {
  return typeof item === "string" ? { url: item, enabled: true } : item;
}

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

function getFullPath(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "").toLowerCase() + u.pathname).replace(/\/$/, "");
  } catch { return ""; }
}

function isSystemUrl(url) {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith(BLOCKED_PAGE)
  );
}

function isPathAllowed(fullPath, unblockPaths) {
  return unblockPaths
    .filter(p => p.enabled)
    .some(p => {
      const np = normalize(p.url);
      return fullPath === np || fullPath.startsWith(np + "/") || fullPath.startsWith(np + "?");
    });
}

function shouldBlock(tabUrl, { blockedDomains, unblockPaths, mode }) {
  if (!tabUrl || isSystemUrl(tabUrl)) return false;

  const fullPath = getFullPath(tabUrl);

  if (mode === "lockdown") return !isPathAllowed(fullPath, unblockPaths);

  const host = getHostname(tabUrl);
  const isDomainBlocked = blockedDomains
    .filter(d => d.enabled)
    .some(d => {
      const nd = normalize(d.url);
      return host === nd || host.endsWith("." + nd);
    });

  return isDomainBlocked && !isPathAllowed(fullPath, unblockPaths);
}

async function getSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get(
      { blockedDomains: [], unblockPaths: [], enabled: true, mode: "selective" },
      data => resolve({
        blockedDomains: data.blockedDomains.map(migrateItem),
        unblockPaths: data.unblockPaths.map(migrateItem),
        enabled: data.enabled,
        mode: data.mode || "selective",
      })
    )
  );
}

async function checkTab(tabId, url) {
  const settings = await getSettings();
  if (!settings.enabled) return;
  if (shouldBlock(url, settings)) {
    chrome.tabs.update(tabId, { url: BLOCKED_PAGE + "?url=" + encodeURIComponent(url) });
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId === 0) checkTab(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) checkTab(tabId, tab.url);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;
  if (msg.action === "closeTab") chrome.tabs.remove(tabId);
  else if (msg.action === "newTab") chrome.tabs.update(tabId, { url: "chrome://newtab/" });
});
