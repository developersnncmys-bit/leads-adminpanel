import type { Lead } from './types';
import { formatDate } from './format';

export interface FieldDef {
  label: string;
  key: string;
  source?: 'lead' | 'formData'; // default: 'lead'
}

export type FieldRow = (FieldDef | null)[];   // null = empty cell
export type ServiceSchema = FieldRow[];

/* ── Shared header rows ───────────────────────────────── */

const META: FieldRow[] = [
  [
    { label: 'Date',     key: 'date'    },
    { label: 'Time',     key: 'time'    },
    { label: 'Order Id', key: 'orderId' },
  ],
];

const ASSIGN_ROW: FieldRow = [
  { label: 'Status',        key: 'paymentStatus' },
  { label: 'Assigned User', key: 'assignedTo'    },
  { label: 'Name',          key: 'name'          },
];

/* ── Tourist Visa (all 16 countries — identical form) ──── */
// Fields: travellingDate, returningDate, name, gender,
//         mobile, email, address, state, district, pinCode

const TOURIST_VISA: ServiceSchema = [
  ...META,
  [
    { label: 'Service',         key: 'service'        },
    { label: 'Travelling Date', key: 'travellingDate', source: 'formData' },
    { label: 'Returning Date',  key: 'returningDate',  source: 'formData' },
  ],
  [
    { label: 'Amount', key: 'amount' },
    ...ASSIGN_ROW.slice(0, 2),
  ],
  [
    { label: 'Name',          key: 'name'         },
    { label: 'Gender',        key: 'gender',       source: 'formData' },
    { label: 'Mobile Number', key: 'mobileNumber' },
  ],
  [
    { label: 'Email ID',  key: 'email'    },
    { label: 'Address',   key: 'address'  },
    { label: 'State',     key: 'state',    source: 'formData' },
  ],
  [
    { label: 'District', key: 'district', source: 'formData' },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
    null,
  ],
];

/* ── Police Verification Certificate (PVC) ─────────────── */
// Fields: applyingFor, givenName, gender, dob, placeOfBirth,
//         employment, education, address, state, pinCode,
//         policeStation, mobile, email

const POLICE_VERIFICATION: ServiceSchema = [
  ...META,
  [
    { label: 'Service',      key: 'service'      },
    { label: 'Applying For', key: 'applyingFor',  source: 'formData' },
    { label: 'Amount',       key: 'amount'       },
  ],
  ASSIGN_ROW,
  [
    { label: 'Gender',        key: 'gender',      source: 'formData' },
    { label: 'Date of Birth', key: 'dateOfBirth', source: 'formData' },
    { label: 'Address',       key: 'address'                        },
  ],
  [
    { label: 'Education Qualification', key: 'educationQualification', source: 'formData' },
    { label: 'Employment Type',         key: 'employmentType',         source: 'formData' },
    null,
  ],
  [
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
  ],
  [
    { label: 'Near By Police Station', key: 'nearbyPoliceStation', source: 'formData' },
    { label: 'Mobile Number',          key: 'mobileNumber'        },
    { label: 'Email ID',               key: 'email'               },
  ],
];

/* ── Police Clearance Certificate (PCC) — same layout ───── */
const POLICE_CLEARANCE: ServiceSchema = POLICE_VERIFICATION;

/* ── Passport ───────────────────────────────────────────── */
// Fields: applyingFor, appType, bookletType, gender,
//         givenName, surname, dob, placeOfBirth,
//         education, employment, maritalStatus,
//         fatherName, motherName,
//         address, state, district, pinCode,
//         policeStation, mobile, email

