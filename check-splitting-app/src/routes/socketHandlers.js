import CheckService from '../services/CheckService.js';

/**
 * Set up Socket.io event handlers for real-time collaboration
 * @param {Server} io - Socket.io server instance
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a check room
    socket.on('join-check', ({ checkId }) => {
      socket.join(`check:${checkId}`);
      console.log(`Socket ${socket.id} joined check:${checkId}`);

      // Send current check state
      try {
        const checkData = CheckService.getCheckData(checkId);
        socket.emit('check-state', checkData);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave a check room
    socket.on('leave-check', ({ checkId }) => {
      socket.leave(`check:${checkId}`);
      console.log(`Socket ${socket.id} left check:${checkId}`);
    });

    // Add item
    socket.on('add-item', async ({ checkId, itemData }) => {
      try {
        const item = CheckService.addItem(checkId, itemData);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('item-added', { item });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Update item
    socket.on('update-item', async ({ itemId, updateData, checkId }) => {
      try {
        const item = CheckService.updateItem(itemId, updateData);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('item-updated', { item });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Delete item
    socket.on('delete-item', async ({ itemId, checkId }) => {
      try {
        CheckService.deleteItem(itemId);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('item-deleted', { itemId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Toggle claim
    socket.on('toggle-claim', async ({ itemId, participantId, checkId }) => {
      try {
        const result = CheckService.toggleClaim(itemId, participantId);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('claim-toggled', result);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Set tip
    socket.on('set-tip', async ({ checkId, amount }) => {
      try {
        const check = CheckService.setTip(checkId, amount);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('tip-updated', { tipAmount: check.tip_amount });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Finalize check
    socket.on('finalize-check', async ({ checkId }) => {
      try {
        const check = CheckService.finalizeCheck(checkId);
        const breakdown = CheckService.getBreakdown(checkId);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('check-finalized', { check, breakdown });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Unlock check
    socket.on('unlock-check', async ({ checkId }) => {
      try {
        const check = CheckService.unlockCheck(checkId);

        // Broadcast to all clients in the room
        io.to(`check:${checkId}`).emit('check-unlocked', { check });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Participant joined
    socket.on('participant-joined', async ({ checkId, participant }) => {
      // Broadcast to all clients in the room
      io.to(`check:${checkId}`).emit('participant-joined', { participant });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
