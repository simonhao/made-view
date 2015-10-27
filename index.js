/**
 * Made-View 入口文件
 * @author: SimonHao
 * @date:   2015-09-07 16:10:45
 */

'use strict';

var Compiler = require('./lib/compiler');
var runtime  = require('made-runtime');
var fs       = require('fs');
var extend   = require('extend');
/**
 * 公共设置
 * @param {String} basedir  根目录
 * @param {String} entry    默认入口文件
 * @param {String} instance 实例名称
 * @param {String} filename 文件名
 * @param {Object} transform 自动转换属性
 */

/**
 * 渲染一个模块为HTML
 * @param  {String} str     模块文本
 * @param  {Object} options 参见公共设置
 * @return {Function}       一个渲染函数
 */
exports.compile = function(str, options, transform){
  var compiler = new Compiler(str, options, transform);

  var render_func = new Function('locals, made', compiler.compile());

  var render = function(locals){
    return render_func(locals, Object.create(runtime));
  };

  return render;
};

/**
 * 就指定文件渲染为HTML
 * @param  {String} filename 模块路径
 * @param  {Object} options  参见公共设置
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
 * @return {String}         渲染结果
 */
exports.compile_client = function(str, options, transform){
  var compiler = new Compiler(str, options, transform);

  return 'function(locals, made){' + compiler.compile() + '}';
};

/**
 * 将制定文件渲染为客户端使用的JS
 * @param  {String} filename 模块文件
 * @param  {Object} options  参见公共设置
 * @return {String}          渲染结果
 */
exports.compile_client_file = function(filename, options, transform){
  var str = fs.readFileSync(filename, 'utf-8');

  return exports.compile_client(str, extend({
    filename: filename
  }, options), transform);
};