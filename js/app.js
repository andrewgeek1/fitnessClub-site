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
        <h1>Контакты</h1>

        <div class="contact-layout">

            <!-- КАРТА -->
            <div class="map-container">
                <iframe
                    src="https://yandex.ru/map-widget/v1/?ll=44.0075%2C56.2965&z=12"
                    width="100%"
                    height="100%"
                    frameborder="0">
                </iframe>
            </div>

            <!-- ПРАВАЯ КОЛОНКА -->
            <div class="right-column">

                <!-- Блок Клуб -->
                <div class="club-info">
                    <h2>Клуб</h2>
                    <p>Нижний Новгород, пр. Гагарина, 35, корп.3, 3 этаж</p>
                    <p>Пн - Пт | 6:30 - 23:00</p>
                    <p>Сб - Вс | 8:00 - 22:00</p>
                    <button class="feedback-btn">Обратная связь</button>
                </div>

                <!-- Блок Отдел продаж -->
                <div class="sales-info">
                    <h2>Отдел продаж</h2>
                    <p>8 (831) 2-172-172</p>
                    <p>Ежедневно | 10:00 - 21:00</p>
                    <p>sale@oceanis-fitness.ru</p>
                    <div class="social-links">
                        <a href="#">Vkontakte</a>
                        <a href="#">Telegram</a>
                    </div>
                </div>

            </div>
        </div>

        <!-- Форма записи -->
        <form class="contact-form" novalidate>
            <h2>Записаться на тренировку</h2>

            <input type="text" name="name" placeholder="Ваше имя">
            <small class="error"></small>

            <input type="tel" name="phone" placeholder="+7 (___) ___-__-__">
            <small class="error"></small>

            <button type="submit">Отправить заявку</button>
            <div class="form-message"></div>
        </form>
    `;

    contactsPage.appendChild(wrapper);

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

/* ================= GUEST VISIT MODAL ================= */

document.addEventListener("DOMContentLoaded", () => {

    const guestBtn = document.getElementById("guest-btn");
    const modal = document.getElementById("guest-modal");
    const closeBtn = document.getElementById("modal-close");
    const form = document.getElementById("guest-form");

    if (!guestBtn || !modal || !form) return;

    const nameInput = form.querySelector('input[type="text"]');
    const phoneInput = form.querySelector('input[type="tel"]');

    let message = document.createElement("div");
    message.className = "form-message";
    form.appendChild(message);

    /* ===== открыть ===== */

    guestBtn.addEventListener("click", () => {
        modal.classList.add("active");

        setTimeout(() => nameInput.focus(), 100);
    });

    /* ===== закрыть ===== */

    function closeModal(){
        modal.classList.remove("active");
        form.reset();
        message.textContent = "";
    }

    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click",(e)=>{
        if(e.target === modal){
            closeModal();
        }
    });

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
            button.textContent = "Записаться";

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

