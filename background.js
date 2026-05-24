const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

function getHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

function getPathname(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "").toLowerCase() + u.pathname).replace(/\/$/, "");
  } catch { return ""; }
}

function normalize(str) {
  return str.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase().trim();
}

function migrateItem(item) {
  if (typeof item === "string") return { url: item, enabled: true };
  return item;
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { blockedDomains: [], unblockPaths: [], enabled: true, mode: "selective" },
      (data) => resolve({
        blockedDomains: data.blockedDomains.map(migrateItem),
        unblockPaths:   data.unblockPaths.map(migrateItem),
        enabled: data.enabled,
        mode:    data.mode || "selective",
      })
    );
  });
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
  if (!tabUrl) return false;
  if (
    tabUrl.startsWith("chrome://") ||
    tabUrl.startsWith("chrome-extension://") ||
    tabUrl.startsWith("about:") ||
    tabUrl.startsWith(BLOCKED_PAGE)
  ) return false;

  const host     = getHostname(tabUrl);
  const fullPath = getPathname(tabUrl);

  if (mode === "lockdown") {
    // Block everything unless the path is explicitly allowed
    return !isPathAllowed(fullPath, unblockPaths);
  }

  // selective mode: block only listed domains, allow exceptions
  const domainBlocked = blockedDomains
    .filter(d => d.enabled)
    .some(d => {
      const nd = normalize(d.url);
      return host === nd || host.endsWith("." + nd);
    });

  if (!domainBlocked) return false;
  return !isPathAllowed(fullPath, unblockPaths);
}

async function checkTab(tabId, url) {
  const settings = await getSettings();
  if (!settings.enabled) return;
  if (shouldBlock(url, settings)) {
    const dest = BLOCKED_PAGE + "?url=" + encodeURIComponent(url);
    chrome.tabs.update(tabId, { url: dest });
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  await checkTab(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    await checkTab(tabId, tab.url);
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;
  if (msg.action === "closeTab") chrome.tabs.remove(tabId);
  else if (msg.action === "newTab") chrome.tabs.update(tabId, { url: "chrome://newtab/" });
});
