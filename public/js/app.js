$(document).ready(function() {
  // Initialize socket connection
  const socket = io();
  let currentUser = '';
  let selectedUser = '';
  
  // DOM elements
  const $loginScreen = $('#login-screen');
  const $usersScreen = $('#users-screen');
  const $chatScreen = $('#chat-screen');
  const $usernameInput = $('#username-input');
  const $connectBtn = $('#connect-btn');
  const $currentUsername = $('#current-username');
  const $onlineCount = $('#online-count');
  const $usersList = $('#users-list');
  const $searchUsers = $('#search-users');
  const $backBtn = $('#back-btn');
  const $chatWith = $('#chat-with');
  const $messagesContainer = $('#messages-container');
  const $messageInput = $('#message-input');
  const $sendMessage = $('#send-message');
  const $attachFile = $('#attach-file');
  const $sendImage = $('#send-image');
  const $emojiBtn = $('#emoji-btn');
  const $fileInput = $('#file-input');
  const $emojiPicker = $('#emoji-picker');
  const $closeEmoji = $('#close-emoji');
  const $toastContainer = $('#toast-container');
  
  // Connect to chat
  $connectBtn.on('click', function() {
    const username = $usernameInput.val().trim();
    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }
    
    currentUser = username;
    socket.emit('register', username);
  });
  
  // Handle Enter key in username input
  $usernameInput.on('keypress', function(e) {
    if (e.which === 13) {
      $connectBtn.click();
    }
  });
  
  // Socket events
  socket.on('error', function(message) {
    showToast(message, 'error');
  });
  
  socket.on('user-joined', function(data) {
    if (data.username !== currentUser) {
      showToast(`\${data.username} joined the chat`, 'info');
    }
    $onlineCount.text(data.count);
  });
  
  socket.on('user-left', function(data) {
    showToast(`\${data.username} left the chat`, 'info');
    $onlineCount.text(data.count);
  });
  
  socket.on('user-list', function(users) {
    $usersList.empty();
    $onlineCount.text(users.length);
    
    users.forEach(user => {
      if (user !== currentUser) {
        const $userCard = $(`
          <div class="user-card" data-username="\${user}">
            <div class="avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="username">\${user}</div>
            <div class="status">Online</div>
          </div>
        `);
        
        $userCard.on('click', function() {
          selectedUser = user;
          $chatWith.text(user);
          $messagesContainer.empty();
          switchScreen($chatScreen);
        });
        
        $usersList.append($userCard);
      }
    });
  });
  
  socket.on('message-received', function(data) {
    addMessage(data.from, data.message, 'received', data.timestamp);
  });
  
  socket.on('message-sent', function(data) {
    addMessage('You', data.message, 'sent', data.timestamp);
  });
  
  socket.on('file-received', function(data) {
    addFileMessage(data.from, data.fileName, data.fileData, data.size, 'received', data.timestamp);
  });
  
  socket.on('user-offline', function(data) {
    showToast(`\${data.to} is currently offline`, 'error');
  });
  
  // Chat functionality
  \$sendMessage.on('click', function() {
    sendMessage();
  });
  
  \$messageInput.on('keypress', function(e) {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  function sendMessage() {
    const message = \$messageInput.val().trim();
    if (message && selectedUser) {
      socket.emit('private-message', { to: selectedUser, message });
      \$messageInput.val('');
    } else if (!selectedUser) {
      showToast('Please select a user to chat with', 'error');
    }
  }
  
  // File sharing
  \$attachFile.on('click', function() {
    \$fileInput.click();
  });
  
  \$sendImage.on('click', function() {
    \$fileInput.attr('accept', 'image/*');
    \$fileInput.click();
  });
  
  \$fileInput.on('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileData = e.target.result;
        const fileName = file.name;
        const fileSize = formatFileSize(file.size);
        
        if (selectedUser) {
          socket.emit('file-upload', { 
            to: selectedUser, 
            fileName, 
            fileData, 
            size: fileSize 
          });
          
          addFileMessage('You', fileName, fileData, fileSize, 'sent');
        } else {
          showToast('Please select a user to share files with', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    \$(this).val('');
    \$fileInput.attr('accept', '*/*');
  });
  
  // Emoji picker
  \$emojiBtn.on('click', function() {
    \$emojiPicker.toggleClass('active');
  });
  
  \$closeEmoji.on('click', function() {
    \$emojiPicker.removeClass('active');
  });
  
  // Initialize emojis
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪',
    '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
    '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
    '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
    '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
    '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
    '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
    '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
    '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
    '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚',
    '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '👍','👎', 
    '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
    '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖',
    '👋', '🤏', '✊', '👊', '🤛', '🤜', '👏', '🙌'
  ];
  
  const $emojiBody = $('.emoji-body');
  emojis.forEach(emoji => {
    const $emoji = $(`<div class="emoji">${emoji}</div>`);
    $emoji.on('click', function() {
      $messageInput.val($messageInput.val() + emoji);
      $emojiPicker.removeClass('active');
    });
    $emojiBody.append($emoji);
  });
  
  // Navigation
  $backBtn.on('click', function() {
    switchScreen($usersScreen);
    selectedUser = '';
  });
  
  // Search users
  $searchUsers.on('input', function() {
    const searchTerm = $(this).val().toLowerCase();
    $('.user-card').each(function() {
      const username = $(this).data('username').toLowerCase();
      $(this).toggle(username.includes(searchTerm));
    });
  });
  
  // Helper functions
  function switchScreen(screen) {
    $('.screen').removeClass('active');
    screen.addClass('active');
  }
  
  function addMessage(sender, content, type, timestamp) {
    const $message = $(`
      <div class="message ${type}">
        <div class="sender">${sender}</div>
        <div class="content">${content}</div>
        <div class="timestamp">${timestamp}</div>
      </div>
    `);
    
    $messagesContainer.append($message);
    $messagesContainer.scrollTop($messagesContainer[0].scrollHeight);
  }
  
  function addFileMessage(sender, fileName, fileData, fileSize, type, timestamp) {
    const isImage = fileName.match(/\.(jpg|jpeg|png|gif)$/i);
    let fileContent = '';
    
    if (isImage) {
      fileContent = `<img src="${fileData}" alt="${fileName}" style="max-width: 100%; border-radius: 8px;">`;
    } else {
      fileContent = `
        <div class="file-info">
          <div class="file-icon">
            <i class="fas fa-file"></i>
          </div>
          <div class="file-details">
            <div class="file-name">${fileName}</div>
            <div class="file-size">${fileSize}</div>
          </div>
        </div>
      `;
    }
    
    const $message = $(`
      <div class="message file ${type}">
        <div class="sender">${sender}</div>
        <div class="content">${fileContent}</div>
        <div class="timestamp">${timestamp}</div>
      </div>
    `);
    
    // Add download link for non-image files
    if (!isImage) {
      const $downloadLink = $(`<a href="${fileData}" download="${fileName}" class="download-btn">Download</a>`);
      $message.find('.content').append($downloadLink);
    }
    
    $messagesContainer.append($message);
    $messagesContainer.scrollTop($messagesContainer[0].scrollHeight);
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function showToast(message, type = 'info') {
    const $toast = $(`
      <div class="toast ${type}">
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `);
    
    $toastContainer.append($toast);
    
    setTimeout(() => {
      $toast.animate({ opacity: 0 }, 300, function() {
        $(this).remove();
      });
    }, 3000);
  }
  
  // Initialize app
  $loginScreen.addClass('active');
});
