# Pea Pods — GitHub & Railway Setup

## PART 1 — GitHub (App Repository)

### Step 1 — Create the main app repository
1. Go to github.com and sign in
2. Click + → New repository
3. Name it: pea-pods
4. Set to Private
5. Click Create repository

### Step 2 — Push your code to GitHub
In Command Prompt, navigate to your app folder:

    cd C:\Users\mrlau\Downloads\CoPea\copea-plus

Then run these commands one at a time:

    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/pea-pods.git
    git add .
    git commit -m "Pea Pods v1.0"
    git push -u origin main

Replace YOUR_GITHUB_USERNAME with your actual GitHub username.

---

## PART 2 — GitHub (Server Repository)

### Step 1 — Create the server repository
1. On GitHub click + → New repository
2. Name it: pea-pods-server
3. Set to Public (Railway needs to read it)
4. Click Create repository

### Step 2 — Upload server files
1. Open File Explorer
2. Go to C:\Users\mrlau\Downloads\CoPea\copea-plus\server
3. You will see index.js and package.json
4. Drag both files into the pea-pods-server repository on GitHub
5. Click Commit changes

---

## PART 3 — Railway (Signaling Server)

### Step 1 — Create Railway account
1. Go to railway.app
2. Click Sign Up with GitHub
3. Authorise Railway to access your GitHub

### Step 2 — Deploy the server
1. Click New Project
2. Click Deploy from GitHub repo
3. Select pea-pods-server
4. Railway detects it is Node.js and deploys automatically
5. Wait about 2 minutes

### Step 3 — Get your server URL
1. Click on your project
2. Click Settings
3. Click Networking
4. Click Generate Domain
5. Copy the URL — looks like: something.up.railway.app

### Step 4 — Update config.js
Open C:\Users\mrlau\Downloads\CoPea\copea-plus\config.js in Notepad.
Find this line:

    SIGNAL_SERVER: 'wss://REPLACE_WITH_YOUR_RAILWAY_URL.up.railway.app',

Replace with your actual URL — must start with wss://:

    SIGNAL_SERVER: 'wss://your-actual-url.up.railway.app',

Save the file.

---

## PART 4 — File Paths Reference

| What | Path |
|---|---|
| App code | C:\Users\mrlau\Downloads\CoPea\copea-plus |
| Config file (API keys) | C:\Users\mrlau\Downloads\CoPea\copea-plus\config.js |
| Character images | C:\Users\mrlau\Downloads\CoPea\copea-plus\assets\characters |
| App icon | C:\Users\mrlau\Downloads\CoPea\copea-plus\assets\icon.png |
| Logo image | C:\Users\mrlau\Downloads\CoPea\copea-plus\assets\PeaPods_title.png |
| Intro video | C:\Users\mrlau\Downloads\CoPea\copea-plus\assets\intro.mp4 |
| Server files | C:\Users\mrlau\Downloads\CoPea\copea-plus\server |

---

## PART 5 — Build Commands

Navigate to app folder:

    cd C:\Users\mrlau\Downloads\CoPea\copea-plus

Install dependencies:

    npm install

Build for iPhone:

    eas build --platform ios --profile development

Build for App Store:

    eas build --platform ios --profile production

Submit to App Store:

    eas submit --platform ios

