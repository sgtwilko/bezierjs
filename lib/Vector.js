module.exports = (function() {

  var Vector = {
    create: function(a, b, c) {
      return new Float64Array([a, b, c]);
    },
    length: function(a) {
      return sqrt(a[0]*a[0] + a[1]*a[1] + (a[2] ? a[2]*a[2] : 0));
    },
    add: function(a, b, out) {
      out[0] = a[0] + b[0];
      out[1] = a[1] + b[1];
      out[2] = a[2] + b[2];
    },
    subtract: function(a, b, out) {
      out[0] = a[0] - b[0];
      out[1] = a[1] - b[1];
      out[2] = a[2] - b[2];
    },
    scale: function(a, v, out) {
      out[0] = a[0] * v;
      out[1] = a[1] * v;
      out[2] = a[2] * v;
    },
    normalize: function(a, out) {
      var len = Vector.length(a);
      out[0] = a[0] / len;
      out[1] = a[1] / len;
      out[2] = a[2] / len;
    },
    apply: function(v, m, out) {
      out[0] = v[0] * m[0] + v[1] * m[1] + v[2] * m[2];
      out[1] = v[0] * m[3] + v[1] * m[4] + v[2] * m[5];
      out[2] = v[0] * m[6] + v[1] * m[7] + v[2] * m[8];
    },
    rotate2d: function(v,a,out) {
      out[0] = v[0] * cos(a) - v[1] * sin(a);
      out[1] = v[0] * sin(a) + v[1] * cos(a);
    },
    cross: function(v1,v2,out) {
      out[0] = v1[1] * v2[2] - v1[2] * v2[1];
      out[1] = v1[2] * v2[0] - v1[0] * v2[2];
      out[2] = v1[0] * v2[1] - v1[1] * v2[0];
    },
    dot: function(a,b) {
      return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    },
    lerp: function(r,a,b,out) {
      out[0] = a[0] + r*(b[0]-a[0]);
      out[1] = a[1] + r*(b[1]-a[1]);
      out[2] = a[2] + r*(b[2]-a[2]);
    },
    clear: function(a) {
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    },
    copy: function(a) {
      var out = Vector.create(0,0,0);
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      return out;
    }
  };

  return Vector;
}());

