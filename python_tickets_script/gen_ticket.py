from selectors import EVENT_READ
import firebase_admin
from firebase_admin import credentials, firestore
import qrcode
import uuid
import os
import smtplib
import ssl
from email.message import EmailMessage
import gspread
from google.oauth2.service_account import Credentials

cred = credentials.Certificate("/Users/srikar/mirchi-ticket-website/mirchi-ticket-website.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

# Google Sheets API Setup
SHEET_ID = "1nGY_KNOX65JY0JTu7SxScSpGaP3UwnJ1w7yzIOcnNAU"  # Google Sheet ID
SHEET_NAME = "Form Responses 1"   # sheet's tab name
EVENT_NAME= 'Gabes 9-13'

google_credentials = Credentials.from_service_account_file(
    "/Users/srikar/mirchi-ticket-website/google-sheets-key.json",
    scopes=["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
)
gc = gspread.authorize(google_credentials)
sheet = gc.open_by_key(SHEET_ID).worksheet(SHEET_NAME)

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

    qr_image_path = f"tickets/ticket_{ticket_id}.png"
    img = qr.make_image(fill='black', back_color='white')
    img.save(qr_image_path)

    return qr_image_path

def save_ticket_to_db(ticket_id, email_address, event_name, buyer_name, qr_code_path):
    """Save ticket details to Firestore."""
    ticket_ref = db.collection(EVENT_NAME).document(ticket_id)
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
    sender_email = "skopparapu19@gmail.com"  
    sender_password = "dwfs wafe lqpz mxny" 
    subject = f"Your Ticket for {event_name}"

    msg = EmailMessage()
    msg["From"] = sender_email
    msg["To"] = email_address
    msg["Subject"] = subject
    msg.set_content(f"""Dear {buyer_name},

    Thank you for purchasing your ticket for the {event_name}.

    Attached is your QR code for entry. Please have it ready at the door.

    Reminder, this QR code will only work one time, so don’t share it with anyone! For re-entry, there will be a separate mark given to you once you are inside.

    Don’t forget to bring an ID, we’re looking forward to seeing you there!

    Best regards,  
    Mass Mirchi Team""")
    with open(qr_image_path, "rb") as f:
        img_data = f.read()
        msg.add_attachment(img_data, maintype="image", subtype="png", filename=f"ticket_{event_name}.png")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)

    print(f"Email sent to {email_address} with QR code attachment.")

def update_sheet_status(row_index):
    """Mark the email as sent in the 'Sent' column."""
    sheet.update_cell(row_index, sent_idx + 1, "Yes")  # Adding 1 because Sheets is 1-indexed

def update_analytics(event_name, buyer_name, email_address):
    """Update analytics in Firestore when a ticket is sent."""
    try:
        analytics_ref = db.collection('analytics').document(event_name)
        analytics_ref.set({
            'event_name': event_name,
            'tickets_sent': firestore.Increment(1),
            'last_updated': firestore.SERVER_TIMESTAMP,
            'recipients': firestore.ArrayUnion([{
                'email': email_address,
                'name': buyer_name,
                'timestamp': firestore.SERVER_TIMESTAMP
            }])
        }, merge=True)
        print(f"Updated analytics for {event_name}")
    except Exception as e:
        print(f"Error updating analytics: {str(e)}")

def generate_ticket(email_address, event_name, buyer_name, row_index):
    """Generate a ticket, save QR code, store details in Firestore, and send an email."""
    ticket_id = generate_ticket_id()
    qr_image_path = generate_qr_code(ticket_id)

    save_ticket_to_db(ticket_id, email_address, event_name, buyer_name, qr_image_path)
    send_email_with_qr(email_address, event_name, buyer_name, qr_image_path)
    update_sheet_status(row_index)
    update_analytics(event_name, buyer_name, email_address)

    print(f"Ticket generated and emailed successfully! Ticket ID: {ticket_id}")

def process_verified_tickets():
    """Reads Google Sheet, filters verified payments, and processes ticket generation."""
    data = sheet.get_all_values() 
    headers = data[0]  
    rows = data[1:] 

    email_idx = headers.index("Email - your ticket will be sent here, double check this!!!")
    name_idx = headers.index("Full Name (ticket is attached to this name only)")
    payment_idx = headers.index("Verified")  

    global sent_idx
    if "Sent" not in headers:
        headers.append("Sent")
        sheet.append_row(headers)  
        sent_idx = len(headers) - 1
    else:
        sent_idx = headers.index("Sent")

    for i, row in enumerate(rows, start=2):  
        payment_verified = row[payment_idx].strip().lower()
        email_sent = row[sent_idx].strip().lower() if len(row) > sent_idx else ""
        
        email_address = row[email_idx].strip()
        buyer_name = row[name_idx].strip()
        if payment_verified == "yes" and email_sent != "yes":
            generate_ticket(email_address, "Mass Mirchi X Gabe's Underground Bollywood Party", buyer_name, i)
        elif payment_verified == "no" and email_sent != "yes":
            send_payment_verification_email(email_address, buyer_name)

def send_payment_verification_email(email_address, buyer_name):
    sender_email = "skopparapu19@gmail.com"  
    sender_password = "dwfs wafe lqpz mxny"
    subject = "Payment Verification Required for Your Ticket"
    
    msg = EmailMessage()
    msg["From"] = sender_email
    msg["To"] = email_address
    msg["Subject"] = subject
    msg.set_content(f"""
    Dear {buyer_name},

    We have not yet verified your payment for the Mass Mirchi X Gabe's Underground Bollywood Party. 
    If you have already made the payment, please send us a screenshot of the transaction.
    If not, kindly complete your payment at your earliest convenience.

    Best regards,
    Mass Mirchi Team
    """)
    
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)
    
    print(f"Payment verification email sent to {email_address}.")


process_verified_tickets()


