import { createDeck, shuffle, RANK_VALUES } from '../core/deck';

describe('Deck Operations', () => {
  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should have 13 cards of each suit', () => {
      const deck = createDeck();
      const suits = ['♠', '♥', '♦', '♣'];

      suits.forEach(suit => {
        const suitCards = deck.filter(c => c.suit === suit);
        expect(suitCards).toHaveLength(13);
      });
    });

    it('should have 4 cards of each rank', () => {
      const deck = createDeck();
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

      ranks.forEach(rank => {
        const rankCards = deck.filter(c => c.rank === rank);
        expect(rankCards).toHaveLength(4);
      });
    });

    it('should have correct value property', () => {
      const deck = createDeck();
      const aceCard = deck.find(c => c.rank === 'A');
      const kingCard = deck.find(c => c.rank === 'K');
      const twoCard = deck.find(c => c.rank === '2');

      expect(aceCard?.value).toBe(14);
      expect(kingCard?.value).toBe(13);
      expect(twoCard?.value).toBe(2);
    });
  });

  describe('shuffle', () => {
    it('should return a deck with same length', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled).toHaveLength(52);
    });

    it('should not modify original deck', () => {
      const deck = createDeck();
      const original = [...deck];
      shuffle(deck);
      expect(deck).toEqual(original);
    });

    it('should produce different order (probabilistic)', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);

      let differences = 0;
      for (let i = 0; i < deck.length; i++) {
        if (deck[i].rank !== shuffled[i].rank || deck[i].suit !== shuffled[i].suit) {
          differences++;
        }
      }

      expect(differences).toBeGreaterThan(10);
    });
  });

  describe('RANK_VALUES', () => {
    it('should have correct values for all ranks', () => {
      expect(RANK_VALUES['2']).toBe(2);
      expect(RANK_VALUES['10']).toBe(10);
      expect(RANK_VALUES['J']).toBe(11);
      expect(RANK_VALUES['Q']).toBe(12);
      expect(RANK_VALUES['K']).toBe(13);
      expect(RANK_VALUES['A']).toBe(14);
    });
  });
});
