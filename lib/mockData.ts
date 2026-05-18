import { Lead, User, Blog, AuthUser } from './types';

export const MOCK_AUTH_USER: AuthUser = {
  id: 'u1',
  name: 'Deepak Kumar',
  email: 'admin@makemydocuments.com',
  role: 'admin',
};

export const MOCK_USERS: User[] = [
  { id: 'u1', slNo: 1, name: 'Deepak Kumar', email: 'deepak@makemydocuments.com', username: 'deepak', password: 'admin123', role: 'admin', status: 'active', phone: '9876543210', createdAt: '2024-01-10' },
  { id: 'u2', slNo: 2, name: 'Priya Sharma', email: 'priya@makemydocuments.com', username: 'priya', password: 'priya123', role: 'employee', status: 'active', phone: '9876543211', createdAt: '2024-02-15' },
  { id: 'u3', slNo: 3, name: 'Rahul Nair', email: 'rahul@makemydocuments.com', username: 'rahul', password: 'rahul123', role: 'employee', status: 'active', phone: '9876543212', createdAt: '2024-03-01' },
  { id: 'u4', slNo: 4, name: 'Sneha Reddy', email: 'sneha@makemydocuments.com', username: 'sneha', password: 'sneha123', role: 'employee', status: 'inactive', phone: '9876543213', createdAt: '2024-03-20' },
  { id: 'u5', slNo: 5, name: 'Arjun Menon', email: 'arjun@makemydocuments.com', username: 'arjun', password: 'arjun123', role: 'employee', status: 'active', phone: '9876543214', createdAt: '2024-04-05' },
];

const employees = ['Priya Sharma', 'Rahul Nair', 'Sneha Reddy', 'Arjun Menon'];

