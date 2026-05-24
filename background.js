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

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ blockedDomains: [], unblockPaths: [], enabled: true }, resolve);
  });
}

function shouldBlock(tabUrl, blockedDomains, unblockPaths) {
  if (!tabUrl) return false;
  if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("chrome-extension://") || tabUrl.startsWith("about:") || tabUrl.startsWith(BLOCKED_PAGE)) return false;

  const host = getHostname(tabUrl);
  const fullPath = getPathname(tabUrl);

  const domainBlocked = blockedDomains.some(d => {
    const nd = normalize(d);
    return host === nd || host.endsWith("." + nd);
  });

  if (!domainBlocked) return false;

  const pathUnblocked = unblockPaths.some(p => {
    const np = normalize(p);
    return fullPath === np || fullPath.startsWith(np + "/") || fullPath.startsWith(np + "?");
  });

  return !pathUnblocked;
}

async function checkTab(tabId, url) {
  const { blockedDomains, unblockPaths, enabled } = await getSettings();
  if (!enabled) return;
  if (shouldBlock(url, blockedDomains, unblockPaths)) {
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

  if (msg.action === "closeTab") {
    chrome.tabs.remove(tabId);
  } else if (msg.action === "newTab") {
    chrome.tabs.update(tabId, { url: "chrome://newtab/" });
  }
});
