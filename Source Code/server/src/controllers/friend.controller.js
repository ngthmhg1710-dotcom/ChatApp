import User from '../models/user.model.js';
import { emitToUser } from '../sockets/index.js';

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Không thể tự gửi lời mời cho mình' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('username email avatar blockedUsers friends'),
      User.findById(userId),
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    if (targetUser.blockedUsers?.map((id) => id.toString()).includes(currentUserId)) {
      return res.status(403).json({ success: false, message: 'Không thể gửi lời mời cho người dùng này' });
    }

    if (targetUser.friends.map((id) => id.toString()).includes(currentUserId)) {
      return res.status(400).json({ success: false, message: 'Đã là bạn bè' });
    }

    const existingRequest = targetUser.friendRequests.find(
      (r) => r.from.toString() === currentUserId
    );
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Đã gửi lời mời rồi' });
    }

    targetUser.friendRequests.push({ from: currentUserId });
    await targetUser.save();

    const newRequest = targetUser.friendRequests[targetUser.friendRequests.length - 1];

    emitToUser(userId, 'friend_request_received', {
      request: {
        _id: newRequest._id.toString(),
        from: {
          _id: currentUser._id,
          username: currentUser.username,
          email: currentUser.email,
          avatar: currentUser.avatar,
        },
      },
    });

    emitToUser(currentUserId, 'friend_request_sent', {
      toUserId: userId,
      to: {
        _id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        avatar: targetUser.avatar,
      },
    });

    res.status(200).json({ success: true, message: 'Đã gửi lời mời kết bạn' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Cancel sent friend request
// @route   DELETE /api/friends/request/:userId
export const cancelFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('username email avatar'),
      User.findById(userId),
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const before = targetUser.friendRequests.length;
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (r) => r.from.toString() !== currentUserId
    );

    if (targetUser.friendRequests.length === before) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    await targetUser.save();

    emitToUser(userId, 'friend_request_cancelled', {
      fromUserId: currentUserId,
    });

    emitToUser(currentUserId, 'friend_request_cancelled_by_me', {
      toUserId: userId,
    });

    res.status(200).json({ success: true, message: 'Đã hủy lời mời kết bạn' });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Accept friend request
// @route   POST /api/friends/accept/:requestId
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const requestIndex = currentUser.friendRequests.findIndex(
      (r) => r._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    const fromUserId = currentUser.friendRequests[requestIndex].from;

    currentUser.friends.push(fromUserId);
    currentUser.friendRequests.splice(requestIndex, 1);
    await currentUser.save();

    await User.findByIdAndUpdate(fromUserId, { $push: { friends: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $pull: { formerFriends: fromUserId } });
    await User.findByIdAndUpdate(fromUserId, { $pull: { formerFriends: currentUserId } });

    emitToUser(fromUserId.toString(), 'friend_request_accepted', {
      user: req.user,
      byUserId: currentUserId,
    });

    emitToUser(currentUserId, 'friend_request_accept_synced', {
      userId: fromUserId.toString(),
    });

    res.status(200).json({ success: true, message: 'Đã chấp nhận lời mời kết bạn' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Reject friend request
// @route   POST /api/friends/reject/:requestId
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUser = await User.findById(req.user.id);
    const requestIndex = currentUser.friendRequests.findIndex(
      (r) => r._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    const fromUserId = currentUser.friendRequests[requestIndex].from.toString();

    currentUser.friendRequests.splice(requestIndex, 1);
    await currentUser.save();

    emitToUser(fromUserId, 'friend_request_rejected', {
      byUserId: req.user.id,
    });

    emitToUser(req.user.id, 'friend_request_reject_synced', {
      userId: fromUserId,
    });

    res.status(200).json({ success: true, message: 'Đã từ chối lời mời' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// @desc    Get friend requests
// @route   GET /api/friends/requests
export const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.from', 'username email avatar isOnline');

    res.status(200).json({ success: true, data: user.friendRequests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get friends list
// @route   GET /api/friends
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username email avatar bio isOnline lastSeen')
      .populate('formerFriends', 'username email avatar bio isOnline lastSeen');

    res.status(200).json({
      success: true,
      count: user.friends.length,
      data: user.friends,
      formerFriends: user.formerFriends || [],
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: friendId },
      $addToSet: { formerFriends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: currentUserId },
      $addToSet: { formerFriends: currentUserId },
    });

    emitToUser(friendId, 'friend_removed', { userId: currentUserId });
    emitToUser(currentUserId, 'friend_removed', { userId: friendId });

    res.status(200).json({ success: true, message: 'Đã xóa bạn bè' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Block user
// @route   POST /api/friends/block/:userId
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Không thể tự chặn mình' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const alreadyBlocked = currentUser.blockedUsers
      ?.map((id) => id.toString())
      .includes(userId);

    if (alreadyBlocked) {
      return res.status(400).json({ success: false, message: 'Đã chặn người dùng này' });
    }

    currentUser.blockedUsers.push(userId);
    currentUser.friends = currentUser.friends.filter((id) => id.toString() !== userId);
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (r) => r.from.toString() !== userId
    );

    targetUser.friends = targetUser.friends.filter(
      (id) => id.toString() !== currentUserId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (r) => r.from.toString() !== currentUserId
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    emitToUser(userId, 'blocked_by_user', { byUserId: currentUserId });
    emitToUser(currentUserId, 'i_blocked_user', { userId });
    emitToUser(userId, 'friend_removed', { userId: currentUserId });
    emitToUser(currentUserId, 'friend_removed', { userId });

    res.status(200).json({ success: true, message: 'Đã chặn người dùng' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Unblock user
// @route   DELETE /api/friends/block/:userId
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: userId },
    });

    emitToUser(userId, 'unblocked_by_user', { byUserId: currentUserId });
    emitToUser(currentUserId, 'i_unblocked_user', { userId });

    res.status(200).json({ success: true, message: 'Đã bỏ chặn người dùng' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get block status between current user and target
// @route   GET /api/friends/block-status/:userId
export const getBlockStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('blockedUsers friends friendRequests'),
      User.findById(userId).select('blockedUsers friends friendRequests'),
    ]);

    const iBlockedThem = currentUser.blockedUsers?.map(id => id.toString()).includes(userId) || false;
    const theyBlockedMe = targetUser.blockedUsers?.map(id => id.toString()).includes(currentUserId) || false;
    const isFriend = currentUser.friends?.map(id => id.toString()).includes(userId) || false;

    const receivedRequest = currentUser.friendRequests?.find(
      (r) => r.from.toString() === userId
    ) || null;

    const sentRequest = targetUser.friendRequests?.find(
      (r) => r.from.toString() === currentUserId
    ) || null;

    let friendReqStatus = 'none';
    let requestId = null;

    if (isFriend) {
      friendReqStatus = 'friends';
    } else if (receivedRequest) {
      friendReqStatus = 'received';
      requestId = receivedRequest._id.toString();
    } else if (sentRequest) {
      friendReqStatus = 'sent';
    }

    res.status(200).json({
      success: true,
      data: {
        iBlockedThem,
        theyBlockedMe,
        isFriend,
        friendReqStatus,
        requestId,
      },
    });
  } catch (error) {
    console.error('Get block status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
