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
        this.interpolate(str, true);
      }else{
        this.last_text_buf.push(utils.stringify(str, true));
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
  buffer_code_last: function(exp, inline){
    if(inline){
      this.last_text_buf.push(exp);
    }else{
      this.buf.push(this.buf.pop() + exp);
    }
  },
  /**
   * 清除文本缓冲区
   */
  clear_text_buf: function(){
    var text = '';

    if(this.last_text_buf.length){
      text = this.last_text_buf.join('');
      this.last_text_buf = [];

      if(text !== ''){
        this.buf.push('__made_buf.push("' + text + '");');
      }
    }
  },
  /**
   * 用来查找 "}"
   */
  detect_bracket: function(str){
    return character_parser.parseUntil(str, '}');
  },
  /**
   * 从字符串中解析id, instance, important_instance
   */
  detect_path: function(str){
    var match = str.match(/([^\:!]*)(?:\:([^\!]*))?(?:\!([^\:]*))?/);

    var module_id = match[1];
    var module_instance = match[2];
    var important_instance = match[3];

    var info = {
      filename: mid.path(module_id, this.options),
      instance: (important_instance !== undefined) ? important_instance : (this.sid + (this.options.instance ? '-' + this.options.instance : '') + (module_instance ? '-' + module_instance : ''))
    };

    return info;
  },
  /**
   * 处理插入表达式
   */
  interpolate: function(str, inline){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      this.buffer_code_last(utils.stringify(str.substring(0, match.index), true), inline);

      if(match[1]){ // escape
        this.buffer_code_last(utils.stringify(match[2] + '{', true), inline);

        this.interpolate(match[3]);
      }else{
        var rest = match[3];
        var range = this.detect_bracket(rest);
        var code = ('!' == match[2] ? '' : 'made.encode') + '(' + range.src + ')';

        this.buffer_code_last('"+(' + code + ')+"', inline);
        this.interpolate(rest.substring(range.end + 1), inline);
      }
    }else{
      this.buffer_code_last(utils.stringify(str, true), inline);
    }
  },
  indent: function(){
    this.indent_stack += '  ';
  },
  outdent: function(){
    this.indent_stack = this.indent_stack.substring(0, (this.indent_stack.length - 2));
  },
  visit: function(node, inline){
    var visitor = 'visit_' + node.type;

    if(visitor in this){
      this[visitor](node, inline);
    }else{
      console.error('Compiler error from file "', this.filename, '"');
      console.error('Unknow Node Type :', node.type);
      throw new Error('Compiler Error');
    }
  },
  visit_nodes: function(nodes, inline){
    var self = this;

    if(!Array.isArray(nodes)) return;

    this.indent();
    nodes.forEach(function(node){
      self.visit(node, inline);
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
        self.visit_property(property);
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
    this.buffer_code_last('"+(', true);
    this.visit(node.val, true);
    this.buffer_code_last(')+"', true);

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
    this.buffer_code_last('"+(', true);
    this.visit(node.val, true);
    this.buffer_code_last(')+"', true);
    this.buffer_text('"');
  },
  visit_json_ident: function(node, inline){
    this.buffer_code_last(node.val, inline);
  },
  visit_json_array: function(node, inline){
    this.buffer_code_last('[', inline);

    for(var i = 0; i < (node.element.length - 1); i++){
      this.visit(node.element[i], inline);
      this.buffer_code_last(',', inline);
    }

    this.visit(node.element[i], inline);
    this.buffer_code_last(']', inline);
  },
  visit_json_number: function(node, inline){
    this.buffer_code_last(node.val, inline);
  },
  visit_json_reference_list: function(node, inline){
    this.visit(node.ident, inline);
    this.visit_nodes(node.list, inline);
  },
  visit_json_literal: function(node, inline){
    this.buffer_code_last(node.val, inline);
  },
  visit_json_object: function(node, inline){
    this.buffer_code_last('{', inline);

    for(var i = 0; i < (node.member.length - 1); i++){
      this.visit(node.member[i], inline);
      this.buffer_code_last(',', inline);
    }

    this.visit(node.member[i], inline);
    this.buffer_code_last('}', inline);
  },
  visit_json_member: function(node, inline){
    this.buffer_code_last(node.name + ':', inline);
    this.visit(node.val, inline);
  },
  visit_json_string: function(node, inline){
    this.buffer_code_last('"', inline);
    this.interpolate(node.val, inline);
    this.buffer_code_last('"', inline);
  },
  visit_block: function(node){
    this.buffer_code('made.block(__made_block,' + utils.stringify(node.name) + ',function(){');
    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  },
  visit_extends: function(node){
    var self = this;
    var path_info = this.detect_path(node.id);

    var str = fs.readFileSync(path_info.filename, 'utf-8');
    var ast = new Parser(str, path_info.filename).parse();

    var code = new Compiler(ast, extend({}, this.options, {
      filename: path_info.filename,
      instance: path_info.instance,
      indent: this.indent_stack
    }), this.transform).compile();

    this.buffer_code('(function(__made_locals, __made_block){');
    this.buffer_code(code);
    this.buffer_code('})({');

    var options_list = node.option || [];

    for(var i = 0; i < (options_list.length - 1); i++){
      this.visit_option(options_list[i]);
      this.buffer_code_last(',');
    }
    this.visit_option(options_list[i]);

    this.buffer_code('},{');

    this.visit_content(node.content);
    this.buffer_code('});')
  },
  visit_option: function(node){
    this.buffer_code_last(node.name + ':');
    this.visit(node.val);
  },
  visit_content: function(content_list){
    var self = this;
    var content_list  = content_list || [];
    var content_table = {};

    content_list.forEach(function(content){
      content_table[content.block] = content_table[content.block] || {before:[],replace:[],after:[]};
      content_table[content.block][content.type].push(content);
    });

    Object.keys(content_table).forEach(function(block){
      self.buffer_code(block + ':[');

      if(content_table[block].before.length){
        self.visit_content_list(content_table[block].before);
      }else{
        self.buffer_code('null');
      }
      self.buffer_code(',');

      if(content_table[block].replace.length){
        self.visit_content_list(content_table[block].replace);
      }else{
        self.buffer_code('null');
      }
      self.buffer_code(',');

      if(content_table[block].after.length){
        self.visit_content_list(content_table[block].after);
      }else{
        self.buffer_code('null');
      }
      self.buffer_code('],');
    });
  },
  visit_content_list: function(content_list){
    var self = this;

    this.buffer_code('function(){');
    content_list.forEach(function(content){
      self.visit_nodes(content.nodes);
    });
    this.buffer_code('}');
  },
  visit_include: function(node){

  }
};






















module.exports = Compiler;