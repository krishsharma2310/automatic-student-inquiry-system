export type UserRole = 'admin' | 'team_lead' | 'counsellor' | 'front_office';

export interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  teamLeadId?: string | null;
  assignedCourses?: string[];
  mobileNo?: string;
  photoURL?: string;
  onBreak?: boolean;
  breakStartTime?: string;
  breakDurationMins?: number;
  lastSeen?: string;
  createdAt: string;
}

export type EnquiryStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Enquiry {
  id: string;
  studentName: string;
  fatherName: string;
  lastInstitution: string;
  address: string;
  state: string;
  pincode: string;
  studentEmail: string;
  studentPhone: string;
  course: string;
  category: string;
  marks12th?: string;
  marksGrad?: string;
  city: string;
  message: string;
  tokenId: string;
  counsellorId: string;
  teamLeadId: string;
  status: EnquiryStatus;
  notes?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface TimeLog {
  id: string;
  enquiryId: string;
  counsellorId: string;
  startTime: string;
  endTime?: string;
  totalTime?: number;
}

export interface TransportRoute {
  id: string;
  routeName: string;
  busNumber: string;
  busRegNo?: string;
  driverName: string;
  driverPhone: string;
  helperName?: string;
  morningTime: string;
  eveningTime: string;
  isActive: boolean;
  stops?: string[]; // Optional array of stop names for visualization
  createdAt?: string;
}

export interface TransportStop {
  id: string;
  stopName: string;
  routeId: string; // Primary route
  pickupTime: string;
  dropTime: string;
  srNo?: number;
  location?: string;
  routes?: string[]; // Optional array of other route IDs
  createdAt?: string;
}
