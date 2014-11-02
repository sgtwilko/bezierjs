// Having these live on the Math namespace is actually ridiculously stupid
module.exports = {
  bindMath: function() {
    global.abs   = Math.abs,
    global.sin   = Math.sin,
    global.cos   = Math.cos,
    global.atan2 = Math.atan2,
    global.pow   = Math.pow,
    global.sqrt  = Math.sqrt,
    global.crt   = function(v) { if (v<0) return -pow(-v, 1/3); return pow(v, 1/3); },
    global.pi    = Math.PI,
    global.quart = 0.5*Math.PI;
    global.tau   = 2*Math.PI;
  }
};
