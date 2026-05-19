import {
  ClubPlan,
  EventItem,
  FaqItem,
  HeroSlide,
  ScheduleItem,
  SubscriptionItem,
  TrainerItem
} from '../models/site-content.model';
import { User } from '../models/user.model';

export const HERO_SLIDES: HeroSlide[] = [
  {
    kicker: 'Премиальный клуб',
    title: 'ФИТНЕС-КЛУБ<br>ПРЕМИУМ КЛАССА',
    lead: 'Пространство с современными тренажерами, персональными программами и тренерами.',
    image: 'assets/images/main.jpg',
    alt: 'Зал фитнес-клуба'
  },
  {
    kicker: 'Премиальный клуб',
    title: 'СОДОСТУП В<br>ТЕРМАЛЬНЫЙ КОМПЛЕКС',
    lead: 'Комбинируйте тренировки с отдыхом в термальном комплексе по вашей клубной карте.',
    image: 'assets/images/main term.jpg',
    alt: 'Термальный комплекс'
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Что будет с абонементом, если клуб снова закроют?',
    answer:
      'Заморозка включается автоматически на период закрытия. Срок абонемента продлевается на время заморозки.'
  },
  {
    question: 'Можно ли вернуть деньги после оплаты?',
    answer:
      'Да, перерасчёт выполняется по фактически использованному периоду по условиям договора и правилам клуба.'
  },
  {
    question: 'Как купить абонемент со скидкой?',
    answer:
      'Следите за блоком «Акции и события» на главной или оставьте заявку - менеджер подберёт актуальное предложение.'
  },
  {
    question: 'Можно ли прийти на экскурсию перед покупкой?',
    answer:
      'Да. Заполните «Гостевой визит», и мы согласуем удобное время для знакомства с клубом.'
  }
];

export const ZONE_GALLERY_IMAGES = [
  { image: 'assets/images/1.jpg', alt: 'Тренажерный зал' },
  { image: 'assets/images/photo-line2.jpg', alt: 'Функциональная зона' },
  { image: 'assets/images/2.jpg', alt: 'Тренировка с тренером' }
];

export const CLUB_PLANS: ClubPlan[] = [
  {
    cover: 'Фитнес день',
    term: '12 месяцев',
    title: 'Фитнес день',
    description: 'Безлимитное посещение фитнес-клуба в дневное время.',
    modifier: 'plan-card--light'
  },
  {
    cover: 'Base',
    term: '3 / 12 месяцев',
    title: 'Базовая',
    description: 'Фитнес-клуб + водная зона, спортивный бассейн и сауна.',
    modifier: 'plan-card--pink'
  },
  {
    cover: 'Premium',
    term: '9 / 12 / 15 месяцев',
    title: 'Премиум',
    description: 'Безлимитное посещение фитнес-клуба и термального комплекса.',
    modifier: 'plan-card--dark'
  },
  {
    cover: 'VIP',
    term: '12 месяцев',
    title: 'VIP',
    description: 'Персональный сервис, расширенная инфраструктура и приоритетная поддержка.',
    modifier: 'plan-card--black'
  }
];

export const EVENT_ITEMS: EventItem[] = [
  {
    category: 'news',
    meta: 'Новости • 18 февраля 2026',
    cover: 'Заявление на справку для вычета',
    title: 'Получение справки для налогового вычета'
  },
  {
    category: 'news',
    meta: 'Новости • 31 января 2026',
    cover: 'Положение о предоставлении справок об оплате',
    title: 'Порядок выдачи справок об оплате физкультурных услуг'
  },
  {
    category: 'promo',
    meta: 'Акции • 5 марта 2026',
    cover: 'Скидка 20% на персональные тренировки',
    title: 'Пакет PT-10 со скидкой при покупке клубной карты'
  },
  {
    category: 'event',
    meta: 'Мероприятия • 12 марта 2026',
    cover: 'Открытая функциональная тренировка',
    title: 'Групповая тренировка с ведущими тренерами клуба'
  }
];

export const SUBSCRIPTIONS: SubscriptionItem[] = [
  { name: 'Базовый', duration: '1 месяц', price: 2000 },
  { name: 'Премиум', duration: '3 месяца', price: 5000 },
  { name: 'VIP', duration: '6 месяцев', price: 9000 }
];

export const SCHEDULE_ITEMS: ScheduleItem[] = [
  { day: 'Понедельник', time: '18:00', type: 'Йога', trainer: 'Иван' },
  { day: 'Вторник', time: '19:00', type: 'Силовая', trainer: 'Мария' },
  { day: 'Среда', time: '17:00', type: 'Кардио', trainer: 'Алексей' }
];

export const TRAINERS: TrainerItem[] = [
  { name: 'Иван', specialization: 'Йога', photo: 'ivan.jpg' },
  { name: 'Дарья', specialization: 'Силовые', photo: 'dasha.jpg' },
  { name: 'Дмитрий', specialization: 'Кардио', photo: 'dima.jpg' }
];

export const USERS: User[] = [
  { username: 'admin', password: '1234', role: 'admin' },
  { username: 'user', password: '1111', role: 'user' }
];
