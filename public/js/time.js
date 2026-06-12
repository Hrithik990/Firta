// FIRTA — Nepal Time Formatter (UTC+5:45)
// Converts any UTC date string to Nepal Standard Time (NST)

function toNepalTime(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year:     'numeric',
    month:    'short',
    day:      'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   true,
  }) + ' NST';
}

function toNepalDate(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}

// Auto-convert all elements with data-utc attribute on page load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-utc]').forEach(el => {
    const raw = el.getAttribute('data-utc');
    const fmt = el.getAttribute('data-format') === 'date'
      ? toNepalDate(raw)
      : toNepalTime(raw);
    el.textContent = fmt;
  });
});
