# Made-View
[![Build Status](https://travis-ci.org/simonhao/made-view.svg?branch=master)](https://travis-ci.org/simonhao/made-view)

## Getting Started
module's short-class will transform automatic, class will become sid + class. sid generate use [made-id](https://github.com/simonhao/made-id).

module's id will become sit + instance + id.

more case please read [test/index.js](https://github.com/simonhao/made-view/blob/master/test/index.js)

## Language Reference
### doctype
```
doctype html
```
### tags
``` jade
ul
  li Item A
  li Item B
  li Item C
```
### attributes
``` jade
a(href='http://google.com') Google
a(href='http://mail.com'
  title='Mail'
  ) Link to Mail
```
### extend
``` jade
extend(
    name={
      first: 'simon',
      last: 'hao'
    }
    mobile='my phone : #{mobile}'
    desc='this is #{desc}'
    keywords=['web', 'code']
  ) layout.jade
replace header
  header Header
prepend main
  main Main
append footer
  footer Footer
```
### include
``` jade
div.person
  div.name Made
  div.age 24
    include(like=tea, name='#{author}') desc.jade:top
  div.desc
    include(like=eat, name='#{name}') desc.jade:bottom
```
### conditionals
``` jade
if person.age === 1
  div Males
else if person.age === 2
  div Females
else
  div God
```

### case
``` jade
case count
  when 0
    div Zero
  when 1
    div One
  default
    div NaN
```
### code
``` jade
- for(var i = 0; i < 5; i++){
-   console.log(i)
- }
```

## API
### Install
```js
npm install made-view
```

### Options
``` javascript
var options = {
  basedir: 'module_base_dir', //模块相对的根目录，一般来说为工程的src目录
  filename: filename, //模块文件名
  entry: 'view.jade', //模块的入口文件
  ext: '.jade', //模块的默认扩展名
  instance: '' //模块的实例名
};
```

### Transform
``` javascript
{ //转换属性
  src: function(val, sid, options){
    return 'http://' + server_name + server_path + val + md5;
  }
}
```

### Compile
```js
var made_view = require('made-view');
var fs = require('fs');

var filename = 'module_path';
var str = fs.readFileSync(filename, 'utf-8');

var options = {
  basedir: 'module_base_dir',
  filename: filename,
  entry: 'view.jade',
  ext: '.jade',
  instance: 'top'
};

var transform = {
  src: function(val, sid, options){
    return 'http://' + server_name + server_path + val + md5;
  }
};
//预编译

var render = made_view.compile(str, options, transform);

var render = made_view.compile_file(filename, options, transform);

var html = render({
  name: 'qq'
});

//编译为客户端版本

var js = made_view.compile_client(str, options, transform);
var js = made_view.compile_client_file(filename, options, transform);

//js为一个函数，第一个参数即为需要传递的参数

```









