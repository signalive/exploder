(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Exploder"] = factory();
	else
		root["Exploder"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	module.exports = __webpack_require__(1);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var _interopRequire = function (obj) {
	  return obj && (obj["default"] || obj);
	};
	
	var Gif = _interopRequire(__webpack_require__(2));
	
	var StreamReader = _interopRequire(__webpack_require__(3));
	
	var Promises = __webpack_require__(4).Promises;
	
	
	var url = URL && URL.createObjectURL ? URL : webkitURL;
	
	var gifCache = new Map();
	var Exploder = function Exploder(file) {
	  this.file = file;
	};
	
	Exploder.prototype.load = function () {
	  var _this = this;
	  var cachedGifPromise = gifCache.get(this.file);
	  if (cachedGifPromise) return cachedGifPromise;
	
	  var gifPromise = Promises.xhrGet(this.file, "*/*", "arraybuffer").then(function (buffer) {
	    return _this.explode(buffer);
	  });
	
	  gifCache.set(this.file, gifPromise);
	  return gifPromise;
	};
	
	Exploder.prototype.explode = function (buffer) {
	  console.debug("EXPLODING " + this.file);
	  return new Promise(function (resolve, reject) {
	    var frames = [],
	        streamReader = new StreamReader(buffer);
	
	    // Ensure this is an animated GIF
	    if (streamReader.readAscii(6) != "GIF89a") {
	      reject(Error("Not a GIF!"));
	      return;
	    }
	
	    streamReader.skipBytes(4); // Height & Width
	    if (streamReader.peekBit(1)) {
	      streamReader.log("GLOBAL COLOR TABLE");
	      var colorTableSize = streamReader.readByte() & 7;
	      streamReader.log("GLOBAL COLOR TABLE IS " + 3 * Math.pow(2, colorTableSize + 1) + " BYTES");
	      streamReader.skipBytes(2);
	      streamReader.skipBytes(3 * Math.pow(2, colorTableSize + 1));
	    } else {
	      streamReader.log("NO GLOBAL COLOR TABLE");
	    }
	    // WE HAVE ENOUGH FOR THE GIF HEADER!
	    var gifHeader = buffer.slice(0, streamReader.index);
	
	    var spinning = true,
	        expectingImage = false;
	    while (spinning) {
	      if (streamReader.isNext([33, 255])) {
	        streamReader.log("APPLICATION EXTENSION");
	        streamReader.skipBytes(2);
	        var blockSize = streamReader.readByte();
	        streamReader.log(streamReader.readAscii(blockSize));
	
	        if (streamReader.isNext([3, 1])) {
	          // we cool
	          streamReader.skipBytes(5);
	        } else {
	          streamReader.log("A weird application extension. Skip until we have 2 NULL bytes");
	          while (!(streamReader.readByte() === 0 && streamReader.peekByte() === 0));
	          streamReader.log("OK moving on");
	          streamReader.skipBytes(1);
	        }
	      } else if (streamReader.isNext([33, 254])) {
	        streamReader.log("COMMENT EXTENSION");
	        streamReader.skipBytes(2);
	
	        while (!streamReader.isNext([0])) {
	          var blockSize = streamReader.readByte();
	          streamReader.log(streamReader.readAscii(blockSize));
	        }
	        streamReader.skipBytes(1); //NULL terminator
	      } else if (streamReader.isNext([44])) {
	        streamReader.log("IMAGE DESCRIPTOR!");
	        if (!expectingImage) {
	          // This is a bare image, not prefaced with a Graphics Control Extension
	          // so we should treat it as a frame.
	          frames.push({ index: streamReader.index, delay: 0 });
	        }
	        expectingImage = false;
	
	        streamReader.skipBytes(9);
	        if (streamReader.peekBit(1)) {
	          streamReader.log("LOCAL COLOR TABLE");
	          var colorTableSize = streamReader.readByte() & 7;
	          streamReader.log("LOCAL COLOR TABLE IS " + 3 * Math.pow(2, colorTableSize + 1) + " BYTES");
	          streamReader.skipBytes(3 * Math.pow(2, colorTableSize + 1));
	        } else {
	          streamReader.log("NO LOCAL TABLE PHEW");
	          streamReader.skipBytes(1);
	        }
	
	        streamReader.log("MIN CODE SIZE " + streamReader.readByte());
	        streamReader.log("DATA START");
	
	        while (!streamReader.isNext([0])) {
	          var blockSize = streamReader.readByte();
	          //        streamReader.log("SKIPPING " + blockSize + " BYTES");
	          streamReader.skipBytes(blockSize);
	        }
	        streamReader.log("DATA END");
	        streamReader.skipBytes(1); //NULL terminator
	      } else if (streamReader.isNext([33, 249, 4])) {
	        streamReader.log("GRAPHICS CONTROL EXTENSION!");
	        // We _definitely_ have a frame. Now we're expecting an image
	        var index = streamReader.index;
	
	        streamReader.skipBytes(3);
	        var disposalMethod = streamReader.readByte() >> 2;
	        streamReader.log("DISPOSAL " + disposalMethod);
	        var delay = streamReader.readByte() + streamReader.readByte() * 256;
	        frames.push({ index: index, delay: delay, disposal: disposalMethod });
	        streamReader.log("FRAME DELAY " + delay);
	        streamReader.skipBytes(2);
	        expectingImage = true;
	      } else {
	        var maybeTheEnd = streamReader.index;
	        while (!streamReader.finished() && !streamReader.isNext([33, 249, 4])) {
	          streamReader.readByte();
	        }
	        if (streamReader.finished()) {
	          streamReader.index = maybeTheEnd;
	          streamReader.log("WE END");
	          spinning = false;
	        } else {
	          streamReader.log("UNKNOWN DATA FROM " + maybeTheEnd);
	        }
	      }
	    }
	    var endOfFrames = streamReader.index;
	
	    var gifFooter = buffer.slice(-1); //last bit is all we need
	    for (var i = 0; i < frames.length; i++) {
	      var frame = frames[i];
	      var nextIndex = i < frames.length - 1 ? frames[i + 1].index : endOfFrames;
	      frame.blob = new Blob([gifHeader, buffer.slice(frame.index, nextIndex), gifFooter], { type: "image/gif" });
	      frame.url = url.createObjectURL(frame.blob);
	    }
	
	    resolve(new Gif(frames));
	  });
	};
	
	module.exports = Exploder;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var defaultFrameDelay = 10;
	
	var Gif = function Gif(frames) {
	  var _this = this;
	  this.frames = frames;
	  this.length = 0;
	  this.offsets = [];
	
	  frames.forEach(function (frame) {
	    _this.offsets.push(_this.length);
	    _this.length += frame.delay || defaultFrameDelay;
	  });
	};
	
	Gif.prototype.frameAt = function (fraction) {
	  var offset = fraction * this.length;
	  for (var i = 1,
	      l = this.offsets.length; i < l; i++) {
	    if (this.offsets[i] > offset) break;
	  }
	  return i - 1;
	};
	
	module.exports = Gif;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var StreamReader = function StreamReader(arrayBuffer) {
	  this.data = new Uint8Array(arrayBuffer);
	  this.index = 0;
	  this.log("TOTAL LENGTH: " + this.data.length);
	};
	
	StreamReader.prototype.finished = function () {
	  return this.index >= this.data.length;
	};
	
	StreamReader.prototype.readByte = function () {
	  return this.data[this.index++];
	};
	
	StreamReader.prototype.peekByte = function () {
	  return this.data[this.index];
	};
	
	StreamReader.prototype.skipBytes = function (n) {
	  this.index += n;
	};
	
	StreamReader.prototype.peekBit = function (i) {
	  return !!(this.peekByte() & 1 << 8 - i);
	};
	
	StreamReader.prototype.readAscii = function (n) {
	  var s = "";
	  for (var i = 0; i < n; i++) {
	    s += String.fromCharCode(this.readByte());
	  }
	  return s;
	};
	
	StreamReader.prototype.isNext = function (array) {
	  for (var i = 0; i < array.length; i++) {
	    if (array[i] !== this.data[this.index + i]) return false;
	  }
	  return true;
	};
	
	StreamReader.prototype.log = function (str) {};
	
	StreamReader.prototype.error = function (str) {
	  console.error(this.index + ": " + str);
	};
	
	module.exports = StreamReader;
	//  console.log(this.index + ": " + str);

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var Promises = exports.Promises = {
	  xhrGet: function (url, accept, responseType) {
	    return new Promise(function (resolve, reject) {
	      var loader = new XMLHttpRequest();
	      loader.open("GET", url, true);
	      loader.setRequestHeader("Accept", accept);
	      loader.responseType = responseType;
	      loader.onload = function () {
	        // This is called even on 404 etc
	        // so check the status
	        if (this.status == 200) {
	          // Resolve the promise with the response text
	          resolve(this.response);
	        } else {
	          // Otherwise reject with the status text
	          // which will hopefully be a meaningful error
	          reject(Error(this.statusText));
	        }
	      };
	
	      // Handle network errors
	      loader.onerror = function () {
	        reject(Error("Network Error"));
	      };
	      loader.send();
	    });
	  }
	};

/***/ }
/******/ ])
});

//# sourceMappingURL=exploder.map