const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, '.docx-build-final-report');
const outZip = path.join(root, 'FINAL_BUS_BOOKING_PROJECT_REPORT.zip');
const outDocx = path.join(root, 'FINAL_BUS_BOOKING_PROJECT_REPORT.docx');

function cleanDir(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraph(text, style = 'Normal') {
  const styleXml = style === 'Normal' ? '' : `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`;
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function caption(text) {
  return paragraph(text, 'Caption');
}

function bullet(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Bullet"/></w:pPr><w:r><w:t xml:space="preserve">- ${esc(text)}</w:t></w:r></w:p>`;
}

function code(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function table(headers, rows) {
  const cell = (text, header = false) => {
    const bold = header ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r>${bold}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
  };
  const rowXml = (items, header = false) => `<w:tr>${items.map((item) => cell(item, header)).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>${rowXml(headers, true)}${rows.map((r) => rowXml(r)).join('')}</w:tbl>`;
}

const parts = [];
const h1 = (text) => parts.push(paragraph(text, 'Heading1'));
const h2 = (text) => parts.push(paragraph(text, 'Heading2'));
const p = (text) => parts.push(paragraph(text));
const b = (text) => parts.push(bullet(text));
const c = (text) => parts.push(code(text));
const t = (headers, rows) => parts.push(table(headers, rows));
const cap = (text) => parts.push(caption(text));

h1('Project Report on Bus Booking and Real-Time Tracking Web Application');
p('Submitted by: [Your Name]');
p('Register No.: [Your Register Number]');
p('Course: [Your Course Name]');
p('Department: [Department Name]');
p('Institution: [College / Institution Name]');
p('Guide / Supervisor: [Guide Name]');
p('Academic Year: 2025-26');
p('Date of Submission: [Date]');
parts.push(pageBreak());

h1('Documentation Guidelines');
p('This report follows the standard academic project documentation format. Each section is written in a clear, formal, and structured manner so that the project problem, design, implementation, testing, and results can be understood easily.');
b('Use simple and formal language throughout the report.');
b('Follow the same numbering style as the index.');
b('Add screenshots, diagrams, and tables where required.');
b('Keep code snippets short and include only core functionality.');
b('Place full source code links and user manual details in the appendices.');
b('Use consistent font, spacing, headings, captions, and references.');
b('Mention all technologies, APIs, frameworks, and documentation used in the references section.');

h2('Sample Index Format');
p('1. Title Page');
p('2. Abstract');
p('3. Introduction');
p('   3.1 Problem Statement');
p('   3.2 Objectives');
p('   3.3 Scope of the Project');
p('4. System Analysis');
p('   4.1 Existing System vs. Proposed System');
p('   4.2 Feasibility Study');
p('   4.3 Software and Hardware Requirements');
p('5. System Design');
p('   5.1 System Architecture');
p('   5.2 Data Flow Diagrams / UML Diagrams');
p('   5.3 Database Design');
p('6. Implementation');
p('   6.1 Technology Stack');
p('   6.2 Key Algorithms / Logic');
p('   6.3 Code Snippets');
p('7. Testing');
p('   7.1 Unit Testing');
p('   7.2 Integration Testing');
p('   7.3 Test Cases');
p('8. Results and Discussion');
p('   8.1 Screenshots of the Final Product');
p('   8.2 Performance Analysis');
p('9. Conclusion and Future Enhancements');
p('10. References / Bibliography');
p('11. Appendices');
parts.push(pageBreak());

h1('Contents');
p('1. Title Page');
p('2. Abstract');
p('3. Introduction');
p('   3.1 Problem Statement');
p('   3.2 Objectives');
p('   3.3 Scope of the Project');
p('4. System Analysis');
p('   4.1 Existing System vs. Proposed System');
p('   4.2 Feasibility Study: Technical, Operational, Economic');
p('   4.3 Software and Hardware Requirements');
p('5. System Design');
p('   5.1 System Architecture');
p('   5.2 Data Flow Diagrams / UML Diagrams');
p('   5.3 Database Design: ER Diagram and Schema');
p('6. Implementation');
p('   6.1 Technology Stack');
p('   6.2 Key Algorithms / Logic');
p('   6.3 Code Snippets');
p('7. Testing');
p('   7.1 Unit Testing');
p('   7.2 Integration Testing');
p('   7.3 Test Cases');
p('8. Results and Discussion');
p('   8.1 Screenshots of the Final Product');
p('   8.2 Performance Analysis');
p('9. Conclusion and Future Enhancements');
p('10. References / Bibliography');
p('11. Appendices');
parts.push(pageBreak());

h1('1. Title Page');
p('Project Title: Bus Booking and Real-Time Tracking Web Application');
p('Student Name: [Your Name]');
p('Register Number: [Your Register Number]');
p('Course / Degree: [Your Course / Degree]');
p('Department: [Department Name]');
p('College / Institution: [College Name]');
p('Project Guide: [Guide Name]');
p('Academic Year: 2025-26');
p('Submission Date: [Date]');

h1('2. Abstract');
p('The Bus Booking and Real-Time Tracking Web Application is a full-stack web-based project developed to simplify bus ticket reservation and improve passenger convenience through digital booking and tracking features. In traditional booking systems, passengers often face long queues, limited route visibility, uncertain seat availability, and lack of live journey updates. These problems make travel planning slow and inconvenient. This project solves these issues by offering a single platform where users can register, log in, search buses by source and destination, view schedules, select seats, confirm bookings, view booking history, and track bus movement through a map-based interface.');
p('The system is built using React for the frontend, Node.js and Express.js for backend services, and MongoDB for database storage. Mongoose is used for schema design and validation. JWT is used for secure user authentication, while bcryptjs is used to protect passwords through hashing. The application also uses Axios for API communication and Leaflet with React Leaflet for map visualization. Important features include route search, search suggestions, time-based scheduling, seat allocation, mock payment confirmation, booking history, and live bus tracking.');
p('The main purpose of this project is to reduce manual booking effort, improve travel transparency, and provide a practical digital solution for bus passengers. It demonstrates how modern web technologies can be combined to build a scalable transport management application that supports both reservation and tracking needs.');

h1('3. Introduction');
p('Bus transportation is one of the most common and affordable modes of travel. However, many passengers still face difficulty in finding available buses, checking seat availability, booking tickets conveniently, and tracking the bus after booking. A digital bus booking and tracking system helps solve these issues by bringing search, reservation, and trip visibility into one platform.');
p('The Bus Booking and Real-Time Tracking Web Application is designed as a web-based solution that allows users to search buses, book seats, manage bookings, and track route progress. It provides a responsive frontend for passengers and a backend API for managing users, buses, bookings, schedule data, and tracking details.');

h2('3.1 Problem Statement');
p('The existing manual or semi-digital bus booking process often creates inconvenience for passengers. Users may not know which buses are available for a selected route, which seats are free, what the exact schedule is, or where the bus is during the journey. Manual booking also increases the workload for operators and may cause errors in record keeping. Therefore, there is a need for a digital system that supports online booking, secure user access, seat selection, booking history, and route tracking.');

h2('3.2 Objectives');
b('To develop an online bus booking system for source, destination, and date-based search.');
b('To allow users to register, log in, and access protected booking features securely.');
b('To display bus details such as operator, bus type, departure time, arrival time, price, and seat availability.');
b('To provide seat selection and booking confirmation.');
b('To store user, bus, and booking data in MongoDB.');
b('To support time-based scheduling and seat allocation.');
b('To provide map-based bus tracking and route progress information.');
b('To create a user-friendly, responsive, and practical travel booking interface.');

h2('3.3 Scope of the Project');
p('The project scope includes user authentication, bus search, route suggestions, seat booking, booking history, time-based schedule support, and map-based tracking. The current version includes a mock payment flow and simulated tracking behavior suitable for academic demonstration. The project can be extended in the future with real payment gateways, live GPS devices, admin dashboards, email notifications, and mobile applications.');

h1('4. System Analysis');
h2('4.1 Existing System vs. Proposed System');
cap('Table 4.1: Comparison of Existing and Proposed System');
t(['Existing System', 'Proposed System'], [
  ['Manual or counter-based booking takes more time.', 'Online booking allows faster ticket reservation.'],
  ['Seat availability may not be visible before booking.', 'Users can view available seats before confirming.'],
  ['Route and schedule information may be incomplete.', 'Users can search routes and view bus details digitally.'],
  ['Tracking is usually unavailable.', 'Users can track buses through a map-based interface.'],
  ['Booking records may be manual and difficult to manage.', 'Bookings are stored securely in the database.'],
  ['Users must depend on operators or agents for information.', 'Users can access route, booking, and tracking details themselves.']
]);

h2('4.2 Feasibility Study');
p('Technical Feasibility: The project is technically feasible because it uses widely adopted technologies such as React, Node.js, Express.js, MongoDB, Mongoose, JWT, and Leaflet. These technologies support full-stack application development, REST API communication, database storage, authentication, and interactive map display.');
p('Operational Feasibility: The system is operationally feasible because it is easy for passengers to use. A user can search buses, select seats, confirm bookings, and view tracking information through a browser. The interface reduces manual effort and improves booking convenience.');
p('Economic Feasibility: The project is economically feasible because it uses open-source technologies and can run on standard computer hardware during development. No expensive licensed software is required for basic implementation and testing.');

h2('4.3 Software and Hardware Requirements');
cap('Table 4.2: Software Requirements');
t(['Software', 'Requirement'], [
  ['Operating System', 'Windows, Linux, or macOS'],
  ['Frontend', 'React, React Router, Tailwind CSS'],
  ['Backend', 'Node.js and Express.js'],
  ['Database', 'MongoDB'],
  ['Database ODM', 'Mongoose'],
  ['Authentication', 'JWT and bcryptjs'],
  ['Map Library', 'Leaflet and React Leaflet'],
  ['API Testing Tool', 'Postman or browser developer tools'],
  ['Code Editor', 'Visual Studio Code']
]);
cap('Table 4.3: Hardware Requirements');
t(['Hardware', 'Minimum Requirement'], [
  ['Processor', 'Dual-core processor or higher'],
  ['RAM', '4 GB minimum, 8 GB recommended'],
  ['Storage', '1 GB or more free space for project files and dependencies'],
  ['Network', 'Internet connection for map tiles and external services'],
  ['Client Device', 'Desktop, laptop, tablet, or smartphone browser']
]);

h1('5. System Design');
h2('5.1 System Architecture');
p('The application follows a client-server architecture. The React frontend handles user interaction and communicates with the Express backend using REST API calls. The backend processes authentication, bus search, bookings, and tracking-related requests. MongoDB stores persistent data for users, buses, and bookings. Leaflet and React Leaflet are used to display map-based tracking information.');
c('User Browser -> React Frontend -> Express API Server -> MongoDB Database');
c('Tracking Page -> Tracking API -> Map Display');
cap('Figure 5.1: System Architecture');

h2('5.2 Data Flow Diagrams / UML Diagrams');
p('Level 0 DFD: The user interacts with the Bus Booking and Tracking System. The system receives search, booking, login, and tracking requests and returns bus results, booking confirmations, and tracking information.');
p('Level 1 DFD: The major processes are user authentication, bus search, seat booking, booking history, and bus tracking.');
b('Use Case Diagram Actors: User and System.');
b('Main Use Cases: Register, Login, Search Bus, Select Seat, Confirm Booking, View Booking History, Track Bus.');
b('Sequence Diagram: User searches route, selects bus, chooses seat, confirms booking, backend validates data, booking is stored, and confirmation is returned.');
cap('Figure 5.2: DFD and UML Diagram Description');

h2('5.3 Database Design');
p('The database is designed using MongoDB collections. The main collections are User, Bus, and Booking. Mongoose schemas define the structure, validation, and relationships between these collections.');
p('ER Diagram Description: One user can have many bookings. One bus can be linked with many bookings. Each booking belongs to one user and one bus.');
cap('Table 5.1: Database Collections and Important Fields');
t(['Collection', 'Important Fields'], [
  ['User', 'name, email, password, bookings, createdAt, updatedAt'],
  ['Bus', 'route, source, destination, operator, busType, departure, arrival, seats, availableSeats, price, rating, distance, timePeriod, seatsAllocation'],
  ['Booking', 'user, bus, seats, status, paymentReferenceId, createdAt, updatedAt']
]);
c('User (1) ---- (Many) Booking');
c('Bus  (1) ---- (Many) Booking');
cap('Figure 5.3: ER Diagram Relationship');

h1('6. Implementation');
h2('6.1 Technology Stack');
cap('Table 6.1: Technology Stack and Reason for Selection');
t(['Technology', 'Purpose', 'Reason for Selection'], [
  ['React', 'Frontend UI', 'Component-based design helps build dynamic and reusable pages.'],
  ['React Router', 'Navigation', 'Supports smooth single-page application routing.'],
  ['Tailwind CSS', 'Styling', 'Allows quick responsive styling using utility classes.'],
  ['Axios', 'API calls', 'Simplifies HTTP communication between frontend and backend.'],
  ['Node.js', 'Backend runtime', 'Allows JavaScript to run on the server side.'],
  ['Express.js', 'API framework', 'Provides simple routing and REST API development.'],
  ['MongoDB', 'Database', 'Stores flexible document-based data for users, buses, and bookings.'],
  ['Mongoose', 'ODM', 'Provides schema validation and database modeling.'],
  ['JWT', 'Authentication', 'Secures protected routes using token-based login.'],
  ['bcryptjs', 'Password security', 'Hashes passwords before database storage.'],
  ['Leaflet / React Leaflet', 'Maps', 'Displays route and tracking information visually.']
]);

h2('6.2 Key Algorithms / Logic');
b('Authentication Logic: The user registers with name, email, and password. The password is hashed using bcryptjs. During login, credentials are verified and a JWT token is generated.');
b('Bus Search Logic: The system searches buses using source, destination, and date. Matching buses are ranked and returned to the frontend. If no route is found, synthetic route generation can provide fallback results.');
b('Seat Booking Logic: The system validates bus ID and selected seats. It checks whether enough seats are available, reduces available seat count, creates a booking record, and returns confirmation.');
b('Time-Based Scheduling Logic: Buses are grouped into morning, afternoon, evening, and night periods. This helps users understand availability by travel time.');
b('Tracking Logic: The tracking API finds a bus by ID or tracking ID, builds a trip snapshot, and returns route progress, current position, and estimated status for map display.');
p('For route ranking, sorting bus results by computed search score has worst-case time complexity O(n log n), where n represents the number of matched bus records.');

h2('6.3 Code Snippets');
p('Core booking validation snippet:');
c('function isValidSeatArray(seats) {');
c('  return Array.isArray(seats)');
c('    && seats.length > 0');
c('    && seats.every((seat) => Number.isInteger(seat) && seat > 0)');
c('    && new Set(seats).size === seats.length;');
c('}');
p('Core booking creation flow:');
c('const bus = await Bus.findById(busId);');
c('if (!bus) return res.status(404).json({ message: "Bus not found" });');
c('if (bus.availableSeats < normalizedSeats.length) {');
c('  return res.status(400).json({ message: "Not enough seats" });');
c('}');
c('await Bus.findByIdAndUpdate(busId, { $inc: { availableSeats: -normalizedSeats.length } });');
c('const booking = new Booking({ user: req.user.id, bus: busId, seats: normalizedSeats });');
c('await booking.save();');
p('Core authentication flow:');
c('const hashedPassword = await bcrypt.hash(password, 10);');
c('const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });');

h1('7. Testing');
h2('7.1 Unit Testing');
p('Unit testing focuses on individual functions and modules. In this project, unit testing can be applied to email validation, password hashing, JWT token creation, bus search helper logic, seat validation, route duration correction, and time-period calculation.');

h2('7.2 Integration Testing');
p('Integration testing verifies that different modules work together correctly. Important integration tests include frontend login with backend authentication, frontend bus search with backend search API, booking page with booking API, booking history with protected routes, and tracking page with tracking API.');

h2('7.3 Test Cases');
cap('Table 7.1: Functional Test Cases');
t(['Test Case ID', 'Description', 'Input', 'Expected Result', 'Actual Result', 'Status'], [
  ['TC-01', 'User registration', 'Valid name, email, password', 'Account created successfully', 'As expected', 'Pass'],
  ['TC-02', 'Login with valid credentials', 'Registered email and password', 'JWT token generated', 'As expected', 'Pass'],
  ['TC-03', 'Login with invalid password', 'Wrong password', 'Error message shown', 'As expected', 'Pass'],
  ['TC-04', 'Search buses', 'Source, destination, date', 'Matching buses displayed', 'As expected', 'Pass'],
  ['TC-05', 'Book available seats', 'Valid bus and seat numbers', 'Booking confirmed', 'As expected', 'Pass'],
  ['TC-06', 'Book duplicate seats', 'Repeated seat number', 'Validation error shown', 'As expected', 'Pass'],
  ['TC-07', 'View booking history', 'Logged-in user token', 'User bookings displayed', 'As expected', 'Pass'],
  ['TC-08', 'Track bus', 'Valid bus or tracking ID', 'Map and tracking details displayed', 'As expected', 'Pass']
]);

h1('8. Results and Discussion');
h2('8.1 Screenshots of the Final Product');
p('Add the following screenshots before final submission:');
b('Figure 8.1: Home page with source, destination, and date search.');
b('Figure 8.2: Login and registration page.');
b('Figure 8.3: Bus search results page.');
b('Figure 8.4: Seat selection and booking page.');
b('Figure 8.5: Checkout or booking confirmation page.');
b('Figure 8.6: Booking history page.');
b('Figure 8.7: Bus tracking page with map and route progress.');

h2('8.2 Performance Analysis');
p('The application provides quick response for normal search and booking operations because the backend uses REST APIs and MongoDB queries. Source and destination fields are indexed in the bus schema, which improves route-based search performance. React improves the user experience by updating views dynamically without full page reloads. The booking flow performs only necessary validation and database updates, making confirmation fast for standard use. Map performance depends on internet speed and map tile loading, but Leaflet provides lightweight rendering suitable for this academic project.');

h1('9. Conclusion and Future Enhancements');
p('The Bus Booking and Real-Time Tracking Web Application successfully provides an integrated digital platform for bus search, booking, booking history, and map-based tracking. It reduces manual booking effort, improves route and seat visibility, and gives passengers a more convenient travel experience. The project demonstrates practical full-stack development using React, Node.js, Express.js, MongoDB, JWT authentication, and Leaflet maps.');
p('Future enhancements can improve the system further by adding real payment gateway integration, admin dashboard support, live GPS device integration, email and SMS notifications, cancellation and refund management, mobile application support, and AI-based route recommendation or demand analysis.');

h1('10. References / Bibliography');
p('1. React Documentation, https://react.dev/');
p('2. Node.js Documentation, https://nodejs.org/');
p('3. Express.js Documentation, https://expressjs.com/');
p('4. MongoDB Documentation, https://www.mongodb.com/docs/');
p('5. Mongoose Documentation, https://mongoosejs.com/');
p('6. Leaflet Documentation, https://leafletjs.com/');
p('7. React Leaflet Documentation, https://react-leaflet.js.org/');
p('8. JSON Web Token Documentation, https://jwt.io/');
p('9. Tailwind CSS Documentation, https://tailwindcss.com/docs/');

h1('11. Appendices');
h2('Appendix A: Full Source Code Link');
p('Repository / Source Code Link: [Add your GitHub repository link here]');

h2('Appendix B: Project Structure');
c('Bus Booking and tracking app/');
c('|-- client/');
c('|   |-- src/');
c('|   |   |-- pages/');
c('|   |   |-- context/');
c('|   |   |-- utils/');
c('|-- server/');
c('|   |-- src/');
c('|   |   |-- models/');
c('|   |   |-- routes/');
c('|   |   |-- services/');
c('|   |   |-- middleware/');
c('|-- README.md');

h2('Appendix C: User Manual');
p('1. Open the application in a web browser.');
p('2. Register a new account or log in using existing credentials.');
p('3. Enter source, destination, and journey date on the home page.');
p('4. Select a suitable bus from the search results.');
p('5. Choose available seats and continue to booking confirmation.');
p('6. Confirm the booking through the checkout or mock payment flow.');
p('7. Open booking history to view previous bookings.');
p('8. Open the tracking page and enter a valid bus or tracking ID to view bus route progress.');

const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>Bus Booking and Real-Time Tracking Web Application</w:t></w:r></w:p>
</w:hdr>`;

const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
</w:ftr>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
<w:body>${parts.join('')}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="2160" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:pPr><w:jc w:val="both"/><w:spacing w:after="160" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="000000"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="160"/><w:ind w:firstLine="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="000000"/></w:rPr><w:pPr><w:spacing w:before="200" w:after="120"/><w:ind w:firstLine="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:pPr><w:spacing w:after="80"/><w:ind w:firstLine="0"/></w:pPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

cleanDir(buildDir);
fs.mkdirSync(path.join(buildDir, '_rels'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'word', '_rels'), { recursive: true });
fs.writeFileSync(path.join(buildDir, '[Content_Types].xml'), contentTypesXml);
fs.writeFileSync(path.join(buildDir, '_rels', '.rels'), rootRelsXml);
fs.writeFileSync(path.join(buildDir, 'word', 'document.xml'), documentXml);
fs.writeFileSync(path.join(buildDir, 'word', 'styles.xml'), stylesXml);
fs.writeFileSync(path.join(buildDir, 'word', 'header1.xml'), headerXml);
fs.writeFileSync(path.join(buildDir, 'word', 'footer1.xml'), footerXml);
fs.writeFileSync(path.join(buildDir, 'word', '_rels', 'document.xml.rels'), docRelsXml);

if (fs.existsSync(outZip)) fs.rmSync(outZip, { force: true });
if (fs.existsSync(outDocx)) fs.rmSync(outDocx, { force: true });

execFileSync('powershell', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path '${path.join(buildDir, '*').replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`
], { stdio: 'inherit' });

fs.renameSync(outZip, outDocx);
fs.rmSync(buildDir, { recursive: true, force: true });

console.log(`Created ${outDocx}`);
