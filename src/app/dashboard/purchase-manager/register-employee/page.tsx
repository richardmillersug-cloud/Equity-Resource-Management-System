'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import { photoService } from '@/lib/services/photo-service';
import { EmployeeDocumentsService } from '@/lib/firebase/employee-documents-service';
import { DocumentType } from '@/lib/constants/document-types';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  UserPlus,
  AlertCircle,
  Check,
  Camera,
  Upload,
  X,
  CreditCard,
  Users,
  Moon,
  Sun,
} from 'lucide-react';
import { SHIFT_DEFINITIONS, STAFF_SHIFTS } from '@/lib/firebase/staff-shifts';
import { SUPERMARKET_SECTIONS } from '@/lib/constants/supermarket-sections';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  employeeNIN: string;
  address: string;
  dateOfBirth: string;
  hireDate: string;
  branchId: string;
  jobTitle: string;
  baseSalary: string;
  workingSection: string;
  assignedShift: 'day' | 'night';
  nextOfKinName: string;
  nextOfKinNIN: string;
  nextOfKinPhoneNumber: string;
}

interface Branch {
  id: string;
  branchName: string;
}

const PM_JOB_ROLES = [
  { id: 'manager', title: 'Manager', defaultSalary: 1200000 },
  { id: 'assistant-manager', title: 'Assistant Manager', defaultSalary: 900000 },
  { id: 'stock-manager', title: 'Stock Manager', defaultSalary: 1000000 },
  { id: 'supervisor', title: 'Supervisor', defaultSalary: 950000 },
  { id: 'attendant', title: 'Attendant', defaultSalary: 500000 },
];

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'kyengera', branchName: 'Kyengera Branch' },
  { id: 'main', branchName: 'Main Branch' },
  { id: 'ntinda', branchName: 'Ntinda Branch' },
  { id: 'entebbe', branchName: 'Entebbe Branch' },
  { id: 'jinja', branchName: 'Jinja Branch' },
];

const inputClass = (hasError?: boolean) =>
  `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
    hasError ? 'border-red-300' : 'border-gray-300'
  }`;

