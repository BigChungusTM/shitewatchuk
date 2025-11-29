/**
 * ShitWatch UK - Feed Page JavaScript
 * Loads and displays 90-minute cycles with AI summaries
 */

// Load latest cycle
async function loadLatestCycle() {
  try {
    const response = await fetch('cycles/manifest.json');

    if (!response.ok) {
      throw new Error('Manifest not found');
    }

    const manifest = await response.json();

    if (!manifest.cycles || manifest.cycles.length === 0) {
      showNoCycles();
      return;
    }

    // Load latest cycle
    const latestFile = manifest.cycles[0];
    await loadCycle(latestFile, 'latest-cycle-container', true);

    // Load previous cycles (up to 10)
    const previousFiles = manifest.cycles.slice(1, 11);
    await loadPreviousCycles(previousFiles);

  } catch (error) {
    console.error('Error loading cycles:', error);
    showError('latest-cycle-container');
  }
}

// Load a single cycle
async function loadCycle(filename, containerId, isLatest = false) {
  try {
    const response = await fetch(`cycles/${filename}`);

    if (!response.ok) {
      throw new Error(`Cycle not found: ${filename}`);
    }

    const cycleData = await response.json();
    const container = document.getElementById(containerId);

    const html = renderCycle(cycleData, isLatest);
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading cycle:', error);
    document.getElementById(containerId).innerHTML =
      '<p class="loading">Error loading cycle data</p>';
  }
}

// Load previous cycles
async function loadPreviousCycles(files) {
  const container = document.getElementById('previous-cycles-container');

  if (files.length === 0) {
    container.innerHTML = '<p class="loading">No previous cycles yet</p>';
    return;
  }

  const promises = files.map(async (file) => {
    try {
      const response = await fetch(`cycles/${file}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error loading cycle:', file, error);
    }
    return null;
  });

  const cycles = (await Promise.all(promises)).filter(c => c !== null);

  if (cycles.length === 0) {
    container.innerHTML = '<p class="loading">No previous cycles available</p>';
    return;
  }

  const html = cycles.map(cycle => renderCycle(cycle, false)).join('');
  container.innerHTML = html;
}

// Render a cycle
function renderCycle(cycle, isLatest) {
  const cycleTime = formatTime(cycle.timestamp);

  return `
    <div class="cycle-container">
      <div class="cycle-header">
        <div class="cycle-time">
          ${isLatest ? '🔴 LATEST: ' : ''}${cycleTime}
        </div>
        <div class="cycle-count">
          ${cycle.eventCount} event${cycle.eventCount !== 1 ? 's' : ''}
        </div>
      </div>

      ${cycle.summary ? renderSummary(cycle.summary) : ''}

      ${renderEventTable(cycle.events)}
    </div>
  `;
}

// Render AI summary
function renderSummary(summary) {
  return `
    <div class="ai-summary">
      <h4>🤖 AI Summary</h4>
      <p>${summary.text}</p>
    </div>
  `;
}

// Render event table
function renderEventTable(events) {
  if (!events || events.length === 0) {
    return '<p class="loading">No events in this cycle</p>';
  }

  const rows = events.map(event => `
    <tr>
      <td><strong>${event.company}</strong></td>
      <td>${event.siteId}</td>
      <td>${event.siteName}</td>
      <td>${event.watercourse}</td>
      <td>${event.durationFormatted}</td>
      <td>
        <a href="${event.mapsLink}" target="_blank" title="Open in Google Maps">
          📍 ${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}
        </a>
      </td>
      <td>${formatTime(event.endTime)}</td>
    </tr>
  `).join('');

  return `
    <table class="event-table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Site ID</th>
          <th>Site Name</th>
          <th>Watercourse</th>
          <th>Duration</th>
          <th>Location</th>
          <th>Ended</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Show no cycles message
function showNoCycles() {
  document.getElementById('latest-cycle-container').innerHTML =
    '<p class="loading">No cycles available yet. Check back in 90 minutes!</p>';
  document.getElementById('previous-cycles-container').innerHTML = '';
}

// Show error
function showError(containerId) {
  document.getElementById(containerId).innerHTML =
    '<p class="loading">Error loading data. Please refresh the page.</p>';
}

// Load on page ready
document.addEventListener('DOMContentLoaded', () => {
  loadLatestCycle();

  // Auto-refresh every 5 minutes
  setInterval(loadLatestCycle, 5 * 60 * 1000);
});
