export function welcomeEmail(name: string, role: string): string {
  const roleMessage =
    role === "HOST"
      ? `<p>You're registered as a <strong>Host</strong>. Start by creating your first listing!</p>
         <a href="http://localhost:3000/listings" style="background:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Create Your First Listing</a>`
      : `<p>You're registered as a <strong>Guest</strong>. Explore listings and find your perfect stay!</p>
         <a href="http://localhost:3000/listings" style="background:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Explore Listings</a>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Welcome to Airbnb, ${name}!</h1>
      <p>We're excited to have you on board.</p>
      ${roleMessage}
      <p style="margin-top:24px;color:#888;">The Airbnb Team</p>
    </div>
  `;
}

export function bookingConfirmationEmail(
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Confirmed!</h1>
      <p>Hi ${guestName}, your booking has been confirmed.</p>
      <div style="background:#f9f9f9;padding:20px;border-radius:8px;margin:20px 0;">
        <h2 style="margin:0 0 12px;">${listingTitle}</h2>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p><strong>Total Price:</strong> $${totalPrice}</p>
      </div>
      <p style="color:#888;">Cancellations made 24 hours before check-in are fully refundable.</p>
      <p style="color:#888;">The Airbnb Team</p>
    </div>
  `;
}

export function bookingCancellationEmail(
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Cancelled</h1>
      <p>Hi ${guestName}, your booking has been cancelled.</p>
      <div style="background:#f9f9f9;padding:20px;border-radius:8px;margin:20px 0;">
        <h2 style="margin:0 0 12px;">${listingTitle}</h2>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
      </div>
      <p>We hope to see you again soon!</p>
      <a href="http://localhost:3000/listings" style="background:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Explore Listings</a>
      <p style="margin-top:24px;color:#888;">The Airbnb Team</p>
    </div>
  `;
}

export function passwordResetEmail(name: string, resetLink: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Password Reset Request</h1>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <p>Click the button below. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetLink}" style="background:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin:20px 0;">Reset Password</a>
      <p style="color:#888;">If you did not request this, ignore this email.</p>
      <p style="color:#888;">The Airbnb Team</p>
    </div>
  `;
}