import { airports, flights, itinerary, journeys, places, tools, trip } from "./data/trip.js";

const today = new Date();
const tripStart = dateOnly(trip.startDate);
const tripEnd = dateOnly(trip.endDate);
let activeBudget = null;
let selectedDay = null;

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
    pill.textContent = "Trip complete";
    return;
  }
  pill.textContent = `Day ${daysBetween(tripStart, todayOnly) + 1}`;
}

function renderStatus() {
  const title = document.querySelector("#todayTitle");
  const subtitle = document.querySelector("#todaySubtitle");
  const city = trip.cities[selectedDay.city];
  const todayOnly = dateOnly(isoDate(today));

  if (todayOnly < tripStart) {
    title.textContent = `${city.label}即將開始`;
    subtitle.textContent = `距離出發還有 ${daysBetween(todayOnly, tripStart)} 天。先把飯店、接送與景點慢慢補齊。`;
  } else if (todayOnly > tripEnd) {
    title.textContent = "旅程已完成";
    subtitle.textContent = "這裡可以保留成旅行紀錄，也能作為下次行程模板。";
  } else {
    title.textContent = `${formatDate.format(dateOnly(selectedDay.date))} ${city.label}`;
    subtitle.textContent = selectedDay.focus === "balloon"
      ? "熱氣球日，風速與天氣狀態優先顯示。"
      : `今晚住宿：${selectedDay.hotel}`;
  }
}

function renderCityProgress() {
  const el = document.querySelector("#cityProgress");
  const cityWindows = [
    ["09/22", "Taipei"],
    ["09/23-09/27", "Cappadocia"],
    ["09/27-09/30", "Istanbul"],
    ["10/01", "Taipei"],
  ];
  el.innerHTML = cityWindows
    .map(([date, city]) => `<div><span>${date}</span><strong>${city}</strong></div>`)
    .join("");
}

function renderTimeline(target, day) {
  target.innerHTML = day.events
    .map(
      (event) => `
        <article class="timeline-item ${event.type}">
          <div class="time">${event.time}</div>
          <div class="timeline-body">
            <div class="item-title-row">
              <h4>${event.title}</h4>
              <span class="status ${event.status}">${event.status}</span>
            </div>
            <p>${event.location}</p>
            <small>${event.note}</small>
          </div>
        </article>
      `,
    )
    .join("");
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

  const flightCards = flights
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
    .join("");
  el.innerHTML = journeyCards + flightCards;
}

function renderPlaces() {
  const el = document.querySelector("#placeGrid");
  const airportCards = airports
    .map(
      (airport) => `
        <article class="info-card airport-card">
          <div class="airport-code">${airport.code}</div>
          <h3>${airport.localName}</h3>
          <p><strong>${airport.name}</strong></p>
          <p>${airport.city}, ${airport.country} · ${airport.role}</p>
          <small>${airport.note}</small>
          <a href="${airport.url}" target="_blank" rel="noreferrer">Official site</a>
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
  el.innerHTML = airportCards + placeCards;
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
    return { ...item, total, perPerson, totalTwd, perPersonTwd: totalTwd / budget.travelers };
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
          <p class="eyebrow">Budget</p>
          <h3>金額統計表</h3>
        </div>
        <strong>${budget.travelers} 人</strong>
      </div>
      <div class="budget-summary">
        <div class="metric-card highlight">
          <span class="metric-label">折合 TWD 總估算</span>
          <strong>${formatMoney(grandTotalTwd, "TWD")}</strong>
          <small>每人約 ${formatMoney(grandTotalTwd / budget.travelers, "TWD")}</small>
        </div>
        ${Object.entries(totalsByCurrency)
          .map(
            ([currency, total]) => `
              <div class="metric-card">
                <span class="metric-label">${currency} 已知合計</span>
                <strong>${formatMoney(total, currency)}</strong>
                <small>每人約 ${formatMoney(total / budget.travelers, currency)}</small>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="budget-table-wrap">
        <table class="budget-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>類別</th>
              <th>兩人合計</th>
              <th>每人</th>
              <th>折合 TWD</th>
              <th>狀態</th>
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
                      <small>每人約 ${formatMoney(row.perPersonTwd, "TWD")}</small>
                    </td>
                    <td><span class="status ${row.status === "known" ? "confirmed" : "idea"}">${row.status}</span></td>
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
                  <span class="status ${row.status === "known" ? "confirmed" : "idea"}">${row.status}</span>
                </div>
                <small>${row.date} · ${row.category} · ${row.note}</small>
                <dl>
                  <div>
                    <dt>兩人合計</dt>
                    <dd>${formatMoney(row.total, row.currency)}</dd>
                  </div>
                  <div>
                    <dt>每人</dt>
                    <dd>${formatMoney(row.perPerson, row.currency)}</dd>
                  </div>
                  <div>
                    <dt>折合 TWD</dt>
                    <dd>${formatMoney(row.totalTwd, "TWD")}</dd>
                  </div>
                </dl>
              </section>
            `,
          )
          .join("")}
      </div>
      <p class="budget-note">${budget.currencyNotes}</p>
      <p class="budget-note">待補：${budget.pendingItems.join("、")}</p>
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

    el.innerHTML = `
      ${metric("City", city.label)}
      ${metric("Current", `${Math.round(temp)}°C`)}
      ${metric("Condition", weatherCodes[weatherCode] || "Unknown")}
      ${metric("High / Low", hasExactForecast ? `${Math.round(high)}° / ${Math.round(low)}°` : "等日期進入預報範圍")}
      ${metric(selectedDay.focus === "balloon" ? "Balloon Wind" : "Wind", `${Math.round(wind)} km/h`, selectedDay.focus === "balloon")}
      ${metric("Rain", rain === null ? "預報範圍外" : `${rain}%`)}
    `;
  } catch (error) {
    el.innerHTML = `
      ${metric("City", city.label)}
      ${metric("Weather", "暫時無法載入")}
      ${metric("Source", "Open-Meteo")}
      ${metric("Note", "離線時仍可查看行程")}
    `;
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
  renderTimeline(document.querySelector("#tripTimeline"), selectedDay);
  renderFlights();
  renderPlaces();
  renderTools();
  renderWeather();
}

export function initDashboard({ budget = null } = {}) {
  activeBudget = budget;
  selectedDay = getActiveDay();
  setupNavigation();
  renderAll();
}
