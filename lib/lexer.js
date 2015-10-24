/**
 * Made-View 词法分析器
 * @author: SimonHao
 * @date:   2015-09-17 17:22:19
 */

'use strict';

var detect = require('detect-es');
var tags   = require('made-tags');

function Lexer(str, filename){

  this.input    = str.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n');
  this.filename = filename;

  this.indent_stack = [];
  this.indent_regex = null;

  this.line_number = 1;
  this.pipeless    = false;
  this.ended       = false;

  this.tokens = [];
}

Lexer.prototype = {
  constructor: Lexer,
  /**
   * 弹出错误
   * @param  {String} message 错误信息
   * @param  {String} code    错误代码
   */
  error: function(message, code){
    var err = new Error(message + ' on line ' + this.line_number + ' of ' + (this.filename || 'made'));

    err.code     = 'MADE:' + code;
    err.msg      = message;
    err.line     = this.line_number;
    err.filename = this.filename;

    throw err;
  },
  /**
   * 断言是否为正确地表达式
   * @param  {String} exp 表达式字符串
   */
  assert_expression: function(exp){
    try {
      Function('', 'return (' + exp + ')');
    } catch (ex) {
      this.error('Syntax Error:' + exp, 'SYNTAX_ERROR');
    }
  },
  /**
   * 断言是否为正确地字符插入
   * @param  {String} str 需要断言的字符串
   */
  assert_interpolate: function(str){
    var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);

    if(match){
      if(match[1]){
        this.assert_interpolate(match[3]);
      }else{
        var rest  = match[3];
        var range = detect.bracket('{' + rest);

        this.assert_expression(range.src)
        this.assert_interpolate(rest.substring(range.len));
      }
    }
  },
  /**
   * 返回一个 TOKEN
   * @param  {String} type TOKEN类型
   * @return {Object}      一个通用TOKEN
   */
  tok: function(type, val){
    return !!val ?
      {type: type, line: this.line_number, val: val} :
      {type: type, line: this.line_number};
  },
  /**
   * 去掉 input 开始的字符串
   * @param  {Number} len 要去掉的长度
   */
  consume: function(len){
    this.input = this.input.substring(len);
  },
  /**
   * 根据正则和类型，扫描input,并返回一个TOKEN
   * @param  {Regexp} regexp 要匹配的正则
   * @param  {String} type   TOKEN类型
   * @return {Object}        TOKEN
   */
  scan: function(regexp, type){
    var captures;

    if (captures = regexp.exec(this.input)) {
      this.consume(captures[0].length);
      return this.tok(type, captures[1]);
    }
  },
  doctype: function(){
    var tok = this.scan(/^doctype +([^\n]+)/, 'doctype');

    if(tok){
      this.tokens.push(tok);
      return true;
    }
  },
  tag: function(){
    var captures;
    var name, attribute, tok;

    if(captures = /^(\w(?:[-:\w]*\w)?)(\/?)/.exec(this.input)){
      name = captures[1];
      attribute = tags(name);

      tok = this.tok('tag', name);
      tok.self_closeing = !!captures[2] || attribute.self_closeing;
      tok.inline = attribute.inline;

      this.consume(captures[0].length);

      this.tokens.push(tok);

      return true;
    }
  },
  attrs: function(use_return){
    if('(' !== this.input.charAt(0)) return false;

    var attr_list = detect.bracket(this.input);

    this.consume(attr_list.len);

    var tok = this.tok('attrs');
    var str = attr_list.src;

    this.line_number += str.split('\n').length - 1;
    tok.attrs = [];

    while(str !== ''){
      var attr    = detect.comma(str);
      var key_val = detect.assignment(attr.src);

      if(key_val.key){
        tok.attrs.push({
          name: key_val.key,
          val: key_val.val
        });
      }

      str = str.substring(attr.len);
    }

    if ('/' == this.input.charAt(0)) {
      this.consume(1);
      tok.self_closeing = true;
    }

    if(use_return){
      return tok;
    }else{
      this.tokens.push(tok);
      return true;
    }
  },
  class: function(){
    var tok = this.scan(/^\.([\w-]+)/, 'class');
    if (tok) {
      this.tokens.push(tok);
      return true;
    }
  },
  text: function(use_return){
    var tok = this.scan(/^(?:\| ?| )([^\n]+)/, 'text') || this.scan(/^\|?( )/, 'text');

    if (tok) {
      this.assert_interpolate(tok.val);

      if(use_return){
        return tok;
      }else{
        this.tokens.push(tok);
        return true;
      }
    }
  },
  block: function(){
    var captures;
    var name, tok;

    if(captures = /^block +([^\n]+)/.exec(this.input)){
      name = captures[1].trim();

      if (!name) return;

      tok = this.tok('block', name);

      this.consume(captures[0].length);
      this.tokens.push(tok);

      return true;
    }
  },
  'extends': function(){
    var captures;
    var tok, options, id;

    if(captures = /^extends/.exec(this.input)){
      tok = this.tok('extends');
      this.consume(captures[0].length);

      options = this.attrs(true);

      if(options){
        tok.options = options.attrs;
      }

      id = this.text(true)

      if(!id){
        this.error('extends must hava a module_id', 'SYNTAX_ERROR');
      }

      tok.val = id.val
      this.tokens.push(tok);

      return true;
    }
  },
  include: function(){
    var captures;
    var tok, options, id;

    if(captures = /^include/.exec(this.input)){
      this.consume(captures[0].length);
      tok = this.tok('include');

      options = this.attrs(true);

      if(options){
        tok.options = options.attrs;
      }

      id = this.text(true)

      if(!id){
        this.error('include must hava a module_id', 'SYNTAX_ERROR');
      }

      tok.val = id.val
      this.tokens.push(tok);

      return true;
    }
  },
  replace: function(){
    var tok = this.scan(/^replace +([^\n]+)/, 'replace');

    if(tok){
      tok.val = tok.val.trim();
      this.tokens.push(tok);

      return true;
    }
  },
  'case': function(){
    var tok = this.scan(/^case +([^\n]+)/, 'case');
    if (tok) {
      this.assert_expression(tok.val);
      this.tokens.push(tok);
      return true;
    }
  },
  when: function(){
    var tok = this.scan(/^when +([^:\n]+)/, 'when');
    if (tok) {
      this.assert_expression(tok.val)
      this.tokens.push(tok);
      return true;
    }
  },
  'default': function(){
    var tok = this.scan(/^default */, 'default');
    if (tok) {
      this.tokens.push(tok);
      return true;
    }
  },
  each: function(){
    var captures;
    var tok;

    if (captures = /^(?:each) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? * in *([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      tok = this.tok('each', captures[1]);

      if(captures[2]) tok.key = captures[2];

      this.assert_expression(captures[3])
      tok.expr = captures[3];
      this.tokens.push(tok);

      return true;
    }
  },
  'while': function(){
    var tok = this.scan(/^while +([^\n]+)/, 'while');

    if(tok){
      this.assert_expression(tok.val);
      this.tokens.push(tok);

      return true;
    }
  },
  'if': function(){
    var tok = this.scan(/^if +([^:\n]+)/, 'if');
    if (tok) {
      this.assert_expression(tok.val);
      this.tokens.push(tok);
      return true;
    }
  },
  'else': function(){
    var captures;
    var tok;

    if(captures = /^else */.exec(this.input)){
      this.consume(captures[0].length);
      tok = this.tok('else');
      this.tokens.push(tok);

      return true;
    }
  },
  'elseif': function(){
    var tok = this.scan(/^else if +([^:\n]+)/, 'elseif');

    if(tok){
      this.assert_expression(tok.val);
      this.tokens.push(tok);
      return true;
    }
  },
  blank: function(){
    var captures;
    if (captures = /^\n *\n/.exec(this.input)) {
      this.consume(captures[0].length - 1);
      this.line_number++;

      if(this.pipeless) this.tokens.push(this.tok('text', ''));

      return true;
    }
  },
  eos: function(){
    if (this.input.length) return;

    for (var i = 0; i < this.indent_stack.length; i++) {
      this.tokens.push(this.tok('outdent'));
    }

    this.indent_stack = [];
    this.tokens.push(this.tok('eos'));
    this.ended = true;

    return true;
  },
  indent: function(){
    var captures, indent_regex;
    var tok, indents;

    if(this.indent_regex){
      captures = this.indent_regex.exec(this.input);
    }else{
      indent_regex = /^\n(\t*) */;
      captures     = indent_regex.exec(this.input);

      if(captures && !captures[1].length){
        indent_regex = /^\n( *)/;
        captures     = indent_regex.exec(this.input);
      }

      if (captures && captures[1].length){
        this.indent_regex = indent_regex;
      }
    }

    if(captures){
      indents = captures[1].length;
      this.line_number++;
      this.consume(indents + 1);

      if(' ' == this.input[0] || '\t' == this.input[0]){
        this.error('Invalid indentation, you can use tabs or spaces but not both', 'INVALID_INDENTATION');
      }

      // blank line
      if('\n' == this.input[0]){
        this.pipeless = false;
        return this.tok('newline');
      }

      // outdent
      if(this.indent_stack.length && indents < this.indent_stack[0]){
        while(this.indent_stack.length && this.indent_stack[0] > indents){
          this.tokens.push(this.tok('outdent'));
          this.indent_stack.shift();
        }
      // indent
      }else if(indents && indents != this.indent_stack[0]){
        this.indent_stack.unshift(indents);
        this.tokens.push(this.tok('indent', indents));
      // newline
      } else {
        this.tokens.push(this.tok('newline'));
      }

      this.pipeless = false;
      return true;
    }
  },
  code: function(){

  },
  dot: function(){

  },
  comment: function(){

  },
  next: function(){
    return this.doctype()
      || this.block()
      || this['extends']()
      || this.include()
      || this.replace()
      || this['case']()
      || this.when()
      || this['default']()
      || this.each()
      || this['while']()
      || this['if']()
      || this.elseif()
      || this['else']()
      || this.tag()
      || this.attrs()
      || this.class()
      || this.text()
      || this.blank()
      || this.eos()
      || this.indent()
      || this.code()
      || this.dot()
      || this.comment()
  },
  get_tokens: function(){
    while(!this.ended){
      this.next();
    }

    return this.tokens;
  }
};

module.exports = Lexer;








