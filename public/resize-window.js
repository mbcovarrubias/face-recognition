let urlInfo = {
	"/home": { 
		dimensions: {"default": {width: 716, height: 576}} 
	},
	"/registration": {
		dimensions: {
			"default": {width: 400, height: 328},
			"camera": {width: 975, height: 497},
			"regfinish": {width: 400, height: 342}
		}
	},
	"/verification": { 
		dimensions: {"default": {width: 1036, height: 598}}
	},
	"/archive": {
		dimensions: {"default": {width: 400, height: 488}}
	},
	"/qr": { 
		dimensions: {"default": {width: 678, height: 474}} 
	},
}

function resizeWindow(url,action = "default",target = "_blank") {
	if (!urlInfo[url]) return;
	let dim = urlInfo[url].dimensions[action];
	let specs = `width=${dim.width},height=${dim.height},titlebar=0,left=${(screen.width-dim.width)/2},top=${(screen.height-dim.height)/2}`
	
	let w = window.open(url,target,specs);
	
	w.resizeTo(dim.width,dim.height); 
	w.moveTo((screen.width-dim.width)/2,(screen.height-dim.height)/2);
	
	return w;
}

//openPage('/registration','_self','camera')