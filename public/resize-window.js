let Dim = {
	"/registration": {
		"default": {width: 400, height: 328},
		"camera": {width: 1036, height: 497},
		"regfinish": {width: 400, height: 342}
	},
	"/verification": {"default": {width: 1036, height: 598}},
	"/archive": {"default": {width: 400, height: 488}},
	"/record": {"default": {width: 400, height: 488}},
	"/qr": {"default": {width: 678, height: 508}},
}

function resizeWindow(url,action = "default",target = "_blank") {
	let pathName = url;
	let search = "";
	let searchParams = "";
	
	if (typeof url == "object") {
		pathName = url.location.pathname;
		search = url.location.search;
		searchParams = new URLSearchParams(search);
		searchParams.delete("embedded");
		
		searchParams = "?"+searchParams.toString();
	}
	
	if (!Dim[pathName]) return;
	let dim = Dim[pathName][action];
	let specs = `width=${dim.width},height=${dim.height},titlebar=0,left=${(screen.width-dim.width)/2},top=${(screen.height-dim.height)/2}`
	
	let w = window.open(pathName+searchParams,target,specs);
	
	w.resizeTo(dim.width,dim.height); 
	w.moveTo((screen.width-dim.width)/2,(screen.height-dim.height)/2);
	
	return w;
}
