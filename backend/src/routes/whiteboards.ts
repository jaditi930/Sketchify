import express, { Request, Response } from 'express';
import Whiteboard from '../models/Whiteboard';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Generate a unique 8-character room ID
const generateRoomId = async (): Promise<string> => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let roomId: string;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate random 8-character string
    roomId = '';
    for (let i = 0; i < 8; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if it's unique
    const existing = await Whiteboard.findOne({ roomId });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return roomId!;
};

// Get all whiteboards for the authenticated user (owned or collaborated)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get whiteboards where user is owner or collaborator
    const whiteboards = await Whiteboard.find({
      $or: [
        { owner: userId },
        { 'collaborators.userId': userId },
      ],
    })
      .sort({ updatedAt: -1 })
      .select('-strokes') // Don't include strokes in list view
      .lean();

    // Ensure owner is a string for all whiteboards
    const whiteboardsData = whiteboards.map((wb: any) => ({
      ...wb,
      owner: String(wb.owner),
    }));

    res.json({ whiteboards: whiteboardsData });
  } catch (error: any) {
    console.error('Error fetching whiteboards:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboards' });
  }
});

// Invite a collaborator (must come before GET /:roomId to avoid route conflicts)
router.post('/:roomId/invite', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { email } = req.body;
    const userId = req.user!.id;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Only owner can invite
    if (whiteboard.owner !== userId) {
      res.status(403).json({ error: 'Only the owner can invite collaborators' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already a collaborator
    const isAlreadyCollaborator = whiteboard.collaborators.some(
      (c) => c.userId === String(user._id)
    );

    if (isAlreadyCollaborator) {
      res.status(400).json({ error: 'User is already a collaborator' });
      return;
    }

    // Check if trying to invite owner
    if (String(user._id) === whiteboard.owner) {
      res.status(400).json({ error: 'Owner cannot be invited as collaborator' });
      return;
    }

    // Add collaborator
    whiteboard.collaborators.push({
      userId: String(user._id),
      email: user.email,
      username: user.username,
      invitedAt: new Date(),
    });

    await whiteboard.save();

    // Ensure owner is a string
    const whiteboardData = whiteboard.toObject();
    whiteboardData.owner = String(whiteboardData.owner);

    res.json({ whiteboard: whiteboardData, message: 'Collaborator invited successfully' });
  } catch (error: any) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({ error: 'Failed to invite collaborator' });
  }
});

// Get a specific whiteboard
router.get('/:roomId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Check if user has access
    const hasAccess =
      whiteboard.owner === userId ||
      whiteboard.collaborators.some((c) => c.userId === userId) ||
      !whiteboard.isProtected; // Public whiteboards are accessible to all authenticated users

    if (!hasAccess) {
      res.status(403).json({ error: 'You do not have access to this whiteboard' });
      return;
    }

    // Ensure owner is a string
    const whiteboardData = whiteboard.toObject();
    whiteboardData.owner = String(whiteboardData.owner);
    
    res.json({ whiteboard: whiteboardData });
  } catch (error: any) {
    console.error('Error fetching whiteboard:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboard' });
  }
});

// Create a new whiteboard
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, isProtected } = req.body;
    const userId = req.user!.id;

    // Generate unique 8-character roomId
    const roomId = await generateRoomId();

    // Default name is the roomId, unless explicitly provided
    const whiteboardName = name || roomId;

    const whiteboard = new Whiteboard({
      roomId,
      name: whiteboardName,
      owner: userId,
      isProtected: isProtected !== undefined ? isProtected : true, // Default to protected (private)
      collaborators: [],
      strokes: [],
    });

    await whiteboard.save();

    // Ensure owner is a string
    const whiteboardData = whiteboard.toObject();
    whiteboardData.owner = String(whiteboardData.owner);

    res.status(201).json({ whiteboard: whiteboardData });
  } catch (error: any) {
    console.error('Error creating whiteboard:', error);
    res.status(500).json({ error: 'Failed to create whiteboard' });
  }
});

// Update whiteboard (name, protection status)
router.put('/:roomId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const { name, isProtected } = req.body;

    const whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Only owner can update
    if (whiteboard.owner !== userId) {
      res.status(403).json({ error: 'Only the owner can update this whiteboard' });
      return;
    }

    if (name !== undefined) whiteboard.name = name;
    if (isProtected !== undefined) whiteboard.isProtected = isProtected;

    await whiteboard.save();

    // Ensure owner is a string
    const whiteboardData = whiteboard.toObject();
    whiteboardData.owner = String(whiteboardData.owner);

    res.json({ whiteboard: whiteboardData });
  } catch (error: any) {
    console.error('Error updating whiteboard:', error);
    res.status(500).json({ error: 'Failed to update whiteboard' });
  }
});


// Remove a collaborator
router.delete('/:roomId/collaborators/:collaboratorId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, collaboratorId } = req.params;
    const userId = req.user!.id;

    const whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Only owner can remove collaborators
    if (whiteboard.owner !== userId) {
      res.status(403).json({ error: 'Only the owner can remove collaborators' });
      return;
    }

    whiteboard.collaborators = whiteboard.collaborators.filter(
      (c) => c.userId !== collaboratorId
    );

    await whiteboard.save();

    // Ensure owner is a string
    const whiteboardData = whiteboard.toObject();
    whiteboardData.owner = String(whiteboardData.owner);

    res.json({ whiteboard: whiteboardData, message: 'Collaborator removed successfully' });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Delete whiteboard
router.delete('/:roomId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Only owner can delete
    if (whiteboard.owner !== userId) {
      res.status(403).json({ error: 'Only the owner can delete this whiteboard' });
      return;
    }

    await Whiteboard.deleteOne({ roomId });

    res.json({ message: 'Whiteboard deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting whiteboard:', error);
    res.status(500).json({ error: 'Failed to delete whiteboard' });
  }
});

export default router;

