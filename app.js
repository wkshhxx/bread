// --- Global App State ---
const BREAD_TEMPLATES = {
    croissant: { name: '크루아상', emoji: '🥐', calories: 320, carb: 35, protein: 5, fat: 18, sugar: 8, gi: 75, type: '일반 빵', ingredients: ['유기농 강력분', '천연 버터', '정제 백설탕', '효모', '정제소금'] },
    soboro: { name: '소보로빵', emoji: '🍞', calories: 400, carb: 55, protein: 7, fat: 12, sugar: 18, gi: 80, type: '일반 빵', ingredients: ['강력분', '가공 버터', '정제 백설탕', '땅콩버터', '효모', '정제소금'] },
    redbean: { name: '단팥빵', emoji: '🥯', calories: 340, carb: 60, protein: 6, fat: 6, sugar: 24, gi: 82, type: '일반 빵', ingredients: ['강력분', '팥앙금(백설탕 가득)', '정제 백설탕', '효모', '검은깨'] },
    baguette: { name: '바게트(3조각)', emoji: '🥖', calories: 150, carb: 32, protein: 5, fat: 1, sugar: 1, gi: 70, type: '클래식 빵', ingredients: ['프랑스산 밀가루', '효모', '천일염', '물'] },
    cake: { name: '초코케이크', emoji: '🍰', calories: 450, carb: 50, protein: 5, fat: 25, sugar: 30, gi: 85, type: '디저트', ingredients: ['박력분', '백설탕', '가공 버터', '초코칩', '코코아매스', '식용색소'] },
    sourdough: { name: '통밀 사워도우', emoji: '🌾', calories: 120, carb: 24, protein: 4, fat: 1, sugar: 0.5, gi: 45, type: '웰빙 빵', ingredients: ['유기농 통밀가루', '천연 발효종', '정제염', '물'] },
    saltbread: { name: '일반 소금빵', emoji: '🥐', calories: 270, carb: 38, protein: 4, fat: 12, sugar: 4, gi: 75, type: '일반 빵', ingredients: ['강력분(밀)', '가공 버터', '마가린(트랜스지방)', '정제소금', '백설탕'] },
    rice_saltbread: { name: '천연버터 쌀소금빵', emoji: '🌾', calories: 220, carb: 34, protein: 5, fat: 7, sugar: 1, gi: 50, type: '웰빙 빵', ingredients: ['국산 쌀가루', '뉴질랜드 천연 앵커버터', '프랑스 게랑드 토판 천일염', '효모', '물'] }
};

let customBreadCounter = 1;
let selectedBreadId = null;
let plateBread = null;

let eatenBreads = [];
let totalCalories = 0;
let totalCarb = 0;
let totalProtein = 0;
let totalFat = 0;
let totalSugar = 0;
let dailyLimit = 420; // Default limit for 12 years (20% of 2100kcal)
let currentAge = 12; // Default age

// Sub-charts navigation
let activeSubChart = 'nutrient'; // 'nutrient' or 'weight'

// Audio elements
let audioCtx = null;
let sirenInterval = null;
let sirenOsc = null;
let sirenGain = null;
let isSirenPlaying = false;

// Career Lab R&D State
let activeCareerRecipe = 'soboro'; // 'soboro' or 'cake'
let rdOptimizations = {
    flour: false, // White -> Whole Wheat
    sugar: false, // Sugar -> Allulose
    butter: false  // Butter -> Avocado Oil
};

// Chart.js references
let bloodSugarChart = null;
let nutrientChart = null;
let weightChart = null;

// --- Web Audio Engine ---
function initAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        document.getElementById('audio-init-modal').classList.add('hidden');
        
        // Short beep to confirm activation
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.error('AudioContext Web API error:', e);
        document.getElementById('audio-init-modal').classList.add('hidden');
    }
}

// Crunchy eating sound
function playCrunchSound() {
    if (!audioCtx) return;
    
    // Simulate crunchy bite with white noise & filter sweep
    const bufferSize = audioCtx.sampleRate * 0.15; // 0.15s duration
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.12);
    filter.Q.setValueAtTime(3, audioCtx.currentTime);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseNode.start();
}

// Double click/crunch rhythm for eating
function triggerEatSoundRhythm() {
    playCrunchSound();
    setTimeout(playCrunchSound, 150);
}

