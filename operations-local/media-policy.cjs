(()=>{const images=['/fixtures/operations-cover.svg','/fixtures/operations-missing.png'],videos=['/fixtures/operations-motion.mp4','/fixtures/operations-missing.mp4'];
function reference(value,type){return typeof value==='string'&&(type==='image'?images:type==='video'?videos:[]).includes(value);}
function link(value){return typeof value==='string'&&['/operations','/attendance','/points','#details'].includes(value);}
const policy={images,videos,reference,link};if(typeof module!=='undefined'&&module.exports)module.exports=policy;else globalThis.OPS_MEDIA=policy;
})();