const PASSPORT: ServiceSchema = [
  ...META,
  [
    { label: 'Service',         key: 'service'       },
    { label: 'Applying For',    key: 'applyingFor',   source: 'formData' },
    { label: 'Amount',          key: 'amount'        },
  ],
  [
    { label: 'Status',        key: 'paymentStatus'                     },
    { label: 'Assigned User', key: 'assignedTo'                        },
    { label: 'Given Name',    key: 'givenName', source: 'formData'     },
  ],
  [
    { label: 'Surname',         key: 'surname',       source: 'formData' },
    { label: 'Gender',          key: 'gender',        source: 'formData' },
    { label: 'Date of Birth',   key: 'dateOfBirth',   source: 'formData' },
  ],
  [
    { label: 'Education Qualification', key: 'educationQualification', source: 'formData' },
    { label: 'Employment Type',         key: 'employmentType',         source: 'formData' },
    { label: 'Marital Status',          key: 'maritalStatus',          source: 'formData' },
  ],
  [
    { label: "Spouse's Name",   key: 'spouseName',    source: 'formData' },
    { label: "Father's Name",   key: 'fatherName',    source: 'formData' },
    { label: "Mother's Name",   key: 'motherName',    source: 'formData' },
  ],
  [
    { label: 'Application Type', key: 'appType',      source: 'formData' },
    { label: 'Booklet Type',     key: 'bookletType',  source: 'formData' },
    { label: 'Address',          key: 'address'      },
  ],
  [
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district'                     },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
  ],
  [
    { label: 'Near By Police Station', key: 'nearbyPoliceStation', source: 'formData' },
    { label: 'Mobile Number',          key: 'mobileNumber'        },
    { label: 'Email ID',               key: 'email'               },
  ],
];

/* ── PAN Card ───────────────────────────────────────────── */
// Fields: serviceType (New/Correction/Lost), name, gender, dob,
//         fatherName, motherName, printName, aadhaar,
//         address, state, district, pin, mobile, email

const PAN_CARD: ServiceSchema = [
  ...META,
  [
    { label: 'Service',      key: 'service'      },
    { label: 'Service Type', key: 'serviceType',  source: 'formData' },
    { label: 'Amount',       key: 'amount'       },
  ],
  ASSIGN_ROW,
  [
    { label: 'Gender',        key: 'gender',     source: 'formData' },
    { label: 'Date of Birth', key: 'dateOfBirth', source: 'formData' },
    { label: "Father's Name", key: 'fatherName',  source: 'formData' },
  ],
  [
    { label: "Mother's Name",       key: 'motherName',  source: 'formData' },
    { label: 'Aadhaar Number',      key: 'aadhaar',     source: 'formData' },
    { label: 'Print Name On Card',  key: 'printName',   source: 'formData' },
  ],
  [
    { label: 'Address',  key: 'address'  },
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
  ],
  [
    { label: 'Pin Code',      key: 'pinCode',      source: 'formData' },
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
  ],
];

/* ── MSME Certificate ───────────────────────────────────── */
// Fields: name, aadhaar, bizName, orgType, incorpDate, bizPan,
//         address, state, district, pincode, mobile, email

const MSME: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Amount',  key: 'amount'  },
    ...ASSIGN_ROW.slice(0, 1),
  ],
  [
    { label: 'Assigned User', key: 'assignedTo' },
    { label: 'Name',          key: 'name'       },
    { label: 'Aadhaar Number', key: 'aadhaar',   source: 'formData' },
  ],
  [
    { label: 'Business Name',       key: 'bizName',   source: 'formData' },
    { label: 'Organisation Type',   key: 'orgType',   source: 'formData' },
    { label: 'Incorporation Date',  key: 'incorpDate', source: 'formData' },
  ],
  [
    { label: 'Business PAN', key: 'bizPan',   source: 'formData' },
    { label: 'Address',      key: 'address'  },
    { label: 'State',        key: 'state',    source: 'formData' },
  ],
  [
    { label: 'District',      key: 'district'                },
    { label: 'Pin Code',      key: 'pinCode',  source: 'formData' },
    { label: 'Mobile Number', key: 'mobileNumber'           },
  ],
  [
    { label: 'Email ID', key: 'email' },
    null,
    null,
  ],
];

/* ── Senior Citizen Card ────────────────────────────────── */
// Fields: name, dob, gender, bloodGroup,
//         address, state, district, pinCode, mobile, email

const SENIOR_CITIZEN_CARD: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Amount',  key: 'amount'  },
    ...ASSIGN_ROW.slice(0, 1),
  ],
  [
    { label: 'Assigned User', key: 'assignedTo'              },
    { label: 'Name',          key: 'name'                    },
    { label: 'Date of Birth', key: 'dateOfBirth', source: 'formData' },
  ],
  [
    { label: 'Gender',      key: 'gender',     source: 'formData' },
    { label: 'Blood Group', key: 'bloodGroup', source: 'formData' },
    { label: 'Address',     key: 'address'    },
  ],
  [
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
  ],
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    null,
  ],
];

