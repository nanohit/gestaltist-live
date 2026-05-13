export type ProgramSession = {
  time: string;
  type: string;
  title: string;
  description: string;
  modalEnabled?: boolean;
  modalTitle?: string;
  modalBody?: string;
  modalIsList?: boolean;
};

export type ProgramDay = {
  date: string;
  sessions: ProgramSession[];
};

export type Speaker = {
  name: string;
  role: string;
  experience: string;
  description: string;
  tags: string[];
  photoUrl: string;
};

export type PricingOption = {
  label?: string;
  period: string;
  price: string;
  features: string[];
  highlight?: boolean;
};

export type RegistrationNotifications = {
  title: string;
  items: string[];
};

export type ContactSection = {
  title: string;
  phone: string;
  email: string;
};

export type HeroDetail = {
  label: string;
  value: string;
  isList?: boolean;
};

export type HeroImage = {
  url: string;
  scale: number;
};

type SectionBase = {
  id: string;
  visible: boolean;
  heading: string;
  navLabel: string;
};

export type ProgramSectionData = SectionBase & {
  type: 'program';
  days: ProgramDay[];
};

export type SpeakersSectionData = SectionBase & {
  type: 'speakers';
  speakers: Speaker[];
};

export type PricingSectionData = SectionBase & {
  type: 'pricing';
  options: PricingOption[];
};

export type RegistrationSectionData = SectionBase & {
  type: 'registration';
  steps: { text: string; emphasis?: boolean }[];
  buttonText: string;
  buttonUrl: string;
  buttonColor?: string;
  notifications: RegistrationNotifications;
  contact: ContactSection;
};

export type TextSectionData = SectionBase & {
  type: 'text';
  body: string;
};

export type AccordionItem = {
  title: string;
  body: string;
};

export type AccordionSectionData = SectionBase & {
  type: 'accordion';
  items: AccordionItem[];
};

export type Section =
  | ProgramSectionData
  | SpeakersSectionData
  | PricingSectionData
  | RegistrationSectionData
  | TextSectionData
  | AccordionSectionData;

export type SiteContent = {
  primaryColor: string;
  hero: {
    images?: HeroImage[];
    label: string;
    heading: string;
    subheading: string;
    primaryButtonText: string;
    primaryButtonColor?: string;
    secondaryButtonText: string;
    secondaryButtonColor?: string;
    details: HeroDetail[];
  };
  sections: Section[];
  footerText: string;
  footerNote: string;
};

// ---------- Factory helpers ----------

function uid() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const createEmptySession = (): ProgramSession => ({
  time: '00:00 - 00:00',
  type: 'Тип сессии',
  title: 'Название сессии',
  description: 'Описание сессии',
});

export const createEmptyDay = (): ProgramDay => ({
  date: 'Новый день',
  sessions: [createEmptySession()],
});

export const createEmptySpeaker = (): Speaker => ({
  name: 'Имя спикера',
  role: 'Роль',
  experience: 'Опыт',
  description: 'Описание спикера',
  tags: ['Новый тег'],
  photoUrl: '',
});

export const createEmptyPricingOption = (): PricingOption => ({
  label: '',
  period: 'Новый период',
  price: '0₽',
  features: ['Новое преимущество'],
  highlight: false,
});

export function createProgramSection(): ProgramSectionData {
  return {
    id: uid(),
    type: 'program',
    visible: true,
    heading: 'Программа',
    navLabel: 'Программа',
    days: [createEmptyDay()],
  };
}

export function createSpeakersSection(): SpeakersSectionData {
  return {
    id: uid(),
    type: 'speakers',
    visible: true,
    heading: 'Спикеры',
    navLabel: 'Спикеры',
    speakers: [createEmptySpeaker()],
  };
}

export function createPricingSection(): PricingSectionData {
  return {
    id: uid(),
    type: 'pricing',
    visible: true,
    heading: 'Стоимость участия',
    navLabel: 'Стоимость',
    options: [createEmptyPricingOption()],
  };
}

export function createRegistrationSection(): RegistrationSectionData {
  return {
    id: uid(),
    type: 'registration',
    visible: true,
    heading: 'Регистрация',
    navLabel: 'Регистрация',
    steps: [{ text: 'Новый шаг' }],
    buttonText: 'Зарегистрироваться',
    buttonUrl: '#',
    notifications: { title: 'Уведомления:', items: ['Новый пункт'] },
    contact: { title: 'Контакты', phone: '+7 000 000-00-00', email: 'email@example.com' },
  };
}

export function createTextSection(): TextSectionData {
  return {
    id: uid(),
    type: 'text',
    visible: true,
    heading: 'Новый раздел',
    navLabel: 'Раздел',
    body: 'Текст раздела',
  };
}

export function createAccordionSection(): AccordionSectionData {
  return {
    id: uid(),
    type: 'accordion',
    visible: true,
    heading: 'Подробнее',
    navLabel: 'Подробнее',
    items: [{ title: 'Заголовок', body: 'Текст блока' }],
  };
}

export function createSection(type: Section['type']): Section {
  switch (type) {
    case 'program': return createProgramSection();
    case 'speakers': return createSpeakersSection();
    case 'pricing': return createPricingSection();
    case 'registration': return createRegistrationSection();
    case 'text': return createTextSection();
    case 'accordion': return createAccordionSection();
  }
}

// ---------- Default content ----------

