/**
 * Made-View 编译器
 * @author: SimonHao
 * @date:   2015-09-07 16:11:41
 */

'use strict';

var Parser = require('./parser.js');
var characterParser = require('character-parser');
var fs = require('fs');
var addWith = require('with');

function Compiler(str, filename){
  this.ast = new Parser(str, filename).parse();
  this.filename = filename;

  this.buf = [];
  this.last_text_buf = [];
}

Compiler.prototype = {
  constructor: Compiler,
  compile: function(){
    this.visit(this.ast);

    var result = 'function(locals, made_block){'
        + 'var made_buf = [];'
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
  buffer: function(str_expr, pure_str, interpolate){
    var state;

    if(pure_str){
      if(interpolate){
        this.interpolate(str_expr);
      }else{
        this.last_text_buf.push(str_expr);
      }
    }else{
      state = characterParser.parse(str_expr);
      if(state.isString()){
        if(interpolate){
          this.interpolate(str_expr);
        }else{
          this.last_text_buf.push(str_expr);
        }
      }else{
        this.buf.push('made_buf.push(\'' + this.last_text_buf.join('') + '\');');
        this.last_text_buf = [];
        this.buf.push('made_buf.push(' + str_expr + ');');
      }
    }
  },
  interpolate: function(str){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      this.last_text_buf.push(str.substring(0, match.index));

      if(match[1]){ // escape
        this.last_text_buf.push(match[2] + '{' + match[3]);
      }else{
        this.buf.push('made_buf.push(\'' + this.last_text_buf.join('') + '\');');
        this.last_text_buf = [];

        var rest = match[3];
        var range = characterParser.parseMax(rest);
        var code = ('!' == match[2] ? '' : 'made.escape') + '(' + range.src + ')';

        this.buf.push('made_buf.push(' + code + ')');
        this.buffer(rest.substring(range.end), true, true);
      }
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

    if(this.ast.extend){
      this.buf.push('}));');
    }
  },
  visit_doctype: function(node){
    this.buffer('<!DOCTYPE ' + node.val + '>', true);
  },
  visit_tag: function(node){
    var self = this;

    this.buffer('<' + node.name, true);

    var class_buf = [];

    node.attrs.forEach(function(attr){
      if(attr.name === 'class'){
        class_buf.push(attr);
      }else{
        self.buffer(' ', true);
        self.visit_attr(attr);
      }
    });

    this.buffer('>', true);
    this.visit_nodes(node.nodes);
    this.buffer('</' + node.name + '>', true);
  },
  visit_attr: function(attr){
    /*var state = characterParser.parse(attr.val);*/
    this.buffer(attr.name + '=' + attr.val, true);

    /*if(true){
      this.buffer(attr.val, true, true);
    }else{
      this.buf.push('jade_buf.push(\'' + this.last_text_buf.join('') + '\');');
      this.last_text_buf = [];
      if(attr.escaped){
        this.buf.push('jade_buf.push(jade.escape(' + attr.val + '));')
      }else{
        this.buf.push('jade_buf.push(' + attr.val + ');')
      }
    }*/
  },
  visit_text: function(node){
    this.buffer(node.val, true, true);
  },
  visit_extends: function(node){
    var filename = node.id;
    var str = fs.readFileSync(filename, 'utf-8');
    var js = new Compiler(str, filename).compile();

    this.buf.push('made_buf.push((' + js + ')({');

    var options_buf = [];
    node.options.forEach(function(option){
      options_buf.push(option.name +':' + option.val);
    });
    this.buf.push(options_buf.join(','));
    this.buf.push('},{');
  },
  visit_block: function(node){
    this.buf.push('made_buf.push(made_block[\'' + node.name + '\'] || \'\');');
  },
  visit_replace: function(node){
    this.buf.push(node.position + ':(function(){var made_buf = []; return made_buf.join(\'\');})(),');
  },
  visit_case: function(node){
    this.buf.push('switch(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buf.push('}');
  },
  visit_when: function(node){
    this.buf.push('case ' + node.expr + ':');
    this.visit_nodes(node.nodes);
    this.buf.push('break;');
  },
  visit_default: function(node){
    this.buf.push('default :');
    this.visit_nodes(node.nodes);
  },
  visit_if: function(node){
    this.buf.push('if(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buf.push('}')
  },
  visit_else: function(node){
    this.buf.push('else{');
    this.visit_nodes(node.nodes);
    this.buf.push('}');
  },
  visit_elseif: function(node){
    this.buf.push('else if(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buf.push('}');
  },
  visit_while: function(node){
    this.buf.push('while(' + node.expr + '){');
    this.visit_nodes(node.nodes);
    this.buf.push('}');
  },
  visit_each: function(node){
    this.buf.push('jade.each(' + node.expr + ', function(' + node.key + ',' + node.val + '){');
    this.visit_nodes(node.nodes);
    this.buf.push('});');
  }
};

module.exports = Compiler;