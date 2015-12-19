/**
 * Made-View 入口文件
 * @author: SimonHao
 * @date:   2015-09-07 16:10:45
 */

'use strict';

var Compiler = require('./lib/compiler');
var Parser   = require('made-view-parser');
var runtime  = require('made-runtime');
var fs       = require('fs');
var extend   = require('extend');

/**
 * 公共设置
 * @param {String} entry    默认入口文件
 * @param {String} ext      扩展名
 * @param {String} basedir  根目录
 * @param {String} instance 实例名称
 * @param {String} filename 文件名
 * @param {String} model    设置构建模式
 * @param {String} dep      设置是否返回组件依赖
 * @param {Boolean} pretty  构建结果是否格式化
 */

/**
 * 将语法树渲染成HTML
 * @param  {Object} ast       语法树
 * @param  {Object} options   参见公共设置
 * @param  {Object} transform 自动转换属性
 * @return {Function}         一个渲染函数
 */
exports.compile_ast = function(ast, options, transform){
  var compiler = new Compiler(ast, options, transform);

  var code  = [
    'var __made_buf = [];',
    'var __made_block = __made_block || {};',
    'var __made_locals = __made_locals || {};'];

  if(options.dep){
    code.push('var __made_dep = [];');
  }

  code.push(compiler.compile());

  if(options.dep){
    code.push('return [__made_buf.join(""), __made_dep];');
  }else{
    code.push('return __made_buf.join("");');
  }


  var render_func = new Function('__made_locals, made', code.join('\n'));

  var render = function(locals){
    /*return code.join('\n');*/
    return render_func(locals, Object.create(runtime));
  };

  return render;
};

/**
 * 渲染一个模块为HTML
 * @param  {String} str     模块文本
 * @param  {Object} options 参见公共设置
 * @param  {Object} transform 自动转换属性
 * @return {Function}       一个渲染函数
 */
exports.compile = function(str, options, transform){
  var ast = new Parser(str, options.filename).parse();

  return exports.compile_ast(ast, options, transform);
};

/**
 * 就指定文件渲染为HTML
 * @param  {String} filename 模块路径
 * @param  {Object} options  参见公共设置
 * @param  {Object} transform 自动转换属性
 * @return {Function}       一个渲染函数
 */
exports.compile_file = function(filename, options, transform){
  var str = fs.readFileSync(filename, 'utf-8');

  return exports.compile(str, extend({
    filename: filename
  }, options), transform);
};


/**
 * 将模块渲染为客户端使用的JS
 * @param  {String} str     模块文本
 * @param  {Object} options 参见公共设置
 * @param  {Object} transform 自动转换属性
 * @return {String}         渲染结果
 */
exports.compile_client = function(str, options, transform){
  var ast = new Parser(str, options.filename).parse();
  var compiler = new Compiler(ast, options, transform);

  var code  = [
    'var __made_buf = [];',
    'var __made_block = __made_block || {};',
    'var __made_locals = __made_locals || {};'];

  if(options.dep){
    code.push('var __made_dep = [];');
  }

  code.push(compiler.compile());

  if(options.dep){
    code.push('return [__made_buf.join(""), __made_dep];');
  }else{
    code.push('return __made_buf.join("");');
  }


  return 'function(__made_locals){' + code.join('') + '}';
};

/**
 * 将指定文件渲染为客户端使用的JS
 * @param  {String} filename 模块文件
 * @param  {Object} options  参见公共设置
 * @param  {Object} transform 自动转换属性
 * @return {String}          渲染结果
 */
exports.compile_client_file = function(filename, options, transform){
  var str = fs.readFileSync(filename, 'utf-8');

  return exports.compile_client(str, extend({
    filename: filename
  }, options), transform);
};