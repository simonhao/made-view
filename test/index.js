/*
 * 测试
 * @author: SimonHao
 * @date:   2015-09-09 09:27:55
 */

'use strict';

//var characterParser = require('character-parser');

//var state = characterParser.parseMax('foo="(", bar=}"}", console.log(qq); var a = 123;} bing bong');

//console.log(characterParser.parseUntil(",",','));

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
var Parser = require('../lib/parser.js');
var Compiler = require('../lib/compiler.js');
var filename = '/Users/IetnHao/Projects/Made-View/test/extends.jade';
var str      = fs.readFileSync(filename, 'utf-8');

var Made = require('../index.js');

/*var render = Made.compile(str, {
  filename: filename,
  basedir: '/Users/IetnHao/Projects/Made-View/test/',
  entry: 'view.jade',
  instance: 'top'
});

console.log(render());*/

var render = Made.compile_file(filename, {
  basedir: '/Users/IetnHao/Projects/Made-View/test/',
  entry: 'view.jade',
  instance: 'top'
});

console.log(render({
  title: [1,2,3]
}));

//var lexer = new Lexer(str, filename);
//var parser = new Parser(str, filename);
/*var compiler = new Compiler(str, {
  filename: filename,
  basedir: '/Users/IetnHao/Projects/Made-View/test/',
  entry: 'view.jade',
  instance: 'top'
});*/
//console.log(JSON.stringify(lexer.get_tokens()));
//console.log(JSON.stringify(parser.parse()));
//console.log(compiler.compile());
/*var a = 0;
while(a < 300){
  lexer.next();
  a++;
}

lexer.tokens.forEach(function(token){
  console.log(token);
});*/
