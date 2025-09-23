// events.js
const CONTAINER_ID = 'events-container';
const MAX_OCCURRENCES_PER_EVENT = 6; // show next N months
const MAX_TOTAL_EVENTS = 3;  
const FRIDAY = 5;
const WEDNESDAY = 3;

const eventsJsonUrl =
  (window.EVENTS_JSON_URL && String(window.EVENTS_JSON_URL)) || '/static/events.json';

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const fmtTimeRange = (d, startHHMM, endHHMM, tz = 'America/New_York') => {
  if (!startHHMM || !endHHMM) return '';
  const toDT = (t) => {
    const [h, m] = t.split(':').map(Number);
    const x = new Date(d);
    x.setHours(h, m || 0, 0, 0);
    return x;
  };
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  return `${fmt.format(toDT(startHHMM))}–${fmt.format(toDT(endHHMM))}`;
};

const telHref = (num) => `tel:${(num || '').replace(/[^0-9+]/g, '')}`;
const mailHref = (email) => `mailto:${email || ''}`;

const lastWeekdayOfMonth = (y, m0, weekday) => {
  const d = new Date(y, m0 + 1, 0); // last day of month
  const back = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
};

const nextMonthlyLastFriday = (count) => {
  const out = [];
  const t = today();
  let y = t.getFullYear();
  let m = t.getMonth();
  while (out.length < count) {
    const d = lastWeekdayOfMonth(y, m, FRIDAY);
    if (d >= t) out.push(d);
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
};

// Function for second Wednesday of the month
const nextMonthlySecondWednesday = (count) => {
  const out = [];
  const t = today();
  let y = t.getFullYear();
  let m = t.getMonth();
  while (out.length < count) {
    const d = new Date(y, m, 1);
    d.setDate(1 + ((3 - d.getDay() + 7) % 7)); // Set to the first Wednesday
    d.setDate(d.getDate() + 7); // Move to the second Wednesday
    if (d >= t) out.push(d);
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
};

// Function for biweekly events (every two weeks)
const nextBiweeklyOccurrences = (count) => {
  const out = [];
  const t = today();
  let startDate = t;
  while (out.length < count) {
    out.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 14); // Move 14 days ahead
  }
  return out;
};

const expandEvent = (evt) => {
  if (evt.recurrence?.type === 'monthly' && evt.recurrence.which === 'last' && evt.recurrence.weekday === 'FR') {
    return nextMonthlyLastFriday(MAX_OCCURRENCES_PER_EVENT);
  }
  
  // Handling second Wednesday of the month
  if (evt.recurrence?.type === 'monthly' && evt.recurrence.which === 'second' && evt.recurrence.weekday === 'WE') {
    return nextMonthlySecondWednesday(MAX_OCCURRENCES_PER_EVENT);
  }

  // Handling biweekly events
  if (evt.recurrence?.type === 'biweekly') {
    return nextBiweeklyOccurrences(MAX_OCCURRENCES_PER_EVENT);
  }

  if (evt.date) {
    const d = new Date(evt.date);
    d.setHours(0, 0, 0, 0);
    return d >= today() ? [d] : [];
  }

  return [];
};

const render = (occurrences) => {
  const el = document.getElementById(CONTAINER_ID);
  if (!el) return; // not on this page

  if (!occurrences.length) {
    el.innerHTML = '<p class="empty">No upcoming events found.</p>';
    return;
  }

  let html = '';
  for (const { evt, dateObj } of occurrences) {
    const when = fmtDate(dateObj);
    const time = evt.time ? fmtTimeRange(dateObj, evt.time.start, evt.time.end, evt.time.timezone) : '';
    const where = [
      evt.location?.mode || '',
      evt.location?.name ? `— ${evt.location.name}` : '',
      evt.location?.address ? `, ${evt.location.address}` : ''
    ].join(' ').trim();

    html += `
      <article class="event-card">
        <h3>${evt.title}</h3>
        ${evt.summary ? `<p>${evt.summary}</p>` : ''}
        <p><strong>${when}${time ? ` • ${time}` : ''}</strong></p>
        ${where ? `<p><em>${where}</em></p>` : ''}
        ${evt.registration?.note ? `<p>${evt.registration.note}</p>` : ''}
        <div class="event-cta" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          ${evt.registration?.phone ? `<a class="btn" href="${telHref(evt.registration.phone)}">Call ${evt.registration?.contactName?.split(' ')[0] || 'to Register'}</a>` : ''}
          ${evt.registration?.email ? `<a class="btn" href="${mailHref(evt.registration.email)}">Email</a>` : ''}
        </div>
      </article>
    `;
  }
  el.innerHTML = html;
};

async function initEvents() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;
  try {
    const res = await fetch(eventsJsonUrl, { cache: 'no-cache' });
    const events = await res.json();

    // build flat list of { evt, dateObj }
    const occurrences = events.flatMap(evt =>
      expandEvent(evt).map(d => ({ evt, dateObj: d }))
    );

    // sort soonest → latest, then keep top 4
    occurrences.sort((a, b) => a.dateObj - b.dateObj);
    const top = occurrences.slice(0, MAX_TOTAL_EVENTS);

    render(top);
  } catch (e) {
    console.error('events load failed', e);
    render([]);
  }
}

document.addEventListener('DOMContentLoaded', initEvents);