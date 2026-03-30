/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', function () {
    // инициализация state из storage
    state.user = storage.getUser();
    state.requests = storage.getRequests();

        // миграция старых заявок (если без id)
    state.requests = state.requests.map(r => {
        if (!r.id) {
            return { ...r, id: crypto.randomUUID() };
        }
        return r;
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
    page: 'home',

    formDraft: {
        name: '',
        phone: ''
    },

    admin: {
        filter: 'all' // all | new | done
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
        // копируем список, чтобы обработчики могли менять подписки
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
                status: 'new',
                createdAt: new Date().toISOString()
            };

            state.requests.push(request);
            storage.setRequests(state.requests);
            eventBus.emit('request:added', request);
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

/* ================= VIEWS / RENDERS (с сохранением UX) ================= */

function renderPrices() {
    const pricesPage = document.getElementById('prices');
    if (!pricesPage) return;
    pricesPage.innerHTML = '<h1>Цены</h1>';

    data.subscriptions.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'price-card';
        card.innerHTML = `
            <h3>${sub.name}</h3>
            <p>${sub.duration}</p>
            <p>${sub.price} ₽</p>
        `;
        pricesPage.appendChild(card);
    });
}

function renderSchedule() {
    const schedulePage = document.getElementById('schedule');
    if (!schedulePage) return;
    schedulePage.innerHTML = '<h1>Расписание</h1>';

    data.schedule.forEach(item => {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.innerHTML = `
            <h3>${item.day}</h3>
            <p>${item.time}</p>
            <p>${item.type}</p>
            <p>Тренер: ${item.trainer}</p>
        `;
        schedulePage.appendChild(card);
    });
}

function renderTrainers() {
    const list = document.getElementById('trainers-list');
    if (!list) return;

    list.innerHTML = '';

    data.trainers.forEach(trainer => {
        const card = document.createElement('div');
        card.className = 'trainer-card';
        card.innerHTML = `
            <img src="assets/images/${trainer.photo}" alt="${trainer.name}">
            <h3>${trainer.name}</h3>
            <p>${trainer.specialization}</p>
        `;
        list.appendChild(card);
    });
}

/* ================= CONTACTS (сохранён UX: маска, debounce, draft, loader) ================= */

function renderContacts() {
    const contactsPage = document.getElementById('contacts');
    if (!contactsPage) return;
    contactsPage.innerHTML = ''; // очистка старого контента

    const wrapper = document.createElement('div');
    wrapper.className = 'contacts-wrapper';

    wrapper.innerHTML = `
        <div class="contacts-page">
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

            <form class="contact-form contact-form--compact" novalidate>
                <h2>Записаться на тренировку</h2>

                <input type="text" name="name" placeholder="Ваше имя">
                <small class="error"></small>

                <input type="tel" name="phone" placeholder="+7 (___) ___-__-__">
                <small class="error"></small>

                <button type="submit">Отправить заявку</button>
                <div class="form-message"></div>
            </form>
        </div>
    `;

    contactsPage.appendChild(wrapper);

    const guestButton = document.querySelector('#guest-btn');
    wrapper.querySelectorAll('[data-open-guest-modal="true"]').forEach(button => {
        button.addEventListener('click', () => {
            if (guestButton) guestButton.click();
        });
    });

    // ====== ВОССТАНОВЛЕНИЕ ДАННЫХ ФОРМЫ ======
    const form = wrapper.querySelector('form');
    const nameInput = form.name;
    const phoneInput = form.phone;
    const button = form.querySelector('button');
    const message = form.querySelector('.form-message');
    const errors = form.querySelectorAll('.error');

    nameInput.value = state.formDraft.name || '';
    phoneInput.value = state.formDraft.phone || '';

    // Ввод имени с дебаунсом
    nameInput.addEventListener('input', debounce(function () {
        this.value = this.value.replace(/[^a-zA-Zа-яА-Я\s]/g, '').slice(0, 30);
        state.formDraft.name = this.value;
    }, 300));

    // Маска телефона
    phoneInput.addEventListener('input', debounce(function () {
        let digits = this.value.replace(/\D/g, '').slice(0, 11);
        let result = '+7';
        if (digits.length > 1) result += ' (' + digits.slice(1,4);
        if (digits.length >= 4) result += ') ' + digits.slice(4,7);
        if (digits.length >= 7) result += '-' + digits.slice(7,9);
        if (digits.length >= 9) result += '-' + digits.slice(9,11);
        this.value = result;
        state.formDraft.phone = this.value;
    }, 300));

    // Отправка формы
    form.addEventListener('submit', e => {
        e.preventDefault();

        errors.forEach(err => err.textContent = '');
        nameInput.classList.remove('error');
        phoneInput.classList.remove('error');
        message.textContent = '';
        message.className = 'form-message';

        const cleanPhone = phoneInput.value.replace(/\D/g, '');
        let valid = true;

        if (nameInput.value.trim().length < 2) {
            errors[0].textContent = 'Минимум 2 буквы';
            nameInput.classList.add('error');
            valid = false;
        }

        if (cleanPhone.length !== 11) {
            errors[1].textContent = 'Телефон введён не полностью';
            phoneInput.classList.add('error');
            valid = false;
        }

        if (!valid) return;

        button.disabled = true;
        button.innerHTML = '<span class="button-loader"></span>';

        setTimeout(() => {
            services.requests.add({
                name: nameInput.value.trim(),
                phone: cleanPhone
            });

            message.textContent = '✅ Заявка отправлена';
            message.className = 'form-message success';

            state.formDraft = { name: '', phone: '' };
            form.reset();

            button.disabled = false;
            button.textContent = 'Отправить заявку';
        }, 800);
    });
}

