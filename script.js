const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const todayBtn = document.getElementById('today');
const modal = document.getElementById('moodModal');
const selectedDateEl = document.getElementById('selectedDate');
const closeModal = document.querySelector('.close');
let currentDate = new Date();
 let moods = JSON.parse(localStorage.getItem('moods')) || {}; // { '2026-02-04': 'happy' }
const db = window.db;  // from the firebase init above
let currentUser = null;

// Listen for user (in case auth loads async)
window.auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loadMoodsFromFirestore();
  }
});

// Load moods from Firestore once user is ready
async function loadMoodsFromFirestore() {
  if (!currentUser) return;

  try {
    const docRef = doc(db, "users", currentUser.uid, "data", "moods");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      moods = docSnap.data().moods || {};  // { "2026-02-04": "happy", ... }
      console.log("Moods loaded from Firestore:", moods);
      renderCalendar();  // Refresh UI
    } else {
      console.log("No previous moods → starting fresh");
      moods = {};
    }
  } catch (error) {
    console.error("Error loading moods:", error);
  }
}

// Save moods to Firestore (call this instead of localStorage.setItem)
async function saveMoodsToFirestore() {
  if (!currentUser) return;

  try {
    const docRef = doc(db, "users", currentUser.uid, "data", "moods");
    await setDoc(docRef, { moods }, { merge: true });
    console.log("Moods saved to Firestore");
  } catch (error) {
    console.error("Error saving moods:", error);
  }
}

// Update your openModal / mood selection:
function openModal(dateKey) {
  selectedDateEl.textContent = dateKey;
  modal.style.display = 'flex';

  document.querySelectorAll('.moods button').forEach(btn => {
    btn.onclick = async () => {
      moods[dateKey] = btn.dataset.mood;
      modal.style.display = 'none';
      renderCalendar();
      await saveMoodsToFirestore();  // ← Cloud save!
    };
  });
}
function renderCalendar() {
  calendar.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    addDay(prevDays - i, true, 'other-month');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    addDay(day, false);
  }
}

function addDay(day, isPrev, className = '') {
  const div = document.createElement('div');
  div.textContent = day;
  div.className = className;
  const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + (isPrev ? 0 : 1))}-${String(day).padStart(2, '0')}`;
  if (!isPrev && day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth()) div.classList.add('today');
  if (moods[dateKey]) {
    const emoji = document.createElement('span');
    emoji.className = 'mood-emoji';
    emoji.textContent = getEmoji(moods[dateKey]);
    div.appendChild(emoji);
  }
  div.addEventListener('click', () => openModal(dateKey));
  calendar.appendChild(div);
}

function openModal(dateKey) {
  selectedDateEl.textContent = dateKey;
  modal.style.display = 'flex';
  document.querySelectorAll('.moods button').forEach(btn => {
    btn.onclick = () => {
      moods[dateKey] = btn.dataset.mood;
      localStorage.setItem('moods', JSON.stringify(moods));
      modal.style.display = 'none';
      renderCalendar();
    };
  });
}

function getEmoji(mood) {
  const map = { happy: '😊', sad: '😔', energetic: '⚡', calm: '🧘' };
  return map[mood] || '';
}

prevMonth.onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
nextMonth.onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
todayBtn.onclick = () => { currentDate = new Date(); renderCalendar(); };
closeModal.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

renderCalendar();
