/**
 * Made-View Utils
 * @author: SimonHao
 * @date:   2015-10-09 15:26:39
 */

'use strict';

exports.stringify = function(str){
  return JSON.stringify(str)
             .replace(/\u2028/g, '\\u2028')
             .replace(/\u2029/g, '\\u2029');
};

exports.self_closeing = {
  "area": true,
  "base": true,
  "br": true,
  "col": true,
  "embed": true,
  "hr": true,
  "img": true,
  "input": true,
  "keygen": true,
  "link": true,
  "menuitem": true,
  "meta": true,
  "param": true,
  "source": true,
  "track": true,
  "wbr": true
};

exports.is_string = function(str){
  if(str[0] === '"' || str[0] === "'"){
    var func_str = 'return typeof ' + str + ';';
    var func = new Function(func_str);

    return func() === 'string';
  }

  return false;
};













