import { buildPots } from '../core/pot';
import { Player } from '../types';

describe('Pot Calculation', () => {
  const makePlayer = (name: string, chips: number, totalContributed: number, folded: boolean = false): Player => ({
    id: name,
    name,
    chips,
    hand: [],
    folded,
    allIn: false,
    bet: 0,
    totalContributed,
    rebuys: 0,
    personality: null
  });

  describe('buildPots', () => {
    it('should create single pot when all players contribute equally', () => {
      const players = [
        makePlayer('Alice', 900, 100),
        makePlayer('Bob', 900, 100),
        makePlayer('Charlie', 900, 100)
      ];

      const pots = buildPots(players);

      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligible).toHaveLength(3);
    });

    it('should create side pots when player is all-in', () => {
      const players = [
        makePlayer('Alice', 0, 50),
        makePlayer('Bob', 850, 150),
        makePlayer('Charlie', 850, 150)
      ];

      const pots = buildPots(players);

      expect(pots.length).toBeGreaterThan(1);
      expect(pots[0].amount).toBe(150); // Main pot: 50 * 3
      expect(pots[0].eligible).toHaveLength(3);
      expect(pots[1].amount).toBe(200); // Side pot: 100 * 2
      expect(pots[1].eligible).toHaveLength(2);
    });

    it('should handle multiple all-ins', () => {
      const players = [
        makePlayer('Alice', 0, 30),
        makePlayer('Bob', 0, 80),
        makePlayer('Charlie', 820, 180)
      ];

      const pots = buildPots(players);

      expect(pots).toHaveLength(3);
      expect(pots[0].amount).toBe(90); // 30 * 3
      expect(pots[1].amount).toBe(100); // 50 * 2
      expect(pots[2].amount).toBe(100); // 100 * 1
    });

    it('should exclude folded players from eligibility', () => {
      const players = [
        makePlayer('Alice', 900, 100, true), // folded
        makePlayer('Bob', 900, 100),
        makePlayer('Charlie', 900, 100)
      ];

      const pots = buildPots(players);

      expect(pots[0].eligible).toHaveLength(2);
      expect(pots[0].eligible.find(p => p.name === 'Alice')).toBeUndefined();
    });
  });
});
