# Made-View
[![Build Status](https://travis-ci.org/simonhao/made-view.svg?branch=master)](https://travis-ci.org/simonhao/made-view)

modular HTML preprocessor & template engine like JADE
made-view include and extends module dose't use ast. so, variables is isolated.

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
  div.desc
    include(like=eat, name='#{name}', prefix='this is #{prefix}') desc.jade
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

### Compile
```js
var made_view = require('made-view');
var fs = require('fs');

var filename = 'module_path';
var str = fs.readFileSync(filename, 'utf-8');

var options = {
  basedir: 'module_base_dir',
  filename: filename,
  entry: 'view.jade', //模块的默认入口文件，默认为 view.jade
  ext: '.jade', //模块文件的扩展名，默认为 .jade
  instance: 'top' //模块的实例名，默认为空
};

//预编译

var render = made_view.compile(str, options);

var render = made_view.compile_file(filename, options);

var html = render({
  name: 'qq'
});

//编译为客户端版本

var js = made_view.compile_client(str, options);
var js = made_view.compile_client_file(filename, options);

//js为一个函数，第一个参数即为需要传递的参数

```









