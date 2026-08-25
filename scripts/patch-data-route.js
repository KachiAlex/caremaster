#!/usr/bin/env node
/**
 * Patch data.js on the VPS to fix WRITABLE_FIELDS and valid tables
 * for messaging, calls, call_notifications, and signaling.
 */
const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add 'signaling' to VALID_TABLES array
if (!content.includes("'signaling'")) {
  content = content.replace(
    "'loginLogs',",
    "'loginLogs',\n  'signaling',"
  );
  console.log("Added 'signaling' to valid tables list");
}

// 2. Fix WRITABLE_FIELDS for conversations
content = content.replace(
  "conversations: ['participant1_id', 'participant2_id', 'last_message_at'],",
  "conversations: ['participants', 'conversation_type', 'type', 'title', 'last_message_at', 'last_message_preview', 'institution_id', 'last_message', 'last_message_time'],"
);

// 3. Fix WRITABLE_FIELDS for messages
content = content.replace(
  "messages: ['sender_id', 'recipient_id', 'content', 'read'],",
  "messages: ['conversation_id', 'sender_id', 'receiver_id', 'recipient_id', 'content', 'text', 'message_type', 'attachments', 'read', 'sent_at', 'read_at', 'created_at'],"
);

// 4. Fix WRITABLE_FIELDS for calls
content = content.replace(
  "calls: ['caller_id', 'recipient_id', 'status', 'duration', 'started_at', 'ended_at'],",
  "calls: ['call_id', 'caller_id', 'recipient_id', 'receiver_id', 'call_type', 'type', 'caller_name', 'recipient_name', 'status', 'duration', 'duration_seconds', 'started_at', 'ended_at', 'answered_at', 'participants', 'institution_id', 'created_at'],"
);

// 5. Add WRITABLE_FIELDS for call_notifications (not currently defined)
// Find the line with 'elderly_profiles' and add call_notifications after it
if (!content.includes("call_notifications:")) {
  content = content.replace(
    "elderly_profiles: ['client_id', 'medical_conditions', 'allergies', 'dietary_requirements', 'mobility_status', 'notes']",
    "elderly_profiles: ['client_id', 'medical_conditions', 'allergies', 'dietary_requirements', 'mobility_status', 'notes'],\n  call_notifications: ['user_id', 'call_id', 'caller_id', 'caller_name', 'recipient_id', 'recipient_name', 'call_type', 'status', 'duration', 'metadata', 'timestamp', 'created_at', 'updated_at'],\n  signaling: ['call_id', 'type', 'sdp', 'candidate', 'from', 'from_user_id', 'timestamp', 'created_at']"
  );
  console.log("Added WRITABLE_FIELDS for call_notifications and signaling");
}

// 6. Add 'signaling' to SORTABLE_COLUMNS if not present
if (!content.includes("signaling:")) {
  // Find the end of SORTABLE_COLUMNS object and add signaling
  content = content.replace(
    /(\n};\n\n\/\/ Map frontend collection names)/,
    "\n  signaling: ['id', 'call_id', 'type', 'timestamp', 'created_at'],\n  call_notifications: ['id', 'user_id', 'call_id', 'status', 'created_at', 'timestamp'],\n$1"
  );
  console.log("Added sortable columns for signaling and call_notifications");
}

fs.writeFileSync(path, content);
console.log('data.js patched successfully.');
