/*
 * 测试
 * @author: SimonHao
 * @date:   2015-09-09 09:27:55
 */

'use strict';


var Lexer    = require('../lib/lexer.js');
var Parser   = require('../lib/parser.js');
var Compiler = require('../lib/compiler.js');

var filename = __dirname + '/extends.jade';
var fs       = require('fs');
var str      = fs.readFileSync(filename, 'utf-8');

var Made = require('../index.js');

var options = {
  filename: filename,
  basedir: __dirname,
  entry: 'view.jade',
  instance: 'index'
};

var render = Made.compile(str, options);

console.log(render({
  title: 'Test Page'
}));