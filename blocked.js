const params = new URLSearchParams(location.search);
const url = params.get("url") || "";

document.getElementById("blocked-url").textContent = url;

try {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const siteName = hostname.split(".")[0];
  const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
  document.getElementById("site-name").textContent = displayName + " এ";
} catch {
  document.getElementById("site-name").textContent = "এখানে";
}

document.getElementById("close-tab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "closeTab" });
});

document.getElementById("new-tab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "newTab" });
});
