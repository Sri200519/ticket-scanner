import firebase_admin
from firebase_admin import credentials, firestore
import qrcode
import uuid
import os
import smtplib
import ssl
from email.message import EmailMessage

# Initialize Firebase Admin SDK
cred = credentials.Certificate("/Users/srikar/mirchi-ticket-website/mirchi-ticket-website.json")  # Path to your Firebase key JSON
firebase_admin.initialize_app(cred)

# Reference to Firestore database
db = firestore.client()

# Create a folder to store the QR code images
if not os.path.exists("tickets"):
    os.makedirs("tickets")

def generate_ticket_id():
    """Generate a unique ticket ID using UUID."""
    return str(uuid.uuid4())

def generate_qr_code(ticket_id):
    """Generate a QR code from the ticket ID."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(ticket_id)
    qr.make(fit=True)

    # Create an image from the QR code
    qr_image_path = f"tickets/ticket_{ticket_id}.png"
    img = qr.make_image(fill='black', back_color='white')
    img.save(qr_image_path)

    return qr_image_path

def save_ticket_to_db(ticket_id, email_address, event_name, buyer_name, qr_code_path):
    """Save ticket details to Firestore."""
    ticket_ref = db.collection('Spoke 4-4').document(ticket_id)
    ticket_ref.set({
        'ticket_id': ticket_id,
        'email_address': email_address,
        'event_name': event_name,
        'buyer_name': buyer_name,
        'qr_code_path': qr_code_path
    })
    print(f"Ticket saved to Firestore with ticket ID: {ticket_id}")

def send_email_with_qr(email_address, event_name, buyer_name, qr_image_path):
    """Send an email with the QR code attached."""
    sender_email = "skopparapu19@gmail.com"  # Replace with your email
    sender_password = "dwfs wafe lqpz mxny"  # Use an app password if using Gmail
    subject = f"Your Ticket for {event_name}"
    
    # Create the email
    msg = EmailMessage()
    msg["From"] = sender_email
    msg["To"] = email_address
    msg["Subject"] = subject
    msg.set_content(f"Dear {buyer_name},\n\nThank you for purchasing your ticket for {event_name}.\n\nAttached is your QR code for entry.\n\nBest regards,\Mass Mirchi")

    # Attach QR code image
    with open(qr_image_path, "rb") as f:
        img_data = f.read()
        msg.add_attachment(img_data, maintype="image", subtype="png", filename=f"ticket_{event_name}.png")

    # Send email
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)
    
    print(f"Email sent to {email_address} with QR code attachment.")

def generate_ticket(email_address, event_name, buyer_name):
    """Generate a ticket, save QR code, store details in Firestore, and send an email."""
    ticket_id = generate_ticket_id()
    qr_image_path = generate_qr_code(ticket_id)

    # Save ticket details to Firestore
    save_ticket_to_db(ticket_id, email_address, event_name, buyer_name, qr_image_path)

    # Send the QR code via email
    send_email_with_qr(email_address, event_name, buyer_name, qr_image_path)

    print(f"Ticket generated and emailed successfully! Ticket ID: {ticket_id}")

# Example usage
generate_ticket(email_address="srikar.kopparapu19@gmail.com", event_name="Spoke", buyer_name="Srikar Kopparapu")