/* ── Rental Agreement ───────────────────────────────────── */
// Fields: agreementType, role, stampPaper,
//         ownerName, ownerFather, ownerAddress, ownerState, ownerPin,
//         tenantName, tenantFather, tenantAddress, tenantState, tenantPin,
//         shiftedDate, shiftingAddress, securityDeposit, monthlyRent, advanceAmount,
//         advancePaid, waterCharges, paintingCharges, accommodation, appliances,
//         shippingAddress, shippingState, shippingPin, mobile, email

const RENTAL_AGREEMENT: ServiceSchema = [
  ...META,
  [
    { label: 'Service',         key: 'service'          },
    { label: 'Agreement Type',  key: 'agreementType', source: 'formData' },
    { label: 'Amount',          key: 'amount'           },
  ],
  [
    { label: 'Status',       key: 'paymentStatus'               },
    { label: 'Role',         key: 'role',        source: 'formData' },
    { label: 'Stamp Paper',  key: 'stampPaper',  source: 'formData' },
  ],
  [
    { label: "Owner's Name",    key: 'ownerName',    source: 'formData' },
    { label: "Owner's Father",  key: 'ownerFather',  source: 'formData' },
    { label: "Owner's Address", key: 'ownerAddress', source: 'formData' },
  ],
  [
    { label: "Owner's State",    key: 'ownerState',    source: 'formData' },
    { label: "Owner's District", key: 'ownerDistrict', source: 'formData' },
    { label: "Owner's Pin",      key: 'ownerPin',      source: 'formData' },
  ],
  [
    { label: "Tenant's Name",    key: 'tenantName',    source: 'formData' },
    { label: "Tenant's Father",  key: 'tenantFather',  source: 'formData' },
    { label: "Tenant's Address", key: 'tenantAddress', source: 'formData' },
  ],
  [
    { label: "Tenant's State",    key: 'tenantState',    source: 'formData' },
    { label: "Tenant's District", key: 'tenantDistrict', source: 'formData' },
    { label: "Tenant's Pin",      key: 'tenantPin',      source: 'formData' },
  ],
  [
    { label: 'Shifted Date',     key: 'shiftedDate',    source: 'formData' },
    { label: 'Shifting Address', key: 'shiftingAddress', source: 'formData' },
    { label: 'Security Deposit', key: 'securityDeposit', source: 'formData' },
  ],
  [
    { label: 'Monthly Rent',   key: 'monthlyRent',   source: 'formData' },
    { label: 'Advance Amount', key: 'advanceAmount', source: 'formData' },
    { label: 'Advance Paid',   key: 'advancePaid',   source: 'formData' },
  ],
  [
    { label: 'Water Charges',    key: 'waterCharges',    source: 'formData' },
    { label: 'Painting Charges', key: 'paintingCharges', source: 'formData' },
    { label: 'Accommodation',    key: 'accommodation',   source: 'formData' },
  ],
  [
    { label: 'Appliances',       key: 'appliances',      source: 'formData' },
    { label: 'Shipping Address', key: 'shippingAddress', source: 'formData' },
    { label: 'Shipping State',   key: 'shippingState',   source: 'formData' },
  ],
  [
    { label: 'Shipping District', key: 'shippingDistrict', source: 'formData' },
    { label: 'Shipping Pin',      key: 'shippingPin',      source: 'formData' },
    { label: 'Assigned User',     key: 'assignedTo'                          },
  ],
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    null,
  ],
];

