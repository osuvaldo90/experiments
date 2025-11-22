import CalculationService from '../src/services/CalculationService.js';
import Check from '../src/models/Check.js';
import Item from '../src/models/Item.js';
import Participant from '../src/models/Participant.js';
import Claim from '../src/models/Claim.js';
import db from '../src/models/database.js';

describe('CalculationService', () => {
  let testCheckId;
  let participant1, participant2, participant3;
  let item1, item2, item3, taxItem, serviceItem;

  beforeEach(() => {
    // Create a test check
    const check = Check.create();
    testCheckId = check.id;

    // Create participants
    participant1 = Participant.create(testCheckId, { name: 'Alice', sessionId: 'session1' });
    participant2 = Participant.create(testCheckId, { name: 'Bob', sessionId: 'session2' });
    participant3 = Participant.create(testCheckId, { name: 'Charlie', sessionId: 'session3' });

    // Create items
    item1 = Item.create(testCheckId, { name: 'Burger', price: 15.00 });
    item2 = Item.create(testCheckId, { name: 'Pizza', price: 25.00 });
    item3 = Item.create(testCheckId, { name: 'Salad', price: 10.00 });
    taxItem = Item.create(testCheckId, { name: 'Tax', price: 5.00, isTax: true });
    serviceItem = Item.create(testCheckId, { name: 'Service', price: 7.50, isServiceCharge: true });
  });

  afterEach(() => {
    // Clean up test data
    if (testCheckId) {
      Check.delete(testCheckId);
    }
  });

  describe('getBreakdown', () => {
    it('should calculate simple split correctly', () => {
      // Alice claims burger, Bob claims burger (split 50/50)
      Claim.create(item1.id, participant1.id);
      Claim.create(item1.id, participant2.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 0);

      expect(breakdown.participants.length).toBe(3);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      expect(alice.subtotal).toBe(7.50);
      expect(bob.subtotal).toBe(7.50);
      expect(charlie.subtotal).toBe(0);
    });

    it('should handle three-way split with rounding', () => {
      // All three claim pizza (25.00 / 3 = 8.333...)
      Claim.create(item2.id, participant1.id);
      Claim.create(item2.id, participant2.id);
      Claim.create(item2.id, participant3.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 0);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Should round to 2 decimals
      expect(alice.subtotal).toBeCloseTo(8.33, 2);
      expect(bob.subtotal).toBeCloseTo(8.33, 2);
      expect(charlie.subtotal).toBeCloseTo(8.34, 2); // Last person gets adjustment

      // Total should equal item price
      const totalSubtotal = alice.subtotal + bob.subtotal + charlie.subtotal;
      expect(totalSubtotal).toBeCloseTo(25.00, 2);
    });

    it('should distribute tax proportionally', () => {
      // Alice: $25 (burger + salad), Bob: $12.50 (half pizza), Charlie: $12.50 (half pizza)
      // Total subtotal: $50
      Claim.create(item1.id, participant1.id); // $15
      Claim.create(item3.id, participant1.id); // $10
      Claim.create(item2.id, participant2.id); // $25 / 2
      Claim.create(item2.id, participant3.id); // $25 / 2

      const breakdown = CalculationService.getBreakdown(testCheckId, 0);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Alice has 50% of subtotal, should get 50% of tax (5.00 * 0.5 = 2.50)
      expect(alice.tax).toBeCloseTo(2.50, 2);

      // Bob and Charlie each have 25% of subtotal, should get 25% of tax each (5.00 * 0.25 = 1.25)
      expect(bob.tax).toBeCloseTo(1.25, 2);
      expect(charlie.tax).toBeCloseTo(1.25, 2);

      // Total tax should equal tax item
      const totalTax = alice.tax + bob.tax + charlie.tax;
      expect(totalTax).toBeCloseTo(5.00, 2);
    });

    it('should distribute service charge proportionally', () => {
      // Same setup as tax test
      Claim.create(item1.id, participant1.id);
      Claim.create(item3.id, participant1.id);
      Claim.create(item2.id, participant2.id);
      Claim.create(item2.id, participant3.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 0);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Service charge is 7.50, should be distributed 50/25/25
      expect(alice.serviceCharge).toBeCloseTo(3.75, 2);
      expect(bob.serviceCharge).toBeCloseTo(1.88, 2); // Rounded
      expect(charlie.serviceCharge).toBeCloseTo(1.87, 2); // Adjusted

      // Total should equal service charge
      const totalService = alice.serviceCharge + bob.serviceCharge + charlie.serviceCharge;
      expect(totalService).toBeCloseTo(7.50, 2);
    });

    it('should distribute tip proportionally', () => {
      // Same setup
      Claim.create(item1.id, participant1.id);
      Claim.create(item3.id, participant1.id);
      Claim.create(item2.id, participant2.id);
      Claim.create(item2.id, participant3.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 10.00);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Tip is 10.00, should be distributed 50/25/25
      expect(alice.tip).toBeCloseTo(5.00, 2);
      expect(bob.tip).toBeCloseTo(2.50, 2);
      expect(charlie.tip).toBeCloseTo(2.50, 2);

      // Total should equal tip
      const totalTip = alice.tip + bob.tip + charlie.tip;
      expect(totalTip).toBeCloseTo(10.00, 2);
    });

    it('should calculate complete breakdown correctly (PRD example)', () => {
      // Example from PRD (Example 3):
      // Burger $15 (Alice), Pizza $25 (Bob, Charlie), Salad $10 (Alice)
      // Subtotal: $50, Tax: $5, Service: $7.50, Tip: $10, Total: $72.50
      Claim.create(item1.id, participant1.id); // Burger $15
      Claim.create(item2.id, participant2.id); // Pizza $25 split
      Claim.create(item2.id, participant3.id);
      Claim.create(item3.id, participant1.id); // Salad $10

      const breakdown = CalculationService.getBreakdown(testCheckId, 10.00);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Alice: $25 subtotal (50%), Bob: $12.50 (25%), Charlie: $12.50 (25%)
      expect(alice.subtotal).toBeCloseTo(25.00, 2);
      expect(bob.subtotal).toBeCloseTo(12.50, 2);
      expect(charlie.subtotal).toBeCloseTo(12.50, 2);

      // Alice total: 25 + 2.50 (tax) + 3.75 (service) + 5.00 (tip) = 36.25
      expect(alice.total).toBeCloseTo(36.25, 2);

      // Bob total: 12.50 + 1.25 + 1.88 + 2.50 = 18.13
      expect(bob.total).toBeCloseTo(18.13, 2);

      // Charlie total: 12.50 + 1.25 + 1.87 + 2.50 = 18.12
      expect(charlie.total).toBeCloseTo(18.12, 2);

      // Grand total should equal 72.50
      expect(breakdown.summary.grandTotal).toBeCloseTo(72.50, 2);

      // Sum of participant totals should equal grand total
      const sumOfTotals = alice.total + bob.total + charlie.total;
      expect(sumOfTotals).toBeCloseTo(72.50, 2);
    });

    it('should handle zero tip', () => {
      Claim.create(item1.id, participant1.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 0);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);

      expect(alice.tip).toBe(0);
      expect(breakdown.summary.tip).toBe(0);
    });

    it('should handle participants with no claims', () => {
      // Only Alice claims items
      Claim.create(item1.id, participant1.id);

      const breakdown = CalculationService.getBreakdown(testCheckId, 10.00);

      const alice = breakdown.participants.find(p => p.participantId === participant1.id);
      const bob = breakdown.participants.find(p => p.participantId === participant2.id);
      const charlie = breakdown.participants.find(p => p.participantId === participant3.id);

      // Alice should get 100% of everything
      expect(alice.total).toBeGreaterThan(0);

      // Bob and Charlie should have zero
      expect(bob.total).toBe(0);
      expect(charlie.total).toBe(0);
    });
  });

  describe('validateAllItemsClaimed', () => {
    it('should return valid when all items are claimed', () => {
      Claim.create(item1.id, participant1.id);
      Claim.create(item2.id, participant2.id);
      Claim.create(item3.id, participant3.id);

      const result = CalculationService.validateAllItemsClaimed(testCheckId);

      expect(result.valid).toBe(true);
      expect(result.unclaimedItems).toHaveLength(0);
    });

    it('should return invalid with unclaimed items', () => {
      Claim.create(item1.id, participant1.id);
      // item2 and item3 are unclaimed

      const result = CalculationService.validateAllItemsClaimed(testCheckId);

      expect(result.valid).toBe(false);
      expect(result.unclaimedItems).toHaveLength(2);
      expect(result.unclaimedItems.map(i => i.id)).toContain(item2.id);
      expect(result.unclaimedItems.map(i => i.id)).toContain(item3.id);
    });

    it('should not include tax and service charge in validation', () => {
      // Only claim regular items, leave tax and service unclaimed
      Claim.create(item1.id, participant1.id);
      Claim.create(item2.id, participant2.id);
      Claim.create(item3.id, participant3.id);

      const result = CalculationService.validateAllItemsClaimed(testCheckId);

      expect(result.valid).toBe(true);
    });
  });

  describe('getItemBreakdown', () => {
    it('should show item claim details', () => {
      Claim.create(item1.id, participant1.id);
      Claim.create(item2.id, participant1.id);
      Claim.create(item2.id, participant2.id);

      const itemBreakdown = CalculationService.getItemBreakdown(testCheckId);

      const burgerBreakdown = itemBreakdown.find(i => i.id === item1.id);
      const pizzaBreakdown = itemBreakdown.find(i => i.id === item2.id);

      expect(burgerBreakdown.claimedBy).toHaveLength(1);
      expect(burgerBreakdown.claimedBy[0].share).toBe(15.00);

      expect(pizzaBreakdown.claimedBy).toHaveLength(2);
      expect(pizzaBreakdown.claimedBy[0].share).toBe(12.50);
      expect(pizzaBreakdown.claimedBy[1].share).toBe(12.50);
    });
  });
});