// Siren synthesizer
function startSirenSound() {
    if (!audioCtx || isSirenPlaying) return;
    
    try {
        isSirenPlaying = true;
        sirenOsc = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();
        
        sirenOsc.type = 'sawtooth';
        sirenOsc.frequency.setValueAtTime(450, audioCtx.currentTime);
        
        sirenGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        
        sirenOsc.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOsc.start();
        
        let toggle = true;
        sirenInterval = setInterval(() => {
            if (!sirenOsc || !audioCtx) return;
            const now = audioCtx.currentTime;
            sirenOsc.frequency.cancelScheduledValues(now);
            sirenOsc.frequency.setValueAtTime(toggle ? 450 : 700, now);
            sirenOsc.frequency.linearRampToValueAtTime(toggle ? 700 : 450, now + 0.38);
            toggle = !toggle;
        }, 400);
    } catch (err) {
        console.error('Siren play error:', err);
    }
}

function stopSirenSound() {
    if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
    }
    if (sirenOsc) {
        try {
            sirenOsc.stop();
            sirenOsc.disconnect();
        } catch (e) {}
        sirenOsc = null;
    }
    if (sirenGain) {
        sirenGain.disconnect();
        sirenGain = null;
    }
    isSirenPlaying = false;
}

// --- App Control Logic ---

