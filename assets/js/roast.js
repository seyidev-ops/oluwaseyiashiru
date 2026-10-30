(function () {
  'use strict';
  var reduce = window.OA && window.OA.reduce;
  var lines = [['Who pays first, and how much?', 2], ['What does one customer cost you to win?', 3], ['Cut the steps. What is the real constraint?', 6], ['What happens to your cash if this fails?', 6], ['Will they tell their friends about it?', 3], ['Can it run without you holding it together?', 5], ['Is this a one-way door or a two-way door?', 0]];
  var calls = [['7.4', 'Start small, test in 30 days'], ['6.1', 'Not yet: prove demand first'], ['8.2', 'Go, but raise the price'], ['5.3', 'Buy, don’t build']];
  var seats = document.querySelectorAll('.rt-seat'), bub = document.getElementById('rt-bubble'), i = 0, c = 0;
  if (reduce || !seats.length) return;
  setInterval(function () {
    var L = lines[i % lines.length], s = seats[L[1]]; i++;
    seats.forEach(function (x) { x.classList.remove('talk'); }); s.classList.add('talk');
    bub.classList.remove('in'); void bub.offsetWidth; bub.textContent = L[0];
    bub.style.setProperty('--x', s.style.getPropertyValue('--x') || getComputedStyle(s).getPropertyValue('--x'));
    bub.style.left = s.offsetLeft + s.offsetWidth / 2 + 'px'; bub.style.top = Math.max(0, s.offsetTop - 54) + 'px'; bub.classList.add('in');
    if (i % 4 === 0) { c++; var k = calls[c % calls.length]; document.getElementById('rt-n').textContent = k[0]; document.getElementById('rt-call').textContent = k[1]; document.querySelector('.rt-table').classList.remove('pop'); void document.body.offsetWidth; document.querySelector('.rt-table').classList.add('pop'); }
  }, 2200);
})();