export default function PMRegisterEmployeePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [registeredByName, setRegisteredByName] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEmployeeName, setCreatedEmployeeName] = useState('');

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoCompressionInfo, setPhotoCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const [chairmanLetter, setChairmanLetter] = useState<File | null>(null);
  const [employeeIdPdf, setEmployeeIdPdf] = useState<File | null>(null);
  const [nextOfKinIdPdf, setNextOfKinIdPdf] = useState<File | null>(null);
  const [applicationLetter, setApplicationLetter] = useState<File | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    employeeNIN: '',
    address: '',
    dateOfBirth: '',
    hireDate: new Date().toISOString().split('T')[0],
    branchId: '',
    jobTitle: '',
    baseSalary: '',
    workingSection: '',
    assignedShift: 'day',
    nextOfKinName: '',
    nextOfKinNIN: '',
    nextOfKinPhoneNumber: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user?.employee) {
      setRegisteredByName(`${user.employee.firstName} ${user.employee.lastName}`);
      if (user.employee.branchId) {
        setFormData((prev) => ({ ...prev, branchId: user.employee!.branchId }));
      }
    }
    return () => {
      if (photoPreview) photoService.revokePreviewUrl(photoPreview);
    };
  }, [photoPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'jobTitle') {
        const role = PM_JOB_ROLES.find((r) => r.title === value);
        if (role) next.baseSalary = role.defaultSalary.toString();
      }
      return next;
    });
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoCompressionInfo(null);
    const validation = photoService.validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid file');
      return;
    }
    try {
      setPhotoUploading(true);
      if (photoPreview) photoService.revokePreviewUrl(photoPreview);
      const compressed = await photoService.compressPassportPhoto(file);
      setSelectedPhoto(compressed.file);
      setPhotoPreview(compressed.previewUrl);
      setPhotoCompressionInfo({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to compress photo');
      setSelectedPhoto(null);
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = () => {
    if (photoPreview) photoService.revokePreviewUrl(photoPreview);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setPhotoCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocSelect =
    (setter: React.Dispatch<React.SetStateAction<File | null>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setter(file);
    };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!formData.firstName.trim()) next.firstName = 'First name is required';
    if (!formData.lastName.trim()) next.lastName = 'Last name is required';
    if (!formData.email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) next.email = 'Enter a valid email';
    if (!formData.password) next.password = 'Password is required';
    else if (formData.password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!formData.employeeNIN.trim()) next.employeeNIN = 'Employee NIN is required';
    if (!formData.hireDate) next.hireDate = 'Hire date is required';
    if (!formData.branchId) next.branchId = 'Branch is required';
    if (!formData.jobTitle) next.jobTitle = 'Job title is required';
    if (!formData.assignedShift) next.assignedShift = 'Shift is required';
    if (formData.baseSalary && (isNaN(Number(formData.baseSalary)) || Number(formData.baseSalary) < 0)) {
      next.baseSalary = 'Base salary must be a valid non-negative number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const uploadOptionalDocuments = async (employeeId: string, employeeName: string, uploadedBy: string) => {
    const uploads: Array<{ file: File | null; type: DocumentType }> = [
      { file: chairmanLetter, type: 'chairman_letter' },
      { file: employeeIdPdf, type: 'national_id_employee' },
      { file: nextOfKinIdPdf, type: 'national_id_next_of_kin' },
      { file: applicationLetter, type: 'application_letter' },
    ];

    for (const { file, type } of uploads) {
      if (!file) continue;
      await EmployeeDocumentsService.uploadDocument(employeeId, employeeName, file, type, uploadedBy);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    const pmUser = authService.getCurrentUser();
    if (!pmUser) {
      setError('You must be signed in to register an employee.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signUpData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeNIN: formData.employeeNIN,
        phone: formData.phone,
        branchId: formData.branchId,
        roles: [
          {
            jobRoleId: formData.jobTitle.toLowerCase().replace(/\s+/g, '-'),
            jobTitle: formData.jobTitle,
            baseSalary: formData.baseSalary ? Number(formData.baseSalary) : 0,
            description: `${formData.jobTitle} role`,
            assignedDate: new Date(),
          },
        ],
      };

      const creatorName =
        registeredByName ||
        (pmUser.employee
          ? `${pmUser.employee.firstName} ${pmUser.employee.lastName}`
          : pmUser.displayName || pmUser.email || 'Purchase Manager');

      const extras: Record<string, unknown> = {
        hireDate: new Date(formData.hireDate),
        employeeSalary: formData.baseSalary ? Number(formData.baseSalary) : 0,
        registeredByName: creatorName,
        registeredByRole: 'Purchase Manager',
        assignedShift: formData.assignedShift,
        shiftAssignedAt: new Date(),
        shiftAssignedBy: pmUser.uid,
      };

      if (formData.address) extras.address = formData.address;
      if (formData.dateOfBirth) extras.dateOfBirth = new Date(formData.dateOfBirth);
      if (formData.nextOfKinName) extras.nextOfKinName = formData.nextOfKinName;
      if (formData.nextOfKinNIN) extras.nextOfKinNIN = formData.nextOfKinNIN;
      if (formData.nextOfKinPhoneNumber) extras.nextOfKinPhoneNumber = formData.nextOfKinPhoneNumber;
      if (formData.workingSection) extras.workingSection = formData.workingSection;

      // Keep PM session — do not use signUp (that would replace the logged-in user)
      const result = await authService.createManagedAccount(
        signUpData,
        { uid: pmUser.uid, name: creatorName, role: 'Purchase Manager' },
        extras
      );
      const employeeId = result.uid;
      const employeeName = `${formData.firstName} ${formData.lastName}`;

      const followUp: Record<string, unknown> = {};

      if (selectedPhoto) {
        setPhotoUploading(true);
        const photoResult = await photoService.handlePassportPhotoUpload(selectedPhoto, employeeId);
        setPhotoUploading(false);
        if (!photoResult.success) {
          throw new Error(photoResult.error || 'Photo upload failed');
        }
        followUp.passportPhoto = photoResult.photoUrl;
        followUp.passportPhotoFilename = photoResult.filename;
        followUp.passportPhotoUploadedAt = new Date();
      }

      if (Object.keys(followUp).length > 0) {
        await firestoreServices.employee.update(employeeId, followUp);
      }

      await uploadOptionalDocuments(employeeId, employeeName, pmUser.uid);

      setCreatedEmployeeName(employeeName);
      setShowSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/purchase-manager/registered-employees');
      }, 1800);
    } catch (err: unknown) {
      console.error('Error registering employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to register employee');
    } finally {
      setLoading(false);
      setPhotoUploading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Registered</h2>
          <p className="text-gray-600 mb-2">
            <strong>{createdEmployeeName}</strong> has been added to the system.
          </p>
          <p className="text-sm text-gray-500">Opening registered employees…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push('/dashboard/purchase-manager')}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to PM Dashboard
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Register Staff Account</h1>
                <p className="text-gray-600">
                  Create accounts for Manager, Assistant Manager, Stock Manager, Supervisor, or Attendant.
                  They sign in to a staff portal to record attendance and view approved leave only.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/purchase-manager/registered-employees')}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
            >
              <Users className="w-4 h-4" />
              View registered
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-purple-600" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="First Name" required error={errors.firstName}>
                <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={inputClass(!!errors.firstName)} placeholder="First name" />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={inputClass(!!errors.lastName)} placeholder="Last name" />
              </Field>
              <Field label="Email Address" required error={errors.email} icon={<Mail className="w-4 h-4 text-gray-400" />}>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputClass(!!errors.email)} placeholder="work@email.com" />
              </Field>
              <Field label="Login Password" required error={errors.password}>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className={inputClass(!!errors.password)} placeholder="Min. 6 characters" />
              </Field>
              <Field label="Phone Number" icon={<Phone className="w-4 h-4 text-gray-400" />}>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={inputClass()} placeholder="+256..." />
              </Field>
              <Field label="Employee NIN" required error={errors.employeeNIN} icon={<CreditCard className="w-4 h-4 text-gray-400" />}>
                <input name="employeeNIN" value={formData.employeeNIN} onChange={handleInputChange} className={inputClass(!!errors.employeeNIN)} placeholder="National ID number" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address" icon={<MapPin className="w-4 h-4 text-gray-400" />}>
                  <input name="address" value={formData.address} onChange={handleInputChange} className={inputClass()} placeholder="Home address" />
                </Field>
              </div>
              <Field label="Date of Birth" icon={<Calendar className="w-4 h-4 text-gray-400" />}>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className={inputClass()} />
              </Field>
              <Field label="Hire Date" required error={errors.hireDate} icon={<Calendar className="w-4 h-4 text-gray-400" />}>
                <input type="date" name="hireDate" value={formData.hireDate} onChange={handleInputChange} className={inputClass(!!errors.hireDate)} />
              </Field>
            </div>

            {/* Photo */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                Passport Photo
              </h3>
              <div className="flex items-start gap-6">
                <div className="w-28 h-36 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                  {photoPreview ? (
                    <div className="relative w-full h-full">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={handlePhotoRemove} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Camera className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handlePhotoSelect} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading} className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                    <Upload className="w-4 h-4" />
                    {photoUploading ? 'Compressing...' : 'Choose Photo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Auto-compressed to 413×531 (under 150KB). JPEG/PNG/WebP, max 10MB</p>
                  {photoCompressionInfo && !photoError && (
                    <p className="text-xs text-green-600 mt-1">
                      Compressed: {photoService.formatBytes(photoCompressionInfo.originalSize)} → {photoService.formatBytes(photoCompressionInfo.compressedSize)}
                    </p>
                  )}
                  {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Employment */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Building className="w-5 h-5 mr-2 text-purple-600" />
              Employment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Registered By">
                <input value={registeredByName || 'Current PM'} readOnly className="w-full px-4 py-2 border border-green-300 bg-green-50 rounded-lg text-green-700 cursor-not-allowed" />
              </Field>
              <Field label="Branch" required error={errors.branchId}>
                <select name="branchId" value={formData.branchId} onChange={handleInputChange} className={inputClass(!!errors.branchId)}>
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Job Title" required error={errors.jobTitle}>
                <select name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className={inputClass(!!errors.jobTitle)}>
                  <option value="">Select role</option>
                  {PM_JOB_ROLES.map((role) => (
                    <option key={role.id} value={role.title}>{role.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Base Salary (UGX)" error={errors.baseSalary}>
                <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleInputChange} className={inputClass(!!errors.baseSalary)} min="0" placeholder="Optional" />
              </Field>
              <Field label="Working Section">
                <select name="workingSection" value={formData.workingSection} onChange={handleInputChange} className={inputClass()}>
                  <option value="">Select section (optional)</option>
                  {SUPERMARKET_SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned Shift" required error={errors.assignedShift}>
                <select
                  name="assignedShift"
                  value={formData.assignedShift}
                  onChange={handleInputChange}
                  className={inputClass(!!errors.assignedShift)}
                >
                  {STAFF_SHIFTS.map((shift) => {
                    const def = SHIFT_DEFINITIONS[shift];
                    return (
                      <option key={shift} value={shift}>
                        {def.label} ({def.hoursLabel})
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                  {formData.assignedShift === 'night' ? (
                    <Moon className="h-3.5 w-3.5 text-purple-500" />
                  ) : (
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {SHIFT_DEFINITIONS[formData.assignedShift].durationHours.toFixed(1)} hours expected per working day
                </p>
              </Field>
            </div>
          </section>

          {/* Next of Kin */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Next of Kin
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Name">
                <input name="nextOfKinName" value={formData.nextOfKinName} onChange={handleInputChange} className={inputClass()} placeholder="Full name" />
              </Field>
              <Field label="NIN">
                <input name="nextOfKinNIN" value={formData.nextOfKinNIN} onChange={handleInputChange} className={inputClass()} placeholder="National ID" />
              </Field>
              <Field label="Phone">
                <input type="tel" name="nextOfKinPhoneNumber" value={formData.nextOfKinPhoneNumber} onChange={handleInputChange} className={inputClass()} placeholder="+256..." />
              </Field>
            </div>
          </section>

          {/* Optional Documents */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Optional Documents (PDF)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocField label="Chairman Letter" file={chairmanLetter} onChange={handleDocSelect(setChairmanLetter)} />
              <DocField label="Employee National ID" file={employeeIdPdf} onChange={handleDocSelect(setEmployeeIdPdf)} />
              <DocField label="Next-of-Kin National ID" file={nextOfKinIdPdf} onChange={handleDocSelect(setNextOfKinIdPdf)} />
              <DocField label="Application Letter" file={applicationLetter} onChange={handleDocSelect(setApplicationLetter)} />
            </div>
          </section>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/purchase-manager')}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || photoUploading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm"
            >
              {(loading || photoUploading) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {photoUploading ? 'Uploading Photo...' : loading ? 'Registering...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {icon ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
          <div className="[&_input]:pl-10 [&_select]:pl-10">{children}</div>
        </div>
      ) : (
        children
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

function DocField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input type="file" accept="application/pdf" onChange={onChange} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
      {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
    </div>
  );
}
