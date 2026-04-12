import Report from '../models/report.model.js';
import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

export const createReport = async (req, res) => {
  try {
    const { reportedUser, conversationId, messageId, category, description = '' } = req.body;
    const reporterId = req.user.id || req.user._id;

    if (!reportedUser || !category) {
      return res.status(400).json({
        success: false,
        message: 'reportedUser and category are required'
      });
    }

    if (reporterId.toString() === reportedUser.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself'
      });
    }

    const targetUser = await User.findById(reportedUser).select('_id');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found'
      });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      const isParticipant = conversation.participants.some(
        (id) => id.toString() === reporterId.toString()
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to report in this conversation'
        });
      }
    }

    let message = null;
    if (messageId) {
      message = await Message.findById(messageId).select('conversation sender');
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      if (conversationId && message.conversation.toString() !== conversationId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Message does not belong to the provided conversation'
        });
      }
    }

    const existing = await Report.findOne({
      reporter: reporterId,
      reportedUser,
      conversation: conversationId || null,
      message: messageId || null,
      category,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already submitted a similar report that is still being processed'
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser,
      conversation: conversationId || null,
      message: messageId || null,
      category,
      description: description.trim()
    });

    await report.populate('reporter', 'username email avatar');
    await report.populate('reportedUser', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const reports = await Report.find({ reporter: userId })
      .populate('reportedUser', 'username email avatar')
      .populate('handledBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getReports = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const reports = await Report.find(filter)
      .populate('reporter', 'username email avatar')
      .populate('reportedUser', 'username email avatar')
      .populate('conversation', 'name type isGroup')
      .populate('message', 'content type fileName createdAt')
      .populate('handledBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Report.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { status, adminNote = '' } = req.body;
    const userId = req.user.id || req.user._id;

    if (!['pending', 'reviewing', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = status;
    report.adminNote = adminNote.trim();
    report.handledBy = userId;
    report.handledAt = new Date();

    await report.save();
    await report.populate('reporter', 'username email avatar');
    await report.populate('reportedUser', 'username email avatar');
    await report.populate('handledBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