/* ================= LOGIN ================= */

function renderLogin() {
    const loginPage = document.getElementById('login');
    if (!loginPage) return;

    loginPage.innerHTML = `
        <h1>Вход</h1>
        <form id="login-form">
            <input name="username" placeholder="Логин" required>
            <input type="password" name="password" placeholder="Пароль" required>
            <button>Войти</button>
        </form>
        <div class="login-message"></div>
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

        // обновить меню и перейти на нужную страницу — подписки через eventBus обновят меню
        location.hash = user.role === 'admin' ? '#admin' : '#home';
    });
}

/* ================= ADMIN ================= */

function renderAdmin() {
    // защита рендеринга (defense in depth)
    if (!state.user || state.user.role !== 'admin') {
        location.hash = '#login';
        return;
    }

    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    adminPage.innerHTML = `
        <h1>Заявки</h1>

        <div class="admin-controls">
            <button data-filter="all">Все</button>
            <button data-filter="new">Новые</button>
            <button data-filter="done">Обработанные</button>
        </div>

        <div id="admin-list"></div>
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
        // сохраняем исходную логику с dataset.index (чтобы ничего не ломать)
        card.dataset.index = index;
        card.dataset.id = req.id;

        card.innerHTML = `
            <p><strong>${escapeHtml(req.name)}</strong> — ${escapeHtml(req.phone)}</p>
            <p>Статус: <span class="status">${req.status}</span></p>
            <button data-action="done" ${req.status === 'done' ? 'disabled' : ''}>✔ Обработано</button>
            <button data-action="delete">❌ Удалить</button>
        `;

        list.appendChild(card);
    });
}

/* ====== GLOBAL ADMIN HANDLER (через контроллеры и services) ====== */

document.addEventListener('click', e => {
    if (e.target.dataset.filter) {
        controllers.admin.setFilter(e.target.dataset.filter);
        return;
    }

    if (e.target.dataset.action) {
        const card = e.target.closest('.request-card');
        if (!card) return;

        // используем контроллер, который вызывает сервисы (SRP)
        controllers.admin.handleAction(e.target.dataset.action, card);
    }
});

/* ================= COUNTER ================= */

function updateAdminCounter() {
    // всё ещё доступно для вызова из других мест (или подписок eventBus)
    if (!dom.adminLink) {
        dom.adminLink = document.querySelector('a[href="#admin"]');
    }
    if (!dom.adminLink) return;

    const count = state.requests.length;
    dom.adminLink.textContent = count > 0 ? `Админ (${count})` : 'Админ';
}

/* ================= LOGOUT ================= */

function initLogout() {
    const logoutLink = document.getElementById('logout-link');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', e => {
        e.preventDefault();
        services.auth.logout();
    });
}

/* ================= HOME ENHANCEMENTS ================= */

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

    /* ===== открыть ===== */

    function openModal() {
        lastFocusedElement = document.activeElement;
        modal.classList.add("active");
        document.body.classList.add("modal-open");

        setTimeout(() => nameInput.focus(), 100);
    }

    guestButtons.forEach(button => {
        button.addEventListener("click", openModal);
    });

    /* ===== закрыть ===== */

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

    /* ===== ограничения имени ===== */

    nameInput.addEventListener("input", debounce(function () {

        this.value = this.value
            .replace(/[^a-zA-Zа-яА-Я\s]/g, '')
            .slice(0,30);

    },300));


    /* ===== маска телефона ===== */

    phoneInput.addEventListener("input", debounce(function(){

        let digits = this.value.replace(/\D/g,'').slice(0,11);

        let result = "+7";

        if(digits.length > 1) result += " (" + digits.slice(1,4);
        if(digits.length >= 4) result += ") " + digits.slice(4,7);
        if(digits.length >= 7) result += "-" + digits.slice(7,9);
        if(digits.length >= 9) result += "-" + digits.slice(9,11);

        this.value = result;

    },300));


    /* ===== отправка ===== */

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

