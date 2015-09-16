# Made

modular HTML preprocessor & template engine like JADE

## Language Reference
### extends
``` jade
extends(name='parent', mobile=mobile, desc='this is #{desc}') layout.jade
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
    include(like='eat', name=name, prefix='this is #{prefix}') desc.jade
```
## API