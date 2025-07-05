chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'analyze') {
    const jobDescription = document.body.innerText;
    chrome.storage.local.get(['resumeData', 'apiKey'], (data) => {
      if (data.resumeData && data.apiKey) {
        chrome.runtime.sendMessage({ 
          type: 'geminiRequest', 
          resumeData: data.resumeData, 
          jobDescription, 
          apiKey: data.apiKey 
        });
      } else {
        chrome.runtime.sendMessage({ 
          type: 'analysisResult', 
          data: 'Please upload your resume and save your API key.' 
        });
      }
    });
  }
});
