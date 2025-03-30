# Ticket Scanner Web Application

A simple web application that allows users to scan QR codes for ticket verification. This app is built with Next.js and includes the functionality to scan tickets and verify their validity by retrieving data from Firestore.

## Features

- **QR Code Scanning**: Allows users to scan QR codes from tickets.
- **Ticket Verification**: Verifies the validity of tickets by fetching ticket details (e.g., phone number, event name, buyer name) from a Firestore database.
- **User Interface**: Responsive UI with feedback on whether a ticket is valid or invalid.
- **Custom Favicon**: The favicon has been customized to use the `MassMirchi.png` logo.

## Technologies Used

- **Next.js**: React-based framework for building the app.
- **Tailwind CSS**: For styling and responsive design.
- **Firebase**: Firestore for storing and retrieving ticket data.
- **QR Code Scanner**: Allows users to scan tickets via QR codes.

## Getting Started

Follow the steps below to get this project up and running on your local machine.

### 1. Clone the Repository

Clone this repository to your local machine using the following command:

```
git clone https://github.com/your-username/ticket-scanner.git
cd ticket-scanner
```

### 2. Install Dependencies

Install the required dependencies using npm or yarn:

```
npm install
```

or if you are using Yarn:

```
yarn install
```

### 3. Firebase Setup

To use Firestore for ticket validation, you need to set up Firebase:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project (if you don’t have one).
3. In the Firebase Console, go to **Firestore Database** and create a new database.
4. Set up Firebase Admin SDK in your project:
   - Go to the **Project Settings** > **Service accounts** tab.
   - Generate a new private key for the Firebase Admin SDK and download the JSON file.
   - Place the downloaded JSON file in the root directory of your project.
5. Update the Firebase credentials in the code (`firebase.json` file or wherever the credentials are used).

### 4. Add Firebase Credentials

- Ensure the path to your Firebase credentials JSON is correctly set in the code (located in the project directory).
- If using the example code from `firebase-admin` setup in your project, make sure the path is correct in:

```
cred = credentials.Certificate("/path/to/your/firebase-credentials.json")
```

### 5. Add Custom Logo (Favicon)

The favicon for the website has been set to `MassMirchi.png`.

1. Place the `MassMirchi.png` logo inside the `public` folder of your Next.js project.
2. The logo will automatically be used as the favicon.

### 6. Run the Development Server

After installing all dependencies and setting up Firebase, you can start the development server:

```
npm run dev
```

or if using Yarn:

```
yarn dev
```

This will start the Next.js app on `http://localhost:3000`.

### 7. Test the Application

- Once the app is running, you can start scanning QR codes. The app will verify the ticket by fetching details from Firestore.
- If the ticket is valid, it will show the ticket details such as phone number, event name, and buyer name.

## Folder Structure

Here is the basic structure of the project:

```
/public
  MassMirchi.png      <-- Custom logo and favicon

/pages
  index.tsx           <-- Home page that handles QR code scanning
  layout.tsx          <-- Layout for the app (includes favicon setup)
  api/
    verify-ticket.ts  <-- API endpoint to verify tickets (via Firestore)
  
/components
  qr-scanner.tsx      <-- QR scanner component for scanning QR codes
  ui/
    button.tsx        <-- Custom button component
    card.tsx          <-- Card component for displaying ticket info
```

### 8. Environment Variables

Ensure you have set up the necessary environment variables for Firebase in your `.env.local` file. Example:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-private-key
```

### 9. Build and Deploy

To build the project for production:

```
npm run build
```

For deployment, you can use platforms like [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).

### Notes

- The app relies on Firebase Firestore to validate tickets. Ensure your Firestore database is set up with the necessary collections and documents for ticket validation.
- The QR scanner is designed to work directly in the browser.

## Troubleshooting

- **Firebase credentials**: Make sure you have added the correct Firebase credentials to your project and that they are correctly referenced in the code.
- **QR Scanner not working**: Ensure that your device's camera is accessible and that the browser supports WebRTC.

## Contributing

Feel free to fork the repository and submit pull requests if you want to contribute to the project. Please make sure to follow the existing coding conventions and write tests for new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```
