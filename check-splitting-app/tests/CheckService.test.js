import CheckService from '../src/services/CheckService.js';
import Check from '../src/models/Check.js';
import Item from '../src/models/Item.js';
import Participant from '../src/models/Participant.js';
import Claim from '../src/models/Claim.js';

describe('CheckService', () => {
  let testCheckId;
  let testShareCode;

  afterEach(() => {
    // Clean up test data
    if (testCheckId) {
      Check.delete(testCheckId);
    }
  });

  describe('createCheck', () => {
    it('should create a new check with share code', () => {
      const check = CheckService.createCheck();

      testCheckId = check.id;

      expect(check).toBeDefined();
      expect(check.id).toBeDefined();
      expect(check.share_code).toBeDefined();
      expect(check.share_code.length).toBe(8);
      expect(check.created_at).toBeDefined();
      expect(check.expires_at).toBeDefined();
      expect(check.finalized).toBe(0);
      expect(check.tip_amount).toBe(0);
    });
  });

  describe('getCheckByShareCode', () => {
    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;
    });

    it('should retrieve check by share code', () => {
      const checkData = CheckService.getCheckByShareCode(testShareCode);

      expect(checkData).toBeDefined();
      expect(checkData.check.id).toBe(testCheckId);
      expect(checkData.items).toBeDefined();
      expect(checkData.participants).toBeDefined();
    });

    it('should return null for invalid share code', () => {
      const checkData = CheckService.getCheckByShareCode('INVALID');

      expect(checkData).toBeNull();
    });

    it('should be case-insensitive', () => {
      const checkData1 = CheckService.getCheckByShareCode(testShareCode.toLowerCase());
      const checkData2 = CheckService.getCheckByShareCode(testShareCode.toUpperCase());

      expect(checkData1).toBeDefined();
      expect(checkData2).toBeDefined();
      expect(checkData1.check.id).toBe(checkData2.check.id);
    });
  });

  describe('joinCheck', () => {
    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;
    });

    it('should add participant to check', () => {
      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session1');

      expect(result).toBeDefined();
      expect(result.check.id).toBe(testCheckId);
      expect(result.participant.name).toBe('Alice');
      expect(result.participant.check_id).toBe(testCheckId);
    });

    it('should handle duplicate names by appending number', () => {
      CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session2');

      expect(result.participant.name).toBe('Alice (2)');
    });

    it('should reuse existing participant for same session', () => {
      const result1 = CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      const result2 = CheckService.joinCheck(testShareCode, 'Alice', 'session1');

      expect(result1.participant.id).toBe(result2.participant.id);
    });

    it('should throw error for invalid share code', () => {
      expect(() => {
        CheckService.joinCheck('INVALID', 'Alice', 'session1');
      }).toThrow('Check not found');
    });
  });

  describe('addItem', () => {
    let participant;

    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;

      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      participant = result.participant;
    });

    it('should add item to check', () => {
      const item = CheckService.addItem(testCheckId, {
        name: 'Burger',
        price: 15.00,
        quantity: 1
      });

      expect(item).toBeDefined();
      expect(item.name).toBe('Burger');
      expect(item.price).toBe(15.00);
      expect(item.check_id).toBe(testCheckId);
    });

    it('should add tax item', () => {
      const item = CheckService.addItem(testCheckId, {
        name: 'Tax',
        price: 5.00,
        isTax: true
      });

      expect(item.is_tax).toBe(1);
    });

    it('should add service charge item', () => {
      const item = CheckService.addItem(testCheckId, {
        name: 'Service',
        price: 7.50,
        isServiceCharge: true
      });

      expect(item.is_service_charge).toBe(1);
    });

    it('should not allow adding items to finalized check', () => {
      // Add an item and claim it
      const item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
      CheckService.toggleClaim(item.id, participant.id);

      // Finalize the check
      CheckService.finalizeCheck(testCheckId);

      // Try to add another item
      expect(() => {
        CheckService.addItem(testCheckId, { name: 'Pizza', price: 20.00 });
      }).toThrow('Cannot add items to a finalized check');
    });
  });

  describe('toggleClaim', () => {
    let participant;
    let item;

    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;

      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      participant = result.participant;

      item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
    });

    it('should claim an unclaimed item', () => {
      const result = CheckService.toggleClaim(item.id, participant.id);

      expect(result.action).toBe('claimed');
      expect(result.itemId).toBe(item.id);
      expect(result.participantId).toBe(participant.id);

      // Verify claim exists
      const claims = Claim.findByItemId(item.id);
      expect(claims).toHaveLength(1);
    });

    it('should unclaim a claimed item', () => {
      // First claim it
      CheckService.toggleClaim(item.id, participant.id);

      // Then unclaim it
      const result = CheckService.toggleClaim(item.id, participant.id);

      expect(result.action).toBe('unclaimed');

      // Verify claim is removed
      const claims = Claim.findByItemId(item.id);
      expect(claims).toHaveLength(0);
    });

    it('should allow multiple participants to claim same item', () => {
      const bob = CheckService.joinCheck(testShareCode, 'Bob', 'session2').participant;

      CheckService.toggleClaim(item.id, participant.id);
      CheckService.toggleClaim(item.id, bob.id);

      const claims = Claim.findByItemId(item.id);
      expect(claims).toHaveLength(2);
    });
  });

  describe('setTip', () => {
    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
    });

    it('should set tip amount', () => {
      const check = CheckService.setTip(testCheckId, 10.50);

      expect(check.tip_amount).toBe(10.50);
    });

    it('should update tip amount', () => {
      CheckService.setTip(testCheckId, 10.00);
      const check = CheckService.setTip(testCheckId, 15.00);

      expect(check.tip_amount).toBe(15.00);
    });

    it('should allow zero tip', () => {
      const check = CheckService.setTip(testCheckId, 0);

      expect(check.tip_amount).toBe(0);
    });
  });

  describe('finalizeCheck', () => {
    let participant;

    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;

      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      participant = result.participant;
    });

    it('should finalize check when all items are claimed', () => {
      const item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
      CheckService.toggleClaim(item.id, participant.id);

      const check = CheckService.finalizeCheck(testCheckId);

      expect(check.finalized).toBe(1);
      expect(check.finalized_at).toBeDefined();
    });

    it('should not finalize check with unclaimed items', () => {
      CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });

      expect(() => {
        CheckService.finalizeCheck(testCheckId);
      }).toThrow('Cannot finalize: some items are not claimed');
    });

    it('should not finalize already finalized check', () => {
      const item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
      CheckService.toggleClaim(item.id, participant.id);
      CheckService.finalizeCheck(testCheckId);

      expect(() => {
        CheckService.finalizeCheck(testCheckId);
      }).toThrow('Check is already finalized');
    });
  });

  describe('unlockCheck', () => {
    let participant;

    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;

      const result = CheckService.joinCheck(testShareCode, 'Alice', 'session1');
      participant = result.participant;
    });

    it('should unlock finalized check', () => {
      const item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
      CheckService.toggleClaim(item.id, participant.id);
      CheckService.finalizeCheck(testCheckId);

      const check = CheckService.unlockCheck(testCheckId);

      expect(check.finalized).toBe(0);
      expect(check.finalized_at).toBeNull();
    });

    it('should not unlock non-finalized check', () => {
      expect(() => {
        CheckService.unlockCheck(testCheckId);
      }).toThrow('Check is not finalized');
    });
  });

  describe('getBreakdown', () => {
    let participant1, participant2;

    beforeEach(() => {
      const check = CheckService.createCheck();
      testCheckId = check.id;
      testShareCode = check.share_code;

      participant1 = CheckService.joinCheck(testShareCode, 'Alice', 'session1').participant;
      participant2 = CheckService.joinCheck(testShareCode, 'Bob', 'session2').participant;
    });

    it('should generate breakdown with all participants', () => {
      const item = CheckService.addItem(testCheckId, { name: 'Burger', price: 15.00 });
      CheckService.toggleClaim(item.id, participant1.id);

      const breakdown = CheckService.getBreakdown(testCheckId);

      expect(breakdown.participants).toHaveLength(2);
      expect(breakdown.summary).toBeDefined();
      expect(breakdown.summary.grandTotal).toBeGreaterThan(0);
    });
  });
});
