import express from 'express';
import CheckService from '../services/CheckService.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Create a new check
router.post('/', (req, res) => {
  try {
    const check = CheckService.createCheck();
    res.json({ success: true, check });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get check by share code
router.get('/:shareCode', (req, res) => {
  try {
    const checkData = CheckService.getCheckByShareCode(req.params.shareCode);

    if (!checkData) {
      return res.status(404).json({ success: false, error: 'Check not found' });
    }

    res.json({ success: true, ...checkData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join a check
router.post('/:shareCode/join', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    // Generate or use existing session ID
    const sessionId = req.body.sessionId || nanoid();

    const result = CheckService.joinCheck(req.params.shareCode, name.trim(), sessionId);

    res.json({
      success: true,
      check: result.check,
      participant: result.participant,
      sessionId
    });
  } catch (error) {
    res.status(error.message === 'Check not found' ? 404 : 500)
       .json({ success: false, error: error.message });
  }
});

// Add item to check
router.post('/:checkId/items', (req, res) => {
  try {
    const { name, price, quantity, isTax, isServiceCharge } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const item = CheckService.addItem(req.params.checkId, {
      name,
      price,
      quantity: quantity || 1,
      isTax: !!isTax,
      isServiceCharge: !!isServiceCharge
    });

    res.json({ success: true, item });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Update item
router.put('/items/:itemId', (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    const item = CheckService.updateItem(req.params.itemId, { name, price, quantity });

    res.json({ success: true, item });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Delete item
router.delete('/items/:itemId', (req, res) => {
  try {
    CheckService.deleteItem(req.params.itemId);
    res.json({ success: true });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Toggle claim
router.post('/items/:itemId/claim', (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, error: 'participantId is required' });
    }

    const result = CheckService.toggleClaim(req.params.itemId, participantId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Set tip
router.post('/:checkId/tip', (req, res) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount < 0) {
      return res.status(400).json({ success: false, error: 'Valid tip amount is required' });
    }

    const check = CheckService.setTip(req.params.checkId, amount);
    res.json({ success: true, check });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500)
       .json({ success: false, error: error.message });
  }
});

// Finalize check
router.post('/:checkId/finalize', (req, res) => {
  try {
    const check = CheckService.finalizeCheck(req.params.checkId);
    res.json({ success: true, check });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Unlock check
router.post('/:checkId/unlock', (req, res) => {
  try {
    const check = CheckService.unlockCheck(req.params.checkId);
    res.json({ success: true, check });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400)
       .json({ success: false, error: error.message });
  }
});

// Get breakdown
router.get('/:checkId/breakdown', (req, res) => {
  try {
    const breakdown = CheckService.getBreakdown(req.params.checkId);
    res.json({ success: true, breakdown });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500)
       .json({ success: false, error: error.message });
  }
});

export default router;
