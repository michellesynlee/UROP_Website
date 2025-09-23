// movement.js
document.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('bubbleStage');
  const card  = document.getElementById('movement-card');
  if (!stage || !card) return;

  const bubbles = Array.from(stage.querySelectorAll('.bubble'));

  function clearActive() {
    bubbles.forEach(b => b.classList.remove('active'));
    stage.classList.remove('has-active');
    card.classList.remove('has-active');
  }
  function activate(b) {
    b.classList.add('active');
    stage.classList.add('has-active');
    card.classList.add('has-active');
  }

  // Click inside the stage:
  // - click on a bubble -> activate it (don’t toggle off)
  // - click on empty space -> clear
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('.bubble');
    if (!b) { clearActive(); return; }
    if (!b.classList.contains('active')) {
      clearActive();
      activate(b);
    }
  });

  // Click anywhere outside the white card -> clear
  document.addEventListener('click', (e) => {
    if (!card.contains(e.target)) clearActive();
  });

  // Keyboard
  bubbles.forEach(b => {
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearActive();
  });
});
