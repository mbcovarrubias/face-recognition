let mainCanvas = document.getElementById("canvas");
let logs = document.getElementById("logs");

let maxExprCount = 2;
let maxCaptures = 20;
let maxIrisCLength = 100;
let targetVideoWidth = 480;
let maxRecognitionThreshold = .6;
let maxBlinkThreshold = .2;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let aspectRatio;
let canvas;
let video;
let detectionInterval;
let faceMatcher;
let randomExpressions;
let faceMesh;

let detections = [];
let faceMeshResults = [];

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
				let img = await faceapi.fetchImage(`/images/${label}_${i}.jpg`);
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
	console.log(width/video.width);
	
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
	
	let fmtDate = `${year}-${month}-${day}`;
	let fmtTime = `${hours}:${minutes}:${seconds}`;
	
	stroke(0,0,255);
	strokeWeight(2);
	noFill();
	rect(box.x,box.y,box.width,box.height);
	
	fill(255,255,255);
	stroke(0);
	strokeWeight(2);
	textSize(16);
	text(`Name: ${name}`,box.x,box.y-10);
				
	let accuracyPercent = Math.round((1-match.distance)*100**2)/100
	
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
		
		if (avgEAR <= maxBlinkThreshold) {
			stroke(0,255,0);
			ding();
			
			fetch("/",{
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					action: "face recognized",
					message: {"name": name,"date": fmtDate,"time": fmtTime,"accuracy": accuracyPercent,"unknown": name == "unknown"}
				})
			})
			.then(response=>response.json())
			.then(result=>{
				if (result.printToLogs) addToLogs(result.message,false);
			});
		} else {
			stroke(255,0,0);
		}
		
		//noStroke();
		noFill();
		//console.log(face);
		rect(FMBox.xMin * scaleX,FMBox.yMin * scaleY,FMBox.width * scaleX,FMBox.height * scaleY);
		
		// for (let k of leftEye) {
			// point(k.x * scaleX, k.y * scaleY)
		// }
		
		// for (let k of rightEye) {
			// point(k.x * scaleX, k.y * scaleY)
		// }
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
	let vWidth = track.width;
	let vHeight = track.height;
	
	aspectRatio = vWidth/vHeight;
	
	detectionInterval = setInterval(updateDetections,200);
}

// main p5 functions

function preload() {
	let modelsPath = "./models/face-api";
		
	Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
		faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
		faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
		faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
	]).then(async ()=>{
		addToLogs("Loaded models",false);
		
		let labeledImages = await loadLabeledImages();
		if (labeledImages.length > 0) {
			faceMatcher = new faceapi.FaceMatcher(labeledImages,maxRecognitionThreshold);
			addToLogs("Loaded FaceMatcher",false);
		} else {
			throw new Error("No labeled images found");
		}
	}).catch((err)=>{
		addToLogs(err,true);
	});
	
	faceMesh = ml5.faceMesh(faceMeshOptions);
}

function setup() {    
	//videoWidth = mainCanvas.getBoundingClientRect().width-8;
	videoWidth = targetVideoWidth;
	
	canvas = createCanvas(videoWidth,videoWidth/aspectRatio);
	video = createCapture(VIDEO,videoReady);
	video.hide();
	
	if (faceMesh) {
		faceMesh.detectStart(video, results=>{
			faceMeshResults = results;
		});
	}
}

function draw() {
	if (video && aspectRatio) {
		clear();

		videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,targetVideoWidth));
		videoWidth = targetVideoWidth;
		resizeCanvas(videoWidth,videoWidth/aspectRatio);
		
		image(video,0,0,width,height);

		if (detections.length > 0 && faceMeshResults.length > 0) {
			detections.forEach(detection=>faceRecognized(detection));
		}
	}
}

// events

screen.orientation.addEventListener("change",()=>{
	setTimeout(setup,500);
});