export const MOCK_LEADS: Lead[] = [
  // New Leads
  { id: 'l001', slNo: 1, date: '2026-05-16', name: 'Ramesh Babu', mobileNumber: '9900112233', email: 'ramesh@gmail.com', district: 'Bangalore Urban', service: 'Passport', amount: 1500, paymentStatus: 'unpaid', assignedTo: 'Priya Sharma', status: 'new', address: '12 MG Road, Bangalore', source: 'Website', notes: [], createdAt: '2026-05-16' },
  { id: 'l002', slNo: 2, date: '2026-05-16', name: 'Kavitha Rao', mobileNumber: '9900112234', email: 'kavitha@gmail.com', district: 'Mysuru', service: 'PAN Card', amount: 500, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'new', address: '45 Ashoka Road, Mysuru', source: 'WhatsApp', notes: [], createdAt: '2026-05-16' },
  { id: 'l003', slNo: 3, date: '2026-05-15', name: 'Suresh Kumar', mobileNumber: '9900112235', email: 'suresh@gmail.com', district: 'Mangaluru', service: 'Tourist Visa', amount: 3000, paymentStatus: 'unpaid', assignedTo: 'Arjun Menon', status: 'new', address: '78 Beach Road, Mangaluru', source: 'Google Ads', notes: [], createdAt: '2026-05-15' },
  { id: 'l004', slNo: 4, date: '2026-05-15', name: 'Meena Pillai', mobileNumber: '9900112236', email: 'meena@gmail.com', district: 'Belagavi', service: 'Senior Citizen Card', amount: 800, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'new', address: '22 Station Road, Belagavi', source: 'Referral', notes: [], createdAt: '2026-05-15' },
  { id: 'l005', slNo: 5, date: '2026-05-14', name: 'Gopal Krishnan', mobileNumber: '9900112237', email: 'gopal@gmail.com', district: 'Tumakuru', service: 'Rental Agreement', amount: 1200, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'new', address: '5 Temple Street, Tumakuru', source: 'Facebook Ads', notes: [], createdAt: '2026-05-14' },
  { id: 'l006', slNo: 6, date: '2026-05-14', name: 'Lakshmi Devi', mobileNumber: '9900112238', email: 'lakshmi@gmail.com', district: 'Hassan', service: 'MSME Certificate', amount: 2500, paymentStatus: 'unpaid', assignedTo: 'Arjun Menon', status: 'new', address: '88 Market Road, Hassan', source: 'Instagram', notes: [], createdAt: '2026-05-14' },
  { id: 'l007', slNo: 7, date: '2026-05-13', name: 'Venkat Reddy', mobileNumber: '9900112239', email: 'venkat@gmail.com', district: 'Bangalore Urban', service: 'Passport', amount: 1800, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'new', address: '33 Koramangala, Bangalore', source: 'Website', notes: [], createdAt: '2026-05-13' },
  { id: 'l008', slNo: 8, date: '2026-05-13', name: 'Anita Singh', mobileNumber: '9900112240', email: 'anita@gmail.com', district: 'Hubli-Dharwad', service: 'Lease Agreement', amount: 4000, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'new', address: '67 Gokul Road, Hubli', source: 'Phone Call', notes: [], createdAt: '2026-05-13' },
  { id: 'l009', slNo: 9, date: '2026-05-12', name: 'Manoj Joshi', mobileNumber: '9900112241', email: 'manoj@gmail.com', district: 'Vijayapura', service: 'Insurance', amount: 3500, paymentStatus: 'paid', assignedTo: 'Arjun Menon', status: 'new', address: '11 Gandhi Nagar, Vijayapura', source: 'WhatsApp', notes: [], createdAt: '2026-05-12' },
  { id: 'l010', slNo: 10, date: '2026-05-12', name: 'Divya Menon', mobileNumber: '9900112242', email: 'divya@gmail.com', district: 'Udupi', service: 'Police Clearance Certificate (PCC)', amount: 2000, paymentStatus: 'unpaid', assignedTo: 'Priya Sharma', status: 'new', address: '29 Temple Lane, Udupi', source: 'Google Ads', notes: [], createdAt: '2026-05-12' },
  { id: 'l011', slNo: 11, date: '2026-05-11', name: 'Ravi Shankar', mobileNumber: '9900112243', email: 'ravi@gmail.com', district: 'Chikkamagaluru', service: 'Insurance', amount: 6000, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'new', address: '44 Coffee Estate Road, Chikkamagaluru', source: 'Referral', notes: [], createdAt: '2026-05-11' },
  { id: 'l012', slNo: 12, date: '2026-05-11', name: 'Nisha Patel', mobileNumber: '9900112244', email: 'nisha@gmail.com', district: 'Bangalore Rural', service: 'Insurance', amount: 8000, paymentStatus: 'unpaid', assignedTo: 'Arjun Menon', status: 'new', address: '7 Devanahalli Road, Bangalore Rural', source: 'Instagram', notes: [], createdAt: '2026-05-11' },
  { id: 'l013', slNo: 13, date: '2026-05-10', name: 'Kiran Bhat', mobileNumber: '9900112245', email: 'kiran@gmail.com', district: 'Dakshina Kannada', service: 'Pan Card', amount: 4500, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'new', address: '19 Kadri Road, Mangaluru', source: 'Facebook Ads', notes: [], createdAt: '2026-05-10' },
  { id: 'l014', slNo: 14, date: '2026-05-10', name: 'Pooja Gowda', mobileNumber: '9900112246', email: 'pooja@gmail.com', district: 'Mandya', service: 'Lease Agreement', amount: 1500, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'new', address: '55 Sugar Factory Road, Mandya', source: 'Walk-in', notes: [], createdAt: '2026-05-10' },

  // Overdue
  { id: 'l015', slNo: 1, date: '2026-05-10', name: 'Santosh Kumar', mobileNumber: '9800112233', email: 'santosh@gmail.com', district: 'Bangalore Urban', service: 'Passport', amount: 2500, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'overdue', address: '10 Whitefield, Bangalore', source: 'Website', notes: [{ id: 'n1', text: 'Called twice, no response', author: 'Priya Sharma', createdAt: '2026-05-12' }], followUpDate: '2026-05-12', createdAt: '2026-05-08' },
  { id: 'l016', slNo: 2, date: '2026-05-09', name: 'Bhavana Rao', mobileNumber: '9800112234', email: 'bhavana@gmail.com', district: 'Mysuru', service: 'Tourist Visa', amount: 3500, paymentStatus: 'unpaid', assignedTo: 'Arjun Menon', status: 'overdue', address: '22 Sayyaji Rao Road, Mysuru', source: 'Google Ads', notes: [], followUpDate: '2026-05-11', createdAt: '2026-05-07' },
  { id: 'l017', slNo: 3, date: '2026-05-08', name: 'Harish Gowda', mobileNumber: '9800112235', email: 'harish@gmail.com', district: 'Tumakuru', service: 'PAN Card', amount: 600, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'overdue', address: '8 Tippu Circle, Tumakuru', source: 'WhatsApp', notes: [], followUpDate: '2026-05-10', createdAt: '2026-05-06' },

  // Today's Follow-up
  { id: 'l018', slNo: 1, date: '2026-05-14', name: 'Ashwini Patil', mobileNumber: '9700112233', email: 'ashwini@gmail.com', district: 'Belagavi', service: 'Affidavits/Annexure', amount: 5000, paymentStatus: 'unpaid', assignedTo: 'Priya Sharma', status: 'today', address: '33 Khanapur Road, Belagavi', source: 'Referral', notes: [], followUpDate: '2026-05-16', createdAt: '2026-05-12' },
  { id: 'l019', slNo: 2, date: '2026-05-13', name: 'Naveen Raj', mobileNumber: '9700112234', email: 'naveen@gmail.com', district: 'Bangalore Urban', service: 'Insurance', amount: 7000, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'today', address: '14 Indiranagar, Bangalore', source: 'Website', notes: [], followUpDate: '2026-05-16', createdAt: '2026-05-11' },

  // Follow-up
  { id: 'l020', slNo: 1, date: '2026-05-10', name: 'Rekha Sharma', mobileNumber: '9600112233', email: 'rekha@gmail.com', district: 'Mysuru', service: 'Rental Agreement', amount: 1200, paymentStatus: 'unpaid', assignedTo: 'Arjun Menon', status: 'followup', address: '6 Chamundi Hills Road, Mysuru', source: 'Phone Call', notes: [], followUpDate: '2026-05-18', createdAt: '2026-05-08' },
  { id: 'l021', slNo: 2, date: '2026-05-09', name: 'Dinesh Hegde', mobileNumber: '9600112234', email: 'dinesh@gmail.com', district: 'Udupi', service: 'Senior Citizen Card', amount: 900, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'followup', address: '19 Manipal Road, Udupi', source: 'Instagram', notes: [], followUpDate: '2026-05-19', createdAt: '2026-05-07' },
  { id: 'l022', slNo: 3, date: '2026-05-08', name: 'Sujatha Nair', mobileNumber: '9600112235', email: 'sujatha@gmail.com', district: 'Kalaburagi', service: 'Insurance', amount: 9000, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'followup', address: '27 Station Road, Kalaburagi', source: 'Facebook Ads', notes: [], followUpDate: '2026-05-20', createdAt: '2026-05-06' },

  // In Process
  { id: 'l023', slNo: 1, date: '2026-05-05', name: 'Ajay Verma', mobileNumber: '9500112233', email: 'ajay@gmail.com', district: 'Bangalore Urban', service: 'Passport', amount: 1500, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'inprocess', address: '88 Jayanagar, Bangalore', source: 'Website', notes: [{ id: 'n2', text: 'Documents submitted. Waiting for police verification.', author: 'Priya Sharma', createdAt: '2026-05-10' }], createdAt: '2026-05-05' },
  { id: 'l024', slNo: 2, date: '2026-05-04', name: 'Padma Kumari', mobileNumber: '9500112234', email: 'padma@gmail.com', district: 'Mandya', service: 'MSME Certificate', amount: 2500, paymentStatus: 'paid', assignedTo: 'Arjun Menon', status: 'inprocess', address: '12 Krishna Nagar, Mandya', source: 'WhatsApp', notes: [], createdAt: '2026-05-04' },
  { id: 'l025', slNo: 3, date: '2026-05-03', name: 'Bhaskar Rao', mobileNumber: '9500112235', email: 'bhaskar@gmail.com', district: 'Hubli-Dharwad', service: 'Insurance', amount: 5000, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'inprocess', address: '44 Vidyanagar, Hubli', source: 'Google Ads', notes: [], createdAt: '2026-05-03' },
  { id: 'l026', slNo: 4, date: '2026-05-02', name: 'Chitra Rao', mobileNumber: '9500112236', email: 'chitra@gmail.com', district: 'Shivamogga', service: 'Police Clearance Certificate (PCC)', amount: 2000, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'inprocess', address: '3 Sagar Road, Shivamogga', source: 'Referral', notes: [], createdAt: '2026-05-02' },
  { id: 'l027', slNo: 5, date: '2026-05-01', name: 'Deepak S', mobileNumber: '9500112237', email: 'deepaks@gmail.com', district: 'Bangalore Urban', service: 'Tourist Visa', amount: 4000, paymentStatus: 'paid', assignedTo: 'Arjun Menon', status: 'inprocess', address: '55 HSR Layout, Bangalore', source: 'Website', notes: [], createdAt: '2026-05-01' },
  { id: 'l028', slNo: 6, date: '2026-04-30', name: 'Saritha Menon', mobileNumber: '9500112238', email: 'saritha@gmail.com', district: 'Kochi', service: 'Affidavit / Annexure', amount: 800, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'inprocess', address: '9 MG Road, Kochi', source: 'Instagram', notes: [], createdAt: '2026-04-30' },
  { id: 'l029', slNo: 7, date: '2026-04-29', name: 'Murali Krishna', mobileNumber: '9500112239', email: 'murali@gmail.com', district: 'Davangere', service: 'Insurance', amount: 3000, paymentStatus: 'unpaid', assignedTo: 'Priya Sharma', status: 'inprocess', address: '77 PJ Extension, Davangere', source: 'Facebook Ads', notes: [], createdAt: '2026-04-29' },
  { id: 'l030', slNo: 8, date: '2026-04-28', name: 'Ambika Gowda', mobileNumber: '9500112240', email: 'ambika@gmail.com', district: 'Raichur', service: 'PAN Card', amount: 600, paymentStatus: 'paid', assignedTo: 'Arjun Menon', status: 'inprocess', address: '22 Yadgir Road, Raichur', source: 'Walk-in', notes: [], createdAt: '2026-04-28' },
  { id: 'l031', slNo: 9, date: '2026-04-27', name: 'Prakash Jain', mobileNumber: '9500112241', email: 'prakash@gmail.com', district: 'Vijayapura', service: 'Lease Agreement', amount: 1500, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'inprocess', address: '18 Basaveshwara Nagar, Vijayapura', source: 'WhatsApp', notes: [], createdAt: '2026-04-27' },

  // Converted
  { id: 'l032', slNo: 1, date: '2026-04-20', name: 'Sunita Naik', mobileNumber: '9400112233', email: 'sunita@gmail.com', district: 'Bangalore Urban', service: 'Police Verification Certificate (PVC)', amount: 1800, paymentStatus: 'paid', assignedTo: 'Priya Sharma', status: 'converted', address: '4 BTM Layout, Bangalore', source: 'Website', notes: [], createdAt: '2026-04-15' },
  { id: 'l033', slNo: 2, date: '2026-04-18', name: 'Ganesh Pai', mobileNumber: '9400112234', email: 'ganesh@gmail.com', district: 'Mangaluru', service: 'MSME Certificate', amount: 4500, paymentStatus: 'paid', assignedTo: 'Arjun Menon', status: 'converted', address: '6 Hampankatta, Mangaluru', source: 'Google Ads', notes: [], createdAt: '2026-04-10' },
  { id: 'l034', slNo: 3, date: '2026-04-15', name: 'Shobha Kumari', mobileNumber: '9400112235', email: 'shobha@gmail.com', district: 'Mysuru', service: 'Insurance', amount: 6500, paymentStatus: 'paid', assignedTo: 'Rahul Nair', status: 'converted', address: '9 Lakshmipuram, Mysuru', source: 'Referral', notes: [], createdAt: '2026-04-08' },

  // Dead
  { id: 'l035', slNo: 1, date: '2026-04-10', name: 'Raju Gowda', mobileNumber: '9300112233', email: 'raju@gmail.com', district: 'Bangalore Urban', service: 'PAN Card', amount: 500, paymentStatus: 'unpaid', assignedTo: 'Priya Sharma', status: 'dead', address: '11 Rajajinagar, Bangalore', source: 'Phone Call', notes: [{ id: 'n3', text: 'Customer not interested anymore', author: 'Priya Sharma', createdAt: '2026-04-15' }], createdAt: '2026-04-08' },
  { id: 'l036', slNo: 2, date: '2026-04-08', name: 'Vimal Raj', mobileNumber: '9300112234', email: 'vimal@gmail.com', district: 'Tumakuru', service: 'Tourist Visa', amount: 3000, paymentStatus: 'unpaid', assignedTo: 'Rahul Nair', status: 'dead', address: '5 KRS Road, Tumakuru', source: 'Instagram', notes: [], createdAt: '2026-04-06' },
];

