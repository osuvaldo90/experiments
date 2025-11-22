import Item from '../models/Item.js';
import Claim from '../models/Claim.js';
import Participant from '../models/Participant.js';
import db from '../models/database.js';

/**
 * Service for calculating check splits with proportional tax, service charges, and tips
 * Implements the calculation logic specified in the PRD
 */
class CalculationService {
  /**
   * Get the complete breakdown for a check
   * @param {string} checkId - Check ID
   * @param {number} tipAmount - Tip amount in dollars
   * @returns {Object} Breakdown with participant totals and grand total
   */
  static getBreakdown(checkId, tipAmount = 0) {
    const participants = Participant.findByCheckId(checkId);
    const regularItems = Item.getRegularItems(checkId);
    const taxItems = Item.getTaxItems(checkId);
    const serviceChargeItems = Item.getServiceChargeItems(checkId);

    // Calculate totals
    const totalTax = this._calculateTotal(taxItems);
    const totalServiceCharge = this._calculateTotal(serviceChargeItems);

    // Get participant subtotals and calculate proportional distribution
    const participantBreakdowns = participants.map(participant => {
      const subtotal = this._calculateParticipantSubtotal(participant.id, regularItems);
      return {
        participantId: participant.id,
        participantName: participant.name,
        subtotal,
        tax: 0,
        serviceCharge: 0,
        tip: 0,
        total: 0
      };
    });

    // Calculate total subtotal for proportional distribution
    const totalSubtotal = participantBreakdowns.reduce((sum, p) => sum + p.subtotal, 0);

    // Distribute tax, service charges, and tip proportionally
    if (totalSubtotal > 0) {
      participantBreakdowns.forEach(breakdown => {
        const proportion = breakdown.subtotal / totalSubtotal;

        // Proportional tax
        breakdown.tax = totalTax * proportion;

        // Proportional service charge
        breakdown.serviceCharge = totalServiceCharge * proportion;

        // Proportional tip
        breakdown.tip = tipAmount * proportion;
      });

      // Apply rounding and adjustment
      this._applyRoundingAdjustments(participantBreakdowns, {
        totalSubtotal,
        totalTax,
        totalServiceCharge,
        totalTip: tipAmount
      });
    }

    // Calculate final totals
    participantBreakdowns.forEach(breakdown => {
      breakdown.total = this._roundToTwo(breakdown.subtotal + breakdown.tax + breakdown.serviceCharge + breakdown.tip);
    });

    // Calculate grand total
    const grandTotal = totalSubtotal + totalTax + totalServiceCharge + tipAmount;

    return {
      participants: participantBreakdowns,
      summary: {
        subtotal: totalSubtotal,
        tax: totalTax,
        serviceCharge: totalServiceCharge,
        tip: tipAmount,
        grandTotal
      }
    };
  }

  /**
   * Calculate subtotal for a participant (sum of their claimed items)
   */
  static _calculateParticipantSubtotal(participantId, items) {
    let subtotal = 0;

    items.forEach(item => {
      const claims = Claim.findByItemId(item.id);
      const claimCount = claims.length;

      if (claimCount === 0) return;

      // Check if this participant claimed this item
      const participantClaimed = claims.some(c => c.participant_id === participantId);

      if (participantClaimed) {
        const itemTotal = item.price * item.quantity;
        const share = itemTotal / claimCount;
        subtotal += share;
      }
    });

    return subtotal;
  }

  /**
   * Calculate total for a list of items
   */
  static _calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  /**
   * Apply rounding and adjust to ensure totals match exactly
   * Uses the algorithm from REQ-056: round each share and adjust the last person
   */
  static _applyRoundingAdjustments(breakdowns, totals) {
    if (breakdowns.length === 0) return;

    // Round subtotal amounts
    this._roundAndAdjust(breakdowns, 'subtotal', totals.totalSubtotal);

    // Round tax amounts
    this._roundAndAdjust(breakdowns, 'tax', totals.totalTax);

    // Round service charge amounts
    this._roundAndAdjust(breakdowns, 'serviceCharge', totals.totalServiceCharge);

    // Round tip amounts
    this._roundAndAdjust(breakdowns, 'tip', totals.totalTip);
  }

  /**
   * Round amounts for a specific field and adjust the last person to match total
   */
  static _roundAndAdjust(breakdowns, field, expectedTotal) {
    if (breakdowns.length === 0) return 0;

    // Round all amounts to 2 decimal places
    breakdowns.forEach(breakdown => {
      breakdown[field] = this._roundToTwo(breakdown[field]);
    });

    // Calculate the sum of rounded amounts
    const roundedSum = breakdowns.reduce((sum, b) => sum + b[field], 0);

    // Adjust the last person if there's a rounding discrepancy
    const difference = this._roundToTwo(expectedTotal - roundedSum);
    if (Math.abs(difference) > 0.001) {
      const lastBreakdown = breakdowns[breakdowns.length - 1];
      lastBreakdown[field] = this._roundToTwo(lastBreakdown[field] + difference);
    }

    return roundedSum;
  }

  /**
   * Round a number to 2 decimal places
   */
  static _roundToTwo(num) {
    return Math.round(num * 100) / 100;
  }

  /**
   * Validate that all items are claimed
   * @returns {Object} { valid: boolean, unclaimedItems: Array }
   */
  static validateAllItemsClaimed(checkId) {
    const regularItems = Item.getRegularItems(checkId);
    const unclaimedItems = [];

    regularItems.forEach(item => {
      const claims = Claim.findByItemId(item.id);
      if (claims.length === 0) {
        unclaimedItems.push({
          id: item.id,
          name: item.name,
          price: item.price
        });
      }
    });

    return {
      valid: unclaimedItems.length === 0,
      unclaimedItems
    };
  }

  /**
   * Get detailed item breakdown showing who claimed what
   */
  static getItemBreakdown(checkId) {
    const items = Item.getRegularItems(checkId);

    return items.map(item => {
      const claims = Claim.findByItemId(item.id);
      const itemTotal = item.price * item.quantity;

      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: itemTotal,
        claimedBy: claims.map(c => ({
          participantId: c.participant_id,
          participantName: c.participant_name,
          share: claims.length > 0 ? itemTotal / claims.length : 0
        })),
        isClaimed: claims.length > 0
      };
    });
  }
}

export default CalculationService;
