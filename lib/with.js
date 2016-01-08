/**
 * add with
 * @author: SimonHao
 * @date:   2016-01-08 17:19:46
 */

'use strict';

var detect = require('acorn-globals');

module.exports = function(local, src, exclude){

  exclude = exclude || [];

  var exclude_vars = ['window', 'document', 'console'].concat(exclude || []);

  var global_vars = detect(src)
    .map(function(global_var){ return global_var.name; })
    .filter(function(var_name){
      return exclude_vars.indexOf(var_name) === -1 && var_name !== 'undefined';
    });

  var input_vars = global_vars.map(function(global_var){
    return local + '[' + JSON.stringify(global_var) + ']';
  });

  return ';(function(' + global_vars.join(',') + '){' + src + '})(' + input_vars.join(',') + ');';
};