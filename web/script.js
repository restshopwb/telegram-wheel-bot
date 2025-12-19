const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinBtn = document.getElementById("spinBtn");
const checkPromoBtn = document.getElementById("checkPromoBtn");
const promoInput = document.getElementById("promoInput");
const resultText = document.getElementById("result");

const segments = [
  { label: "3%", value: 3, chance: 60, color: '#eed5b6', textColor: "#f6f6f4"},
  { label: "5%", value: 5, chance: 30, color: '#f6f6f4', textColor: "#eed5b6" },
  { label: "7%", value: 7, chance: 7, color: '#212025', textColor: "#eed5b6" },
  { label: "10%", value: 10, chance: 2, color: '#eed5b6', textColor: "#f6f6f4" },
  { label: "15%", value: 15, chance: 1, color: '#fe7600', textColor: "#f6f6f4" }
];

let currentAngle = 0;
let canSpin = false;
let isSpinning = false;
let promoCode = null;
let highlightIndex = null;
let highlightPulse = 0;
let highlightDir = 1;

/* ---------- РИСОВАНИЕ КОЛЕСА ---------- */

function drawWheel() {
  const radius = canvas.width / 2;
  const anglePerSegment = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  segments.forEach((seg, i) => {
    const start = currentAngle + i * anglePerSegment;
    const end = start + anglePerSegment;

    // Сегмент
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, start, end);
    ctx.closePath();

    ctx.fillStyle = seg.color; // 🔥 БЕРЁМ ЦВЕТ ИЗ segments
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Текст
    const textAngle = start + anglePerSegment / 2;
	const textRadius = radius - 20;
	
	const x = radius + Math.cos(textAngle) * textRadius;
	const y = radius + Math.sin(textAngle) * textRadius;

	
	ctx.save();
    ctx.translate(x, y);
    ctx.rotate(textAngle + Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = seg.textColor;
    ctx.font = "bold 18px Arial";
    ctx.fillText(seg.label, 20, 15);
    ctx.restore();
  });
	// 🔵 ВНЕШНИЙ КОНТУР КОЛЕСА
	ctx.beginPath();
	ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
	ctx.strokeStyle = "#eed5b6"; // 👉 нужный цвет контура
	ctx.lineWidth = 6;           // 👉 толщина контура
	ctx.stroke();
	
	drawHighlight();
}

function drawHighlight() {
  if (highlightIndex === null) return;

  const radius = canvas.width / 2;
  const anglePerSegment = (2 * Math.PI) / segments.length;

  const start = currentAngle + highlightIndex * anglePerSegment;
  const end = start + anglePerSegment;

  ctx.save();

  // пульсация
  highlightPulse += 0.02 * highlightDir;
  if (highlightPulse > 0.4 || highlightPulse < 0) {
    highlightDir *= -1;
  }

  ctx.beginPath();
  ctx.moveTo(radius, radius);
  ctx.arc(radius, radius, radius, start, end);
  ctx.closePath();

  ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + highlightPulse})`;
  ctx.fill();

  // свечение
  ctx.shadowColor = "gold";
  ctx.shadowBlur = 20;

  ctx.strokeStyle = "gold";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}


drawWheel();

/* ---------- ВЫБОР СЕГМЕНТА ---------- */

function getRandomSegmentIndex() {
  const rand = Math.random() * 100;
  let sum = 0;

  for (let i = 0; i < segments.length; i++) {
    sum += segments[i].chance;
    if (rand <= sum) return i;
  }
  return 0;
}

/* ---------- ПРОВЕРКА ПРОМОКОДА ---------- */

checkPromoBtn.onclick = async () => {
  const code = promoInput.value.trim().toUpperCase();
  if (!code) {
    resultText.innerText = "Введите промокод";
    return;
  }

  resultText.innerText = "⏳ Проверка промокода...";
  spinBtn.disabled = true;

  try {
    const res = await fetch(" https://asbestoid-overdaintily-tawny.ngrok-free.dev/check_promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promo: code })
    });

    const data = await res.json();

    if (!data.ok) {
      resultText.innerText =
        data.reason === "used"
          ? "⛔ Промокод уже использован"
          : "❌ Промокод не найден";
      return;
    }

    promoCode = code;
    canSpin = true;
    spinBtn.disabled = false;
    resultText.innerText = "✅ Промокод принят. Крутите колесо";

  } catch {
    resultText.innerText = "Ошибка соединения с сервером";
  }
};

/* ---------- ВРАЩЕНИЕ ---------- */

spinBtn.onclick = () => {
	if (!canSpin || isSpinning) return;

	isSpinning = true;
	spinBtn.disabled = true;

	// 1️⃣ СНАЧАЛА выбираем сегмент (ЕДИНСТВЕННЫЙ источник правды)
	const index = getRandomSegmentIndex();
	const anglePerSegment = (2 * Math.PI) / segments.length;

	// 2️⃣ Угол центра выбранного сегмента
	const segmentCenter = index * anglePerSegment + anglePerSegment / 2;

	// 3️⃣ Стрелка смотрит вверх (−90°)
	const pointerAngle = -Math.PI / 2;

	// 4️⃣ Сколько нужно провернуть, чтобы сегмент был под стрелкой
	const spins = 5 * 2 * Math.PI;
	const targetAngle = spins + (pointerAngle - segmentCenter);

	const start = performance.now();
	const duration = 4000;
	const initialAngle = currentAngle;

	function animate(time) {
		const progress = Math.min((time - start) / duration, 1);
		const ease = 1 - Math.pow(1 - progress, 3);

		currentAngle = initialAngle + ease * targetAngle;
		drawWheel();
		if (progress < 1) {
			requestAnimationFrame(animate);
		} else {
			const win = segments[index];
			resultText.innerText = `🎉 Ваша скидка ${win.label}`;
			console.log("FINISH SPIN REQUEST", promoCode, win.value);
			fetch(" https://asbestoid-overdaintily-tawny.ngrok-free.dev/finish_spin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					promo: promoCode,
					discount: win.value
				})
			}).then(res => res.json())
				.then(data => {
					if (data.ok) {
						resultText.innerText = `🎉 Ваша скидка ${win.label}`;
					} else {
						resultText.innerText = "Ошибка сохранения результата";
					}
				});
		isSpinning = false;
		canSpin = false;
		}
	}
  
	requestAnimationFrame(animate);
};

