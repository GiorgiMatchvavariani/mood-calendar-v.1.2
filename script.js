// DOM elements
const calendar     = document.getElementById('calendar');
const monthYear    = document.getElementById('monthYear');
const prevMonth    = document.getElementById('prevMonth');
const nextMonth    = document.getElementById('nextMonth');
const todayBtn     = document.getElementById('today');
const modal        = document.getElementById('moodModal');
const selectedDateEl = document.getElementById('selectedDate');
const closeModal   = document.querySelector('.close');

let currentDate = new Date();
let moods = {};                // Start empty – we load from Firestore
let currentUser = null;

// ────────────────────────────────────────────────
// Wait for Firebase auth (from your <script type="module"> in index.html)
window.addEventListener('load', () => {
  if (!window.auth || !window.db) {
    console.error("Firebase not loaded – check your <script type='module'> in index.html");
    return;
  }

  window.auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      console.log("User signed in:", user.uid);
      loadMoodsFromFirestore();
    } else {
      console.log("No user yet – waiting for anonymous sign-in");
    }
  });
});

// Load moods from Firestore
async function loadMoodsFromFirestore() {
  if (!currentUser || !window.db) return;

  try {
    const { doc, getDoc } = window; // If you exposed them globally – or import properly
    // If you didn't expose doc/getDoc → add them in index.html module script like:
    // window.doc = doc; window.getDoc = getDoc; window.setDoc = setDoc;

    const docRef = doc(window.db, "users", currentUser.uid, "data", "moods");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      moods = docSnap.data().moods || {};
      console.log("Moods loaded from Firestore:", moods);
    } else {
      console.log("No moods found in Firestore → starting fresh");
      moods = {};
    }
    renderCalendar(); // Important: refresh after load
  } catch (error) {
    console.error("Error loading moods:", error);
  }
}

// Save to Firestore
async function saveMoodsToFirestore() {
  if (!currentUser || !window.db) return;

  try {
    const { doc, setDoc } = window; // same as above
    const docRef = doc(window.db, "users", currentUser.uid, "data", "moods");
    await setDoc(docRef, { moods }, { merge: true });
    console.log("Moods saved to Firestore");
  } catch (error) {
    console.error("Error saving moods:", error);
  }
}

// ────────────────────────────────────────────────
// Calendar rendering
function renderCalendar() {
  calendar.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  // Previous month filler days
  for (let i = firstDay - 1; i >= 0; i--) {
    addDay(prevDays - i, true, 'other-month');
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    addDay(day, false);
  }
}

function addDay(day, isPrev, className = '') {
  const div = document.createElement('div');
  div.textContent = day;
  if (className) div.className = className;

  // Correct dateKey – careful with month offset
  let keyMonth = currentDate.getMonth();
  if (isPrev) keyMonth--; // previous month
  const dateKey = `${currentDate.getFullYear()}-${String(keyMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Highlight today
  const today = new Date();
  if (!isPrev && day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()) {
    div.classList.add('today');
  }

  // Show mood emoji if exists
  if (moods[dateKey]) {
    const emoji = document.createElement('span');
    emoji.className = 'mood-emoji';
    emoji.textContent = getEmoji(moods[dateKey]);
    div.appendChild(emoji);
  }

  div.addEventListener('click', () => openModal(dateKey));
  calendar.appendChild(div);
}

function getEmoji(mood) {
  const map = { happy: '😊', sad: '😔', energetic: '⚡', calm: '🧘' };
  return map[mood] || '';
}

// Modal handling
function openModal(dateKey) {
  selectedDateEl.textContent = dateKey;
  modal.style.display = 'flex';

  // Remove old listeners and add new one
  const buttons = document.querySelectorAll('.moods button');
  buttons.forEach(btn => {
    btn.onclick = async () => {   // async so we can await save
      moods[dateKey] = btn.dataset.mood;
      modal.style.display = 'none';
      renderCalendar();
      await saveMoodsToFirestore();
    };
  });
}

// Navigation
prevMonth.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
nextMonth.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
todayBtn.onclick  = () => { currentDate = new Date(); renderCalendar(); };

// Modal close
closeModal.onclick = () => { modal.style.display = 'none'; };
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = 'none';
};

// Initial render
renderCalendar();
