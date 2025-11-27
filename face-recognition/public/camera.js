let mainCanvas = document.getElementById("canvas");

let aspectRatio = 4/3;
let captureCount = 0;
let maxCaptures = 5;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let detections = [];

let recording = false;
let detectionStarted = false;
let lastTick = 0;

let canvas;
let video;
let detectionInterval;

document.getElementById("captures").innerHTML = `Faces captured: ${captureCount}/${maxCaptures}`;
document.getElementById("face").innerHTML = `Detecting face: ${detections.length>0?"yes":"no"}`;
document.getElementById("capture").addEventListener("click",async () => {
	if (!recording) captureCount = 0;
	if (!detectionStarted) {
		detectionStarted = true;
		detectFaces();
	}
	
	recording = !recording;
});
document.getElementById("next").addEventListener("click",() => {
	document.getElementById("cameraForm").submit();
});

async function saveFaceData(name,idx,content) {
	try {
		const response = await fetch("/capture",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ "fileName": `${name}_${idx}`,"content": content })
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
			const fullFaceDescriptions = await faceapi.detectAllFaces(video.elt, new faceapi.TinyFaceDetectorOptions())
				.withFaceLandmarks()
				.withFaceExpressions();
			const displaySize = { width: videoWidth, height: videoWidth / aspectRatio };
            detections = faceapi.resizeResults(fullFaceDescriptions, displaySize);
		}
	}, 100);
}

function preload() {
	const p = "./models";
		
	Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(p),
		faceapi.nets.faceLandmark68Net.loadFromUri(p),
		faceapi.nets.faceRecognitionNet.loadFromUri(p),
		faceapi.nets.faceExpressionNet.loadFromUri(p)
	]);
		
	console.log("loaded models");
}

function setup() {
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth/aspectRatio);
	
	video = createCapture(VIDEO);
	video.size(videoWidth,videoWidth/aspectRatio);
	video.hide();
}

function draw() {
	clear();
	
	videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,300));
	resizeCanvas(videoWidth,videoWidth/aspectRatio);
	video.size(videoWidth,videoWidth/aspectRatio);
	
	document.getElementById("face").innerHTML = `Detecting face: ${detections.length>0?"yes":"no"}`;

	image(video,0,0);
	
	if (recording) {
		if (Date.now()-lastTick >= 100 && captureCount < maxCaptures) {
			if (detections.length > 0) {
				if (captureCount+1>=maxCaptures) {
					recording = false;
					detectionStarted = false;
					document.getElementById("next").disabled = false;
					clearInterval(detectionInterval);
					detections = [];
				}
				
				saveFaceData(document.getElementById("name").value,captureCount,canvas.canvas.toDataURL("image/jpeg"));
				captureCount += 1;
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