# StudentHub — C++ Student Record Management Website

A local web application that keeps the C++ backend and `students.txt` storage. Features: add, view, search, update and delete students; input validation; dashboard totals and averages.

## Project structure

```text
StudentRecordWebsite/
├── server.cpp
├── httplib.h          # download in Step 2
├── json.hpp           # download in Step 2
├── students.txt       # created/updated by the backend
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Step 1 — Install prerequisites

1. Install a C++ compiler. On Windows, MinGW-w64 via MSYS2 is a good choice. Make sure `g++ --version` works in the VS Code terminal.
2. Install the VS Code **C/C++** extension.
3. Open this project folder in VS Code.

## Step 2 — Add the two single-header libraries

The C++ HTTP server uses cpp-httplib and JSON for Modern C++.

Download the files from their official repositories and save them in the project root, next to `server.cpp`:

- `httplib.h`: https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
- `json.hpp`: https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp

In PowerShell opened at the project root, you can download them with:

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h -OutFile httplib.h
Invoke-WebRequest https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp -OutFile json.hpp
```

You need an internet connection for this one-time download. The app itself runs locally afterwards.

## Step 3 — Compile

In VS Code, choose **Terminal → New Terminal**. Confirm the terminal is in the project root, then run:

```powershell
g++ -std=c++17 server.cpp -o server.exe -lws2_32 -lwsock32
```

If your compiler is installed in a different environment, use its matching terminal. The `-lws2_32 -lwsock32` flags are for Windows MinGW.

## Step 4 — Start the backend

```powershell
.\server.exe
```

You should see:

```text
Student Record Management System running at http://localhost:8080
Keep this terminal open while using the website. Press Ctrl+C to stop.
```

Keep that terminal open.

## Step 5 — Open the website

Open this address in Chrome or Edge:

**http://localhost:8080**

Do not open `public/index.html` directly, and do not use the VS Code Live Server extension for this project. The page needs to be served by the C++ backend so that `/api/students` works.

## Step 6 — Test every feature

1. Click **Add student**.
2. Enter roll number `101`, name `Asha Rao`, marks `86`, attendance `92`.
3. Save and confirm the row and dashboard numbers update.
4. Add another student and try searching by name or roll number.
5. Click **Edit** to update marks or attendance.
6. Click **Delete** and confirm.
7. Stop the server with Ctrl+C and run `.\server.exe` again. Your saved records should still be there.

## Data storage and notes

- The backend reads and writes `students.txt` in the folder where `server.exe` is launched. Run it from this project root.
- Each line uses `rollNo,name,marks,attendance`. Names containing commas are rejected so records can be parsed safely.
- This is a local student project server, not hardened for public internet deployment. It has no login/authentication and should not be exposed to the internet.
- If port 8080 is occupied, change `8080` in `server.cpp`, recompile, and open the new port in your browser.
- If Windows Firewall asks about network access, allow only the access you need. For local use, localhost is enough.
