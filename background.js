// Utility function to calculate the current week number
function getCurrentWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
  return Math.ceil(days / 7);
}

function updateIcon(color) {
  try {
    const today = new Date();
    const weekNumber = getCurrentWeekNumber(today); // Use the utility function

    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext("2d");

    /*// Draw background
    ctx.fillStyle = "lightgrey";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.fill(); */

    // Draw text (week number)
    ctx.fillStyle = color;
    ctx.font = "bold 100px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${weekNumber}`, canvas.width / 2, canvas.height / 2);

    // Convert to Blob, then to Data URL
    canvas.convertToBlob({ type: "image/png" }).then((blob) => {
      const reader = new FileReader();
      reader.onloadend = function () {
        const dataUrl = reader.result;
        chrome.action.setIcon({ path: { 48: dataUrl } }, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        });
      };
      reader.readAsDataURL(blob);
    });

    chrome.action.setTitle({ title: `Week Number : ${weekNumber}` });
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

chrome.runtime.onStartup.addListener(function () {
  chrome.storage.sync.get(["iconColor"], function (items) {
    updateIcon(items.iconColor);
  });
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.get(["iconColor"], function (items) {
    updateIcon(items.iconColor);
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "updateIcon") {
    updateIcon(message.color);
  }
});
