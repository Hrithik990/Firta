// Hamburger nav (landing, add-item, finder pages)
function initHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('mobileDrawer');
  if (!btn || !drawer) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    drawer.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) {
      btn.classList.remove('open');
      drawer.classList.remove('open');
    }
  });
}

// Slide-out sidebar (dashboard pages)
function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.querySelector('.sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  if (!toggleBtn || !sidebar || !overlay) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHamburger();
  initSidebar();
});
