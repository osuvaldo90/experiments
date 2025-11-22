// Home page functionality

document.getElementById('createCheckBtn').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      // Prompt for name
      const name = prompt('Enter your name:');
      if (name) {
        // Join the check
        const joinResponse = await fetch(`/api/checks/${data.check.share_code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });

        const joinData = await joinResponse.json();

        if (joinData.success) {
          // Store session info
          sessionStorage.setItem('sessionId', joinData.sessionId);
          sessionStorage.setItem('participantId', joinData.participant.id);
          sessionStorage.setItem('participantName', joinData.participant.name);

          // Redirect to check page
          window.location.href = `/check.html?code=${data.check.share_code}`;
        }
      }
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Failed to create check. Please try again.');
  }
});

document.getElementById('joinCheckBtn').addEventListener('click', async () => {
  const shareCode = document.getElementById('shareCodeInput').value.trim().toUpperCase();
  const name = document.getElementById('nameInput').value.trim();

  if (!shareCode || !name) {
    showError('Please enter both share code and your name');
    return;
  }

  try {
    const sessionId = sessionStorage.getItem('sessionId');

    const response = await fetch(`/api/checks/${shareCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sessionId })
    });

    const data = await response.json();

    if (data.success) {
      // Store session info
      sessionStorage.setItem('sessionId', data.sessionId);
      sessionStorage.setItem('participantId', data.participant.id);
      sessionStorage.setItem('participantName', data.participant.name);

      // Redirect to check page
      window.location.href = `/check.html?code=${shareCode}`;
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Failed to join check. Please try again.');
  }
});

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Auto-uppercase share code input
document.getElementById('shareCodeInput').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});
