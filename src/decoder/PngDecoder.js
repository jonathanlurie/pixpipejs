/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/



//import pngjs from 'pngjs'; // ependency issues
import upng from 'upng-js'; // does not halt when wrong format + additional line!
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


/**
* An instance of PngDecoder will decode a PNG image in native Javascript and
* output an Image2D. This is of course slower than using `io/FileImageReader.js`
* but this is compatible with Node and not rely on HTML5 Canvas.
*
* **Usage**
* - [examples/fileToPng.html](../examples/fileToPng.html)
*/
class PngDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }

  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("PngDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    if( !this._isPng( inputBuffer ) ){
      console.warn("This is not a PNG file, unable to decode this file.");
      return;
    }

    // The decode method uses Pako to uncompress the data. Pako outputs a larger array
    // than the expected size, so we have to cut it - It seems a bit cumbersome or being
    // kindof manual work, but it's 2x faster than using upng.toRGBA8()
    try{
      var pngData = upng.decode( inputBuffer );
      /*
      var ncpp = Math.round(pngData.data.length / (pngData.width*pngData.height) );
      var outputImage = new Image2D();
      var croppedArray = new pngData.data.constructor( pngData.data.buffer, 0, pngData.width * pngData.height * ncpp);
      outputImage.setData(croppedArray, pngData.width, pngData.height, ncpp);
      this._output[ 0 ] = outputImage;
      */

      var depthToType = {
        8: Uint8Array,
        16: Uint16Array,
        32: Float32Array
      }

      var ctypeToNcpp = {
        6: 4,
        2: 3,
        3: 1,
        4: 2,
        0: 1
      }

      var rawData = pngData.data.buffer
      var dataTypedArray = depthToType[pngData.depth]
      var ncpp = ctypeToNcpp[pngData.ctype]
      var croppedArray = new dataTypedArray( rawData, 0, pngData.width * pngData.height * ncpp);

      // swqpping bytes as in
      // https://stackoverflow.com/questions/5320439/how-do-i-swap-endian-ness-byte-order-of-a-variable-in-javascript
      function swap16(val) {
        return ((val & 0xFF) << 8)
               | ((val >> 8) & 0xFF);
      }

      function swap32(val) {
        return ((val & 0xFF) << 24)
               | ((val & 0xFF00) << 8)
               | ((val >> 8) & 0xFF00)
               | ((val >> 24) & 0xFF);
      }


      var t0 = performance.now();

      if (pngData.depth === 16) {
        for (var i=0; i<croppedArray.length; i++) {
          // flip bytes
          croppedArray[i] = swap16(croppedArray[i])
        }
      }

      var t1 = performance.now();
      console.log((t1 - t0) + " ms.")

      if (pngData.depth === 32) {
        for (var i=0; i<croppedArray.length; i++) {
          // flip bytes
          croppedArray[i] = swap32(croppedArray[i])
        }
      }

      var outputImage = new Image2D();
      outputImage.setData(croppedArray, pngData.width, pngData.height, ncpp);
      this._output[ 0 ] = outputImage;

    }catch(e){
      console.warn(e);
    }

  }


  /**
  * Checks if the input buffer is of a png file
  * @param {ArrayBuffer} buffer - an array buffer inside which a PNG could be hiding!
  * @return {Boolean} true if the buffer is a valid PNG buffer, false if not
  */
  _isPng( buffer ){
    var first8Bytes = new Uint8Array( buffer, 0, 8);
    var validSequence = new Uint8Array( [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

    for(var i=0; i<first8Bytes.length; i++){
      if(first8Bytes[i] != validSequence[i])
        return false;
    }

    return true;
  }


} /* PngDecoder */

export { PngDecoder }
