document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar-grid");
  const monthTitle = document.getElementById("calendar-month-title");
  const nextBtn = document.getElementById("calendar-next");
  const prevBtn = document.getElementById("calendar-prev");
  const overlay = document.getElementById("calendar-modal-overlay");
  const modal = document.getElementById("calendar-event-modal");
  const closeBtn = document.querySelector(".calendar-close-modal");

  // ---- Load events ----
  let events = [];
  try {
    const res = await fetch("/static/events.json", { cache: "no-cache" });
    events = await res.json();
    console.log("✅ Loaded events:", events);
  } catch (err) {
    console.error("❌ Failed to load events.json", err);
  }

  const weekdays = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // ---- Helpers ----
  const nthWeekday = (year, month, n, weekday) => {
    const first = new Date(year, month, 1);
    const offset = (7 + weekdays[weekday] - first.getDay()) % 7;
    const day = 1 + offset + (n - 1) * 7;
    const d = new Date(year, month, day);
    return d.getMonth() === month ? d : null;
  };

  const lastWeekday = (year, month, weekday) => {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== weekdays[weekday]) d.setDate(d.getDate() - 1);
    return d;
  };

  const expandEventDates = (evt) => {
    const expanded = [];
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 6);
    const recurrence = evt.recurrence || {};

    if (evt.date) {
      const d = new Date(evt.date);
      if (!isNaN(d)) expanded.push(d);
      return expanded;
    }

    if (recurrence.type === "weekly" && Array.isArray(recurrence.days)) {
      let cursor = new Date(now);
      while (cursor <= end) {
        recurrence.days.forEach((day) => {
          const diff = (weekdays[day] - cursor.getDay() + 7) % 7;
          const next = new Date(cursor);
          next.setDate(cursor.getDate() + diff);
          if (next <= end) expanded.push(new Date(next));
        });
        cursor.setDate(cursor.getDate() + 7);
      }
      return expanded;
    }

    if (recurrence.type === "monthly" && recurrence.weekday) {
      const map = { first: 1, second: 2, third: 3, fourth: 4 };
      const whichList = Array.isArray(recurrence.which)
        ? recurrence.which
        : [recurrence.which];
      let y = now.getFullYear();
      let m = now.getMonth();

      for (let i = 0; i < 6; i++) {
        whichList.forEach((which) => {
          if (!which) return;
          let d;
          if (which === "last") d = lastWeekday(y, m, recurrence.weekday);
          else d = nthWeekday(y, m, map[which] || 1, recurrence.weekday);
          if (d && d >= now && d <= end) expanded.push(d);
        });
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
      }
      return expanded;
    }

    return expanded;
  };

  const expandedEvents = events.flatMap((evt) => {
    const dates = expandEventDates(evt);
    return dates.map((d) => ({
      ...evt,
      dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`,
    }));
  });

  console.log("📅 Expanded events:", expandedEvents);

  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  const getMonthName = (month) =>
    new Date(2000, month, 1).toLocaleString("default", { month: "long" });

  const getEventsForDate = (dateString) =>
    expandedEvents.filter((e) => e.dateKey === dateString);

  // ---- Modal ----
  const openModal = (evt) => {
    document.getElementById("calendar-modal-title").textContent = evt.title;
    document.getElementById("calendar-modal-summary").textContent =
      evt.summary || "";

    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [h, m] = timeStr.split(":").map(Number);
      const date = new Date();
      date.setHours(h, m);
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const timeEl = document.getElementById("calendar-modal-time");
    timeEl.textContent =
      evt.time?.start && evt.time?.end
        ? `${formatTime(evt.time.start)} – ${formatTime(evt.time.end)}`
        : evt.time?.start
        ? formatTime(evt.time.start)
        : "";

    const locationEl = document.getElementById("calendar-modal-location");
    locationEl.innerHTML = evt.location?.name || "";
    document.getElementById("calendar-modal-note").textContent =
      evt.registration?.note || "";

    const ctaContainer = document.getElementById("calendar-modal-cta");
    ctaContainer.innerHTML = "";
    if (evt.cta?.href) {
      const btn = document.createElement("a");
      btn.href = evt.cta.href;
      btn.textContent = evt.cta.label || "Learn More";
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.className = "calendar-modal-btn";
      ctaContainer.appendChild(btn);
    }

    overlay.classList.remove("calendar-hidden");
    modal.classList.remove("calendar-hidden");
  };

  const closeModal = () => {
    overlay.classList.add("calendar-hidden");
    modal.classList.add("calendar-hidden");
  };
  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);

  // ---- Render Calendar ----
  const renderCalendar = (month, year) => {
    calendarEl.innerHTML = "";
    monthTitle.textContent = `${getMonthName(month)} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const totalCells = 42;

    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ num: prevMonthDays - i, inactive: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ num: d, inactive: false });
    while (cells.length < totalCells)
      cells.push({ num: cells.length - daysInMonth - startDay + 1, inactive: true });

    cells.forEach((cell) => {
      const cellEl = document.createElement("div");
      cellEl.className = "calendar-day";
      if (cell.inactive) cellEl.classList.add("inactive");
      cellEl.innerHTML = `<div class="calendar-date-number">${cell.num}</div>`;

      if (!cell.inactive) {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          cell.num
        ).padStart(2, "0")}`;
        const dayEvents = getEventsForDate(dateKey);

        dayEvents.forEach((evt) => {
          const tags = (evt.tags || []).map((t) => t.toLowerCase());
          let colorClass = "calendar-dot-default";
          if (tags.includes("art")) colorClass = "calendar-dot-art";
          else if (tags.includes("speech")) colorClass = "calendar-dot-speech";
          else if (tags.includes("support")) colorClass = "calendar-dot-support";
          else if (tags.includes("community")) colorClass = "calendar-dot-community";
          else if (tags.includes("parkinson’s") || tags.includes("parkinsons"))
            colorClass = "calendar-dot-parkinsons";

          const eventItem = document.createElement("div");
          eventItem.classList.add("calendar-event-item");
          eventItem.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal(evt);
          });

          const dot = document.createElement("span");
          dot.classList.add("calendar-event-dot", colorClass);

          const label = document.createElement("span");
          label.classList.add("calendar-event-label");
          label.textContent = evt.shortLabel || evt.tags?.[0] || evt.title || "Event";

          eventItem.appendChild(dot);
          eventItem.appendChild(label);
          cellEl.appendChild(eventItem);
        });
      }

      calendarEl.appendChild(cellEl);
    });
  };

  // === INITIAL RENDER ===
  renderCalendar(currentMonth, currentYear);

  // === MONTH NAVIGATION ===
  nextBtn?.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });

  prevBtn?.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });
});
