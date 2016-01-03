/**
 * Made-View Runtime
 * @author: SimonHao
 * @date:   2015-10-09 15:11:34
 */

'use strict';

exports.encode = function(html){
  var result = String(html).replace(/[&<>"]/g, function(escape_char){
    var encode_map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    };

    return encode_map[escape_char] || escape_char;
  });

  if(result === '' + html) return html;
  else return result;
};

exports.each = function(list, callback){
  if(Array.isArray(list)){
    for(var i = 0; i < list.length; i++){
      callback(list[i], i);
    }
  }else if(typeof list === 'object' && list !== null){
    Object.keys(list).forEach(function(key){
      callback(list[key], key);
    });
  }else{
    callback(list, 0);
  }
};

exports.block = function(blocks, block_name, block_content){
  var content = blocks[block_name];

  if(content){
    content[0] && content[0]();
    content[1] && content[1]();

    if(!content[1]){
      block_content();
    }

    content[2] && content[2]();
  }
};