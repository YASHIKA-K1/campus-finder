const express = require('express');
const router = express.Router();
const { 
    createItem, 
    getActiveItems, 
    getMyItems, 
    updateItemStatus 
} = require('../controllers/itemController.js');
const { protect } = require('../middleware/protect.js');
const upload = require('../config.js');

router.route('/')
  .get(getActiveItems)
  .post(protect, upload.single('image'), createItem);

router.route('/my-items').get(protect, getMyItems);
router.route('/:id/status').put(protect, updateItemStatus);

module.exports = router;