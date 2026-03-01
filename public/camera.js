let mainCanvas = document.getElementById("canvas");

let captureCount = 0;
let captureDelay = 200; // in milliseconds
let lastTick = 0;
let maxCaptures = 20;
let vw = 480;

let detection = undefined;

let recording = true;
let detectionStarted = false;
let nextClicked = false;

let aspectRatio;
let canvas;
let video;
let detectionInterval;

let detectionOptions = new faceapi.TinyFaceDetectorOptions();

function ding() {
	let audio = new Audio("ding.mp3");
	audio.play();
}

async function startCapturing() {
	captureCount = 0;
	if (!detectionStarted) {
		recording = true;
		detectionStarted = true;
		detectFace();
	}
}

async function addTestImage(name,detection) {
	try {
		let box = detection.detection.box;
		//let content = video.get(box.x,box.y,box.width,box.height).canvas.toDataURL("image/jpeg");
		let content = canvas.canvas.toDataURL("image/jpeg");
		let response = await fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "add test image",
				message: {name,content}
			})
		});
		
		let result = await response.json();
		console.log('Server response:', result);
	} catch (err) {
		console.log(err);
	}
}

async function saveCapture(name,detection,idx) {
	try {
		let box = detection.detection.box;
		//let content = video.get(box.x,box.y,box.width,box.height).canvas.toDataURL("image/jpeg");
		let content = canvas.canvas.toDataURL("image/jpeg");
		let fileName = `${name}_${idx}`;
		let response = await fetch("/",{
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({action: "capture", message: {fileName, content}})
		});
	} catch (err) {
		console.log(err);
	}
}

async function detectFace() {
	detectionInterval = setInterval(async () => {
		if (video.elt.readyState === 4) {
			try {
				let faceDescription = await faceapi.detectSingleFace(video.elt,detectionOptions).withFaceLandmarks();
				let displaySize = { width: vw, height: vw / aspectRatio };
				detection = faceapi.resizeResults(faceDescription, displaySize);
			} catch {
				detection = undefined;
			}
		}
	}, captureDelay);
}

function preload() {
	// load models
	let modelsPath = "./models/face-api";
	let promiseList = [
		faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
		faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
		faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
		faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
	];
	
	Promise.all(promiseList);
}

function setup() {    
	if (!canvas) {
		canvas = createCanvas(vw,vw/aspectRatio);
	}
	
	video = createCapture(VIDEO,videoReady);
	video.hide();
	
	startCapturing();
}

function videoReady() {
	document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
	document.getElementById("face").innerHTML = `Detecting face: ${detection?"yes":"no"}`;
	document.getElementById("capture").addEventListener("click",startCapturing);
	document.getElementById("cameraForm").addEventListener("submit",Event=>{
		nextClicked = true;
	});

	// window.addEventListener("visibilitychange",Event=>{
		// if (document.visibilityState === "hidden") {
			// let user = document.getElementById("name").value;
			// fetch("/",{
				// method: "POST",
				// headers: {"Content-Type": "application/json"},
				// body: JSON.stringify({
					// action: "reset captures",
					// message: {user,nextClicked,captureCount: maxCaptures}
				// })
			// })
			// .then(res=>res.json())
			// .then(data=>console.log(data));
			
			// captureCount = 0;
		// }
	// });
	
	let stream = video.elt.srcObject;
	let track = stream.getVideoTracks()[0].getSettings();
	let vWidth = track.width;
	let vHeight = track.height;
	
	aspectRatio = vWidth/vHeight;
	
	resizeCanvas(vw,vw/aspectRatio);
}

function draw() {
	if (video && aspectRatio) {
		image(video,0,0,width,height);
		
		document.getElementById("face").innerHTML = `Detecting face: ${detection?"Yes":"No"}`;
		
		if (recording && detection) {
			if (captureCount>=maxCaptures) {
				stroke(0,255,0);
			} else {
				stroke(0,0,255);
			}
			
			if (Date.now()-lastTick >= captureDelay && captureCount <= maxCaptures) {
				if (captureCount>=maxCaptures) {
					recording = false;
					detectionStarted = false;
					document.getElementById("next").disabled = false;
					clearInterval(detectionInterval);
					detection = undefined;
					return;
				}
				
				let name = document.getElementById("name").value;
				saveCapture(name,detection,captureCount);
				//if (captureCount == 0) addTestImage(name,detection);
				
				captureCount += 1;
				ding();
				
				document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
				
				lastTick = Date.now();
			}
			
			let box = detection.detection.box;
				
			strokeWeight(2);
			
			noFill();
			rect(box.x,box.y,box.width,box.height);
		}
	}
}

screen.orientation.addEventListener("change",()=>{
	setTimeout(setup,500);
});