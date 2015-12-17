/**
 * Made-View Compiler
 * @author: SimonHao
 * @date:   2015-12-16 14:13:46
 */

'use strict';

var Parser           = require('made-view-parser');
var runtime          = require('made-runtime');
var addwith          = require('made-with');
var mid              = require('made-id');
var fs               = require('fs');
var extend           = require('extend');
var utils            = require('./util');
var tags             = require('./tag');
var character_parser = require('character-parser');


function Compiler(ast, options, transform){
  this.options = extend({
    entry: 'view.jade',
    ext: '.jade',
    basedir: process.cwd(),
    filename: __filename,
    instance: '',
    model: 'dev',
    pretty: true,
    indent: '\n',
  }, options);

  this.filename = this.options.filename;
  this.transform = transform;

  this.ast = ast;
  this.instance = this.options.instance;
  this.sid = this.options.sid = mid.sid(this.filename, this.options)

  this.buf = [];
  this.last_text_buf = [];
  this.indent_stack = this.options.indent;
}


Compiler.prototype = {
  constructor: Compiler,
  compile: function(){
    this.visit(this.ast);

    return addwith('__made_locals', this.buf.join('\n'), ['__made_buf', '__made_block', 'made']);
  },
  /**
   * 缓存文本
   */
  buffer_text: function(str, interpolate){
    if(str){
      if(interpolate){
        this.interpolate(str);
      }else{
        this.last_text_buf.push(str);
      }
    }
  },
  /**
   * 缓存代码片段
   */
  buffer_code: function(exp){
    this.clear_text_buf();
    this.buf.push(exp);
  },
  /**
   * 缓存代码片段到同一行
   */
  buffer_code_last: function(exp){
    this.buf.push(this.buf.pop() + exp);
  },
  /**
   * 清除文本缓冲区
   */
  clear_text_buf: function(){
    var text = '';

    if(this.last_text_buf.length){
      text = this.last_text_buf.join('');
      text = utils.stringify(text);

      this.last_text_buf = [];

      if(text !== ''){
        this.buf.push('__made_buf.push(' + text + ');');
      }
    }
  },
  /**
   * 用来查找 "}"
   * @param  {[type]} str [description]
   * @return {[type]}     [description]
   */
  detect_bracket: function(str){
    return character_parser.parseUntil(str, '}');
  },
  /**
   * 处理插入表达式
   */
  interpolate: function(str){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      this.buffer_text(str.substring(0, match.index));

      if(match[1]){ // escape
        this.buffer_text(match[2] + '{');

        this.interpolate(match[3]);
      }else{
        var rest = match[3];
        var range = this.detect_bracket(rest);
        var code = ('!' == match[2] ? '' : 'made.encode') + '(' + range.src + ')';

        this.buffer_code('__made_buf.push(' + code + ')');
        this.interpolate(rest.substring(range.end + 1));
      }
    }else{
      this.buffer_text(str);
    }
  },
  indent: function(){
    this.indent_stack += '  ';
  },
  outdent: function(){
    this.indent_stack = this.indent_stack.substring(0, (this.indent_stack.length - 2));
  },
  visit: function(node){
    var visitor = 'visit_' + node.type;

    if(visitor in this){
      this[visitor](node);
    }else{
      console.error('Compiler error from file "', this.filename, '"');
      console.error('Unknow Node Type :', node.type);
      throw new Error('Compiler Error');
    }
  },
  visit_nodes: function(nodes){
    var self = this;

    if(!Array.isArray(nodes)) return;

    this.indent();
    nodes.forEach(function(node){
      self.visit(node);
    });
    this.outdent();
  },
  visit_file: function(file){
    var self = this;

    if(Array.isArray(file.nodes)){
      file.nodes.forEach(function(node){
        self.visit(node);
      });
    }

    this.clear_text_buf();
  },
  visit_doctype: function(node){
    this.buffer_text('<!DOCTYPE ' + node.val + '>');
  },
  visit_tag: function(node){
    var self = this;

    if(!tags.inline(node.name) && this.options.pretty){
      this.buffer_text(this.indent_stack);
    }

    this.buffer_text('<' + node.name);

    var property_list = node.property_list || [];

    property_list.forEach(function(property){
      self.buffer_text(' ');
      if(property.name === 'class'){
        self.visit_class_property(property, node.class_list);
      }else if(property.name === 'id'){
        self.visit_id_property(property);
      }else{
        self.visit(property);
      }
    });

    if(tags.self_closeing(node.name)){
      this.buffer_text('>');
    }else{
      this.buffer_text('>');
      this.buffer_text(node.text, true);
      this.visit_nodes(node.nodes);

      if(!tags.inline(node.name) && this.options.pretty && Array.isArray(node.nodes) && node.nodes.length){
        this.buffer_text(this.indent_stack);
      }

      this.buffer_text('</' + node.name + '>');
    }
  },
  visit_property: function(node){
    if(node.name in this.transform){
      this.visit_transform_property(node);
    }else if(node.boolean){
      this.visit_boolean_property(node);
    }else{
      this.visit_normal_property(node);
    }
  },
  visit_class_property: function(node, list){
    var self = this;

    this.buffer_text('class="');

    if(node.val.type === 'json_string'){
      this.buffer_text(node.val.val, true);
    }else{
      this.buffer_code('__made_buf.push(');
      this.visit(node.val);
      this.buffer_code_last(');');
    }

    var class_list = list || [];

    class_list.forEach(function(class_node){
      self.buffer_text(' ');
      self.visit_class(class_node);
    });

    this.buffer_text('"');
  },
  visit_class: function(node){
    this.buffer_text(this.sid + '-' + node.val);
  },
  visit_transform_property: function(node){
    if(node.val && node.val.type === 'json_string'){
      this.buffer_text(node.name + '="' + this.transform[node.name](node.val.val, this.options) + '"');
    }else{
      this.visit_property(node);
    }
  },
  visit_id_property: function(node){
    if(node.val && node.val.type === 'json_string'){
      this.buffer_text('id=' + utils.stringify(this.sid + '-' + (this.instance ? this.instance+'-':'') + node.val.val));
    }else{
      this.visit_property(node);
    }
  },
  visit_boolean_property: function(node){
    this.buffer_text(node.name);
  },
  visit_normal_property: function(node){
    this.buffer_text(node.name + '="');

    if(node.val.type === 'json_string'){
      this.buffer_text(node.val.val, true);
    }else{
      this.buffer_code('__made_buf.push(');
      this.visit(node.val);
      this.buffer_code_last(');');
    }

    this.buffer_text('"');
  },
  visit_json_ident: function(node){
    this.buffer_code_last(node.val);
  },
  visit_json_array: function(node){
    this.buffer_code_last('[');

    for(var i = 0; i < (node.element.length - 1); i++){
      this.visit(node.element[i]);
      this.buffer_code_last(',');
    }

    this.visit(node.element[i]);
    this.buffer_code_last(']');
  },
  visit_json_number: function(node){
    this.buffer_code_last(node.val);
  },
  visit_json_reference_list: function(node){
    this.visit(node.ident);
    this.visit_nodes(node.list);
  },
  visit_json_literal: function(node){
    this.buffer_code_last(node.val);
  },
  visit_json_object: function(node){
    this.buffer_code_last('{');

    for(var i = 0; i < (node.member.length - 1); i++){
      this.visit(node.member[i]);
      this.buffer_code_last(',');
    }

    this.visit(node.member[i]);
    this.buffer_code_last('}');
  },
  visit_json_member: function(node){
    this.buffer_code_last(node.name + ':');
    this.visit(node.val);
  },
  visit_json_string: function(node){
    this.buffer_code_last(utils.stringify(node.val));
  },
  visit_block: function(node){
    this.buffer_code('made.block(__made_block,' + utils.stringify(node.name) + ',function(){');
    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  }
};






















module.exports = Compiler;