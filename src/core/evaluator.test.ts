import { evaluateHand, compareHands, HAND_RANKS } from '../core/evaluator';
import { Card } from '../types';

describe('Hand Evaluator', () => {
  const makeCard = (rank: string, suit: string): Card => ({
    rank: rank as any,
    suit: suit as any,
    value: { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 }[rank] || 0
  });

  describe('Royal Flush', () => {
    it('should detect royal flush', () => {
      const hole = [makeCard('A', '♠'), makeCard('K', '♠')];
      const community = [makeCard('Q', '♠'), makeCard('J', '♠'), makeCard('10', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.ROYAL_FLUSH);
      expect(result.name).toBe('Royal Flush');
    });
  });

  describe('Straight Flush', () => {
    it('should detect straight flush', () => {
      const hole = [makeCard('9', '♥'), makeCard('8', '♥')];
      const community = [makeCard('7', '♥'), makeCard('6', '♥'), makeCard('5', '♥'), makeCard('A', '♠'), makeCard('K', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.STRAIGHT_FLUSH);
    });
  });

  describe('Four of a Kind', () => {
    it('should detect four of a kind', () => {
      const hole = [makeCard('A', '♠'), makeCard('A', '♥')];
      const community = [makeCard('A', '♦'), makeCard('A', '♣'), makeCard('K', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.FOUR_OF_A_KIND);
    });
  });

  describe('Full House', () => {
    it('should detect full house', () => {
      const hole = [makeCard('K', '♠'), makeCard('K', '♥')];
      const community = [makeCard('K', '♦'), makeCard('Q', '♣'), makeCard('Q', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.FULL_HOUSE);
    });
  });

  describe('Flush', () => {
    it('should detect flush', () => {
      const hole = [makeCard('A', '♠'), makeCard('K', '♠')];
      const community = [makeCard('Q', '♠'), makeCard('J', '♠'), makeCard('9', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.FLUSH);
    });
  });

  describe('Straight', () => {
    it('should detect straight', () => {
      const hole = [makeCard('9', '♠'), makeCard('8', '♥')];
      const community = [makeCard('7', '♦'), makeCard('6', '♣'), makeCard('5', '♠'), makeCard('A', '♥'), makeCard('K', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.STRAIGHT);
    });

    it('should detect wheel (A-2-3-4-5)', () => {
      const hole = [makeCard('A', '♠'), makeCard('2', '♥')];
      const community = [makeCard('3', '♦'), makeCard('4', '♣'), makeCard('5', '♠'), makeCard('K', '♥'), makeCard('Q', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.STRAIGHT);
    });
  });

  describe('Three of a Kind', () => {
    it('should detect three of a kind', () => {
      const hole = [makeCard('K', '♠'), makeCard('K', '♥')];
      const community = [makeCard('K', '♦'), makeCard('Q', '♣'), makeCard('J', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.THREE_OF_A_KIND);
    });
  });

  describe('Two Pair', () => {
    it('should detect two pair', () => {
      const hole = [makeCard('K', '♠'), makeCard('K', '♥')];
      const community = [makeCard('Q', '♦'), makeCard('Q', '♣'), makeCard('J', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.TWO_PAIR);
    });
  });

  describe('One Pair', () => {
    it('should detect one pair', () => {
      const hole = [makeCard('K', '♠'), makeCard('K', '♥')];
      const community = [makeCard('Q', '♦'), makeCard('J', '♣'), makeCard('10', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.ONE_PAIR);
    });
  });

  describe('High Card', () => {
    it('should detect high card', () => {
      const hole = [makeCard('A', '♠'), makeCard('K', '♥')];
      const community = [makeCard('Q', '♦'), makeCard('J', '♣'), makeCard('9', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];
      const result = evaluateHand(hole, community);
      expect(result.rank).toBe(HAND_RANKS.HIGH_CARD);
    });
  });

  describe('Hand Comparison', () => {
    it('should compare hands correctly', () => {
      const hole1 = [makeCard('A', '♠'), makeCard('A', '♥')];
      const hole2 = [makeCard('K', '♠'), makeCard('K', '♥')];
      const community = [makeCard('Q', '♦'), makeCard('J', '♣'), makeCard('10', '♠'), makeCard('2', '♥'), makeCard('3', '♦')];

      const hand1 = evaluateHand(hole1, community);
      const hand2 = evaluateHand(hole2, community);

      expect(compareHands(hand1, hand2)).toBeGreaterThan(0);
    });
  });
});
