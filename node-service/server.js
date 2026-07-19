const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:admin@cluster0.gyurphn.mongodb.net/semendproject?appName=Cluster0";

let useFallback = false;
const COMMENTS_FILE = path.join(__dirname, "comments_db.json");
const LIKES_FILE = path.join(__dirname, "likes_db.json");

// Helper to initialize fallback JSON files if they don't exist
if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(LIKES_FILE)) {
    fs.writeFileSync(LIKES_FILE, JSON.stringify({}));
}

// Mongoose Schemas (Used when MongoDB is online)
const CommentSchema = new mongoose.Schema({
    postId: String,
    author: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const LikeSchema = new mongoose.Schema({
    postId: String,
    likes: { type: Number, default: 0 },
    likedBy: [String] // List of emails who liked it
});

const Comment = mongoose.model("Comment", CommentSchema);
const Like = mongoose.model("Like", LikeSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB successfully!");
    })
    .catch((err) => {
        console.warn("MongoDB connection failed! Falling back to file-based JSON storage.");
        console.error(err.message);
        useFallback = true;
    });

// Fallback operations helpers
function getCommentsFallback(postId) {
    try {
        const raw = fs.readFileSync(COMMENTS_FILE);
        const data = JSON.parse(raw);
        return data.filter(c => c.postId === String(postId));
    } catch (e) {
        return [];
    }
}

function addCommentFallback(postId, author, content) {
    try {
        const raw = fs.readFileSync(COMMENTS_FILE);
        const data = JSON.parse(raw);
        const newComment = {
            id: Date.now().toString(),
            postId: String(postId),
            author: author || "Anonymous Reader",
            content: content,
            createdAt: new Date()
        };
        data.push(newComment);
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2));
        return newComment;
    } catch (e) {
        return null;
    }
}

function getLikesFallback(postId) {
    try {
        const raw = fs.readFileSync(LIKES_FILE);
        const data = JSON.parse(raw);
        const item = data[String(postId)] || { likes: 0, likedBy: [] };
        return item;
    } catch (e) {
        return { likes: 0, likedBy: [] };
    }
}

function toggleLikeFallback(postId, userEmail) {
    try {
        const raw = fs.readFileSync(LIKES_FILE);
        const data = JSON.parse(raw);
        const item = data[String(postId)] || { likes: 0, likedBy: [] };
        
        const index = item.likedBy.indexOf(userEmail);
        if (index === -1) {
            // Like
            item.likedBy.push(userEmail);
            item.likes += 1;
        } else {
            // Unlike
            item.likedBy.splice(index, 1);
            item.likes = Math.max(0, item.likes - 1);
        }
        data[String(postId)] = item;
        fs.writeFileSync(LIKES_FILE, JSON.stringify(data, null, 2));
        return item;
    } catch (e) {
        return null;
    }
}


// --- API ENDPOINTS ---

// COMMENTS API
app.get("/api/comments/:postId", async (req, res) => {
    const { postId } = req.params;
    if (useFallback) {
        return res.json(getCommentsFallback(postId));
    }
    try {
        const comments = await Comment.find({ postId }).sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/comments/:postId", async (req, res) => {
    const { postId } = req.params;
    const { author, content } = req.body;
    
    if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    if (useFallback) {
        const comment = addCommentFallback(postId, author, content);
        return res.status(201).json(comment);
    }

    try {
        const comment = new Comment({
            postId,
            author: author || "Anonymous Reader",
            content
        });
        await comment.save();
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LIKES API
app.get("/api/likes/:postId", async (req, res) => {
    const { postId } = req.params;
    if (useFallback) {
        return res.json(getLikesFallback(postId));
    }
    try {
        let likeInfo = await Like.findOne({ postId });
        if (!likeInfo) {
            likeInfo = { likes: 0, likedBy: [] };
        }
        res.json(likeInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/likes/:postId", async (req, res) => {
    const { postId } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({ error: "User email is required to toggle like" });
    }

    if (useFallback) {
        const likeInfo = toggleLikeFallback(postId, userEmail);
        return res.json(likeInfo);
    }

    try {
        let likeInfo = await Like.findOne({ postId });
        if (!likeInfo) {
            likeInfo = new Like({ postId, likes: 0, likedBy: [] });
        }

        const index = likeInfo.likedBy.indexOf(userEmail);
        if (index === -1) {
            likeInfo.likedBy.push(userEmail);
            likeInfo.likes += 1;
        } else {
            likeInfo.likedBy.splice(index, 1);
            likeInfo.likes = Math.max(0, likeInfo.likes - 1);
        }

        await likeInfo.save();
        res.json(likeInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Healthcheck
app.get("/", (req, res) => {
    res.send({
        status: "Node.js Comments/Likes Service Running",
        dbMode: useFallback ? "JSON File Fallback" : "MongoDB Server"
    });
});

app.listen(PORT, () => {
    console.log(`Node.js service listening on port ${PORT}`);
});
