import{env,pipeline}from'@huggingface/transformers';
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath='/models/';env.useBrowserCache=false;
if(env.backends.onnx.wasm){env.backends.onnx.wasm.wasmPaths='/wasm/';env.backends.onnx.wasm.numThreads=1;}
let extractor:ReturnType<typeof pipeline<'feature-extraction'>>|undefined;
let queue=Promise.resolve();
self.onmessage=(event:MessageEvent<{id:string;query:string}>)=>{const{id,query}=event.data;queue=queue.then(async()=>{
 try{extractor??=pipeline('feature-extraction','Xenova/multilingual-e5-small',{dtype:'q8',device:'wasm',local_files_only:true});const model=await extractor;const output=await model('query: '+query,{pooling:'mean',normalize:true});self.postMessage({id,vector:output.tolist()[0]});}
 catch{extractor=undefined;self.postMessage({id,error:'Không tải được model offline. Hãy mở ứng dụng online một lần để cài đủ tài nguyên.'})}
})};
