let mainCanvas = document.getElementById("canvas");

let captureCount = 0;
let captureDelay = 400; // in milliseconds
let lastTick = 0;
let maxCaptures = 10;
let targetVideoWidth = 300;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let detections = [];

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

async function saveFaceData(name,idx) {
	try {
		const response = await fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "capture",
				message: {fileName: `${name}_${idx}`,content: canvas.canvas.toDataURL("image/jpeg")}
			})
		});
		
		const result = await response.json();
		console.log('Server response:', result);
	} catch (err) {
		console.log(err);
	}
}

async function detectFaces() {
	detectionInterval = setInterval(async () => {
		if (video.elt.readyState === 4) {
			const fullFaceDescriptions = await faceapi.detectAllFaces(video.elt,detectionOptions)
				.withFaceLandmarks()
				.withFaceExpressions();
			const displaySize = { width: videoWidth, height: videoWidth / aspectRatio };
            detections = faceapi.resizeResults(fullFaceDescriptions, displaySize);
		}
	}, captureDelay);
}

function preload() {
	const modelsPath = "./models/face-api";
		
	if (isUsingTouchscreen()) {
		detectionOptions = new faceapi.SsdMobilenetv1Options({minConfidence:.5});
		Promise.all([
			faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
			faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
			faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
			faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
		]);
	} else {
		Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
			faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
			faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
			faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
		]);
	}
		
	console.log("loaded models");
	
	document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
	document.getElementById("face").innerHTML = `Detecting face: ${detections.length>0?"yes":"no"}`;
	document.getElementById("capture").addEventListener("click",async () => {
		document.getElementById("capture").innerHTML = "Restart Capturing";
		if (!recording) captureCount = 0;
		if (!detectionStarted) {
			detectionStarted = true;
			detectFaces();
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
	
	canvas = createCanvas(videoWidth,videoWidth/aspectRatio);
}

function draw() {
	if (video && aspectRatio) {
		clear();
	
		videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,targetVideoWidth));
		resizeCanvas(videoWidth,videoWidth/aspectRatio);
		video.size(width,height);
		
		document.getElementById("face").innerHTML = `Detecting face: ${detections.length>0?"yes":"no"}`;

		image(video,0,0);
		
		if (recording) {
			if (Date.now()-lastTick >= captureDelay && captureCount < maxCaptures) {
				if (detections.length > 0) {
					if (captureCount+1>=maxCaptures) {
						recording = false;
						detectionStarted = false;
						document.getElementById("next").disabled = false;
						clearInterval(detectionInterval);
						detections = [];
					}
					
					saveFaceData(document.getElementById("name").value,captureCount);
					captureCount += 1;
					ding();
					
					document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
				}
				
				lastTick = Date.now();
			}
		}
		
		for (let i = 0; i < detections.length; i++) {
			let face = detections[i];
			let box = face.detection.box;
			
			strokeWeight(2);
			stroke(0,0,255);
			noFill();
			rect(box.x,box.y,box.width,box.height);
		}
	}
}