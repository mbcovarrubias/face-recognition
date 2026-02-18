let mainCanvas = document.getElementById("canvas");

let captureCount = 0;
let captureDelay = 200; // in milliseconds
let lastTick = 0;
let maxCaptures = 20;
let targetVideoWidth = 480;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let detection = undefined;

let recording = false;
let detectionStarted = false;
let nextClicked = false;

let aspectRatio;
let canvas;
let video;
let detectionInterval;

let detectionOptions = new faceapi.TinyFaceDetectorOptions();

function isUsingTouchscreen() {
	let hasTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
	let prefersCoarsePointer = window.matchMedia("(any-pointer: coarse)").matches;

	return hasTouchEvents && prefersCoarsePointer;
}

function ding() {
	let audio = new Audio("ding.mp3");
	audio.play();
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
		let response = await fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "capture",
				message: {fileName: `${name}_${idx}`,content}
			})
		});
		
		let result = await response.json();
		console.log('Server response:', result);
	} catch (err) {
		console.log(err);
	}
}

async function detectFace() {
	detectionInterval = setInterval(async () => {
		if (video.elt.readyState === 4) {
			try {
				let faceDescription = await faceapi.detectSingleFace(video.elt,detectionOptions).withFaceLandmarks();
				let displaySize = { width: videoWidth, height: videoWidth / aspectRatio };
				detection = faceapi.resizeResults(faceDescription, displaySize);
			} catch {
				detection = undefined;
			}
		}
	}, captureDelay);
}

function preload() {
	let modelsPath = "./models/face-api";
	
	Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
		faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
		faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
		faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
	]).then(()=>{});
	
	document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
	document.getElementById("face").innerHTML = `Detecting face: ${detection?"yes":"no"}`;
	document.getElementById("capture").addEventListener("click",async () => {
		document.getElementById("capture").innerHTML = "Restart Capturing";
		if (!recording) captureCount = 0;
		if (!detectionStarted) {
			detectionStarted = true;
			detectFace();
		}
		
		recording = !recording;
	});
	document.getElementById("cameraForm").addEventListener("submit",()=>{
		nextClicked = true;
	});

	window.addEventListener("unload",evt=>{
		fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "reset captures",
				message: {
					user: document.getElementById("name").value,
					nextClicked: nextClicked,
					captureCount: maxCaptures
				}
			})
		})
		.then(res=>res.json())
		.then(data=>console.log(data));
	});
}

function setup() {    
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth/aspectRatio);
	
	video = createCapture(VIDEO,videoReady);
	video.size(width,height);
	video.hide();
}

function videoReady() {
	let stream = video.elt.srcObject;
	let track = stream.getVideoTracks()[0].getSettings();
	let vWidth = track.width;
	let vHeight = track.height;
	
	aspectRatio = vWidth/vHeight;
}

function draw() {
	if (video && aspectRatio) {
		clear();
	
		videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,targetVideoWidth));
		resizeCanvas(videoWidth,videoWidth/aspectRatio);
		video.size(width,height);
		
		image(video,0,0);
		
		document.getElementById("face").innerHTML = `Detecting face: ${detection?"yes":"no"}`;
		
		if (recording) {
			if (detection) {
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
					if (captureCount == 0) addTestImage(name,detection);
					
					captureCount += 1;
					ding();
					
					document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
					
					lastTick = Date.now();
				}
				
				let box = detection.detection.box;
					
				strokeWeight(2);
				stroke(0,0,255);
				noFill();
				rect(box.x,box.y,box.width,box.height);
			}
		}
	}
}

screen.orientation.addEventListener("change",()=>{
	setTimeout(setup,500);
});

// window.addEventListener("resize",()=>{
	// setTimeout(setup,500);
// });