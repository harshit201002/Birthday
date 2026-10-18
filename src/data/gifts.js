// Keep array order and stable IDs. Add a photo path and set available: true to unlock a letter.
// Photos belong in public/letters/; unavailable gifts have no invented title or asset path.
const gifts = [
  { id: 'gift-01', number: 1, title: 'Gift 1', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-01.png`, available: true },
  { id: 'gift-02', number: 2, title: 'Ferrari Cap', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-02.png`, available: true },
  { id: 'gift-03', number: 3, title: 'Gift 3', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-03.png`, available: true },
  { id: 'gift-04', number: 4, title: 'Gift 4', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-04.png`, available: true },
  { id: 'gift-05', number: 5, title: 'Gift 5', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-05.png`, available: true },
  { id: 'gift-06', number: 6, title: 'Gift 6', image: null, letterImage: `${import.meta.env.BASE_URL}letters/letter-06.png`, available: true },
];

export default gifts;
