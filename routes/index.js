const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  homeController.home(req, res);
});

module.exports = router;
