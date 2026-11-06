// Use only the two disposable checkouts described in BUNDLE.md.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const scratch='E:/Recovery/.jinxi-research/b2-a-6/chunks';
for(const [stage,sha] of[
 ['pr14','7f850e188c750e147181fcba193a8106892b4afc'],
 ['pr15','f9ff27874beaf3388502f29360ebaa86c5a64c13'],
]){
 const root=path.resolve(scratch,stage);
 if(!root.startsWith(path.resolve(scratch)+path.sep))throw Error('Unexpected stats checkout');
 if(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==sha)throw Error('Wrong reviewed commit');
 const config=path.join(root,'next.config.mjs');
 let code=fs.readFileSync(config,'utf8');
 if(code.includes('jinxi-a6-stats'))throw Error('Use a fresh disposable checkout');
 const plugin=[
  '      config.plugins.push({',
  '        apply(compiler) {',
  "          compiler.hooks.done.tap('jinxi-a6-stats', stats => {",
  '            const data = stats.toJson({',
  '              all:false, assets:true, chunks:true, chunkModules:true,',
  '              modules:true, nestedModules:true, ids:true, source:false,',
  '              groupModulesByAttributes:false, groupModulesByCacheStatus:false,',
  '              groupModulesByExtension:false, groupModulesByPath:false,',
  '              groupModulesByType:false, groupModulesByLayer:false,',
  '              cachedModules:true, orphanModules:true, modulesSpace:Infinity,',
  '              chunkModulesSpace:Infinity, nestedModulesSpace:Infinity,',
  '            });',
  "            fs.writeFileSync('client-stats.json', JSON.stringify(data));",
  '          });',
  '        },',
  '      });',
 ].join('\n');
 if(!code.includes('      config.devtool = false'))throw Error('Reviewed webpack hook changed');
 code="import fs from 'node:fs';\n"+code.replace('      config.devtool = false','      config.devtool = false\n'+plugin);
 fs.writeFileSync(config,code);
}
