/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', function () {
    // инициализация state из storage
    state.user = storage.getUser();
    state.requests = storage.getRequests();
    state.pendingSyncRequests = storage.getPendingSyncRequests();

    // миграция старых заявок (если без id)
    state.requests = state.requests.map(r => {
        if (!r.id) {
            return { ...r, id: crypto.randomUUID() };
        }
        return {
            source: 'general',
            trainerId: null,
            trainerName: '',
            ...r
        };
    });
    storage.setRequests(state.requests);

    initRouter();
    controllers.menu.update();
    controllers.auth.initLogout();
    controllers.admin.updateCounter();

    // Подписки на события
    eventBus.on('request:added', () => {
        controllers.admin.updateCounter();
        renderAdminList();
    });

    eventBus.on('request:deleted', () => {
        controllers.admin.updateCounter();
        renderAdminList();
    });

    eventBus.on('request:updated', () => {
        renderAdminList();
    });

    eventBus.on('auth:login', (user) => {
        controllers.menu.update();

        if (user.role === 'admin') {
            state.renderedPages.admin = false; // сбрасываем lazy-флаг
            location.hash = '#admin';
        } else {
            location.hash = '#home';
        }
    });

    eventBus.on('auth:logout', () => {
        controllers.menu.update();
        location.hash = '#home';
    });

    if (document.querySelector('.hero-slider')) {
        const heroKicker = document.querySelector('[data-hero-kicker]');
        const heroTitle = document.querySelector('[data-hero-title]');
        const heroLead = document.querySelector('[data-hero-lead]');

        const updateHeroCopy = (swiper) => {
            const activeSlide = swiper.slides[swiper.activeIndex];
            if (!activeSlide) return;

            if (heroKicker) heroKicker.textContent = activeSlide.dataset.heroKicker || '';
            if (heroTitle) heroTitle.innerHTML = activeSlide.dataset.heroTitle || '';
            if (heroLead) heroLead.textContent = activeSlide.dataset.heroLead || '';
        };

        const heroSwiper = new Swiper('.hero-slider', {
            loop: true,
            speed: 1200,
            autoplay: {
                delay: 10000,
                disableOnInteraction: false
            },
            pagination: {
                el: '.hero-pagination',
                clickable: true
            },
            effect: 'fade',
            fadeEffect: {
                crossFade: true
            },
            on: {
                init(swiper) {
                    updateHeroCopy(swiper);
                },
                slideChangeTransitionStart(swiper) {
                    updateHeroCopy(swiper);
                }
            }
        });

        updateHeroCopy(heroSwiper);
    }

    initMoreMenu();
    initHomeScrollLinks();
    initFaqAccordion();
    initZoneGallery();
    initClubCardsNavigation();
    initEventFilters();
    initCallWidget();
});

/* ================= DOM CACHE ================= */

const dom = {
    adminList: null,
    adminLink: null
};

/* ================= STATE ================= */

const state = {
    user: null,
    requests: [],
    pendingSyncRequests: [],
    page: 'home',

    formDraft: {
        name: '',
        phone: ''
    },

    admin: {
        filter: 'all' // all | new | done
    },

    trainerShowcase: {
        activeTrainerId: null,
        bioExpanded: false,
        swiper: null
    },

    trainerBooking: {
        activeTrainerId: null,
        lastFocusedElement: null
    },

    renderedPages: {}
};

/* ================= EVENT BUS ================= */

const eventBus = {
    events: {},

    on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
    },

    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    },

    emit(event, payload) {
        if (!this.events[event]) return;
        const listeners = this.events[event].slice();
        listeners.forEach(fn => {
            try { fn(payload); } catch (err) { console.error(err); }
        });
    }
};

/* ================= STORAGE ================= */

const storage = {
    getUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); }
        catch { localStorage.removeItem('currentUser'); return null; }
    },

    setUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    clearUser() {
        localStorage.removeItem('currentUser');
    },

    getRequests() {
        try { return JSON.parse(localStorage.getItem('requests')) || []; }
        catch { localStorage.removeItem('requests'); return []; }
    },

    setRequests(requests) {
        localStorage.setItem('requests', JSON.stringify(requests));
    },

    getPendingSyncRequests() {
        try { return JSON.parse(localStorage.getItem('pendingSyncRequests')) || []; }
        catch { localStorage.removeItem('pendingSyncRequests'); return []; }
    },

    setPendingSyncRequests(requests) {
        localStorage.setItem('pendingSyncRequests', JSON.stringify(requests));
    }
};

/* ================= SERVICES ================= */

