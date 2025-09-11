// /server/controllers/itemController.js
const Item = require('../models/itemModel.js');
const { generateEmbedding } = require('../services/ai.service.js');


const createItem = async (req, res) => {
    try {
        const { itemType, category, color, description, location } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image.' });
        }
        const parsedLocation = JSON.parse(location);
        let imageEmbedding = null;
        try {
            // Use the Cloudinary URL instead of local file path
            const imageUrl = req.file.path.startsWith('http') ? req.file.path : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`;
            console.log('[Item Creation] Generating embedding for:', imageUrl);
            const generated = await generateEmbedding(imageUrl);
            if (generated && generated.length > 0) {
                imageEmbedding = generated;
                console.log('[Item Creation] Successfully generated embedding with length:', imageEmbedding.length);
            } else {
                console.warn('[Item Creation] No embedding generated - AI service may have failed');
            }
        } catch (err) {
            console.error('[Item Creation] Error generating image embedding:', err);
        }
        const itemDoc = {
            itemType,
            category,
            color,
            description,
            location: parsedLocation,
            user: req.user._id,
            imageUrl: req.file.path.startsWith('http') ? req.file.path : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`,
            imagePublicId: req.file.filename,
        };
        if (imageEmbedding && imageEmbedding.length > 0) {
            itemDoc.imageEmbedding = imageEmbedding;
            itemDoc.embeddingStatus = 'success';
        }
        // If no embedding yet, leave as pending to be picked by background job
        const item = new Item(itemDoc);
        const createdItem = await item.save();
        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Error in createItem controller:', error);
        res.status(500).json({ message: 'Server Error during item creation.' });
    }
};

const getActiveItems = async (req, res) => {
    try {
        const items = await Item.find({ status: 'active' }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyItems = async (req, res) => {
    try {
        const items = await Item.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateItemStatus = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        item.status = 'reunited';
        const updatedItem = await item.save();
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
    
module.exports = { 
    createItem, 
    getActiveItems, 
    getMyItems, 
    updateItemStatus,
};
