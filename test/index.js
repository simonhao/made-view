/*
 * 测试
 * @author: SimonHao
 * @date:   2015-09-09 09:27:55
 */

'use strict';

/*var characterParser = require('character-parser');

//var state = characterParser.parseMax('foo="(", bar=}"}", console.log(qq); var a = 123;} bing bong');

var state = characterParser.parseChar('t')
console.log(state.isString());*/

/*var fs        = require('fs');
var JadeLexer = require('jade-lexer').Lexer;

var filename = '/Users/IetnHao/Projects/MJade/test/layout.jade';
var str      = fs.readFileSync(filename, 'utf-8');

var tokens = new JadeLexer(str, filename);
var len = 0;
while(len < 100){
  tokens.advance();
  console.log(tokens.tokens[tokens.tokens.length - 1]);
  len++;
}*/

var fs = require('fs');
var Lexer = require('../lib/lexer.js');
var filename = '/Users/IetnHao/Projects/Made/test/layout.jade';
var str      = fs.readFileSync(filename, 'utf-8');

var JadeLexer = require('jade-lexer').Lexer;

var lexer = new Lexer(str, filename);

var a = 0;

while(a < 100){
  lexer.next();
  a++;
}

lexer.tokens.forEach(function(token){
  console.log(token);
});
