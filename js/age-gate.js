const KEY = 'lexicon.v1.age18';
const WINDOW_MS = 60 * 60 * 1000;
let memoryVerifiedAt = 0;

export function isVerified(now = Date.now()) {
  let at = memoryVerifiedAt;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.at === 'number') at = Math.max(at, saved.at);
  } catch { }
  return at > 0 && now >= at && now - at < WINDOW_MS;
}

export function markVerified(now = Date.now()) {
  memoryVerifiedAt = now;
  try { localStorage.setItem(KEY, JSON.stringify({ at: now })); } catch { }
}

const QUESTIONS = [
  {
    q: 'Which document does a bank ask you to sign before lending money to buy a home?',
    options: ['A mortgage agreement', 'A library card', 'A school report', 'A birthday invitation'],
    answer: 'A mortgage agreement',
    seconds: 10,
  },
  {
    q: 'What is a payslip mainly used for?',
    options: ['Recording pay, deductions and take-home income', 'Tracking homework', 'Listing favourite games', 'Booking a holiday'],
    answer: 'Recording pay, deductions and take-home income',
    seconds: 10,
  },
  {
    q: 'Which of these is a legal duty of a car owner on public roads?',
    options: ['Keeping valid vehicle insurance', 'Feeding the car', 'Choosing its colour', 'Washing it every day'],
    answer: 'Keeping valid vehicle insurance',
    seconds: 10,
  },
  {
    q: 'When you rent a flat, which document sets out the rent, the deposit and the notice period?',
    options: ['A lease agreement', 'A birthday invitation', 'A library receipt', 'A bus timetable'],
    answer: 'A lease agreement',
    seconds: 15,
  },
  {
    q: 'What is a credit score used for by lenders?',
    options: ['Judging how reliably someone repays loans', 'Ranking video game players', 'Measuring school attendance', 'Counting daily steps'],
    answer: 'Judging how reliably someone repays loans',
    seconds: 15,
  },
  {
    q: 'Which of these is a monthly payment for keeping a phone plan or streaming service active?',
    options: ['A subscription', 'An allowance', 'A scholarship', 'Pocket money'],
    answer: 'A subscription',
    seconds: 10,
  },
  {
    q: 'Which savings product is designed to provide income after a person stops working?',
    options: ['A pension plan', 'A comic book club', 'A summer camp fee', 'A pizza voucher'],
    answer: 'A pension plan',
    seconds: 10,
  },
  {
    q: 'In most countries, which of these requires proof of being of legal adult age at the point of sale?',
    options: ['Buying alcohol', 'Buying a comic book', 'Entering a public library', 'Riding a bicycle'],
    answer: 'Buying alcohol',
    seconds: 10,
  },
];

let lastAsked = null;

export function pickQuestion() {
  let pool = QUESTIONS.filter(item => item !== lastAsked);
  if (!pool.length) pool = QUESTIONS;
  const item = pool[Math.floor(Math.random() * pool.length)];
  lastAsked = item;
  const options = item.options.slice();
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { q: item.q, options, answer: item.answer, seconds: item.seconds };
}
