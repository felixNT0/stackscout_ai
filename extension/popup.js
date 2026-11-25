// StackScout AI Chrome Extension — Popup

const STACKSCOUT_URL = 'https://stackscout.ai';

// Check if user is on a job page
function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function init() {
  const tab = await getCurrentTab();
  const isJobPage = tab.url && (
    tab.url.includes('linkedin.com/jobs/') ||
    tab.url.includes('indeed.com/viewjob') ||
    tab.url.includes('glassdoor.com/job-listing')
  );

  const statusEl = document.getElementById('status');
  const applyBtn = document.getElementById('applyBtn');
  const openAppBtn = document.getElementById('openAppBtn');

  if (isJobPage) {
    statusEl.textContent = 'Job page detected — ready to apply';
    statusEl.style.color = '#10b981';
    applyBtn.disabled = false;
  } else {
    statusEl.textContent = 'Navigate to a job posting to use this';
    statusEl.style.color = '#f59e0b';
  }

  applyBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getJobDetails' });
      if (response && response.details) {
        await chrome.storage.local.set({ stackscout_job: response.details });
        chrome.tabs.create({ url: `${STACKSCOUT_URL}/apply?source=extension` });
      } else {
        // Fallback: just open the app
        chrome.tabs.create({ url: STACKSCOUT_URL });
      }
    } catch (err) {
      console.error('Failed to get job details:', err);
      chrome.tabs.create({ url: STACKSCOUT_URL });
    }
  });

  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: STACKSCOUT_URL });
  });
}

document.addEventListener('DOMContentLoaded', init);
