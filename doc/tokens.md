#Tokens

### doctype
``` json
{type: 'doctype', val: 'html', line: 1}
```
### tag
``` json
{type: 'tag', val: 'tag_name', line: line_number}
```
### attrs
``` json
{
  type: 'attrs',
  attrs: [{
    name: 'attr_name',
    val: 'attr_val'
  }],
  line: line_number
}
```
### class
``` json
{type: 'class', val: 'class_name', line: line_number}
```
### text
``` json
{type: 'text', val: 'text_content', line: line_number}
```

### block
``` json
{type: 'block', val: 'block_name', line: line_number}
```
### extend
``` json
{
  type: 'extend',
  val: 'module_id',
  options: [{
    name: 'options_name',
    val: 'options_val'
  }],
  line: line_bumber
}
```
### include
``` json
{
  type: 'include',
  val: 'module_id',
  options: [{
    name: 'options_name',
    val: 'options_val'
  }],
  line: line_bumber
}
```

### replace
### prepend
### append

### case
### when
### default

### each
### while

### if
### else
### else if

### code
### dot
### comment

### blank
### newline
### eos
### indent
### outdent