// Set selected bread from showcase
function selectBread(breadId) {
    // Unselect previous
    const prevSelected = document.querySelector('.bread-item.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
    
    // Select new
    selectedBreadId = breadId;
    const itemElem = document.querySelector(`.bread-item[data-id="${breadId}"]`);
    if (itemElem) {
        itemElem.classList.add('selected');
    }
    
    // Copy template to plate state
    let breadData = null;
    if (breadId.startsWith('custom_')) {
        // Find custom bread in local list
        breadData = customBreadsList.find(b => b.id === breadId);
    } else {
        breadData = BREAD_TEMPLATES[breadId];
    }
    
    if (breadData) {
        plateBread = { ...breadData, id: breadId };
        
        // Update plate UI
        const platePlaceholder = document.getElementById('plate-placeholder');
        const plateBreadDisp = document.getElementById('plate-bread');
        
        platePlaceholder.style.display = 'none';
        plateBreadDisp.innerHTML = plateBread.emoji;
        plateBreadDisp.className = 'plate-bread-display'; // Reset animations
        
        // Enable eat button
        document.getElementById('btn-eat').disabled = false;

        // Update detail panel
        updateDetailPanel(plateBread);
    }
}

// Update detail panel UI with bread details
function updateDetailPanel(bread) {
    const placeholder = document.getElementById('detail-placeholder');
    const content = document.getElementById('detail-content');
    
    if (!bread) {
        placeholder.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    
    placeholder.classList.add('hidden');
    content.classList.remove('hidden');
    
    document.getElementById('detail-emoji').innerText = bread.emoji;
    document.getElementById('detail-name').innerText = bread.name;
    document.getElementById('detail-type-badge').innerText = bread.type || '일반 베이커리';
    
    document.getElementById('detail-cal').innerText = `${bread.calories} kcal`;
    document.getElementById('detail-carb').innerText = `${bread.carb} g`;
    document.getElementById('detail-protein').innerText = `${bread.protein} g`;
    document.getElementById('detail-fat').innerText = `${bread.fat} g`;
    document.getElementById('detail-sugar').innerText = `${bread.sugar} g`;
    document.getElementById('detail-gi').innerText = bread.gi;
    
    // GI Badge logic
    const giWrap = document.getElementById('detail-gi-badge-wrap');
    let giClass = 'gi-safe';
    let giText = '저혈당지수 (안심)';
    
    if (bread.gi > 70) {
        giClass = 'gi-danger';
        giText = '고혈당지수 (피해야 함)';
    } else if (bread.gi > 55) {
        giClass = 'gi-warn';
        giText = '중혈당지수 (적정 섭취)';
    }
    giWrap.innerHTML = `<span class="gi-badge ${giClass}"><i class="fa-solid fa-droplet"></i> ${giText}</span>`;
    
    // Render ingredients tags
    const ingDiv = document.getElementById('detail-ingredients');
    ingDiv.innerHTML = '';
    
    const ingredients = bread.ingredients || [];
    ingredients.forEach(ing => {
        const span = document.createElement('span');
        span.className = 'ing-tag';
        
        // Highlight healthy / unhealthy ingredients
        const ingLower = ing.toLowerCase();
        if (ingLower.includes('통밀') || ingLower.includes('알룰로스') || ingLower.includes('아보카도') || ingLower.includes('쌀가루') || ingLower.includes('천연') || ingLower.includes('토판') || ingLower.includes('천일염') || ingLower.includes('발효종') || ingLower.includes('효모')) {
            span.classList.add('ing-healthy');
        } else if (ingLower.includes('설탕') || ingLower.includes('마가린') || ingLower.includes('액상과당') || ingLower.includes('가공') || ingLower.includes('트랜스') || ingLower.includes('색소')) {
            span.classList.add('ing-bad');
        }
        
        span.innerText = ing;
        ingDiv.appendChild(span);
    });
}

// Eat bread on plate with animation
function eatBread() {
    if (!plateBread) return;
    
    const plateBreadDisp = document.getElementById('plate-bread');
    const btnEat = document.getElementById('btn-eat');
    btnEat.disabled = true; // Disable until animation completes
    
    // Trigger sound
    triggerEatSoundRhythm();
    
    // Eating animation steps
    setTimeout(() => {
        plateBreadDisp.classList.add('bite-1');
    }, 150);
    
    setTimeout(() => {
        plateBreadDisp.classList.add('bite-2');
    }, 300);
    
    setTimeout(() => {
        plateBreadDisp.classList.add('bite-3');
    }, 450);
    
    setTimeout(() => {
        plateBreadDisp.classList.add('bite-4');
        
        // Push to eaten array and update
        eatenBreads.push({ ...plateBread, eatenAt: eatenBreads.length });
        
        // Calculate totals
        totalCalories += plateBread.calories;
        totalCarb += plateBread.carb;
        totalProtein += plateBread.protein;
        totalFat += plateBread.fat;
        totalSugar += plateBread.sugar;
        
        updateMonitoringUI();
        updateCharts();
        
        // Reset plate
        plateBread = null;
        plateBreadDisp.innerHTML = '';
        plateBreadDisp.className = 'plate-bread-display';
        document.getElementById('plate-placeholder').style.display = 'block';
        
        // Reset details panel
        updateDetailPanel(null);
        
        // Clear showcase selection visual
        const prevSelected = document.querySelector('.bread-item.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
        selectedBreadId = null;
    }, 600);
}

// Clear plate
function clearPlate() {
    plateBread = null;
    const plateBreadDisp = document.getElementById('plate-bread');
    plateBreadDisp.innerHTML = '';
    plateBreadDisp.className = 'plate-bread-display';
    document.getElementById('plate-placeholder').style.display = 'block';
    document.getElementById('btn-eat').disabled = true;
    
    // Reset details panel
    updateDetailPanel(null);
    
    const prevSelected = document.querySelector('.bread-item.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
    selectedBreadId = null;
}

// Reset all eating history and health status
function resetHistory() {
    // Stop siren
    stopSirenSound();
    
    // Clear eaten lists
    eatenBreads = [];
    totalCalories = 0;
    totalCarb = 0;
    totalProtein = 0;
    totalFat = 0;
    totalSugar = 0;
    
    // Reset plate bread
    plateBread = null;
    const plateBreadDisp = document.getElementById('plate-bread');
    plateBreadDisp.innerHTML = '';
    plateBreadDisp.className = 'plate-bread-display';
    document.getElementById('plate-placeholder').style.display = 'block';
    document.getElementById('btn-eat').disabled = true;
    
    // Reset details panel
    updateDetailPanel(null);
    
    // Unselect showcase item
    const prevSelected = document.querySelector('.bread-item.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
    selectedBreadId = null;
    
    // Update UI and Charts
    updateMonitoringUI();
    updateCharts();
}

// Change calorie limit
function updateLimit() {
    const limitInput = document.getElementById('input-limit');
    let value = parseInt(limitInput.value);
    
    if (isNaN(value) || value < 100) {
        value = 100;
        limitInput.value = 100;
    } else if (value > 2000) {
        value = 2000;
        limitInput.value = 2000;
    }
    
    dailyLimit = value;
    document.getElementById('limit-calories').innerText = dailyLimit;
    
    updateMonitoringUI();
    updateCharts();
}

// Real-time UI updates (Guage and Siren)
function updateMonitoringUI() {
    // Animate calories counter
    const calSpan = document.getElementById('current-calories');
    const startVal = parseInt(calSpan.innerText);
    animateCounter(calSpan, startVal, totalCalories, 400);
    
    const percentage = Math.min((totalCalories / dailyLimit) * 100, 100);
    const progressBar = document.getElementById('calories-progress');
    progressBar.style.width = `${percentage}%`;
    
    const sirenLight = document.getElementById('siren-light');
    const statusMsg = document.getElementById('status-message');
    const warningCard = document.getElementById('danger-warning-card');
    
    // Reset classes
    sirenLight.className = 'siren-light';
    progressBar.className = 'progress-bar-fill';
    
    const sirenText = sirenLight.querySelector('.siren-indicator-text');
    
    if (totalCalories > dailyLimit) {
        // Red ALERT state
        sirenLight.classList.add('status-danger');
        progressBar.classList.add('progress-danger');
        sirenText.innerText = 'DANGER';
        
        statusMsg.className = 'status-msg-danger';
        statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 칼로리 한도 초과! 신체 경고등이 켜졌습니다.';
        
        warningCard.classList.remove('hidden');
        
        // Start physical sound warning
        startSirenSound();
    } else if (totalCalories > dailyLimit * 0.8) {
        // Amber WARN state
        sirenLight.classList.add('status-warn');
        progressBar.classList.add('progress-warn');
        sirenText.innerText = 'WARNING';
        
        statusMsg.className = 'status-msg-warn';
        statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 주의 단계! 한도에 근접하고 있습니다.';
        
        warningCard.classList.add('hidden');
        stopSirenSound();
    } else {
        // Green SAFE state
        sirenLight.classList.add('status-safe');
        progressBar.classList.add('progress-safe');
        sirenText.innerText = 'SAFE';
        
        statusMsg.className = 'status-msg-safe';
        statusMsg.innerHTML = '<i class="fa-solid fa-circle-check"></i> 권장량 이내입니다. 안전한 상태입니다!';
        
        warningCard.classList.add('hidden');
        stopSirenSound();
    }
}

// Numerical count-up animation helper
function animateCounter(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// --- Graph Visualization Logic ---

// Initialize Charts
function initCharts() {
    // 1. Blood sugar chart
    const bsCtx = document.getElementById('bloodSugarChart').getContext('2d');
    
    // Time labels: 06:00 to 24:00 (19 hours labels)
    const hours = [];
    for(let h = 6; h <= 24; h++) {
        hours.push(`${h < 10 ? '0' + h : h}:00`);
    }
    
    // Baseline points (stable 80 mg/dL)
    const baselineData = Array(hours.length).fill(80);
    const currentGlucoseData = Array(hours.length).fill(80);
    
    bloodSugarChart = new Chart(bsCtx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: '현재 나의 혈당 수치',
                    data: currentGlucoseData,
                    borderColor: '#00d2ff',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.45,
                    pointRadius: 4,
                    pointBackgroundColor: '#00d2ff'
                },
                {
                    label: '공복 표준 혈당 기준 (80 mg/dL)',
                    data: baselineData,
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f0f6fc', font: { family: 'Noto Sans KR', size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e', font: { size: 10 } }
                },
                y: {
                    min: 50,
                    max: 220,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e', font: { size: 10 } }
                }
            }
        }
    });

    // 2. Nutrients Doughnut Chart
    const nutrCtx = document.getElementById('nutrientChart').getContext('2d');
    nutrientChart = new Chart(nutrCtx, {
        type: 'doughnut',
        data: {
            labels: ['탄수화물(g)', '단백질(g)', '지방(g)', '당류(g)'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#00d2ff', '#ffd700', '#ff8c00', '#ff0055'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f0f6fc', font: { family: 'Noto Sans KR', size: 11 } }
                }
            },
            cutout: '65%'
        }
    });

    // 3. Weight forecast Line Chart
    const wtCtx = document.getElementById('weightChart').getContext('2d');
    const days = Array.from({length: 31}, (_, i) => `${i}일차`);
    const defaultWeight = Array(31).fill(65);
    
    weightChart = new Chart(wtCtx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: '예상 체중 변화 (kg)',
                data: defaultWeight,
                borderColor: '#ffd700',
                backgroundColor: 'rgba(255, 215, 0, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f0f6fc', font: { family: 'Noto Sans KR', size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#8b949e', font: { size: 9 }, maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e', font: { size: 10 } }
                }
            }
        }
    });
}

