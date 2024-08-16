/*document.getElementById("saveButton").addEventListener("click", function () {
  const selectedTheme = document.getElementById("themeSelect").value;
  chrome.storage.sync.set({ theme: selectedTheme }, function () {
    alert("Settings saved.");
  });
});


document.getElementById("themeSelect").addEventListener("change", function () {
  var theme = this.value;
  var bodyElement = document.body;

  if (theme === "dark") {
    bodyElement.classList.add("dark");
  } else {
    bodyElement.classList.remove("dark");
  }
}); 
document.getElementById("themeSelect").addEventListener("change", function () {
  var theme = this.value;
  var bodyElement = document.body;

  // Reset classes
  bodyElement.classList.remove("dark", "blue", "red");

  if (theme) {
    bodyElement.classList.add(theme);
  }
});
*/

document.getElementById("saveButton").addEventListener("click", function () {
  const selectedTheme = document.getElementById("themeSelect").value;
  chrome.storage.sync.set({ theme: selectedTheme }, function () {
    alert("Settings saved.");
  });
});

document.getElementById("themeSelect").addEventListener("change", function () {
  var theme = this.value;
  var bodyElement = document.body;

  // Reset classes
  bodyElement.className = ""; // Clear all classes on the body

  if (theme) {
    bodyElement.classList.add(theme);
  }
});

// Initialize the theme on page load
window.addEventListener("DOMContentLoaded", (event) => {
  chrome.storage.sync.get("theme", function (data) {
    if (data.theme) {
      document.body.classList.add(data.theme);
      document.getElementById("themeSelect").value = data.theme;
    } else {
      // Default to light theme
      document.body.classList.add("light");
      document.getElementById("themeSelect").value = "light";
    }
  });
});
