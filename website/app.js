/**
 * ShitWatch UK - Landing Page JavaScript
 * Loads and displays top 5 current events
 */

// Load latest cycles and extract top events
async function loadTopEvents() {
  try {
    // Fetch list of cycle files
    const response = await fetch('cycles/manifest.json');

    if (!response.ok) {
      throw new Error('Manifest not found');
    }

    const manifest = await response.json();

    if (!manifest.cycles || manifest.cycles.length === 0) {
      showNoEvents();
      return;
    }

    // Get the latest cycle
    const latestCycleFile = manifest.cycles[0];
    const cycleResponse = await fetch(`cycles/${latestCycleFile}`);

    if (!cycleResponse.ok) {
      throw new Error('Latest cycle not found');
    }

    const cycleData = await cycleResponse.json();

    // Sort events by duration (longest first)
    const sortedEvents = cycleData.events.sort((a, b) =>
      b.durationMinutes - a.durationMinutes
    );

    // Take top 5
    const top5 = sortedEvents.slice(0, 5);

    displayTopEvents(top5);

  } catch (error) {
    console.error('Error loading top events:', error);
    showError();
  }
}

// Display top 5 events
function displayTopEvents(events) {
  const container = document.getElementById('top-events-container');

  if (events.length === 0) {
    showNoEvents();
    return;
  }

  const html = events.map((event, index) => `
    <div class="event-card" onclick="openMaps('${event.latitude}', '${event.longitude}')">
      <div class="event-company">${index + 1}. ${event.company}</div>
      <div class="event-duration">${event.durationFormatted}</div>
      <div class="event-location">
        📍 ${event.watercourse} (Site: ${event.siteId})
      </div>
      <div class="event-time">
        Ended: ${formatTime(event.endTime)}
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

// Show no events message
function showNoEvents() {
  const container = document.getElementById('top-events-container');
  container.innerHTML = '<p class="loading">No events available yet. Check back soon!</p>';
}

// Show error message
function showError() {
  const container = document.getElementById('top-events-container');
  container.innerHTML = '<p class="loading">Unable to load events. Please refresh the page.</p>';
}

// Open Google Maps
function openMaps(lat, lon) {
  window.open(`https://maps.google.com/?q=${lat},${lon}`, '_blank');
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Load on page ready
document.addEventListener('DOMContentLoaded', () => {
  loadTopEvents();
});
