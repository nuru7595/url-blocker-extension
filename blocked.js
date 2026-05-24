const params = new URLSearchParams(location.search);
document.getElementById("blocked-url").textContent = params.get("url") || "Unknown URL";

document.getElementById("close-tab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "closeTab" });
});

document.getElementById("new-tab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "newTab" });
});