const services = {
    auth: {
        login(username, password) {
            const user = users.find(u => u.username === username && u.password === password);
            if (!user) return null;

            state.user = user;
            storage.setUser(user);
            eventBus.emit('auth:login', user);
            return user;
        },

        logout() {
            state.user = null;
            storage.clearUser();
            eventBus.emit('auth:logout');
        }
    },

    requests: {
        add(requestObj) {
            const request = {
                id: crypto.randomUUID(),
                name: requestObj.name,
                phone: requestObj.phone,
                source: requestObj.source || 'general',
                trainerId: requestObj.trainerId || null,
                trainerName: requestObj.trainerName || '',
                status: 'new',
                createdAt: new Date().toISOString()
            };

            state.requests.push(request);
            storage.setRequests(state.requests);
            services.requests.stageForBackend(request);
            eventBus.emit('request:added', request);
        },

        stageForBackend(request) {
            const stagedRequest = {
                ...request,
                syncStatus: 'pending',
                stagedAt: new Date().toISOString()
            };

            state.pendingSyncRequests.push(stagedRequest);
            storage.setPendingSyncRequests(state.pendingSyncRequests);

            console.info('Pending backend sync request saved', stagedRequest);
            window.dispatchEvent(new CustomEvent('fitness-club:request-staged', {
                detail: stagedRequest
            }));
        },

        deleteById(id) {
            state.requests = state.requests.filter(r => r.id !== id);
            storage.setRequests(state.requests);
            eventBus.emit('request:deleted', id);
        },

        markDoneById(id) {
            state.requests = state.requests.map(r =>
                r.id === id ? { ...r, status: 'done' } : r
            );
            storage.setRequests(state.requests);
            eventBus.emit('request:updated', id);
        }
    }
};

/* ================= CONTROLLERS ================= */

const controllers = {

    menu: {
        update() {
            const currentUser = state.user;

            const loginLink = document.querySelector('a[href="#login"]');
            const adminLink = document.querySelector('a[href="#admin"]');
            const logoutLink = document.getElementById('logout-link');

            if (!currentUser) {
                if (loginLink) loginLink.style.display = 'inline';
                if (adminLink) adminLink.style.display = 'none';
                if (logoutLink) logoutLink.style.display = 'none';
                return;
            }

            if (loginLink) loginLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'inline';

            if (adminLink) {
                adminLink.style.display = currentUser.role === 'admin' ? 'inline' : 'none';
            }
        }
    },

    auth: {
        initLogout() {
            const logoutLink = document.getElementById('logout-link');
            if (!logoutLink) return;

            logoutLink.addEventListener('click', e => {
                e.preventDefault();
                services.auth.logout();
            });
        }
    },

    admin: {
        updateCounter() {
            if (!dom.adminLink) {
                dom.adminLink = document.querySelector('a[href="#admin"]');
            }
            if (!dom.adminLink) return;

            const count = state.requests.length;
            dom.adminLink.textContent = count > 0 ? `Админ (${count})` : 'Админ';
        },

        setFilter(filter) {
            state.admin.filter = filter;
            renderAdminList();
        },

        handleAction(action, cardElement) {
            if (!cardElement) return;

            const id = cardElement.dataset.id;
            if (!id) return;

            if (action === 'done') {
                services.requests.markDoneById(id);
            }

            if (action === 'delete') {
                if (!confirm('Удалить заявку?')) return;
                services.requests.deleteById(id);
            }
        }
    }
};

/* ================= PAGE MAP & ROUTER HELPERS ================= */

function renderPageContent(page) {
    const pages = {
        home: () => {},
        prices: renderPrices,
        schedule: renderSchedule,
        trainers: renderTrainers,
        contacts: renderContacts,
        login: renderLogin,
        admin: renderAdmin
    };

    if (state.renderedPages[page]) return;

    if (pages[page]) {
        pages[page]();
        state.renderedPages[page] = true;
    }
}

/* ================= VIEWS / RENDERS ================= */

// ----- Цены (новая сетка) -----
function renderPrices() {
    const pricesPage = document.getElementById('prices');
    if (!pricesPage) return;
    
    pricesPage.innerHTML = `
        <div class="container">
            <h1>Тарифы</h1>
            <p class="prices-subtitle">Выберите подходящий формат занятий</p>
            <div class="prices-grid"></div>
        </div>
    `;
    
    const grid = pricesPage.querySelector('.prices-grid');
    if (!grid) return;
    
    data.subscriptions.forEach(sub => {
        const card = document.createElement('div');
        card.className = `price-card ${sub.popular ? 'price-card--popular' : ''}`;
        card.innerHTML = `
            <div class="price-card__icon">${sub.icon}</div>
            <h3>${sub.name}</h3>
            <p class="price-card__desc">${sub.description}</p>
            <p class="price-card__duration">${sub.duration}</p>
            <p class="price-card__price">${sub.price} ₽</p>
            <button class="price-card__btn line-btn" data-open-modal="guest">Выбрать</button>
        `;
        grid.appendChild(card);
    });
}

