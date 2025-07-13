import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from 'firebase/storage';
import { db, storage } from './config';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: 'employment_contract' | 'operations_manual' | 'employment_form' | 'policy_document' | 'training_certificate' | 'other';
  documentName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Timestamp;
  uploadedBy: string;
  downloadUrl: string;
  storagePath: string;
  version: number;
  isActive: boolean;
  description?: string;
  expiryDate?: Timestamp;
  tags: string[];
  accessLevel: 'public' | 'confidential' | 'restricted';
}

export interface DocumentUploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export class EmployeeDocumentsService {
  private static documentsCollection = 'employee_documents';
  private static storageBasePath = 'employee_documents';

  // Upload a new document
  static async uploadDocument(
    employeeId: string,
    employeeName: string,
    file: File,
    documentType: EmployeeDocument['documentType'],
    uploadedBy: string,
    metadata: {
      description?: string;
      expiryDate?: Date;
      tags?: string[];
      accessLevel?: EmployeeDocument['accessLevel'];
    } = {},
    onProgress?: (progress: DocumentUploadProgress) => void
  ): Promise<EmployeeDocument> {
    try {
      // Validate file
      if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are allowed');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size must be less than 10MB');
      }

      // Create unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${this.storageBasePath}/${employeeId}/${documentType}/${timestamp}_${sanitizedFileName}`;
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progress tracking
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress({
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: snapshot.state as DocumentUploadProgress['state']
              });
            }
          },
          (error) => {
            console.error('Upload error:', error);
            reject(new Error('Upload failed: ' + error.message));
          },
          async () => {
            try {
              // Upload completed successfully
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Get existing document count for versioning
              const existingDocs = await this.getEmployeeDocuments(employeeId, documentType);
              const version = existingDocs.length + 1;
              
              // Create document record
              const documentData: Omit<EmployeeDocument, 'id'> = {
                employeeId,
                employeeName,
                documentType,
                documentName: file.name,
                fileName: sanitizedFileName,
                fileSize: file.size,
                fileType: file.type,
                uploadDate: Timestamp.now(),
                uploadedBy,
                downloadUrl,
                storagePath,
                version,
                isActive: true,
                description: metadata.description || '',
                expiryDate: metadata.expiryDate ? Timestamp.fromDate(metadata.expiryDate) : undefined,
                tags: metadata.tags || [],
                accessLevel: metadata.accessLevel || 'confidential'
              };

              // Save to Firestore
              const docRef = await addDoc(collection(db, this.documentsCollection), documentData);
              
              const newDocument: EmployeeDocument = {
                id: docRef.id,
                ...documentData
              };

              if (onProgress) {
                onProgress({
                  progress: 100,
                  bytesTransferred: file.size,
                  totalBytes: file.size,
                  state: 'success'
                });
              }

              resolve(newDocument);
            } catch (error) {
              console.error('Error saving document record:', error);
              reject(new Error('Failed to save document record'));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  // Get all documents for an employee
  static async getEmployeeDocuments(
    employeeId: string, 
    documentType?: EmployeeDocument['documentType']
  ): Promise<EmployeeDocument[]> {
    try {
      // Query without orderBy to avoid composite index requirement
      let q = query(
        collection(db, this.documentsCollection),
        where('employeeId', '==', employeeId),
        where('isActive', '==', true)
      );

      if (documentType) {
        q = query(
          collection(db, this.documentsCollection),
          where('employeeId', '==', employeeId),
          where('documentType', '==', documentType),
          where('isActive', '==', true)
        );
      }

      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeDocument));

      // Sort by upload date (client-side sorting)
      return documents.sort((a, b) => {
        return b.uploadDate.toDate().getTime() - a.uploadDate.toDate().getTime();
      });
    } catch (error) {
      console.error('Error fetching employee documents:', error);
      throw new Error('Failed to fetch employee documents');
    }
  }

  // Get all employees with their document counts
  static async getEmployeesWithDocumentCounts(): Promise<Array<{
    employeeId: string;
    employeeName: string;
    documentCounts: Record<EmployeeDocument['documentType'], number>;
    totalDocuments: number;
    lastUpdated?: Timestamp;
  }>> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, this.documentsCollection),
          where('isActive', '==', true)
        )
      );

      const documentsByEmployee: Record<string, EmployeeDocument[]> = {};
      
      snapshot.docs.forEach(doc => {
        const document = { id: doc.id, ...doc.data() } as EmployeeDocument;
        if (!documentsByEmployee[document.employeeId]) {
          documentsByEmployee[document.employeeId] = [];
        }
        documentsByEmployee[document.employeeId].push(document);
      });

      return Object.entries(documentsByEmployee).map(([employeeId, documents]) => {
        const documentCounts: Record<EmployeeDocument['documentType'], number> = {
          employment_contract: 0,
          operations_manual: 0,
          employment_form: 0,
          policy_document: 0,
          training_certificate: 0,
          other: 0
        };

        let lastUpdated: Timestamp | undefined;

        documents.forEach(doc => {
          documentCounts[doc.documentType]++;
          if (!lastUpdated || doc.uploadDate.seconds > lastUpdated.seconds) {
            lastUpdated = doc.uploadDate;
          }
        });

        return {
          employeeId,
          employeeName: documents[0]?.employeeName || 'Unknown',
          documentCounts,
          totalDocuments: documents.length,
          lastUpdated
        };
      });
    } catch (error) {
      console.error('Error fetching employee document counts:', error);
      throw new Error('Failed to fetch employee document counts');
    }
  }

  // Delete a document
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document data first
      const documents = await getDocs(
        query(
          collection(db, this.documentsCollection),
          where('__name__', '==', documentId)
        )
      );

      if (documents.empty) {
        throw new Error('Document not found');
      }

      const documentData = documents.docs[0].data() as EmployeeDocument;

      // Delete from storage
      const storageRef = ref(storage, documentData.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, this.documentsCollection, documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  // Update document metadata
  static async updateDocument(
    documentId: string, 
    updates: Partial<Pick<EmployeeDocument, 'description' | 'expiryDate' | 'tags' | 'accessLevel' | 'isActive'>>
  ): Promise<void> {
    try {
      const updateData: any = { ...updates };
      
      if (updates.expiryDate) {
        updateData.expiryDate = Timestamp.fromDate(updates.expiryDate as any);
      }

      await updateDoc(doc(db, this.documentsCollection, documentId), updateData);
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Failed to update document');
    }
  }

  // Get document by ID
  static async getDocument(documentId: string): Promise<EmployeeDocument | null> {
    try {
      const documents = await getDocs(
        query(
          collection(db, this.documentsCollection),
          where('__name__', '==', documentId)
        )
      );

      if (documents.empty) {
        return null;
      }

      return {
        id: documents.docs[0].id,
        ...documents.docs[0].data()
      } as EmployeeDocument;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error('Failed to fetch document');
    }
  }

  // Search documents across all employees
  static async searchDocuments(
    searchTerm: string,
    documentType?: EmployeeDocument['documentType'],
    accessLevel?: EmployeeDocument['accessLevel']
  ): Promise<EmployeeDocument[]> {
    try {
      // Query without orderBy to avoid composite index requirement
      let q = query(
        collection(db, this.documentsCollection),
        where('isActive', '==', true)
      );

      if (documentType) {
        q = query(
          collection(db, this.documentsCollection),
          where('documentType', '==', documentType),
          where('isActive', '==', true)
        );
      }

      const snapshot = await getDocs(q);
      let documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeDocument));

      // Filter by search term (client-side filtering for complex queries)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        documents = documents.filter(doc => 
          doc.employeeName.toLowerCase().includes(searchLower) ||
          doc.documentName.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Filter by access level
      if (accessLevel) {
        documents = documents.filter(doc => doc.accessLevel === accessLevel);
      }

      // Sort by upload date (client-side sorting)
      return documents.sort((a, b) => {
        return b.uploadDate.toDate().getTime() - a.uploadDate.toDate().getTime();
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  // Get documents expiring soon
  static async getExpiringDocuments(daysAhead: number = 30): Promise<EmployeeDocument[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      // Query without orderBy to avoid composite index requirement
      const snapshot = await getDocs(
        query(
          collection(db, this.documentsCollection),
          where('isActive', '==', true)
        )
      );

      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as EmployeeDocument))
        .filter(doc => 
          doc.expiryDate && 
          doc.expiryDate.toDate() <= futureDate &&
          doc.expiryDate.toDate() >= new Date()
        )
        .sort((a, b) => {
          if (!a.expiryDate || !b.expiryDate) return 0;
          return a.expiryDate.toDate().getTime() - b.expiryDate.toDate().getTime();
        });
    } catch (error) {
      console.error('Error fetching expiring documents:', error);
      throw new Error('Failed to fetch expiring documents');
    }
  }

  // Generate document statistics
  static async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    documentsByType: Record<EmployeeDocument['documentType'], number>;
    documentsByAccessLevel: Record<EmployeeDocument['accessLevel'], number>;
    documentsUploadedThisMonth: number;
    averageFileSize: number;
    expiringDocuments: number;
  }> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, this.documentsCollection),
          where('isActive', '==', true)
        )
      );

      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeDocument));

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date();
      nextMonth.setDate(1);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const documentsByType: Record<EmployeeDocument['documentType'], number> = {
        employment_contract: 0,
        operations_manual: 0,
        employment_form: 0,
        policy_document: 0,
        training_certificate: 0,
        other: 0
      };

      const documentsByAccessLevel: Record<EmployeeDocument['accessLevel'], number> = {
        public: 0,
        confidential: 0,
        restricted: 0
      };

      let totalFileSize = 0;
      let documentsUploadedThisMonth = 0;
      let expiringDocuments = 0;

      documents.forEach(doc => {
        documentsByType[doc.documentType]++;
        documentsByAccessLevel[doc.accessLevel]++;
        totalFileSize += doc.fileSize;

        if (doc.uploadDate.toDate() >= thisMonth) {
          documentsUploadedThisMonth++;
        }

        if (doc.expiryDate && doc.expiryDate.toDate() <= nextMonth) {
          expiringDocuments++;
        }
      });

      return {
        totalDocuments: documents.length,
        documentsByType,
        documentsByAccessLevel,
        documentsUploadedThisMonth,
        averageFileSize: documents.length > 0 ? totalFileSize / documents.length : 0,
        expiringDocuments
      };
    } catch (error) {
      console.error('Error generating document statistics:', error);
      throw new Error('Failed to generate document statistics');
    }
  }
} 