(function(){
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var COUNT = 55, DIST = 160, SPEED = 0.28;
  var W, H, nodes;
  function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function init(){
    resize();
    nodes = [];
    for (var i = 0; i < COUNT; i++) nodes.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: rnd(-SPEED, SPEED), vy: rnd(-SPEED, SPEED),
      r: rnd(1.5, 3.2), pulse: Math.random() * Math.PI * 2
    });
  }
  function draw(){
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < COUNT; i++) for (var j = i + 1; j < COUNT; j++) {
      var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < DIST) {
        ctx.strokeStyle = 'rgba(99,102,241,' + (1 - d / DIST) * 0.6 + ')';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
      }
    }
    var t = performance.now() / 1000;
    nodes.forEach(function(n){
      var g = 0.55 + 0.45 * Math.sin(t * 1.4 + n.pulse);
      ctx.fillStyle = 'rgba(139,92,246,' + g + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (0.85 + 0.15 * g), 0, Math.PI * 2); ctx.fill();
    });
  }
  function tick(){
    nodes.forEach(function(n){
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
    });
    draw(); requestAnimationFrame(tick);
  }
  window.addEventListener('resize', function(){
    resize();
    nodes.forEach(function(n){ n.x = Math.min(n.x, W); n.y = Math.min(n.y, H); });
  });
  init(); tick();
})();
