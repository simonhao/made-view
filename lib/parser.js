/**
 * Made-View 解析器
 * @author: SimonHao
 * @date:   2015-09-07 16:11:23
 */

'use strict';

var Lexer       = require('./lexer.js');
var TokenStream = require('token-stream');

function Parser(str, filename){
  this.tokens = new TokenStream(new Lexer(str, filename).get_tokens());
  this.filename = filename;
}

Parser.prototype = {
  constructor: Parser,
  /**
   * 弹出一个错误
   */
  error: function (message, code, token) {
    var err = new Error(message + ' on line ' + token.line + ' of ' + token.filename);

    err.code = 'JADE:' + code;
    err.msg = message;
    err.line = token.line;
    err.filename = this.filename;
    throw err;
  },
  /**
   * 前进到下一个TOKEN，并从当前Stream中去掉该TOKEN
   */
  advance: function(){
    return this.tokens.advance();
  },
  /**
   * 查看下一个TOKEN
   */
  peek: function() {
    return this.tokens.peek();
  },
  /**
   * 规定下一个TOKEN类别，如果符合就从Stream中去掉该TOKEN
   * @param  {String} type Token 类型
   */
  expect: function(type){
    if (this.peek().type === type) {
      return this.advance();
    } else {
      this.error('expected "' + type + '", but got "' + this.peek().type + '"', 'INVALID_TOKEN', this.peek());
    }
  },
  parse: function(){
    this.ast = {
      type: 'document',
      nodes: [],
      line: 0,
      filename: this.filename
    };

    while('eos' != this.peek().type){
      if('newline' == this.peek().type){
        this.advance();
      }else{
        this.ast.nodes.push(this.parse_expr());
      }
    }

    return this.ast;
  },
  parse_expr: function(){
    var type = this.peek().type;

    if('parse_' + type in this){
      return this['parse_' + type]();
    }else{
      this.error('unexpected token "' + this.peek().type + '"', 'INVALID_TOKEN', this.peek());
    }
  },
  parse_doctype: function(){
    var tok = this.expect('doctype');

    return {
      type: 'doctype',
      val: tok.val,
      line: tok.line,
    };
  },
  parse_block: function(){
    var tok = this.expect('block');

    return {
      type: 'block',
      name: tok.val,
      line: tok.line
    };
  },
  parse_extends: function(){
    var tok = this.expect('extends');

    this.expect('newline');

    var extends_node = {
      type: 'extends',
      options: tok.options || [],
      id: tok.val,
      line: tok.line,
      nodes: []
    };

    while(this.peek().type === 'replace'){
      extends_node.nodes.push(this.parse_replace());
    }

    return extends_node;
  },
  parse_extends_block: function(model){
    var tok = this.expect(model);

    var extend_block = {
      type: model,
      position: tok.val,
      line: tok.line,
      nodes: []
    };

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          extend_block.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return extend_block;
  },
  parse_replace: function(){
    return this.parse_extends_block('replace');
  },
  parse_include: function(){
    var tok = this.expect('include');

    return {
      type: 'include',
      options: tok.options || [],
      line: tok.line,
      id: tok.val
    };
  },
  parse_case: function(){
    var tok = this.expect('case');

    var case_node = {
      type: 'case',
      expr: tok.val,
      line: tok.line,
      nodes: []
    };

    this.expect('indent');

    while ('outdent' != this.peek().type) {
      switch (this.peek().type) {
        case 'comment':
        case 'newline':
          this.advance();
          break;
        case 'when':
          case_node.nodes.push(this.parse_when());
          break;
        case 'default':
          case_node.nodes.push(this.parse_default());
          break;
        default:
          this.error('Unexpected token "' + this.peek().type + '", expected "when", "default" or "newline"', 'INVALID_TOKEN', this.peek());
      }
    }

    this.expect('outdent');

    return case_node;
  },
  parse_when: function(){
    var tok = this.expect('when');

    var when_node = {
      type: 'when',
      expr: tok.val,
      line: tok.line,
      nodes: []
    };

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          when_node.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return when_node;
  },
  parse_default: function(){
    var tok = this.expect('default');

    var default_node = {
      type: 'default',
      line: tok.line,
      nodes: []
    };

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          default_node.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return default_node;
  },
  parse_condition: function(type){
    var tok = this.expect(type);

    var condition_node = {
      type: type,
      expr: tok.val,
      line: tok.line,
      nodes: []
    };

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          condition_node.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return condition_node;
  },
  parse_if: function(){
    return this.parse_condition('if');
  },
  parse_else: function(){
    return this.parse_condition('else');
  },
  parse_elseif: function(){
    return this.parse_condition('elseif');
  },
  parse_while: function(){
    return this.parse_condition('while');
  },
  parse_each: function(){
    var tok = this.expect('each');

    var each_node = {
      type: 'each',
      key: tok.key,
      val: tok.val,
      line: tok.line,
      expr: tok.expr,
      nodes: []
    };

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          each_node.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return each_node;
  },
  parse_text: function(){
    var tok = this.expect('text');

    return {
      type: 'text',
      val: tok.val,
      line: tok.line
    };
  },
  parse_tag: function(){
    var tok = this.advance();

    var tag = {
      type: 'tag',
      name: tok.val,
      self_closing: tok.self_closing,
      nodes: [],
      attrs: [],
      'class': [],
      line: tok.line,
    };

    out:
    while(true){
      switch(this.peek().type){
        case 'class':
          var tok = this.advance();

          tag['class'].push(tok.val)
          continue;
        case 'attrs':
          var tok = this.advance();

          if(tok.self_closing) tag.self_closing = tok.self_closing;

          tag.attrs = tag.attrs.concat(tok.attrs);
          continue;
        default:
          break out;
      }
    }

    switch(this.peek().type){
      case 'text':
        var tok = this.advance();

        tag.nodes.push({
          type: 'text',
          val: tok.val,
          line: tok.line
        });

        break;
      case 'newline':
      case 'indent':
      case 'outdent':
      case 'eos':
        break;
      default:
        this.error('Unexpected token `' + this.peek().type + '` expected `text`, `code`, `:`, `newline` or `eos`', 'INVALID_TOKEN', this.peek())
    }

    while('newline' === this.peek().type) this.advance();

    if('indent' === this.peek().type){
      this.expect('indent');

      while('outdent' !== this.peek().type){
        if('newline' === this.peek().type){
          this.advance();
        }else{
          tag.nodes.push(this.parse_expr());
        }
      }

      this.expect('outdent');
    }

    return tag;
  }
};

module.exports = Parser;

















