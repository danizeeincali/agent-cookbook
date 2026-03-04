const LAUNCH_DATE = new Date('2025-03-04');

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function generateDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function buildCharts(stats) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dateRange = generateDateRange(LAUNCH_DATE, today);
  const labels = dateRange.map(formatDate);

  const recipeDates = (stats && stats.recipe_dates) || [];
  const dailyCounts = new Array(dateRange.length).fill(0);
  const cumulativeCounts = new Array(dateRange.length).fill(0);

  for (const dateStr of recipeDates) {
    const d = new Date(dateStr);
    for (let i = 0; i < dateRange.length; i++) {
      if (d.toDateString() === dateRange[i].toDateString()) {
        dailyCounts[i]++;
        break;
      }
    }
  }

  let cumulative = 0;
  for (let i = 0; i < dailyCounts.length; i++) {
    cumulative += dailyCounts[i];
    cumulativeCounts[i] = cumulative;
  }

  const totalRecipes = stats ? stats.total_recipes : 0;
  const totalReceipts = stats ? stats.total_receipts : 0;
  const daysLive = Math.max(1, Math.floor((today - LAUNCH_DATE) / (1000 * 60 * 60 * 24)));

  document.getElementById('total-recipes').textContent = totalRecipes.toLocaleString();
  document.getElementById('total-receipts').textContent = totalReceipts.toLocaleString();
  document.getElementById('days-live').textContent = daysLive.toLocaleString();

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#8b8b94',
          font: { family: 'Inter', size: 11 },
          maxTicksLimit: 8,
        },
        border: { color: 'rgba(255,255,255,0.08)' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#8b8b94',
          font: { family: 'Inter', size: 11 },
          precision: 0,
        },
        border: { color: 'rgba(255,255,255,0.08)' },
        beginAtZero: true,
      },
    },
  };

  new Chart(document.getElementById('growth-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: cumulativeCounts,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      }],
    },
    options: chartDefaults,
  });

  new Chart(document.getElementById('daily-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: dailyCounts,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: chartDefaults,
  });
}

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

fetchStats().then(buildCharts);
