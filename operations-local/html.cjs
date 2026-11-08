const sanitize=require('sanitize-html'),{fail}=require('./contract.cjs'),policy=require('./media-policy.cjs');
const tags=['p','div','span','br','b','strong','i','em','u','s','strike','h2','h3','h4','ul','ol','li','blockquote','pre','code','a','img'];
function html(value){
 if(typeof value!=='string'||value.length>20000||Buffer.byteLength(value)>32768||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail(400,'INVALID_HTML');
 const result=sanitize(value,{allowedTags:tags,allowedAttributes:{a:['href','title'],img:['src','alt','title']},allowedSchemes:[],allowProtocolRelative:false,nonTextTags:['script','style','textarea','option','template','svg','math','iframe','object','embed','noscript','xmp'],nestingLimit:30,transformTags:{a:(tag,attrs)=>({tagName:tag,attribs:{...(policy.link(attrs.href)?{href:attrs.href}:{}),...(attrs.title?{title:attrs.title.slice(0,160)}:{})}}),img:(tag,attrs)=>policy.reference(attrs.src,'image')?({tagName:tag,attribs:{src:attrs.src,alt:(attrs.alt||'合成公告配图').slice(0,160)}}):({tagName:'span',attribs:{},text:'[不可信图片引用已移除]'})}});
 if(result.length>20000||Buffer.byteLength(result)>32768||!result.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,'').trim()&&!/<img\s/.test(result))fail(400,'EMPTY_OR_LARGE_HTML');return result;
}
module.exports={html,tags};
