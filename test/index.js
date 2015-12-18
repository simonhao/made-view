/*
 * 测试
 * @author: SimonHao
 * @date:   2015-09-09 09:27:55
 */

'use strict';


var test_file = ['extends.jade'];

var Made = require('../index.js');

var options = {
  basedir: __dirname,
  instance: 'qq'
};

var transform = {
  src: function(val, options){
    return 'transform-' + options.sid + '-' + val;
  }
};

test_file.forEach(function(file){
  var filename = __dirname + '/' + file;
  var render = Made.compile_file(filename, options, transform);

  console.log(render({
    title: '这是比赛<><>"""&&&Test Page',
    person: {
      name: 'qzone'
    },
    qq: 'tt',
    weibo: {
      qq:'123'
    }
  }));
  console.log('----------------')
});