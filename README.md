# AI Air Drawing

Draw in the air with your hand. No mouse, no stylus, no touch screen: just a webcam.

AI Air Drawing is a touchless digital whiteboard. It tracks 21 points on your hand in real time, understands your finger gestures, and turns your index fingertip into a pen on an HTML5 canvas. You can sign in and save your drawings to your own cloud gallery.

**Live demo:** _add your Vercel link here_

---

## Features

- Real-time hand tracking in the browser (no video is sent to any server)
- Draw, lift the pen, clear, save, and pause, all with hand gestures
- Smooth strokes with jitter removal and curved line drawing
- Colours, brush sizes, eraser, undo and redo
- Pick tools by hovering your fingertip over the toolbar
- Open palm clear with a 1 second hold, and it can be undone
- Live hand skeleton overlay and a Vision Debug panel
- User accounts with secure login (JWT in an HTTP-only cookie)
- Personal gallery with thumbnails: open, rename, download, delete

## Gestures

| Gesture | Fingers | Action |
|---|---|---|
| ☝️ Draw | Index finger up | Draws at the fingertip |
| ✌️ Tools | Index + middle up | Pen lift: move or hover over tools |
| ✋ Clear | Open palm, hold 1 second | Clears the canvas (undoable) |
| 👍 Save | Thumb up, others curled | Downloads and saves to your gallery |
| ✊ Pause | Closed fist | Rest your hand, nothing happens |

**Tips:** keep your hand 40–60 cm from the camera, with light on your hand from the front, and use one hand at a time.

## How it works

```
Webcam -> MediaPipe Hand Landmarker -> 21 hand points -> Gesture detection
       -> Smoothing -> Canvas drawing -> Save to MongoDB
```

1. The webcam feed goes to Google MediaPipe, which runs a trained hand model inside the browser (WebAssembly + GPU, with CPU fallback).
2. The model returns 21 landmarks for the hand on every frame.
3. Joint angles decide which fingers are up, and that decides the gesture.
4. A gesture must stay stable for a few frames before it counts, so it does not flicker.
5. The index fingertip position is mirrored, smoothed, and drawn on the canvas.
6. Saved drawings are compressed, given a thumbnail, and stored in your account.

## Tech stack

**Frontend:** React, Vite, Tailwind CSS, React Router, MediaPipe Tasks Vision, HTML5 Canvas

**Backend:** Node.js, Express, MongoDB with Mongoose, JWT, bcryptjs, cookie-parser, helmet, express-rate-limit

## Project structure

```
AI-AIR-DRAWING/
├── src/                 # React frontend
│   ├── components/      # Camera, canvas, toolbar, navbar, gesture guide
│   ├── pages/           # Draw, Dashboard, My Drawings, Login, Register
│   ├── hooks/           # useCamera, useHandTracking
│   ├── utils/           # gesture detection, drawing, coordinates
│   ├── context/         # Auth context
│   └── services/        # API helper
├── backend/             # Express API
│   ├── config/          # MongoDB connection
│   ├── controllers/     # auth, drawings
│   ├── middleware/      # auth guard, error handling
│   ├── models/          # User, Drawing
│   ├── routes/          # /api/auth, /api/drawings
│   └── server.js
├── public/
└── vercel.json
```

## Run locally

You need Node.js 18 or newer and a MongoDB Atlas connection string.

**1. Clone**

```
git clone https://github.com/Maurya8920/AI-AIR-DRAWING.git
cd AI-AIR-DRAWING
```

**2. Backend**

```
cd backend
npm install
copy .env.example .env
```

Open `backend/.env` and fill in your values:

```
PORT=5000
MONGO_URI=your-mongodb-atlas-connection-string
JWT_SECRET=a-long-random-string
CLIENT_URL=http://localhost:5173
```

Then start it:

```
npm run dev
```

Wait for `MongoDB Connected`.

**3. Frontend** (in a second terminal, from the project root)

```
npm install
npm run dev
```

Open `http://localhost:5173` and allow camera access.

## API

**Auth: `/api/auth`**

| Method | Route | Purpose |
|---|---|---|
| POST | `/register` | Create an account (name, email, password) |
| POST | `/login` | Log in and receive the auth cookie |
| POST | `/logout` | Clear the auth cookie |
| GET | `/me` | Get the logged-in user |

**Drawings: `/api/drawings`** (login required)

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | List your drawings (thumbnails only) |
| GET | `/:id` | Get one drawing with the full image |
| POST | `/` | Save a new drawing |
| PUT | `/:id` | Update the title or image |
| DELETE | `/:id` | Delete a drawing |

## Deployment

- **Database:** MongoDB Atlas
- **Backend:** Render (root directory `backend`, start command `npm start`)
- **Frontend:** Vercel (Vite, output `dist`). `vercel.json` forwards `/api` calls to the backend.

The camera only works on HTTPS or on localhost.

## Troubleshooting

- **`bad auth : authentication failed`**: wrong database username or password in `MONGO_URI`.
- **`buffering timed out`**: the backend is not connected to MongoDB, or an old backend process is still running. Stop all node processes and restart.
- **Gestures misfire**: improve the lighting on your hand and turn on the Vision Debug panel to see which fingers are read as up.

## Author

Naman Maurya ([@Maurya8920](https://github.com/Maurya8920))
