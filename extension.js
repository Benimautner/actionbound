async function load() {
    chrome.runtime.sendMessage({ request: "request_csv" });
    const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    const response = await chrome.tabs.sendMessage(tab.id, { request: "request_csv" });
}
console.log("extension.js loaded");

document.getElementById("loadbutton").addEventListener("click", load);



chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  let res = msg;
  if (res.status === "error") {
    let html = "";
    
    document.getElementById("iframecount").innerHTML = "Ein Fehler ist aufgtreten, bitte versuche es noch einmal: \n" + String(res.error);
  } else if (res.status === "success") {
    var link = document.createElement("a");
    link.textContent = "Als XLSX Speichern";
    link.href = "#";
    document.getElementById("iframecount").innerHTML = "";
    link.onclick = function () {

      writeXlsxFile(res.data, {
        fileName: res.filename
      })
    }
    document.getElementById("iframecount").appendChild(link);
  } else if (res.status === "progress") {
    document.getElementById("iframecount").innerHTML = res.current + "/" + res.total + " Seiten geladen";
  }
});
