import crypto from "node:crypto";
import { PrismaClient, ApplicationStatus, InquiryStatus, PaymentStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Password@123";
const SCRYPT_KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${Buffer.from(key).toString("hex")}`);
    });
  });
}

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.offlineInquiry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.collegeReview.deleteMany();
  await prisma.userDocument.deleteMany();
  await prisma.mockExamAttempt.deleteMany();
  await prisma.mockQuestion.deleteMany();
  await prisma.seatAllotmentTrend.deleteMany();
  await prisma.application.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.course.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.college.deleteMany();
  await prisma.careerRecommendation.deleteMany();
  await prisma.certificationCourse.deleteMany();
  await prisma.rankCutoff.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  await prisma.user.createMany({
    data: [
      { name: "Priya Sharma", email: "priya@email.com", passwordHash, phone: "9876543210", city: "Bangalore", bio: "Interested in MCA and analytics roles.", targetCourse: "MCA", role: UserRole.STUDENT },
      { name: "Rahul Gowda", email: "rahul@email.com", passwordHash, phone: "9123456780", city: "Mysuru", bio: "Focused on AI and cloud careers.", targetCourse: "M.Tech AI", role: UserRole.STUDENT },
      { name: "Admin User", email: "admin@eduportal.com", passwordHash, role: UserRole.ADMIN }
    ]
  });

  const colleges = await Promise.all([
    prisma.college.create({
      data: {
        name: "RV College of Engineering",
        location: "Bangalore",
        type: "Private",
        rank: 1,
        rating: 4.8,
        feesPerYear: 250000,
        description: "Top-tier engineering college in Karnataka with strong placements.",
        admissionRequirements: [
          "Bachelor's degree with at least 50% aggregate marks",
          "Valid entrance exam score or rank",
          "Recent academic transcripts",
          "Government-issued photo ID"
        ],
        website: "https://www.rvce.edu.in",
        phone: "+91 80 2661 2445",
        email: "admissions@rvce.edu.in",
        established: 1963,
        courses: {
          create: [
            { name: "MCA", duration: "2 Years", feesPerYear: 250000, seats: 60 },
            { name: "M.Tech Computer Science", duration: "2 Years", feesPerYear: 280000, seats: 30 }
          ]
        }
      }
    }),
    prisma.college.create({
      data: {
        name: "PES University",
        location: "Bangalore",
        type: "Private",
        rank: 3,
        rating: 4.6,
        feesPerYear: 300000,
        description: "Leading private university known for technology programs.",
        admissionRequirements: [
          "Recognized undergraduate degree",
          "Minimum 50% marks in qualifying exam",
          "Entrance exam or merit-based shortlist",
          "Statement of purpose"
        ],
        website: "https://www.pes.edu",
        courses: {
          create: [
            { name: "MCA", duration: "2 Years", feesPerYear: 300000, seats: 90 },
            { name: "M.Tech AI & ML", duration: "2 Years", feesPerYear: 320000, seats: 40 }
          ]
        }
      }
    }),
    prisma.college.create({
      data: {
        name: "BMS College of Engineering",
        location: "Bangalore",
        type: "Private",
        rank: 2,
        rating: 4.7,
        feesPerYear: 220000,
        description: "Established engineering institution with strong academic outcomes.",
        admissionRequirements: [
          "Graduation from a recognized university",
          "Entrance exam rank card",
          "Marks cards for all semesters",
          "Passport-size photographs"
        ],
        courses: {
          create: [{ name: "MCA", duration: "2 Years", feesPerYear: 220000, seats: 60 }]
        }
      }
    }),
    prisma.college.create({
      data: {
        name: "MSRIT",
        location: "Bangalore",
        type: "Private",
        rank: 4,
        rating: 4.5,
        feesPerYear: 200000,
        description: "Popular destination for engineering and postgraduate programs.",
        admissionRequirements: [
          "Completed eligible undergraduate program",
          "Minimum academic eligibility as per university norms",
          "Entrance rank card",
          "Address and identity proof"
        ],
        courses: {
          create: [{ name: "M.Tech AI", duration: "2 Years", feesPerYear: 260000, seats: 40 }]
        }
      }
    })
  ]);

  const users = await prisma.user.findMany({ where: { email: { in: ["priya@email.com", "rahul@email.com"] } } });
  const priya = users.find((user) => user.email === "priya@email.com");
  const rahul = users.find((user) => user.email === "rahul@email.com");

  if (!priya || !rahul) throw new Error("Seed users not found");

  await prisma.user.create({
    data: {
      name: "Dr. Kumar",
      email: "kumar@college.edu",
      passwordHash,
      role: UserRole.COLLEGE,
      managedCollegeId: colleges[0].id
    }
  });

  await prisma.application.createMany({
    data: [
      {
        userId: priya.id,
        type: "COLLEGE",
        collegeId: colleges[0].id,
        courseName: "MCA",
        applicantName: "Priya Sharma",
        applicantEmail: "priya@email.com",
        applicantPhone: "9876543210",
        qualification: "BCA",
        scoreOrRank: "PGCET Rank 412",
        statement: "Interested in strong placement support and hostel facilities.",
        requirementsSnapshot: [
          "Bachelor's degree with at least 50% aggregate marks",
          "Valid entrance exam score or rank",
          "Recent academic transcripts",
          "Government-issued photo ID"
        ],
        paymentAmount: 250000,
        paymentStatus: PaymentStatus.PENDING,
        status: ApplicationStatus.ACCEPTED
      },
      {
        userId: priya.id,
        type: "COLLEGE",
        collegeId: colleges[1].id,
        courseName: "M.Tech AI & ML",
        applicantName: "Priya Sharma",
        applicantEmail: "priya@email.com",
        applicantPhone: "9876543210",
        qualification: "B.Tech CSE",
        scoreOrRank: "GATE Score 612",
        statement: "Looking for AI-focused coursework and research exposure.",
        requirementsSnapshot: [
          "Recognized undergraduate degree",
          "Minimum 50% marks in qualifying exam",
          "Entrance exam or merit-based shortlist",
          "Statement of purpose"
        ],
        paymentAmount: 320000,
        status: ApplicationStatus.PENDING
      },
      {
        userId: rahul.id,
        type: "COLLEGE",
        collegeId: colleges[2].id,
        courseName: "MCA",
        applicantName: "Rahul Gowda",
        applicantEmail: "rahul@email.com",
        applicantPhone: "9123456780",
        qualification: "BSc Computer Science",
        scoreOrRank: "KMAT Rank 980",
        statement: "Interested in industry exposure and internships.",
        requirementsSnapshot: [
          "Graduation from a recognized university",
          "Entrance exam rank card",
          "Marks cards for all semesters",
          "Passport-size photographs"
        ],
        paymentAmount: 220000,
        status: ApplicationStatus.SHORTLISTED
      },
      {
        userId: rahul.id,
        type: "COLLEGE",
        collegeId: colleges[3].id,
        courseName: "M.Tech AI",
        applicantName: "Rahul Gowda",
        applicantEmail: "rahul@email.com",
        applicantPhone: "9123456780",
        qualification: "B.E. Information Science",
        scoreOrRank: "GATE Score 488",
        statement: "Seeking applied AI curriculum with lab access.",
        requirementsSnapshot: [
          "Completed eligible undergraduate program",
          "Minimum academic eligibility as per university norms",
          "Entrance rank card",
          "Address and identity proof"
        ],
        paymentAmount: 260000,
        status: ApplicationStatus.REJECTED
      }
    ]
  });

  await prisma.inquiry.createMany({
    data: [
      {
        userId: priya.id,
        collegeId: colleges[0].id,
        courseName: "MCA",
        message: "Need details on hostel and scholarships",
        status: InquiryStatus.NEW
      },
      {
        userId: rahul.id,
        collegeId: colleges[1].id,
        courseName: "M.Tech AI & ML",
        message: "What is the expected cutoff rank?",
        status: InquiryStatus.CONTACTED
      }
    ]
  });

  await prisma.collegeReview.createMany({
    data: [
      {
        userId: priya.id,
        collegeId: colleges[0].id,
        rating: 5,
        comment: "Strong placements, good campus environment, and clear admission guidance from the staff."
      },
      {
        userId: rahul.id,
        collegeId: colleges[1].id,
        rating: 4,
        comment: "Good AI and ML program visibility, but I would want more clarity on scholarships before applying."
      }
    ]
  });

  await prisma.appointment.createMany({
    data: [
      {
        userId: priya.id,
        collegeId: colleges[0].id,
        scheduledFor: new Date("2026-04-08T10:30:00+05:30"),
        mode: "IN_PERSON",
        notes: "Would like to discuss hostel availability and fee timeline.",
        status: "CONFIRMED",
        counselorName: "Admissions Desk"
      },
      {
        userId: rahul.id,
        collegeId: colleges[1].id,
        scheduledFor: new Date("2026-04-10T15:00:00+05:30"),
        mode: "VIDEO",
        notes: "Need guidance on AI/ML eligibility and scholarship options.",
        status: "REQUESTED"
      }
    ]
  });

  await prisma.blogPost.createMany({
    data: [
      {
        title: "Top MCA Colleges in Karnataka 2026",
        excerpt: "Explore top colleges ranked by outcomes and placements.",
        content: "Detailed rankings, fees, and placement analysis.",
        externalUrl: "https://blog.coursera.org/",
        author: "Dr. Ravi Kumar",
        category: "Rankings",
        readTime: "5 min",
        publishedAt: new Date("2026-03-20")
      },
      {
        title: "How to Prepare for KCET 2026",
        excerpt: "A practical study plan to maximize score.",
        content: "Weekly schedule and mock-test strategy.",
        externalUrl: "https://blog.coursera.org/how-to-prepare-for-an-online-course/",
        author: "Prof. Anita S",
        category: "Exam Prep",
        readTime: "8 min",
        publishedAt: new Date("2026-03-18")
      }
    ]
  });

  await prisma.careerRecommendation.createMany({
    data: [
      { title: "Software Developer", salary: "INR 6-12 LPA", demand: "Very High", matchScore: 92, skills: ["Java", "React", "Node.js", "SQL"] },
      { title: "Data Scientist", salary: "INR 8-18 LPA", demand: "Very High", matchScore: 85, skills: ["Python", "ML", "Statistics", "SQL"] },
      { title: "AI/ML Engineer", salary: "INR 10-20 LPA", demand: "High", matchScore: 78, skills: ["Python", "TensorFlow", "Deep Learning"] },
      { title: "Cloud Architect", salary: "INR 12-25 LPA", demand: "High", matchScore: 72, skills: ["AWS", "Azure", "Docker", "Kubernetes"] }
    ]
  });

  await prisma.certificationCourse.createMany({
    data: [
      {
        title: "Full Stack Web Development",
        provider: "E-platform Academy",
        duration: "12 weeks",
        enrolled: 1240,
        rating: 4.8,
        level: "Intermediate",
        price: "INR 4,999",
        description: "Hands-on program covering React, APIs, databases, and deployment.",
        requirements: ["Basic HTML, CSS, and JavaScript familiarity", "Laptop with internet access", "Commitment of 6-8 hours per week"]
      },
      {
        title: "Data Science with Python",
        provider: "E-platform Academy",
        duration: "10 weeks",
        enrolled: 980,
        rating: 4.7,
        level: "Beginner",
        price: "INR 3,999",
        description: "Beginner-friendly data science track with Python, pandas, and visualization.",
        requirements: ["Basic programming comfort", "Class 12 mathematics or equivalent foundation", "Laptop with Python support"]
      },
      {
        title: "Cloud Computing (AWS)",
        provider: "E-platform Academy",
        duration: "8 weeks",
        enrolled: 756,
        rating: 4.6,
        level: "Advanced",
        price: "INR 5,999",
        description: "Advanced cloud course focused on AWS architecture, deployment, and security.",
        requirements: ["Prior backend or devops experience", "Understanding of Linux and networking basics", "Ability to work with cloud labs"]
      },
      {
        title: "Machine Learning A-Z",
        provider: "E-platform Academy",
        duration: "14 weeks",
        enrolled: 1560,
        rating: 4.9,
        level: "Intermediate",
        price: "INR 6,999",
        description: "Project-based machine learning program from preprocessing through model deployment.",
        requirements: ["Python basics", "Statistics fundamentals", "Willingness to complete weekly projects"]
      }
    ]
  });

  const certificationCourses = await prisma.certificationCourse.findMany({ orderBy: { title: "asc" } });

  await prisma.application.createMany({
    data: [
      {
        userId: priya.id,
        type: "CERTIFICATION",
        certificationCourseId: certificationCourses[1].id,
        applicantName: "Priya Sharma",
        applicantEmail: "priya@email.com",
        applicantPhone: "9876543210",
        qualification: "BCA",
        scoreOrRank: "Beginner portfolio in Python",
        statement: "Want to build a data analytics foundation before placements.",
        requirementsSnapshot: certificationCourses[1].requirements,
        paymentAmount: 3999,
        status: ApplicationStatus.PENDING
      },
      {
        userId: rahul.id,
        type: "CERTIFICATION",
        certificationCourseId: certificationCourses[3].id,
        applicantName: "Rahul Gowda",
        applicantEmail: "rahul@email.com",
        applicantPhone: "9123456780",
        qualification: "B.E. Information Science",
        scoreOrRank: "Completed two ML mini-projects",
        statement: "Looking to strengthen ML fundamentals with guided projects.",
        requirementsSnapshot: certificationCourses[3].requirements,
        paymentAmount: 6999,
        status: ApplicationStatus.SHORTLISTED
      }
    ]
  });

  await prisma.rankCutoff.createMany({
    data: [
      { year: 2020, cutoff: 18500 },
      { year: 2021, cutoff: 17200 },
      { year: 2022, cutoff: 16800 },
      { year: 2023, cutoff: 15500 },
      { year: 2024, cutoff: 14800 },
      { year: 2025, cutoff: 14200 }
    ]
  });

  await prisma.mockQuestion.createMany({
    data: [
      { examType: "KCET", difficulty: "Easy", question: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], answer: 1, explanation: "Binary search halves the search space in each step." },
      { examType: "KCET", difficulty: "Easy", question: "Which data structure uses LIFO principle?", options: ["Queue", "Stack", "Array", "Linked List"], answer: 1, explanation: "Stack follows last in, first out." },
      { examType: "KCET", difficulty: "Easy", question: "Which SQL command is used to retrieve rows from a table?", options: ["GET", "SELECT", "OPEN", "LOOKUP"], answer: 1, explanation: "SELECT is the SQL command used to fetch rows." },
      { examType: "KCET", difficulty: "Easy", question: "Which of these is an operating system?", options: ["Windows", "Python", "HTML", "Oracle"], answer: 0, explanation: "Windows is an operating system." },
      { examType: "KCET", difficulty: "Easy", question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Primary Unit", "Control Processing Unit", "Central Program Utility"], answer: 0, explanation: "CPU stands for Central Processing Unit." },
      { examType: "KCET", difficulty: "Medium", question: "SQL stands for?", options: ["Structured Query Language", "Simple Query Language", "Standard Query Language", "Sequential Query Language"], answer: 0, explanation: "SQL is Structured Query Language." },
      { examType: "KCET", difficulty: "Medium", question: "Which protocol is used for secure web browsing?", options: ["HTTP", "FTP", "HTTPS", "SMTP"], answer: 2, explanation: "HTTPS is the secure version of HTTP." },
      { examType: "KCET", difficulty: "Medium", question: "Which data structure is used in breadth-first search?", options: ["Stack", "Queue", "Heap", "Tree"], answer: 1, explanation: "Breadth-first search uses a queue." },
      { examType: "KCET", difficulty: "Medium", question: "Which normal form removes transitive dependency?", options: ["1NF", "2NF", "3NF", "BCNF"], answer: 2, explanation: "Third Normal Form removes transitive dependency." },
      { examType: "KCET", difficulty: "Medium", question: "Which layer of the OSI model is responsible for routing?", options: ["Network", "Transport", "Session", "Presentation"], answer: 0, explanation: "Routing is handled by the network layer." },
      { examType: "KCET", difficulty: "Hard", question: "Which scheduling algorithm can lead to starvation without aging?", options: ["Round Robin", "Priority Scheduling", "FCFS", "Multilevel Queue"], answer: 1, explanation: "Priority scheduling can starve lower-priority tasks." },
      { examType: "KCET", difficulty: "Hard", question: "What is the worst-case time complexity of quicksort?", options: ["O(log n)", "O(n)", "O(n log n)", "O(n^2)"], answer: 3, explanation: "Quicksort has O(n^2) worst-case complexity." },
      { examType: "KCET", difficulty: "Hard", question: "Which SQL join returns all rows from both tables?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"], answer: 3, explanation: "FULL OUTER JOIN preserves unmatched rows from both tables." },
      { examType: "PGCET", difficulty: "Easy", question: "Which keyword defines a function in Python?", options: ["func", "define", "def", "function"], answer: 2, explanation: "Python uses def to define functions." },
      { examType: "PGCET", difficulty: "Easy", question: "Which of these is a relational database?", options: ["MongoDB", "PostgreSQL", "Redis", "Neo4j"], answer: 1, explanation: "PostgreSQL is a relational database." },
      { examType: "PGCET", difficulty: "Medium", question: "What is the full form of API?", options: ["Application Program Interface", "Application Programming Interface", "Applied Programming Interface", "Automated Programming Interface"], answer: 1, explanation: "API means Application Programming Interface." },
      { examType: "PGCET", difficulty: "Medium", question: "Which HTTP method is commonly used for partial updates?", options: ["GET", "POST", "PATCH", "TRACE"], answer: 2, explanation: "PATCH is used for partial updates." },
      { examType: "PGCET", difficulty: "Hard", question: "Which sorting algorithm has the best average-case time complexity?", options: ["Bubble Sort", "Selection Sort", "Merge Sort", "Insertion Sort"], answer: 2, explanation: "Merge sort runs in O(n log n)." },
      { examType: "PGCET", difficulty: "Hard", question: "Which isolation level prevents dirty reads but allows non-repeatable reads?", options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], answer: 1, explanation: "Read Committed blocks dirty reads but still allows some anomalies." },
      { examType: "DCET", difficulty: "Easy", question: "Which normal form removes partial dependency?", options: ["1NF", "2NF", "3NF", "BCNF"], answer: 1, explanation: "2NF removes partial dependencies." },
      { examType: "DCET", difficulty: "Easy", question: "Which device routes traffic between different networks?", options: ["Hub", "Switch", "Router", "Bridge"], answer: 2, explanation: "Routers route packets between different networks." },
      { examType: "DCET", difficulty: "Medium", question: "Which traversal visits left subtree, root, then right subtree?", options: ["Preorder", "Inorder", "Postorder", "Level order"], answer: 1, explanation: "Inorder traversal is left-root-right." },
      { examType: "JEE", difficulty: "Hard", question: "Derivative of sin(x) is?", options: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"], answer: 0, explanation: "The derivative of sin(x) is cos(x)." },
      { examType: "JEE", difficulty: "Medium", question: "The SI unit of force is?", options: ["Joule", "Watt", "Newton", "Pascal"], answer: 2, explanation: "Force is measured in Newtons." },
      { examType: "JEE", difficulty: "Easy", question: "What is the chemical symbol for sodium?", options: ["Na", "So", "S", "Sd"], answer: 0, explanation: "The chemical symbol for sodium is Na." },
      { examType: "NEET", difficulty: "Medium", question: "Powerhouse of the cell is?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], answer: 2, explanation: "Mitochondria generates ATP." }
      ,{ examType: "NEET", difficulty: "Easy", question: "The basic unit of heredity is the?", options: ["Cell", "Gene", "Tissue", "Chromosome"], answer: 1, explanation: "Genes carry hereditary information." }
      ,{ examType: "NEET", difficulty: "Hard", question: "Which blood cells are primarily responsible for immune defense?", options: ["Red blood cells", "Platelets", "White blood cells", "Plasma"], answer: 2, explanation: "White blood cells are the main immune cells." }
    ]
  });

  await prisma.chatMessage.createMany({
    data: [
      { userId: priya.id, role: "user", content: "Which MCA colleges are best in Bangalore?" },
      { userId: priya.id, role: "assistant", content: "RVCE, BMS, and PES are top options." }
    ]
  });

  await prisma.mockExamAttempt.createMany({
    data: [
      { userId: priya.id, examType: "KCET", difficulty: "Easy", score: 6, total: 8, correctAnswers: 6, incorrectAnswers: 2, duration: 580 },
      { userId: priya.id, examType: "KCET", difficulty: "Medium", score: 7, total: 8, correctAnswers: 7, incorrectAnswers: 1, duration: 560 },
      { userId: rahul.id, examType: "PGCET", difficulty: "Hard", score: 5, total: 8, correctAnswers: 5, incorrectAnswers: 3, duration: 600 }
    ]
  });

  await prisma.seatAllotmentTrend.createMany({
    data: [
      { year: 2024, round: 1, category: "general", collegeName: "RV College of Engineering", courseName: "MCA", cutoffRank: 1800 },
      { year: 2024, round: 2, category: "general", collegeName: "RV College of Engineering", courseName: "MCA", cutoffRank: 2200 },
      { year: 2024, round: 2, category: "general", collegeName: "PES University", courseName: "MCA", cutoffRank: 4200 },
      { year: 2025, round: 1, category: "general", collegeName: "PES University", courseName: "MCA", cutoffRank: 3900 },
      { year: 2025, round: 2, category: "general", collegeName: "BMS College of Engineering", courseName: "MCA", cutoffRank: 5200 },
      { year: 2025, round: 2, category: "general", collegeName: "MSRIT", courseName: "M.Tech AI", cutoffRank: 6100 },
      { year: 2025, round: 2, category: "obc", collegeName: "PES University", courseName: "MCA", cutoffRank: 5300 }
    ]
  });

  const priyaApplications = await prisma.application.findMany({ where: { userId: priya.id }, orderBy: { createdAt: "asc" } });
  await prisma.userDocument.createMany({
    data: [
      {
        userId: priya.id,
        applicationId: priyaApplications[0]?.id,
        title: "Degree Marks Card",
        documentType: "Transcript",
        fileName: "degree-marks-card.pdf",
        mimeType: "application/pdf",
        fileDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcfs...",
        status: "PENDING"
      },
      {
        userId: priya.id,
        applicationId: priyaApplications[0]?.id,
        title: "Government ID",
        documentType: "Identity Proof",
        fileName: "aadhaar.png",
        mimeType: "image/png",
        fileDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
        status: "VERIFIED",
        verifiedAt: new Date()
      }
    ]
  });

  await prisma.offlineInquiry.create({
    data: {
      userId: priya.id,
      topic: "Need counselor help for MCA admissions",
      preferredMode: "call",
      message: "Please arrange a callback to discuss round 2 seat chances."
    }
  });

  console.log("Database seeded successfully");
  console.log(`Default login password for seeded users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
