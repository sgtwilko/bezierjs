module.exports = (function() {
  "use strict";

  // Having these live on the Math namespace is incredibly annoying
  global.pi    = Math.PI;
  global.quart = 0.5*Math.PI;
  global.tau   = 2*Math.PI;
  global.abs   = Math.abs;
  global.sin   = Math.sin;
  global.cos   = Math.cos;
  global.acos  = Math.acos;
  global.atan2 = Math.atan2;
  global.pow   = Math.pow;
  global.sqrt  = Math.sqrt;
  global.crt   = function(v) {
    if (v<0) return -pow(-v, 1/3);
    return pow(v, 1/3);
  };

  var utils = require("./utils");
  var constants = require("./constants");

  var Vector = function(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z||0;
  };

  Vector.prototype = {
    normalize: function() {
      var l = sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
      return new Vector(this.x / l, this.y / l, this.z / l);
    },
    cross: function(v2) {
      var v1=this;
      return new Vector(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
      );
    },
    dot: function(v2) {
      var v1 = this;
      return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    },
    rotate2d: function(a) {
      return new Vector(
        this.x * cos(a) - this.y * sin(a),
        this.x * sin(a) + this.y * cos(a),
        0
      );
    },
    apply: function(m) {
      return new Vector(
        this.x * m[0] + this.y * m[1] + this.z * m[2],
        this.x * m[3] + this.y * m[4] + this.z * m[5],
        this.x * m[6] + this.y * m[7] + this.z * m[8]
      );
    },
    lerp: function(r,v2) {
      var v1 = this;
      return new Vector(
        v1.x + r * (v2.x - v1.x),
        v1.y + r * (v2.y - v1.y),
        v1.z + r * (v2.z - v1.z)
      );
    },
    toString: function() {
      return this.x+"/"+this.y+"/"+this.z;
    }
  };

  function point(x,y,z) { return new Vector(x,y,z); }



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
    this.dims = ['x','y'];
    if (_3d) { this.dims.push('z'); }
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
      return this.points.map(function(p) { return p.toString(); }).join(", ");
    }
  };

  Bezier.prototype.arcfn =  function(t) {
    var xbase = this.derivativeDim('x',t);
    var ybase = this.derivativeDim('y',t);
    var zbase = this._3d ? this.derivativeDim('z',t) : 0;
    var combined = xbase*xbase + ybase*ybase + zbase*zbase;
    return sqrt(combined);
  };

  Bezier.prototype.length = function() {
    var z=0.5,sum=0,len=constants.Tvalues.length,i,t;
    for(i=0; i<len; i++) {
      t = z * constants.Tvalues[i] + z;
      sum += constants.Cvalues[i] * this.arcfn(t);
    }
    return z * sum;
  };

  Bezier.prototype.getLUT = function(steps) {
    steps = abs(steps) || 1;
    var step = 1/(steps-1);
    var LUT = [this.points[0]];
    for(var i=1, l=steps-1, t; i<l; i++) {
      LUT.push(this.get(i*step));
    }
    LUT.push(this.points[this.order]);
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
      return {
        x: c1*p[0].x + c2*p[1].x + c3*p[2].x,
        y: c1*p[0].y + c2*p[1].y + c3*p[2].y,
        z: this._3d ? c1*p[0].z + c2*p[1].z + c3*p[2].z : 0
      };
    }
    // cubic
    var mt2 = mt*mt, t2 = t*t, c4 = t2*t;
    c1 = mt2*mt;
    c2 = 3*mt2*t;
    c3 = 3*mt*t2;
    return {
      x: c1*p[0].x + c2*p[1].x + c3*p[2].x + c4 * p[3].x,
      y: c1*p[0].y + c2*p[1].y + c3*p[2].y + c4 * p[3].y,
      z: this._3d ? c1*p[0].z + c2*p[1].z + c3*p[2].z + c4 * p[3].z : 0
    };
  };

  Bezier.prototype.derivativeDim = function(dim, t) {
    var p = this.points;
    var mt = 1-t, c1, c2, p1, p2;
    // quadratic
    if(this.order === 2) {
      p1 = 2 * (p[1][dim] - p[0][dim]);
      p2 = 2 * (p[2][dim] - p[1][dim]);
      return mt*p1 + t*p2;
    }
    // cubic
    var mt2 = mt*mt,
        c3 = t*t,
        p3 = 3*(p[3][dim] - p[2][dim]);
    c1 = mt*mt;
    c2 = 2*mt*t;
    p1 = 3*(p[1][dim] - p[0][dim]);
    p2 = 3*(p[2][dim] - p[1][dim]);
    return c1*p1 + c2*p2 + c3*p3;
  }

  Bezier.prototype.derivative = function(t) {
    return new Vector(
      this.derivativeDim('x',t),
      this.derivativeDim('y',t),
      this._3d ? this.derivativeDim('z',t) : 0
    );
  };


  Bezier.prototype.normal = function(t) {
    var d = this.derivative(t).normalize();
    // in 2d it's just "turn the tangent"
    if(!this._3d) { return d.rotate2d(quart); }
    // in 3d finding the axis to "turn over" is a bit of work
    var d2 = this.derivative(t+0.001).normalize();
    var axis = d2.cross(d).normalize();
    R[0] = axis.x * axis.x;
    R[1] = axis.x * axis.y - axis.z;
    R[2] = axis.x * axis.z + axis.y;
    R[3] = axis.x * axis.y + axis.z;
    R[4] = axis.y * axis.y;
    R[5] = axis.y * axis.z - axis.x;
    R[6] = axis.x * axis.z - axis.y;
    R[7] = axis.y * axis.z + axis.x;
    R[8] = axis.z * axis.z;
    return d.apply(R);
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
        pt = p[1].lerp(t,p[i+1]);
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
    var roots = this._roots();//.concat(this._rootsd1);
    //if(this.order === 3) { roots = roots.concat(this._rootsd2); }
    return roots;
  };

  // Getting the quadratic roots is high school math.
  var getQuadraticRoots = function(p, dim) {
    var a = p[0][dim],
        b = p[1][dim],
        c = p[2][dim],
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
  };

  var align = function(points, dim, line) {
    var tx = line.p1.x,
        ty = line.p1.y,
        a = -atan2(line.p2.y-ty, line.p2.x-tx),
        d = function(v) {
          return {
            x: (v.x-tx)*cos(a) - (v.y-ty)*sin(a),
            y: (v.x-tx)*sin(a) + (v.y-ty)*cos(a)
          };
        };
    return points.map(d);
  };

  // Getting the cubic roots is anything but high school math: let's use Cardano's Algorithm.
  // http://www.trans4mind.com/personal_development/mathematics/polynomials/cubicAlgebra.htm
  var getCubicRoots = function(points, dim, line) {
    var pa = points[0][dim],
        pb = points[1][dim],
        pc = points[2][dim],
        pd = points[3][dim],
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
      return [u1-v1-a/3].filter(reduce);
    }
  };


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
  };

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
