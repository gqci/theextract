import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Mail, Loader2, CheckCircle2, ArrowRight, Zap, Lock, Clock, Brain, Cpu } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const DOCUMENT_TYPE_MAPPING = {
  1: 'Driver\'s license',
  2: 'Passport',
  3: 'Transcripts',
  4: 'Resume',
  5: 'Health card Canada',
  6: 'Degrees'
};

const ALLOWED_DOCUMENTS = [
  { type: DOCUMENT_TYPE_MAPPING[1], description: 'Government-issued driver\'s license' },
  { type: DOCUMENT_TYPE_MAPPING[2], description: 'Valid passport document' },
  { type: DOCUMENT_TYPE_MAPPING[3], description: 'Academic transcripts and records' },
  { type: DOCUMENT_TYPE_MAPPING[4], description: 'Professional resume/CV' },
  { type: DOCUMENT_TYPE_MAPPING[5], description: 'Canadian health insurance card' },
  { type: DOCUMENT_TYPE_MAPPING[6], description: 'Educational degree certificates' },
];

const WHY_THEEXTRACTOR = [
  {
    icon: Brain,
    title: 'Smart Processing',
    description: 'Advanced AI models that understand your documents like a human would'
  },
  {
    icon: Lock,
    title: 'Unmatched Security',
    description: 'Your data is protected with military-grade encryption'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Get results in seconds, not hours or days'
  },
  {
    icon: Clock,
    title: 'Always Available',
    description: 'Process your documents 24/7, whenever you need'
  }
];