/* ── Lease Agreement (Rental layout, but `safetyDeposit` replaces `advanceAmount`) ─ */
const LEASE_AGREEMENT: ServiceSchema = [
  ...META,
  [
    { label: 'Service',         key: 'service'          },
    { label: 'Agreement Type',  key: 'agreementType', source: 'formData' },
    { label: 'Amount',          key: 'amount'           },
  ],
  [
    { label: 'Status',       key: 'paymentStatus'               },
    { label: 'Role',         key: 'role',        source: 'formData' },
    { label: 'Stamp Paper',  key: 'stampPaper',  source: 'formData' },
  ],
  [
    { label: "Owner's Name",    key: 'ownerName',    source: 'formData' },
    { label: "Owner's Father",  key: 'ownerFather',  source: 'formData' },
    { label: "Owner's Address", key: 'ownerAddress', source: 'formData' },
  ],
  [
    { label: "Owner's State",    key: 'ownerState',    source: 'formData' },
    { label: "Owner's District", key: 'ownerDistrict', source: 'formData' },
    { label: "Owner's Pin",      key: 'ownerPin',      source: 'formData' },
  ],
  [
    { label: "Tenant's Name",    key: 'tenantName',    source: 'formData' },
    { label: "Tenant's Father",  key: 'tenantFather',  source: 'formData' },
    { label: "Tenant's Address", key: 'tenantAddress', source: 'formData' },
  ],
  [
    { label: "Tenant's State",    key: 'tenantState',    source: 'formData' },
    { label: "Tenant's District", key: 'tenantDistrict', source: 'formData' },
    { label: "Tenant's Pin",      key: 'tenantPin',      source: 'formData' },
  ],
  [
    { label: 'Shifted Date',     key: 'shiftedDate',    source: 'formData' },
    { label: 'Shifting Address', key: 'shiftingAddress', source: 'formData' },
    { label: 'Security Deposit', key: 'securityDeposit', source: 'formData' },
  ],
  [
    { label: 'Monthly Rent',   key: 'monthlyRent',   source: 'formData' },
    { label: 'Safety Deposit', key: 'safetyDeposit', source: 'formData' },
    { label: 'Advance Paid',   key: 'advancePaid',   source: 'formData' },
  ],
  [
    { label: 'Water Charges',    key: 'waterCharges',    source: 'formData' },
    { label: 'Painting Charges', key: 'paintingCharges', source: 'formData' },
    { label: 'Accommodation',    key: 'accommodation',   source: 'formData' },
  ],
  [
    { label: 'Appliances',       key: 'appliances',      source: 'formData' },
    { label: 'Shipping Address', key: 'shippingAddress', source: 'formData' },
    { label: 'Shipping State',   key: 'shippingState',   source: 'formData' },
  ],
  [
    { label: 'Shipping District', key: 'shippingDistrict', source: 'formData' },
    { label: 'Shipping Pin',      key: 'shippingPin',      source: 'formData' },
    { label: 'Assigned User',     key: 'assignedTo'                          },
  ],
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    null,
  ],
];

/* ── Insurance ──────────────────────────────────────────── */
// One schema per insurance type — each website form collects different fields,
// so we render them all instead of a generic insurance layout.

// Health Insurance: intent, gender, member1, member2, age, disease + contact
const HEALTH_INSURANCE: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Intent',     key: 'intent',  source: 'formData' },
    { label: 'Gender',     key: 'gender',  source: 'formData' },
    { label: 'Insure For', key: 'member1', source: 'formData' },
  ],
  [
    { label: 'Additional Member',    key: 'member2', source: 'formData' },
    { label: 'Age Group',            key: 'age',     source: 'formData' },
    { label: 'Pre-existing Disease', key: 'disease', source: 'formData' },
  ],
  [
    { label: 'Address',  key: 'address'  },
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
  ],
  [
    { label: 'Pin Code',      key: 'pinCode',     source: 'formData' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'Mobile Number', key: 'mobileNumber' },
  ],
];

// Life Insurance: intent, gender, dob + contact
const LIFE_INSURANCE: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Intent',        key: 'intent',      source: 'formData' },
    { label: 'Gender',        key: 'gender',      source: 'formData' },
    { label: 'Date of Birth', key: 'dateOfBirth', source: 'formData' },
  ],
  [
    { label: 'Address',  key: 'address'  },
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
  ],
  [
    { label: 'Pin Code',      key: 'pinCode',     source: 'formData' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'Mobile Number', key: 'mobileNumber' },
  ],
];

// Two-Wheeler / Four-Wheeler Insurance — they don't collect Vehicle Type,
// so it's intentionally absent here (only the Commercial form asks for it).
const VEHICLE_INSURANCE: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Intent',           key: 'intent',    source: 'formData' },
    { label: 'Registration No.', key: 'regNumber', source: 'formData' },
    { label: 'Registration Date', key: 'regDate',  source: 'formData' },
  ],
  [
    { label: 'Address',  key: 'address'                     },
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district'                     },
  ],
  [
    { label: 'Pin Code',      key: 'pinCode',     source: 'formData' },
    { label: 'Email ID',      key: 'email'                          },
    { label: 'Mobile Number', key: 'mobileNumber'                   },
  ],
];

