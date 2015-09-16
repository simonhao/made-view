/**
 * Made 词法分析器
 * @author: SimonHao
 * @date:   2015-09-07 16:11:09
 */

'use strict';

var assert          = require('assert');
var characterParser = require('character-parser');

function Lexer(str, filename){

  this.input    = str.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n');
  this.filename = filename;

  this.indent_stack = [];
  this.indent_regex = null;

  this.line_number  = 1;
  this.pipeless     = false;

  this.tokens = [];
}

Lexer.prototype = {
  constructor: Lexer,
  /**
   * 弹出一个错误
   */
  error: function(message, code){
    var err = new Error(message + ' on line ' + this.line_number + ' of ' + (this.filename || 'jade'));

    err.code     = 'JADE:' + code;
    err.msg      = message;
    err.line     = this.line_number;
    err.filename = this.filename;

    throw err;
  },
  /**
   * 返回一个TOKEN
   */
  tok: function(type, val){
    return !!val ?
      {type: type, line: this.line_number, val: val} :
      {type: type, line: this.line_number};
  },
  /**
   * 从文本从去掉指定长度
   */
  consume: function(len){
    this.input = this.input.substr(len);
  },
  /**
   * 根据指定正则及类型扫描一个TOKEN
   */
  scan: function(regexp, type){
    var captures;

    if (captures = regexp.exec(this.input)) {
      this.consume(captures[0].length);
      return this.tok(type, captures[1]);
    }
  },
  /**
   * 寻找表达式
   */
  bracket_expression: function(skip){
    var skip  = skip || 0;
    var start = this.input[skip];

    assert(start === '(' || start === '{' || start === '[', 'The start character should be "(", "{" or "["');

    var end   = ({'(': ')', '{': '}', '[': ']'})[start];
    var range;

    try {
      range = characterParser.parseMax(this.input, {start: skip + 1});
    } catch (error) {
      this.error(error.message, 'BRACKET_MISMATCH');
    }

    this.assert(this.input[range.end] === end, 'start character "' + start + '" should match end character "' + this.input[range.end] + '"');

    return range;
  },
  assert: function (value, message) {
    if (!value) this.error(message, 'ASSERT_FAILED');
  },
  /**
   * 判断是否是表达式
   */
  assert_expression: function(exp){
    try {
      Function('', 'return (' + exp + ')');
    } catch (ex) {
      this.error('Syntax Error', 'SYNTAX_ERROR');
    }
  },
  /**
   * 判断嵌套是否正确
   */
  assert_nesting_correct: function(exp){
    var res = characterParser(exp)

    if (res.isNesting()) {
      this.error('Nesting must match on expression `' + exp + '`', 'INCORRECT_NESTING')
    }
  },
  /**
   * 处理空行
   */
  blank: function(){
    var captures;

    if (captures = /^\n *\n/.exec(this.input)) {
      this.consume(captures[0].length - 1);
      this.line_number++;
    }
  },
  /**
   * 处理文本结尾
   */
  eos: function(){
    var self = this;
    if(this.input.length) return;

    this.indent_stack.forEach(function(){
      self.tokens.push(self.tok('outdent'));
    });

    this.tokens.push(this.tok('eos'));

    return true;
  },
  /**
   * 处理DOCTYPE
   */
  doctype: function(){
    var tok = this.scan(/^doctype +([^\n]+)/, 'doctype');

    if(tok){
      this.tokens.push(tok);
      return true;
    }
  },
  /**
   * 处理插入表达式
   */
  interpolation: function(){
    var match;
    if(/^#\{/.test(this.input)){
      match = this.bracket_expression(1);

      this.consume(match.end + 1);
      this.tokens.push(this.tok('interpolation', match.src));

      return true;
    }
  },
  'case': function(){
    var tok = this.scan(/^case +([^\n]+)/, 'case');

    if(tok){
      this.tokens.push(tok);
      return true;
    }
  },
  when: function(){
    var tok = this.scan(/^when +([^\n]+)/, 'when');
    if(tok){
      this.tokens.push(tok);
      return true;
    }
  },
  'default': function(){
    var tok = this.scan(/^default */, 'default');

    if(tok){
      this.tokens.push(tok);
      return true;
    }
  },
  'extends': function(){
    var tok = this.scan(/^(extends?)/, 'extends');

    if(tok){
      this.tokens.push(tok);
      return true
    }
  },
  replace: function(){

  },
  append: function(){
    var captures;
    var mode, name, tok;

    if(captures = /^append +([^\n]+)/.exec(this.input)){
      mode = 'append';
      name = captures[1].trim();

      if(!name) return;

      tok = this.tok('block', name);
      tok.model = mode;

      this.consume(captures[0].length);
      this.tokens.push(tok);

      return true;
    }
  },
  prepend: function(){
    var captures;
    var mode, name, tok;

    if(captures = /^prepend +([^\n]+)/.exec(this.input)){
      mode = 'prepend';
      name = captures[1].trim();

      if(!name) return;

      tok = this.tok('block', name);
      tok.model = mode;

      this.consume(captures[0].length);
      this.tokens.push(tok);

      return true;
    }
  },
  block: function(){
    var captures;
    var mode, name, tok;

    if (captures = /^block\b *(?:(prepend|append) +)?([^\n]+)/.exec(this.input)) {
      mode = captures[1] || 'replace';
      name = captures[2].trim();

      if (!name) return;

      tok = this.tok('block', name);
      tok.mode = mode;

      this.consume(captures[0].length);
      this.tokens.push(tok);

      return true;
    }
  },
  include: function(){
    var tok = this.scan(/^(include?)/, 'include');

    if(tok){
      this.tokens.push(tok);
      return true
    }
  },
  conditional: function(){
    var captures;
    var type, expression, tok;

    if(captures = /^(if|unless|else if|else)\b([^\n]*)/.exec(this.input)){
      type       = captures[1];
      expression = captures[2];

      tok = this.tok(type, expression);
      this.consume(captures[0].length);

      this.tokens.push(tok);
      return true;
    }
  },
  each: function(){
    var captures;
    var key, val, expression, tok;

    if(captures = /^(?:- *)?(?:each) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? * in *([^\n]+)/.exec(this.input)){
      key = captures[2];
      val = captures[1];
      expression = captures[3];

      tok = this.tok('each', val);
      tok.key = key;
      this.assert_expression(expression)
      tok.expression = expression;

      this.consume(captures[0].length);
      this.tokens.push(tok);

      return true;
    }
  },
  'while': function(){
    var captures;
    var expression, tok;

    if(captures = /^while +([^\n]+)/.exec(this.input)){
      expression = captures[1];

      this.assert_expression(expression)

      tok = this.tok('while', expression);
      this.consume(captures[0].length);

      this.tokens.push(tok);
      return true;
    }
  },
  tag: function(){
    var captures;
    var name, self_closeing, tok;

    if(captures = /^(\w(?:[-:\w]*\w)?)(\/?)/.exec(this.input)){
      name = captures[1];
      self_closeing = !!captures[2];

      tok = this.tok('tag', name);
      tok.self_closeing = self_closeing;
      this.consume(captures[0].length);

      this.tokens.push(tok);

      return tok;
    }
  },
  block_code: function(){
    var captures;

    if(captures = /^-\n/.exec(this.input)){
      this.consume(1);
      this.tokens.push(this.tok('blockcode'));
      this.pipeless = true;
      return true;
    }
  },
  code: function(){
  },
  id: function(){
    var tok = this.scan(/^#([\w-]+)/, 'id');
    if (tok) {
      this.tokens.push(tok);
      return true;
    }
  },
  class_name: function(){
    var tok = this.scan(/^\.([\w-]+)/, 'class');
    if (tok) {
      this.tokens.push(tok);
      return true;
    }
  },
  attrs: function(){
    if('(' !== this.input.charAt(0)) return false;

    var index = this.bracket_expression().end,
        str = this.input.substring(1, index),
        tok = this.tok('attrs');

    this.assert_nesting_correct(str);

    this.consume(index + 1);
    tok.attrs = [];

    var quote = '';
    var self = this;
    var interpolatable = '';

    var interpolate = function (attr) {
      return attr.replace(/(\\)?#\{(.+)/g, function(_, escape, expr){
        if (escape) return _;
        var range = characterParser.parseMax(expr);
        if (expr[range.end] !== '}') return _.substr(0, 2) + interpolate(_.substr(2));
        self.assert_expression(range.src);
        return quote + " + (" + range.src + ") + " + quote + interpolate(expr.substr(range.end + 1));
      });
    }

    var escaped = true,
        key = '',
        val = '',
        loc = 'key';
    var state = characterParser.defaultState();

    var is_attr_end = function(i){
      if (key.trim() === '') return false;
      if (i === str.length) return true;
      if (loc === 'key') {
        if (str[i] === ' ' || str[i] === '\n') {
          for (var x = i; x < str.length; x++) {
            if (str[x] != ' ' && str[x] != '\n') {
              if (str[x] === '=' || str[x] === '!' || str[x] === ',') return false;
              else return true;
            }
          }
        }
        return str[i] === ','
      } else if (loc === 'value' && !state.isNesting()) {
        try {
          self.assert_expression(val);
          if (str[i] === ' ' || str[i] === '\n') {
            for (var x = i; x < str.length; x++) {
              if (str[x] != ' ' && str[x] != '\n') {
                if (characterParser.isPunctuator(str[x]) && str[x] != '"' && str[x] != "'") return false;
                else return true;
              }
            }
          }
          return str[i] === ',';
        } catch (ex) {
          return false;
        }
      }
    };

    this.line_number = str.split('\n').length - 1;

    for(var i = 0; i <= str.length; i++){
      if(is_attr_end(i)){
        val = val.trim();
        if(!!val) this.assert_expression(val);

        key = key.trim().replace(/^['"]|['"]$/g, '');
        tok.attrs.push({
          name: key,
          val: '' === val ? true : val,
          escaped: escaped
        });

        key = val = '';
        loc = 'key';
        escaped = true;
      }else{
        switch(loc){
          case 'key':
            if(str[i] === '!' || str[i] === '='){
              escaped = str[i] !== '!';
              if(str[i] === '!') i++;
              if(str[i] !== '=') this.error('Unexpected character ' + str[i] + ' expected `=`', 'INVALID_KEY_CHARACTER');
              loc = 'value';
              state = characterParser.defaultState();
            }else{
              key += str[i];
            }
            break;
          case 'value':
            state = characterParser.parseChar(str[i], state);
            if (state.isString()) {
              loc = 'string';
              quote = str[i];
              interpolatable = str[i];
            } else {
              val += str[i];
            }
            break;
          case 'string':
            state = characterParser.parseChar(str[i], state);
            interpolatable += str[i];

            if (!state.isString()) {
              loc = 'value';
              val += interpolate(interpolatable);
            }
            break;
        }
      }
    }

    if ('/' == this.input.charAt(0)) {
      this.consume(1);
      tok.selfClosing = true;
    }

    this.tokens.push(tok);
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

      if (' ' == this.input[0] || '\t' == this.input[0]) {
        this.error('Invalid indentation, you can use tabs or spaces but not both', 'INVALID_INDENTATION');
      }

      // blank line
      if ('\n' == this.input[0]) {
        this.pipeless = false;
        return this.tok('newline');
      }

      // outdent
      if (this.indent_stack.length && indents < this.indent_stack[0]) {
        while (this.indent_stack.length && this.indent_stack[0] > indents) {
          this.tokens.push(this.tok('outdent'));
          this.indent_stack.shift();
        }
      // indent
      } else if (indents && indents != this.indent_stack[0]) {
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
  text: function(){
    var self = this;
    var interpolate = function (attr) {
      return attr.replace(/(\\)?#\{(.+)/g, function(_, escape, expr){
        if (escape) return _;
        var range = characterParser.parseMax(expr);
        if (expr[range.end] !== '}') return _.substr(0, 2) + interpolate(_.substr(2));
        self.assert_expression(range.src);
        return "' + (" + range.src + ") + '" + interpolate(expr.substr(range.end + 1));
      });
    };

    var tok = this.scan(/^(?:\| ?| )([^\n]+)/, 'text') || this.scan(/^\|?( )/, 'text');
    if (tok) {
      tok.val = "'" + interpolate(tok.val) + "'";
      this.tokens.push(tok);
      return true;
    }
  },
  comment: function(){

  },
  dot: function(){

  },
  fail: function(){
  },
  /**
   * 前进到下一个Token
   */
  next: function(){
    return this.blank()
      || this.eos()
      || this.doctype()
      || this['case']()
      || this.when()
      || this['default']()
      || this['extends']()
      || this.replace()
      || this.append()
      || this.prepend()
      || this.block()
      || this.include()
      || this.conditional()
      || this.each()
      || this['while']()
      || this.tag()
      || this.code()
      || this.class_name()
      || this.attrs()
      || this.indent()
      || this.text()
      || this.comment()
      || this.dot()
      || this.fail()
  },
  get_tokens: function(){
    while (!this.ended) {
      this.next();
    }

    return this.tokens;
  }
};

module.exports = Lexer;