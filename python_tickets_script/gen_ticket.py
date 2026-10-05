from datetime import datetime
from selectors import EVENT_READ
import time  # noqa: F401
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
from email.utils import make_msgid
import mimetypes
import ssl
import smtplib
from email.message import EmailMessage

def load_env():
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
        if os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path)
            return
    except ImportError:
        pass

    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local"),
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local"),
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    if key not in os.environ:
                        os.environ[key] = val
            break

load_env()

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

firebase_key_path = os.getenv(
    "FIREBASE_KEY_PATH",
    os.path.join(PROJECT_ROOT, "mirchi-ticket-website.json")
    if os.path.exists(os.path.join(PROJECT_ROOT, "mirchi-ticket-website.json"))
    else "/Users/srikar/mirchi-ticket-website/mirchi-ticket-website.json"
)

cred = credentials.Certificate(firebase_key_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Google Sheets API & Event Setup
SHEET_ID = os.getenv("SHEET_ID", "1nGY_KNOX65JY0JTu7SxScSpGaP3UwnJ1w7yzIOcnNAU")  # Google Sheet ID
SHEET_NAME = os.getenv("SHEET_NAME", "Form Responses 1")   # sheet's tab name
EVENT_NAME = os.getenv("EVENT_NAME", "Gabes 9-12")

sheets_key_path = os.getenv(
    "GOOGLE_SHEETS_KEY_PATH",
    os.path.join(PROJECT_ROOT, "google-sheets-key.json")
    if os.path.exists(os.path.join(PROJECT_ROOT, "google-sheets-key.json"))
    else "/Users/srikar/mirchi-ticket-website/google-sheets-key.json"
)

google_credentials = Credentials.from_service_account_file(
    sheets_key_path,
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
    sender_email = "skopparapu19@gmail.com"
    sender_password = "dwfs wafe lqpz mxny"
    subject = f"Your Ticket for {event_name}"

    # Create EmailMessage object
    msg = EmailMessage()
    msg["From"] = sender_email
    msg["To"] = email_address
    msg["Subject"] = subject

    # Generate Content-ID for the image
    image_cid = make_msgid(domain="massmirchi.org")[1:-1]  # remove < and >

    # Set HTML content with inline image
    msg.set_content(f"Dear {buyer_name}, please view your QR code in HTML email.")  # plain text fallback
    msg.add_alternative(f"""\
    <html>
      <body>
        <p>Dear {buyer_name},</p>
        <p>Thank you for purchasing your ticket for the {event_name} on September 12th.</p>
        <p>Here is your QR code for entry:</p>
        <img src="cid:{image_cid}" alt="QR Code" style="width:300px;height:300px;">
        <p>Reminder: this QR code will only work one time, so don’t share it!</p>
        <p>Best regards,<br>Mass Mirchi Team</p>
      </body>
    </html>
    """, subtype="html")

    # Read the QR code image and attach it as inline
    with open(qr_image_path, "rb") as img_file:
        img_data = img_file.read()
        maintype, subtype = mimetypes.guess_type(qr_image_path)[0].split("/")
        msg.get_payload()[1].add_related(img_data, maintype=maintype, subtype=subtype, cid=image_cid)

    # Send the email
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)

    print(f"Email sent to {email_address} with inline QR code.")


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
                'timestamp': datetime.utcnow()
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
            generate_ticket(email_address, EVENT_NAME, buyer_name, i)
            time.sleep(3)
        elif payment_verified == "no" and email_sent != "yes":
            send_payment_verification_email(email_address, buyer_name)
            time.sleep(3)

def send_payment_verification_email(email_address, buyer_name, event_name=EVENT_NAME):
    sender_email = "skopparapu19@gmail.com"  
    sender_password = "dwfs wafe lqpz mxny"
    subject = "Payment Verification Required for Your Ticket"
    
    msg = EmailMessage()
    msg["From"] = sender_email
    msg["To"] = email_address
    msg["Subject"] = subject
    msg.set_content(f"""
    Dear {buyer_name},

    We have not yet verified your payment for {event_name}. 
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


if __name__ == "__main__":
    process_verified_tickets()


