/**
 * Made-View 编译器
 * @author: SimonHao
 * @date:   2015-09-07 16:11:41
 */

'use strict';

var Parser   = require('./parser.js');
var utils    = require('./util.js');
var detect   = require('detect-es');
var add_with = require('made-with');
var runtime  = require('made-runtime');
var mid      = require('made-id');
var fs       = require('fs');
var extend   = require('extend');

/**
 * Made-View
 * @param {String} str     Made文本
 * @param {Object} options 编译设置
 * @param {String} options.filename 设置Made模块文件名
 * @param {String} options.basedir  设置Made模块ID查找的根目录
 * @param {String} options.entry    设置Made模块默认入口文件，默认值为：view.jade
 * @param {String} options.instance 设置Made模块的实例名，用于区分同一模块不同实例
 */
function Compiler(str, options, transform){

  this.options = extend({
    entry: 'view.jade',
    ext: '.jade',
    instance: ''
  }, options);

  this.filename  = this.options.filename;
  this.transform = transform || {};

  this.ast = new Parser(str, this.filename).parse();
  this.sid = mid.id(this.filename, this.options);

  this.buf = [];
  this.last_text_buf = [];
}

Compiler.prototype = {
  constructor: Compiler,
  /**
   * 编译
   * @return {String} 一个函数
   */
  compile: function(){
    this.visit(this.ast);

    var result = 'var made_buf = [];'
        + 'var made_block = made_block || {};'
        + 'var locals = locals || {}'
        + add_with('locals', this.buf.join('\n'), ['made_block', 'made_buf', 'made'])
        + 'return made_buf.join(\'\');';

    return result;
  },
  /**
   * 缓存文本
   * @param  {String}   str         文本片段
   * @param  {Boolean}  interpolate 该文本是否包含插入表达式
   */
  buffer_text: function(str, interpolate, escape){
    if(interpolate){
      this.interpolate(str, escape);
    }else{
      this.last_text_buf.push(escape ? runtime.escape(str) : str);
    }
  },
  /**
   * 缓存代码片段
   * @param  {String} exp 代码片段
   */
  buffer_code: function(exp){
    this.clear_text_buf();
    this.buf.push(exp);
  },
  /**
   * 缓存一个属性
   * @param  {String} attr 属性片段
   */
  buffer_attr: function(attr){
    if(attr.type === 'string'){
      this.buffer_text(attr.val, true, true)
    }else{
      this.buffer_code('made_buf.push(made.escape((' + attr.val + ')));');
    }
  },
  /**
   * 清除文本缓冲区
   */
  clear_text_buf: function(){
    var text;
    if(this.last_text_buf.length){
      text = this.last_text_buf.join('');
      text = utils.stringify(text);
      text = text.substr(1, text.length - 2);
      this.last_text_buf = [];

      if(text !== ''){
        this.buf.push('made_buf.push("' + text + '");');
      }
    }
  },
  /**
   * 获取属性值表达式
   * @param  {String} str 属性值字符串
   */
  get_options: function(opt){
    var val_buf = [];

    function interpolate(str){
      var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

      if(match){
        if(match[1]){
          val_buf.push(utils.stringify(str.substring(0, match.index) + match[2] + '{'));
          interpolate(match[3]);
        }else{
          val_buf.push(utils.stringify(str.substring(0, match.index)));

          var rest = match[3];
          var range = detect.bracket('{' + rest);
          val_buf.push('(' + range.src + ')');

          interpolate(rest.substring(range.len));
        }
      }else{
        val_buf.push(utils.stringify(str));
      }
    }

    if(opt.type === 'string'){
      interpolate(opt.val);
      return val_buf.join('+');
    }else{
      return opt.val;
    }
  },
  /**
   * 处理插入表达式
   * @param  {String} str 需要处理的字符串
   */
  interpolate: function(str, escape){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      if(escape){
        this.last_text_buf.push(runtime.escape(str.substring(0, match.index)));
      }else{
        this.last_text_buf.push(str.substring(0, match.index));
      }

      if(match[1]){ // escape
        if(escape){
          this.last_text_buf.push(runtime.escape(match[2] + '{'));
        }else{
          this.last_text_buf.push(match[2] + '{');
        }

        this.interpolate(match[3], escape);
      }else{
        var rest = match[3];
        var range = detect.bracket('{' + rest);
        var code = ('!' == match[2] ? '' : 'made.escape') + '(' + range.src + ')';

        this.buffer_code('made_buf.push(' + code + ')');
        this.interpolate(rest.substring(range.len), escape);
      }
    }else{
      this.last_text_buf.push(escape ? runtime.escape(str) : str);
    }
  },
  /**
   * 根据模块ID获取一个模块的路径，实例等信息
   * @param  {String} id 模块ID
   * @return {Object}    模块信息
   * @return {Object.filename} 模块路径
   * @return {Object.instance} 实例名
   */
  get_path: function(id){
    var match = id.match(/([^\:!]*)(?:\:([^\!]*))?(?:\!([^\:]*))?/);

    var module_id = match[1];
    var module_instance = match[2];
    var important_instance = match[3];

    var info = {
      filename: mid.path(module_id, this.options),
      instance: (important_instance !== undefined) ? important_instance : (this.sid + (this.options.instance ? '-' + this.options.instance : '') + (module_instance ? '-' + module_instance : ''))
    };

    return info;
  },
  visit: function(node){
    this['visit_' + node.type](node);
  },
  visit_nodes: function(nodes){
    var self = this;

    nodes.forEach(function(node){
      self.visit(node);
    });
  },
  visit_document: function(node){
    this.visit_nodes(node.nodes);
    this.clear_text_buf();
  },
  visit_doctype: function(node){
    this.buffer_text('<!DOCTYPE ' + node.val + '>');
  },
  visit_tag: function(node){
    var self = this;

    var class_buf = [];

    this.buffer_text('<' + node.name);

    node.attrs.forEach(function(attr){
      if(attr.name === 'class'){
        class_buf.push(attr);
      }else if(attr.name === 'id' && attr.type === 'string'){
        self.buffer_text(' id="');
        self.buffer_text(self.sid + (self.options.instance ? '-' + self.options.instance : '') + '-' + attr.val);
        self.buffer_text('"');
      }else if(attr.name in self.transform && attr.type === 'string'){
        self.buffer_text(' ' + attr.name + '="');
        self.buffer_text(self.transform[attr.name](attr.val, self.sid, self.options));
        self.buffer_text('"');
      }else{
        self.buffer_text(' ');
        self.visit_attr(attr);
      }
    });

    if(node['class'].length || class_buf.length){
      this.buffer_text(' class="');

      class_buf.forEach(function(class_attr){
        self.buffer_attr(class_attr);
      });

      if(class_buf.length && node['class'].length) self.buffer_text(' ');

      self.buffer_text(node['class'].map(function(class_str){
        return self.sid + '-' + class_str;
      }).join(' '));

      this.buffer_text('"');
    }

    if(node.self_closeing){
      this.buffer_text('>');
    }else{
      this.buffer_text('>');
      this.visit_nodes(node.nodes);
      this.buffer_text('</' + node.name + '>');
    }
  },
  visit_attr: function(attr){
    this.buffer_text(attr.name + '="');
    this.buffer_attr(attr);
    this.buffer_text('"');
  },
  visit_text: function(node){
    this.buffer_text(node.val, true, false);
  },
  visit_extends: function(node){
    var self = this;

    var module_info = this.get_path(node.id);

    var str = fs.readFileSync(module_info.filename, 'utf-8');

    var js = new Compiler(str, extend({}, this.options, {
      filename: module_info.filename,
      instance: module_info.instance
    }), self.transform).compile();

    this.buffer_code('made_buf.push((function(locals, made_block){' + js + '})({');

    var options_buf = [];
    node.options.forEach(function(option){
      options_buf.push(option.name +':(' + self.get_options(option) + ')');
    });
    this.buffer_code(options_buf.join(','));
    this.buffer_code('},{')
    this.visit_nodes(node.nodes);
    this.buffer_code('}));');
  },
  visit_include: function(node){
    var self = this;

    var module_info = this.get_path(node.id);

    var str = fs.readFileSync(module_info.filename, 'utf-8');

    var js = new Compiler(str, extend({}, this.options, {
      filename: module_info.filename,
      instance: module_info.instance
    }), self.transform).compile();

    this.buffer_code('made_buf.push((function(locals, made_block){' + js + '})({');

    var options_buf = [];
    node.options.forEach(function(option){
      options_buf.push(option.name + ':(' + self.get_options(option) + ')');
    });
    this.buffer_code(options_buf.join(','));
    this.buffer_code('}));');
  },
  visit_block: function(node){
    this.buffer_code('made_buf.push(made_block[\'' + node.name + '\'] || \'\');');
  },
  visit_replace: function(node){
    this.buffer_code(node.position + ':(function(){var made_buf = [];');
    this.visit_nodes(node.nodes);
    this.buffer_code('return made_buf.join(\'\');})(),');
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
    this.buffer_code('default :');
    this.visit_nodes(node.nodes);
  },
  visit_if: function(node){
    this.buffer_code('if(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('}')
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
    if(node.key){
      this.buffer_code('made.each(' + node.expr + ', function(' + node.val + ',' + node.key + '){');
    }else{
      this.buffer_code('made.each(' + node.expr + ', function(' + node.val + '){');
    }

    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  }
};

module.exports = Compiler;