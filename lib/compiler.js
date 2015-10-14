/**
 * Made-View 编译器
 * @author: SimonHao
 * @date:   2015-09-07 16:11:41
 */

'use strict';

var Parser          = require('./parser.js');
var characterParser = require('character-parser');
var fs              = require('fs');
var addWith         = require('with');
var mid             = require('made-id');

function Compiler(str, options){
  this.options = options || {};
  this.filename = this.options.filename;

  this.ast = new Parser(str, this.filename).parse();

  this.buf = [];
  this.last_text_buf = [];
}

Compiler.prototype = {
  constructor: Compiler,
  compile: function(){
    this.visit(this.ast);

    var result = 'function(locals, made_block){'
        + 'var made_buf = [];'
        + 'var made_block = made_block || {};'
        + addWith('locals || {}', this.buf.join('\n'), ['made_block', 'made_buf', 'made'])
        + 'return made_buf.join(\'\');'
        + '}';

    return result;
  },
  /**
   * 增加模板片段
   * @param  {String} str_expr 模板片段
   * @return {[type]}          [description]
   */
  buffer: function(str, interpolate){
    if(interpolate){
      this.interpolate(str);
    }else{
      this.last_text_buf.push(str);
    }
  },
  buffer_code: function(exp){
    this.clear_text_buf();
    this.buf.push(exp);
  },
  clear_text_buf: function(){
    if(this.last_text_buf.length){
      this.buf.push('made_buf.push(\'' + this.last_text_buf.join('') + '\');');
      this.last_text_buf = [];
    }
  },
  interpolate: function(str){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      this.last_text_buf.push(str.substring(0, match.index));

      if(match[1]){ // escape
        this.last_text_buf.push(match[2] + '{');
        this.interpolate(match[3]);
      }else{
        this.clear_text_buf();

        var rest = match[3];
        var range = characterParser.parseMax(rest);
        var code = ('!' == match[2] ? '' : 'made.escape') + '(' + range.src + ')';

        this.buf.push('made_buf.push(' + code + ')');
        this.interpolate(rest.substring(range.end + 1));
      }
    }else{
      this.last_text_buf.push(str);
    }
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
    this.buffer('<!DOCTYPE ' + node.val + '>');
  },
  visit_tag: function(node){
    var self = this;

    var class_buf = [];

    this.buffer('<' + node.name);

    node.attrs.forEach(function(attr){
      if(attr.name === 'class'){
        class_buf.push(attr);
      }else{
        self.buffer(' ');
        self.visit_attr(attr);
      }
    });

    if(node.self_closeing){
      this.buffer('>');
    }else{
      this.buffer('>');
      this.visit_nodes(node.nodes);
      this.buffer('</' + node.name + '>');
    }
  },
  visit_attr: function(attr){
    this.buffer(attr.name + '=');
    this.buffer(attr.val, true);
  },
  visit_text: function(node){
    this.buffer(node.val, true);
  },
  visit_extends: function(node){
    var filename = mid.path(node.id, {
      basedir: this.options.basedir,
      entry: this.options.entry,
      filename: this.filename,
      ext: '.jade'
    });

    var str = fs.readFileSync(filename, 'utf-8');
    var js = new Compiler(str, filename).compile();

    this.buffer_code('made_buf.push((' + js + ')({');

    var options_buf = [];
    node.options.forEach(function(option){
      options_buf.push(option.name +':(' + option.val + ')');
    });
    this.buffer_code(options_buf.join(','));
    this.buffer_code('},{')
    this.visit_nodes(node.nodes);
    this.buffer_code('}));');
  },
  visit_include: function(node){
    var filename = mid.path(node.id, {
      basedir: this.options.basedir,
      entry: this.options.entry,
      filename: this.filename,
      ext: '.jade'
    });

    var str = fs.readFileSync(filename, 'utf-8');
    var js = new Compiler(str, filename).compile();

    this.buffer_code('made_buf.push((' + js + ')({');

    var options_buf = [];
    node.options.forEach(function(option){
      options_buf.push(option.name + ':(' + option.val + ')');
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
    this.buffer_code('jade.each(' + node.expr + ', function(' + node.key + ',' + node.val + '){');
    this.visit_nodes(node.nodes);
    this.buffer_code('});');
  }
};

module.exports = Compiler;