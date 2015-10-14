# Made-View

modular HTML preprocessor & template engine like JADE

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
a(href='google.com') Google
```
### extend
``` jade
extend(name='parent', mobile='#{mobile}', desc='this is #{desc}') layout.jade
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
    include(like='eat', name='#{name}', prefix='this is #{prefix}') desc.jade
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










