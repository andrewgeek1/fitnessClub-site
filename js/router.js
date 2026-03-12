/* ================= SPA ROUTER ================= */

function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // initial load
}

function handleRoute() {
    const page = location.hash.replace('#', '') || 'home';
    renderPage(page);
}

function renderPage(pageName) {
    const pages = document.querySelectorAll('.page');
    const menuLinks = document.querySelectorAll('nav a');

    // 404 защита
    if (!document.getElementById(pageName)) {
        pageName = 'home';
        location.hash = '#home';
    }

    // admin guard
    if (pageName === 'admin') {
        if (!state.user || state.user.role !== 'admin') {
            location.hash = '#login';
            return;
        }
    }

    // скрываем всё
    pages.forEach(p => p.classList.remove('active'));
    menuLinks.forEach(l => l.classList.remove('active'));

    // показываем нужную страницу
    const activePage = document.getElementById(pageName);
    activePage.classList.add('active');

    const activeLink = document.querySelector(`nav a[href="#${pageName}"]`);
    if (activeLink) activeLink.classList.add('active');

    // автоскролл
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // рендер контента
    renderPageContent(pageName);

    state.page = pageName;
}