let mainCanvas = document.getElementById("canvas");
let logs = document.getElementById("logs");

let maxCaptures = 10;
let targetVideoWidth = 300;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let aspectRatio;
let canvas;
let video;
let detectionInterval;
let faceMatcher;

let detections = [];
let lastTick = {};

let detectionOptions = new faceapi.TinyFaceDetectorOptions();

function ding() {
	let audio = new Audio("ding.mp3");
	audio.play();
}

function isUsingTouchscreen() {
	let hasTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
	let prefersCoarsePointer = window.matchMedia("(any-pointer: coarse)").matches;

	return hasTouchEvents && prefersCoarsePointer;
}

function addToLogs(text,error) {
	let textElt = document.createElement("span");
	textElt.innerHTML = text;
	textElt.className = "line";
	
	if (error) textElt.style.color = "red";
	
	logs.appendChild(textElt);
}

async function loadLabeledImages() {
	const response = await fetch("/",{
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			action: "get registered users",
			message: {}
		})
	});
	
	const labels = await response.json();
	return Promise.all(
		labels.map(async (label) => {
			const descriptors = [];
			for (let i = 0; i < maxCaptures; i++) {
				const img = await faceapi.fetchImage(`/images/${label}_${i}.jpg`);
				const singleFaceDescription = await faceapi.detectSingleFace(img, detectionOptions).withFaceLandmarks().withFaceDescriptor();
				if (singleFaceDescription) {
					descriptors.push(singleFaceDescription.descriptor);
				}
			}
			return new faceapi.LabeledFaceDescriptors(label,descriptors);
		})
	)
}

function faceRecognized(match) {
	let accuracyPercent = Math.round((1-match.distance)*100**2)/100
	let name = match.label
	if (!lastTick.hasOwnProperty(name)) lastTick[name] = 0;
	
	if(Date.now()-lastTick[name] >= 1000) {
		let pad = n=>n.toString().padStart(2,"0");
	
		let now = new Date();
		let year = now.getFullYear();
		let month = pad(now.getMonth()+1);
		let day = pad(now.getDate());
		
		let hours = pad(now.getHours());
		let minutes = pad(now.getMinutes());
		let seconds = pad(now.getSeconds());
		
		let formattedDate = `${year}-${month}-${day}`;
		let formattedTime = `${hours}:${minutes}:${seconds}`;
		
		fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "face recognized",
				message: {
					"name": name,
					"date": formattedDate,
					"time": formattedTime,
					"accuracy": accuracyPercent,
					"unknown": name == "unknown"
				}
			})
		})
		.then(response=>response.json())
		.then(result=>{
			if (result.printToLogs) addToLogs(result.message,false);
		});
		
		ding();
		
		lastTick[name] = Date.now();
	}
}
async function preload() {
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

	addToLogs("Loaded models",false);
	
	try {
		const labeledImages = await loadLabeledImages();
		
		if (labeledImages.length > 0) {
			faceMatcher = new faceapi.FaceMatcher(labeledImages);
			addToLogs("Loaded FaceMatcher",false);
		} else {
			throw new Error("No labeled images found");
		}
	} catch (err) {
		addToLogs(err,true);
	}
}

async function setup() {    
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth);
	
	video = createCapture(VIDEO,videoReady);
	video.size(width,height);
	video.hide();
	
	//initLiveness();
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

		image(video,0,0);

		//if (isLive && detections) {
		if (detections) {
			detections.forEach((detection)=>{
				const box = detection.detection.detection.box;
				
				stroke(0,0,255);
				strokeWeight(2);
				noFill();
				rect(box.x,box.y,box.width,box.height);
				
				fill(255,255,255);
				stroke(0);
				strokeWeight(2);
				textSize(16);
				text(detection.bestMatch.toString(),box.x,box.y-10);
				
				faceRecognized(detection.bestMatch);
			});
		}
	}
}

setInterval(async ()=>{
	if (video.loadedmetadata && faceMatcher) {
		let DWLM = await faceapi.detectAllFaces(video.elt,detectionOptions).withFaceLandmarks().withFaceDescriptors();
		DWLM = faceapi.resizeResults(DWLM,{ width: width, height: height });
		
		detections = DWLM.map((detection)=>{
			const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
			return {
				detection,
				bestMatch
			};
		});
	}
},500);