// ----- Расписание (таблица с фильтрами) -----
function renderSchedule() {
    const schedulePage = document.getElementById('schedule');
    if (!schedulePage) return;
    
    schedulePage.innerHTML = `
        <div class="container">
            <h1>Расписание групповых занятий</h1>
            <div class="schedule-filters">
                <button data-filter-day="all" class="active">Все дни</button>
                ${[...new Set(data.schedule.map(s => s.day))].map(day =>
                    `<button data-filter-day="${day}">${day}</button>`
                ).join('')}
            </div>
            <div class="schedule-table-wrapper">
                <table class="schedule-table">
                    <thead>
                        <tr><th>День</th><th>Время</th><th>Занятие</th><th>Тренер</th><th>Зал</th></tr>
                    </thead>
                    <tbody id="schedule-body"></tbody>
                </table>
            </div>
        </div>
    `;
    
    const tbody = document.getElementById('schedule-body');
    const filters = schedulePage.querySelectorAll('[data-filter-day]');
    
    function renderTable(dayFilter = 'all') {
        if (!tbody) return;
        const filtered = dayFilter === 'all' 
            ? data.schedule 
            : data.schedule.filter(s => s.day === dayFilter);
        
        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td>${s.day}</td>
                <td>${s.time}</td>
                <td>${s.type}</td>
                <td>${s.trainer}</td>
                <td>${s.hall}</td>
            </tr>
        `).join('');
    }
    
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTable(btn.dataset.filterDay);
        });
    });
    
    renderTable('all');
}

// ----- Тренеры (без изменений) -----
function renderTrainers() {
    const trainersPage = document.getElementById('trainers');
    const list = document.getElementById('trainers-list');
    if (!list || !trainersPage) return;

    const pageTitle = trainersPage.querySelector('h1');
    if (pageTitle) pageTitle.textContent = 'КОМАНДА';

    list.innerHTML = `
        <div class="trainers-showcase__breadcrumbs">ГЛАВНАЯ <span>—</span> КОМАНДА</div>
        <section class="trainers-showcase" data-trainers-showcase>
            <div class="trainers-showcase__stage">
                <div class="trainers-showcase__visuals">
                    <button type="button" class="trainer-frame trainer-frame--ghost" data-trainer-prev-card aria-label="Предыдущий тренер"></button>
                    <article class="trainer-frame trainer-frame--active" data-trainer-active-card></article>

                    <div class="trainers-showcase__controls">
                        <button type="button" class="trainers-showcase__arrow" data-trainers-nav="prev" aria-label="Предыдущий тренер">←</button>
                        <button type="button" class="trainers-showcase__arrow" data-trainers-nav="next" aria-label="Следующий тренер">→</button>
                    </div>
                </div>

                <div class="trainers-showcase__side">
                    <div class="trainer-previews" data-trainer-previews></div>

                    <div class="trainer-summary">
                        <div class="trainer-summary__heading">
                            <h2 class="trainer-details__last" data-trainer-last></h2>
                            <p class="trainer-details__first" data-trainer-first></p>
                        </div>

                        <div class="trainer-details__actions">
                            <button type="button" class="trainer-details__cta" data-trainer-book>записаться</button>
                            <button type="button" class="trainer-details__toggle" data-trainer-about-toggle aria-expanded="false">
                                о тренере
                                <span aria-hidden="true">⌄</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="trainer-about" data-trainer-about hidden></div>
        </section>
    `;

    ensureTrainerBookingModal();
    initTrainerShowcase();
}

// ----- Контакты (без формы) -----
function renderContacts() {
    const contactsPage = document.getElementById('contacts');
    if (!contactsPage) return;
    contactsPage.innerHTML = ''; // очистка

    const wrapper = document.createElement('div');
    wrapper.className = 'container contacts-page';

    wrapper.innerHTML = `
        <p class="contacts-breadcrumb">Главная — Контакты</p>
        <h1 class="contacts-title">Контакты</h1>

        <div class="contact-layout contact-layout--reference">
            <div class="map-container map-container--reference">
                <div class="map-controls" aria-hidden="true">
                    <button type="button">+</button>
                    <button type="button">−</button>
                </div>
                <div class="map-pin" aria-hidden="true"></div>
                <iframe
                    src="https://yandex.ru/map-widget/v1/?ll=44.0075%2C56.2965&z=13&pt=44.0075,56.2965,pm2blm"
                    width="100%"
                    height="100%"
                    frameborder="0"
                    title="Карта фитнес-клуба">
                </iframe>
            </div>

            <div class="right-column right-column--reference">
                <div class="club-info">
                    <h2>Клуб</h2>
                    <p>Нижний Новгород, пр. Гагарина, 35, корп.3, 3 этаж</p>
                    <p>Пн - Пт | 6:30 - 23:00, Сб - Вс | 8:00 - 22:00</p>
                    <button class="feedback-btn line-btn" data-open-guest-modal="true">обратная связь</button>
                </div>

                <div class="sales-info">
                    <h2>Отдел продаж</h2>
                    <p>8 (831) 2-172-172</p>
                    <p>Ежедневно | 10:00 - 21:00</p>
                    <p><a class="sales-mail" href="mailto:sale@oceanis-fitness.ru">sale@oceanis-fitness.ru</a></p>
                    <div class="social-links social-links--large">
                        <a href="#" aria-label="Vkontakte">Vkontakte</a>
                        <a href="#" aria-label="Telegram">Telegram</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    contactsPage.appendChild(wrapper);

    // Обработка кнопки обратной связи через модалку гостевого визита
    const guestButton = document.querySelector('#guest-btn');
    wrapper.querySelectorAll('[data-open-guest-modal="true"]').forEach(button => {
        button.addEventListener('click', () => {
            if (guestButton) guestButton.click();
        });
    });
}

// ----- Логин -----
function renderLogin() {
    const loginPage = document.getElementById('login');
    if (!loginPage) return;

    loginPage.innerHTML = `
        <div class="container">
            <h1>Вход</h1>
            <form id="login-form">
                <input name="username" placeholder="Логин" required>
                <input type="password" name="password" placeholder="Пароль" required>
                <button>Войти</button>
            </form>
            <div class="login-message"></div>
        </div>
    `;

    const form = loginPage.querySelector('#login-form');
    const message = loginPage.querySelector('.login-message');

    form.addEventListener('submit', e => {
        e.preventDefault();

        const user = services.auth.login(form.username.value, form.password.value);

        if (!user) {
            message.textContent = 'Ошибка входа';
            message.className = 'login-message error';
            return;
        }

        location.hash = user.role === 'admin' ? '#admin' : '#home';
    });
}

// ----- Админка -----
function renderAdmin() {
    if (!state.user || state.user.role !== 'admin') {
        location.hash = '#login';
        return;
    }

    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    adminPage.innerHTML = `
        <div class="container">
            <h1>Заявки</h1>

            <div class="admin-controls">
                <button data-filter="all">Все</button>
                <button data-filter="new">Новые</button>
                <button data-filter="done">Обработанные</button>
            </div>

            <div id="admin-list"></div>
        </div>
    `;

    renderAdminList();
}

function renderAdminList() {
    if (!dom.adminList) {
        dom.adminList = document.getElementById('admin-list');
    }
    const list = dom.adminList;
    if (!list) return;

    list.innerHTML = '';

    let items = [...state.requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (state.admin.filter !== 'all') {
        items = items.filter(r => r.status === state.admin.filter);
    }

    if (items.length === 0) {
        list.innerHTML = '<p>Заявок нет</p>';
        return;
    }

    items.forEach((req, index) => {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.dataset.index = index;
        card.dataset.id = req.id;

        card.innerHTML = `
            <p><strong>${escapeHtml(req.name)}</strong> — ${escapeHtml(req.phone)}</p>
            <p>Источник: ${req.source === 'trainer' ? 'запись к тренеру' : 'общая заявка'}</p>
            ${req.trainerName ? `<p>Тренер: <strong>${escapeHtml(req.trainerName)}</strong></p>` : ''}
            <p>Статус: <span class="status">${req.status}</span></p>
            <button data-action="done" ${req.status === 'done' ? 'disabled' : ''}>✔ Обработано</button>
            <button data-action="delete">❌ Удалить</button>
        `;

        list.appendChild(card);
    });
}

// ===== GLOBAL ADMIN HANDLER =====
document.addEventListener('click', e => {
    if (e.target.dataset.filter) {
        controllers.admin.setFilter(e.target.dataset.filter);
        return;
    }

    if (e.target.dataset.action) {
        const card = e.target.closest('.request-card');
        if (!card) return;
        controllers.admin.handleAction(e.target.dataset.action, card);
    }
});

// ===== HOME ENHANCEMENTS =====

function initMoreMenu() {
    const moreContainer = document.getElementById('nav-more');
    const toggle = document.getElementById('more-toggle');
    const overlay = document.getElementById('menu-overlay');

    if (!moreContainer || !toggle || !overlay) return;

    const closeMenu = () => {
        moreContainer.classList.remove('open');
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        overlay.setAttribute('aria-hidden', 'true');
    };

    const openMenu = () => {
        moreContainer.classList.add('open');
        document.body.classList.add('menu-open');
        toggle.setAttribute('aria-expanded', 'true');
        overlay.setAttribute('aria-hidden', 'false');
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreContainer.classList.contains('open');

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    overlay.querySelectorAll('.menu-overlay__link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    window.addEventListener('hashchange', closeMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

function initHomeScrollLinks() {
    const links = document.querySelectorAll('[data-scroll-to]');
    if (!links.length) return;

    const scrollToTarget = (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.dataset.scrollTo;
            if (!targetId) return;

            e.preventDefault();

            if (location.hash !== '#home') {
                location.hash = '#home';
                setTimeout(() => scrollToTarget(targetId), 180);
            } else {
                scrollToTarget(targetId);
            }
        });
    });
}

function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    const setOpen = (item, open) => {
        const panel = item.querySelector('.faq-panel');
        const trigger = item.querySelector('.faq-trigger');
        if (!panel || !trigger) return;

        item.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
        panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0px';
    };

    items.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        if (!trigger) return;

        setOpen(item, item.classList.contains('is-open'));

        trigger.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            items.forEach(other => setOpen(other, false));
            if (!isOpen) setOpen(item, true);
        });
    });

    window.addEventListener('resize', () => {
        items.forEach(item => {
            if (item.classList.contains('is-open')) setOpen(item, true);
        });
    });
}

