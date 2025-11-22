import Check from '../models/Check.js';
import Item from '../models/Item.js';
import Participant from '../models/Participant.js';
import Claim from '../models/Claim.js';
import CalculationService from './CalculationService.js';

/**
 * Service layer for check operations
 * Provides high-level operations for managing checks
 */
class CheckService {
  /**
   * Create a new check
   * @returns {Object} The created check with share code
   */
  static createCheck() {
    return Check.create();
  }

  /**
   * Get complete check data including items, participants, and claims
   */
  static getCheckData(checkId) {
    const check = Check.findById(checkId);
    if (!check) return null;

    const items = Item.findByCheckId(checkId);
    const participants = Participant.findByCheckId(checkId);

    // Add claim information to items
    const itemsWithClaims = items.map(item => ({
      ...item,
      claims: Claim.findByItemId(item.id)
    }));

    return {
      check,
      items: itemsWithClaims,
      participants
    };
  }

  /**
   * Get check by share code
   */
  static getCheckByShareCode(shareCode) {
    const check = Check.findByShareCode(shareCode);
    if (!check) return null;

    return this.getCheckData(check.id);
  }

  /**
   * Join a check as a participant
   */
  static joinCheck(shareCode, name, sessionId) {
    const check = Check.findByShareCode(shareCode);
    if (!check) {
      throw new Error('Check not found');
    }

    // Check if participant already exists with this session
    const existingParticipant = Participant.findBySessionId(sessionId);
    if (existingParticipant && existingParticipant.check_id === check.id) {
      return {
        check,
        participant: existingParticipant
      };
    }

    // Create new participant
    const participant = Participant.create(check.id, { name, sessionId });

    return {
      check,
      participant
    };
  }

  /**
   * Add an item to a check
   */
  static addItem(checkId, itemData) {
    const check = Check.findById(checkId);
    if (!check) {
      throw new Error('Check not found');
    }

    if (check.finalized) {
      throw new Error('Cannot add items to a finalized check');
    }

    return Item.create(checkId, itemData);
  }

  /**
   * Update an item
   */
  static updateItem(itemId, updateData) {
    const item = Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const check = Check.findById(item.check_id);
    if (check.finalized) {
      throw new Error('Cannot update items on a finalized check');
    }

    return Item.update(itemId, updateData);
  }

  /**
   * Delete an item (and its claims)
   */
  static deleteItem(itemId) {
    const item = Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const check = Check.findById(item.check_id);
    if (check.finalized) {
      throw new Error('Cannot delete items from a finalized check');
    }

    // Claims will be deleted automatically due to CASCADE
    Item.delete(itemId);
  }

  /**
   * Toggle a claim (claim if unclaimed, unclaim if claimed)
   */
  static toggleClaim(itemId, participantId) {
    const item = Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const check = Check.findById(item.check_id);
    if (check.finalized) {
      throw new Error('Cannot modify claims on a finalized check');
    }

    // Check if already claimed
    const claims = Claim.findByItemId(itemId);
    const existingClaim = claims.find(c => c.participant_id === participantId);

    if (existingClaim) {
      // Unclaim
      Claim.deleteByItemAndParticipant(itemId, participantId);
      return { action: 'unclaimed', itemId, participantId };
    } else {
      // Claim
      Claim.create(itemId, participantId);
      return { action: 'claimed', itemId, participantId };
    }
  }

  /**
   * Set tip amount
   */
  static setTip(checkId, tipAmount) {
    const check = Check.findById(checkId);
    if (!check) {
      throw new Error('Check not found');
    }

    return Check.updateTip(checkId, parseFloat(tipAmount));
  }

  /**
   * Finalize a check
   */
  static finalizeCheck(checkId) {
    const check = Check.findById(checkId);
    if (!check) {
      throw new Error('Check not found');
    }

    if (check.finalized) {
      throw new Error('Check is already finalized');
    }

    // Validate all items are claimed
    const validation = CalculationService.validateAllItemsClaimed(checkId);
    if (!validation.valid) {
      throw new Error('Cannot finalize: some items are not claimed');
    }

    return Check.finalize(checkId);
  }

  /**
   * Unlock a finalized check
   */
  static unlockCheck(checkId) {
    const check = Check.findById(checkId);
    if (!check) {
      throw new Error('Check not found');
    }

    if (!check.finalized) {
      throw new Error('Check is not finalized');
    }

    return Check.unlock(checkId);
  }

  /**
   * Get breakdown for a check
   */
  static getBreakdown(checkId) {
    const check = Check.findById(checkId);
    if (!check) {
      throw new Error('Check not found');
    }

    return CalculationService.getBreakdown(checkId, check.tip_amount);
  }

  /**
   * Remove a participant and their claims
   */
  static removeParticipant(participantId) {
    const participant = Participant.findById(participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const check = Check.findById(participant.check_id);
    if (check.finalized) {
      throw new Error('Cannot remove participants from a finalized check');
    }

    // Delete claims first (though CASCADE should handle this)
    Claim.deleteByParticipant(participantId);

    // Delete participant
    Participant.delete(participantId);
  }
}

export default CheckService;
