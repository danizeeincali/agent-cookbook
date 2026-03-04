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

async function fetchLatest() {
  try {
    const res = await fetch('/api/latest');
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

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function renderLatest(data) {
  const body = document.getElementById('latest-body');
  const time = document.getElementById('latest-time');

  if (!data || !data.recipe) return;

  const r = data.recipe;
  time.textContent = timeAgo(r.created_at);

  const tags = r.tags.map(t => `<span class="latest-tag">${t}</span>`).join('');
  const grade = r.receipt_summary
    ? `<span class="latest-info">Grade: ${(r.receipt_summary.grade_avg * 100).toFixed(0)}% | ${r.receipt_summary.total_runs} builds</span>`
    : `<span class="latest-info">${r.step_count} step${r.step_count !== 1 ? 's' : ''} | v${r.version}</span>`;

  let stepsHtml = '';
  if (r.steps_preview && r.steps_preview.length > 0) {
    const stepItems = r.steps_preview.map((s, i) => {
      const specPreview = s.spec.length > 120 ? s.spec.slice(0, 120) + '...' : s.spec;
      return `<div class="latest-step">
        <div class="latest-step-num">${i + 1}</div>
        <div class="latest-step-content">
          <div class="latest-step-title">${s.title}</div>
          <div class="latest-step-spec">${specPreview}</div>
        </div>
      </div>`;
    }).join('');
    const moreCount = r.step_count - r.steps_preview.length;
    const more = moreCount > 0 ? `<div class="latest-steps-more">... ${moreCount} more step${moreCount !== 1 ? 's' : ''}</div>` : '';
    stepsHtml = `<div class="latest-steps">${stepItems}${more}</div>`;
  }

  body.innerHTML = `
    <div class="latest-title">${r.title}</div>
    <div class="latest-desc">${r.description}</div>
    ${stepsHtml}
    <div class="latest-meta">
      <div class="latest-tags">${tags}</div>
      ${grade}
    </div>
    <div class="latest-id">${r.id}</div>
  `;
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
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
        backgroundColor: 'rgba(220, 38, 38, 0.5)',
        borderColor: '#dc2626',
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

Promise.all([fetchStats(), fetchLatest()]).then(([stats, latest]) => {
  buildCharts(stats);
  renderLatest(latest);
});