const PROCESS_STEPS = [
  {
    title: 'Upload Documents',
    description: 'Drag & drop or select your documents'
  },
  {
    title: 'Select Document Types',
    description: 'Choose the type for each uploaded document'
  },
  {
    icon: Mail,
    title: 'Add Email (Optional)',
    description: 'Receive results in your inbox'
  },
  {
    title: 'Process & Review',
    description: 'View extracted information instantly'
  }
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 3;
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

interface ProcessedDocument {
  document_type?: string;
  documentType?: string;
  [key: string]: any;
}

interface PreviewData {
  processedDocuments: ProcessedDocument[];
}

interface FileStatus {
  isProcessing: boolean;
  isProcessed: boolean;
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [emailAddress, setEmailAddress] = useState('');
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 2MB size limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      toast.success(`Successfully uploaded ${validFiles.length} file(s)`);
      const newDocumentTypes = [...documentTypes];
      const newFileStatuses = [...fileStatuses];
      validFiles.forEach(() => {
        newDocumentTypes.push('');
        newFileStatuses.push({ isProcessing: false, isProcessed: false });
      });
      setDocumentTypes(newDocumentTypes);
      setFileStatuses(newFileStatuses);
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxSize: MAX_FILE_SIZE
  });

  const sendEmailSummary = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    if (!previewData?.processedDocuments?.length) {
      toast.error('No processed documents to send');
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          data: previewData.processedDocuments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Summary email sent successfully!');
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email summary');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const processDocument = async (index: number) => {
    if (!MAKE_WEBHOOK_URL) {
      toast.error('Webhook URL is not configured');
      return;
    }

    if (!documentTypes[index]) {
      toast.error('Please select a document type first');
      return;
    }

    const newFileStatuses = [...fileStatuses];
    newFileStatuses[index].isProcessing = true;
    setFileStatuses(newFileStatuses);

    try {
      const formData = new FormData();
      const file = files[index];
      const documentTypeIndex = Object.entries(DOCUMENT_TYPE_MAPPING)
        .find(([_, type]) => type === documentTypes[index])?.[0];

      if (!documentTypeIndex) {
        throw new Error(`Invalid document type for file: ${file.name}`);
      }

      formData.append(`file${documentTypeIndex}`, file);
      formData.append(`documentType${documentTypeIndex}`, documentTypes[index]);

      if (emailAddress) {
        formData.append('email', emailAddress);
      }

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('Empty response received');
      }

      const processedDocs = Array.isArray(data.processedDocuments)
        ? data.processedDocuments
        : [data.processedDocuments];

      setPreviewData(prevData => ({
        processedDocuments: [
          ...(prevData?.processedDocuments || []),
          ...processedDocs
        ]
      }));

      newFileStatuses[index].isProcessed = true;
      setFileStatuses(newFileStatuses);
      toast.success(`Successfully processed ${file.name}`);
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      const finalFileStatuses = [...fileStatuses];
      finalFileStatuses[index].isProcessing = false;
      setFileStatuses(finalFileStatuses);
    }
  };

  const handleDocumentTypeChange = (index: number, value: string) => {
    const mappingIndex = Object.entries(DOCUMENT_TYPE_MAPPING).find(([_, type]) => type === value)?.[0];
    
    if (mappingIndex) {
      const newTypes = [...documentTypes];
      newTypes[index] = value;
      setDocumentTypes(newTypes);
      toast.success('Document type updated');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setDocumentTypes(documentTypes.filter((_, i) => i !== index));
    setFileStatuses(fileStatuses.filter((_, i) => i !== index));

    if (previewData?.processedDocuments) {
      setPreviewData(prevData => ({
        processedDocuments: prevData?.processedDocuments.filter((_, i) => i !== index) || []
      }));

      if (previewData.processedDocuments.length <= 1) {
        setPreviewData(null);
      }
    }

    toast.success('File removed');
  };

  const currentStep = files.length === 0 ? 0 : 
    documentTypes.some(type => !type) ? 1 :
    fileStatuses.some(status => status.isProcessing) ? 3 : 2;

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text">
      <Toaster position="top-right" />
      
      <nav className="bg-brand-navy/95 backdrop-blur-sm fixed w-full z-50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-8 h-8 text-brand-logo" />
              <span className="text-2xl font-bold text-brand-logo">TheExtractor</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => document.getElementById('why-theextractor')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-4 py-2 text-sm font-medium hover:text-brand-logo transition-colors"
              >
                Why TheExtractor?
              </button>
              <button 
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-4 py-2 text-sm font-medium hover:text-brand-logo transition-colors"
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <header className="bg-brand-navy py-12 mt-8">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-6">Document Field Extractor</h1>
          <p className="text-2xl text-brand-text-secondary max-w-3xl">
            Extract important information from your documents quickly and securely using advanced AI technology
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section id="why-theextractor" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-8">Why Choose TheExtractor?</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {WHY_THEEXTRACTOR.map((feature, index) => (
              <div key={index} className="bg-brand-gray rounded-lg p-6 border border-gray-600">
                <feature.icon className="w-10 h-10 text-brand-red mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-brand-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mb-12 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {PROCESS_STEPS.map((step, index) => (
              <div key={index} className={`relative flex items-start gap-4 p-6 rounded-lg ${currentStep >= index ? 'bg-brand-gray' : 'bg-brand-navy opacity-50'}`}>
                <div className="flex-shrink-0">
                  {currentStep > index ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : currentStep === index ? (
                    <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-brand-text-secondary">{step.description}</p>
                </div>
                {index < PROCESS_STEPS.length - 1 && (
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Accepted Documents</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ALLOWED_DOCUMENTS.map((doc, index) => (
              <div key={index} className="bg-brand-gray rounded-lg p-4 text-center">
                <FileText className="w-6 h-6 text-brand-red mx-auto mb-2" />
                <h3 className="text-sm font-medium capitalize">{doc.type}</h3>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-brand-gray rounded-lg p-6">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition ${isDragActive ? 'border-brand-red bg-brand-navy' : 'border-gray-600'}`}>
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-brand-red" />
              <p className="text-lg mb-2">Drag & drop files here, or click to select files</p>
              <p className="text-sm text-brand-text-secondary">PDF or images up to 2MB each (max 5 files)</p>
            </div>

            {files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Uploaded Files:</h3>
                {files.map((file, index) => (
                  <div key={index} className="flex flex-col gap-4 mb-4 p-4 bg-brand-navy rounded">
                    <div className="flex items-center gap-4">
                      <FileText className="text-brand-red" />
                      <div className="flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-brand-text-secondary">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-brand-red hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        className="flex-1 bg-brand-gray border border-gray-600 rounded px-3 py-2 text-brand-text"
                        value={documentTypes[index] || ''}
                        onChange={(e) => handleDocumentTypeChange(index, e.target.value)}
                      >
                        <option value="">Select document type</option>
                        {Object.entries(DOCUMENT_TYPE_MAPPING).map(([mappingIndex, docType]) => (
                          <option key={mappingIndex} value={docType}>
                            {docType}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => processDocument(index)}
                        disabled={fileStatuses[index]?.isProcessing || !documentTypes[index]}
                        className={`px-4 py-2 rounded-lg font-semibold flex items-center justify-center
                          ${fileStatuses[index]?.isProcessed ? 'bg-green-600 text-white' :
                            fileStatuses[index]?.isProcessing ? 'bg-gray-600 cursor-not-allowed' :
                            !documentTypes[index] ? 'bg-gray-600 cursor-not-allowed' :
                            'bg-brand-red hover:bg-red-600 text-white'}`}
                      >
                        {fileStatuses[index]?.isProcessing ? (
                          <>
                            <Loader2 className="animate-spin mr-2" />
                            Processing...
                          </>
                        ) : fileStatuses[index]?.isProcessed ? (
                          <>
                            <CheckCircle2 className="mr-2" />
                            Processed
                          </>
                        ) : (
                          'Process'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6">
              <label className="block mb-2">Email Address (optional)</label>
              <div className="flex gap-4">
                <input
                  type="email"
                  className="flex-1 bg-brand-navy border border-gray-600 rounded px-3 py-2 text-brand-text"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter your email to receive results"
                />
                {previewData?.processedDocuments?.length > 0 && (
                  <button
                    onClick={sendEmailSummary}
                    disabled={isSendingEmail || !emailAddress}
                    className="bg-brand-red hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2" />
                        Send Summary
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-brand-gray rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6 pb-4 border-b border-gray-600">
              {previewData ? 'Extracted Information' : 'Preview Area'}
            </h3>
            
            {!previewData?.processedDocuments?.length && (
              <div className="flex items-center justify-center h-64 text-brand-text-secondary">
                Processed document information will appear here
              </div>
            )}
            
            {previewData?.processedDocuments?.length > 0 && (
              <div className="space-y-4">
                {previewData.processedDocuments.map((doc: ProcessedDocument, index: number) => (
                  <div key={index} className="bg-brand-navy rounded-lg border border-gray-600 p-6">
                    <h4 className="text-lg font-semibold mb-2">
                      {doc.document_type || doc.documentType || 'Unknown Document Type'}
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(doc).map(([field, value]) => {
                        if (!value || field === 'document_type' || field === 'documentType') return null;
                        return (
                          <div key={field} className="bg-brand-gray p-4 rounded-lg">
                            <p className="text-sm text-brand-text-secondary mb-1 capitalize">
                              {field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="font-medium">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-brand-gray rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-brand-red flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Data Privacy Notice</h3>
              <p className="text-brand-text-secondary">Your documents are processed securely and will not be used for any analysis or training purposes. All uploaded files are automatically deleted after processing.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-brand-navy py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="mb-2">© {new Date().getFullYear()} gqci.ca. All rights reserved.</p>
            <p className="text-sm text-brand-text-secondary">Your data privacy and security are our top priorities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;