function initZoneGallery() {
    const root = document.querySelector('[data-zone-gallery]');
    if (!root) return;

    const stage = root.querySelector('.zone-stage');
    const slides = Array.from(root.querySelectorAll('.zone-slide'));
    const cursor = root.querySelector('.zone-cursor');
    if (!stage || !slides.length) return;

    let index = 0;

    const normalize = (value) => (value + slides.length) % slides.length;

    const render = () => {
        const prevIndex = normalize(index - 1);
        const nextIndex = normalize(index + 1);

        slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === index);
            slide.classList.toggle('is-prev', i === prevIndex);
            slide.classList.toggle('is-next', i === nextIndex);
        });
    };

    const go = (direction) => {
        index = normalize(index + direction);
        render();
    };

    const getPointerData = (event) => {
        const rect = stage.getBoundingClientRect();
        const localX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
        const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
        const side = localX < rect.width / 2 ? 'left' : 'right';

        return { localX, localY, side };
    };

    const updateCursor = (event) => {
        if (!cursor) return;

        const { localX, localY, side } = getPointerData(event);
        stage.dataset.side = side;
        cursor.textContent = side === 'left' ? '←' : '→';
        cursor.style.left = `${localX}px`;
        cursor.style.top = `${localY}px`;
    };

    stage.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        stage.classList.add('is-hover');
        updateCursor(event);
    });

    stage.addEventListener('pointerleave', () => {
        stage.classList.remove('is-hover');
        delete stage.dataset.side;
    });

    stage.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        if (!stage.classList.contains('is-hover')) stage.classList.add('is-hover');
        updateCursor(event);
    });

    stage.addEventListener('click', (event) => {
        const { side } = getPointerData(event);
        go(side === 'left' ? -1 : 1);
    });

    stage.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            go(-1);
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            go(1);
        }
    });

    render();
}

