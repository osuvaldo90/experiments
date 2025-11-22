// Check page functionality with real-time updates

const socket = io();

// Get check code from URL
const urlParams = new URLSearchParams(window.location.search);
const shareCode = urlParams.get('code');
let checkData = null;
let participantId = sessionStorage.getItem('participantId');
const participantName = sessionStorage.getItem('participantName');

if (!shareCode || !participantId || !participantName) {
  window.location.href = '/';
}

// Display participant name
document.getElementById('participantName').textContent = `You: ${participantName}`;

// Initialize
async function init() {
  try {
    const response = await fetch(`/api/checks/${shareCode}`);
    const data = await response.json();

    if (data.success) {
      checkData = data;
      updateUI();
      socket.emit('join-check', { checkId: checkData.check.id });
    } else {
      alert('Check not found');
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Failed to load check:', error);
    alert('Failed to load check');
    window.location.href = '/';
  }
}

// Socket event handlers
socket.on('check-state', (data) => {
  checkData = data;
  updateUI();
});

socket.on('item-added', async ({ item }) => {
  const response = await fetch(`/api/checks/${shareCode}`);
  const data = await response.json();
  if (data.success) {
    checkData = data;
    updateUI();
  }
});

socket.on('item-updated', async ({ item }) => {
  const response = await fetch(`/api/checks/${shareCode}`);
  const data = await response.json();
  if (data.success) {
    checkData = data;
    updateUI();
  }
});

socket.on('item-deleted', async ({ itemId }) => {
  const response = await fetch(`/api/checks/${shareCode}`);
  const data = await response.json();
  if (data.success) {
    checkData = data;
    updateUI();
  }
});

socket.on('claim-toggled', async (result) => {
  const response = await fetch(`/api/checks/${shareCode}`);
  const data = await response.json();
  if (data.success) {
    checkData = data;
    updateUI();
  }
});

socket.on('tip-updated', ({ tipAmount }) => {
  checkData.check.tip_amount = tipAmount;
  document.getElementById('tipAmount').value = tipAmount;
});

socket.on('check-finalized', async ({ check, breakdown }) => {
  checkData.check = check;
  updateUI();
  displayBreakdown();
});

socket.on('check-unlocked', ({ check }) => {
  checkData.check = check;
  updateUI();
  document.getElementById('breakdownSection').style.display = 'none';
});

socket.on('participant-joined', async ({ participant }) => {
  const response = await fetch(`/api/checks/${shareCode}`);
  const data = await response.json();
  if (data.success) {
    checkData = data;
    updateUI();
  }
});

socket.on('error', ({ message }) => {
  showError(message);
});

// UI Update Functions
function updateUI() {
  // Share code
  document.getElementById('shareCode').textContent = checkData.check.share_code;

  // Finalization status
  const isFinalized = checkData.check.finalized === 1;
  document.getElementById('finalizedBanner').style.display = isFinalized ? 'block' : 'none';
  document.getElementById('addItemForm').style.display = isFinalized ? 'none' : 'block';
  document.getElementById('finalizeBtn').style.display = isFinalized ? 'none' : 'block';
  document.getElementById('unlockBtn').style.display = isFinalized ? 'block' : 'none';

  // Update tip
  document.getElementById('tipAmount').value = checkData.check.tip_amount || 0;
  document.getElementById('tipAmount').disabled = isFinalized;

  // Items
  renderItems();

  // Participants
  renderParticipants();

  // Show breakdown if finalized
  if (isFinalized) {
    displayBreakdown();
  }
}

function renderItems() {
  const itemsList = document.getElementById('itemsList');
  itemsList.innerHTML = '';

  if (checkData.items.length === 0) {
    itemsList.innerHTML = '<p style="color: #999;">No items yet. Add some items to get started!</p>';
    return;
  }

  checkData.items.forEach(item => {
    const itemDiv = document.createElement('div');
    const isClaimed = item.claims.some(c => c.participant_id === participantId);
    const claimCount = item.claims.length;

    let itemClass = 'item';
    if (item.is_tax) {
      itemClass += ' tax';
    } else if (item.is_service_charge) {
      itemClass += ' service-charge';
    } else {
      itemClass += claimCount > 0 ? ' claimed' : ' unclaimed';
    }

    itemDiv.className = itemClass;

    let typeLabel = '';
    if (item.is_tax) typeLabel = ' [TAX]';
    else if (item.is_service_charge) typeLabel = ' [SERVICE]';

    const itemTotal = (item.price * item.quantity).toFixed(2);

    itemDiv.innerHTML = `
      <div class="item-header">
        <span class="item-name">${item.name}${typeLabel}</span>
        <span class="item-price">$${itemTotal}</span>
      </div>
      <div class="item-details">
        ${item.quantity > 1 ? `Qty: ${item.quantity} × $${item.price.toFixed(2)}` : `Price: $${item.price.toFixed(2)}`}
      </div>
      ${!item.is_tax && !item.is_service_charge ? `
        <div class="item-claims">
          ${item.claims.map(c => `<span class="claim-badge">${c.participant_name}</span>`).join('')}
          ${claimCount === 0 ? '<span style="color: #999; font-size: 12px;">Unclaimed</span>' : ''}
        </div>
        <div class="item-actions">
          <button class="btn ${isClaimed ? 'btn-danger' : ''}" onclick="toggleClaim('${item.id}')">
            ${isClaimed ? 'Unclaim' : 'Claim'}
          </button>
          ${checkData.check.finalized === 0 ? `
            <button class="btn-small" onclick="deleteItem('${item.id}')">Delete</button>
          ` : ''}
        </div>
      ` : ''}
    `;

    itemsList.appendChild(itemDiv);
  });
}

function renderParticipants() {
  const participantsList = document.getElementById('participantsList');
  participantsList.innerHTML = '';

  checkData.participants.forEach(p => {
    const pDiv = document.createElement('div');
    pDiv.className = 'participant';

    const itemsClaimed = checkData.items.filter(item =>
      item.claims.some(c => c.participant_id === p.id)
    ).length;

    pDiv.innerHTML = `
      <div class="participant-info">
        ${p.name}
        ${p.id === participantId ? ' (You)' : ''}
      </div>
      <div style="color: #666; font-size: 14px;">
        ${itemsClaimed} item${itemsClaimed !== 1 ? 's' : ''} claimed
      </div>
    `;

    participantsList.appendChild(pDiv);
  });
}

async function displayBreakdown() {
  try {
    const response = await fetch(`/api/checks/${checkData.check.id}/breakdown`);
    const data = await response.json();

    if (!data.success) return;

    const section = document.getElementById('breakdownSection');
    const content = document.getElementById('breakdownContent');

    let html = '<table class="breakdown-table"><thead><tr>';
    html += '<th>Participant</th><th>Subtotal</th><th>Tax</th><th>Service</th><th>Tip</th><th>Total</th>';
    html += '</tr></thead><tbody>';

    data.breakdown.participants.forEach(p => {
      const isCurrentUser = p.participantId === participantId;
      html += `<tr ${isCurrentUser ? 'class="total-row"' : ''}>`;
      html += `<td>${p.participantName}${isCurrentUser ? ' (You)' : ''}</td>`;
      html += `<td>$${p.subtotal.toFixed(2)}</td>`;
      html += `<td>$${p.tax.toFixed(2)}</td>`;
      html += `<td>$${p.serviceCharge.toFixed(2)}</td>`;
      html += `<td>$${p.tip.toFixed(2)}</td>`;
      html += `<td><strong>$${p.total.toFixed(2)}</strong></td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';

    html += '<div class="breakdown-summary">';
    html += '<h3>Summary</h3>';
    html += `<div class="summary-row"><span>Subtotal:</span><span>$${data.breakdown.summary.subtotal.toFixed(2)}</span></div>`;
    html += `<div class="summary-row"><span>Tax:</span><span>$${data.breakdown.summary.tax.toFixed(2)}</span></div>`;
    html += `<div class="summary-row"><span>Service Charge:</span><span>$${data.breakdown.summary.serviceCharge.toFixed(2)}</span></div>`;
    html += `<div class="summary-row"><span>Tip:</span><span>$${data.breakdown.summary.tip.toFixed(2)}</span></div>`;
    html += `<div class="summary-row grand-total"><span>Grand Total:</span><span>$${data.breakdown.summary.grandTotal.toFixed(2)}</span></div>`;
    html += '</div>';

    content.innerHTML = html;
    section.style.display = 'block';
  } catch (error) {
    console.error('Failed to load breakdown:', error);
  }
}

// Action Functions
async function toggleClaim(itemId) {
  try {
    socket.emit('toggle-claim', {
      itemId,
      participantId,
      checkId: checkData.check.id
    });
  } catch (error) {
    showError('Failed to toggle claim');
  }
}

async function deleteItem(itemId) {
  if (!confirm('Delete this item?')) return;

  try {
    socket.emit('delete-item', {
      itemId,
      checkId: checkData.check.id
    });
  } catch (error) {
    showError('Failed to delete item');
  }
}

// Add item
document.getElementById('addItemBtn').addEventListener('click', async () => {
  const name = document.getElementById('itemName').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value);
  const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
  const isTax = document.getElementById('itemIsTax').checked;
  const isServiceCharge = document.getElementById('itemIsService').checked;

  if (!name || !price || price < 0) {
    showError('Please enter valid item name and price');
    return;
  }

  try {
    socket.emit('add-item', {
      checkId: checkData.check.id,
      itemData: { name, price, quantity, isTax, isServiceCharge }
    });

    // Clear form
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemIsTax').checked = false;
    document.getElementById('itemIsService').checked = false;
  } catch (error) {
    showError('Failed to add item');
  }
});

// Set tip
document.getElementById('setTipBtn').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('tipAmount').value) || 0;

  if (amount < 0) {
    showError('Tip amount cannot be negative');
    return;
  }

  try {
    socket.emit('set-tip', {
      checkId: checkData.check.id,
      amount
    });
  } catch (error) {
    showError('Failed to set tip');
  }
});

// Finalize check
document.getElementById('finalizeBtn').addEventListener('click', async () => {
  if (!confirm('Finalize this check? This will lock all items and claims.')) return;

  try {
    socket.emit('finalize-check', {
      checkId: checkData.check.id
    });
  } catch (error) {
    showError(error.message || 'Failed to finalize check');
  }
});

// Unlock check
document.getElementById('unlockBtn').addEventListener('click', async () => {
  if (!confirm('Unlock this check to make changes?')) return;

  try {
    socket.emit('unlock-check', {
      checkId: checkData.check.id
    });
  } catch (error) {
    showError('Failed to unlock check');
  }
});

// Copy share code
document.getElementById('copyCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('shareCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
});

function showError(message) {
  const errorDiv = document.getElementById('validationError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Initialize when page loads
init();
