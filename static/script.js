document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  const monthTitle = document.getElementById('month-title');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  monthTitle.textContent = monthName.toUpperCase();

  buildCalendar(year, month);
  await fillCalendarWithEvents(year, month);
});

/** Builds the blank monthly calendar grid */
function buildCalendar(year, month) {
  const container = document.getElementById('calendar');
  container.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Add leading placeholders
  for (let i = 0; i < firstDay; i++) {
    const placeholder = document.createElement('div');
    placeholder.className = 'day-frame placeholder';
    container.appendChild(placeholder);
  }

  // Add day boxes
  for (let d = 1; d <= daysInMonth; d++) {
    const frame = document.createElement('div');
    frame.className = 'day-frame center real';
    const num = document.createElement('h2');
    num.className = 'day-number';
    num.textContent = d;

    const label = document.createElement('div');
    label.className = 'day-label center';
    label.textContent = ''; // will be filled later

    const eventsList = document.createElement('div');
    eventsList.className = 'day-events';

    frame.appendChild(num);
    frame.appendChild(label);
    frame.appendChild(eventsList);
    container.appendChild(frame);
  }
}
async function fillCalendarWithEvents(year, month) {
  try {
    const res = await fetch('/static/events.json', { cache: 'no-cache' });
    const events = await res.json();

    // Expand with events.js helpers
    const occurrences = events.flatMap(evt =>
      expandEvent(evt).map(dateObj => ({ evt, dateObj }))
    );

    // Filter to current month
    const thisMonthEvents = occurrences.filter(({ dateObj }) =>
      dateObj.getMonth() === month && dateObj.getFullYear() === year
    );

    thisMonthEvents.forEach(({ evt, dateObj }) => {
      const day = dateObj.getDate();
      const dayBox = document.querySelectorAll('.real')[day - 1];
      if (!dayBox) return;

      const eventsList = dayBox.querySelector('.day-events');
      const eventEl = document.createElement('div');
      eventEl.className = 'event-mini';
      eventEl.innerHTML = `
        <strong>${evt.title}</strong><br>
        <small>${evt.time?.start || ''}${evt.time?.end ? '–' + evt.time.end : ''}</small>
      `;

      // Store full event info in dataset for modal
      eventEl.dataset.event = JSON.stringify(evt);
      eventEl.addEventListener('click', showEventModal);

      eventsList.appendChild(eventEl);
    });
  } catch (err) {
    console.error('Calendar event placement failed:', err);
  }
}

/** Modal display logic */
function showEventModal(e) {
  const evt = JSON.parse(e.currentTarget.dataset.event);
  const modal = document.getElementById('event-modal');
  const overlay = document.getElementById('modal-overlay');

  // Fill modal content
  document.getElementById('modal-title').textContent = evt.title;
  document.getElementById('modal-summary').textContent = evt.summary || '';
  document.getElementById('modal-time').textContent =
    `${evt.time?.start || ''}${evt.time?.end ? '–' + evt.time.end : ''}`;
  document.getElementById('modal-location').textContent =
    evt.location?.name || evt.location?.mode || '';
  document.getElementById('modal-note').textContent = evt.registration?.note || '';

  const cta = document.getElementById('modal-cta');
  cta.innerHTML = '';
  if (evt.registration?.email) {
    const emailBtn = document.createElement('a');
    emailBtn.href = `mailto:${evt.registration.email}`;
    emailBtn.textContent = 'Email to Register';
    emailBtn.className = 'btn';
    cta.appendChild(emailBtn);
  }
  if (evt.registration?.phone) {
    const callBtn = document.createElement('a');
    callBtn.href = `tel:${evt.registration.phone.replace(/[^0-9+]/g, '')}`;
    callBtn.textContent = `Call ${evt.registration?.contactName?.split(' ')[0] || ''}`;
    callBtn.className = 'btn';
    cta.appendChild(callBtn);
  }

  modal.style.display = 'block';
  overlay.style.display = 'block';
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay' || e.target.classList.contains('close-modal')) {
    document.getElementById('event-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
  }
});

/*makes the get started here work*/

document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("dropdown");

  dropdown.addEventListener("change", () => {
    const value = dropdown.value;

    if (value === "calendar") {
      window.location.href = "/calendar";      // change to your route
    } 
    else if (value === "resources") {
      window.location.href = "/research";   // change to your route
    }
  });
});