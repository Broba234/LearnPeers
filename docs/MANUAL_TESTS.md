# Manual Test Instructions for LiveKit Screen Sharing

## Overview
This document outlines manual testing procedures for the LiveKit screen sharing functionality in the Eclero tutoring platform.

## Prerequisites
1. Two browsers/devices for testing (one for tutor, one for student)
2. Valid user accounts (one tutor, one student)
3. Active tutoring session
4. Screen sharing permissions granted in browsers

## Test Cases

### 1. Tutor Starts Screen Share, Student Sees Full-Screen Display

**Objective**: Verify that when a tutor shares their screen, the student can see the shared screen in full-screen display.

**Steps**:
1. **Setup**:
   - Log in as tutor in Browser A
   - Log in as student in Browser B
   - Create and join a tutoring session from both accounts

2. **Execute Test**:
   - In Browser A (Tutor):
     - Click "Share Screen" button in the video session sidebar
     - Select screen/window/tab to share when prompted
     - Grant screen sharing permission
   - In Browser B (Student):
     - Verify the shared screen appears automatically
     - Confirm the screen display takes up the main content area
     - Check that audio/video remains active in sidebar

3. **Expected Results**:
   - ✅ Tutor sees "Stop Sharing" button replace "Share Screen" 
   - ✅ Student's main view switches to screen share automatically
   - ✅ Student can see the shared content clearly
   - ✅ Video thumbnails remain visible in sidebar
   - ✅ Audio continues working during screen share

4. **Validation**:
   - Student can see real-time updates on tutor's screen
   - No lag or significant delay (< 2 seconds)
   - Screen share indicator visible on tutor's video thumbnail

---

### 2. Student Starts Screen Share, Tutor Sees Full-Screen Display (Vice Versa)

**Objective**: Verify screen sharing works in reverse direction (student to tutor).

**Steps**:
1. **Setup**:
   - Continue from previous test or start fresh session
   - Ensure both users are connected

2. **Execute Test**:
   - In Browser B (Student):
     - Click "Share Screen" button
     - Select content to share
     - Grant permissions
   - In Browser A (Tutor):
     - Verify shared screen appears automatically
     - Confirm full-screen display

3. **Expected Results**:
   - ✅ Student can successfully initiate screen sharing
   - ✅ Tutor receives screen share automatically
   - ✅ Both users maintain audio/video connection
   - ✅ UI updates correctly for both parties

---

### 3. Permission Denied Shows Alert, UI Recovers

**Objective**: Test error handling when screen sharing permission is denied.

**Steps**:
1. **Setup**:
   - Start fresh session with clean browser state
   - Ensure screen sharing permission is not pre-granted

2. **Execute Test**:
   - Click "Share Screen" button
   - **Deny** permission in browser dialog when prompted
   - Observe error handling

3. **Expected Results**:
   - ✅ Alert/notification shows permission denied error message
   - ✅ "Share Screen" button remains clickable (not stuck in loading state)
   - ✅ UI returns to normal state after error
   - ✅ User can retry screen sharing after fixing permissions
   - ✅ Other session functionality remains unaffected

4. **Error Message Validation**:
   - Error message is user-friendly and actionable
   - Suggests how to grant permissions and retry

---

### 4. Switching Between Whiteboard/File and Screen Keeps Audio/Video Intact

**Objective**: Verify that switching between different content views maintains stable audio/video connection.

**Steps**:
1. **Setup**:
   - Start session with active screen sharing
   - Ensure audio/video is working

2. **Execute Test Sequence**:
   - **Step A**: Switch from screen share to whiteboard
     - Click "Whiteboard" button in sidebar
     - Verify whiteboard loads correctly
     - Confirm audio/video continues
   
   - **Step B**: Switch from whiteboard to file view
     - Upload a file using "Share File" 
     - Click "View File" button
     - Verify file displays correctly
   
   - **Step C**: Switch back to screen share
     - Click "View Screen" button
     - Verify screen share resumes correctly

3. **Expected Results**:
   - ✅ Audio stream never interrupts during view switches
   - ✅ Video thumbnails remain visible and active
   - ✅ Screen sharing continues in background when not viewing
   - ✅ All view transitions are smooth (< 1 second)
   - ✅ No reconnection or loading states during switches
   - ✅ Collaborative features (whiteboard sync, file sharing) work correctly

4. **Additional Validation**:
   - Screen share remains active even when viewing other content
   - Multiple screen shares can be managed if multiple users share
   - Switching between different screen shares works correctly

## Browser Compatibility Testing

### Test Each Scenario In:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari 16+ (macOS)
- [ ] Edge (latest)

### Mobile Testing Note:
Screen sharing is not supported on mobile browsers by design. Verify graceful degradation:
- [ ] Mobile users see disabled/hidden screen share buttons
- [ ] Mobile users can still view others' screen shares
- [ ] Mobile users receive appropriate messaging about screen share limitations

## Performance & Quality Checks

### During Each Test:
- [ ] Check network tab for unusual traffic
- [ ] Monitor CPU usage during screen sharing
- [ ] Verify screen share quality is acceptable
- [ ] Test with different screen resolutions
- [ ] Test with multiple monitors (if available)

## Troubleshooting Common Issues

### If Screen Share Fails:
1. Check browser permissions in settings
2. Verify LiveKit server connection
3. Check browser console for errors
4. Test with incognito/private browsing mode
5. Verify network connectivity and firewall settings

### If UI Becomes Unresponsive:
1. Check browser console for JavaScript errors
2. Verify React state management is working
3. Test component re-renders during state changes
4. Check for memory leaks during extended sessions

## Test Environment Notes
- Use latest browser versions for accurate testing
- Test on different network conditions (WiFi, ethernet, mobile data)
- Consider testing with browser developer tools open for debugging
- Document any browser-specific behaviors or limitations

---

*Last Updated: $(date)*
*For Technical Issues: Check browser console and network tab for detailed error information*
