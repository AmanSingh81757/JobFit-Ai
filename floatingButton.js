// Check if the button already exists to prevent duplicates
if (document.getElementById('jobfit-ai-floating-button')) {
  // Button already exists, do nothing
} else {
  const button = document.createElement('button');
  button.id = 'jobfit-ai-floating-button';
  button.textContent = 'JobFit AI';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '10000';
  button.style.backgroundColor = '#1877f2';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '8px';
  button.style.padding = '10px 15px';
  button.style.fontSize = '16px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  button.style.transition = 'background-color 0.2s';

  button.onmouseover = () => {
    button.style.backgroundColor = '#166fe5';
  };

  button.onmouseout = () => {
    button.style.backgroundColor = '#1877f2';
  };

  button.onclick = () => {
    // Send a message to the background script to open the popup
    chrome.runtime.sendMessage({ type: 'openPopup' });
  };

  // Append the button to the body. Use a timeout to ensure body is available.
  // This is a fallback for very early script injection on some pages.
  const appendButton = () => {
    if (document.body) {
      document.body.appendChild(button);
    } else {
      setTimeout(appendButton, 50);
    }
  };
  appendButton();
}