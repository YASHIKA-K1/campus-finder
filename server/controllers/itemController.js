const Item = require('../models/itemModel.js');
const { generateEmbedding } = require('../services/ai.service.js');

const createItem = async (req, res) => {
    try {
        const { itemType, category, color, description, location } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image.' });
        }
        
        const parsedLocation = JSON.parse(location);
        const imageUrl = req.file.path.startsWith('http') 
            ? req.file.path 
            : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.file.filename}`;
        
        let imageEmbedding = null;
        try {
            const generated = await generateEmbedding(imageUrl);
            if (generated?.length > 0) {
                imageEmbedding = generated;
            }
        } catch (err) {
            console.error('Error generating image embedding:', err);
        }
        
        const itemDoc = {
            itemType,
            category,
            color,
            description,
            location: parsedLocation,
            user: req.user._id,
            imageUrl,
            imagePublicId: req.file.filename,
        };
        
        if (imageEmbedding?.length > 0) {
            itemDoc.imageEmbedding = imageEmbedding;
            itemDoc.embeddingStatus = 'success';
        }
        
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
        const items = await Item.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .lean();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyItems = async (req, res) => {
    try {
        const items = await Item.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
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