// Calculate glucose level at time t (hour decimal) based on eaten bread list
function getGlucoseContribution(t, eatHour, gi, carb, sugar) {
    if (t < eatHour) return 0;
    const dt = t - eatHour;
    if (dt > 8) return 0; // Glycemic impact fades away in 8 hours
    
    // Compute raw impact factor based on carbohydrate and sugar quantity
    // Sourdough has high fiber and low GI, which controls insulin/glycemic speed
    const glycemicImpact = (carb * 0.35 + sugar * 0.95) * (gi / 90);
    
    if (gi > 65) {
        // Refined breads (High GI): rapid rise and sharp sugar crash
        const rise = 4.8 * glycemicImpact * dt * Math.exp(-1.3 * dt);
        const crash = dt > 1.5 ? 2.8 * glycemicImpact * (dt - 1.5) * Math.exp(-0.75 * (dt - 1.5)) : 0;
        return rise - crash;
    } else {
        // Whole grains (Low GI): flat curve, steady release, no crash
        return 1.8 * glycemicImpact * dt * Math.exp(-0.65 * dt);
    }
}

// Update chart datasets on state change
function updateCharts() {
    if (!bloodSugarChart || !nutrientChart || !weightChart) return;
    
    // 1. Calculate Blood Sugar curve
    // Map eat times: 1st bread eaten at 08:00, 2nd at 12:00, 3rd at 16:00, 4th at 20:00, 5th+ at 22:00
    const eatHours = [8, 12, 16, 20, 22];
    const glucosePoints = [];
    
    for (let hour = 6; hour <= 24; hour++) {
        let hourContribution = 0;
        
        eatenBreads.forEach((bread, idx) => {
            const slotHour = eatHours[Math.min(idx, eatHours.length - 1)];
            hourContribution += getGlucoseContribution(hour, slotHour, bread.gi, bread.carb, bread.sugar);
        });
        
        // Clamp minimum blood sugar at 60 (severe sugar crash)
        let totalGlucose = Math.max(80 + hourContribution, 55);
        glucosePoints.push(parseFloat(totalGlucose.toFixed(1)));
    }
    
    bloodSugarChart.data.datasets[0].data = glucosePoints;
    bloodSugarChart.update();
    
    // 2. Nutrients Doughnut
    if (eatenBreads.length === 0) {
        nutrientChart.data.datasets[0].data = [0, 0, 0, 0];
    } else {
        nutrientChart.data.datasets[0].data = [
            parseFloat(totalCarb.toFixed(1)),
            parseFloat(totalProtein.toFixed(1)),
            parseFloat(totalFat.toFixed(1)),
            parseFloat(totalSugar.toFixed(1))
        ];
    }
    nutrientChart.update();
    
    // 3. Weight forecast projection (30 Days)
    const weightForecast = [];
    const baselineWeight = 65; // kg
    
    // 1 kg of fat = ~7700 calories
    // If daily calorie intake exceeds limit, gain weight. If below, stay stable.
    const dailySurplus = Math.max(totalCalories - dailyLimit, 0);
    
    for (let day = 0; day <= 30; day++) {
        const addedWeight = (dailySurplus * day) / 7700;
        weightForecast.push(parseFloat((baselineWeight + addedWeight).toFixed(2)));
    }
    
    weightChart.data.datasets[0].data = weightForecast;
    weightChart.update();
}