function initClubCardsNavigation() {
    const track = document.getElementById('club-cards-track');
    const controls = document.querySelectorAll('[data-cards-nav]');

    if (!track || !controls.length) return;

    controls.forEach(control => {
        control.addEventListener('click', () => {
            const isPrev = control.dataset.cardsNav === 'prev';
            const shift = Math.round(track.clientWidth * 0.85);
            track.scrollBy({
                left: isPrev ? -shift : shift,
                behavior: 'smooth'
            });
        });
    });
}

function initEventFilters() {
    const filters = Array.from(document.querySelectorAll('[data-event-filter]'));
    const cards = Array.from(document.querySelectorAll('.event-card'));

    if (!filters.length || !cards.length) return;

    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            const value = filter.dataset.eventFilter;

            filters.forEach(btn => btn.classList.remove('is-active'));
            filter.classList.add('is-active');

            cards.forEach(card => {
                const category = card.dataset.eventCat;
                const shouldShow = value === 'all' || category === value;
                card.classList.toggle('is-hidden', !shouldShow);
            });
        });
    });
}

function initCallWidget() {
    const widget = document.getElementById('call-widget');
    const closeButton = document.getElementById('call-widget-close');
    if (!widget || !closeButton) return;

    const FIRST_DELAY_MS = 30000;
    const REPEAT_DELAY_MS = 90000;
    const STORAGE_KEY = 'callWidgetLastClosedAt';

    let timerId = null;

    const show = () => {
        widget.classList.add('is-visible');
        widget.setAttribute('aria-hidden', 'false');
    };

    const hide = () => {
        widget.classList.remove('is-visible');
        widget.setAttribute('aria-hidden', 'true');
    };

    const scheduleShow = (delay) => {
        clearTimeout(timerId);
        timerId = setTimeout(show, delay);
    };

    const lastClosedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (!lastClosedAt) {
        scheduleShow(FIRST_DELAY_MS);
    } else {
        const elapsed = Date.now() - lastClosedAt;
        if (elapsed >= REPEAT_DELAY_MS) {
            scheduleShow(FIRST_DELAY_MS);
        } else {
            scheduleShow(REPEAT_DELAY_MS - elapsed);
        }
    }

    closeButton.addEventListener('click', () => {
        hide();
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        scheduleShow(REPEAT_DELAY_MS);
    });
}

/* ================= GUEST VISIT MODAL ================= */