// Commercial Vehicle Insurance — same as the wheeler form but with the extra
// Vehicle Type field (Truck / Van / Taxi / Bus / Tractor / Other).
const COMMERCIAL_VEHICLE_INSURANCE: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Intent',           key: 'intent',      source: 'formData' },
    { label: 'Vehicle Type',     key: 'vehicleType', source: 'formData' },
    { label: 'Registration No.', key: 'regNumber',   source: 'formData' },
  ],
  [
    { label: 'Registration Date', key: 'regDate', source: 'formData' },
    { label: 'Address',           key: 'address'                     },
    { label: 'State',             key: 'state',   source: 'formData' },
  ],
  [
    { label: 'District',      key: 'district'                       },
    { label: 'Pin Code',      key: 'pinCode',     source: 'formData' },
    { label: 'Email ID',      key: 'email'                          },
  ],
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    null,
    null,
  ],
];

// Generic insurance fallback when the service name doesn't identify a type
const INSURANCE: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Address',  key: 'address'  },
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district' },
  ],
  [
    { label: 'Pin Code',      key: 'pinCode',      source: 'formData' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'Mobile Number', key: 'mobileNumber' },
  ],
];

/* ── Default fallback ───────────────────────────────────── */

const DEFAULT: ServiceSchema = [
  ...META,
  [
    { label: 'Service',      key: 'service'      },
    { label: 'Applying For', key: 'applyingFor'  },
    { label: 'Amount',       key: 'amount'       },
  ],
  ASSIGN_ROW,
  [
    { label: 'Gender',        key: 'gender'      },
    { label: 'Date of Birth', key: 'dateOfBirth' },
    { label: 'Address',       key: 'address'     },
  ],
  [
    { label: 'Education Qualification', key: 'educationQualification' },
    { label: 'Employment Type',         key: 'employmentType'         },
    { label: 'State',                   key: 'state'                  },
  ],
  [
    { label: 'District', key: 'district' },
    { label: 'Pin Code', key: 'pinCode'  },
    null,
  ],
  [
    { label: 'Near By Police Station', key: 'nearbyPoliceStation' },
    { label: 'Mobile Number',          key: 'mobileNumber'        },
    { label: 'Email ID',               key: 'email'               },
  ],
];

/* ── Admin-created (manual) lead — only the fields the Add Lead form collects ── */

export const MANUAL_SCHEMA: ServiceSchema = [
  [
    { label: 'Date',    key: 'date'    },
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
  ],
  [
    { label: 'Name',          key: 'name'         },
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
  ],
  [
    { label: 'Address', key: 'address' },
    null,
    null,
  ],
];

/* ── Affidavit / Annexure ──────────────────────────────────── */
// The affidavit form collects: name, mobile, email, address, state, district,
// pin, plus the affidavit type (stored on the lead as `applyingFor`). We only
// render those fields so the admin view doesn't show empty placeholders for
// fields that were never asked.

const AFFIDAVIT: ServiceSchema = [
  ...META,
  [
    { label: 'Service',      key: 'service'      },
    { label: 'Applying For', key: 'applyingFor'  },
    { label: 'Amount',       key: 'amount'       },
  ],
  ASSIGN_ROW,
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'Address',       key: 'address'      },
  ],
  [
    { label: 'State',    key: 'state',    source: 'formData' },
    { label: 'District', key: 'district'                     },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
  ],
];

/* ── Contact form leads ───────────────────────────────────── */
// Used when the lead's source is 'Contact Us' (the main contact page).
// The form only collects: name, mobile, email, service.

const CONTACT_US: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'State',         key: 'state',    source: 'formData' },
  ],
  [
    { label: 'District', key: 'district'                     },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
    null,
  ],
];

/* ── Home page "Apply in 2 Minutes" callback form ──────────── */
// Triggered when the lead's source starts with 'Home' (the Solution
// component sends `source: 'Home – Stop Searching'`). The form collects
// only name, mobile and the requested service — nothing else should show.
const HOME_FORM: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'State',         key: 'state',   source: 'formData' },
    { label: 'District',      key: 'district'                    },
  ],
  [
    { label: 'Pin Code', key: 'pinCode', source: 'formData' },
    null,
    null,
  ],
];

// Used when the lead's source is 'Blog Contact' (the sidebar form on blog
// detail pages). Same as Contact Us but also collects address fields.

const BLOG_CONTACT: ServiceSchema = [
  ...META,
  [
    { label: 'Service', key: 'service' },
    { label: 'Source',  key: 'source'  },
    { label: 'Amount',  key: 'amount'  },
  ],
  ASSIGN_ROW,
  [
    { label: 'Mobile Number', key: 'mobileNumber' },
    { label: 'Email ID',      key: 'email'        },
    { label: 'State',         key: 'state',   source: 'formData' },
  ],
  [
    { label: 'District', key: 'district'                     },
    { label: 'Pin Code', key: 'pinCode',  source: 'formData' },
    null,
  ],
];

