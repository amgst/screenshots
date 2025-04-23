# Website Screenshot Tool

A full-stack application for capturing high-quality screenshots of websites in both desktop and mobile views.

![Screenshot Tool Demo](https://via.placeholder.com/800x400?text=Screenshot+Tool+Demo)

## Features

- **Dual View Capture**: Generate both desktop and mobile screenshots simultaneously
- **High Quality Mode**: Choose between normal (faster) and high quality (better resolution) screenshots
- **Full Page Screenshots**: Captures the entire webpage, including content below the fold
- **Progress Tracking**: Real-time progress indicators during the capture process
- **Download & Share**: Easily download or view full-size screenshots
- **Responsive UI**: Clean, mobile-friendly interface built with React and Bootstrap

## Technology Stack

### Frontend
- React
- Bootstrap 5
- CSS3

### Backend
- Node.js
- Express.js
- Puppeteer (headless Chrome)

## Installation

### Prerequisites
- Node.js 14.x or higher
- npm 6.x or higher

### Setup Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/website-screenshot-tool.git
cd website-screenshot-tool
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
node server.js
```

4. In a separate terminal, start the frontend development server:
```bash
npm start
```

5. Access the application at `http://localhost:3000`

## Usage

1. Enter a website URL in the input field (e.g., example.com)
2. Toggle "High Quality Mode" if desired (slower but better resolution)
3. Click "Capture Screenshot"
4. Wait for both desktop and mobile screenshots to be generated
5. View, download, or share the resulting screenshots

## Configuration

You can modify the following parameters in `server.js`:
- Screenshot resolution (default: 1920x1080 for desktop, 390x844 for mobile)
- Quality settings
- Timeouts and waiting periods
- File formats (PNG/JPEG)

## API Endpoints

- `POST /api/screenshot`: Generate screenshots for a given URL
- `GET /api/test`: Test if the API is running
- `GET /api/list-screenshots`: View all previously captured screenshots

## File Structure

```
screenshot-api/
├── server.js              # Backend server and API endpoints
├── screenshots/           # Directory for saved screenshots (auto-created)
├── src/
│   ├── App.js            # Main React component
│   ├── App.css           # Styles for the application
│   └── ...
├── public/
│   ├── index.html
│   └── ...
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

[MIT](LICENSE)

## Acknowledgements

- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [React](https://reactjs.org/) - Frontend library
- [Bootstrap](https://getbootstrap.com/) - CSS framework

---

Created with ❤️ by Azam