document.addEventListener("DOMContentLoaded", () => {

    const guestButtons = document.querySelectorAll('[data-open-modal="guest"]');
    const modal = document.getElementById("guest-modal");
    const closeBtn = document.getElementById("modal-close");
    const form = document.getElementById("guest-form");

    if (!guestButtons.length || !modal || !form) return;

    const nameInput = form.querySelector('input[type="text"]');
    const phoneInput = form.querySelector('input[type="tel"]');
    const consentInput = form.querySelector('input[type="checkbox"]');

    let message = document.createElement("div");
    message.className = "form-message";
    form.appendChild(message);
    let lastFocusedElement = null;

    function openModal() {
        lastFocusedElement = document.activeElement;
        modal.classList.add("active");
        document.body.classList.add("modal-open");

        setTimeout(() => nameInput.focus(), 100);
    }

    guestButtons.forEach(button => {
        button.addEventListener("click", openModal);
    });

    function closeModal(){
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
        form.reset();
        message.textContent = "";

        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    closeBtn.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e)=>{
        if(e.key === "Escape" && modal.classList.contains("active")){
            closeModal(); 
        }
    });

    nameInput.addEventListener("input", debounce(function () {
        this.value = this.value
            .replace(/[^a-zA-Zа-яА-Я\s]/g, '')
            .slice(0,30);
    },300));

    phoneInput.addEventListener("input", debounce(function(){
        let digits = this.value.replace(/\D/g,'').slice(0,11);
        let result = "+7";
        if(digits.length > 1) result += " (" + digits.slice(1,4);
        if(digits.length >= 4) result += ") " + digits.slice(4,7);
        if(digits.length >= 7) result += "-" + digits.slice(7,9);
        if(digits.length >= 9) result += "-" + digits.slice(9,11);
        this.value = result;
    },300));

    form.addEventListener("submit", e => {
        e.preventDefault();

        const cleanPhone = phoneInput.value.replace(/\D/g,'');

        message.textContent = "";
        message.className = "form-message";

        if(nameInput.value.trim().length < 2){
            message.textContent = "Введите корректное имя";
            message.classList.add("error");
            return;
        }

        if(cleanPhone.length !== 11){
            message.textContent = "Телефон введён не полностью";
            message.classList.add("error");
            return;
        }

        if (consentInput && !consentInput.checked) {
            message.textContent = "Подтвердите согласие на обработку данных";
            message.classList.add("error");
            return;
        }

        const button = form.querySelector("button");

        button.disabled = true;
        button.innerHTML = '<span class="button-loader"></span>';

        setTimeout(()=>{
            services.requests.add({
                name: nameInput.value.trim(),
                phone: cleanPhone
            });

            message.textContent = "✅ Заявка отправлена";
            message.className = "form-message success";

            button.disabled = false;
            button.textContent = "Отправить";

            setTimeout(closeModal,1000);
        },800);
    });
});

/* ================= TRAINER SHOWCASE (без изменений) ================= */