/* ── Schema registry ──────────────────────────────────────── */

export function getSchema(input: Lead | string): ServiceSchema {
  const service = typeof input === 'string' ? input : (input?.service || '');
  const source  = typeof input === 'string' ? ''      : (input?.source  || '');
  const s   = service.toLowerCase();
  const src = source.toLowerCase();

  // Contact-style leads ignore the service-specific schema and use a minimal
  // layout that only shows what the small contact form actually collected.
  if (src === 'contact us')   return CONTACT_US;
  if (src === 'blog contact') return BLOG_CONTACT;
  if (src.startsWith('home')) return HOME_FORM;

  if (s.includes('affidavit') || s.includes('annexure')) return AFFIDAVIT;
  if (s.includes('visa'))                       return TOURIST_VISA;
  if (s.includes('passport'))                   return PASSPORT;
  if (s.includes('pan card') || s.includes('pancard')) return PAN_CARD;
  if (s.includes('police verification'))        return POLICE_VERIFICATION;
  if (s.includes('police clearance'))           return POLICE_CLEARANCE;
  if (s.includes('msme'))                       return MSME;
  if (s.includes('senior citizen'))             return SENIOR_CITIZEN_CARD;
  if (s.includes('health insurance'))           return HEALTH_INSURANCE;
  if (s.includes('life insurance'))             return LIFE_INSURANCE;
  if (s.includes('commercial vehicle insurance')) return COMMERCIAL_VEHICLE_INSURANCE;
  if (s.includes('wheeler insurance'))            return VEHICLE_INSURANCE;
  if (s.includes('rental agreement'))           return RENTAL_AGREEMENT;
  if (s.includes('lease agreement'))            return LEASE_AGREEMENT;
  if (s.includes('insurance'))                  return INSURANCE;
  return DEFAULT;
}

/* ── Resolve a field value from lead + formData ──────────── */

// Leads migrated from the old system store form values under the OLD field
// names. Map the current schema keys to those legacy keys so migrated leads
// still show every field. (Keys that only differ by case/underscores are
// caught by the normalized fallback below, so only genuinely different names
// need listing here.)
const LEGACY_FIELD_ALIASES: Record<string, string[]> = {
  givenName: ['givename'],
  appType: ['applicationType'],
  bookletType: ['passportBookletType'],
  serviceType: ['services'],
  aadhaar: ['adharnumber'],
  printName: ['printOnPanCard'],
  bizName: ['businessName'],
  orgType: ['organisationType', 'typeoforganisation'],
  incorpDate: ['dateOfIncorporation'],
  bizPan: ['pancardproprietorownerpancardnumber'],
  ownerFather: ['ownersfathername'],
  tenantFather: ['tenantsfathername'],
  dateOfBirth: ['dob'],
  educationQualification: ['qualification'],
  applyingFor: ['applying_for'],
  nearbyPoliceStation: ['nearby_police_station'],
};

const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

// Look a value up in formData by the schema key, then known legacy aliases,
// then any key whose normalized form matches (e.g. fatherName -> fathername).
function lookupFormData(
  formData: Record<string, unknown> | undefined,
  key: string,
): unknown {
  if (!formData) return undefined;
  if (!isEmpty(formData[key])) return formData[key];
  for (const alias of LEGACY_FIELD_ALIASES[key] || []) {
    if (!isEmpty(formData[alias])) return formData[alias];
  }
  const target = normKey(key);
  for (const k of Object.keys(formData)) {
    if (normKey(k) === target && !isEmpty(formData[k])) return formData[k];
  }
  return undefined;
}

export function resolveField(lead: Lead, field: FieldDef | null): string {
  if (!field || !field.key) return '—';
  const leadObj = lead as unknown as Record<string, unknown>;
  const formData = lead.formData as Record<string, unknown> | undefined;
  let raw: unknown;
  if (field.source === 'formData') {
    raw = lookupFormData(formData, field.key);
    if (isEmpty(raw)) raw = leadObj[field.key];
  } else {
    raw = leadObj[field.key];
    if (isEmpty(raw)) raw = lookupFormData(formData, field.key);
  }
  if (isEmpty(raw)) return '—';
  const str = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return formatDate(str);
  return str;
}
