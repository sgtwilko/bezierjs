module.exports = (function() {
  "use strict";

  var Vector = require("./Vector");
  var utils = require("./utils");

  // helper factory for point objects
  var point = function(x,y,z) {
    var p = Vector.create(x,y,z||0);
    p.toString = function() {
      return Array.prototype.join.call(p,"/");
    }
    return p;
  };

  // We set up five recycling vectors
  var _ = [point(0,0), point(0,0), point(0,0), point(0,0), point(0,0)];

  // a rotation matrix for recycling
  var R = new Float64Array([0,0,0, 0,0,0, 0,0,0]);

  // The generic Bezier curve constructor
  var Bezier = function() {
    var args = Array.prototype.slice.call(arguments);
    if(typeof args[0] === "object") {
      args = args.map(function(p) {
        return [p[0],p[1],p[2]];
      }).reduce(function(a,b) {
        return a.concat(b);
      });
    }
    var len = args.length,
        _3d = false;
    if (len === 9 || len === 12) {
      _3d = true;
    }
    this._3d = _3d;
    this.dims = [0,1];
    if (_3d) { this.dims.push(2); }
    this.points = [];
    while(args.length>0) {
      var set = args.splice(0, _3d ? 3 : 2);
      var p = point(set[0], set[1], set[2]);
      this.points.push(p);
    }
    this.order = this.points.length - 1;
    this.span = [];
  };


  // This is the "universal" API that can be called without needing
  // to care about whether something's quadratic or cubic, or 2d vs. 3d
  Bezier.prototype = {
    valueOf: function() {
      return this.toString();
    },
    toString: function() {
      var self = this;
      return this.points.map(function(p) {
        return "(" + p[0] + "/" + p[1] + (self._3d ? "/" + p[2] : '') + ")";
      }).join(", ");
    }
  };


  Bezier.prototype.length = function() {
    // using Legendre-Gauss quadrature
  };


  Bezier.prototype.getLUT = function(steps) {
    steps = abs(steps) || 1;
    var step = 1/(steps-1);
    var LUT = [this.get(0)];
    for(var i=1, l=steps-1, t; i<l; i++) {
      LUT.push(this.get(i*step));
    }
    LUT.push(this.get(1));
    return LUT;
  };

  Bezier.prototype.get = function(t) {
    var p = this.points;
    var mt = 1-t, c1, c2, c3;
    var ret = point(0,0,0);
    // quadratic
    if(this.order === 2) {
      c1 = mt*mt,
      c2 = 2*mt*t,
      c3 = t*t;
      Vector.scale(p[0],c1,_[0]); Vector.add(ret, _[0], ret);
      Vector.scale(p[1],c2,_[0]); Vector.add(ret, _[0], ret);
      Vector.scale(p[2],c3,_[0]); Vector.add(ret, _[0], ret);
      return ret
    }
    // cubic
    var mt2 = mt*mt,
        t2 = t*t,
        c4 = t2*t;
    c1 = mt2*mt;
    c2 = 3*mt2*t;
    c3 = 3*mt*t2;
    Vector.scale(p[0],c1,_[0]); Vector.add(ret, _[0], ret);
    Vector.scale(p[1],c2,_[0]); Vector.add(ret, _[0], ret);
    Vector.scale(p[2],c3,_[0]); Vector.add(ret, _[0], ret);
    Vector.scale(p[3],c4,_[0]); Vector.add(ret, _[0], ret);
    return ret
  };

  Bezier.prototype.derivative = function(t) {
    var p = this.points;
    var mt = 1-t, c1, c2;
    var ret = point(0,0,0);
    // quadratic
    if(this.order === 2) {
      Vector.subtract(p[1],p[0],_[1]); Vector.scale(_[1], 2, _[1]);
      Vector.subtract(p[2],p[1],_[2]); Vector.scale(_[2], 2, _[2]);
      Vector.scale(_[1],mt,_[0]); Vector.add(ret, _[0], ret);
      Vector.scale(_[2],t,_[0]); Vector.add(ret, _[0], ret);
      return ret
    }
    // cubic
    var mt2 = mt*mt,
        c3 = t*t;
    c1 = mt*mt;
    c2 = 2*mt*t;
    Vector.subtract(p[1],p[0],_[1]); Vector.scale(_[1], 3, _[1]);
    Vector.subtract(p[2],p[1],_[2]); Vector.scale(_[2], 3, _[2]);
    Vector.subtract(p[3],p[2],_[3]); Vector.scale(_[3], 3, _[3]);
    Vector.scale(_[1],c1,_[0]); Vector.add(ret, _[0], ret);
    Vector.scale(_[2],c2,_[0]); Vector.add(ret, _[0], ret);
    Vector.scale(_[3],c3,_[0]); Vector.add(ret, _[0], ret);
    return ret;
  };


  Bezier.prototype.normal = function(t) {
    var d = this.derivative(t);
    Vector.normalize(d, d);
    if(this._3d) {
      var ret = point(0,0,0);
      var d2 = this.derivative(t+0.001);
      Vector.normalize(d2, d2);
      Vector.cross(d2, d, _[0]);
      Vector.normalize(_[0],_[0]);
      var c = _[0];
      R[0] = c[0]*c[0];
      R[1] = c[0]*c[1]-c[2];
      R[2] = c[0]*c[2]+c[1];
      R[3] = c[0]*c[1]+c[2];
      R[4] = c[1]*c[1];
      R[5] = c[1]*c[2]-c[0];
      R[6] = c[0]*c[2]-c[1];
      R[7] = c[1]*c[2]+c[0];
      R[8] = c[2]*c[2];
      Vector.apply(d, R, ret);
      return ret;
    }
    Vector.rotate2d(d, quart, _[0]);
    Vector.normalize(_[0], d);
    return d;
  };

  // We go with the the linear interpolation approach mostly because it's
  // fast, and it's nice to have all those spanning points.
  Bezier.prototype.split = function(t) {
    var p = this.points,
        _p,
        pt,
        q = this.span,
        idx=0;
    q[idx++] = p[0];
    q[idx++] = p[1];
    q[idx++] = p[2];
    if(this.order === 3) {
      q[idx++] = p[3];
    }
    while(p.length>1) {
      _p = [];
      for(var i=0, l=p.length-1; i<l; i++) {
        pt = point(0,0,0);
        Vector.lerp(t, p[i], p[i+1], pt);
        q[idx++] = pt;
        _p.push(pt);
      }
      p = _p;
    }
    return {
      left: this.order === 2 ? new Bezier(q[0],q[3],q[5]) : new Bezier(q[0],q[4],q[7],q[9]),
      right: this.order === 2 ? new Bezier(q[5],q[4],q[2]) : new Bezier(q[9],q[8],q[6],q[3]),
      span: q
    };
  };


  // fetch roots for f(t), f'(t) and if it exists, f''(t)
  Bezier.prototype.roots = function() {
    var roots = roots.concat(this._roots).concat(this._rootsd1);
    if(this.order === 3) { roots = roots.concat(this._rootsd2); }
    return roots;
  };


  // Getting the quadratic roots is high school math.
  var getQuadraticRoots = function(p, dim) {
    var a = 3*(p[1][dim]-p[0][dim]),
        b = 3*(p[2][dim]-p[1][dim]),
        c = 3*(p[3][dim]-p[2][dim]),
        d = a - 2*b + c;
    if(d!==0) {
      var m1 = -sqrt(b*b-a*c),
          m2 = -a+b,
          v1 = -( m1+m2)/d,
          v2 = -(-m1+m2)/d;
      return [v1, v2];
    }
    else if(b!==c && d===0) {
      return [ (2*b-c)/2*(b-c) ];
    }
    return [];
  }

  var align = function(points, line) {
    var tx = line.p1.x,
        ty = line.p1.y,
        a = -atan2(line.p2.y-ty, line.p2.x-tx),
        d = function(v) {
          return {
            x: (v[0]-tx)*cos(a) - (v[0]-ty)*sin(a),
            y: (v[1]-tx)*sin(a) + (v[1]-ty)*cos(a)
          };
        };
    return points.map(d);
  };

  // Getting the cubic roots is anything but high school math: let's use Cardano's Algorithm.
  // http://www.trans4mind.com/personal_development/mathematics/polynomials/cubicAlgebra.htm
  var getCubicRoots = function(points, dim, line) {
    line = line || {p1:{x:0,y:0},p2:{x:1,y:0}};
    var a = align(points, line),
        pa = a[0].y,
        pb = a[1].y,
        pc = a[2].y,
        pd = a[3].y,
        d = (-pa + 3*pb - 3*pc + pd),
        a = (3*pa - 6*pb + 3*pc) / d,
        b = (-3*pa + 3*pb) / d,
        c = pa / d,
        p = (3*b - a*a)/3,
        p3 = p/3,
        q = (2*a*a*a - 9*a*b + 27*c)/27,
        q2 = q/2,
        discriminant = q2*q2 + p3*p3*p3,
        u1,v1,x1,x2,x3,
        reduce = function(t) { return 0<=t && t <=1; };
     if (discriminant < 0) {
      var mp3 = -p/3,
          mp33 = mp3*mp3*mp3,
          r = sqrt( mp33 ),
          t = -q/(2*r),
          cosphi = t<-1 ? -1 : t>1 ? 1 : t,
          phi = acos(cosphi),
          crtr = crt(r),
          t1 = 2*crtr;
      x1 = t1 * cos(phi/3) - a/3;
      x2 = t1 * cos((phi+tau)/3) - a/3;
      x3 = t1 * cos((phi+2*tau)/3) - a/3;
      return [x1, x2, x3].filter(reduce);
    } else if(discriminant === 0) {
      u1 = q2 < 0 ? crt(-q2) : -crt(q2);
      x1 = 2*u1-a/3;
      x2 = -u1 - a/3;
      return [x1,x2].filter(reduce);
    } else {
      var sd = sqrt(discriminant);
      u1 = crt(-q2+sd);
      v1 = crt(q2+sd);
      return [u1-v1-a/3].filter(reduce);;
    }
  }


  // roots for main function
  Bezier.prototype._roots = function() {
    var p = this.points;
    var roots = [];
    // plain quadratic
    if(this.order === 2) {
      this.dims.forEach(function(d) {
        roots = roots.concat(getQuadraticRoots(p,d));
      });
      return roots;
    }
    // cardano for cubic
    this.dims.forEach(function(d) {
      roots = roots.concat(getCubicRoots(p,d));
    });
    return roots;
  }

  Bezier.prototype.bbox = function() {
  };


  Bezier.prototype.offset = function() {
  };


  Bezier.prototype.reduce = function() {
  };


  Bezier.prototype.scale = function() {
  };


  Bezier.prototype.outline = function() {
  };


  Bezier.prototype.intersects = function() {
  };

  return Bezier;
}());
