// StackScout AI Chrome Extension — Content Script
// Injects "Apply with StackScout" button on job pages

(function () {
  'use strict';

  const STACKSCOUT_URL = 'https://stackscout.ai';

  // Detect job posting page
  function isJobPage() {
    const url = window.location.href;
    return (
      url.includes('linkedin.com/jobs/') ||
      url.includes('indeed.com/viewjob') ||
      url.includes('glassdoor.com/job-listing')
    );
  }

  // Extract job details from page
  function extractJobDetails() {
    const details = {
      title: '',
      company: '',
      location: '',
      description: '',
      url: window.location.href,
      source: window.location.hostname.includes('linkedin.com') ? 'linkedin' :
              window.location.hostname.includes('indeed.com') ? 'indeed' : 'glassdoor',
    };

    // LinkedIn
    if (window.location.hostname.includes('linkedin.com')) {
      details.title = document.querySelector('.top-card-layout__title')?.textContent?.trim() || '';
      details.company = document.querySelector('.topcard__org-name-link')?.textContent?.trim() || '';
      details.location = document.querySelector('.topcard__flavor--bullet')?.textContent?.trim() || '';
      details.description = document.querySelector('.description__text')?.textContent?.trim() || '';
    }

    // Indeed
    if (window.location.hostname.includes('indeed.com')) {
      details.title = document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() || '';
      details.company = document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
      details.location = document.querySelector('[data-testid="inlineHeader-companyLocation"]')?.textContent?.trim() || '';
      details.description = document.querySelector('#jobDescriptionText')?.textContent?.trim() || '';
    }

    // Glassdoor
    if (window.location.hostname.includes('glassdoor.com')) {
      details.title = document.querySelector('h1[data-test="job-title"]')?.textContent?.trim() || '';
      details.company = document.querySelector('a[data-test="employer-name"]')?.textContent?.trim() || '';
      details.location = document.querySelector('[data-test="job-location"]')?.textContent?.trim() || '';
      details.description = document.querySelector('.desc')?.textContent?.trim() || '';
    }

    return details;
  }

  // Create "Apply with StackScout" button
  function createApplyButton(details) {
    const button = document.createElement('button');
    button.id = 'stackscout-apply-btn';
    button.className = 'stackscout-apply-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      Apply with StackScout AI
    `;

    button.addEventListener('click', () => {
      // Save job details to localStorage for StackScout to pick up
      localStorage.setItem('stackscout_job', JSON.stringify(details));
      // Open StackScout apply page
      window.open(`${STACKSCOUT_URL}/apply?source=extension`, '_blank');
    });

    return button;
  }

  // Initialize
  function init() {
    if (!isJobPage()) return;

    const details = extractJobDetails();
    if (!details.title || !details.company) return;

    // Remove existing button if present
    const existing = document.getElementById('stackscout-apply-btn');
    if (existing) existing.remove();

    // Add button
    const button = createApplyButton(details);
    document.body.appendChild(button);
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getJobDetails') {
      const details = extractJobDetails();
      sendResponse({ details });
    }
    return true;
  });

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 1000); // Wait for page to load
    }
  }).observe(document, { subtree: true, childList: true });
})();
