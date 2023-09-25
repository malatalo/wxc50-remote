import React from 'react'
import ReactDOM from 'react-dom'
import Remote from "./Remote";

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

// https://gist.github.com/xposedbones/75ebaef3c10060a3ee3b246166caab56
Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

ReactDOM.render(<Remote />, document.querySelector('#root'))
