// Utility function to calculate the current week number
function getCurrentWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7; // Make Sunday = 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum); // Nearest Thursday
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

function updateIcon(color) {
  try {
    const today = new Date();
    const weekNumber = getCurrentWeekNumber(today); // Use the utility function

    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext("2d");



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

if (typeof chrome !== "undefined" && chrome.runtime) {
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

  chrome.runtime.onMessage.addListener(function (message ) {
    if (message.action === "updateIcon") {
      updateIcon(message.color);
    }
  });
}

// Export for Node.js testing environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getCurrentWeekNumber };
}