function initTrainerShowcase() {
    const root = document.querySelector('[data-trainers-showcase]');
    if (!root) return;

    const prevCard = root.querySelector('[data-trainer-prev-card]');
    const activeCard = root.querySelector('[data-trainer-active-card]');
    const previewsRoot = root.querySelector('[data-trainer-previews]');
    const prevButton = root.querySelector('[data-trainers-nav="prev"]');
    const nextButton = root.querySelector('[data-trainers-nav="next"]');
    const lastNameElement = root.querySelector('[data-trainer-last]');
    const firstNameElement = root.querySelector('[data-trainer-first]');
    const aboutButton = root.querySelector('[data-trainer-about-toggle]');
    const bookButton = root.querySelector('[data-trainer-book]');
    const aboutPanel = root.querySelector('[data-trainer-about]');

    if (!prevCard || !activeCard || !previewsRoot || !prevButton || !nextButton || !lastNameElement || !firstNameElement || !aboutButton || !bookButton || !aboutPanel) return;

    const total = data.trainers.length;
    if (!total) return;

    const normalizeIndex = (index) => (index % total + total) % total;
    const getTrainerByIndex = (index) => data.trainers[normalizeIndex(index)];

    const buildFrameMarkup = (trainer, variant) => `
        <div class="trainer-frame__media trainer-frame__media--${variant}">
            <img src="assets/images/${trainer.photo}" alt="${escapeHtml(trainer.fullName)}">
        </div>
    `;

    const renderTrainerDetails = (trainer, keepExpanded = false) => {
        const shouldExpand = keepExpanded && state.trainerShowcase.bioExpanded;

        state.trainerShowcase.activeTrainerId = trainer.id;
        state.trainerShowcase.bioExpanded = shouldExpand;

        lastNameElement.textContent = trainer.lastName;
        firstNameElement.textContent = trainer.firstName;
        aboutPanel.innerHTML = buildTrainerAboutMarkup(trainer);
        aboutPanel.hidden = !shouldExpand;
        aboutButton.setAttribute('aria-expanded', String(shouldExpand));
        aboutButton.classList.toggle('is-open', shouldExpand);
    };

    const renderScene = (keepExpanded = false) => {
        const activeIndex = normalizeIndex(state.trainerShowcase.activeIndex || 0);
        const activeTrainer = getTrainerByIndex(activeIndex);
        const prevTrainer = getTrainerByIndex(activeIndex - 1);
        const previews = [1, 2, 3].map(offset => ({
            trainer: getTrainerByIndex(activeIndex + offset),
            offset
        }));

        state.trainerShowcase.activeIndex = activeIndex;
        prevCard.innerHTML = buildFrameMarkup(prevTrainer, 'ghost');
        activeCard.innerHTML = buildFrameMarkup(activeTrainer, 'active');
        activeCard.dataset.trainerId = activeTrainer.id;
        prevCard.dataset.trainerId = prevTrainer.id;

        previewsRoot.innerHTML = previews.map(({ trainer, offset }, previewIndex) => `
            <button type="button" class="trainer-preview-card ${previewIndex === 0 ? 'trainer-preview-card--lead' : ''}" data-trainer-offset="${offset}" aria-label="Показать тренера ${escapeHtml(trainer.fullName)}">
                <span class="trainer-preview-card__image">
                    <img src="assets/images/${trainer.photo}" alt="${escapeHtml(trainer.fullName)}">
                </span>
            </button>
        `).join('');

        renderTrainerDetails(activeTrainer, keepExpanded);
    };

    const goTo = (nextIndex, keepExpanded = false) => {
        state.trainerShowcase.activeIndex = normalizeIndex(nextIndex);
        renderScene(keepExpanded);
    };

    state.trainerShowcase.activeIndex = normalizeIndex(
        typeof state.trainerShowcase.activeIndex === 'number'
            ? state.trainerShowcase.activeIndex
            : 0
    );
    state.trainerShowcase.bioExpanded = false;

    prevButton.addEventListener('click', () => {
        goTo(state.trainerShowcase.activeIndex - 1);
    });

    nextButton.addEventListener('click', () => {
        goTo(state.trainerShowcase.activeIndex + 1);
    });

    prevCard.addEventListener('click', () => {
        goTo(state.trainerShowcase.activeIndex - 1);
    });

    previewsRoot.addEventListener('click', (event) => {
        const previewButton = event.target.closest('[data-trainer-offset]');
        if (!previewButton) return;
        const offset = Number(previewButton.dataset.trainerOffset || 0);
        if (!offset) return;
        goTo(state.trainerShowcase.activeIndex + offset);
    });

    let pointerStartX = 0;
    activeCard.addEventListener('pointerdown', (event) => {
        pointerStartX = event.clientX;
    });

    activeCard.addEventListener('pointerup', (event) => {
        const deltaX = event.clientX - pointerStartX;
        if (Math.abs(deltaX) < 40) return;
        if (deltaX > 0) {
            goTo(state.trainerShowcase.activeIndex - 1);
        } else {
            goTo(state.trainerShowcase.activeIndex + 1);
        }
    });

    aboutButton.addEventListener('click', () => {
        const nextExpanded = !state.trainerShowcase.bioExpanded;
        state.trainerShowcase.bioExpanded = nextExpanded;
        aboutPanel.hidden = !nextExpanded;
        aboutButton.setAttribute('aria-expanded', String(nextExpanded));
        aboutButton.classList.toggle('is-open', nextExpanded);
    });

    bookButton.addEventListener('click', () => {
        const trainer = getTrainerByIndex(state.trainerShowcase.activeIndex);
        openTrainerBookingModal(trainer);
    });

    renderScene();
}

function buildTrainerAboutMarkup(trainer) {
    return `
        <div class="trainer-about__block">
            <span>О тренере</span>
            <p>${trainer.bioLead}</p>
        </div>
        <div class="trainer-about__block">
            <span>Стаж</span>
            <p>${trainer.experience}</p>
        </div>
        <div class="trainer-about__block">
            <span>Образование</span>
            <ul>
                ${trainer.education.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
        <div class="trainer-about__block">
            <span>Специализация</span>
            <ul>
                ${trainer.directions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
    `;
}

