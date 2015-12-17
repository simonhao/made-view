/**
 * Utils
 * @author: SimonHao
 * @date:   2015-12-16 15:42:59
 */

'use strict';

exports.stringify = function(str, pure){
  var result = JSON.stringify(str).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  if(pure){
    return result.substring(1, result.length-1);
  }else{
    return result;
  }
};