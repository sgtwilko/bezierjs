require("./lib/math").bindMath();
var Bezier = require("./lib/prototype");

var b = new Bezier(0,0 , 0,1 , 1,1 , 1,0);
var points = b.split(0.321).span;
console.log(points.map(function(p) { return p.toString(); }));
