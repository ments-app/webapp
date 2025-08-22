// Utility functions for username handling

export function extractCleanUsername(user: { username?: string; email?: string }): string {
  // First try to get the username field
  if (user.username && typeof user.username === 'string') {
    // Clean the username - remove any non-alphanumeric characters except underscore
    const cleaned = user.username.replace(/[^a-zA-Z0-9_]/g, '');
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  
  // If no username, try to extract from email
  if (user.email && typeof user.email === 'string') {
    const emailPart = user.email.split('@')[0];
    if (emailPart) {
      // Clean the email part - remove any non-alphanumeric characters except underscore
      const cleaned = emailPart.replace(/[^a-zA-Z0-9_]/g, '');
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }
  
  // Fallback
  return 'user';
}

export function formatDisplayUsername(username: string): string {
  // Ensure username is clean for display
  return username.replace(/[^a-zA-Z0-9_]/g, '');
}