export const MOCK_BLOGS: Blog[] = [
  { id: 'b1', slNo: 1, title: 'How to Apply for Passport Online in India 2026 – Guide Step-by-Step Process Documents Fees Tips', image: '/blog1.jpg', metaTitle: 'Apply for Passport Online India 2026', metaDescription: 'Complete guide to apply for passport online in India.', description: '<p>In today\'s digital-first world, applying for a passport...</p>', createdAt: '2026-04-01', status: 'published' },
  { id: 'b2', slNo: 2, title: 'Vietnam Tourist Visa for Indians 2026 – Guide Apply Online Fees Documents Processing Time', image: '/blog2.jpg', metaTitle: 'Vietnam Tourist Visa for Indians 2026', metaDescription: 'How Indians can apply for Vietnam tourist visa.', description: '<p>Planning a trip to Vietnam?...</p>', createdAt: '2026-04-05', status: 'published' },
  { id: 'b3', slNo: 3, title: 'PAN Card New Rules from April 2026 – Complete Guide for Applicants', image: '/blog3.jpg', metaTitle: 'PAN Card New Rules April 2026', metaDescription: 'New PAN card rules effective April 2026.', description: '<p>PAN Card Rule Changes 2026: What you need to know...</p>', createdAt: '2026-04-10', status: 'published' },
  { id: 'b4', slNo: 4, title: 'How to Apply for Senior Citizen Card in Bangalore', image: '/blog4.jpg', metaTitle: 'Senior Citizen Card Bangalore', metaDescription: 'Step-by-step guide for senior citizen card in Bangalore.', description: '<p>If you are looking for how to apply for...</p>', createdAt: '2026-04-15', status: 'published' },
  { id: 'b5', slNo: 5, title: 'How to Apply for Dubai Tourist Visa from India', image: '/blog5.jpg', metaTitle: 'Dubai Tourist Visa from India', metaDescription: 'Complete guide for Dubai tourist visa application.', description: '<p>Planning a trip to Dubai in 2026?...</p>', createdAt: '2026-04-20', status: 'published' },
];

export function getLeadsByStatus(status: string): Lead[] {
  return MOCK_LEADS.filter((l) => l.status === status);
}

export function getLeadById(id: string): Lead | undefined {
  return MOCK_LEADS.find((l) => l.id === id);
}

export function getDashboardStats() {
  return {
    new: MOCK_LEADS.filter((l) => l.status === 'new').length,
    overdue: MOCK_LEADS.filter((l) => l.status === 'overdue').length,
    today: MOCK_LEADS.filter((l) => l.status === 'today').length,
    followup: MOCK_LEADS.filter((l) => l.status === 'followup').length,
    inprocess: MOCK_LEADS.filter((l) => l.status === 'inprocess').length,
    converted: MOCK_LEADS.filter((l) => l.status === 'converted').length,
    dead: MOCK_LEADS.filter((l) => l.status === 'dead').length,
    total: MOCK_LEADS.length,
  };
}
