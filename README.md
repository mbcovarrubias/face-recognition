# face-recognition
WIP, some features may not work yet

## How to set up
1. download node.js and XAMPP if don't have
2. in XAMPP start the MySQL module
3. download and extract this repository anywhere. it's recommended to extract it in your user's directory.
4. open any shell (cmd, powershell, etc.) and change directory to where the face-recognition folder is located.
5. type "npm run hr" (hr is the alias for hard reset) in the shell you are using. this will ensure that the system works properly, especially when handling databases.
6. to start the system, type "npm run start" or "npm start"
7. a link that redirects to the facial recognition system will be provided if the command ran successfully 
8. if there are modules missing, install the missing module by using the "npm install" command, then repeat step 6
9. copy the link provided and paste it to a web browser

## for .env file
These are the keys used the .env file:
* PORT - port number (e.g. 3000)
* DB_HOST - using "localhost"
* DB_NAME - using "face-recognition"
* DB_USER - using "root"
* DB_PASSWORD - using ""
* AUTH_USER - your email
* AUTH_PASS - your app password
* GH_PAT - your github PAT
* GH_BASE_URL - using "https://api.github.com/repos/mbcovarrubias/face-recognition/contents/"
