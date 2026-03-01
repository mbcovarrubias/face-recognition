let mainCanvas = document.getElementById("canvas");
let logs = document.getElementById("logs");

let maxBlinkThreshold = .2;
let maxExprCount = 2;
let maxCaptures = 20;
let maxRecognitionThreshold = .4;
let vw = 480;

// blink
let minBlinkFrames = 1;
let maxBlinkFrames = 5;

// loading
let loadingText = "Loading...";
let loadingTextDotCount = 1;
let doneLoading = false;

let aspectRatio;
let canvas;
let video;
let faceMatcher;
let randomExpressions;
let faceMesh;

let detectionInterval;
let loadingTextInterval;

let detections = [];
let faceMeshResults = [];

let faceStates = {};
let lastTick = {};
let exprCount = {};

let faceMeshOptions = {
	maxFaces: 5,
	refineLandmarks: true,
	flipHorizontal: false,
	runtime: "mediapipe"
};

let detectionOptions = new faceapi.TinyFaceDetectorOptions();

async function loadLabeledImages() {
	let response = await fetch("/",{
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			action: "get registered users",
			message: {}
		})
	});
	
	let labels = await response.json();
	labels = await Promise.all(labels.map(async label=>{
		let descriptors = [];
		for (let i = 0; i < maxCaptures; i++) {
			try {
				let saveLoc = "images/faces";
				let img = await faceapi.fetchImage(`/${saveLoc}/${label}_${i}.jpg`);
				let faceDescription = await faceapi.detectSingleFace(img,detectionOptions).withFaceLandmarks().withFaceDescriptor();
				if (faceDescription) descriptors.push(faceDescription.descriptor);
			} catch (err) {
				addToLogs(err,true);
				break;
			}
		}
		
		return new faceapi.LabeledFaceDescriptors(label,descriptors);
	}));
	
	return labels;
}

async function updateDetections() {
	if (video.loadedmetadata && faceMatcher) {
		let results = await faceapi.detectAllFaces(video.elt,detectionOptions).withFaceLandmarks().withFaceDescriptors().withFaceExpressions();
		results = faceapi.resizeResults(results,{width,height});

		detections = results.map(detection=>{
			let bestMatch = faceMatcher.findBestMatch(detection.descriptor);
			return {detection,bestMatch};
		});
	}
}

async function updateLoadingText(Text) {
	loadingTextDotCount = (loadingTextDotCount + 1) % 4;
	loadingText = Text + ".".repeat(loadingTextDotCount);
}

function addToLogs(text,error) {
	let textElt = document.createElement("span");
	textElt.innerHTML = text;
	textElt.className = "line";
	
	if (error) textElt.style.color = "red";
	
	logs.appendChild(textElt);
}

function calculateEAR(p1, p4, p2, p6, p3, p5) { 
	// eye aspect ratio
	let v1 = dist(p2.x, p2.y, p6.x, p6.y);
	let v2 = dist(p3.x, p3.y, p5.x, p5.y);
	let h = dist(p1.x, p1.y, p4.x, p4.y);

	return (v1 + v2) / (2.0 * h);
}

function ding() {
	let audio = new Audio("ding.mp3");
	audio.play();
}

