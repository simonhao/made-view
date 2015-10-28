/*
 * 测试
 * @author: SimonHao
 * @date:   2015-09-09 09:27:55
 */

'use strict';


var Lexer    = require('../lib/lexer.js');
var Parser   = require('../lib/parser.js');
var Compiler = require('../lib/compiler.js');

var test_file = ['list.jade', 'extends.jade', 'special.jade'];

var Made = require('../index.js');

var options = {
  basedir: __dirname,
  entry: 'view.jade',
  instance: 'index'
};

var transform = {
  src: function(val, sid, options){
    return 'transform' + sid + val;
  }
};

test_file.forEach(function(file){
  var filename = __dirname + '/' + file;
  var render = Made.compile_file(filename, options, transform);

  console.log(render({
    title: '<><>"""&&&Test Page'
  }));
  console.log('----------------')
});