const express = require("express");
const router = express.Router();
const chatList = require("../controllers/chat_list_controller");

router.get("/:userId", chatList.getRecentChats);

module.exports = router;
