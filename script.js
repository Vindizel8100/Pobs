const users = {
    'דוד': { password: '1234', isAdmin: true },
    'אביב': { password: '1234', isAdmin: false },
    'לאה': { password: '1234', isAdmin: false }
};

const cars = ['טויוטה 1', 'טויוטה 2', 'טויוטה 3', 'טויוטה 4', 'טויוטה 5'];

let currentUser = null;
let weekOffset = 0;
let reservations = {};

// מאזין לשינויים בlocalStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'reservations') {
        reservations = JSON.parse(e.newValue || '{}');
        updateSchedule();
    }
    if (e.key === 'reservationsHistory') {
        updateHistoryDisplay();
    }
});

async function loadReservations() {
    const savedReservations = localStorage.getItem('reservations');
    reservations = savedReservations ? JSON.parse(savedReservations) : {};
    return reservations;
}

function saveReservations() {
    localStorage.setItem('reservations', JSON.stringify(reservations));
    updateSchedule();
}

function loadHistory() {
    const history = localStorage.getItem('reservationsHistory');
    return history ? JSON.parse(history) : [];
}

function saveToHistory(action, date, carIndex, canceledBy = null) {
    const history = loadHistory();
    history.push({
        timestamp: new Date().toISOString(),
        user: currentUser,
        action: action,
        date: date,
        car: cars[carIndex],
        canceledBy: canceledBy
    });
    localStorage.setItem('reservationsHistory', JSON.stringify(history));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const history = loadHistory();
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = history.reverse().slice(0, 10).map(item => `
        <div class="history-item">
            <div>${new Date(item.timestamp).toLocaleString('he-IL')}</div>
            <div>${item.user} ${item.action === 'reserve' ? 'הזמין' : 'ביטל'} את ${item.car} לתאריך ${item.date}
            ${item.canceledBy ? `(בוטל על ידי ${item.canceledBy})` : ''}</div>
        </div>
    `).join('');
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (users[username] && users[username].password === password) {
        currentUser = username;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('userDisplay').textContent = `שלום, ${username}`;
        loadReservations();
        updateSchedule();
        updateHistoryDisplay();
    } else {
        alert('שם משתמש או סיסמה שגויים');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function prevWeek() {
    weekOffset--;
    updateSchedule();
}

function nextWeek() {
    weekOffset++;
    updateSchedule();
}

function getWeekDates() {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay() + (weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        dates.push(date.toLocaleDateString('he-IL'));
    }
    return dates;
}

function hasExistingReservation(date) {
    const reservationsForDate = Object.entries(reservations).filter(([key, user]) => {
        const [reservationDate] = key.split('-');
        return reservationDate === date;
    });
    return reservationsForDate.some(([_, user]) => user === currentUser);
}

function reserveCar(date, carIndex) {
    if (hasExistingReservation(date)) {
        alert('כבר יש לך הזמנת רכב ליום זה');
        return;
    }
    
    const key = `${date}-${carIndex}`;
    
    if (reservations[key] && reservations[key] !== currentUser) {
        if (!users[currentUser].isAdmin) {
            alert('הרכב כבר תפוס');
            return;
        }
    }
    
    reservations[key] = currentUser;
    saveReservations();
    saveToHistory('reserve', date, carIndex);
}

function cancelReservation(date, carIndex) {
    const key = `${date}-${carIndex}`;
    
    if (reservations[key] === currentUser || users[currentUser].isAdmin) {
        const canceledUser = reservations[key];
        delete reservations[key];
        saveReservations();
        saveToHistory('cancel', date, carIndex, currentUser !== canceledUser ? currentUser : null);
    } else {
        alert('אין לך הרשאה לבטל שריון זה');
    }
}

function updateSchedule() {
    const dates = getWeekDates();
    document.getElementById('currentWeek').textContent = `שבוע ${dates[0]} - ${dates[6]}`;
    
    let tableHTML = '<table><tr><th>רכב</th>';
    dates.forEach(date => {
        tableHTML += `<th>${date}</th>`;
    });
    tableHTML += '</tr>';

    cars.forEach((car, carIndex) => {
        tableHTML += `<tr><td>${car}</td>`;
        dates.forEach(date => {
            const key = `${date}-${carIndex}`;
            const reserved = reservations[key];
            
            if (reserved) {
                tableHTML += `
                    <td class="reserved">
                        ${reserved}
                        <button onclick="cancelReservation('${date}', ${carIndex})">ביטול</button>
                    </td>`;
            } else {
                const disabled = hasExistingReservation(date);
                tableHTML += `
                    <td>
                        <button onclick="reserveCar('${date}', ${carIndex})" ${disabled ? 'disabled' : ''}>שריון</button>
                    </td>`;
            }
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</table>';
    document.getElementById('scheduleTable').innerHTML = tableHTML;
}