const API_KEY = "CHANGEWITHAPIKEYFROMPEXELS";

const LOCATIONS = [
  { name: "Paris", lat: 48.8566, lng: 2.3522, type: "landmark" },
  { name: "New York", lat: 40.7128, lng: -74.0060, type: "landmark" },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, type: "landmark" },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, type: "landmark" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, type: "landmark" },
  { name: "London", lat: 51.5074, lng: -0.1278, type: "landmark" },
  { name: "Rome", lat: 41.9028, lng: 12.4964, type: "landmark" },

  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, type: "city" },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, type: "city" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, type: "city" },
  { name: "Berlin", lat: 52.52, lng: 13.405, type: "city" },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734, type: "city" },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, type: "city" },

  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, type: "street" },
  { name: "Seoul", lat: 37.5665, lng: 126.978, type: "street" },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018, type: "street" },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, type: "street" },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, type: "street" },
  { name: "Mumbai", lat: 19.076, lng: 72.8777, type: "street" },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, type: "street" }
];

let currentRound = 0;
let score = 0;
let selectedLatLng = null;
let gameData = [];
let locked = false;

let guessMarker;
let answerMarker;
let line;

// ✅ NEW
let assistMode = false;
let assistCircle = null;

const imageEl = document.getElementById("image");
const loadingEl = document.getElementById("loading");
const roundEl = document.getElementById("round");
const scoreEl = document.getElementById("score");
const submitBtn = document.getElementById("submit");

const map = L.map("map").setView([20, 0], 2);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  }
).addTo(map);

// 📍 Place guess marker
map.on("click", (e) => {
  if (locked) return;

  selectedLatLng = e.latlng;

  if (guessMarker) map.removeLayer(guessMarker);

  guessMarker = L.marker(e.latlng)
    .addTo(map)
    .bindPopup("📍 Your Guess")
    .openPopup();
});

// ✅ Assist toggle
const assistBtn = document.getElementById("assistToggle");
assistBtn.addEventListener("click", () => {
  assistMode = !assistMode;
  assistBtn.textContent = `Assist: ${assistMode ? "ON" : "OFF"}`;
});

// 🖼️ Get image
async function getImage(location) {
  let queries = [];

  if (location.type === "landmark") {
    queries = [
      `${location.name} famous landmark`,
      `${location.name} tourist attraction`,
      `${location.name} skyline`
    ];
  }

  if (location.type === "city") {
    queries = [
      `${location.name} city skyline`,
      `${location.name} downtown`,
      `${location.name} aerial view`
    ];
  }

  if (location.type === "street") {
    queries = [
      `${location.name} street view`,
      `${location.name} road city`,
      `${location.name} neighborhood`
    ];
  }

  for (let query of queries) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`,
        { headers: { Authorization: API_KEY } }
      );

      const data = await res.json();

      if (data.photos && data.photos.length > 0) {
        const filtered = data.photos.filter(p => {
          const text = (p.alt || "").toLowerCase();

          return !(
            text.includes("food") ||
            text.includes("coffee") ||
            text.includes("flower") ||
            text.includes("dish")
          );
        });

        const finalSet = filtered.length > 0 ? filtered : data.photos;

        return finalSet[Math.floor(Math.random() * finalSet.length)].src.original;
      }

    } catch (err) {
      console.log(err);
    }
  }

  return `https://picsum.photos/1200/800?random=${Math.random()}`;
}

// 🔄 Load round
async function loadRound() {
  locked = true;
  submitBtn.disabled = true;
  selectedLatLng = null;

  // 🧹 Cleanup
  if (guessMarker) map.removeLayer(guessMarker);
  if (answerMarker) map.removeLayer(answerMarker);
  if (line) map.removeLayer(line);
  if (assistCircle) {
    map.removeLayer(assistCircle);
    assistCircle = null;
  }

  const loc = gameData[currentRound];
  roundEl.textContent = currentRound + 1;

  // ✅ Assist circle
  if (assistMode) {
    let radius;

    if (loc.type === "landmark") radius = 2000000;
    else if (loc.type === "city") radius = 2000000;
    else radius = 2000000;

    assistCircle = L.circle([loc.lat, loc.lng], {
      radius: radius,
      color: "blue",
      fillColor: "blue",
      fillOpacity: 0.15
    }).addTo(map);
  }

  loadingEl.style.display = "flex";
  imageEl.style.opacity = 0;

  const img = await getImage(loc);

  imageEl.onload = () => {
    loadingEl.style.display = "none";
    imageEl.style.opacity = 1;

    locked = false;
    submitBtn.disabled = false;
  };

  imageEl.onerror = () => {
    imageEl.src = `https://picsum.photos/1200/800?random=${Math.random()}`;
  };

  imageEl.src = img;
}

// 📏 Distance
function calculateDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

// 🎯 Submit guess
submitBtn.addEventListener("click", () => {
  if (locked || !selectedLatLng) return;

  locked = true;
  submitBtn.disabled = true;

  const correct = gameData[currentRound];
  const distance = calculateDistance(selectedLatLng, correct);

  // ✅ Assist-adjusted scoring
  let points = Math.max(0, Math.round(5000 - distance));
  if (assistMode) points = Math.round(points * 0.7);

  score += points;
  scoreEl.textContent = score;

  // 🔴 Correct location
  answerMarker = L.marker([correct.lat, correct.lng])
    .addTo(map)
    .bindPopup(`✅ ${correct.name}`)
    .openPopup();

  // 🟡 Line
  line = L.polyline(
    [selectedLatLng, [correct.lat, correct.lng]],
    { color: "yellow", weight: 3 }
  ).addTo(map);

  // 🔍 Fit view
  const group = new L.featureGroup([guessMarker, answerMarker]);
  map.fitBounds(group.getBounds(), { padding: [50, 50] });

  // 🎉 Result popup
  showResult(points, distance);

  setTimeout(() => {
    currentRound++;

    if (currentRound >= gameData.length) {
      alert(`Game Over! Final Score: ${score}`);
      location.reload();
    } else {
      loadRound();
    }
  }, 2500);
});

// 🎉 Result popup
function showResult(points, distance) {
  const msg = document.createElement("div");

  msg.className = "result-popup";
  msg.innerHTML = `
    <h2>🎯 +${points} points</h2>
    <p>📍 ${Math.round(distance)} km away</p>
  `;

  document.body.appendChild(msg);

  setTimeout(() => {
    msg.remove();
  }, 1800);
}

// 🚀 Start
function startGame() {
  gameData = [...LOCATIONS].sort(() => 0.5 - Math.random());
  loadRound();
}

startGame();
