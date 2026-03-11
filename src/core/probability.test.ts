import { calculateWinProbability, getPreflopKey, PREFLOP_STRENGTH } from '../core/probability';
import { Card } from '../types';

describe('Win Probability Calculator', () => {
  const makeCard = (rank: string, suit: string): Card => ({
    rank: rank as any,
    suit: suit as any,
    value: { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 }[rank] || 0
  });

  describe('getPreflopKey', () => {
    it('should return correct key for pocket pairs', () => {
      const aces = [makeCard('A', '♠'), makeCard('A', '♥')];
      expect(getPreflopKey(aces)).toBe('AA');
    });

    it('should return correct key for suited cards', () => {
      const akSuited = [makeCard('A', '♠'), makeCard('K', '♠')];
      expect(getPreflopKey(akSuited)).toBe('AKs');
    });

    it('should return correct key for offsuit cards', () => {
      const akOffsuit = [makeCard('A', '♠'), makeCard('K', '♥')];
      expect(getPreflopKey(akOffsuit)).toBe('AKo');
    });

    it('should normalize card order (high card first)', () => {
      const cards1 = [makeCard('K', '♠'), makeCard('A', '♥')];
      const cards2 = [makeCard('A', '♠'), makeCard('K', '♥')];
      expect(getPreflopKey(cards1)).toBe(getPreflopKey(cards2));
    });
  });

  describe('calculateWinProbability - Preflop', () => {
    it('should return high probability for pocket aces', () => {
      const aces = [makeCard('A', '♠'), makeCard('A', '♥')];
      const prob = calculateWinProbability(aces, [], 1);
      expect(prob).toBeGreaterThan(0.7);
    });

    it('should decrease probability with more opponents', () => {
      const aces = [makeCard('A', '♠'), makeCard('A', '♥')];
      const prob1 = calculateWinProbability(aces, [], 1);
      const prob4 = calculateWinProbability(aces, [], 4);
      expect(prob1).toBeGreaterThan(prob4);
    });

    it('should return lower probability for weak hands', () => {
      const weak = [makeCard('7', '♠'), makeCard('2', '♥')];
      const prob = calculateWinProbability(weak, [], 1);
      expect(prob).toBeLessThan(0.5);
    });
  });

  describe('calculateWinProbability - Postflop', () => {
    it('should return high probability for made flush', () => {
      const hole = [makeCard('A', '♠'), makeCard('K', '♠')];
      const community = [makeCard('Q', '♠'), makeCard('J', '♠'), makeCard('9', '♠')];
      const prob = calculateWinProbability(hole, community, 1);
      expect(prob).toBeGreaterThan(0.65);
    });

    it('should return very high probability for four of a kind', () => {
      const hole = [makeCard('A', '♠'), makeCard('A', '♥')];
      const community = [makeCard('A', '♦'), makeCard('A', '♣'), makeCard('K', '♠')];
      const prob = calculateWinProbability(hole, community, 1);
      expect(prob).toBeGreaterThan(0.85);
    });

    it('should return moderate probability for one pair', () => {
      const hole = [makeCard('A', '♠'), makeCard('K', '♥')];
      const community = [makeCard('A', '♦'), makeCard('7', '♣'), makeCard('2', '♠')];
      const prob = calculateWinProbability(hole, community, 1);
      expect(prob).toBeGreaterThan(0.2);
      expect(prob).toBeLessThan(0.5);
    });
  });

  describe('PREFLOP_STRENGTH', () => {
    it('should have entries for premium hands', () => {
      expect(PREFLOP_STRENGTH['AA']).toBeDefined();
      expect(PREFLOP_STRENGTH['KK']).toBeDefined();
      expect(PREFLOP_STRENGTH['AKs']).toBeDefined();
    });

    it('should rank AA higher than KK', () => {
      expect(PREFLOP_STRENGTH['AA']).toBeGreaterThan(PREFLOP_STRENGTH['KK']);
    });
  });
});
