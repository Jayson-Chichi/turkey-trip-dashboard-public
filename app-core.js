import { airports as sharedAirports, flights as sharedFlights, itinerary as sharedItinerary, journeys as sharedJourneys, mapLinks as sharedMapLinks, places as sharedPlaces, tools as sharedTools, trip as sharedTrip } from "./data/trip.js";

let airports = sharedAirports;
let flights = sharedFlights;
let itinerary = sharedItinerary;
let journeys = sharedJourneys;
let mapLinks = sharedMapLinks;
let places = sharedPlaces;
let tools = sharedTools;
let trip = sharedTrip;

const today = new Date();
const tripStart = dateOnly(trip.startDate);
const tripEnd = dateOnly(trip.endDate);
let activeBudget = null;
let activePlaceIdeas = null;
let selectedDay = null;
let activePlaceFilter = "all";

const weatherCodes = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Rain showers",
  95: "Thunderstorm",
};

const weatherIcons = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  80: "🌦️",
  95: "⛈️",
};

const formatDate = new Intl.DateTimeFormat("zh-Hant-TW", {
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const formatTime = new Intl.DateTimeFormat("zh-Hant-TW", {
  hour: "2-digit",
  minute: "2-digit",
});

function dateOnly(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil((dateOnly(isoDate(b)) - dateOnly(isoDate(a))) / day);
}

function getActiveDay() {
  const todayOnly = dateOnly(isoDate(today));
  if (todayOnly >= tripStart && todayOnly <= tripEnd) {
    return itinerary.find((day) => day.date === isoDate(todayOnly)) || itinerary[0];
  }
  return itinerary.find((day) => dateOnly(day.date) >= todayOnly) || itinerary[itinerary.length - 1];
}

function updateCountdown() {
  const pill = document.querySelector("#countdownPill");
  const todayOnly = dateOnly(isoDate(today));
  if (todayOnly < tripStart) {
    pill.textContent = `${daysBetween(todayOnly, tripStart)} days`;
    return;
  }
  if (todayOnly > tripEnd) {
    pill.textContent = "Trip complete / 已完成";
    return;
  }
  pill.textContent = `Day ${daysBetween(tripStart, todayOnly) + 1} / 第 ${daysBetween(tripStart, todayOnly) + 1} 天`;
}

function renderStatus() {
  const title = document.querySelector("#todayTitle");
  const subtitle = document.querySelector("#todaySubtitle");
  const city = trip.cities[selectedDay.city];
  const todayOnly = dateOnly(isoDate(today));

  if (todayOnly < tripStart) {
    title.textContent = `${city.label} 即將開始 / Coming up`;
    subtitle.textContent = `距離出發還有 ${daysBetween(todayOnly, tripStart)} 天 / ${daysBetween(todayOnly, tripStart)} days to departure. 先把飯店、接送與景點慢慢補齊 / Keep filling hotels, transfers, and places.`;
  } else if (todayOnly > tripEnd) {
    title.textContent = "旅程已完成 / Trip complete";
    subtitle.textContent = "這裡可以保留成旅行紀錄，也能作為下次行程模板 / Keep this as a travel record or future trip template.";
  } else {
    title.textContent = `${formatDate.format(dateOnly(selectedDay.date))} ${city.label}`;
    subtitle.textContent = selectedDay.focus === "balloon"
      ? "熱氣球日，風速與天氣狀態優先顯示 / Balloon day: wind and weather are priority."
      : `今晚住宿 / Tonight: ${selectedDay.hotel}`;
  }
}

function renderCityProgress() {
  const el = document.querySelector("#cityProgress");
  const cityWindows = [
    ["09/22", "台北 / Taipei"],
    ["09/23-09/27", "卡帕多奇亞 / Cappadocia"],
    ["09/27-09/30", "伊斯坦堡 / Istanbul"],
    ["10/01", "台北 / Taipei"],
  ];
  el.innerHTML = cityWindows
    .map(([date, city]) => `<div><span>${date}</span><strong>${city}</strong></div>`)
    .join("");
}

function renderTimeline(target, day) {
  target.innerHTML = getTimelineEvents(day)
    .map((event) => {
      const mapActions = renderTimelineMapActions(event);
      return `
        <article class="timeline-item ${event.type}">
          <div class="time">${event.time}</div>
          <div class="timeline-body">
            <div class="item-title-row">
              <h4>${event.title}</h4>
              <span class="status ${event.status}">${statusLabel(event.status)}</span>
            </div>
            <p>${event.location}</p>
            ${mapActions}
            <small>${event.note}</small>
          </div>
        </article>
      `;
    })
    .join("");
}

function getTimelineEvents(day) {
  const events = [...day.events];
  if (shouldShowBackToHotel(day)) {
    events.push({
      time: "Night",
      type: "hotel",
      title: `回飯店 / Back to hotel`,
      location: day.hotel,
      status: "confirmed",
      note: `今晚住宿 / Tonight: ${day.hotel}`,
    });
  }
  return events;
}

function shouldShowBackToHotel(day) {
  const hotel = day.hotel.toLowerCase();
  return !hotel.includes("tbd") && !hotel.includes("待補") && !hotel.includes("in flight") && !hotel.includes("機上") && hotel !== "home";
}

function statusLabel(status) {
  const labels = {
    confirmed: "已確認 / Confirmed",
    todo: "待補 / TBD",
    idea: "暫定 / Tentative",
    known: "已知 / Known",
    estimate: "估算 / Estimate",
  };
  return labels[status] || status;
}

function renderTimelineMapActions(event) {
  const query = getMapQueryForEvent(event);
  if (!query) return "";
  const encoded = encodeURIComponent(query);
  return `
    <div class="timeline-map-actions">
      <a href="https://www.google.com/maps/search/?api=1&query=${encoded}">Open Location / 開啟定位</a>
    </div>
  `;
}

function getMapQueryForEvent(event) {
  const haystack = `${event.title} ${event.location} ${event.note}`.toLowerCase();
  const directMatch = mapLinks.find((place) => {
    const primaryName = place.name.split(" / ")[0].toLowerCase();
    return primaryName.length > 4 && haystack.includes(primaryName);
  });
  if (directMatch) return directMatch.query;

  const rules = [
    ["tpe", "Taiwan Taoyuan International Airport TPE"],
    ["taoyuan", "Taiwan Taoyuan International Airport TPE"],
    ["ist", "Istanbul Airport IST"],
    ["istanbul airport", "Istanbul Airport IST"],
    ["asr", "Kayseri Airport ASR"],
    ["kayseri airport", "Kayseri Airport ASR"],
    ["mithra", "Mithra Cave Hotel Cappadocia Goreme Turkey"],
    ["stone house", "Stone House Cave Hotel Goreme Turkey"],
    ["gezi", "Gezi Hotel Bosphorus Istanbul"],
    ["uchisar", "Uchisar Village Cappadocia Turkey"],
    ["kaymakli", "Kaymakli Underground City Cappadocia Turkey"],
    ["ihlara", "Ihlara Valley Turkey"],
    ["pigeon valley", "Pigeon Valley Goreme Cappadocia Turkey"],
    ["belisirma", "Belisirma Cappadocia Turkey"],
    ["cappadocia", "Goreme Cappadocia Turkey"],
    ["istanbul", "Istanbul Turkey"],
  ];
  const match = rules.find(([keyword]) => haystack.includes(keyword));
  return match ? match[1] : "";
}

function renderNextItem() {
  const el = document.querySelector("#nextItem");
  const next = selectedDay.events[0];
  el.innerHTML = `
    <article class="next-card">
      <span class="time">${next.time}</span>
      <div>
        <h4>${next.title}</h4>
        <p>${next.location}</p>
        <small>${next.note}</small>
      </div>
    </article>
  `;
}

function renderDateTabs() {
  const tabs = document.querySelector("#dateTabs");
  tabs.innerHTML = itinerary
    .map((day) => {
      const active = day.date === selectedDay.date ? "is-active" : "";
      const label = day.date.slice(5).replace("-", "/");
      return `<button class="${active}" data-date="${day.date}" type="button" role="tab">${label}</button>`;
    })
    .join("");

  tabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = itinerary.find((day) => day.date === button.dataset.date);
      renderAll();
    });
  });
}