// Tab switcher for Nutrients vs Weight Forecast
function switchSubChart(chartType) {
    activeSubChart = chartType;
    
    const btnNutrient = document.getElementById('btn-tab-nutrient');
    const btnWeight = document.getElementById('btn-tab-weight');
    const wrapNutrient = document.getElementById('nutrient-chart-wrap');
    const wrapWeight = document.getElementById('weight-chart-wrap');
    const desc = document.getElementById('sub-chart-desc');
    
    if (chartType === 'nutrient') {
        btnNutrient.classList.add('active');
        btnWeight.classList.remove('active');
        wrapNutrient.classList.remove('hidden');
        wrapWeight.classList.add('hidden');
        desc.innerText = '탄수화물과 설탕의 섭취 비율이 높을수록 몸의 인슐린 분비가 불균형해집니다.';
    } else {
        btnNutrient.classList.remove('active');
        btnWeight.classList.add('active');
        wrapNutrient.classList.add('hidden');
        wrapWeight.classList.remove('hidden');
        
        const surplus = Math.max(totalCalories - dailyLimit, 0);
        if (surplus > 0) {
            const gain = ((surplus * 30) / 7700).toFixed(1);
            desc.innerHTML = `현재 식습관(초과 ${surplus}kcal)을 30일간 지속 시 <strong class='text-danger'>+${gain}kg</strong> 증량이 예측됩니다.`;
        } else {
            desc.innerText = '권장 칼로리 이내의 식단을 유지하면 체중이 안정적으로 조절됩니다.';
        }
    }
}

