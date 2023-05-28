const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("index.html", {foo:'bar'})
});

module.exports = router;