export const defaultContent: SiteContent = {
  primaryColor: '#0aa5b5',
  hero: {
    label: 'Конференция Онлайн',
    heading: 'Актуальные вопросы гештальт-терапии',
    subheading: 'Терапевтическая практика. Современные реалии',
    primaryButtonText: 'Зарегистрироваться',
    secondaryButtonText: 'Программа',
    details: [
      { label: 'Дата', value: '24, 25, 26 ноября 2025' },
      { label: 'Время', value: '10:00 - 14:00 МСК' },
      { label: 'Формат', value: 'Онлайн' },
    ],
  },
  sections: [
    {
      id: 'program',
      type: 'program' as const,
      visible: true,
      heading: 'Программа конференции',
      navLabel: 'Программа',
      days: [
        {
          date: '24 ноября',
          sessions: [
            { time: '10:00\u00a0-\u00a011:30', type: 'Пленарная сессия', title: 'Основы гештальт-терапии в современном контексте', description: 'Основной доклад' },
            { time: '11:45 - 13:15', type: 'Семинар', title: 'Работа с травмой через призму гештальт-подхода', description: 'Практический семинар' },
            { time: '13:15 - 14:00', type: 'Дискуссия', title: 'Обсуждения и QA', description: 'Интерактивная сессия' },
          ],
        },
        {
          date: '25 ноября',
          sessions: [
            { time: '10:00\u00a0-\u00a011:30', type: 'Пленарная сессия', title: 'Контакт и поддержка в онлайн-терапии', description: 'Методологический доклад' },
            { time: '11:45 - 13:15', type: 'Мастер-класс', title: 'Полевые процессы в групповой работе', description: 'Групповой опыт' },
            { time: '13:15 - 14:00', type: 'Супервизия', title: 'Супервизорские группы: обмен опытом', description: 'Интерактивная сессия' },
          ],
        },
        {
          date: '26 ноября',
          sessions: [
            { time: '10:00\u00a0-\u00a011:30', type: 'Пленарная сессия', title: 'Контакт и поддержка в онлайн-терапии', description: 'Методологический доклад' },
            { time: '11:45 - 13:15', type: 'Мастер-класс', title: 'Полевые процессы в групповой работе', description: 'Групповой опыт' },
            { time: '13:15 - 14:00', type: 'Супервизия', title: 'Супервизорские группы: обмен опытом', description: 'Интерактивная сессия' },
          ],
        },
      ],
    },
    {
      id: 'speakers',
      type: 'speakers' as const,
      visible: true,
      heading: 'Спикеры конференции',
      navLabel: 'Спикеры',
      speakers: [
        { name: 'Анна Петрова', role: 'Ведущий гештальт-терапевт', experience: '15+ лет практики', description: 'Специалист по работе с терапевтическим опытом. Автор публикаций по современным подходам в гештальт-терапии.', tags: ['Контакт', 'Поддержка', 'Травма и восстановление'], photoUrl: '' },
        { name: 'Михаил Иванов', role: 'Супервизор, тренер', experience: '20+ лет практики', description: 'Эксперт в области групповых процессов и полевых феноменов. Ведущий программ подготовки терапевтов.', tags: ['Супервизия', 'Обучение', 'Групповая терапия'], photoUrl: '' },
        { name: 'Дмитрий Козлов', role: 'Философ, терапевт', experience: '18 лет практики', description: 'Специалист по работе с травматическим опытом. Автор публикаций по современным подходам в гештальт-терапии.', tags: ['Философия', 'Современность', 'Этика терапии'], photoUrl: '' },
        { name: 'Елена Смирнова', role: 'Клинический психолог', experience: '12 лет практики', description: 'Пионер в области онлайн гештальт-терапии. Исследователь цифровых особенностей контакта в цифровом пространстве.', tags: ['Контакт', 'Онлайн-практика', 'Интеграция'], photoUrl: '' },
      ],
    },
    {
      id: 'pricing',
      type: 'pricing' as const,
      visible: true,
      heading: 'Стоимость участия',
      navLabel: 'Стоимость',
      options: [
        { label: 'Лучшая цена', period: 'До 20 октября', price: '6 000₽', features: ['Доступ ко всем сессиям', 'Материалы конференции', 'Сертификат участника', 'Запись всех выступлений'], highlight: true },
        { period: 'С 20 октября', price: '7 000₽', features: ['Доступ ко всем сессиям', 'Материалы конференции', 'Сертификат участника', 'Запись всех выступлений'], highlight: false },
        { period: 'С 17 ноября и в день начала', price: '8 000₽', features: ['Доступ ко всем сессиям', 'Материалы конференции', 'Сертификат участника', 'Запись всех выступлений'], highlight: false },
      ],
    },
    {
      id: 'registration',
      type: 'registration' as const,
      visible: true,
      heading: 'Регистрация и оплата',
      navLabel: 'Регистрация',
      steps: [
        { text: 'Заполните форму регистрации с вашими контактными данными' },
        { text: 'Оплатите участие по реквизитам, полученным на email/телефон, который вы указали при регистрации', emphasis: true },
        { text: 'После подтверждения оплаты получите ссылку на Zoom' },
      ],
      buttonText: 'Зарегистрироваться через форму',
      buttonUrl: 'https://forms.gle/6DKLwvSLYGK5oMA3A',
      notifications: {
        title: 'Автоматические уведомления:',
        items: [
          'Подтверждение регистрации приходит сразу после заполнения формы.',
          'Подтверждение оплаты и ссылка на Zoom — после поступления оплаты.',
          'Напоминание и ссылка — за день до начала конференции.',
        ],
      },
      contact: {
        title: 'Контакты организаторов',
        phone: '+7 495 123-45-67',
        email: 'info@gestalt.ru',
      },
    },
  ],
  footerText: 'Конференция: Актуальные вопросы гештальт-терапии',
  footerNote: '2025 Все права защищены.',
};