// --- 3. Career Lab Healthy Baking R&D Engine ---

const CAREER_RECIPE_BASES = {
    soboro: { name: '소보로빵', emoji: '🍞', calories: 400, carb: 55, protein: 7, fat: 12, sugar: 18, gi: 80 },
    cake: { name: '초코케이크', emoji: '🍰', calories: 450, carb: 50, protein: 5, fat: 25, sugar: 30, gi: 85 }
};

// Switch R&D target bread
function selectCareerRecipe(recipeId) {
    activeCareerRecipe = recipeId;
    
    // Toggle active buttons
    document.getElementById('recipe-soboro').className = recipeId === 'soboro' ? 'recipe-tab-btn active' : 'recipe-tab-btn';
    document.getElementById('recipe-cake').className = recipeId === 'cake' ? 'recipe-tab-btn active' : 'recipe-tab-btn';
    
    // Update labels and descriptions of R&D table
    const flourDesc = document.getElementById('flour-desc');
    const sugarDesc = document.getElementById('sugar-desc');
    const butterDesc = document.getElementById('butter-desc');
    
    if (recipeId === 'soboro') {
        flourDesc.innerText = '백밀가루 (정제 탄수화물, 높은 GI)';
        sugarDesc.innerText = '정제 백설탕 (순수 당류, 당뇨 유발)';
        butterDesc.innerText = '가공 버터 (포화지방, 콜레스테롤)';
    } else {
        flourDesc.innerText = '일반 박력분 (혈당 상승 주범)';
        sugarDesc.innerText = '초콜릿 & 액상과당 (인슐린 폭발 원인)';
        butterDesc.innerText = '동물성 버터 & 크림 (높은 포화지방)';
    }
    
    // Reset toggle switches
    document.getElementById('toggle-flour').checked = false;
    document.getElementById('toggle-sugar').checked = false;
    document.getElementById('toggle-butter').checked = false;
    
    // Reset internal object
    rdOptimizations.flour = false;
    rdOptimizations.sugar = false;
    rdOptimizations.butter = false;
    
    optimizeRecipe();
}

