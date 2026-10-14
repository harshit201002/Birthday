// Keep array order and stable IDs. Add a photo path and set available: true to unlock a letter.
// Photos belong in public/letters/; unavailable gifts have no invented title or asset path.
const gifts = [
  { id: 'gift-01', number: 1, title: 'Gift 1', image: null, letterImage: '/letters/letter-01.png', available: true },
  { id: 'gift-02', number: 2, title: 'Ferrari Cap', image: null, letterImage: '/letters/letter-02.png', available: true },
  { id: 'gift-03', number: 3, title: null, image: null, letterImage: null, available: false },
  { id: 'gift-04', number: 4, title: null, image: null, letterImage: null, available: false },
  { id: 'gift-05', number: 5, title: null, image: null, letterImage: null, available: false },
  { id: 'gift-06', number: 6, title: null, image: null, letterImage: null, available: false },
];

export default gifts;
