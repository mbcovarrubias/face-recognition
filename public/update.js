let baseUrl = "https://api.github.com/repos/mbcovarrubias/face-recognition/contents/"
let ignore = ["models","images","README.md","ding.mp3"] // files and folders to ignore

function update(url) { // fetches from github repository
	fetch(url)
	.then(response=>response.json())
	.then(data=>{
		if ("content" in data) {
			if (ignore.includes(data.name)) return;
			let dataToSend = {
				action: "update file",
				message: {
					path: data.path,
					content: atob(data.content)
				}
			}

			fetch("/",{
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(dataToSend)
			})
		} else {
			data.forEach(obj=>{
				if (ignore.includes(obj.name)) return;
				update(baseUrl + obj.path);
			});
		}
	})
	.catch(err=>console.error(err));
}