// Calculate optimized metrics in real-time
function optimizeRecipe() {
    // Read checkbox values
    rdOptimizations.flour = document.getElementById('toggle-flour').checked;
    rdOptimizations.sugar = document.getElementById('toggle-sugar').checked;
    rdOptimizations.butter = document.getElementById('toggle-butter').checked;
    
    const base = CAREER_RECIPE_BASES[activeCareerRecipe];
    
    let calories = base.calories;
    let sugar = base.sugar;
    let gi = base.gi;
    let carb = base.carb;
    let fat = base.fat;
    let protein = base.protein;
    
    // Apply flour substitution (Whole Wheat)
    if (rdOptimizations.flour) {
        calories -= 20;
        gi -= 25; // Drastic drop in GI index
        carb -= 5; // Replaced by fiber
    }
    
    // Apply sugar substitution (Allulose / Stevia)
    if (rdOptimizations.sugar) {
        calories -= 130; // Allulose has near 0 calories
        sugar = parseFloat((sugar * 0.1).toFixed(1)); // 90% sugar reduction
        gi -= 35; // Almost no glycemic load
    }
    
    // Apply butter substitution (Avocado Oil / Applesauce)
    if (rdOptimizations.butter) {
        calories -= 50;
        fat -= 8;
        gi -= 5;
    }
    
    // R&D report box updates
    document.getElementById('rd-old-cal').innerText = base.calories;
    document.getElementById('rd-new-cal').innerText = calories;
    
    const calDiffPct = Math.round(((base.calories - calories) / base.calories) * 100);
    const calDiffElem = document.getElementById('rd-cal-diff');
    calDiffElem.innerText = `${calDiffPct}% 감소`;
    
    document.getElementById('rd-old-sugar').innerText = base.sugar;
    document.getElementById('rd-new-sugar').innerText = sugar;
    
    const sugarDiffPct = Math.round(((base.sugar - sugar) / base.sugar) * 100);
    const sugarDiffElem = document.getElementById('rd-sugar-diff');
    sugarDiffElem.innerText = `${sugarDiffPct}% 감소`;
    
    // Success feedback and career messages
    const feedbackBox = document.getElementById('rd-feedback');
    const toggleCount = [rdOptimizations.flour, rdOptimizations.sugar, rdOptimizations.butter].filter(Boolean).length;
    
    if (toggleCount === 3) {
        feedbackBox.className = 'rd-feedback-box active-success';
        feedbackBox.innerHTML = `<i class="fa-solid fa-medal text-warning"></i> <strong>최고의 건강 빵 R&D 완성!</strong> 백밀가루, 설탕, 버터를 모두 건강하게 대체하여 칼로리를 ${calDiffPct}%, 당을 ${sugarDiffPct}% 줄인 획기적인 기능성 웰빙 빵을 창조했습니다.`;
    } else if (toggleCount > 0) {
        feedbackBox.className = 'rd-feedback-box';
        feedbackBox.innerHTML = `<i class="fa-solid fa-lightbulb icon-color"></i> 좋은 시도입니다! 대체 재료를 더 많이 융합하면 혈당 걱정 없는 건강 레시피를 완성할 수 있습니다. (현재 ${toggleCount}개 대체제 적용)`;
    } else {
        feedbackBox.className = 'rd-feedback-box';
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-question"></i> 재료들을 대체해 건강한 제과제빵 처방을 설계해 보세요.`;
    }
}

// Store generated custom bread
let customBreadsList = [];

// Bake and register the customized bread to showcase
function bakeCustomBread() {
    const base = CAREER_RECIPE_BASES[activeCareerRecipe];
    
    let calories = base.calories;
    let sugar = base.sugar;
    let gi = base.gi;
    let carb = base.carb;
    let fat = base.fat;
    let protein = base.protein;
    
    let namePrefix = 'R&D ';
    let emoji = activeCareerRecipe === 'soboro' ? '🌾' : '🍫';
    
    if (rdOptimizations.flour) {
        calories -= 20; gi -= 25; carb -= 5;
    }
    if (rdOptimizations.sugar) {
        calories -= 130; sugar = parseFloat((sugar * 0.1).toFixed(1)); gi -= 35;
    }
    if (rdOptimizations.butter) {
        calories -= 50; fat -= 8; gi -= 5;
    }
    
    const toggleCount = [rdOptimizations.flour, rdOptimizations.sugar, rdOptimizations.butter].filter(Boolean).length;
    if (toggleCount === 3) {
        namePrefix = '웰니스 ';
        emoji = activeCareerRecipe === 'soboro' ? '🎖️' : '🌟';
    } else if (toggleCount === 0) {
        alert('대체재를 하나 이상 활성화한 후에 빵을 구워주세요!');
        return;
    }
    
    const customId = `custom_${customBreadCounter++}`;
    const customName = `${namePrefix}${base.name}`;
    
    // Dynamic ingredients list based on optimizations
    let customIngredients = [];
    if (activeCareerRecipe === 'soboro') {
        customIngredients = [
            rdOptimizations.flour ? '유기농 통밀가루' : '정제 밀가루',
            rdOptimizations.butter ? '불포화 아보카도유' : '가공 버터',
            rdOptimizations.sugar ? '천연 대체당(알룰로스)' : '정제 백설탕',
            '땅콩버터',
            '효모',
            '정제소금'
        ];
    } else { // cake
        customIngredients = [
            rdOptimizations.flour ? '유기농 통밀가루' : '일반 박력분',
            rdOptimizations.butter ? '아보카도유 대체제' : '동물성 버터 & 크림',
            rdOptimizations.sugar ? '천연 대체당(알룰로스)' : '초콜릿 & 액상과당',
            '코코아매스',
            '효모'
        ];
    }
    
    const customBreadObj = {
        id: customId,
        name: customName,
        emoji: emoji,
        calories: calories,
        carb: carb,
        protein: protein,
        fat: fat,
        sugar: sugar,
        gi: gi,
        type: toggleCount === 3 ? 'R&D 최적화 빵' : 'R&D 시험용 빵',
        ingredients: customIngredients
    };
    
    // Store in global custom list
    customBreadsList.push(customBreadObj);
    
    // Add visually to showcase
    const showcase = document.querySelector('.bread-showcase');
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'bread-item custom-bread-item';
    itemDiv.setAttribute('data-id', customId);
    itemDiv.onclick = () => selectBread(customId);
    
    itemDiv.innerHTML = `
        <div class="bread-emoji">${emoji}</div>
        <div class="bread-info">
            <span class="bread-name" style="color: #ffd700;">${customName}</span>
            <span class="bread-cal">${calories} kcal</span>
        </div>
    `;
    
    // Insert after standard breads, before plate area
    showcase.appendChild(itemDiv);
    
    // Highlight and load onto plate
    selectBread(customId);
    
    // Spark animation success beep
    if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5 note
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5 note
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// --- App Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateAgeAndCaloriesUI();
});

