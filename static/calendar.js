document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar-grid");
  const monthTitle = document.getElementById("calendar-month-title");
  const nextBtn = document.getElementById("calendar-next");
  const prevBtn = document.getElementById("calendar-prev");
  const overlay = document.getElementById("calendar-modal-overlay");
  const modal = document.getElementById("calendar-event-modal");
  const closeBtn = document.querySelector(".calendar-close-modal");

  /* ---------------- LOAD EVENTS ---------------- */
  let events = [];
  try {
    const res = await fetch("/static/events.json", { cache: "no-cache" });
    events = await res.json();
  } catch (err) {
    console.error("Failed to load events.json", err);
  }

  const weekdays = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

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

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    return new Date(d.setDate(diff));
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

    if (recurrence.type === "weekly") {
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

    if (recurrence.type === "monthly") {
      const map = { first: 1, second: 2, third: 3, fourth: 4 };
      const whichList = Array.isArray(recurrence.which)
        ? recurrence.which
        : [recurrence.which];
      let y = now.getFullYear();
      let m = now.getMonth();

      for (let i = 0; i < 6; i++) {
        whichList.forEach((which) => {
          let d;
          if (which === "last") d = lastWeekday(y, m, recurrence.weekday);
          else d = nthWeekday(y, m, map[which] || 1, recurrence.weekday);
          if (d && d >= now && d <= end) expanded.push(d);
        });
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return expanded;
    }

    return expanded;
  };

  const expandedEvents = events.flatMap((evt) => {
    const dates = expandEventDates(evt);
    return dates.map((d) => ({
      ...evt,
      dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    }));
  });

  /* ---------------- STATE ---------------- */
  let isWeeklyView = false;
  let currentWeekStart = null;

  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  const getMonthName = (month) =>
    new Date(2000, month, 1).toLocaleString("default", { month: "long" });

  const getEventsForDate = (dateString) =>
    expandedEvents.filter((e) => e.dateKey === dateString);

  /* ---------------- MODAL ---------------- */
  const openModal = (evt) => {
    document.getElementById("calendar-modal-title").textContent = evt.title;
    document.getElementById("calendar-modal-summary").textContent = evt.summary || "";

    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [h, m] = timeStr.split(":");
      const d = new Date();
      d.setHours(h, m);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    };

    const timeEl = document.getElementById("calendar-modal-time");
    timeEl.textContent = evt.time?.start ? formatTime(evt.time.start) : "";

    document.getElementById("calendar-modal-location").innerHTML = evt.location?.name || "";
    document.getElementById("calendar-modal-note").textContent = evt.registration?.note || "";

    const ctaContainer = document.getElementById("calendar-modal-cta");
    ctaContainer.innerHTML = "";
    if (evt.cta?.href) {
      const btn = document.createElement("a");
      btn.href = evt.cta.href;
      btn.textContent = evt.cta.label || "Learn More";
      btn.target = "_blank";
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

  /* ---------------- MONTH VIEW ---------------- */
  const renderCalendar = (month, year) => {
    calendarEl.className = "calendar-grid";     // ← RESET LAYOUT  
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
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ num: d, inactive: false });
    }
    while (cells.length < totalCells) {
      cells.push({ num: cells.length - daysInMonth - startDay + 1, inactive: true });
    }

    cells.forEach((cell) => {
      const cellEl = document.createElement("div");
      cellEl.className = "calendar-day";
      if (cell.inactive) cellEl.classList.add("inactive");

      cellEl.innerHTML = `<div class="calendar-date-number">${cell.num}</div>`;

      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.num).padStart(2, "0")}`;
      const dayEvents = getEventsForDate(dateKey);

      if (!cell.inactive) {
        dayEvents.forEach((evt) => {
          const eventItem = document.createElement("div");
          eventItem.className = "calendar-event-item";
          eventItem.onclick = (e) => {
            e.stopPropagation();
            openModal(evt);
          };

          /* --- DOT ELEMENT --- */
        const dot = document.createElement("span");
        dot.classList.add("calendar-event-dot");

        /* --- ORIGINAL COLOR TAG LOGIC (restored) --- */
        const tags = (evt.tags || []).map(t => t.toLowerCase());
        let colorClass = "calendar-dot-default";

        if (tags.includes("art")) colorClass = "calendar-dot-art";
        else if (tags.includes("speech")) colorClass = "calendar-dot-speech";
        else if (tags.includes("support")) colorClass = "calendar-dot-support";
        else if (tags.includes("community")) colorClass = "calendar-dot-community";
        else if (tags.includes("parkinson’s") || tags.includes("parkinsons"))
        colorClass = "calendar-dot-parkinsons";

        dot.classList.add(colorClass);

          const label = document.createElement("span");
          label.classList.add("calendar-event-label");
          label.textContent = evt.shortLabel || evt.title;

          eventItem.appendChild(dot);
          eventItem.appendChild(label);
          cellEl.appendChild(eventItem);
        });
      }

      calendarEl.appendChild(cellEl);
    });
  };

  /* ---------------- WEEKLY VIEW ---------------- */
  const renderWeeklyView = () => {
    // Reset grid to weekly mode
    calendarEl.className = "calendar-week-grid weekly-mode";
    calendarEl.innerHTML = "";

    /* ----------------------------------------------------------
        WEEKDAY LABELS (Mon–Sun)
    ---------------------------------------------------------- */
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Reuse the label row if it exists, or create it once
    let labelRow = document.getElementById("calendar-weekday-labels");
    if (!labelRow) {
        labelRow = document.createElement("div");
        labelRow.id = "calendar-weekday-labels";
        labelRow.className = "calendar-weekday-labels";
        // Insert above the weekly grid
        calendarEl.insertAdjacentElement("beforebegin", labelRow);
    }

    // Fill label row with weekday names
    labelRow.innerHTML = "";
    labels.forEach(day => {
        const el = document.createElement("div");
        el.textContent = day;
        labelRow.appendChild(el);
    });

    /* ----------------------------------------------------------
        Determine the week range
    ---------------------------------------------------------- */
    const week = [];
    const start = currentWeekStart;

    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        week.push(d);
    }

    monthTitle.textContent =
        `Week of ${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;

    /* ----------------------------------------------------------
        Build weekly day cards
    ---------------------------------------------------------- */
    week.forEach((dateObj) => {
            const dateKey =
            `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

            const dayEvents = getEventsForDate(dateKey);

            const cell = document.createElement("div");
            cell.className = "calendar-week-day";

            // Day number
            cell.innerHTML = `<div class="calendar-date-number">${dateObj.getDate()}</div>`;

            // Add events for that day
            dayEvents.forEach((evt) => {
            const card = document.createElement("div");
            card.className = "week-event";
            card.onclick = (e) => {
                e.stopPropagation();
                openModal(evt);
            };

            const title = document.createElement("div");
            title.className = "week-event-title";
            title.textContent = evt.title;

            const time = document.createElement("div");
            time.className = "week-event-time";

            if (evt.time?.start) {
                const [h, m] = evt.time.start.split(":");
                const d = new Date();
                d.setHours(h, m);
                time.textContent = d.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
                });
            }

            card.appendChild(title);
            card.appendChild(time);
            cell.appendChild(card);
            });

            calendarEl.appendChild(cell);
        });
    };


  /* ---------------- WEEKLY TOGGLE ---------------- */
  document.getElementById("calendar-weekly-toggle").addEventListener("click", () => {
    if (!isWeeklyView) {
      isWeeklyView = true;
      currentWeekStart = getMonday(new Date());
      renderWeeklyView();
      document.getElementById("calendar-weekly-toggle").textContent = "Back to Month";
    } else {
      isWeeklyView = false;
      renderCalendar(currentMonth, currentYear);
      document.getElementById("calendar-weekly-toggle").textContent = "Weekly View";
    }
  });

  /* ---------------- NAVIGATION ---------------- */
  nextBtn.addEventListener("click", () => {
    if (isWeeklyView) {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      renderWeeklyView();
    } else {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar(currentMonth, currentYear);
    }
  });

  prevBtn.addEventListener("click", () => {
    if (isWeeklyView) {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      renderWeeklyView();
    } else {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar(currentMonth, currentYear);
    }
  });

  /* ---------------- FIRST RENDER ---------------- */
  renderCalendar(currentMonth, currentYear);
});