function faceRecognized(detectionData) {
	let box = detectionData.detection.detection.box;
	let match = detectionData.bestMatch;
	let name = match.label;
	
	let pad = n=>n.toString().padStart(2,"0");
	
	let now = new Date();
	let year = now.getFullYear();
	let month = pad(now.getMonth()+1);
	let day = pad(now.getDate());
	
	let hours = pad(now.getHours());
	let minutes = pad(now.getMinutes());
	let seconds = pad(now.getSeconds());
	
	let date = `${year}-${month}-${day}`;
	let time = `${hours}:${minutes}:${seconds}`;
	
	stroke(0,0,255);
	strokeWeight(2);
	noFill();
	rect(box.x,box.y,box.width,box.height);
	
	fill(255,255,255);
	stroke(0);
	strokeWeight(2);
	textSize(16);
	text(`Name: ${name}`,box.x,box.y-10);
	
	let scaleX = width / video.width;
	let scaleY = height / video.height;
	
	let linkedMesh = faceMeshResults.find(mesh=>{
		let nose = mesh.keypoints[1]; 
		return (
			nose.x * scaleX > box.x * scaleX && 
			nose.x * scaleX < (box.x + box.width) * scaleX && 
			nose.y * scaleY > box.y * scaleY && 
			nose.y * scaleY < (box.y + box.height) * scaleY
		);
	});
	
	let faceState;
	
	if (!faceStates.hasOwnProperty(name)) {
		faceStates[name] = {
			blink: false,
			blinkStart: 0,
			blinkEnd: 0
		}
	}
	
	faceStates[name].lastSeen = now.getTime();
	
	faceState = faceStates[name];
	
	let requestOptions = {
		method: "POST",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify({
			action: "face recognized",
			message: {name,date,time,"unknown": name == "unknown"}
		})
	}

	
	if (linkedMesh) {
		let keypoints = linkedMesh.keypoints;
		let FMBox = linkedMesh.box;
		let leftEye = linkedMesh.leftEye.keypoints;
		let rightEye = linkedMesh.rightEye.keypoints;
		
		let leftEAR = calculateEAR(
			keypoints[33],
			keypoints[133], 
			keypoints[160],
			keypoints[144], 
			keypoints[158],
			keypoints[153] 
		);
		
		let rightEAR = calculateEAR(
			keypoints[362],
			keypoints[263],
			keypoints[385],
			keypoints[380],
			keypoints[387],
			keypoints[373]
		);
		
		let avgEAR = (leftEAR+rightEAR)/2
		
		if (avgEAR <= maxBlinkThreshold && !faceState.blink) {
			faceState.blink = true;
			faceState.blinkStart = frameCount;
		} else {
			stroke(255,0,0);
			if (avgEAR > maxBlinkThreshold && faceState.blink) {
				faceState.blink = false;
				faceState.blinkEnd = frameCount;
				
				let frameDiff = faceState.blinkEnd - faceState.blinkStart;
				if (frameDiff >= minBlinkFrames && frameDiff <= maxBlinkFrames) {
					stroke(0,255,0);
					ding();
					
					fetch("/",requestOptions).then(res=>res.json())
					.then(res=>{if (res.printToLogs) addToLogs(res.message,false)});
				}
			}
		}
		
		noFill();
		rect(FMBox.xMin * scaleX,FMBox.yMin * scaleY,FMBox.width * scaleX,FMBox.height * scaleY);
	}
}

function isPointInBox(point, box) { 
	// checks if a keypoint of a faceMesh detection is inside the box of the faceapi detection
    return (
        point.x >= box.x &&
        point.x <= box.x + box.width &&
        point.y >= box.y &&
        point.y <= box.y + box.height
    );
}

function videoReady() {
	let stream = video.elt.srcObject;
	let track = stream.getVideoTracks()[0].getSettings();
	let vWidth = track.width || video.elt.videoWidth;
	let vHeight = track.height || video.elt.videoHeight;
	
	aspectRatio = vWidth/vHeight;
	
	resizeCanvas(vw,vw/aspectRatio);
	
	let loadingTextToSet = "";
	
	loadingTextInterval = setInterval(async()=>{
		updateLoadingText(loadingTextToSet);
	},500);
	
	// load models
	let modelsPath = "./models/face-api";
	let promiseList = [
		faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
		faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
		faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
		faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
	];
	
	loadingTextToSet = "Loading models";
	Promise.all(promiseList).then(()=>{
		loadingTextToSet = "Loaded models, loading FaceMatcher";
		
		addToLogs("Loaded models",false);
		
		loadLabeledImages()
		.then(labeledImages=>{
			if (labeledImages.length > 0) {
				faceMatcher = new faceapi.FaceMatcher(labeledImages,maxRecognitionThreshold);
				loadingTextToSet = "Loaded FaceMatcher";
				addToLogs("Loaded FaceMatcher",false);
				clearInterval(loadingTextInterval);
				
				setTimeout(()=>{
					doneLoading = true;
				},500)
			} else {
				throw new Error("No labeled images found");
			}
		})
		.catch(err=>{
			throw err;
		});
		
	}).catch((err)=>{
		clearInterval(loadingTextInterval);
		loadingText = "Error: "+err;
		addToLogs(err,true);
	}).finally(()=>{	
		// start updating detections
		detectionInterval = setInterval(updateDetections,200);
	});
}

function cleanupFaceStates() {
	if (!faceStates) return;
	faceStates = Object.fromEntries(
		Object.entries(faceStates).filter(([key,value])=>Date.now() - value.lastSeen <= 2000)
	);
}

// main p5 functions

function setup() {    
	if (!canvas) {
		canvas = createCanvas(vw,vw/aspectRatio);
	}
	
	video = createCapture(VIDEO,videoReady);
	video.elt.setAttribute('playsinline', '');
	video.hide();
	
	faceMesh = ml5.faceMesh(faceMeshOptions);
	
	if (faceMesh) {
		faceMesh.detectStart(video, results=>{
			faceMeshResults = results;
		});
	}
}

function draw() {
	if (video && aspectRatio) {
		image(video,0,0,width,height);
		
		if (!doneLoading) {
			fill(255,255,255);
			stroke(0);
			strokeWeight(2);
			textSize(20);
			text(loadingText,4,20);
		}

		if (detections.length > 0 && faceMeshResults.length > 0) {
			detections.forEach(detection=>faceRecognized(detection));
		}
		
		cleanupFaceStates();
	}
}

// events

screen.orientation.addEventListener("change",()=>{
	setTimeout(setup,500);
});