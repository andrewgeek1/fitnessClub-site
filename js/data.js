const data = {
    subscriptions: [
        { name: "Базовый", duration: "1 месяц", price: 2000 },
        { name: "Премиум", duration: "3 месяца", price: 5000 },
        { name: "VIP", duration: "6 месяцев", price: 9000 }
    ],

    schedule: [
        { day: "Понедельник", time: "18:00", type: "Йога", trainer: "Иван" },
        { day: "Вторник", time: "19:00", type: "Силовая", trainer: "Мария" },
        { day: "Среда", time: "17:00", type: "Кардио", trainer: "Алексей" }
    ],

    trainers: [
        { name: "Иван", specialization: "Йога", photo: "ivan.jpg" },
        { name: "Дарья", specialization: "Силовые", photo: "dasha.jpg" },
        { name: "Дмитрий", specialization: "Кардио", photo: "dima.jpg" }
    ]
};

const users = [
    { username: 'admin', password: '1234', role: 'admin' },
    { username: 'user', password: '1111', role: 'user' }
];