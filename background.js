chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "geminiRequest") {
    const { resumeData, jobDescription, apiKey } = message;

    // Extract MIME type and Base64 data from the data URL
    const parts = resumeData.split(",");
    const mimeType = parts[0].match(/:(.*?);/)[1];
    const base64Data = parts[1];

    const prompt = `
     You are a resume screening assistant.

      First, analyze the "Page Content" provided below to determine if it is a job posting.

      If it is NOT a job posting, respond with the following JSON:
      {
        "isJobPosting": false
      }

      If it IS a job posting, respond ONLY with a well-formatted JSON in the following format:

      {
        "isJobPosting": true,
        "matchScore": [number from 1 to 10],
        "matchSummary": "[short paragraph summarizing how well the resume matches the job]",
        "coveredPoints": {
          "Skill1": "Reason why this is considered covered in the resume",
          "Skill2": "Reason why this is considered covered"
        },
        "missingPoints": {
          "Skill1": "Why it's missing or weak in the resume",
          "Skill2": "What's lacking regarding this skill"
        },
        "suggestions": {
          "Suggestion1 Title": "Detailed recommendation",
          "Suggestion2 Title": "Another improvement suggestion"
        },
        "requirementsNotCovered": {
          "Graduation Year": "Expected graduation year is [year], but the resume shows [year]",
          "Other Requirement": "Description of another requirement not met"
        },
        "jobHighlights": {
          "title": "[Job title if present]",
          "requiredSkills": ["Skill1", "Skill2", ...]
        }
      }

      The skills part in coveredPoints and missingPoints must be smaller as they act as title for the point and its value will be its description.
      Also limit the maximum number of required skills in jobHighlights to 6 if more pick the 6 most important ones.
      Also make sure that the graduation year expectation if mentioned is met from the resume. Highlight it in the requirements not covered section.
      Be slightly more critical in your evaluation, emphasizing weaknesses and missing requirements more than matched skills.
      Do not include any other explanation or commentary — only return the JSON.

      Page Content:
      ---
      ${jobDescription}
      ---

    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (
          data &&
          data.candidates &&
          data.candidates.length > 0 &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts.length > 0
        ) {
          const analysis = data.candidates[0].content.parts[0].text;
          chrome.runtime.sendMessage({
            type: "analysisResult",
            data: analysis,
          });
        } else {
          console.error("Invalid Gemini API response:", data);
          let errorMessage = "An error occurred while analyzing the resume.";
          if (data && data.promptFeedback && data.promptFeedback.blockReason) {
            errorMessage = `Analysis blocked: ${data.promptFeedback.blockReason}. Please check the content.`;
          }
          chrome.runtime.sendMessage({
            type: "analysisResult",
            data: errorMessage,
          });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        chrome.runtime.sendMessage({
          type: "analysisResult",
          data: "An error occurred while communicating with the API.",
        });
      });
  }
});

// Clear analysis data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`analysis_${tabId}`);
});

// Clear analysis data when the user navigates to a new page in the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // We only care about the top-level frame navigating to a new URL
  if (changeInfo.status === 'loading' && changeInfo.url) {
    chrome.storage.local.remove(`analysis_${tabId}`);
  }
});
