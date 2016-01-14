/**
 * Made-View Compiler
 * @author: SimonHao
 * @date:   2015-12-16 14:13:46
 */

'use strict';

var Parser           = require('made-view-parser');
var mid              = require('made-id');
var fs               = require('fs');
var extend           = require('extend');
var addwith          = require('./with');
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
    instance_through: true,
    model: 'dev',
    pretty: true,
    indent: '\n',
  }, options);

  this.filename = this.options.filename;
  this.transform = transform || {};

  this.ast = ast;
  this.instance = this.options.instance;
  this.sid = mid.sid(this.filename, this.options);
  this.block = {};

  this.buf = [];
  this.last_text_buf = [];
  this.indent_stack = this.options.indent;
}


Compiler.prototype = {
  constructor: Compiler,
  compile: function(){
    this.visit(this.ast);

    return addwith('__made_locals', this.buf.join('\n'), ['__made_buf', '__made_block', '__made_dep', '__made_view']);
  },
  /**
   * 弹出错误
   */
  error: function(msg){
    console.error('Compiler error from file "', this.filename, '"');
    console.error(msg);
    throw new Error('Compiler Error');
  },
  /**
   * 缓存文本
   */
  buffer_text: function(str, interpolate){
    if(!str) return;

    if(interpolate){
      this.interpolate(str, true);
    }else{
      this.last_text_buf.push(utils.stringify(str, true));
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
   * 将代码缓存指定的位置的末尾
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
   * 从字符串中解析id, instance
   */
  detect_path: function(str){
    var match = str.split(':');

    var module_id = match[0];
    var module_instance = match[1];

    var instance = [];

    if(this.sid && this.options.instance_through) instance.push(this.sid);
    if(this.instance && this.options.instance_through) instance.push(this.instance);
    if(module_instance) instance.push(module_instance);

    var info = {
      filename: mid.path(module_id, this.options),
      instance: instance.join('-')
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

        this.interpolate(match[3], inline);
      }else{
        var rest = match[3];
        var range = this.detect_bracket(rest);
        var code = (('!' !== match[2] && inline) ? '__made_view.encode' : '') + '(' + range.src + ')';

        this.buffer_code_last('"+' + code + '+"', inline);
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
      this.error('Unknow Node Type :' + node.type);
    }
  },
  visit_nodes: function(nodes, inline){
    var self = this;

    if(!Array.isArray(nodes)) return;

    nodes.forEach(function(node){
      self.visit(node, inline);
    });
  },
  visit_tags: function(nodes, inline){
    if(!Array.isArray(nodes)) return;

    this.indent();
    this.visit_nodes(nodes, inline);
    this.outdent();
  },
  visit_file: function(file){
    this.visit_nodes(file.nodes);
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
    var class_list = [];

    property_list.forEach(function(property){
      if(property.name === 'class'){
        class_list.push(property);
      }else if(property.name === 'id'){
        self.buffer_text(' ');
        self.visit_id_property(property);
      }else if(property.name in self.transform){
        self.buffer_text(' ');
        self.visit_transform_property(property, node.name);
      }else{
        self.buffer_text(' ');
        self.visit_property(property);
      }
    });

    this.visit_class_property(class_list, node.class_list);

    if(tags.self_closeing(node.name)){
      this.buffer_text('>');
    }else{
      this.buffer_text('>');
      this.buffer_text(node.text, true);
      this.visit_tags(node.nodes);

      if(!tags.inline(node.name) && this.options.pretty && Array.isArray(node.nodes) && node.nodes.length){
        this.buffer_text(this.indent_stack);
      }

      this.buffer_text('</' + node.name + '>');
    }
  },
  visit_property: function(node){
    if(node.boolean){
      this.visit_boolean_property(node);
    }else{
      this.visit_normal_property(node);
    }
  },
  visit_class_property: function(nodes, class_list){
    var self = this;

    var class_list = class_list || [];
    var nodes = nodes || [];

    if(class_list.length || nodes.length){
      this.buffer_text(' class="');
    }

    if(class_list.length){
      for(var i = 0; i < (class_list.length - 1); i++){
        this.visit_class(class_list[i]);
        this.buffer_text(' ');
      }

      this.visit_class(class_list[i]);
    }

    if(class_list.length && nodes.length){
      this.buffer_text(' ');
    }

    if(nodes.length){
      this.buffer_code_last('"+(', true);

      nodes.forEach(function(node){
        self.visit(node.val, true);
      });

      this.buffer_code_last(')+"', true);
    }

    if(class_list.length || nodes.length){
      this.buffer_text('"');
    }
  },
  visit_class: function(node){
    this.buffer_text((this.sid?this.sid+'-':'') + node.val);
  },
  visit_transform_property: function(node, tag_name){
    var transform_result;
    if(node.val && node.val.type === 'json_string'){
      transform_result = this.transform[node.name](node.val.val, tag_name, this.options);

      if(transform_result){
        this.buffer_text(node.name + '="' + transform_result + '"');
      }else{
        this.visit_property(node);
      }
    }else{
      this.visit_property(node);
    }
  },
  visit_id_property: function(node){
    if(node.val && node.val.type === 'json_string'){
      this.buffer_text('id=' + utils.stringify((this.sid?this.sid+'-':'') + (this.instance?this.instance+'-':'') + node.val.val));
    }else{
      this.visit_property(node);
    }
  },
  visit_boolean_property: function(node){
    this.buffer_text(node.name);
  },
  visit_normal_property: function(node){
    this.buffer_text(node.name + '="');
    this.buffer_code_last('"+', true);
    this.visit(node.val, true);
    this.buffer_code_last('+"', true);
    this.buffer_text('"');
  },
  visit_json_ident: function(node, inline){
    if(inline){
      this.buffer_code_last('__made_view.encode(' + node.val + ')', inline);
    }else{
      this.buffer_code_last(node.val, inline);
    }
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
    if(inline){
      this.buffer_code_last('__made_view.encode(' + node.ident.val, inline)
      this.visit_nodes(node.list, inline);
      this.buffer_code_last(')', inline);
    }else{
      this.buffer_code_last(node.ident.val, inline);
      this.visit_nodes(node.list, inline);
    }
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
    this.block[node.name] = true;

    this.buffer_code('__made_view.block(__made_block,' + utils.stringify(node.name) + ',function(){');
    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  },
  visit_extends: function(node){
    var self = this;
    var path_info = this.detect_path(node.id);

    if(!fs.existsSync(path_info.filename)){
      this.error('Extend components not exists: ' + node.id);
    }

    var str = fs.readFileSync(path_info.filename, 'utf-8');
    var ast = new Parser(str, path_info.filename).parse();

    var compiler = new Compiler(ast, extend({}, this.options, {
      filename: path_info.filename,
      instance: path_info.instance,
      indent: this.indent_stack,
      instance_through: true,
    }), this.transform);

    var code = compiler.compile();

    this.buffer_code('(function(__made_locals, __made_block){');
    this.buffer_code(code);

    if(this.options.dep){
      this.buffer_code(';__made_dep.push({');
      this.buffer_code('filename:' + utils.stringify(path_info.filename) + ',');
      this.buffer_code('instance:' + utils.stringify(path_info.instance) + ',');
      this.buffer_code('type:"extends",');
      this.buffer_code('entry:' + (node.entry ? "true" : "false") +',');
      this.buffer_code('options:__made_locals');
      this.buffer_code('});');
    }

    this.buffer_code('})({');

    var options_list = node.option || [];

    for(var i = 0; i < (options_list.length - 1); i++){
      this.visit_option(options_list[i]);
      this.buffer_code_last(',');
    }
    this.visit_option(options_list[i]);

    this.buffer_code('},{');

    this.visit_content(node.content, compiler.block, path_info.filename);
    this.buffer_code('});')
  },
  visit_option: function(node){
    if(!node) return;

    if(node.name in this.transform && node.val && node.val.type === 'json_string'){
      this.visit_transform_option(node);
    }else{
      this.visit_normal_option(node);
    }
  },
  visit_transform_option: function(node){
    var transform_result = this.transform[node.name](node.val.val, '__option', this.options);

    if(transform_result){
      node.val.val = transform_result;
    }

    this.visit_normal_option(node);

  },
  visit_normal_option: function(node){
    if(node){
      this.buffer_code_last(node.name + ':');
      this.visit(node.val);
    }
  },
  visit_content: function(content_list, block_list, filename){
    var self = this;
    var content_list  = content_list || [];
    var content_table = {};

    content_list.forEach(function(content){
      content_table[content.block] = content_table[content.block] || {before:[],replace:[],after:[]};
      content_table[content.block][content.type].push(content);
    });

    Object.keys(content_table).forEach(function(block){
      if(!(block in block_list)){
        self.error('There no Block "' + block + '" from extends file' + filename);
      }

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
      self.visit_tags(content.nodes);
    });
    this.buffer_code('}');
  },
  visit_include: function(node){
    var self = this;
    var path_info = this.detect_path(node.id);

    if(!fs.existsSync(path_info.filename)){
      this.error('Include components not exists: ' + node.id);
    }

    var str = fs.readFileSync(path_info.filename, 'utf-8');
    var ast = new Parser(str, path_info.filename).parse();

    var compiler = new Compiler(ast, extend({}, this.options, {
      filename: path_info.filename,
      instance: path_info.instance,
      indent: this.indent_stack,
      instance_through: true,
    }), this.transform);

    var code = compiler.compile();

    this.buffer_code('(function(__made_locals, __made_block){');
    this.buffer_code(code);

    if(this.options.dep){
      this.buffer_code(';__made_dep.push({');
      this.buffer_code('filename:' + utils.stringify(path_info.filename) + ',');
      this.buffer_code('instance:' + utils.stringify(path_info.instance) + ',');
      this.buffer_code('type:"include",');
      this.buffer_code('entry:' + (node.entry ? "true" : "false") +',');
      this.buffer_code('options:__made_locals');
      this.buffer_code('});');
    }

    this.buffer_code('})({');

    var options_list = node.option || [];

    for(var i = 0; i < (options_list.length - 1); i++){
      this.visit_option(options_list[i]);
      this.buffer_code_last(',');
    }
    this.visit_option(options_list[i]);

    this.buffer_code('},{});')
  },
  visit_comment: function(node){
    this.buffer_text(this.indent_stack + '<!--' + node.val + '-->');
  },
  visit_code: function(node){
    this.buffer_code(node.val);
  },
  visit_origin: function(node){
    this.buffer_text(this.indent_stack + '  ' + node.val);
  },
  visit_text: function(node){
    this.buffer_text(node.val);
  },
  visit_case: function(node){
    this.buffer_code('switch(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('}');
  },
  visit_when: function(node){
    this.buffer_code('case ' + node.expr + ':');
    this.visit_nodes(node.nodes);
    this.buffer_code('break;');
  },
  visit_default: function(node){
    this.buffer_code('default:');
    this.visit_nodes(node.nodes);
  },
  visit_if: function(node){
    this.buffer_code('if(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('}');
  },
  visit_else: function(node){
    this.buffer_code('else{');
    this.visit_nodes(node.nodes);
    this.buffer_code('}');
  },
  visit_elseif: function(node){
    this.buffer_code('else if(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('}');
  },
  visit_while: function(node){
    this.buffer_code('while(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('}');
  },
  visit_each: function(node){
    this.buffer_code('__made_view.each(' + node.data + ',function(' + node.value + (node.index?','+node.index : '') + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  },
  visit_custom_tag: function(node){
    if(node.text || (Array.isArray(node.nodes) && node.nodes.length)){
      this.visit_custom_tag_extend(node);
    }else{
      this.visit_custom_tag_include(node);
    }
  },
  visit_custom_tag_extend: function(node){
    var extend_node = {
      type: 'extends',
      option: node.option,
      entry: true,
      id: node.name,
      content:[]
    };

    var content_node = {
      type: 'replace',
      block: 'content',
      nodes: []
    };

    if(node.text){
      content_node.nodes.push({
        type: 'text',
        val: node.text
      });
    }

    if(Array.isArray(node.nodes) && node.nodes.length){
      content_node.nodes = content_node.nodes.concat(node.nodes);
    }

    extend_node.content.push(content_node);

    this.visit_extends(extend_node, true);
  },
  visit_custom_tag_include: function(node){
    var include_node = {
      type: 'include',
      option: node.option,
      entry: true,
      id: node.name
    };

    this.visit_include(include_node, true);
  }
};


module.exports = Compiler;