// --- Age & Calorie Guide Engine ---

// Toggle Virtual Keypad display
function toggleKeypad() {
    const keypad = document.getElementById('age-keypad');
    const btn = document.getElementById('btn-toggle-keypad');
    
    if (keypad.classList.contains('hidden')) {
        keypad.classList.remove('hidden');
        btn.innerHTML = '<i class="fa-solid fa-keyboard"></i> 닫기';
    } else {
        keypad.classList.add('hidden');
        btn.innerHTML = '<i class="fa-solid fa-keyboard"></i> 나이 설정';
    }
}

// Press virtual age key
function pressAgeKey(num) {
    let ageStr = currentAge.toString();
    if (ageStr === '0') {
        ageStr = num.toString();
    } else {
        // Limit to max 3 digits
        if (ageStr.length < 3) {
            ageStr += num.toString();
        }
    }
    
    let ageVal = parseInt(ageStr);
    if (ageVal > 120) {
        ageVal = 120; // Maximum realistic human age limit
    }
    
    currentAge = ageVal;
    updateAgeAndCaloriesUI();
}

// Clear virtual age input
function clearAge() {
    currentAge = 0;
    updateAgeAndCaloriesUI();
}

// Backspace virtual age input
function backspaceAge() {
    let ageStr = currentAge.toString();
    if (ageStr.length > 1) {
        ageStr = ageStr.slice(0, -1);
        currentAge = parseInt(ageStr);
    } else {
        currentAge = 0;
    }
    updateAgeAndCaloriesUI();
}

// Calculate recommended daily calories based on Age (KOR Nutrition standards)
function getRecommendedCalories(age) {
    if (age <= 0) return 0;
    if (age <= 2) return 900;
    if (age <= 5) return 1400;
    if (age <= 8) return 1700;
    if (age <= 11) return 1900;
    if (age <= 14) return 2100;
    if (age <= 18) return 2400;
    if (age <= 49) return 2200;
    if (age <= 64) return 2000;
    return 1700; // 65세 이상
}

// Update Age and Calorie Guide UI
function updateAgeAndCaloriesUI() {
    document.getElementById('display-age').innerText = currentAge;
    
    const recommendedTotal = getRecommendedCalories(currentAge);
    document.getElementById('recommended-total-cal').innerText = recommendedTotal;
    
    // Set bread limit to ~20% of total daily energy requirement, minimum 100kcal
    const autoBreadLimit = Math.max(Math.round(recommendedTotal * 0.2), 100);
    
    dailyLimit = autoBreadLimit;
    document.getElementById('input-limit').value = dailyLimit;
    document.getElementById('limit-calories').innerText = dailyLimit;
    
    updateMonitoringUI();
    updateCharts();
}
