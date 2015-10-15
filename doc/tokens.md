# Tokens
> 所有的Token都具有以下基本结构

``` js
{
  type: 'type', //Token类型
  line: line_number //行号
}
```

## 结构

### doctype
``` js
{
  type: 'doctype',
  val: 'html'
}
```

### tag
``` js
{
  type: 'tag',
  val: 'tag_name'
}
```

### attr
```js
{
  type: 'attrs',
  attrs: [{
    name: 'attr_name',
    val: 'attr_val' //属性值不包含引号
  }]
}
```

### text
```js
{
  type: 'text',
  val: 'text_content'
}
```

### dot
### comment
### code

## 模块化

### extends
```js
{
  type: 'extends',
  id: 'module_id',
  options:[{
    name: 'option_name',
    val: 'option_val'
  }]
}
```

### replace
```js
{
  type: 'replace',
  val: 'block_name'
}
```

### prepend
```js
{
  type: 'prepend',
  val: 'block_name'
}
```

### append
```js
{
  type: 'append',
  val: 'block_name'
}
```

### block
```js
{
  type: 'block',
  val: 'block_name'
}
```

### class
```js
{
  type: 'class',
  val: 'class_name'
}
```

## 逻辑类
### if
```js
{
  type: 'if',
  val: 'exp'
}
```

### else
```js
{
  type: 'else',
  val: 'exp'
}
```

### elseif
```js
{
  type: 'elseif',
  val: 'exp'
}
```

### case
```js
{
  type: 'case',
  val: 'exp'
}
```

### when
```js
{
  type: 'when',
  val: 'exp'
}
```

### default
```js
{
  type: 'default'
}
```

### each
```js
{
  type: 'each',
  key: 'key_name',
  val: 'val_name',
  exp: 'data'
}
```

### while
```js
{
  type: 'while',
  val: 'exp'
}
```

## 其他
### blank
### newline
### eos
### indent
### outdent