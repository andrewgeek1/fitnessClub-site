export interface HeroSlide {
  kicker: string;
  title: string;
  lead: string;
  image: string;
  alt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ClubPlan {
  cover: string;
  term: string;
  title: string;
  description: string;
  modifier: string;
}

export interface EventItem {
  category: 'news' | 'promo' | 'event';
  meta: string;
  cover: string;
  title: string;
}

export interface SubscriptionItem {
  name: string;
  duration: string;
  price: number;
}

export interface ScheduleItem {
  day: string;
  time: string;
  type: string;
  trainer: string;
}

export interface TrainerItem {
  name: string;
  specialization: string;
  photo: string;
}