function ensureTrainerBookingModal() {
    let modal = document.getElementById('trainer-booking-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'modal trainer-booking-modal';
    modal.id = 'trainer-booking-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-content modal-content--trainer">
            <div class="trainer-booking-card">
                <button class="modal-close modal-close--trainer" type="button" data-trainer-modal-close aria-label="Закрыть">✕</button>
                <p class="trainer-booking-card__kicker">Персональная тренировка</p>
                <h2 class="trainer-booking-card__title">
                    Записаться на тренировку
                    <span data-trainer-modal-name></span>
                </h2>
                <p class="trainer-booking-card__subtitle" data-trainer-modal-role></p>

                <form id="trainer-booking-form" class="trainer-booking-form" novalidate>
                    <input type="hidden" name="trainerId">
                    <input type="hidden" name="trainerName">

                    <label class="trainer-booking-form__field">
                        <span>Имя*</span>
                        <input type="text" name="name" placeholder="Ваше имя" required>
                    </label>

                    <label class="trainer-booking-form__field">
                        <span>Телефон*</span>
                        <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" required>
                    </label>

                    <label class="trainer-booking-form__consent">
                        <input type="checkbox" name="consent" required>
                        <span>Отправляя форму, вы даёте согласие на обработку персональных данных.</span>
                    </label>

                    <p class="trainer-booking-form__note">* Поля обязательны к заполнению</p>

                    <button type="submit" class="trainer-booking-form__submit">отправить</button>
                    <div class="form-message" data-trainer-modal-message></div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeButton = modal.querySelector('[data-trainer-modal-close]');
    const form = modal.querySelector('#trainer-booking-form');
    const nameInput = form.querySelector('input[name="name"]');
    const phoneInput = form.querySelector('input[name="phone"]');

    closeButton.addEventListener('click', closeTrainerBookingModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeTrainerBookingModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeTrainerBookingModal();
        }
    });

    nameInput.addEventListener('input', debounce(function () {
        this.value = this.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, '').slice(0, 40);
    }, 200));

    phoneInput.addEventListener('input', debounce(function () {
        let digits = this.value.replace(/\D/g, '').slice(0, 11);
        let result = '+7';

        if (digits.length > 1) result += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) result += ') ' + digits.slice(4, 7);
        if (digits.length >= 7) result += '-' + digits.slice(7, 9);
        if (digits.length >= 9) result += '-' + digits.slice(9, 11);

        this.value = result;
    }, 200));

    form.addEventListener('submit', handleTrainerBookingSubmit);

    return modal;
}

function openTrainerBookingModal(trainer) {
    const modal = ensureTrainerBookingModal();
    const form = modal.querySelector('#trainer-booking-form');
    const modalName = modal.querySelector('[data-trainer-modal-name]');
    const modalRole = modal.querySelector('[data-trainer-modal-role]');
    const message = modal.querySelector('[data-trainer-modal-message]');
    const trainerIdField = form?.elements.namedItem('trainerId');
    const trainerNameField = form?.elements.namedItem('trainerName');

    if (!form || !modalName || !modalRole || !message || !trainerIdField || !trainerNameField) return;

    state.trainerBooking.activeTrainerId = trainer.id;
    state.trainerBooking.lastFocusedElement = document.activeElement;

    modalName.textContent = `к ${trainer.bookingLabel}`;
    modalRole.textContent = `${trainer.role} • ${trainer.experience}`;
    form.reset();
    trainerIdField.value = trainer.id;
    trainerNameField.value = trainer.fullName;
    message.textContent = '';
    message.className = 'form-message';

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    setTimeout(() => {
        const nameInput = form.querySelector('input[name="name"]');
        if (nameInput) nameInput.focus();
    }, 80);
}

function closeTrainerBookingModal() {
    const modal = document.getElementById('trainer-booking-modal');
    if (!modal) return;

    const form = modal.querySelector('#trainer-booking-form');
    const message = modal.querySelector('[data-trainer-modal-message]');

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (form) form.reset();
    if (message) {
        message.textContent = '';
        message.className = 'form-message';
    }

    if (state.trainerBooking.lastFocusedElement) {
        state.trainerBooking.lastFocusedElement.focus();
    }
}

function handleTrainerBookingSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = form.querySelector('[data-trainer-modal-message]');
    const submitButton = form.querySelector('button[type="submit"]');
    const elements = form.elements;
    const nameField = elements.namedItem('name');
    const phoneField = elements.namedItem('phone');
    const consentField = elements.namedItem('consent');
    const trainerIdField = elements.namedItem('trainerId');
    const trainerNameField = elements.namedItem('trainerName');

    if (!message || !submitButton || !nameField || !phoneField || !consentField || !trainerIdField || !trainerNameField) {
        return;
    }

    const cleanPhone = phoneField.value.replace(/\D/g, '');

    message.textContent = '';
    message.className = 'form-message';

    if (nameField.value.trim().length < 2) {
        message.textContent = 'Введите имя не короче 2 символов.';
        message.classList.add('error');
        return;
    }

    if (cleanPhone.length !== 11) {
        message.textContent = 'Введите телефон полностью.';
        message.classList.add('error');
        return;
    }

    if (!consentField.checked) {
        message.textContent = 'Подтвердите согласие на обработку данных.';
        message.classList.add('error');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="button-loader"></span>';

    setTimeout(() => {
        services.requests.add({
            name: nameField.value.trim(),
            phone: cleanPhone,
            source: 'trainer',
            trainerId: trainerIdField.value,
            trainerName: trainerNameField.value
        });

        message.textContent = `Заявка к тренеру ${trainerNameField.value} отправлена. Мы скоро свяжемся с вами.`;
        message.className = 'form-message success';

        submitButton.disabled = false;
        submitButton.textContent = 'отправить';

        setTimeout(() => {
            closeTrainerBookingModal();
        }, 1400);
    }, 800);
}

/* ================= UTILS ================= */

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}