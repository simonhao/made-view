/**
 * Made-View Utils
 * @author: SimonHao
 * @date:   2015-10-09 15:26:39
 */

'use strict';

exports.stringify = function(str) {
  return JSON.stringify(str)
             .replace(/\u2028/g, '\\u2028')
             .replace(/\u2029/g, '\\u2029');
};