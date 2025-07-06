// Check if the button already exists to prevent duplicates
if (document.getElementById('jobfit-ai-floating-button')) {
  // Button already exists, do nothing
} else {
  const button = document.createElement('button');
  button.id = 'jobfit-ai-floating-button';
  button.textContent = 'JF';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '10000';
  button.style.backgroundColor = '#f7fcff';
  button.style.opacity = '0.7';
  button.style.color = '#0acfba';
  button.style.border = 'none';
  button.style.borderRadius = '50%';
  button.style.padding = '10px 15px';
  button.style.fontSize = '16px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  button.style.transition = 'background-color 0.3s, opacity 0.3s, filter 0.3s';
  button.style.filter = 'blur(1px)';

  let inactivityTimer;

  const removeButton = () => {
    const btn = document.getElementById('jobfit-ai-floating-button');
    if (btn) {
      btn.remove();
    }
  };

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(removeButton, 30000); // 30 seconds
  };

  button.onmouseover = () => {
    button.style.backgroundColor = '#98e4dc';
    button.style.color = 'white';
    button.style.opacity = '1';
    button.style.filter = 'blur(0px)';
    resetInactivityTimer();
  };

  button.onmouseout = () => {
    button.style.backgroundColor = '#f7fcff';
    button.style.color = '#0acfba';
    button.style.opacity = '0.7';
    button.style.filter = 'blur(1px)';
    resetInactivityTimer();
  };

  button.onclick = () => {
    // Send a message to the background script to open the popup
    chrome.runtime.sendMessage({ type: 'openPopup' });
    resetInactivityTimer();
  };

  // Append the button to the body. Use a timeout to ensure body is available.
  // This is a fallback for very early script injection on some pages.
  const appendButton = () => {
    if (document.body) {
      document.body.appendChild(button);
      resetInactivityTimer(); // Start the timer
    } else {
      setTimeout(appendButton, 50);
    }
  };
  appendButton();
}