var log = document.querySelector("#log");
var println = function() {
  var args = Array.prototype.slice.call(arguments),
      s = args.map(function(v) {
        return v.toString();
      }),
      p = document.createElement("p");
  p.textContent = s.join("\n");
  log.appendChild(p);
}