function renderDaySummary() {
  const el = document.querySelector("#daySummary");
  if (!el) return;
  const city = trip.cities[selectedDay.city];
  const mainEvent = selectedDay.events.find((event) => event.type !== "arrival") || selectedDay.events[0];
  const hotelText = selectedDay.hotel || "TBD";
  const hotelQuery = shouldShowBackToHotel(selectedDay) ? getMapQueryForEvent({ title: hotelText, location: hotelText, note: "" }) : "";
  const hotelButton = hotelQuery
    ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelQuery)}">Hotel location / 飯店定位</a>`
    : "";

  el.innerHTML = `
    <article class="day-summary-card">
      <div>
        <p class="eyebrow">Day Brief / 今日摘要</p>
        <h3>${formatDate.format(dateOnly(selectedDay.date))} · ${city.label}</h3>
      </div>
      <div class="day-summary-grid">
        <div>
          <span>Tonight / 今晚</span>
          <strong>${hotelText}</strong>
        </div>
        <div>
          <span>Focus / 重點</span>
          <strong>${mainEvent.title}</strong>
        </div>
      </div>
      ${hotelButton}
    </article>
  `;
}

function renderFlights() {
  const el = document.querySelector("#flightList");
  const journeyCards = journeys
    .map(
      (journey) => `
        <article class="journey-card">
          <div class="flight-main">
            <div>
              <p class="eyebrow">${journey.label}</p>
              <h3>${journey.route}</h3>
            </div>
            <span class="status confirmed">${journey.status}</span>
          </div>
          <div class="journey-meta">
            <strong>${journey.duration}</strong>
            <span>${journey.cabinSummary}</span>
          </div>
          <div class="mini-stops">
            ${journey.stops
              .map(
                (stop) => `
                  <div>
                    <strong>${stop.time}</strong>
                    <span>${stop.city}</span>
                    <small>${stop.airport}${stop.dateNote ? ` · ${stop.dateNote}` : ""}</small>
                  </div>
                `,
              )
              .join("")}
          </div>
          <p>${journey.layovers.join(" · ")}</p>
        </article>
      `,
    )
    .join("");

  const groupedFlights = [
    {
      title: "去程 / Outbound",
      summary: "TPE -> IST -> ASR",
      items: flights.slice(0, 2),
    },
    {
      title: "回程 / Return",
      summary: "ASR -> IST -> TPE",
      items: flights.slice(2),
    },
  ]
    .map(
      (group) => `
        <section class="flight-group">
          <div class="flight-group-head">
            <div>
              <p class="eyebrow">Flight group / 航段群組</p>
              <h3>${group.title}</h3>
            </div>
            <strong>${group.summary}</strong>
          </div>
          <div class="flight-group-list">
            ${group.items
              .map(
                (flight) => `
                  <article class="flight-card">
                    <div class="flight-main">
                      <div>
                        <p class="eyebrow">${flight.airline}</p>
                        <h3>${flight.flightNumber}</h3>
                      </div>
                      <strong>${flight.route}</strong>
                    </div>
                    <div class="flight-times">
                      <div>
                        <span>${flight.departure.airport}</span>
                        <strong>${formatTime.format(new Date(flight.departure.datetime))}</strong>
                        <small>${flight.departure.city}</small>
                      </div>
                      <div class="duration">${flight.duration}</div>
                      <div>
                        <span>${flight.arrival.airport}</span>
                        <strong>${formatTime.format(new Date(flight.arrival.datetime))}</strong>
                        <small>${flight.arrival.city}</small>
                      </div>
                    </div>
                    <p>${flight.aircraft} · ${flight.aircraftType} · ${flight.cabin} · EcoFly ${flight.bookingClass}${flight.connection ? ` · ${flight.connection}` : ""}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
  el.innerHTML = journeyCards + groupedFlights;
}

function renderPlaces() {
  renderPlaceFilters();
  const el = document.querySelector("#placeGrid");
  const filteredMapLinks = mapLinks.filter(matchesPlaceFilter);
  const mapCards = filteredMapLinks
    .map((place) => {
      const query = encodeURIComponent(place.query);
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      return `
        <article class="info-card map-card">
          <div>
            <p class="eyebrow">${place.category}</p>
            <h3>${place.name}</h3>
            <p>${place.area}</p>
            <small>${place.address}</small>
          </div>
          <div class="map-actions">
            <a href="${mapUrl}">Open Location / 開啟定位</a>
          </div>
        </article>
      `;
    })
    .join("");

  const airportCards = airports
    .map(
      (airport) => `
        <article class="info-card airport-card">
          <div class="airport-code">${airport.code}</div>
          <h3>${airport.localName}</h3>
          <p><strong>${airport.name}</strong></p>
          <p>${airport.city}, ${airport.country} · ${airport.role}</p>
          <small>${airport.note}</small>
          <a href="${airport.url}" target="_blank" rel="noreferrer">Official site / 官方網站</a>
        </article>
      `,
    )
    .join("");

  const placeCards = places
    .map(
      (place) => `
        <article class="info-card">
          <h3>${place.group}</h3>
          <ul>
            ${place.items.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
  const ideaMarkup = activePlaceIdeas && (activePlaceFilter === "all" || activePlaceFilter === "cappadocia" || activePlaceFilter === "istanbul")
    ? renderPlaceIdeas()
    : "";
  const datedPlanMarkup = activePlaceIdeas && activePlaceIdeas.datedPlans && (activePlaceFilter === "all" || activePlaceFilter === "cappadocia" || activePlaceFilter === "istanbul")
    ? renderDatedPlans()
    : "";
  const directoryOpen = activePlaceFilter === "all" ? "" : " open";
  const locationDirectory = `
    <details class="place-directory-section"${directoryOpen}>
      <summary>
        <span>
          <span class="eyebrow">Locations / 地點</span>
          <strong>地點與定位 / Locations & Maps</strong>
        </span>
        <span class="idea-badge">${activePlaceFilter === "all" ? "展開 / Open" : "查看 / View"}</span>
      </summary>
      <div class="place-directory-grid">
        ${mapCards}
        ${activePlaceFilter === "all" || activePlaceFilter === "airports" ? airportCards : ""}
        ${activePlaceFilter === "all" ? placeCards : ""}
      </div>
    </details>
  `;
  el.innerHTML = datedPlanMarkup + ideaMarkup + locationDirectory;
}

function renderDatedPlans() {
  const visiblePlans = activePlaceIdeas.datedPlans
    .filter((plan) => activePlaceFilter === "all" || plan.city === activePlaceFilter)
    .sort((a, b) => {
      const getDay = (plan) => Number(plan.dateLabel.match(/\d+\/(\d+)/)?.[1] || 99);
      return getDay(a) - getDay(b);
    });
  if (!visiblePlans.length) return "";
  return `
    <section class="place-idea-section dated-plans-section" aria-labelledby="datedPlansTitle">
      <div class="place-idea-heading">
        <div>
          <p class="eyebrow">Date-based Plans / 日期安排</p>
          <h3 id="datedPlansTitle">依住宿位置安排 / Based on where you stay</h3>
        </div>
        <span class="idea-badge">${activePlaceIdeas.isPrivate ? "Private plan / 私人版" : "Recommended plans / 推薦行程"}</span>
      </div>
      <div class="dated-plan-list">
        ${visiblePlans.map((plan) => `
          <article class="dated-plan-card">
            <div class="dated-plan-head">
              <div>
                <p class="eyebrow">${plan.dateLabel}</p>
                <h4>${plan.title}</h4>
              </div>
              <span class="place-idea-meta">${plan.lodging}</span>
            </div>
            <p>${plan.summary}</p>
            <div class="dated-plan-steps">
              ${plan.steps.map((step) => `
                <div class="dated-plan-step">
                  <strong>${step.time}</strong>
                  <div>
                    <h5>${step.title}</h5>
                    <span class="place-idea-meta">${step.area}</span>
                    <p>${step.note}</p>
                    ${step.query ? `<div class="map-actions"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.query)}">Open Location / 開啟定位</a></div>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPlaceIdeas() {
  const matchesCity = (item) => activePlaceFilter === "all" || item.city === activePlaceFilter;
  const ideaSection = (title, items, type) => {
    const visibleItems = items.filter(matchesCity);
    if (!visibleItems.length) return "";
    return `
      <section class="place-idea-section" aria-labelledby="${type}IdeasTitle">
        <div class="place-idea-heading">
          <div>
            <p class="eyebrow">${type === "attractions" ? "Places to Consider / 景點靈感" : "Food Ideas / 美食清單"}</p>
            <h3 id="${type}IdeasTitle">${title}</h3>
          </div>
          <span class="idea-badge">參考 / Idea</span>
        </div>
        <div class="place-idea-grid">
          ${visibleItems.map((item) => {
            const query = encodeURIComponent(item.query);
            return `
              <article class="place-idea-card">
                <div>
                  <h4>${item.title}</h4>
                  <p class="place-idea-meta">${item.area || item.place}</p>
                  <p>${item.note}</p>
                </div>
                <div class="map-actions">
                  <a href="https://www.google.com/maps/search/?api=1&query=${query}">Open Location / 開啟定位</a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  };
  return ideaSection("景點靈感 / Places to Consider", activePlaceIdeas.attractions, "attractions") + ideaSection("美食清單 / Food Ideas", activePlaceIdeas.food, "food");
}

function renderPlaceFilters() {
  const el = document.querySelector("#placeFilters");
  if (!el) return;
  const filters = [
    ["all", "All / 全部"],
    ["hotels", "Hotels / 飯店"],
    ["airports", "Airports / 機場"],
    ["cappadocia", "Cappadocia / 卡帕"],
    ["istanbul", "Istanbul / 伊斯坦堡"],
  ];
  el.innerHTML = filters
    .map(([value, label]) => `<button class="${activePlaceFilter === value ? "is-active" : ""}" data-filter="${value}" type="button">${label}</button>`)
    .join("");
  el.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activePlaceFilter = button.dataset.filter;
      renderPlaces();
    });
  });
}

function matchesPlaceFilter(place) {
  if (activePlaceFilter === "all") return true;
  const text = `${place.category} ${place.area} ${place.name} ${place.address}`.toLowerCase();
  if (activePlaceFilter === "hotels") return text.includes("hotel") || text.includes("飯店");
  if (activePlaceFilter === "airports") return text.includes("airport") || text.includes("機場");
  if (activePlaceFilter === "cappadocia") return text.includes("cappadocia");
  if (activePlaceFilter === "istanbul") return text.includes("istanbul");
  return true;
}

function renderTools() {
  const el = document.querySelector("#toolGrid");
  const budgetMarkup = activeBudget ? renderBudget() : "";
  el.innerHTML = budgetMarkup + tools
    .map(
      (tool) => `
        <article class="info-card">
          <h3>${tool.title}</h3>
          <p>${tool.text}</p>
        </article>
      `,
    )
    .join("");
}

function renderBudget() {
  const budget = activeBudget;
  const rows = budget.items.map((item) => {
    const total = getBudgetTotal(item);
    const perPerson = total / budget.travelers;
    const totalTwd = convertToTwd(total, item.currency);
    return {
      ...item,
      total,
      perPerson,
      totalTwd,
      perPersonTwd: totalTwd / budget.travelers,
      expenseStatusLabel: item.expenseStatus || (item.status === "known" ? "已支出 / Spent" : "待支出 / Pending"),
      paymentMethodLabel: item.paymentMethod || budget.defaultPaymentMethod || "信用卡 / Credit Card",
    };
  });
  const totalsByCurrency = rows.reduce((totals, row) => {
    totals[row.currency] = (totals[row.currency] || 0) + row.total;
    return totals;
  }, {});
  const grandTotalTwd = rows.reduce((sum, row) => sum + row.totalTwd, 0);

  return `
    <article class="info-card budget-card">
      <div class="budget-head">
        <div>
          <p class="eyebrow">Budget / 費用</p>
          <h3>金額統計表 / Cost Summary</h3>
        </div>
        <strong>${budget.travelers} 人 / travelers</strong>
      </div>
      <div class="budget-summary">
        <div class="metric-card highlight">
          <span class="metric-label">折合 TWD 總估算 / Total in TWD</span>
          <strong>${formatMoney(grandTotalTwd, "TWD")}</strong>
          <small>每人約 / per person ${formatMoney(grandTotalTwd / budget.travelers, "TWD")}</small>
        </div>
        ${Object.entries(totalsByCurrency)
          .map(
            ([currency, total]) => `
              <div class="metric-card">
                <span class="metric-label">${currency} 已知合計 / Known total</span>
                <strong>${formatMoney(total, currency)}</strong>
                <small>每人約 / per person ${formatMoney(total / budget.travelers, currency)}</small>
              </div>
            `,
          )
          .join("")}
      </div>
      <details class="budget-details">
        <summary>費用明細 / Cost details</summary>
        <div class="budget-table-wrap">
          <table class="budget-table">
            <thead>
              <tr>
                <th>項目 / Item</th>
                <th>類別 / Category</th>
                <th>兩人合計 / Total</th>
                <th>每人 / Per Person</th>
                <th>折合 TWD / In TWD</th>
                <th>資料狀態 / Data Status</th>
                <th>支出狀態 / Expense Status</th>
                <th>支出方式 / Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>
                        <strong>${row.title}</strong>
                        <small>${row.date} · ${row.note}</small>
                      </td>
                      <td>${row.category}</td>
                      <td>${formatMoney(row.total, row.currency)}</td>
                      <td>${formatMoney(row.perPerson, row.currency)}</td>
                      <td>
                        ${formatMoney(row.totalTwd, "TWD")}
                        <small>每人約 / per person ${formatMoney(row.perPersonTwd, "TWD")}</small>
                      </td>
                      <td><span class="status ${row.status === "known" ? "confirmed" : "idea"}">${statusLabel(row.status)}</span></td>
                      <td><span class="status ${row.expenseStatusLabel.includes("已支出") ? "confirmed" : "idea"}">${row.expenseStatusLabel}</span></td>
                      <td>${row.paymentMethodLabel}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="budget-mobile-list">
          ${rows
            .map(
              (row) => `
                <section class="budget-mobile-item">
                  <div class="budget-mobile-title">
                    <strong>${row.title}</strong>
                    <span class="status ${row.status === "known" ? "confirmed" : "idea"}">${statusLabel(row.status)}</span>
                  </div>
                  <small>${row.date} · ${row.category} · ${row.note}</small>
                  <dl>
                    <div>
                      <dt>兩人合計 / Total</dt>
                      <dd>${formatMoney(row.total, row.currency)}</dd>
                    </div>
                    <div>
                      <dt>每人 / Per person</dt>
                      <dd>${formatMoney(row.perPerson, row.currency)}</dd>
                    </div>
                    <div>
                      <dt>折合 TWD / In TWD</dt>
                      <dd>${formatMoney(row.totalTwd, "TWD")}</dd>
                    </div>
                    <div>
                      <dt>支出狀態 / Expense Status</dt>
                      <dd>${row.expenseStatusLabel}</dd>
                    </div>
                    <div>
                      <dt>支出方式 / Payment Method</dt>
                      <dd>${row.paymentMethodLabel}</dd>
                    </div>
                  </dl>
                </section>
              `,
            )
            .join("")}
        </div>
      </details>
      <p class="budget-note">${budget.currencyNotes}</p>
      <p class="budget-note">待補 / Pending: ${budget.pendingItems.join("、")}</p>
    </article>
  `;
}

function getBudgetTotal(item) {
  if (typeof item.total === "number") return item.total;
  if (typeof item.perPerson === "number") return item.perPerson * activeBudget.travelers;
  return 0;
}

function formatMoney(value, currency) {
  const rounded = Number.isInteger(value) ? value : Math.round(value);
  return `${currency} ${rounded.toLocaleString("zh-Hant-TW")}`;
}

function convertToTwd(value, currency) {
  return value * (activeBudget.exchangeRatesToTwd[currency] || 1);
}

async function renderWeather() {
  const city = trip.cities[selectedDay.city];
  const el = document.querySelector("#weatherGrid");
  const tripEl = document.querySelector("#tripWeatherGrid");
  const selectedDate = selectedDay.date;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    forecast_days: "16",
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather request failed");
    const weather = await response.json();
    const dayIndex = weather.daily.time.indexOf(selectedDate);
    const hasExactForecast = dayIndex >= 0;
    const weatherCode = hasExactForecast ? weather.daily.weather_code[dayIndex] : weather.current.weather_code;
    const wind = hasExactForecast ? weather.daily.wind_speed_10m_max[dayIndex] : weather.current.wind_speed_10m;
    const rain = hasExactForecast ? weather.daily.precipitation_probability_max[dayIndex] : null;
    const temp = weather.current.temperature_2m;
    const high = hasExactForecast ? weather.daily.temperature_2m_max[dayIndex] : null;
    const low = hasExactForecast ? weather.daily.temperature_2m_min[dayIndex] : null;
    const icon = weatherIcons[weatherCode] || "🌡️";

    const markup = `
      <div class="metric-card weather-icon-card weather-summary-card">
        <span class="metric-label">Weather / 天氣</span>
        <strong aria-label="${weatherCodes[weatherCode] || "Weather"}">${icon}</strong>
        <p>${weatherCodes[weatherCode] || "Unknown"} · ${Math.round(temp)}°C</p>
      </div>
      ${metric("Temp & Rain / 溫度降雨", hasExactForecast ? `${Math.round(high)}° / ${Math.round(low)}° · Rain ${rain}%` : `${city.label} · 等日期進入預報範圍 / outside forecast range`)}
      ${metric(selectedDay.focus === "balloon" ? "🎈 Balloon Wind / 熱氣球風速" : "🌬️ Wind / 風速", `${Math.round(wind)} km/h`, selectedDay.focus === "balloon")}
    `;
    el.innerHTML = markup;
    if (tripEl) tripEl.innerHTML = markup;
  } catch (error) {
    const fallback = `
      <div class="metric-card weather-icon-card weather-summary-card">
        <span class="metric-label">Weather / 天氣</span>
        <strong aria-label="Weather unavailable">🌡️</strong>
        <p>${city.label}</p>
      </div>
      ${metric("Weather / 天氣", "暫時無法載入 / unavailable")}
      ${metric("Note / 備註", "離線時仍可查看行程 / itinerary still works offline")}
    `;
    el.innerHTML = fallback;
    if (tripEl) tripEl.innerHTML = fallback;
  }
}

function metric(label, value, highlight = false) {
  return `
    <div class="metric-card ${highlight ? "highlight" : ""}">
      <span class="metric-label">${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      button.classList.add("is-active");
      document.querySelector(`#${button.dataset.view}`).classList.add("is-active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderAll() {
  updateCountdown();
  renderStatus();
  renderCityProgress();
  renderNextItem();
  renderTimeline(document.querySelector("#todayTimeline"), selectedDay);
  renderDateTabs();
  renderDaySummary();
  renderTimeline(document.querySelector("#tripTimeline"), selectedDay);
  renderFlights();
  renderPlaces();
  renderTools();
  renderWeather();
}

export function initDashboard({ budget = null, placeIdeas = null, tripData = null } = {}) {
  if (tripData) {
    ({ airports, flights, itinerary, journeys, mapLinks, places, tools, trip } = tripData);
  }
  activeBudget = budget;
  activePlaceIdeas = placeIdeas;
  selectedDay = getActiveDay();
  setupNavigation();
  renderAll();
}
