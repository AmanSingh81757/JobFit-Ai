document.addEventListener('DOMContentLoaded', () => {
  const apiKeySetup = document.getElementById('apiKeySetup');
  const mainContent = document.getElementById('mainContent');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const resumeInput = document.getElementById('resume');
  const resumeFilenameSpan = document.getElementById('resumeFilename');
  const analyzeButton = document.getElementById('analyze');
  const analysisDiv = document.getElementById('analysis');
  const resetApiKeyButton = document.getElementById('resetApiKey');
  let currentTabId = null;

  // Get the current tab to use its ID for storage
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      // Once we have the tab ID, check for a saved analysis
      loadSavedAnalysis();
    }
  });

  // Check for API key and resume on load
  chrome.storage.local.get(['apiKey', 'resumeFilename'], (data) => {
    if (data.apiKey) {
      mainContent.style.display = 'block';
      apiKeySetup.style.display = 'none';
      if (data.resumeFilename) {
        resumeFilenameSpan.textContent = data.resumeFilename;
      }
    } else {
      apiKeySetup.style.display = 'block';
      mainContent.style.display = 'none';
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value;
    if (apiKey) {
      chrome.storage.local.set({ apiKey }, () => {
        mainContent.style.display = 'block';
        apiKeySetup.style.display = 'none';
      });
    } else {
      alert('Please enter an API key.');
    }
  });

  // Reset API key
  resetApiKeyButton.addEventListener('click', () => {
    chrome.storage.local.remove(['apiKey', `analysis_${currentTabId}`], () => {
      apiKeySetup.style.display = 'block';
      mainContent.style.display = 'none';
      apiKeyInput.value = '';
      analysisDiv.innerHTML = '';
      analysisDiv.classList.add('hidden');
    });
  });

  // Handle new resume upload
  resumeInput.addEventListener('change', () => {
    const resumeFile = resumeInput.files[0];
    if (resumeFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const resumeData = e.target.result;
        chrome.storage.local.set({ resumeData, resumeFilename: resumeFile.name }, () => {
          resumeFilenameSpan.textContent = resumeFile.name;
          alert('Resume uploaded!');
        });
      };
      reader.readAsDataURL(resumeFile);
    }
  });

  // Analyze resume
  analyzeButton.addEventListener('click', () => {
    if (!currentTabId) return;
    analyzeButton.disabled = true; // Disable the button
    analysisDiv.innerHTML = '<div class="loader"></div>';
    analysisDiv.classList.remove('hidden');
    // Clear previous analysis for the tab before starting a new one
    chrome.storage.local.remove(`analysis_${currentTabId}`, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => !!window.isContentScriptInjected,
        }).then((results) => {
          if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js'],
            }).then(() => {
              window.isContentScriptInjected = true;
              sendMessageToContentScript(tabs[0].id);
            });
          } else {
            sendMessageToContentScript(tabs[0].id);
          }
        });
      });
    });
  });

  function sendMessageToContentScript(tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'analyze' });
  }

  // Listen for analysis results
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'analysisResult') {
      // Save the result before rendering
      if (currentTabId) {
        const analysisData = { data: message.data, timestamp: new Date().getTime() };
        chrome.storage.local.set({ [`analysis_${currentTabId}`]: analysisData });
      }
      renderAnalysis(message.data);
      analyzeButton.disabled = false; // Re-enable the button
    }
  });

  function loadSavedAnalysis() {
    if (!currentTabId) return;
    const key = `analysis_${currentTabId}`;
    chrome.storage.local.get(key, (result) => {
      if (result[key]) {
        renderAnalysis(result[key].data);
      }
    });
  }

  function renderAnalysis(data) {
    analysisDiv.innerHTML = '';
    analysisDiv.classList.remove('hidden');

    try {
      // Extract the JSON object from the raw string
      const firstBrace = data.indexOf('{');
      const lastBrace = data.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error("Could not find a valid JSON object in the response.");
      }
      const jsonString = data.substring(firstBrace, lastBrace + 1);
      const result = JSON.parse(jsonString);
      console.log('Analysis Result:', result);
      if (result.isJobPosting === false) {
        analysisDiv.innerHTML = '<p class="center">This page does not appear to be a job posting.</p>';
        return;
      }

      // --- Score and Summary ---
      const summarySection = document.createElement('div');
      summarySection.className = 'summary-section';

      let scoreClass = '';
      if (result.matchScore >= 8) {
        scoreClass = 'score-high';
      } else if (result.matchScore >= 5) {
        scoreClass = 'score-medium';
      } else {
        scoreClass = 'score-low';
      }

      summarySection.innerHTML = `
        <div class="score-container">
          <div class="score-circle ${scoreClass}">
            <span class="score-number">${result.matchScore}/10</span>
          </div>
          <div class="score-label">Match Score</div>
        </div>
        <div class="summary-text">
          <h3>Summary</h3>
          <p>${result.matchSummary}</p>
        </div>
      `;
      analysisDiv.appendChild(summarySection);

      // --- Job Highlights ---
      if (result.jobHighlights) {
        const highlightsSection = document.createElement('div');
        highlightsSection.className = 'analysis-section';
        let skillsList = result.jobHighlights.requiredSkills.map(skill => `<li class="skill-tag">${skill}</li>`).join('');
        highlightsSection.innerHTML = `
          <h3>Job Highlights</h3>
          <p><strong>Title:</strong> ${result.jobHighlights.title}</p>
          <p><strong>Required Skills:</strong></p>
          <ul class="skills-list">${skillsList}</ul>
        `;
        analysisDiv.appendChild(highlightsSection);
      }

      // --- Requirements Not Covered ---
      if (result.requirementsNotCovered && Object.keys(result.requirementsNotCovered).length > 0) {
        const notCoveredSection = document.createElement('div');
        notCoveredSection.className = 'analysis-section warning';
        notCoveredSection.innerHTML = '<h3>Missing Requirements</h3>';
        const notCoveredList = document.createElement('ul');
        for (const [req, reason] of Object.entries(result.requirementsNotCovered)) {
          const item = document.createElement('li');
          item.innerHTML = `<strong>${req}:</strong> ${reason}`;
          notCoveredList.appendChild(item);
        }
        notCoveredSection.appendChild(notCoveredList);
        analysisDiv.appendChild(notCoveredSection);
      }

      // --- Strengths ---
      const coveredDiv = document.createElement('div');
      coveredDiv.className = 'analysis-section strengths-section';
      coveredDiv.innerHTML = '<h3>Strengths</h3>';
      const coveredList = document.createElement('ul');
      for (const [point, reason] of Object.entries(result.coveredPoints)) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${point}:</strong> ${reason}`;
        coveredList.appendChild(item);
      }
      coveredDiv.appendChild(coveredList);
      analysisDiv.appendChild(coveredDiv);

      // --- Weaknesses ---
      const missingDiv = document.createElement('div');
      missingDiv.className = 'analysis-section weaknesses-section';
      missingDiv.innerHTML = '<h3>Weaknesses</h3>';
      const missingList = document.createElement('ul');
      for (const [point, reason] of Object.entries(result.missingPoints)) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${point}:</strong> ${reason}`;
        missingList.appendChild(item);
      }
      missingDiv.appendChild(missingList);
      analysisDiv.appendChild(missingDiv);

      // --- Suggestions ---
      const suggestionsSection = document.createElement('div');
      suggestionsSection.className = 'analysis-section suggestions-section';
      suggestionsSection.innerHTML = '<h3>Suggestions for Improvement</h3>';
      const suggestionsList = document.createElement('ul');
      for (const [title, detail] of Object.entries(result.suggestions)) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${title}:</strong> ${detail}`;
        suggestionsList.appendChild(item);
      }
      suggestionsSection.appendChild(suggestionsList);
      analysisDiv.appendChild(suggestionsSection);

    } catch (error) {
      console.error('Error parsing analysis data:', error);
      analysisDiv.innerHTML = `<p class="error">An error occurred while parsing the analysis. Please try again.</p><p class="error-details">${data}</p>`;
      analyzeButton.disabled = false; // Re-enable the button on error
    }
  }
});