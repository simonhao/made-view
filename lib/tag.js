/**
 * Tag Attribute
 * @author: SimonHao
 * @date:   2015-12-16 14:13:55
 */

'use strict';

var self_closeing_tags = {
  'area': true,
  'base': true,
  'br': true,
  'col': true,
  'embed': true,
  'hr': true,
  'img': true,
  'input': true,
  'keygen': true,
  'link': true,
  'menuitem': true,
  'meta': true,
  'param': true,
  'source': true,
  'track': true,
  'wbr': true
};

exports.self_closeing = function(tag_name){
  return tag_name in self_closeing_tags;
};

var inline_tags = {
  'a': true,
  'abbr': true,
  'acronym': true,
  'b': true,
  'br': true,
  'code': true,
  'em': true,
  'font': true,
  'i': true,
  'img': true,
  'ins': true,
  'kbd': true,
  'map': true,
  'samp': true,
  'small': true,
  'span': true,
  'strong': true,
  'sub': true,
  'sup': true
};

exports.inline = function(tag_name){
  return tag_name in inline_tags;
};