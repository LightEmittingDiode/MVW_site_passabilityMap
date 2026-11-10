importScripts('registration.js');
onmessage=event=>{try{const {data,network,anchor}=event.data;postMessage({candidates:MeasurementRegistration.suggest(data,network,anchor)});}catch(error){postMessage({error:error.message});}};
