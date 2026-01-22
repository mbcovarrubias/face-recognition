# face-recognition
WIP, some features may not work yet


## Libraries used
* face-api.js by justadudewhohacks https://github.com/justadudewhohacks/face-api.js
* p5.js
## Required software
* Node.js
* XAMPP
## How to set up
1. Download necessary software
2. In XAMPP start the MySQL module
3. Download this repository and extract its zip file anywhere. It is recommended to extract it in your user folder.
4. Create .env file in the main folder (where public and views folder are located). See "For .env file" below.
5. Open any command line program (cmd, powershell, etc.) then change directory to the main folder.
6. Type "npm run hr" (hr is the alias for hard reset) in the shell you are using. this will ensure that the system works properly, especially when handling databases.
7. To start the application, type "npm run start" or "npm start"
8. A link that redirects to the facial recognition system will be provided if the command ran successfully 
9. If there are modules missing, install the missing module by using the "npm install" command, then try starting the application again.
10. Copy the link provided and paste it to a web browser.

## For .env file
These are the keys used in the .env file:
* PORT - port number (e.g. 3000)
* DB_HOST - using "localhost"
* DB_NAME - using "face-recognition"
* DB_USER - using "root"
* DB_PASSWORD - using ""
* AUTH_USER - your email
* AUTH_PASS - your app password
* GH_PAT - your github PAT
* GH_BASE_URL - using "https://api.github.com/repos/mbcovarrubias/face-recognition/contents/"
